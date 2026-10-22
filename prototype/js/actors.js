/* 모험가 이동 (M2-5) + 규칙 연결 (M2-7)
   - 매주 규칙(stepWeek)을 돌리기 전·후 상태를 비교해 '무슨 일이 있었는지'를 알아내고, 화면 속 행동 대본으로 바꾼다.
       귀환 → 입구로 들어와 소재 매입 창구(성공) 또는 접수 창구(실패)에서 보고
       출발 → (식사한 경우 식당 창구) → 접수 창구에서 리나가 의뢰서를 떼어 건넴 → 입구로 나감
       방문 → 들어와 빈자리에 앉거나 서성임 / 첫 방문은 접수 창구에서 인사
       떠남 → 자리에서 일어나 나감
   - 규칙 파일(game_core.js)은 건드리지 않는다. 화면은 규칙의 결과를 '보여 주기만' 한다.
   - 걷기 그림이 아직 없어 정지 SD를 통통 튀게 움직인다(위로 갈 때 뒷모습, 아래로 갈 때 앞모습). */
(function (root) {
  'use strict';
  const A = root.Assets, CLS = root.ASSET_MANIFEST.CLS, Lina = root.Lina, Speech = root.Speech;
  const EXIT = { x: 960, y: 1190 }, INSIDE = { x: 960, y: 1010 };
  const LOITER = [{ x: 230, y: 770 }, { x: 1690, y: 770 }, { x: 760, y: 1010 }, { x: 1160, y: 1010 }, { x: 260, y: 1000 }, { x: 1660, y: 1000 }];
  const QSPOT = [[-130, 650], [-225, 700], [-320, 748], [-145, 790], [-240, 832], [-335, 872]]; // 리나(가운데)를 가리지 않게 왼쪽 앞에서 응대, 줄은 왼쪽 아래로

  // 2차·3차 직업 그림 파일 이름 (chr_<키>_<성별>_<방향>.png). 파일이 없으면 1차 그림 + 직업 표식으로 대신함
  const CLASS_KEY = { 광전사: 'berserker', 사냥꾼: 'hunter', 괴도: 'phantom', 마도사: 'sorcerer', 신관: 'priest', 레인저: 'ranger', 마검사: 'spellblade', 기사: 'knight', 쌍검사: 'dualblade',
    마궁사: 'arcanearcher', 수도사: 'monk', 추적자: 'tracker', 점성술사: 'astrologer', 연금술사: 'alchemist', 광대: 'jester' };
  // 걷기 시트 (M2-5 보강): chr_<직업>_<성별>_walk 가 있으면 사용
  const WK = root.ASSET_MANIFEST.WALK, STEP_SCREEN = WK.stepPx * (250 / WK.charH);      // 한 걸음이 화면에서 움직이는 거리
  const WALK_SPEED = STEP_SCREEN * 2 / (WK.cols / WK.fps);                                // 30fps로 24프레임(두 걸음)을 재생하는 속도
  const walkSheet = ac => { const it = A.items[ac.key + '_walk']; return it && it.ok ? it : null; };
  const D = { actors: new Map(), seats: [], winUse: { meal: [], quest: [], sale: [] }, speed: 1, t: 0 };
  const sexOf = a => (a.id % 2 ? 'm' : 'f');

  // ---------- 좌석 ----------
  D.layout = function (tables) { // Lobby가 테이블 배치를 알려 준다
    const old = D.seats; D.seats = [];
    tables.forEach((T, i) => {
      for (const dx of [-88, 88]) {
        const back = i >= 2; // 앞줄 테이블은 앞자리에 등을 보이고 앉음
        const seat = back ? { x: T.x + dx, y: T.y + 126, z: T.y + 108, dir: 'back', ap: { x: T.x + dx * 1.5, y: T.y + 175 } }
          : { x: T.x + dx, y: T.y + 52, z: T.y + 65, dir: 'front', ap: { x: T.x + dx * 1.9, y: T.y + 70 } };
        const prev = old.find(o => o.x === seat.x && o.y === seat.y); seat.by = prev ? prev.by : null;
        D.seats.push(seat);
      }
    });
  };
  function freeSeat(ac) { const fr = D.seats.filter(s => !s.by); if (!fr.length) return null; const s = fr[(ac.id * 7) % fr.length]; s.by = ac.id; return s; }
  function release(ac) { if (ac.seat) { ac.seat.by = null; ac.seat = null; } if (ac.loiter != null) { LOITER[ac.loiter].by = null; ac.loiter = null; } }
  function claimWin(win, ac) { const u = D.winUse.quest; /* 리나가 가운데 고정 → 용건과 상관없이 한 줄 */ let i = u.indexOf(null); if (i < 0) { i = u.length; u.push(null); } u[i] = ac.id; const q = QSPOT[Math.min(i, QSPOT.length - 1)]; return { x: Lina.WIN[win] + q[0] + (i >= QSPOT.length ? -(i - QSPOT.length + 1) * 60 : 0), y: q[1], i }; }
  function freeWin(win, ac) { const u = D.winUse.quest; const i = u.indexOf(ac.id); if (i >= 0) u[i] = null; while (u.length && u[u.length - 1] === null) u.pop(); }

  // ---------- 배우 ----------
  function actor(a, at) {
    let ac = D.actors.get(a.id);
    if (ac) ac.a = a;
    if (!ac) { ac = { a, id: a.id, key: `chr_${CLS[a.core]}_${sexOf(a)}`, x: at.x, y: at.y, dir: 'back', pose: 'stand', tasks: [], ph: Math.random() * 6, bubble: null, chatAt: D.t + 6 + Math.random() * 10, seat: null, loiter: null }; D.actors.set(a.id, ac); }
    return ac;
  }
  const T = (ac, k, o) => ac.tasks.push(Object.assign({ k }, o || {}));
  function standUp(ac) { if (ac.pose === 'sit' || ac.loiter != null) { const ap = ac.seat ? ac.seat.ap : null; release(ac); ac.pose = 'stand'; if (ap) T(ac, 'walk', { to: ap }); } }
  function settle(ac) { // 앉을 자리 → 서성일 자리 → 없으면 나감
    T(ac, 'do', { fn: () => {
      const s = freeSeat(ac);
      if (s) { ac.tasks.unshift({ k: 'walk', to: s.ap }, { k: 'sit', seat: s }); return; }
      const li = LOITER.findIndex(l => !l.by);
      if (li >= 0) { LOITER[li].by = ac.id; ac.loiter = li; ac.tasks.unshift({ k: 'walk', to: LOITER[li] }, { k: 'face', dir: 'front' }); return; }
      ac.tasks.unshift({ k: 'walk', to: EXIT }, { k: 'remove' });
    } });
  }
  function leave(ac) { T(ac, 'do', { fn: () => { standUp(ac); ac.tasks.push({ k: 'walk', to: INSIDE }, { k: 'walk', to: EXIT }, { k: 'remove' }); } }); }
  function enter(ac) { T(ac, 'walk', { to: INSIDE }); }
  function visitWindow(ac, win, job, line) { // 창구로 가서 리나에게 응대를 받음
    let spot;
    T(ac, 'do', { fn: () => { standUp(ac); spot = claimWin(win, ac); ac.tasks.unshift({ k: 'walk', to: spot }, { k: 'face', dir: 'back' }); } });
    if (job) T(ac, 'lina', { job: Object.assign({ win }, job), line });
    else if (line) T(ac, 'say', { text: line });
    T(ac, 'do', { fn: () => freeWin(win, ac) });
  }

  // ---------- 주간 변화 → 대본 (M2-7) ----------
  D.snap = function (s) {
    return { active: new Map(s.active.map(x => [x.q.id, x])), board: new Set(s.board.map(q => q.id)),
      adv: new Map(s.advs.map(a => [a.id, { state: a.state, alive: a.alive, done: a.done, grade: a.grade }])), log: s.log[0] };
  };
  // 이전 주 대본이 남아 있으면 결과 상태로 바로 건너뜀 (작업이 끝없이 쌓이지 않게)
  D.flush = function () {
    Lina.flush();
    for (const [id, ac] of [...D.actors]) {
      if (id < 0) continue;
      let guard = 0;
      while (ac.tasks.length && guard++ < 500) {
        const k = ac.tasks.shift();
        if (k.k === 'walk') { ac.x = k.to.x; ac.y = k.to.y; ac.pose = 'stand'; }
        else if (k.k === 'sit') { ac.seat = k.seat; ac.x = k.seat.x; ac.y = k.seat.y; ac.dir = k.seat.dir; ac.pose = 'sit'; }
        else if (k.k === 'face') ac.dir = k.dir;
        else if (k.k === 'do') k.fn();
        else if (k.k === 'lina' && !k.sent && k.job.onStart) k.job.onStart();
        else if (k.k === 'remove') { release(ac); D.actors.delete(id); break; }
      }
    }
    for (const w in D.winUse) D.winUse[w] = [];
  };
  D.onWeek = function (before, s, Board) {
    D.flush();
    const after = D.snap(s), busy = new Set(), find = id => s.advs.find(a => a.id === id);
    // 1) 귀환
    for (const [qid, x] of before.active) {
      if (after.active.has(qid)) continue;
      const party = x.party.map(find).filter(Boolean);
      const ok = party.some(a => (before.adv.get(a.id) || {}).done < a.done);
      party.forEach((a, i) => {
        busy.add(a.id); const ac = actor(a, EXIT);
        T(ac, 'wait', { t: i * 0.5 }); enter(ac);
        if (i === 0) visitWindow(ac, ok ? 'sale' : 'quest', { mode: ok ? 'happy' : 'talk', text: ok ? '수고하셨어요! 소재는 제가 살게요.' : '무사히 돌아와서 다행이에요.', dur: 1.6 }, Speech.line(a, ok ? 'success' : 'fail'));
        else visitWindow(ac, ok ? 'sale' : 'quest', null, i === 1 ? Speech.line(a, ok ? 'success' : 'fail') : null);
      });
    }
    // 2) 출발 (새로 생긴 진행 의뢰)
    for (const [qid, x] of after.active) {
      if (before.active.has(qid)) continue;
      Board.hold(qid); // 리나가 떼어 낼 때까지 게시판에 남겨 둠
      const party = x.party.map(find).filter(Boolean);
      party.forEach((a, i) => {
        const had = D.actors.has(a.id), ac = actor(a, EXIT);
        if (!had) { T(ac, 'wait', { t: i * 0.5 }); enter(ac); } // 이번 주에 마을에 와서 바로 떠나는 경우: 입구에서 들어옴
        busy.add(a.id);
        if (x.ate && i < x.ate) visitWindow(ac, 'meal', i === 0 ? { mode: 'talk', text: '오늘의 요리 나왔어요!', dur: 1.3 } : null, Speech.line(a, 'meal'));
        if (i === 0) visitWindow(ac, 'quest', { mode: 'paper', text: '다녀오세요! 조심하시고요.', dur: 1.7, onStart: () => Board.take(qid) }, Speech.line(a, 'accept'));
        else T(ac, 'wait', { t: 1.2 });
        T(ac, 'say', { text: i === 0 ? Speech.line(a, 'depart') : '' });
        leave(ac);
      });
    }
    // 3) 귀환한 사람의 마무리 (다시 떠나지 않은 경우)
    for (const id of busy) {
      const a = find(id); if (!a) continue; const ac = D.actors.get(id); if (!ac) continue;
      const leaving = ac.tasks.some(t => t.k === 'remove');
      if (leaving) continue;
      if (a.alive && a.state === 'town') settle(ac); else leave(ac);
    }
    // 4) 방문·첫 방문
    for (const a of s.advs) {
      if (busy.has(a.id) || !a.alive || a.state !== 'town' || D.actors.has(a.id)) continue;
      const ac = actor(a, EXIT); T(ac, 'wait', { t: Math.random() * 2 }); enter(ac);
      if (!before.adv.has(a.id)) visitWindow(ac, 'quest', { mode: 'wave', text: '어서 오세요! 처음 오셨죠?', dur: 1.6 }, Speech.line(a, 'first'));
      settle(ac);
    }
    // 5) 떠남 (마을 밖으로)
    for (const [id, ac] of D.actors) {
      if (id < 0) continue; // 시연용 배우
      const a = find(id); if (busy.has(id) || ac.tasks.some(t => t.k === 'remove')) continue;
      if (!a || !a.alive || a.state !== 'town') leave(ac);
    }
    // 6) 기록에서 한마디 (승급·결산)
    for (const L of s.log) {
      if (L === before.log) break;
      if (L.kind === 'grow' && L.text.includes('급 모험가가 되었습니다')) { const a = s.advs.find(b => L.text.startsWith(b.name)); const ac = a && D.actors.get(a.id); if (ac) say(ac, Speech.line(a, 'gradeup'), 2.4); }
      if (L.kind === 'grow' && L.text.includes('의 레벨이')) { const a = s.advs.find(b => L.text.startsWith(b.name + '의')); const ac = a && D.actors.get(a.id); if (ac && !ac.bubble) say(ac, Speech.line(a, 'levelup'), 2.2); }
      if (L.kind === 'ledger' && root.UI && !root.UI.autoReport) Lina.say('이번 달 결산이 나왔어요!', 2.4);
      if (L.kind === 'unlock') Lina.say('새 요리가 메뉴에 올랐어요!', 2.4);
    }
  };
  // 처음 화면: 마을에 있는 모험가를 바로 앉혀 둔다
  D.init = function (s) {
    for (const a of s.advs) if (a.alive && a.state === 'town') {
      const ac = actor(a, INSIDE); const st = freeSeat(ac);
      if (st) { ac.seat = st; ac.x = st.x; ac.y = st.y; ac.pose = 'sit'; ac.dir = st.dir; } else settle(ac);
    }
  };

  // [개발] 걷기 시트 시연: 남녀 전사가 로비를 네모로 돌며 4방향을 모두 보여 줌 (한 번 더 누르면 사라짐)
  D.demoWalk = function () {
    if (D.actors.has(-1)) { D.actors.delete(-1); D.actors.delete(-2); return false; }
    const loop = (y) => [{ k: 'walk', to: { x: 1750, y } }, { k: 'walk', to: { x: 1750, y: y - 190 } }, { k: 'walk', to: { x: 150, y: y - 190 } }, { k: 'walk', to: { x: 150, y } }];
    for (const [id, key, y, x] of [[-1, 'chr_warrior_m', 1000, 150], [-2, 'chr_warrior_f', 1000, 950]]) {
      const ac = { a: null, id, key, x, y, dir: 'front', pose: 'stand', tasks: [], ph: 0, bubble: null, chatAt: 1e12, idleAt: 1e12, seat: null, loiter: null };
      const again = () => { ac.tasks.push(...loop(y), { k: 'do', fn: again }); };
      again(); D.actors.set(id, ac);
    }
    return true;
  };
  D.celebrate = function (id) { const ac = D.actors.get(id); if (ac) { ac.fx = D.t + 2.4; say(ac, '힘이 넘친다…!', 2.4); } };
  D.reset = function (s) { D.actors.clear(); for (const st of D.seats) st.by = null; for (const l of LOITER) l.by = null; for (const w in D.winUse) D.winUse[w] = []; D.init(s); };
  function say(ac, text, dur) { if (text) ac.bubble = { text, until: D.t + (dur || 1.8) }; }

  // ---------- 매 프레임 ----------
  D.update = function (dt) {
    D.t += dt;
    for (const [id, ac] of D.actors) {
      let budget = dt;
      while (budget > 0 && ac.tasks.length) {
        const k = ac.tasks[0];
        if (k.k === 'walk') {
          // 걷기 시트가 있으면 걸음 폭에 맞춘 속도(발이 미끄러지지 않게), 없으면 기존 속도
          const sh = walkSheet(ac), sp = sh ? WALK_SPEED : 250;
          // 상하좌우로만 이동: 대각선 목표는 꺾이는 지점을 하나 끼워 두 구간으로 나눈다.
          // 위로 갈 때는 세로 먼저(카운터·자리 쪽으로 곧게 올라감), 아래로 갈 때는 가로 먼저(통로로 나와서 내려감)
          if (!k.ortho) {
            k.ortho = true;
            const ex = k.to.x - ac.x, ey = k.to.y - ac.y;
            if (Math.abs(ex) > 3 && Math.abs(ey) > 3) { ac.tasks.unshift({ k: 'walk', ortho: true, to: ey < 0 ? { x: ac.x, y: k.to.y } : { x: k.to.x, y: ac.y } }); continue; }
          }
          const dx = k.to.x - ac.x, dy = k.to.y - ac.y, dist = Math.hypot(dx, dy);
          if (Math.abs(dy) >= Math.abs(dx)) { ac.dir = dy < 0 ? 'back' : 'front'; ac.dir4 = dy < 0 ? 'up' : 'down'; } else { ac.dir4 = dx < 0 ? 'left' : 'right'; if (ac.dir === 'back') ac.dir = 'front'; }
          ac.pose = 'walk';
          const mv = Math.min(dist, sp * budget);
          ac.wf = (ac.wf || 0) + mv / STEP_SCREEN * 12; // 12프레임 = 한 걸음
          if (dist <= sp * budget) { ac.x = k.to.x; ac.y = k.to.y; budget -= dist / sp; ac.tasks.shift(); ac.pose = 'stand'; }
          else { ac.x += dx / dist * sp * budget; ac.y += dy / dist * sp * budget; ac.ph += budget * 9; budget = 0; }
        } else if (k.k === 'wait') { if (k.t <= budget) { budget -= k.t; ac.tasks.shift(); } else { k.t -= budget; budget = 0; } }
        else if (k.k === 'say') { say(ac, k.text, 1.8); ac.tasks.shift(); }
        else if (k.k === 'face') { ac.dir = k.dir; ac.tasks.shift(); }
        else if (k.k === 'sit') { ac.seat = k.seat; ac.x = k.seat.x; ac.y = k.seat.y; ac.dir = k.seat.dir; ac.pose = 'sit'; ac.tasks.shift(); }
        else if (k.k === 'do') { ac.tasks.shift(); k.fn(); }
        else if (k.k === 'lina') {
          if (!k.sent) { k.sent = true; say(ac, k.line, 1.6); Lina.request(Object.assign({}, k.job, { done: () => { k.ok = true; } })); }
          if (k.ok) ac.tasks.shift(); else budget = 0;
        } else if (k.k === 'remove') { release(ac); D.actors.delete(id); budget = 0; }
      }
      if (ac.bubble && D.t > ac.bubble.until) ac.bubble = null;
      if (!ac.tasks.length && D.t > ac.chatAt) { ac.chatAt = D.t + 10 + Math.random() * 14; if (Math.random() < 0.45) say(ac, Speech.line(ac.a, 'chat'), 2.2); }
      // 한가할 때의 행동: 가끔 식당 창구에서 음료를 시키고 자리로 돌아감 (규칙의 '주점 수입'을 화면에 보여 주는 장식 행동)
      if (!ac.tasks.length && D.t > (ac.idleAt || (ac.idleAt = D.t + 14 + Math.random() * 20))) {
        ac.idleAt = D.t + 22 + Math.random() * 26;
        if (Math.random() < 0.5 && !Lina.job && Lina.queue.length === 0) { visitWindow(ac, 'meal', { mode: 'talk', text: '음료 나왔어요!', dur: 1.1 }, Speech.line(ac.a, 'drink')); settle(ac); }
        else if (ac.loiter != null && Math.random() < 0.6) { release(ac); settle(ac); }
      }
    }
  };

  // ---------- 그리기 (Lobby의 앞뒤 정렬 묶음에 끼워 넣음) ----------
  D.drawables = function (g, t) {
    const out = [];
    for (const ac of D.actors.values()) {
      const z = ac.pose === 'sit' && ac.seat ? ac.seat.z : ac.y;
      out.push({ z, f: () => {
        const walk = ac.pose === 'walk', hasSheet = !!walkSheet(ac), hop = walk && !hasSheet ? -Math.abs(Math.sin(ac.ph)) * 10 : 0, tilt = walk && !hasSheet ? Math.sin(ac.ph) * 3 : 0;
        if (ac.pose !== 'sit') { g.fillStyle = 'rgba(60,30,10,.2)'; g.beginPath(); g.ellipse(ac.x, ac.y - 3, 40 - (walk ? Math.abs(hop) : 0), 9, 0, 0, 7); g.fill(); }
        const sit = ac.pose === 'sit', a = ac.a, H = sit ? 230 : 250, yy = ac.y + hop + (sit ? 0 : Math.sin(t * 1.3 + ac.id) * 0.8);
        // 전직한 모험가: 직업 그림이 있으면 그것을, 없으면 1차 그림 + 직업 표식 (외형 리소스가 들어오면 자동으로 바뀜)
        let key = `${ac.key}_${ac.dir}`, emblem = false;
        if (a && a.stage >= 2) { const k2 = `chr_${CLASS_KEY[a.cls] || 'x'}_${sexOf(a)}_${ac.dir}`; if (A.has(k2)) key = k2; else emblem = true; }
        const sh = walkSheet(ac);
        if (sh && !(a && a.stage >= 2 && A.has(key) && key !== `${ac.key}_${ac.dir}`)) {
          // 걷기 시트: 방향 행 + 이동 거리로 정한 프레임. 서 있거나 앉으면 0번(접지) 프레임. 그림자는 코드가 그림
          // 셀 크기는 그림 높이로 정함(행 4개): 128px 원본이든 256px 업스케일본이든 같은 코드로 그림
          const cs = sh.img.height / sh.sheet.rows.length, f = cs / sh.sheet.cell, W = Object.assign({}, sh.sheet, { cell: cs, pivotY: sh.sheet.pivotY * f, charH: sh.sheet.charH * f });
          const sc = (sit ? 230 : 250) / W.charH, row = W.rows.indexOf(sit ? (ac.dir === 'back' ? 'up' : 'down') : (ac.dir4 || (ac.dir === 'back' ? 'up' : 'down')));
          const fr = walk ? Math.floor(ac.wf || 0) % W.cols : 0;
          g.drawImage(sh.img, fr * W.cell, row * W.cell, W.cell, W.cell, ac.x - W.cell / 2 * sc, (sit ? ac.y : ac.y + (sit ? 0 : Math.sin(t * 1.3 + ac.id) * 0.8 * (walk ? 0 : 1))) - W.pivotY * sc, W.cell * sc, W.cell * sc);
        } else A.draw(g, key, ac.x, yy, { w: sit ? 125 : 136, h: H, rot: tilt * Math.PI / 180, px: 0.5, py: 1 });
        if (emblem) { g.save(); g.fillStyle = a.stage >= 3 ? '#b03a8a' : '#d89a1e'; g.strokeStyle = '#fff8e8'; g.lineWidth = 3; g.beginPath(); g.arc(ac.x + 40, yy - H + 34, 16, 0, 7); g.fill(); g.stroke();
          g.fillStyle = '#fff8e8'; g.font = '700 17px "Malgun Gothic", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(a.cls[0], ac.x + 40, yy - H + 35); g.restore(); }
        if (ac.fx && D.t < ac.fx) { const k = 1 - (ac.fx - D.t) / 2.4; g.save(); g.globalAlpha = Math.min(1, (ac.fx - D.t) * 1.5);
          for (let i = 0; i < 10; i++) { const an = i / 10 * 6.283 + D.t * 2.5, r = 70 + Math.sin(D.t * 6 + i) * 12; const x = ac.x + Math.cos(an) * r, y = yy - H * 0.5 + Math.sin(an) * r * 0.9 - k * 30;
            g.fillStyle = i % 2 ? '#ffe28a' : '#fff8e8'; g.beginPath(); for (let j = 0; j < 8; j++) { const rr = j % 2 ? 4 : 11, aa = j / 8 * 6.283; g.lineTo(x + Math.cos(aa) * rr, y + Math.sin(aa) * rr); } g.fill(); } g.restore(); }
      } });
    }
    return out;
  };
  D.bubbles = function (g) {
    for (const ac of D.actors.values()) if (ac.bubble) bubble(g, ac.x, ac.y - (ac.pose === 'sit' ? 240 : 262), ac.bubble.text);
    if (Lina.bubble) bubble(g, Lina.x + 120, 200, Lina.bubble.text, true);
  };
  function bubble(g, x, y, text, left) {
    g.save(); g.font = '600 24px "Malgun Gothic", "Apple SD Gothic Neo", sans-serif';
    const w = g.measureText(text).width + 32, h = 44; let bx = Math.max(10, Math.min(1910 - w, x - w / 2)); const by = y - h;
    g.fillStyle = 'rgba(255,253,246,.96)'; g.strokeStyle = '#5a3a22'; g.lineWidth = 2.5;
    g.beginPath(); g.roundRect(bx, by, w, h, 18); g.fill(); g.stroke();
    const tx = left ? bx + 18 : Math.max(bx + 16, Math.min(bx + w - 16, x));
    g.beginPath(); g.moveTo(tx - 9, by + h - 1); g.lineTo(left ? tx - 22 : tx, by + h + 12); g.lineTo(tx + 9, by + h - 1); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(tx - 9, by + h); g.lineTo(left ? tx - 22 : tx, by + h + 12); g.lineTo(tx + 9, by + h); g.stroke();
    g.fillStyle = '#3b2a1e'; g.textBaseline = 'middle'; g.fillText(text, bx + 16, by + h / 2 + 1);
    g.restore();
  }
  root.Director = D;
})(this);
