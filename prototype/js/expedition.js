/* 원정 현황 패널(hudExp) + 원정 미니 뷰(expView) — docs/design/expedition_panel.md 11·15장
   - 패널: 오른쪽에 원정 중인 파티 목록. 평소 반투명, 마우스를 올리면 선명. 귀환하면 잠시 "귀환" 표시 후 사라짐
   - 미니 뷰: 줄을 누르면 열림. 이동 0~30% / 조우 30~50% / 교전·수행 50~85% / 결과 85~100%
     전투 의뢰는 출발 때 계산해 둔 전투 기록(s.active[].fight.log)을 교전 구간에 그대로 재생
   - 미니 뷰 위치는 저장 데이터 s.ui.expView ({x, y} 또는 null=기본 자리). 끌어서 옮기고, 한 번 누르면 닫힘 */
(function (root) {
  'use strict';
  const Gm = root.GuildGame, GR = Gm.GR, QTYPE = Gm.QTYPE;
  const CLS = ['warrior', 'archer', 'mage', 'cleric', 'rogue'], ROW = [0, 1, 2, 2, 0];
  const WORK = ['수색', '채집', '조사', '호위', '탐사'];          // 비전투 의뢰의 "수행" 문구 (유형별)
  const sexOf = a => (a.id % 2 ? 'm' : 'f');                       // 로비(actors.js)와 같은 규칙
  const EVW = 480, EVH = 203, PANEL = { x: 1920 - 16 - 360, y: 96, w: 360, h: 704 };
  const IM = {};
  function img(k) { if (!IM[k]) { IM[k] = new Image(); IM[k].src = 'assets/expedition/' + k + '.png'; } return IM[k]; }
  // 몬스터 그림: 소재 편집기 몬스터 탭의 img (assets/expedition/ 기준 경로, 예: mon/mon_01.png). 없으면 네모 상자
  const MON = {}; for (const m of ((root.GAME_DATA || {}).content || {}).monsters || []) MON[m.id] = m;
  function monImg(id) { const m = MON[id]; if (!m || !m.img) return null; const k = 'm:' + m.img; if (!IM[k]) { IM[k] = new Image(); IM[k].src = 'assets/expedition/' + m.img; } return IM[k]; }
  const ready = im => im && im.complete && im.naturalWidth > 0;
  ['forest_a', 'forest_b', 'fdirt_a', 'fdirt_b', 'o_pine', 'o_oak'].forEach(img);
  // 의뢰 종류별 배경 (2026-11-16): 토벌 = 숲 · 사냥·채집 = 풀밭 · 조사 = 마을 · 호위·구호 = 마을 → 풀밭 길 · 탐사 = 사막. 블록은 타이틀 화면 도트 그대로
  const DIRT = ['dirt_a', 'dirt_a', 'dirt_b', 'dirt_c', 'dirt_c', 'dirt_c', 'dirt_d', 'dirt_d', 'dirt_e', 'dirt_e', 'dirt_e'];
  const BG = {
    forest: { top: ['forest_a', 'forest_a', 'forest_b'], low: ['fdirt_a', 'fdirt_b'], props: [['o_pine', 20], ['o_oak', 150], ['o_pine', 260], ['o_pine', 330], ['o_oak', 420], ['o_pine', 500]] },
    grass: { top: ['grass_a', 'grass_b', 'grass_c'], low: DIRT, props: [['o_oak', 40], ['o_bush', 150], ['o_flowers', 230], ['o_rock', 320], ['o_oak', 400], ['o_bush', 500]] },
    town: { top: ['town_a', 'town_b', 'town_c'], low: DIRT, props: [['o_house', 10], ['o_lamp', 170], ['o_fence', 230], ['o_barrels', 300], ['o_house', 360], ['o_lamp', 520]] },
    road: { top: ['grass_a', 'grass_b', 'grass_c'], low: DIRT, from: 'town', props: [['o_fence', 20], ['o_lamp', 120], ['o_oak', 200], ['o_fence', 300], ['o_bush', 380], ['o_lamp', 480]] },
    desert: { top: ['sand_a', 'sand_b'], low: ['sand_c'], props: [['o_cactus', 30], ['o_drock', 150], ['o_cactus_s', 250], ['o_bones', 330], ['o_cactus', 420], ['o_drock', 510]] }
  };
  const BGQ = ['forest', 'grass', 'town', 'road', 'desert'];   // 의뢰 종류 번호(data/quest_types.csv) 순서
  for (const k in BG) { BG[k].top.concat(BG[k].low, BG[k].props.map(p => p[0])).forEach(img); } img('town_to_grass');
  const josa = (w, a, b) => { const c = w.charCodeAt(w.length - 1); return w + (c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 ? a : b); };
  function groupName(list) { const m = new Map(); for (const e of list) m.set(e.name, (m.get(e.name) || 0) + 1); return [...m].map(([n, c]) => c > 1 ? `${n} ${c}마리` : n).join(', '); }
  const risk = r => r >= 70 ? ['r-safe', '● 안전'] : r >= 40 ? ['r-warn', '◆ 주의'] : ['r-risk', '▲ 위험'];

  const X = {};
  let stage, getS, ui, list, tip, ev, cv, g, view = null, sel = null, frac = 0, speed = 1, evPos = null;
  const ghosts = new Map();   // 방금 귀환한 원정: 잠시 "귀환" 상태로 남김 (q.id → {x, doneAt})
  let clock = 0;

  X.init = function (st, get) {
    stage = st; getS = get; ui = stage.ui;
    const box = document.createElement('div');
    box.innerHTML = '<div id="hudExp"><div class="head"><span id="expHd">원정 중 (0)</span></div><div class="list" id="expList"></div></div>' +
      '<div class="exTip" id="expTip"></div><div id="expView"><canvas width="480" height="203"></canvas><div class="msg" id="expMsg"></div></div>';
    while (box.firstChild) ui.appendChild(box.firstChild);
    list = ui.querySelector('#expList'); tip = ui.querySelector('#expTip'); ev = ui.querySelector('#expView');
    cv = ev.querySelector('canvas'); g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
    // 미니 뷰 끌어서 옮기기: 5px 이상 움직이면 이동, 아니면 클릭(닫기)
    let drag = null;
    ev.addEventListener('pointerdown', e => { if (e.button !== 0) return; drag = { sx: e.clientX, sy: e.clientY, x0: ev.offsetLeft, y0: ev.offsetTop, moved: false }; ev.setPointerCapture(e.pointerId); });
    ev.addEventListener('pointermove', e => {
      if (!drag) return; const k = stage.scale, dx = (e.clientX - drag.sx) / k, dy = (e.clientY - drag.sy) / k;
      if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 5) return; drag.moved = true; ev.classList.add('drag');
      evPos = { x: Math.round(Math.max(0, Math.min(1920 - EVW, drag.x0 + dx))), y: Math.round(Math.max(0, Math.min(1080 - EVH, drag.y0 + dy))) }; place(); updSmall();
    });
    ev.addEventListener('pointerup', () => { if (!drag) return; const m = drag.moved; drag = null; ev.classList.remove('drag'); if (m) { const s = getS(); s.ui = s.ui || {}; s.ui.expView = evPos; } else close(); });
    ev.addEventListener('pointercancel', () => { drag = null; ev.classList.remove('drag'); });
    X.reset();
  };
  // 새 게임·불러오기
  X.reset = function () { const s = getS(); evPos = (s.ui && s.ui.expView) || null; ghosts.clear(); known.clear(); seen0.clear(); close(); place(); render(); };
  function place() { if (evPos) { ev.style.left = evPos.x + 'px'; ev.style.top = evPos.y + 'px'; ev.style.right = 'auto'; } else { ev.style.left = ''; ev.style.top = ''; ev.style.right = ''; } }
  function updSmall() { let o = !!view; if (o && evPos) { const a = evPos; o = a.x < PANEL.x + PANEL.w && a.x + EVW > PANEL.x && a.y < PANEL.y + PANEL.h && a.y + EVH > PANEL.y; } ui.querySelector('#hudExp').classList.toggle('small', o); }

  // ---------- 목록 ----------
  // C작업 (2026-11-12): 의뢰를 수락해도 파티원이 아직 로비에 있으면(리나에게 접수 → 문으로 걸어 나가는 중) 목록에 올리지 않음. 모두 건물을 나간 뒤에 표시
  const seen0 = new Map();   // 원정별 처음 목록에 보인 순간의 실제 진행률 (8 ⓐ, 2026-11-19)
  const outside = x => !(root.Director && root.Director.actors && x.party.some(id => root.Director.actors.has(id)));
  const shown = s => s.active.filter(outside);
  function entries() {
    const s = getS(), out = [];
    for (const x of shown(s)) out.push(entry(s, x, false));
    for (const gh of ghosts.values()) out.push(entry(s, gh.x, true));
    if (seen0.size > 40) { const live = new Set(s.active.map(x => x.uid != null ? 'u' + x.uid : 'q' + x.q.id)); for (const k of [...seen0.keys()]) if (!live.has(k)) seen0.delete(k); }
    return out;
  }
  function entry(s, x, done) {
    const weeks = x.weeks || x.q.weeks || 1, start = x.start != null ? x.start : x.back - weeks;
    const raw = Math.max(0, Math.min(1, (s.week - 1 - start + frac) / weeks));
    // 2026-11-19 사용자 결정 8 ⓐ: 목록에는 파티가 로비를 걸어 나간 뒤에야 올라오므로, 처음 보인 순간을 0%로 다시 잡아 귀환(주 끝)까지 늘여 보여 줌. 정산 시점은 그대로
    const k = x.uid != null ? 'u' + x.uid : 'q' + x.q.id; if (!done && !seen0.has(k)) seen0.set(k, raw);
    const r0 = seen0.has(k) ? seen0.get(k) : 0, p = done ? 1 : r0 >= 0.98 ? raw : Math.max(0, Math.min(1, (raw - r0) / (1 - r0)));
    return { x, id: x.q.id, p, done, weeks, left: Math.max(0, x.back - s.week) + (done ? 0 : 1) };
  }
  const advOf = (s, id) => s.advs.find(a => a.id === id);
  function render() {
    const s = getS(), E = entries(), panel = ui.querySelector('#hudExp');
    ui.querySelector('#expHd').textContent = `원정 중 (${E.filter(e => !e.done).length})`;
    panel.style.display = E.length ? '' : 'none';
    list.innerHTML = '';
    E.sort((a, b) => (a.done ? -1 : 0) - (b.done ? -1 : 0) || a.x.back - b.x.back).forEach(e => {
      const x = e.x, q = x.q, party = x.party.map(id => advOf(s, id)).filter(Boolean), lead = party[0];
      const nm = (lead ? lead.name : '?') + (party.length > 1 ? ` 외 ${party.length - 1}` : '');
      const rate = x.rate != null ? x.rate : Math.round((x.p || 0) * 100), [rc, rt] = x.q && x.q.tutorial ? ['r-safe', '✎ 연습'] : risk(rate);   // 2026-11-22 시안 5 반영: 튜토리얼 첫 의뢰는 「연습」
      const r = document.createElement('div'); r.className = 'row' + (sel === e.id ? ' sel' : ''); r.dataset.id = e.id;
      const pc = root.Director && root.Director.partyColor ? root.Director.partyColor(e.id) : null;   // 2026-11-12 파티 색 띠: 로비 발밑 원·모험가 목록과 같은 색
      if (pc) { r.classList.add('pty'); r.style.setProperty('--pc', pc); }
      let ticks = ''; for (let w = 1; w < e.weeks; w++) ticks += `<b style="left:${w / e.weeks * 100}%"></b>`;
      r.innerHTML = `<div class="badge">${GR[q.g]}</div><div class="l1"><span class="nm">${nm}</span><span class="qn">${q.name || GR[q.g] + '급 ' + QTYPE[q.type] + ' 의뢰'}</span></div>
        <div class="l2"><div class="pb"><i style="width:${e.p * 100}%"></i>${ticks}</div><span class="left">${leftText(e)}</span><span class="risk ${rc}">${rt}</span></div>`;
      r.onclick = () => open(e.id);
      r.onmouseenter = () => {
        tip.style.display = 'block'; tip.style.top = (PANEL.y + r.offsetTop - list.scrollTop) + 'px';
        const en = x.fight ? groupName(x.fight.enemies) : null;
        tip.innerHTML = `<b>${q.name || QTYPE[q.type] + ' 의뢰'}</b> (${GR[q.g]}급 ${QTYPE[q.type]})<br>${q.tutorial ? '첫 의뢰 연습 · 무사히 돌아와요' : `예상 성공률 ${Math.min(100, rate)}%`}<br>${en ? '적: ' + en : '비전투 의뢰'}<br>파티: ${party.map(a => `<span style="white-space:nowrap">${a.name}(${a.cls} Lv${a.lv})</span>`).join(', ')}`;
      };
      r.onmouseleave = () => { tip.style.display = 'none'; };
      list.appendChild(r);
    });
  }
  const leftText = e => e.done ? '귀환' : e.left <= 1 ? '곧 귀환' : e.left + '주 남음';
  function soft() { // 진행 바·남은 기간만 갱신
    const E = entries();
    list.querySelectorAll('.row').forEach(r => { const e = E.find(o => o.id == r.dataset.id); if (!e) return; r.querySelector('.pb i').style.width = e.p * 100 + '%'; r.querySelector('.left').textContent = leftText(e); });
  }

  // ---------- 미니 뷰 ----------
  const ATK_T = 0.85;   // 공격 모션 한 번 길이(초): 16칸 16fps에서 앞 0.15초를 뺀 만큼
  const NUM_T = 1.4;   // 피해 숫자 보이는 시간(초)
  const numK = (v, who) => v.nums.filter(o => o.who === who && o.t < 1.0).length % 3;   // 같은 대상에 1초 안에 또 뜨면 한 줄 위로 (최대 3줄)
  function timeline(F) {
    if (!F || !F.log) return []; const R = F.rounds || 1, by = {};
    for (const x of F.log) (by[x.r] = by[x.r] || []).push(x);
    const out = []; for (const r in by) { const a = by[r]; a.forEach((x, k) => out.push(Object.assign({ at: (r - 1 + (k + 1) / a.length) / R }, x))); } return out;
  }
  // 아군 한 명의 행동 시각(기록상 진행도) 목록. 스킬의 연속 타격(k 있음)은 한 번의 행동으로 묶음
  function actTimes(F, id) {
    const out = []; let last = null;
    for (const x of timeline(F)) {
      if (x.by !== id || (x.t !== 'hit' && x.t !== 'heal')) { last = null; continue; }
      if (last && x.k && last.k === x.k) continue;
      out.push(x.at); last = x;
    }
    return out;
  }
  const BUFFI = {}; const buffImg = src => { if (!BUFFI[src]) { const im = new Image(); im.src = 'assets/' + src; BUFFI[src] = im; } return BUFFI[src]; };
  function open(id) {
    if (sel === id) { close(); return; }
    const s = getS(), e = entries().find(o => o.id === id); if (!e) return;
    const x = e.x, F = x.fight, party = x.party.map(pid => advOf(s, pid)).filter(Boolean).sort((a, b) => ROW[a.core] - ROW[b.core]);
    sel = id;
    const unitOf = a => (F && F.units.find(u => u.id === a.id)) || null;
    const mpLog = !!(F && F.log && F.log.some(z => z.mp != null));   // 2026-11-18: 마력 기록이 없는 예전 원정(마력 기록 도입 전 저장)은 마력 막대를 숨김 — 가득 찬 채 고정되던 문제
    view = { id, cam: 0, t: 0, phaseT: 0, phase: null, ev: timeline(F), applied: 0, fresh: true, sparks: [], nums: [], combat: !!F, say: [],
      actors: party.map((a, i) => { const u = unitOf(a), k = CLS[a.core] + '_' + sexOf(a); ['walk', 'run', 'attack', 'fall'].forEach(n => img(k + '_' + n));
        return { id: a.id, name: a.name, adv: a, k, i, x: 0, anim: 'walk', t: Math.random(), flash: 0, glow: 0, dodge: 0, dir: 1, hp: u ? u.maxHp : 1, maxHp: u ? u.maxHp : 1, mp: u ? u.maxMp : 0, maxMp: u && mpLog ? u.maxMp : 0, acts: actTimes(F, a.id), down: false, show: 0 }; }),
      enemies: (F ? F.enemies : []).map((m, i) => ({ n: m.name, boss: m.boss, scale: m.boss ? 140 : 100, im: monImg(m.mon), sd: sdOn() ? MONSD[m.mon] : null, mt: 0, act: 'idle', x: 540 + i * 56, flash: 0, crit: 0, alpha: 1, hp: m.maxHp, maxHp: m.maxHp, shown: 1 })) };
    if (sdOn()) { view.actors.forEach(a => ['walk', 'run', 'attack', 'fall', 'search', 'idle'].forEach(n => sdSheet(a.k, n))); view.enemies.forEach(m => m.sd && ['idle', 'attack', 'fall'].forEach(n => monSheet(m.sd[0], n))); }   // 2026-11-16: 쓸 SD 시트를 열 때 미리 읽음 (처음 쓰는 순간 예전 도트가 잠깐 보이던 문제)
    ev.classList.add('on'); requestAnimationFrame(() => ev.classList.add('vis')); updSmall(); render();
  }
  function close() { sel = null; view = null; if (!ev) return; ev.classList.remove('vis'); setTimeout(() => { if (!view) ev.classList.remove('on'); }, 200); ui.querySelector('#hudExp').classList.remove('small'); render(); }
  X.close = close;

  const MEET_END = 0.34; // 전투 의뢰는 조우 직후 곧바로 교전 (조우 구간 30~34%)
  const phaseOf = (p, c) => p < 0.3 ? 'move' : p < (c ? MEET_END : 0.5) ? 'meet' : p < 0.85 ? 'fight' : 'result';
  const SURF = 150, GAP = 54, LEAD_X = 270;
  const SHEET = { walk: [128, 96, 64, 8, 100, true], run: [128, 96, 64, 8, 75, true], attack: [128, 96, 64, 8, 90, true], fall: [160, 104, 104, 10, 110, false], stand: [128, 96, 64, 8, 100, false] };
  const tmp = document.createElement('canvas'), tg = tmp.getContext('2d');
  // SD 그림 (2026-11-15): 달리기 · 공격(10직업) · 걷기 · 서 있기(로비 걷기 · 대기 시트). 쓰러짐(10직업)은 한 번 재생 후 누운 채 유지. 주소 끝에 ?px=1을 붙이면 예전 도트
  const SDH = 84;   // 미니 뷰 키(예전 도트와 같음)
  const SDRUN = { archer_f: 24, archer_m: 18, cleric_f: 19, cleric_m: 20, mage_f: 26, mage_m: 17, rogue_f: 20, rogue_m: 20, warrior_f: 16, warrior_m: 41 };
  const SDATK = { warrior_m: 'attack_horiz', warrior_f: 'attack_slash', archer_m: 'attack_shoot', archer_f: 'attack_shoot', rogue_m: 'attack_stab', rogue_f: 'attack_stab', mage_m: 'attack_strike', mage_f: 'attack_strike', cleric_m: 'attack_bless', cleric_f: 'attack_bless' };
  const SDIM = {}; const sdi = src => { if (!SDIM[src]) { const i = new Image(); i.src = src; SDIM[src] = i; } return SDIM[src]; };
  const SDSEARCH = { warrior_m: 1, warrior_f: 1, archer_m: 1, archer_f: 1, rogue_m: 1, rogue_f: 1, mage_m: 1, mage_f: 1, cleric_m: 1, cleric_f: 1 };
  const WORK_ICON = ['', '🌿', '🔍', '🛡️', '📜'];   // 비전투 수행 중 머리 위 아이콘: 사냥·채집 = 약초 · 조사 = 돋보기 · 호위·구호 = 방패 · 탐사 = 두루마리 (2026-11-16)
  // 몬스터 SD (2026-11-16): 서 있기 · 공격 반복 / 쓰러짐 한 번. TH = 미니 뷰에서의 키(px), 예전 도트 키의 약 1.2배
  // boss_goblin: 고블린 대장(던전 보스) — 움직임 시트가 생기기 전까지 고블린 시트를 1.3배로 [임시] (그림 expedition_sd/mon_goblin_boss_still.png는 정지 1장)
  const MONSD = { boss_goblin: ['goblin', 74], mon_01: ['dog', 46], mon_02: ['thief', 64], mon_03: ['slime', 40], mon_04: ['wolf', 52], mon_05: ['wolf_alpha', 64], mon_06: ['goblin', 56], mon_07: ['boar', 54], mon_08: ['bandit', 70] };
  const monSheet = (k, act) => ({ im: sdi('assets/expedition_sd/mon_' + k + '_' + act + '.webp'), fw: 256, fh: 220, cols: 8, n: 16, ax: 128, ay: 197, st: 129, fps: act === 'idle' ? 10 : 16 });
  function sdSheet(k, anim) {
    if (anim === 'fall') return { im: sdi('assets/expedition_sd/' + k + '_fall.webp'), fw: 256, fh: 220, cols: 8, n: 16, ax: 128, ay: 197, st: 129, fps: 16, once: true };   // 쓰러짐: 한 번 재생 후 누운 채 유지
    if (anim === 'walk') return { im: sdi('assets/lobby_iso/chr/' + k + '_walk.webp'), fw: 160, fh: 200, cols: 12, n: 24, ax: 80, ay: 197, st: 129, fps: 24 };   // 로비 걷기 시트(오른쪽 3/4)
    if (anim === 'run') return SDRUN[k] ? { im: sdi('assets/expedition_sd/run_' + k + '.webp'), fw: 258, fh: 322, cols: 10, n: SDRUN[k], ax: 129, ay: 317, st: 208, fps: 24 } : null;
    if (anim === 'search' && SDSEARCH[k]) return { im: sdi('assets/expedition_sd/' + k + '_search.webp'), fw: 256, fh: 220, cols: 8, n: 16, ax: 128, ay: 197, st: 129, fps: 12 };   // 탐색(비전투 수행, 반복) 2026-11-16
    if (anim === 'attack' && SDATK[k]) return { im: sdi('assets/expedition_sd/' + k + '_' + SDATK[k] + '.webp'), fw: 256, fh: 220, cols: 8, n: 16, ax: 128, ay: 197, st: 129, fps: 16 };
    return { im: sdi('assets/lobby_iso/chr/' + k + '_idle.webp'), fw: 160, fh: 200, cols: 12, n: 36, ax: 80, ay: 197, st: 129, fps: 12 };
  }
  const sdOn = () => !/[?&]px=1/.test(location.search);
  function drawActorSD(a, x) {
    const sh = sdSheet(a.k, a.anim); if (!sh || !ready(sh.im)) return false;
    const s = SDH / sh.st; const f = sh.once ? Math.min(sh.n - 1, Math.floor(a.t * sh.fps)) : Math.floor(a.t * sh.fps) % sh.n;
    const w = Math.ceil(sh.fw * s), h = Math.ceil(sh.fh * s);
    tmp.width = w; tmp.height = h; tg.clearRect(0, 0, w, h); tg.imageSmoothingQuality = 'high';
    tg.drawImage(sh.im, (f % sh.cols) * sh.fw, Math.floor(f / sh.cols) * sh.fh, sh.fw, sh.fh, 0, 0, w, h);
    const tint = (c, k) => { tg.globalCompositeOperation = 'source-atop'; tg.fillStyle = c.replace('A', k); tg.fillRect(0, 0, w, h); tg.globalCompositeOperation = 'source-over'; };
    if (a.flash > 0) tint('rgba(255,40,30,A)', 0.65 * Math.min(1, a.flash * 4));
    if (a.glow > 0) tint('rgba(120,255,140,A)', 0.55 * Math.min(1, a.glow * 3));
    if (a.anim === 'fall') tint('rgba(40,30,50,A)', 0.35);
    const ox = a.dodge > 0 ? -Math.sin((1 - a.dodge / 0.3) * Math.PI) * 10 * a.dir : 0, ax = sh.ax * s, ay = sh.ay * s;
    g.save(); g.translate(Math.round(x + ox), SURF - 1); if (a.dir < 0) g.scale(-1, 1);
    g.drawImage(tmp, -ax, -ay); g.restore(); return true;
  }
  function drawActor(a, x) {
    if (sdOn()) { if (drawActorSD(a, x)) return;
      if (sdSheet(a.k, a.anim)) { const an = a.anim; for (const alt of ['idle', 'walk']) { a.anim = alt; if (drawActorSD(a, x)) break; } a.anim = an; return; } }   // 시트를 읽는 중이면 예전 도트 대신 서 있기 · 걷기 시트로 (둘 다 없으면 그 프레임은 건너뜀)
    const an = a.anim === 'search' ? 'stand' : a.anim, [cw, ch, px, n, ms, loop] = SHEET[an], im = IM[a.k + '_' + (an === 'stand' ? 'walk' : an)]; if (!im || !im.complete || !im.naturalWidth) return;
    let f = a.anim === 'stand' ? 0 : Math.floor(a.t * 1000 / ms); f = loop ? f % n : Math.min(f, n - 1);
    tmp.width = cw; tmp.height = ch; tg.clearRect(0, 0, cw, ch); tg.drawImage(im, f * cw, 0, cw, ch, 0, 0, cw, ch);
    const tint = (c, k) => { tg.globalCompositeOperation = 'source-atop'; tg.fillStyle = c.replace('A', k); tg.fillRect(0, 0, cw, ch); tg.globalCompositeOperation = 'source-over'; };
    if (a.flash > 0) tint('rgba(255,40,30,A)', 0.65 * Math.min(1, a.flash * 4));      // 피격: 붉게
    if (a.glow > 0) tint('rgba(120,255,140,A)', 0.55 * Math.min(1, a.glow * 3));      // 물약·회복: 초록
    const ox = a.dodge > 0 ? -Math.sin((1 - a.dodge / 0.3) * Math.PI) * 10 * a.dir : 0; // 회피: 살짝 뒤로 비킴
    g.save(); if (a.dir < 0) { g.translate(Math.round(x + ox), 0); g.scale(-1, 1); g.drawImage(tmp, -px, SURF - 92); } else g.drawImage(tmp, Math.round(x + ox) - px, SURF - 92); g.restore();
  }
  // ③ 전투 대사 (2026-11-13, docs/design/character_talk_v1.md): 미니 뷰를 보고 있을 때만, 파티 2명 이상. 짧은 말풍선 1줄 + 1초 뒤 대답 1줄
  //   교전 시작 70% · 동료 피격 30% · 치유 35% · 승리/후퇴 80%. 대사 하나가 끝나기 전에는 다음 대사 없음
  const TALK_P = { battle_start: 0.7, battle_hit: 0.3, battle_heal: 0.35, battle_win: 0.8, battle_lose: 0.8 };
  function vTalk(v, sit, a, b) {
    if (!a || !b || a === b || !root.Speech || !root.Speech.talk || v.say.length || Math.random() > TALK_P[sit]) return;
    const L = root.Speech.talk(a.adv, b.adv, sit); if (!L) return;
    v.say.push({ who: a, txt: L[0], t: 0, dur: 1.4 }, { who: b, txt: L[1], t: -1.0, dur: 1.4 });
  }
  const upOf = v => v.actors.filter(a => !a.down), other = (v, a) => { const o = upOf(v).filter(x => x !== a); return o[Math.floor(Math.random() * o.length)]; };
  function drawSay(v, dt) {
    const rdt = dt / Math.max(1, Math.min(3, speed));   // 배속과 상관없이 실제 시간으로 보여 줌
    v.say.forEach(s => { const was = s.t; s.t += rdt; if (was < 0 && s.t >= 0) v.say.forEach(o => { if (o !== s && o.t >= 0) o.dur = Math.min(o.dur, o.t); }); });   // 대답이 뜨면 앞 말풍선은 닫음
    v.say = v.say.filter(s => s.t < s.dur);
    g.font = 'bold 11px "MaruBuri",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    for (const s of v.say) { if (s.t < 0) continue;
      const w = Math.ceil(g.measureText(s.txt).width) + 12, h = 18, cx = Math.max(w / 2 + 2, Math.min(EVW - w / 2 - 2, Math.round(s.who.x))), y = SURF - 136 - (s.who.adv && root.GuildGame && GuildGame.mealBuffOf && GuildGame.mealBuffOf(getS(), s.who.adv) ? 12 : 0);   // 요리 버프 아이콘이 있으면 말풍선을 12px 위로
      g.globalAlpha = Math.min(1, s.t * 8, (s.dur - s.t) * 6);
      g.fillStyle = 'rgba(255,250,238,.96)'; g.strokeStyle = '#3a2614'; g.lineWidth = 1.5;
      g.beginPath(); g.roundRect ? g.roundRect(cx - w / 2, y, w, h, 6) : g.rect(cx - w / 2, y, w, h); g.fill(); g.stroke();
      const tx = Math.round(s.who.x); g.beginPath(); g.moveTo(tx - 4, y + h - 0.5); g.lineTo(tx, y + h + 5); g.lineTo(tx + 4, y + h - 0.5); g.fill();
      g.beginPath(); g.moveTo(tx - 4, y + h); g.lineTo(tx, y + h + 5); g.lineTo(tx + 4, y + h); g.stroke();
      g.fillStyle = '#2e2012'; g.fillText(s.txt, cx, y + h / 2 + 1); }
    g.globalAlpha = 1; g.textBaseline = 'alphabetic';
  }
  function bar(x, y, w, h, v, col) { g.fillStyle = 'rgba(0,0,0,.75)'; g.fillRect(x - 1, y - 1, w + 2, h + 2); g.fillStyle = '#2a1010'; g.fillRect(x, y, w, h); const hw = Math.round(w * Math.max(0, Math.min(1, v))); g.fillStyle = col(v); g.fillRect(x, y, hw, h); g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(x, y, hw, 1); }
  const hpCol = v => v > 0.5 ? '#5fd16b' : v > 0.25 ? '#e8c13a' : '#e8443a', enCol = v => v > 0.5 ? '#e8443a' : v > 0.25 ? '#e8913a' : '#e8d23a';
  // 기록 1건 반영. fx=false 면 효과 없이 상태만 (미니 뷰를 교전 도중에 열었을 때)
  // 2026-11-19 스킬 아이콘 (사용자 시안 확정): 스킬을 쓴 모험가 머리 위에 둥근 스킬 그림 약 1초 (명부 스킬 칸과 같은 그림). 한 사람에 하나만, 테두리 · 피해 숫자 = 스킬 색
  const SK_FILE = ['skill_str_0', 'skill_agi_0', 'skill_int_0', 'skill_spi_0', 'skill_dex_0'], SK_COL = { double0: '#e8443a', double1: '#4caf50', fire: '#ff8a2a', stab: '#a05ad8', heal: '#5ab8f0' };
  const SKI = {}; const skImg = f => { if (!SKI[f]) { const im = new Image(); im.src = 'assets/icons/' + f + '.png'; SKI[f] = im; } return SKI[f]; };
  function skPop(v, a, k) { const core = a.adv ? a.adv.core : 0, key = k === 'double' ? 'double' + (core === 1 ? 1 : 0) : k; v.sks = (v.sks || []).filter(o => o.who !== a); v.sks.push({ who: a, f: SK_FILE[core], col: SK_COL[key] || '#fff', t: 0 }); return SK_COL[key] || null; }
  function apply(v, x, fx) {
    const A = id => v.actors.find(a => a.id === id), E = i => v.enemies[i];
    if (x.by && x.mp != null) { const b = A(x.by); if (b) b.mp = x.mp; }
    if (x.t === 'hit') { const m = E(x.to); if (!m) return; m.hp = x.hp; { const by = A(x.by); if (fx && by && !by.down) { by.atk = ATK_T; by.t = 0.15; } }   // 2026-11-16: 실제로 공격할 때만 공격 모션 (앞 준비 동작 0.15초 건너뜀)
      if (fx) { m.flash = 0.25; if (x.c) m.crit = 0.4; const by2 = A(x.by), sc = x.k && by2 ? skPop(v, by2, x.k) : null; if (x.d != null) v.nums.push({ who: m, e: 1, txt: String(x.d), crit: !!x.c, t: 0, k: numK(v, m), ox: Math.random() * 10 - 5, col: sc, big: !!sc }); } }
    else { const a = A(x.to); if (!a) return;
      if (x.t === 'hurt') { if (fx) { const live = v.enemies.filter(m => m.hp > 0 && m.sd); if (live.length) { const m = live[Math.floor(Math.random() * live.length)]; m.act = 'attack'; m.mt = 0; } } a.hp = x.hp; if (fx && a.hp > 0) vTalk(v, 'battle_hit', other(v, a), a); if (fx) { a.flash = 0.3; if (x.d != null) v.nums.push({ who: a, txt: String(x.d), t: 0, k: numK(v, a), ox: Math.random() * 6 - 3 }); } }
      else if (x.t === 'miss') { if (fx) a.dodge = 0.3; }
      else if (x.t === 'heal' || x.t === 'potion') { if (x.hp != null) a.hp = x.hp; if (fx && x.t === 'heal' && x.by) { const by = A(x.by); if (by && !by.down) { by.atk = ATK_T; by.t = 0.15; skPop(v, by, 'heal'); } } if (fx && x.t === 'heal' && x.by && x.by !== x.to) vTalk(v, 'battle_heal', A(x.by), a); if (fx) { a.glow = 0.5; if (x.d != null && x.d > 0) v.nums.push({ who: a, txt: '+' + x.d, heal: true, t: 0, k: numK(v, a), ox: Math.random() * 6 - 3 }); for (let k = 0; k < 5; k++) v.sparks.push({ x: a.x + (Math.random() * 20 - 10), y: SURF - 40 - Math.random() * 20, vy: -20 - Math.random() * 20, life: 0.6, c: '#9dffb0' }); } }
      else if (x.t === 'down') { a.hp = 0; a.down = true; a.anim = 'fall'; a.t = 0; }
      else if (x.t === 'flee') { a.down = true; a.anim = 'fall'; a.t = 0; if (fx) v.nums.push({ who: a, txt: x.why === 'selfish' ? '후퇴!' : '도망!', t: 0, k: numK(v, a), ox: 0 }); } }   // 2026-11-20 버릇(겁쟁이 · 이기적) 혼자 물러남 — [임시 표현] 쓰러짐 모션 + 글자, 아침 확인 대기
  }
  function drawScene(dt) {
    const v = view, e = entries().find(o => o.id === v.id); if (!e) { close(); return; }
    const x = e.x, ok = x.dgP && !x.dgP.done ? true : x.ok != null ? x.ok : (x.fight ? x.fight.win : true), p = e.p, ph = phaseOf(p, !!x.fight);
    if (ph !== v.phase && v.phaseT >= 0.5 / Math.max(speed, 1) || v.phase === null) {
      const was = v.phase; v.phase = ph; v.phaseT = 0;
      if (was && v.combat && !v.fresh) { const up = upOf(v), a = up[Math.floor(Math.random() * up.length)];   // ③ 교전 시작 · 결과 한마디
        if (ph === 'fight') vTalk(v, 'battle_start', a, other(v, a));
        else if (ph === 'result') vTalk(v, ok ? 'battle_win' : 'battle_lose', a, other(v, a)); }
    }
    v.phaseT += dt; v.t += dt; const P = v.phase, en = x.fight ? groupName(x.fight.enemies) : '';
    // 전투 기록 재생: 교전 구간 진행도까지의 기록을 반영
    let fp = -1;
    if (v.combat) {
      fp = P === 'move' || P === 'meet' ? -1 : P === 'result' ? 1.01 : Math.max(0, Math.min(1, (p - MEET_END) / (0.85 - MEET_END)));
      while (v.applied < v.ev.length && v.ev[v.applied].at <= fp) { apply(v, v.ev[v.applied], !v.fresh && P === 'fight'); v.applied++; }
    }
    v.fresh = false;
    g.clearRect(0, 0, EVW, EVH);
    v.cam += (P === 'move' ? 1 : 0) * 48 * dt;
    const bg = BG[BGQ[x.q.type]] || BG.forest;
    for (const [k, x0] of bg.props) {
      const im = IM[k]; if (!im.complete || !im.naturalWidth) continue; const xx = ((x0 - v.cam * 0.4) % 560 + 560) % 560 - 60;
      g.globalAlpha = .45; g.drawImage(im, xx, SURF + 2 - im.height * 0.8, im.width * 0.8, im.height * 0.8); g.globalAlpha = 1;
    }
    const c0 = Math.floor(v.cam / 32);
    for (let i = c0; i <= c0 + 16; i++) { const xx = i * 32 - Math.round(v.cam), h = (i * 7919) % 97, a = IM[bg.low[h % bg.low.length]];
      let b = IM[bg.top[h % bg.top.length]]; if (bg.from) { if (i < 6) b = IM[BG[bg.from].top[h % 3]]; else if (i === 6) b = IM.town_to_grass; }   // 호위: 마을에서 출발해 풀밭 길로
      if (a.naturalWidth) g.drawImage(a, xx, SURF + 4 + 32); if (b.naturalWidth) g.drawImage(b, xx, SURF + 4 - 12 - 8); }
    // 배우
    const upA = v.actors.filter(o => !o.down);   // 2026-11-16: 앞열이 쓰러지면 뒤 사람이 한 칸씩 앞으로 (살아 있는 순서대로 자리)
    v.actors.forEach(a => {
      const home = LEAD_X - a.i * GAP, rk = upA.indexOf(a), slot = LEAD_X - (rk < 0 ? a.i : rk) * GAP; a.t += dt;
      if (a.down) { a.x = a.x || home; if (a.anim !== 'fall') { a.anim = 'fall'; a.t = 0; } }
      else if (P === 'move' || P === 'meet') { a.anim = 'walk'; a.x = home; a.dir = 1; }
      else if (P === 'fight' && v.combat && a.x && Math.abs(slot - a.x) > 1.5) { const d = slot - a.x; a.x += Math.sign(d) * Math.min(Math.abs(d), 70 * dt); a.anim = 'walk'; a.dir = 1; }   // 빈자리로 걸어감
      else if (P === 'fight') { a.x = slot; if (a.atk > 0) a.atk -= dt; a.anim = v.combat ? (a.atk > 0 ? 'attack' : 'idle') : 'search';
        if (!v.combat && Math.random() < dt * 7) v.sparks.push({ x: slot + 12 + Math.random() * 30, y: SURF - 4 - Math.random() * 6, vy: -24 - Math.random() * 26, life: 0.8 + Math.random() * 0.6, c: Math.random() < 0.45 ? '#ffffff' : '#fff1a8', star: Math.random() < 0.45 }); }   // 2026-11-16: 탐색지 반짝임 강화 (1.5 → 7개/초, 별 모양 섞음)
      else { const walkBack = !v.combat && !ok;   // 결과: 성공 → 오른쪽으로 떠남, 실패 → 왼쪽으로 후퇴(비전투는 걸어서 돌아감)
        if (ok) { a.anim = 'run'; a.dir = 1; a.x = (a.x || home) + 150 * dt; } else { a.anim = walkBack ? 'walk' : 'run'; a.dir = -1; a.x = (a.x || home) - (walkBack ? 60 : 150) * dt; } }
      a.flash = Math.max(0, a.flash - dt); a.glow = Math.max(0, a.glow - dt); a.dodge = Math.max(0, a.dodge - dt);
      a.show += (((P === 'fight' || P === 'result') ? 1 : 0) - a.show) * Math.min(1, dt * 6);   // 2026-11-17: 수행(비전투) 의뢰도 막대를 보임 — 전에는 전투에서만 보여 수행 게이지가 안 나왔음
    });
    // 적: x=316부터 오른쪽 끝(478)까지. 넘치면 겹쳐서 줄이고, 홀수 번째는 4px 뒤(위)에 서서 덜 겹쳐 보이게. 그림이 있으면 그림 크기 그대로(도트 1:1), 없으면 상자(보스 140%)
    // 2026-11-16: 쓰러진 적은 그 자리에 두고, 살아 있는 적만 왼쪽(316)부터 다시 줄 세움 → 앞 적이 쓰러지면 뒤 적이 앞으로 나옴
    const live = v.enemies.map(m => m.hp > 0);
    const ws = v.enemies.map(m => m.sd ? Math.round(m.sd[1] * 1.25 * (m.boss ? 1.25 : 1)) : ready(m.im) ? m.im.naturalWidth : Math.round(40 * m.scale / 100)), lw = ws.filter((w, i) => live[i]), tot = lw.reduce((t, w) => t + w, 0) + 4 * (lw.length - 1), shrink = lw.length > 1 ? Math.min(0, (162 - tot) / (lw.length - 1)) : 0, XS = [];
    ws.reduce((xx, w, i) => live[i] ? (XS[i] = xx, xx + w + 4 + shrink) : (XS[i] = null, xx), 316);
    const drawOrder = v.enemies.map((m, i) => i).sort((a, b) => (b % 2) - (a % 2) || a - b);   // 뒤(홀수) 먼저
    drawOrder.forEach(i => { const m = v.enemies[i];
      if (P === 'move') m.x = 540 + i * 56; else if (XS[i] != null) m.x += (XS[i] - m.x) * Math.min(1, dt * 2.5);
      m.flash = Math.max(0, m.flash - dt); m.crit = Math.max(0, m.crit - dt); m.shown += (m.hp / m.maxHp - m.shown) * Math.min(1, dt * 8);
      m.mt += dt; if (m.hp <= 0 && m.sd && m.act !== 'fall') { m.act = 'fall'; m.mt = 0; } if (m.act === 'attack' && m.mt > 1) { m.act = 'idle'; m.mt = 0; }
      if (m.hp <= 0 && !(m.sd && m.mt < 1.6)) m.alpha = Math.max(0, m.alpha - dt * 1.2); if (m.alpha <= 0) return;
      const pic = ready(m.im), w = ws[i], h = m.sd ? Math.round(m.sd[1] * (m.boss ? 1.25 : 1)) : pic ? m.im.naturalHeight : Math.round(54 * m.scale / 100), xx = Math.round(m.x), y = (pic || m.sd ? SURF + 3 : SURF) - h - (i % 2 ? 4 : 0);
      g.globalAlpha = m.alpha;
      let ms = m.sd ? monSheet(m.sd[0], m.act) : null; if (ms && !ready(ms.im) && m.act !== 'idle') { const alt = monSheet(m.sd[0], 'idle'); if (ready(alt.im)) ms = alt; }   // 읽는 중이면 서 있기 시트로
      if (ms && ready(ms.im)) {   // 몬스터 SD: 발 기준으로 그림, 맞으면 붉게 · 치명타는 밝게
        const sc = m.sd[1] * (m.boss ? 1.25 : 1) / ms.st, fw = Math.ceil(ms.fw * sc), fh = Math.ceil(ms.fh * sc), f = m.act === 'fall' ? Math.min(ms.n - 1, Math.floor(m.mt * ms.fps)) : Math.floor(m.mt * ms.fps) % ms.n;
        tmp.width = fw; tmp.height = fh; tg.clearRect(0, 0, fw, fh); tg.imageSmoothingQuality = 'high'; tg.drawImage(ms.im, (f % ms.cols) * ms.fw, Math.floor(f / ms.cols) * ms.fh, ms.fw, ms.fh, 0, 0, fw, fh);
        const c = m.crit > 0 ? 'rgba(255,244,194,' + (0.8 * Math.min(1, m.crit * 4)) + ')' : m.flash > 0 ? 'rgba(255,40,30,' + (0.65 * Math.min(1, m.flash * 4)) + ')' : null;
        if (c) { tg.globalCompositeOperation = 'source-atop'; tg.fillStyle = c; tg.fillRect(0, 0, fw, fh); tg.globalCompositeOperation = 'source-over'; }
        g.drawImage(tmp, Math.round(xx + w / 2 - ms.ax * sc), Math.round(SURF + 1 - (i % 2 ? 4 : 0) - ms.ay * sc));
      } else if (pic && !m.sd) {   // 그림(예전 도트, ?px=1일 때만): 맞으면 붉게, 치명타는 밝게 (모험가와 같은 방식)
        tmp.width = w; tmp.height = h; tg.clearRect(0, 0, w, h); tg.drawImage(m.im, 0, 0);
        const c = m.crit > 0 ? 'rgba(255,244,194,' + (0.8 * Math.min(1, m.crit * 4)) + ')' : m.flash > 0 ? 'rgba(255,40,30,' + (0.65 * Math.min(1, m.flash * 4)) + ')' : null;
        if (c) { tg.globalCompositeOperation = 'source-atop'; tg.fillStyle = c; tg.fillRect(0, 0, w, h); tg.globalCompositeOperation = 'source-over'; }
        g.drawImage(tmp, xx, y);
      } else { g.fillStyle = m.crit > 0 ? '#fff4c2' : m.flash > 0 ? '#ff3b30' : m.boss ? '#7a2f3b' : '#5a3b6b'; g.fillRect(xx, y, w, h); g.strokeStyle = '#1b0f1f'; g.lineWidth = 2; g.strokeRect(xx + 1, y + 1, w - 2, h - 2); }
      m.cx = xx + w / 2; m.top = y - 22;
      if (P !== 'move') bar(xx, y - 9, w, 4, m.shown, enCol);
      if (v.enemies.findIndex(o => o.n === m.n) === i) { g.fillStyle = '#fff'; g.font = 'bold 11px "MaruBuri",sans-serif'; g.textAlign = 'center'; g.lineJoin = 'round'; g.lineWidth = 3; g.strokeStyle = '#120a06'; g.strokeText(m.n, xx + w / 2, y - 14); g.fillText(m.n, xx + w / 2, y - 14); }
      g.globalAlpha = 1;
    });
    // 모험가 막대: 위 노랑 = 다음 행동까지 게이지 / 가운데 빨강 = 체력 / 아래 파랑 = 마력. 길이는 몬스터 막대와 같게
    const BW = v.enemies.length ? Math.max(24, Math.round((ws.find((w, i) => !v.enemies[i].boss) || ws[0]))) : 28;
    v.actors.slice().reverse().forEach(a => { drawActor(a, a.x);
      if (!v.combat && P === 'fight' && !a.down && WORK_ICON[x.q.type]) { const bob = Math.sin(v.t * 3 + a.i) * 2, ix = Math.round(a.x), iy = SURF - 128 + bob;   // 머리 위 의뢰 종류 아이콘
        g.fillStyle = 'rgba(255,250,240,.92)'; g.strokeStyle = '#7a5032'; g.lineWidth = 1.5; g.beginPath(); g.arc(ix, iy, 10, 0, Math.PI * 2); g.fill(); g.stroke();
        g.font = '13px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#000'; g.fillText(WORK_ICON[x.q.type], ix, iy + 1); }
      if (a.show > 0.02 && !a.down) {   // 2026-11-16: 쓰러진 모험가의 막대는 숨김 (자리를 채운 동료 막대와 겹침)
        const bx = Math.round(a.x) - Math.round(BW / 2); g.globalAlpha = a.show;
        let gv = 0;
        if (v.combat && !a.down && P === 'fight') { const T = a.acts; let k = 0; while (k < T.length && T[k] <= fp) k++; const nx = T[k], pv = k ? T[k - 1] : 0; const nx2 = nx == null ? 1 : nx; gv = Math.max(0, Math.min(1, (fp - pv) / Math.max(1e-6, nx2 - pv))); }   // 2026-11-16: 마지막 행동 뒤에도 비워 두지 않고 전투 끝까지 차오름
        if (!v.combat) gv = P === 'result' ? 1 : P === 'fight' ? Math.max(0, Math.min(1, (p - 0.5) / 0.35)) : 0;   // 수행 의뢰: 수행 구간 진행도만큼 차오름
        { const Bf = root.GuildGame && GuildGame.mealBuffOf ? GuildGame.mealBuffOf(getS(), a.adv) : null;   // 2026-11-19 요리 버프: 막대 위 왼쪽 끝 작은 동그란 요리 그림 (이번 의뢰 동안)
          if (Bf && Bf.icon) { const im = buffImg(Bf.icon); if (im.complete && im.naturalWidth) { const r = 8, cx = bx + r, cy = SURF - 112 - r - 2; g.save(); g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fillStyle = '#fff3cf'; g.fill(); g.lineWidth = 1.2; g.strokeStyle = '#d9a64a'; g.stroke(); g.clip(); g.imageSmoothingEnabled = true; g.drawImage(im, cx - r + 1, cy - r + 1, r * 2 - 2, r * 2 - 2); g.restore(); } } }
        bar(bx, SURF - 112, BW, 4, gv, () => '#ffd23a');
        bar(bx, SURF - 106, BW, 4, a.hp / a.maxHp, () => '#e8443a');
        if (a.maxMp > 0) bar(bx, SURF - 100, BW, 4, a.mp / a.maxMp, () => '#3a8ee8');
        g.globalAlpha = 1; } });
    drawSay(v, dt);
    { const SKT = 1.0; v.sks = (v.sks || []).filter(o => (o.t += dt) < SKT);   // 스킬 아이콘: 0.15초에 1.15배로 톡 → 0.25초에 1배, 끝 0.25초에 흐려짐
      for (const o of v.sks) { const a = o.who; if (a.x == null || a.down) continue; const im = skImg(o.f); if (!im.complete || !im.naturalWidth) continue;
        const p = o.t < 0.15 ? 0.6 + (o.t / 0.15) * 0.55 : o.t < 0.25 ? 1.15 - (o.t - 0.15) / 0.1 * 0.15 : 1, r = 11 * p, cx = Math.round(a.x), cy = SURF - 124 - Math.min(o.t, 0.25) * 8;
        g.save(); g.globalAlpha = Math.max(0, Math.min(1, (SKT - o.t) * 4)); g.beginPath(); g.arc(cx, cy, r + 2, 0, Math.PI * 2); g.fillStyle = o.col; g.fill(); g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fillStyle = '#fff8e6'; g.fill(); g.clip(); g.imageSmoothingEnabled = true; g.drawImage(im, cx - r, cy - r, r * 2, r * 2); g.restore(); } }
    // 피해·회복 숫자: 대상 머리 위로 떠올랐다가 사라짐 (치명타는 크고 금색, 아군이 맞으면 붉게, 회복은 초록)
    v.nums = v.nums.filter(n => (n.t += dt) < NUM_T);
    // 2026-11-16: 적 숫자는 이름표보다 위, 아군 숫자는 머리 옆(말풍선 · 체력 바와 안 겹치게), 14px · 1.4초, 같은 대상에 연달아 뜨면 한 줄씩 위로
    for (const n of v.nums) { const tx = n.e ? n.who.cx : n.who.x + 24, ty = (n.e ? n.who.top - 14 - n.t * 18 : SURF - 58 - n.t * 12) - (n.k || 0) * 13 - (n.crit ? 4 : 0); if (tx == null || ty == null || isNaN(tx)) continue;
      g.globalAlpha = Math.max(0, Math.min(1, (NUM_T - n.t) * 2.5)); g.font = 'bold ' + (n.crit ? 17 : n.big ? 16 : 14) + 'px "MaruBuri",sans-serif'; g.textAlign = 'center'; g.lineJoin = 'round'; g.lineWidth = 4; g.strokeStyle = '#120a06';
      const txt = n.crit ? n.txt + '!' : n.txt; g.strokeText(txt, tx + n.ox, ty); g.fillStyle = n.col ? n.col : n.heal ? '#9dffb0' : n.crit ? '#ffd95a' : n.e ? '#fff1c2' : '#ff6b5b'; g.fillText(txt, tx + n.ox, ty); } g.globalAlpha = 1;
    // 2026-11-16: 탐색지 바닥 빛 — 비전투 수행 중 살펴보는 자리마다 숨 쉬듯 밝아지는 빛무리
    if (P === 'fight' && !v.combat) { g.save(); g.globalCompositeOperation = 'lighter';
      for (const a of v.actors) { if (a.down || a.x == null) continue; const cx = a.x + 27, cy = SURF - 3, pu = 0.5 + 0.5 * Math.sin(v.t * 3.2 + a.i * 1.7), r = 22 + pu * 10;
        const gr = g.createRadialGradient(cx, cy, 0, cx, cy, r); gr.addColorStop(0, `rgba(255,255,235,${0.8 + pu * 0.2})`); gr.addColorStop(0.3, `rgba(255,240,160,${0.5 + pu * 0.25})`); gr.addColorStop(0.65, `rgba(255,214,90,${0.2 + pu * 0.15})`); gr.addColorStop(1, 'rgba(255,200,60,0)');
        g.fillStyle = gr; g.beginPath(); g.ellipse(cx, cy, r, r * 0.45, 0, 0, Math.PI * 2); g.fill();
        const hh = 30 + pu * 14, lg = g.createLinearGradient(0, cy, 0, cy - hh); lg.addColorStop(0, `rgba(255,246,190,${0.45 + pu * 0.25})`); lg.addColorStop(1, 'rgba(255,240,170,0)');   // 위로 솟는 빛기둥
        g.fillStyle = lg; g.beginPath(); g.moveTo(cx - 9, cy); g.lineTo(cx + 9, cy); g.lineTo(cx + 5, cy - hh); g.lineTo(cx - 5, cy - hh); g.closePath(); g.fill(); }
      g.restore(); }
    v.sparks = v.sparks.filter(s => (s.life -= dt) > 0);
    for (const s of v.sparks) { s.y += s.vy * dt; g.globalAlpha = Math.min(1, s.life * 2); g.fillStyle = s.c; const sx = Math.round(s.x), sy = Math.round(s.y);
      if (s.star) { g.fillRect(sx - 2, sy, 5, 1); g.fillRect(sx, sy - 2, 1, 5); g.fillRect(sx - 1, sy - 1, 3, 3); } else g.fillRect(sx, sy, 2, 2); } g.globalAlpha = 1;
    // 문구
    const downN = x.fight ? x.fight.units.filter(u => u.down).map(u => (v.actors.find(a => a.id === u.id) || {}).name).filter(Boolean) : [];
    let msg;
    if (!v.combat) { const dots = '.'.repeat(1 + Math.floor(v.t * 2) % 3);
      msg = P === 'move' ? '길을 따라 이동 중' : P === 'meet' ? '목적지에 도착했다' : P === 'fight' ? `${WORK[x.q.type]} 중${dots}` : ok ? '의뢰 완료! 길드로 돌아갑니다' : '성과 없이 돌아갑니다…'; }
    else if (P === 'move') msg = '길을 따라 이동 중';
    else if (P === 'meet') msg = `${josa(en, '과', '와')} 조우!`;
    else if (P === 'fight') { const dn = v.actors.filter(a => a.down).map(a => a.name); msg = dn.length ? `${josa(dn.join(', '), '이', '가')} 쓰러졌다!` : `${josa(en, '과', '와')} 교전 중`; }
    else if (ok) msg = downN.length ? `의뢰 성공! (${josa(downN.join(', '), '은', '는')} 부상)` : '의뢰 성공! 길드로 돌아갑니다';
    else if (x.fight && x.fight.result === 'wipe') msg = '전원 쓰러졌다…';
    else msg = downN.length ? `${josa(downN.join(', '), '이', '가')} 쓰러졌다… 후퇴!` : '더 버티기 어렵다… 후퇴!';
    ui.querySelector('#expMsg').textContent = msg;
  }

  // ---------- 매 프레임 ----------
  // dt: 실제 초, weekFrac: 이번 주 진행(0~1), sp: 배속(0 = 일시정지)
  const known = new Map();   // 지난 프레임의 원정 (귀환 감지용)
  // ---------- 던전 갈림길 · 계속/귀환 (2026-11-21 3단계 · 시안 dg_branch · dg_cont) ----------
  //   플레이어가 보낸 던전 원정은 방마다 이어서 판정(game_core dgChoose). 질문 k번째는 진행도 DG_AT[k]에 미니 뷰를 열고 묻는다.
  //   실제 시간 6초 안에 고르지 않으면 대장 성향대로 (사용자 결정 2026-11-21: 배속과 상관없이 6초) · 빛나는 쪽 = 대장이 고를 길
  const DG_AT = [0.22, 0.44, 0.66], DG_MS = 6000;
  let dgQ = null;   // { uid, k, kind, t0, lean }
  function dgAsk(s) {
    if (!Gm.dgPending) return; const P = Gm.dgPending(s);
    if (dgQ && !P.some(p => p.uid === dgQ.uid && p.k === dgQ.k)) dgClear();   // 귀환 등으로 사라짐
    if (dgQ) { const left = DG_MS - (performance.now() - dgQ.t0), bar = ev.querySelector('.dgAsk .tm u'); if (bar) bar.style.width = Math.max(0, left / DG_MS * 100) + '%'; const sm = ev.querySelector('.dgAsk .q small i'); if (sm) sm.textContent = Math.max(0, Math.ceil(left / 1000)); if (left <= 0) dgPick(dgQ.lean); return; }
    const p = P[0]; if (!p) return; const x = s.active.find(z => z.uid === p.uid); if (!x) return;
    const e = entries().find(o => o.x === x); if (!e || e.p < (DG_AT[p.k] != null ? DG_AT[p.k] : 0.7)) return;
    if (sel !== x.q.id) { if (sel != null) close(); open(x.q.id); }
    dgQ = { uid: p.uid, k: p.k, kind: p.kind, t0: performance.now(), lean: !!p.lean };
    if (root.UI && root.UI.dgHold) root.UI.dgHold(true);   // 묻는 동안 시계 멈춤 — 1주 원정 안에 질문 3개가 다 나오도록
    const lead = s.advs.find(a => a.id === x.party[0]), hp = p.hp;
    const box = document.createElement('div'); box.className = 'dgAsk';
    box.innerHTML = p.kind === 'path'
      ? `<div class="q">갈림길 — 어느 길로?<small><i>6</i>초</small></div><div class="bt"><span class="rk ${p.lean ? 'lean' : ''}" data-v="1">좁은 통로 (위험)<em>적 강함 · 보상 +</em></span><span class="sf ${p.lean ? '' : 'lean'}" data-v="0">넓은 길 (안전)<em>적 약함</em></span></div><div class="tm"><u></u></div>`
      : `<div class="q">대장이 있습니다 · 체력 ${hp}%<small><i>6</i>초</small></div><div class="bt"><span class="go ${p.lean ? 'lean' : ''}" data-v="1">계속<em>보스 · 보상 +</em></span><span class="bk ${p.lean ? '' : 'lean'}" data-v="0">귀환<em>얻은 것만 챙김</em></span></div><div class="tm"><u></u></div>`;
    box.addEventListener('pointerdown', ev_ => ev_.stopPropagation()); box.addEventListener('pointerup', ev_ => ev_.stopPropagation());
    box.querySelectorAll('[data-v]').forEach(b => b.addEventListener('click', ev_ => { ev_.stopPropagation(); dgPick(b.dataset.v === '1'); }));
    ev.appendChild(box);
  }
  function dgClear() { if (dgQ && root.UI && root.UI.dgHold) root.UI.dgHold(false); dgQ = null; ev.querySelectorAll('.dgAsk').forEach(b => b.remove()); }
  function dgPick(v) {
    const s = getS(), q_ = dgQ; dgClear(); if (!q_) return; Gm.dgChoose(s, q_.uid, v);
    const x = s.active.find(z => z.uid === q_.uid); if (x && sel === x.q.id) { const id = sel; close(); setTimeout(() => open(id), 220); }   // 새 방 싸움으로 미니 뷰를 다시 그림
  }
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  X.update = function (dt, weekFrac, sp) {
    const s = getS(); frac = weekFrac; speed = sp; clock += dt;
    const hide = !!(root.Town && root.Town.active);   // 마을 화면에서는 숨김
    if (hide !== X.hidden) { X.hidden = hide; for (const id of ['#hudExp', '#expView', '#expTip']) ui.querySelector(id).style.visibility = hide ? 'hidden' : ''; }
    // 귀환 감지: 지난 프레임에 있던 원정이 사라지면 2.2초(배속 반영) 동안 "귀환"으로 남김
    const now = new Map(shown(s).map(x => [x.q.id, x])); let changed = false;
    const all = new Set(s.active.map(x => x.q.id));
    for (const [id, x] of known) if (!now.has(id)) { if (!all.has(id)) ghosts.set(id, { x, doneAt: clock }); changed = true; }   // 귀환했을 때만 '귀환' 표시
    for (const id of now.keys()) if (!known.has(id)) changed = true;
    known.clear(); for (const [id, x] of now) known.set(id, x);
    for (const [id, gh] of ghosts) if (clock - gh.doneAt > 2.2 / Math.max(1, sp)) { ghosts.delete(id); changed = true; if (sel === id) close(); }
    if (changed) render(); else if (Math.floor(clock * 4) !== Math.floor((clock - dt) * 4)) soft();
    if (view) drawScene(sp > 0 ? dt * Math.min(3, sp) : 0);
    dgAsk(s);   // 2026-11-21 던전 갈림길 · 계속/귀환
  };
  root.Expedition = X;
})(this);
