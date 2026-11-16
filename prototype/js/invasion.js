/* 침공 연출 (2026-11-16, docs/design/raid_invasion_v2.md 5장)
   - 게임 규칙은 game_core.js(mainStart · mainNextWave · mainBuy · mainLiveView)가 정하고, 이 파일은 그 기록을 마을 화면에 보여 줌
   - 흐름: 침공 주가 되면(s.main.state === 'live') 시간을 멈추고 마을 화면을 엶 → 차례마다 [적 등장 → 다리 앞 전투] →
           (전멸하면) 적이 영주의 성으로 → 성 체력 게이지가 깎이는 동안 모험가가 다시 일어나 성 앞에서 싸움 → (또 전멸하면) 성이 무너짐
           차례 사이에는 정비 창(물약 사서 쥐여 주기), 마지막에는 결과 창
   - 그림: 원정 미니 뷰와 같은 SD 시트(assets/expedition_sd, assets/lobby_iso/chr) */
(function (root) {
  'use strict';
  const IV = { on: false };
  let stage = null, getS = null, hooks = {}, ui = null, G = null;

  // ---------- 그림 ----------
  const CLS = ['warrior', 'archer', 'mage', 'cleric', 'rogue'], POS = [0, 1, 1, 2, 0], sexOf = a => (a.id % 2 ? 'm' : 'f');
  const SDATK = { warrior_m: 'attack_horiz', warrior_f: 'attack_slash', archer_m: 'attack_shoot', archer_f: 'attack_shoot', rogue_m: 'attack_stab', rogue_f: 'attack_stab', mage_m: 'attack_strike', mage_f: 'attack_strike', cleric_m: 'attack_bless', cleric_f: 'attack_bless' };
  const SDRUN = { archer_f: 24, archer_m: 18, cleric_f: 19, cleric_m: 20, mage_f: 26, mage_m: 17, rogue_f: 20, rogue_m: 20, warrior_f: 16, warrior_m: 41 };
  const MONSD = { mon_01: ['dog', 34], mon_02: ['thief', 48], mon_03: ['slime', 30], mon_04: ['wolf', 40], mon_05: ['wolf_alpha', 66], mon_06: ['goblin', 42], mon_07: ['boar', 40], mon_08: ['bandit', 52] };
  const IM = {}; const img = src => { if (!IM[src]) { const i = new Image(); i.src = src; IM[src] = i; } return IM[src]; };
  const ready = im => im && im.complete && im.naturalWidth > 0;
  function advSheet(k, anim) {
    if (anim === 'fall') return { im: img('assets/expedition_sd/' + k + '_fall.webp'), fw: 256, fh: 220, cols: 8, n: 16, ax: 128, ay: 197, st: 129, fps: 16, once: true };
    if (anim === 'run' && SDRUN[k]) return { im: img('assets/expedition_sd/run_' + k + '.webp'), fw: 258, fh: 322, cols: 10, n: SDRUN[k], ax: 129, ay: 317, st: 208, fps: 24 };
    if (anim === 'attack' && SDATK[k]) return { im: img('assets/expedition_sd/' + k + '_' + SDATK[k] + '.webp'), fw: 256, fh: 220, cols: 8, n: 16, ax: 128, ay: 197, st: 129, fps: 16 };
    return { im: img('assets/lobby_iso/chr/' + k + '_idle.webp'), fw: 160, fh: 200, cols: 12, n: 36, ax: 80, ay: 197, st: 129, fps: 12 };
  }
  const monSheet = (k, act) => ({ im: img('assets/expedition_sd/mon_' + k + '_' + act + '.webp'), fw: 256, fh: 220, cols: 8, n: 16, ax: 128, ay: 197, st: 129, fps: act === 'idle' ? 10 : 16, once: act === 'fall' });
  const tmp = document.createElement('canvas'), tg = tmp.getContext('2d');
  function blit(g, sh, t, x, y, h, flip, tint, alpha) {   // 시트 한 칸을 발 기준 (x, y)에 키 h로
    if (!sh || !ready(sh.im)) return false;
    const sc = h / sh.st, f = sh.once ? Math.min(sh.n - 1, Math.floor(t * sh.fps)) : Math.floor(t * sh.fps) % sh.n;
    const w = Math.ceil(sh.fw * sc), hh = Math.ceil(sh.fh * sc);
    tmp.width = w; tmp.height = hh; tg.clearRect(0, 0, w, hh); tg.imageSmoothingQuality = 'high';
    tg.drawImage(sh.im, (f % sh.cols) * sh.fw, Math.floor(f / sh.cols) * sh.fh, sh.fw, sh.fh, 0, 0, w, hh);
    if (tint) { tg.globalCompositeOperation = 'source-atop'; tg.fillStyle = tint; tg.fillRect(0, 0, w, hh); tg.globalCompositeOperation = 'source-over'; }
    g.save(); g.globalAlpha = alpha == null ? 1 : alpha; g.translate(Math.round(x), Math.round(y)); if (flip) g.scale(-1, 1); g.drawImage(tmp, -sh.ax * sc, -sh.ay * sc); g.restore();
    return true;
  }

  // ---------- 자리 (마을 격자 좌표 → 화면) ----------
  const P = (gx, gy) => [root.Town.px(gx, gy), root.Town.py(gx, gy)];
  const SPAWN = [10.2, 29];                    // 다리 바깥 끝 (적이 나타나는 곳)
  const GUILD = [11.4, 11.6];                  // 길드 앞 (모험가가 뛰어나오는 곳)
  const CASTLE = [6, 6];                       // 영주의 성 앞 꼭짓점 (그림 아래 가운데)
  function advSpot(at, row, k, n) {            // 다리 앞 / 성 앞 대열: 줄(앞 0 · 가운데 1 · 뒤 2)마다 가로로 늘어섬
    const off = (k - (n - 1) / 2) * 0.95;
    return at === 'castle' ? P(4.3 + off, 8.0 + row * 0.75) : P(10.2 + off, 21.9 - row * 0.95);   // 성 앞: 성의 왼쪽 아래 면 바깥 (길드 그림에 가리지 않는 자리)
  }
  function foeSpot(at, i, n, boss) {
    if (boss) return at === 'castle' ? P(4.4, 6.8) : P(10.2, 24.1);
    const per = 3, row = Math.floor(i / per), k = i % per, m = Math.min(per, n - row * per), off = (k - (m - 1) / 2) * 0.95;
    return at === 'castle' ? P(4.4 + off, 6.55 + row * 0.5) : P(10.2 + off, 23.6 + row * 0.9);
  }
  const PATH = [[7.4, 20.5], [6.6, 12.5], [6.0, 9.2]];    // 다리 → 왼쪽 길 → 성 앞 (길드 그림을 피해 감)

  // ---------- 상태 ----------
  let st = null;   // { s, actors:Map, foes:[], q(남은 구간), seg, t, events, ei, nums, banner, castle(0~1), castleShown, smoke, phase, waitPanel, sp }
  const now = () => st.t;
  function actorOf(id) { return st.actors.get(id); }
  function mkActor(u, adv) {
    const k = CLS[u.core] + '_' + sexOf(adv || u);   // 원정 미니 뷰와 같은 키 (SD 시트는 10직업 모두 있음)
    ['idle', 'run', 'attack', 'fall'].forEach(n => advSheet(k, n));
    return { id: u.id, name: u.name || (adv && adv.name) || '', k, core: u.core, row: POS[u.core], x: 0, y: 0, from: null, to: null, mt0: 0, mt1: 0, anim: 'idle', at0: 0, hp: u.hp, maxHp: u.maxHp, down: !!u.down, flash: 0, glow: 0, revive: null };
  }
  function moveTo(o, xy, dur) { o.from = [o.x, o.y]; o.to = xy; o.mt0 = now(); o.mt1 = now() + dur; }
  function stepMove(o) {
    if (!o.to) return false;
    const k = Math.min(1, (now() - o.mt0) / Math.max(0.001, o.mt1 - o.mt0)), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    o.x = o.from[0] + (o.to[0] - o.from[0]) * e; o.y = o.from[1] + (o.to[1] - o.from[1]) * e;
    if (k >= 1) { o.to = null; return false; } return true;
  }
  function setAnim(o, a) { if (o.anim !== a) { o.anim = a; o.at0 = now(); } }
  function placeAdvs(at, dur) {   // 서 있는 모험가를 대열 자리로 (dur 0이면 바로)
    const live = [...st.actors.values()].filter(a => !a.down), rows = [[], [], []];
    for (const a of live) rows[a.row].push(a);
    rows.forEach((list, r) => list.forEach((a, k) => { const xy = advSpot(at, r, k, list.length); if (dur) { moveTo(a, xy, dur); setAnim(a, 'run'); } else { a.x = xy[0]; a.y = xy[1]; } }));
  }
  function mkFoes(list, at, fromSpawn) {
    const n = list.filter(e => !e.boss).length;
    st.foes = list.map((e, i) => {
      const sd = MONSD[e.mon] || MONSD.mon_04; ['idle', 'attack', 'fall'].forEach(a => monSheet(sd[0], a));
      const f = { i, name: e.name, boss: !!e.boss, sd, hp: e.hp, maxHp: e.hp, act: 'idle', mt: 0, flash: 0, alpha: 1, dead: false, x: 0, y: 0, to: null };
      const xy = foeSpot(at, i, n, f.boss);
      if (fromSpawn) { const s0 = P(SPAWN[0] + ((i % 3) - 1) * 0.9, SPAWN[1] + Math.floor(i / 3) * 0.8); f.x = s0[0]; f.y = s0[1]; moveTo(f, xy, 2.0 + (i % 3) * 0.15); } else { f.x = xy[0]; f.y = xy[1]; }
      return f;
    });
  }
  function num(x, y, text, color, big) { st.nums.push({ x: x + (Math.random() * 16 - 8), y, text, color, big, t0: now() }); }
  function banner(text, sub, dur) { st.banner = { text, sub, t0: now(), t1: now() + (dur || 2.4) }; }

  // ---------- 구간 재생 ----------
  // 전투 구간: 기록(log)을 라운드마다 RD초로 펼쳐 재생
  const RD = 0.42, PRE = { bridge: 2.3, castle: 1.8 };
  function startSeg() {
    const seg = st.q.shift(); st.seg = seg; st.segT0 = now(); st.events = []; st.ei = 0;
    if (!seg) { afterWave(); return; }
    if (seg.kind === 'fight') {
      for (const u of seg.units) { const a = actorOf(u.id); if (a) { a.hp = u.hp; a.maxHp = u.maxHp; a.down = false; setAnim(a, 'idle'); } }
      let pre = 0.4;
      if (seg.at === 'bridge' && st.waveFresh) { mkFoes(seg.foes, 'bridge', true); placeAdvs('bridge', 1.6); pre = PRE.bridge; st.waveFresh = false;
        banner(st.waveName, st.waveSub, 2.0); }
      else if (seg.at === 'castle') { st.foes.filter(f => !f.dead).forEach((f, k) => { f.i = k; }); st.foes = st.foes.filter(f => !f.dead); placeAdvs('castle', 1.6); pre = PRE.castle; }
      const byR = new Map(); for (const e of seg.log || []) { if (e.t === 'wave') continue; if (!byR.has(e.r)) byR.set(e.r, []); byR.get(e.r).push(e); }
      for (const [r, list] of byR) list.forEach((e, j) => st.events.push({ at: st.segT0 + pre + (r - 1) * RD + (j / list.length) * RD * 0.9, e }));
      st.events.sort((a, b) => a.at - b.at);
      st.segEnd = (st.events.length ? st.events[st.events.length - 1].at : st.segT0 + pre) + 1.0;
    } else if (seg.kind === 'castle') {   // 전멸: 적이 성으로, 게이지가 깎이는 동안 모험가가 다시 일어남
      banner('모험가가 모두 쓰러졌습니다!', '몬스터가 영주의 성으로 향합니다', 2.2);
      st.castleShown = true;
      const live = st.foes.filter(f => !f.dead), n = live.filter(f => !f.boss).length;
      live.forEach((f, k) => { const end = foeSpot('castle', f.boss ? 0 : k, n, f.boss); f.path = [...PATH.map(p => P(p[0] + ((k % 3) - 1) * 0.5, p[1])), end]; f.pk = 0; f.from = [f.x, f.y]; f.to = f.path[0]; f.mt0 = now() + 0.6; f.mt1 = f.mt0 + 1.0; });
      for (const a of st.actors.values()) if (a.down) a.revive = { t0: now() + 1.2, t1: now() + 5.4 };
      st.castleFrom = st.castle; st.castleTo = Math.max(0.3, st.castle - 0.45); st.cT0 = now() + 3.2; st.cT1 = now() + 5.4;
      st.segEnd = now() + 5.6;
    } else if (seg.kind === 'fall') {     // 또 전멸: 성이 무너짐
      banner('영주의 성이 무너지고 있습니다…', null, 2.6);
      const live = st.foes.filter(f => !f.dead), n = live.filter(f => !f.boss).length;
      const far = live.some(f => f.y > P(7, 12)[1]);   // 다리 앞에서 졌으면 길을 따라 성으로 걸어감
      live.forEach((f, k) => { const end = foeSpot('castle', f.boss ? 0 : k, n, f.boss); if (far) { f.path = [...PATH.map(p => P(p[0] + ((k % 3) - 1) * 0.5, p[1])), end]; f.pk = 0; f.from = [f.x, f.y]; f.to = f.path[0]; f.mt0 = now() + 0.4; f.mt1 = f.mt0 + 1.0; } else moveTo(f, end, 1.2); });
      const d0 = far ? 3.6 : 1.0; st.castleShown = true; st.castleFrom = st.castle; st.castleTo = 0; st.cT0 = now() + d0; st.cT1 = now() + d0 + 2.4; st.smokeOn = now() + d0 + 2.0;
      st.segEnd = now() + d0 + 3.4;
    }
  }
  function applyEv(e) {
    const foe = i => st.foes.find(f => f.i === i);
    if (e.t === 'hit') {
      const a = actorOf(e.by), f = foe(e.to); if (a) setAnim(a, 'attack'), a.atkEnd = now() + 0.55;
      if (f) { f.hp = e.hp; f.flash = 0.25; num(f.x, f.y - (f.boss ? 70 : 44), String(e.d), e.c ? '#ffe36b' : '#ffffff', !!e.c); if (e.hp <= 0 && !f.dead) { f.dead = true; f.act = 'fall'; f.mt = 0; } else if (Math.random() < 0.35) { f.act = 'attack'; f.mt = 0; } }
    } else if (e.t === 'hurt') {
      const a = actorOf(e.to); if (!a) return; a.hp = e.hp; a.flash = 0.25; num(a.x, a.y - 66, '−' + e.d, '#ff6b5b');
      const f = st.foes.find(x => !x.dead); if (f && f.act !== 'attack') { f.act = 'attack'; f.mt = 0; }
    } else if (e.t === 'down') {
      const a = actorOf(e.to); if (a) { a.down = true; a.hp = 0; setAnim(a, 'fall'); }
    } else if (e.t === 'heal' || e.t === 'potion') {
      const a = actorOf(e.to); if (!a) return; a.hp = e.hp; a.glow = 0.5; num(a.x, a.y - 66, (e.t === 'potion' ? '물약 +' : '+') + e.d, '#7be08a');
      if (e.t === 'heal') { const h = actorOf(e.by); if (h) setAnim(h, 'attack'), h.atkEnd = now() + 0.55; }
    }
  }

  // ---------- 진행 ----------
  function waveLabel(v) { const w = v.next; return { name: `${v.wave + 1}차 공격`, sub: w ? `${w.name} ${w.boss ? '(보스)' : '×' + w.n}` : '' }; }
  function nextWave() {
    const s = st.s, v = root.GuildGame.mainLiveView(s); if (!v) { finish(); return; }
    const lb = waveLabel(v); st.waveName = v.next && v.next.boss ? '보스 등장!' : lb.name; st.waveSub = lb.sub; st.waveIdx = v.wave;
    for (const u of v.units) { const a = actorOf(u.id); if (a) { a.hp = u.hp; a.maxHp = u.maxHp; if (a.down && !u.down) { a.down = false; setAnim(a, 'idle'); } } }
    const r = root.GuildGame.mainNextWave(s); if (!r) { finish(); return; }
    st.lastRes = r; st.q = r.segs.slice(); st.waveFresh = true; hud(); startSeg();
  }
  function afterWave() {
    const r = st.lastRes;
    if (r.done) { st.phase = 'result'; setTimeout(() => showResult(), 400); return; }
    st.phase = 'prep'; showPrep();
  }
  function begin(s) {
    const v = root.GuildGame.mainLiveView(s); if (!v) return;
    IV.on = true; st = { s, t: 0, actors: new Map(), foes: [], q: [], nums: [], banner: null, castle: 1, castleShown: false, sp: 1, phase: 'play', events: [], ei: 0 };
    st.prevSpeed = hooks.getSpeed ? hooks.getSpeed() : 1; if (hooks.setSpeed) hooks.setSpeed(0);
    if (root.UI && root.UI.close) root.UI.close();
    document.body.classList.add('invOn');
    if (root.Town && !root.Town.active) root.Town.open();
    for (const u of v.units) { const adv = s.advs.find(a => a.id === u.id), a = mkActor(u, adv); st.actors.set(u.id, a); const g0 = P(GUILD[0] + (Math.random() - 0.5), GUILD[1] + (Math.random() - 0.5)); a.x = g0[0]; a.y = g0[1]; }
    buildUi(); hud();
    banner('몬스터가 다리로 쳐들어옵니다!', `모험가 ${v.units.length}명이 다리를 지킵니다`, 2.4);
    setTimeout(() => { if (IV.on && st && st.s === s) nextWave(); }, 1200);
  }
  function finish() {   // 결과 창의 확인: 마을 화면을 닫고 시간을 되돌림
    const prev = st ? st.prevSpeed : 1; IV.on = false; st = null;
    document.body.classList.remove('invOn'); if (ui) ui.classList.remove('on');
    if (root.Town && root.Town.active) root.Town.close();
    if (hooks.setSpeed) hooks.setSpeed(prev || 1);
    if (root.UI && root.UI.hud) root.UI.hud();
    if (hooks.save) hooks.save(true);
  }

  // ---------- 화면 (DOM) ----------
  const CSS = `
#invUi{position:absolute;inset:0;display:none;pointer-events:none;z-index:7;font-family:inherit}
#invUi.on{display:block}
#invUi .iv-top{position:absolute;left:50%;top:130px;transform:translateX(-50%);display:flex;align-items:center;gap:14px;padding:8px 18px;border-radius:12px;background:rgba(34,22,13,.82);color:#fbf1dc;font-size:20px;font-weight:700;pointer-events:auto}
#invUi .iv-top small{font-size:15px;font-weight:600;color:#e8cfa0}
#invUi .iv-top button{font:inherit;font-size:15px;padding:3px 10px;border-radius:7px;border:1px solid rgba(251,241,220,.5);background:transparent;color:#fbf1dc;cursor:pointer}
#invUi .iv-top button.on{background:#e8b44a;color:#3b2a1e;border-color:#e8b44a}
#invUi .iv-panel{position:absolute;left:50%;bottom:40px;transform:translateX(-50%);min-width:620px;max-width:860px;padding:18px 22px 20px;border-radius:14px;background:linear-gradient(#fff6e6,#f3e2c2);border:3px solid #7a5032;box-shadow:0 10px 30px rgba(0,0,0,.35);color:#3b2a1e;pointer-events:auto;font-size:16px}
#invUi .iv-panel h3{margin:0 0 4px;font-size:24px}
#invUi .iv-panel .sub{margin:0 0 12px;color:#7a5032}
#invUi .iv-row{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1.6fr) auto;align-items:center;gap:12px;padding:6px 2px;border-bottom:1px solid rgba(110,72,36,.2)}
#invUi .iv-row b{font-size:16px}#invUi .iv-row em{font-style:normal;font-size:13px;color:#7a5c3c;margin-left:6px}
#invUi .iv-hp{position:relative;height:14px;border-radius:7px;background:rgba(110,72,36,.18);overflow:hidden}
#invUi .iv-hp u{position:absolute;inset:0 auto 0 0;background:#5aa34a;border-radius:7px}#invUi .iv-hp u.low{background:#d08a2e}#invUi .iv-hp u.crit{background:#c0453a}
#invUi .iv-hp span{position:relative;display:block;text-align:center;font-size:11px;line-height:14px;font-weight:700;color:#2b1d12}
#invUi .iv-pot{display:flex;align-items:center;gap:6px;font-size:14px;white-space:nowrap}
#invUi .iv-pot button{width:26px;height:26px;border-radius:7px;border:1px solid #7a5032;background:#fffaf0;font:inherit;font-weight:700;cursor:pointer}
#invUi .iv-pot button:disabled{opacity:.35;cursor:default}
#invUi .iv-foot{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-top:14px}
#invUi .iv-go{font:inherit;font-size:18px;font-weight:700;padding:9px 20px;border-radius:10px;border:2px solid #7a5032;background:linear-gradient(#f6d27a,#e3a93c);color:#3b2a1e;cursor:pointer}
#invUi .iv-note{font-size:13px;color:#7a5c3c}
#invUi .iv-res{bottom:auto;top:50%;transform:translate(-50%,-50%);text-align:center;min-width:560px}
#invUi .iv-res h3{font-size:32px;margin-bottom:10px}#invUi .iv-res.win h3{color:#3d6b2c}#invUi .iv-res.lose h3{color:#9a3b26}
#invUi .iv-res p{margin:6px 0;font-size:17px}#invUi .iv-res .iv-go{margin-top:16px}
body.invOn #hudBR,body.invOn #hudTR,body.invOn #townUi .plate,body.invOn #logBox,body.invOn #devToggle{opacity:0;pointer-events:none;transition:opacity .2s}
`;
  function buildUi() {
    if (!ui) {
      const sty = document.createElement('style'); sty.textContent = CSS; document.head.appendChild(sty);
      ui = document.createElement('div'); ui.id = 'invUi'; stage.ui.appendChild(ui);
      ui.addEventListener('click', onClick);
    }
    ui.innerHTML = '<div class="iv-top"></div><div class="iv-slot"></div>'; ui.classList.add('on');
  }
  function hud() {
    if (!ui || !st) return; const v = root.GuildGame.mainLiveView(st.s), w = st.waveIdx != null ? st.waveIdx : (v ? v.wave : 0), tot = root.GuildGame.MAIN_CFG.waves.length;
    ui.querySelector('.iv-top').innerHTML = `메인 퀘스트 「다리를 지켜라」 <small>${Math.min(w + 1, tot)} / ${tot}차</small> <span><button data-iv="sp" data-v="1" class="${st.sp === 1 ? 'on' : ''}">×1</button> <button data-iv="sp" data-v="2" class="${st.sp === 2 ? 'on' : ''}">×2</button> <button data-iv="sp" data-v="4" class="${st.sp === 4 ? 'on' : ''}">×4</button></span>`;
  }
  const fmt = n => Math.round(n).toLocaleString('ko-KR');
  function showPrep() {
    const s = st.s, v = root.GuildGame.mainLiveView(s); if (!v) return;
    const nx = v.next, rows = v.units.map(u => {
      const a = actorOf(u.id), was = a && a.down, k = u.hp / u.maxHp;
      return `<div class="iv-row"><span><b>${u.name}</b><em>${u.cls} Lv ${u.lv}${was ? ' · 다시 일어남' : ''}</em></span><span class="iv-hp"><u class="${k < 0.3 ? 'crit' : k < 0.6 ? 'low' : ''}" style="width:${Math.round(k * 100)}%"></u><span>${u.hp} / ${u.maxHp}</span></span><span class="iv-pot">물약 <b>${u.pots}</b>개 <button data-iv="pot" data-id="${u.id}" data-n="-1" ${u.pots ? '' : 'disabled'}>−</button><button data-iv="pot" data-id="${u.id}" data-n="1" ${u.pots >= 3 || s.gold < v.price ? 'disabled' : ''}>+</button></span></div>`;
    }).join('');
    ui.querySelector('.iv-slot').innerHTML = `<div class="iv-panel"><h3>정비 — ${v.wave}차를 막아 냈습니다</h3><p class="sub">서 있는 모험가는 체력 +30%, 쓰러진 모험가는 체력 40%로 일어났습니다. 다음: <b>${v.wave + 1}차 ${nx ? `${nx.name} ${nx.boss ? '(보스)' : '×' + nx.n}` : ''}</b></p>${rows}
      <div class="iv-foot"><span class="iv-note">물약 1개 ${v.price}G (금고에서) · 체력이 떨어지면 스스로 마십니다 · 한 사람 3개까지<br>금고 ${fmt(s.gold)}G${v.castle ? ` · 영주의 성은 이미 한 번 버텼습니다` : ''}</span><button class="iv-go" data-iv="go">${v.wave + 1}차 맞서기 ▶</button></div></div>`;
  }
  function showResult() {
    const s = st.s, R = (s.main && s.main.result) || {}, ok = !!R.win;
    const body = ok
      ? `<p><b>길드가 E급으로 승급했습니다!</b></p><p>보상 ${fmt(R.gold)}G · 명성 +${R.fame} · 모험가 관리소를 지을 수 있습니다</p><p>${R.castle ? '영주의 성까지 밀렸지만 다시 일어나 막아 냈습니다. ' : ''}쓰러진 모험가 ${R.down}명은 부상으로 쉽니다.</p>`
      : `<p>인구 −${R.pop}명 · 신뢰도 −${R.trust}</p>${R.dead && R.dead.length ? `<p><b>${R.dead.join(', ')}</b> — 돌아오지 못했습니다</p>` : ''}<p>${R.retry}주 뒤 리퀘스트 장에서 다시 도전할 수 있습니다.</p>`;
    ui.querySelector('.iv-slot').innerHTML = `<div class="iv-panel iv-res ${ok ? 'win' : 'lose'}"><h3>${ok ? '다리를 지켜 냈습니다!' : '영주의 성이 무너졌습니다'}</h3>${body}<button class="iv-go" data-iv="end">확인</button></div>`;
    if (ok && root.UI && root.UI.gradeUp) { /* 승급 카드는 확인 뒤 */ }
  }
  function onClick(e) {
    const b = e.target.closest('[data-iv]'); if (!b || !st) return;
    const k = b.dataset.iv;
    if (k === 'sp') { st.sp = +b.dataset.v; hud(); }
    else if (k === 'pot') { if (root.GuildGame.mainBuy(st.s, +b.dataset.id, +b.dataset.n) && root.UI && root.UI.hud) root.UI.hud(); showPrep(); }
    else if (k === 'go') { ui.querySelector('.iv-slot').innerHTML = ''; st.phase = 'play'; nextWave(); }
    else if (k === 'end') { const win = st.s.main && st.s.main.state === 'done'; finish(); if (win && root.UI && root.UI.gradeUp) root.UI.gradeUp(1); }
  }

  // ---------- 갱신 · 그리기 (마을 화면이 부름) ----------
  IV.update = function (s, dt) {
    if (!IV.on || !st) return;
    dt = Math.min(0.1, dt) * st.sp; st.t += dt;
    for (const a of st.actors.values()) {
      const moving = stepMove(a);
      if (a.revive && now() >= a.revive.t1) { a.revive = null; if (st.seg && st.seg.kind === 'castle') { a.down = false; setAnim(a, 'idle'); a.glow = 0.6; a.hp = a.maxHp * 0.4; } }
      if (!a.down) { if (moving) setAnim(a, 'run'); else if (a.anim === 'run') setAnim(a, 'idle'); if (a.anim === 'attack' && a.atkEnd && now() > a.atkEnd) setAnim(a, 'idle'); }
      a.flash = Math.max(0, a.flash - dt); a.glow = Math.max(0, a.glow - dt);
    }
    for (const f of st.foes) {
      f.mt += dt; f.flash = Math.max(0, f.flash - dt);
      if (f.path && f.to && now() >= f.mt0) { const k = Math.min(1, (now() - f.mt0) / (f.mt1 - f.mt0)); f.x = f.from[0] + (f.to[0] - f.from[0]) * k; f.y = f.from[1] + (f.to[1] - f.from[1]) * k; if (k >= 1) { f.pk++; if (f.pk < f.path.length) { f.from = [f.x, f.y]; f.to = f.path[f.pk]; f.mt0 = now(); f.mt1 = now() + 0.9; } else { f.to = null; f.path = null; } } }
      else if (!f.path) stepMove(f);
      if (f.act === 'attack' && f.mt > 1) { f.act = 'idle'; f.mt = 0; }
      if (f.dead && f.mt > 1.4) f.alpha = Math.max(0, f.alpha - dt * 1.5);
    }
    if (st.castleShown && st.cT1 && now() >= st.cT0) { const k = Math.min(1, (now() - st.cT0) / (st.cT1 - st.cT0)); st.castle = st.castleFrom + (st.castleTo - st.castleFrom) * k; }
    while (st.ei < st.events.length && st.events[st.ei].at <= now()) applyEv(st.events[st.ei++].e);
    st.nums = st.nums.filter(n => now() - n.t0 < 1.1);
    if (st.phase === 'play' && st.seg && now() >= st.segEnd) startSeg();
  };
  IV.draw = function (g) {
    if (!IV.on || !st) return;
    const list = [];
    for (const f of st.foes) if (f.alpha > 0) list.push({ y: f.y, f });
    for (const a of st.actors.values()) list.push({ y: a.y, a });
    list.sort((p, q) => p.y - q.y);
    for (const o of list) {
      if (o.f) {
        const f = o.f, h = f.sd[1] * (f.boss ? 1.25 : 1); let sh = monSheet(f.sd[0], f.act); if (!ready(sh.im)) sh = monSheet(f.sd[0], 'idle');
        g.save(); g.globalAlpha = f.alpha * 0.35; g.fillStyle = '#000'; g.beginPath(); g.ellipse(f.x, f.y, h * 0.45, h * 0.13, 0, 0, Math.PI * 2); g.fill(); g.restore();
        blit(g, sh, f.mt, f.x, f.y, h, true, f.flash > 0 ? 'rgba(255,40,30,' + (0.6 * Math.min(1, f.flash * 4)) + ')' : null, f.alpha);
        if (!f.dead && f.hp < f.maxHp) bar(g, f.x, f.y - h * 1.15, f.boss ? 70 : 40, f.hp / f.maxHp, '#d0453a');
      } else {
        const a = o.a, H = 62; let sh = advSheet(a.k, a.down ? 'fall' : a.anim), t = now() - a.at0; if (!ready(sh.im)) sh = advSheet(a.k, 'idle');
        g.save(); g.globalAlpha = 0.3; g.fillStyle = '#000'; g.beginPath(); g.ellipse(a.x, a.y, 20, 6, 0, 0, Math.PI * 2); g.fill(); g.restore();
        const tint = a.flash > 0 ? 'rgba(255,40,30,' + (0.6 * Math.min(1, a.flash * 4)) + ')' : a.glow > 0 ? 'rgba(120,255,140,' + (0.5 * Math.min(1, a.glow * 3)) + ')' : a.down ? 'rgba(40,30,50,.35)' : null;
        blit(g, sh, t, a.x, a.y, a.anim === 'run' && !a.down ? H * 1.25 : H, true, tint);
        if (!a.down && a.hp < a.maxHp) bar(g, a.x, a.y - H - 8, 38, a.hp / a.maxHp, '#5aa34a');
        if (a.revive && now() >= a.revive.t0) { const left = Math.max(0, Math.ceil(20 * (a.revive.t1 - now()) / (a.revive.t1 - a.revive.t0))); label(g, a.x, a.y - 40, left ? `일어나기까지 ${left}초` : '일어남!', '#fbe3c4'); }
      }
    }
    if (st.castleShown) {   // 영주의 성 체력 게이지
      const c = P(CASTLE[0], CASTLE[1]), cx = c[0] + 300, y = c[1] - 150;   // 성 오른쪽 빈 들판 (위는 상단 정보판에 가림)
      g.save(); g.fillStyle = 'rgba(34,22,13,.85)'; g.beginPath(); g.roundRect(cx - 130, y - 30, 260, 52, 10); g.fill();
      g.fillStyle = '#fbf1dc'; g.font = '700 16px "Malgun Gothic",sans-serif'; g.textAlign = 'center'; g.fillText(`영주의 성 ${Math.round(Math.max(0, st.castle) * 100)}%`, cx, y - 10);
      g.fillStyle = 'rgba(255,255,255,.15)'; g.fillRect(cx - 115, y, 230, 12); g.fillStyle = st.castle > 0.5 ? '#e8b44a' : st.castle > 0.25 ? '#d0782e' : '#c0453a'; g.fillRect(cx - 115, y, 230 * Math.max(0, st.castle), 12);
      g.strokeStyle = 'rgba(232,180,74,.55)'; g.lineWidth = 2; g.setLineDash([6, 6]); g.beginPath(); g.moveTo(cx - 130, y); g.lineTo(c[0] + 120, c[1] - 120); g.stroke(); g.restore();
      if (st.smokeOn && now() >= st.smokeOn) smoke(g, c[0], c[1] - 120, now() - st.smokeOn);
    }
    for (const n of st.nums) { const k = (now() - n.t0) / 1.1; g.save(); g.globalAlpha = Math.max(0, 1 - k * k); g.font = `800 ${n.big ? 26 : 20}px "Malgun Gothic",sans-serif`; g.textAlign = 'center'; g.lineWidth = 4; g.strokeStyle = 'rgba(30,18,10,.85)'; g.strokeText(n.text, n.x, n.y - k * 30); g.fillStyle = n.color; g.fillText(n.text, n.x, n.y - k * 30); g.restore(); }
    if (st.banner && now() < st.banner.t1) {
      const b = st.banner, k = Math.min(1, (now() - b.t0) / 0.3, (b.t1 - now()) / 0.4);
      g.save(); g.globalAlpha = Math.max(0, k); g.fillStyle = 'rgba(34,22,13,.8)'; g.fillRect(0, 190, 1920, b.sub ? 104 : 74);
      g.textAlign = 'center'; g.fillStyle = '#fbe3c4'; g.font = '800 40px "Malgun Gothic",sans-serif'; g.fillText(b.text, 960, 242);
      if (b.sub) { g.font = '600 22px "Malgun Gothic",sans-serif'; g.fillStyle = '#f0d9b0'; g.fillText(b.sub, 960, 278); } g.restore();
    }
  };
  function bar(g, x, y, w, k, col) { g.fillStyle = 'rgba(20,12,6,.7)'; g.fillRect(x - w / 2 - 1, y - 1, w + 2, 7); g.fillStyle = col; g.fillRect(x - w / 2, y, w * Math.max(0, k), 5); }
  function label(g, x, y, t, col) { g.save(); g.font = '700 14px "Malgun Gothic",sans-serif'; const w = g.measureText(t).width + 12; g.fillStyle = 'rgba(34,22,13,.82)'; g.beginPath(); g.roundRect(x - w / 2, y - 16, w, 22, 7); g.fill(); g.fillStyle = col; g.textAlign = 'center'; g.fillText(t, x, y); g.restore(); }
  function smoke(g, x, y, t) { g.save(); for (let i = 0; i < 9; i++) { const k = ((t * 0.5 + i / 9) % 1), r = 20 + k * 60; g.globalAlpha = 0.45 * (1 - k); g.fillStyle = '#3a3330'; g.beginPath(); g.arc(x + Math.sin(i * 2.3) * 70 + k * 20, y - k * 160, r, 0, Math.PI * 2); g.fill(); } g.restore(); }

  IV.check = function (s) { if (!IV.on && s && s.main && s.main.state === 'live' && root.Town) begin(s); };
  IV.init = function (st0, getState, h) { stage = st0; getS = getState; hooks = h || {}; };
  root.Invasion = IV;
})(this);
