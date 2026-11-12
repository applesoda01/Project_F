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
  X.reset = function () { const s = getS(); evPos = (s.ui && s.ui.expView) || null; ghosts.clear(); known.clear(); close(); place(); render(); };
  function place() { if (evPos) { ev.style.left = evPos.x + 'px'; ev.style.top = evPos.y + 'px'; ev.style.right = 'auto'; } else { ev.style.left = ''; ev.style.top = ''; ev.style.right = ''; } }
  function updSmall() { let o = !!view; if (o && evPos) { const a = evPos; o = a.x < PANEL.x + PANEL.w && a.x + EVW > PANEL.x && a.y < PANEL.y + PANEL.h && a.y + EVH > PANEL.y; } ui.querySelector('#hudExp').classList.toggle('small', o); }

  // ---------- 목록 ----------
  // C작업 (2026-11-12): 의뢰를 수락해도 파티원이 아직 로비에 있으면(리나에게 접수 → 문으로 걸어 나가는 중) 목록에 올리지 않음. 모두 건물을 나간 뒤에 표시
  const outside = x => !(root.Director && root.Director.actors && x.party.some(id => root.Director.actors.has(id)));
  const shown = s => s.active.filter(outside);
  function entries() {
    const s = getS(), out = [];
    for (const x of shown(s)) out.push(entry(s, x, false));
    for (const gh of ghosts.values()) out.push(entry(s, gh.x, true));
    return out;
  }
  function entry(s, x, done) {
    const weeks = x.weeks || x.q.weeks || 1, start = x.start != null ? x.start : x.back - weeks;
    const p = done ? 1 : Math.max(0, Math.min(1, (s.week - 1 - start + frac) / weeks));
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
      const rate = x.rate != null ? x.rate : Math.round((x.p || 0) * 100), [rc, rt] = risk(rate);
      const r = document.createElement('div'); r.className = 'row' + (sel === e.id ? ' sel' : ''); r.dataset.id = e.id;
      let ticks = ''; for (let w = 1; w < e.weeks; w++) ticks += `<b style="left:${w / e.weeks * 100}%"></b>`;
      r.innerHTML = `<div class="badge">${GR[q.g]}</div><div class="l1"><span class="nm">${nm}</span><span class="qn">${q.name || GR[q.g] + '급 ' + QTYPE[q.type] + ' 의뢰'}</span></div>
        <div class="l2"><div class="pb"><i style="width:${e.p * 100}%"></i>${ticks}</div><span class="left">${leftText(e)}</span><span class="risk ${rc}">${rt}</span></div>`;
      r.onclick = () => open(e.id);
      r.onmouseenter = () => {
        tip.style.display = 'block'; tip.style.top = (PANEL.y + r.offsetTop - list.scrollTop) + 'px';
        const en = x.fight ? groupName(x.fight.enemies) : null;
        tip.innerHTML = `<b>${q.name || QTYPE[q.type] + ' 의뢰'}</b> (${GR[q.g]}급 ${QTYPE[q.type]})<br>예상 성공률 ${Math.min(100, rate)}%<br>${en ? '적: ' + en : '비전투 의뢰'}<br>파티: ${party.map(a => `${a.name}(${a.cls} Lv${a.lv})`).join(', ')}`;
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
  function open(id) {
    if (sel === id) { close(); return; }
    const s = getS(), e = entries().find(o => o.id === id); if (!e) return;
    const x = e.x, F = x.fight, party = x.party.map(pid => advOf(s, pid)).filter(Boolean).sort((a, b) => ROW[a.core] - ROW[b.core]);
    sel = id;
    const unitOf = a => (F && F.units.find(u => u.id === a.id)) || null;
    view = { id, cam: 0, t: 0, phaseT: 0, phase: null, ev: timeline(F), applied: 0, fresh: true, sparks: [], nums: [], combat: !!F,
      actors: party.map((a, i) => { const u = unitOf(a), k = CLS[a.core] + '_' + sexOf(a); ['walk', 'run', 'attack', 'fall'].forEach(n => img(k + '_' + n));
        return { id: a.id, name: a.name, k, i, x: 0, anim: 'walk', t: Math.random(), flash: 0, glow: 0, dodge: 0, dir: 1, hp: u ? u.maxHp : 1, maxHp: u ? u.maxHp : 1, mp: u ? u.maxMp : 0, maxMp: u ? u.maxMp : 0, acts: actTimes(F, a.id), down: false, show: 0 }; }),
      enemies: (F ? F.enemies : []).map((m, i) => ({ n: m.name, boss: m.boss, scale: m.boss ? 140 : 100, im: monImg(m.mon), x: 540 + i * 56, flash: 0, crit: 0, alpha: 1, hp: m.maxHp, maxHp: m.maxHp, shown: 1 })) };
    ev.classList.add('on'); requestAnimationFrame(() => ev.classList.add('vis')); updSmall(); render();
  }
  function close() { sel = null; view = null; if (!ev) return; ev.classList.remove('vis'); setTimeout(() => { if (!view) ev.classList.remove('on'); }, 200); ui.querySelector('#hudExp').classList.remove('small'); render(); }
  X.close = close;

  const MEET_END = 0.34; // 전투 의뢰는 조우 직후 곧바로 교전 (조우 구간 30~34%)
  const phaseOf = (p, c) => p < 0.3 ? 'move' : p < (c ? MEET_END : 0.5) ? 'meet' : p < 0.85 ? 'fight' : 'result';
  const SURF = 150, GAP = 54, LEAD_X = 270;
  const SHEET = { walk: [128, 96, 64, 8, 100, true], run: [128, 96, 64, 8, 75, true], attack: [128, 96, 64, 8, 90, true], fall: [160, 104, 104, 10, 110, false], stand: [128, 96, 64, 8, 100, false] };
  const tmp = document.createElement('canvas'), tg = tmp.getContext('2d');
  function drawActor(a, x) {
    const [cw, ch, px, n, ms, loop] = SHEET[a.anim], im = IM[a.k + '_' + (a.anim === 'stand' ? 'walk' : a.anim)]; if (!im || !im.complete || !im.naturalWidth) return;
    let f = a.anim === 'stand' ? 0 : Math.floor(a.t * 1000 / ms); f = loop ? f % n : Math.min(f, n - 1);
    tmp.width = cw; tmp.height = ch; tg.clearRect(0, 0, cw, ch); tg.drawImage(im, f * cw, 0, cw, ch, 0, 0, cw, ch);
    const tint = (c, k) => { tg.globalCompositeOperation = 'source-atop'; tg.fillStyle = c.replace('A', k); tg.fillRect(0, 0, cw, ch); tg.globalCompositeOperation = 'source-over'; };
    if (a.flash > 0) tint('rgba(255,40,30,A)', 0.65 * Math.min(1, a.flash * 4));      // 피격: 붉게
    if (a.glow > 0) tint('rgba(120,255,140,A)', 0.55 * Math.min(1, a.glow * 3));      // 물약·회복: 초록
    const ox = a.dodge > 0 ? -Math.sin((1 - a.dodge / 0.3) * Math.PI) * 10 * a.dir : 0; // 회피: 살짝 뒤로 비킴
    g.save(); if (a.dir < 0) { g.translate(Math.round(x + ox), 0); g.scale(-1, 1); g.drawImage(tmp, -px, SURF - 92); } else g.drawImage(tmp, Math.round(x + ox) - px, SURF - 92); g.restore();
  }
  function bar(x, y, w, h, v, col) { g.fillStyle = 'rgba(0,0,0,.75)'; g.fillRect(x - 1, y - 1, w + 2, h + 2); g.fillStyle = '#2a1010'; g.fillRect(x, y, w, h); const hw = Math.round(w * Math.max(0, Math.min(1, v))); g.fillStyle = col(v); g.fillRect(x, y, hw, h); g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(x, y, hw, 1); }
  const hpCol = v => v > 0.5 ? '#5fd16b' : v > 0.25 ? '#e8c13a' : '#e8443a', enCol = v => v > 0.5 ? '#e8443a' : v > 0.25 ? '#e8913a' : '#e8d23a';
  // 기록 1건 반영. fx=false 면 효과 없이 상태만 (미니 뷰를 교전 도중에 열었을 때)
  function apply(v, x, fx) {
    const A = id => v.actors.find(a => a.id === id), E = i => v.enemies[i];
    if (x.by && x.mp != null) { const b = A(x.by); if (b) b.mp = x.mp; }
    if (x.t === 'hit') { const m = E(x.to); if (!m) return; m.hp = x.hp; if (fx) { m.flash = 0.25; if (x.c) m.crit = 0.4; if (x.d != null) v.nums.push({ who: m, e: 1, txt: String(x.d), crit: !!x.c, t: 0, ox: Math.random() * 14 - 7 }); } }
    else { const a = A(x.to); if (!a) return;
      if (x.t === 'hurt') { a.hp = x.hp; if (fx) { a.flash = 0.3; if (x.d != null) v.nums.push({ who: a, txt: String(x.d), t: 0, ox: Math.random() * 10 - 5 }); } }
      else if (x.t === 'miss') { if (fx) a.dodge = 0.3; }
      else if (x.t === 'heal' || x.t === 'potion') { if (x.hp != null) a.hp = x.hp; if (fx) { a.glow = 0.5; if (x.d != null && x.d > 0) v.nums.push({ who: a, txt: '+' + x.d, heal: true, t: 0, ox: Math.random() * 10 - 5 }); for (let k = 0; k < 5; k++) v.sparks.push({ x: a.x + (Math.random() * 20 - 10), y: SURF - 40 - Math.random() * 20, vy: -20 - Math.random() * 20, life: 0.6, c: '#9dffb0' }); } }
      else if (x.t === 'down') { a.hp = 0; a.down = true; a.anim = 'fall'; a.t = 0; } }
  }
  function drawScene(dt) {
    const v = view, e = entries().find(o => o.id === v.id); if (!e) { close(); return; }
    const x = e.x, ok = x.ok != null ? x.ok : (x.fight ? x.fight.win : true), p = e.p, ph = phaseOf(p, !!x.fight);
    if (ph !== v.phase && v.phaseT >= 0.5 / Math.max(speed, 1) || v.phase === null) { v.phase = ph; v.phaseT = 0; }
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
    for (const [k, x0] of [['o_pine', 20], ['o_oak', 150], ['o_pine', 260], ['o_pine', 330], ['o_oak', 420], ['o_pine', 500]]) {
      const im = IM[k]; if (!im.complete || !im.naturalWidth) continue; const xx = ((x0 - v.cam * 0.4) % 560 + 560) % 560 - 60;
      g.globalAlpha = .45; g.drawImage(im, xx, SURF + 2 - im.height * 0.8, im.width * 0.8, im.height * 0.8); g.globalAlpha = 1;
    }
    const c0 = Math.floor(v.cam / 32);
    for (let i = c0; i <= c0 + 16; i++) { const xx = i * 32 - Math.round(v.cam), h = (i * 7919) % 97, a = IM[h % 3 ? 'fdirt_a' : 'fdirt_b'], b = IM[h % 4 ? 'forest_a' : 'forest_b'];
      if (a.naturalWidth) g.drawImage(a, xx, SURF + 4 + 32); if (b.naturalWidth) g.drawImage(b, xx, SURF + 4 - 12 - 8); }
    // 배우
    v.actors.forEach(a => {
      const home = LEAD_X - a.i * GAP; a.t += dt;
      if (a.down) { a.x = a.x || home; if (a.anim !== 'fall') { a.anim = 'fall'; a.t = 0; } }
      else if (P === 'move' || P === 'meet') { a.anim = 'walk'; a.x = home; a.dir = 1; }
      else if (P === 'fight') { a.x = home; a.anim = v.combat ? 'attack' : 'stand';
        if (!v.combat && Math.random() < dt * 1.5) v.sparks.push({ x: home + 10 + Math.random() * 30, y: SURF - 6, vy: -25 - Math.random() * 15, life: 0.8, c: '#ffe58a' }); }
      else { const walkBack = !v.combat && !ok;   // 결과: 성공 → 오른쪽으로 떠남, 실패 → 왼쪽으로 후퇴(비전투는 걸어서 돌아감)
        if (ok) { a.anim = 'run'; a.dir = 1; a.x = (a.x || home) + 150 * dt; } else { a.anim = walkBack ? 'walk' : 'run'; a.dir = -1; a.x = (a.x || home) - (walkBack ? 60 : 150) * dt; } }
      a.flash = Math.max(0, a.flash - dt); a.glow = Math.max(0, a.glow - dt); a.dodge = Math.max(0, a.dodge - dt);
      a.show += ((v.combat && (P === 'fight' || P === 'result') ? 1 : 0) - a.show) * Math.min(1, dt * 6);
    });
    // 적: x=316부터 오른쪽 끝(478)까지. 넘치면 겹쳐서 줄이고, 홀수 번째는 4px 뒤(위)에 서서 덜 겹쳐 보이게. 그림이 있으면 그림 크기 그대로(도트 1:1), 없으면 상자(보스 140%)
    const ws = v.enemies.map(m => ready(m.im) ? m.im.naturalWidth : Math.round(40 * m.scale / 100)), tot = ws.reduce((t, w) => t + w, 0) + 4 * (ws.length - 1), shrink = ws.length > 1 ? Math.min(0, (162 - tot) / (ws.length - 1)) : 0, XS = [];
    ws.reduce((xx, w, i) => (XS[i] = xx, xx + w + 4 + shrink), 316);
    const drawOrder = v.enemies.map((m, i) => i).sort((a, b) => (b % 2) - (a % 2) || a - b);   // 뒤(홀수) 먼저
    drawOrder.forEach(i => { const m = v.enemies[i];
      if (P === 'move') m.x = 540 + i * 56; else m.x += (XS[i] - m.x) * Math.min(1, dt * 3);
      m.flash = Math.max(0, m.flash - dt); m.crit = Math.max(0, m.crit - dt); m.shown += (m.hp / m.maxHp - m.shown) * Math.min(1, dt * 8);
      if (m.hp <= 0) m.alpha = Math.max(0, m.alpha - dt * 1.2); if (m.alpha <= 0) return;
      const pic = ready(m.im), w = ws[i], h = pic ? m.im.naturalHeight : Math.round(54 * m.scale / 100), xx = Math.round(m.x), y = (pic ? SURF + 3 : SURF) - h - (i % 2 ? 4 : 0);
      g.globalAlpha = m.alpha;
      if (pic) {   // 그림: 맞으면 붉게, 치명타는 밝게 (모험가와 같은 방식)
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
      if (a.show > 0.02 && !(a.down && P === 'result' && a.t > 1.5)) {
        const bx = Math.round(a.x) - Math.round(BW / 2); g.globalAlpha = a.show;
        let gv = 0;
        if (v.combat && !a.down && P === 'fight') { const T = a.acts; let k = 0; while (k < T.length && T[k] <= fp) k++; const nx = T[k], pv = k ? T[k - 1] : 0; gv = nx == null ? 0 : Math.max(0, Math.min(1, (fp - pv) / Math.max(1e-6, nx - pv))); }
        if (!v.combat) gv = P === 'result' ? 1 : P === 'fight' ? Math.max(0, Math.min(1, (p - 0.5) / 0.35)) : 0;   // 수행 의뢰: 수행 구간 진행도만큼 차오름
        bar(bx, SURF - 112, BW, 4, gv, () => '#ffd23a');
        bar(bx, SURF - 106, BW, 4, a.hp / a.maxHp, () => '#e8443a');
        if (a.maxMp > 0) bar(bx, SURF - 100, BW, 4, a.mp / a.maxMp, () => '#3a8ee8');
        g.globalAlpha = 1; } });
    // 피해·회복 숫자: 대상 머리 위로 떠올랐다가 사라짐 (치명타는 크고 금색, 아군이 맞으면 붉게, 회복은 초록)
    v.nums = v.nums.filter(n => (n.t += dt) < 1.1);
    for (const n of v.nums) { const tx = n.e ? n.who.cx : n.who.x, ty = (n.e ? n.who.top : SURF - 118) - n.t * 22 - (n.crit ? 4 : 0); if (tx == null || ty == null) continue;
      g.globalAlpha = Math.max(0, Math.min(1, (1.1 - n.t) * 2.2)); g.font = 'bold ' + (n.crit ? 15 : 12) + 'px "MaruBuri",sans-serif'; g.textAlign = 'center'; g.lineJoin = 'round'; g.lineWidth = 3; g.strokeStyle = '#120a06';
      const txt = n.crit ? n.txt + '!' : n.txt; g.strokeText(txt, tx + n.ox, ty); g.fillStyle = n.heal ? '#9dffb0' : n.crit ? '#ffd95a' : n.e ? '#ffffff' : '#ff6b5b'; g.fillText(txt, tx + n.ox, ty); } g.globalAlpha = 1;
    v.sparks = v.sparks.filter(s => (s.life -= dt) > 0);
    for (const s of v.sparks) { s.y += s.vy * dt; g.globalAlpha = Math.min(1, s.life * 2); g.fillStyle = s.c; g.fillRect(Math.round(s.x), Math.round(s.y), 2, 2); } g.globalAlpha = 1;
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
  };
  root.Expedition = X;
})(this);
