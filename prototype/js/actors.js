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
  const A = root.Assets, CLS = root.ASSET_MANIFEST.CLS, Lina = root.Lina, Speech = root.Speech, I = root.Iso, P = I.P;
  const pt = p => ({ x: p[0], y: p[1] });
  // 아이소메트릭 로비 (2026.11): 위치는 모두 바닥 칸 좌표(iso.js)에서 환산. 걷기는 대각선으로 바로 가고, 그림은 한 방향뿐이라 가는 쪽이 왼쪽이면 좌우반전.
  const EXIT = pt(I.DOOR_OUT), INSIDE = pt(P(12.4, 9.8));
  const LOITER = [P(3, 5.5), P(5.5, 7), P(8.5, 5.5), P(11, 5.2), P(12.5, 7.5), P(7.5, 6.8)].map(pt);
  const CLASS_KEY = { 광전사: 'berserker', 사냥꾼: 'hunter', 괴도: 'phantom', 마도사: 'sorcerer', 신관: 'priest', 레인저: 'ranger', 마검사: 'spellblade', 기사: 'knight', 쌍검사: 'dualblade',
    마궁사: 'arcanearcher', 수도사: 'monk', 추적자: 'tracker', 점성술사: 'astrologer', 연금술사: 'alchemist', 광대: 'jester' };
  const WALK_SPEED = 150;          // 화면 px/초 (걷기 시트 24프레임 = 30fps 로 재생하면 발이 미끄러지지 않는 속도)
  const WALK_FPS = 30, WALK_FRAMES = 24, IDLE_FRAMES = 36, IDLE_FPS = 12, STAND_H = 150;
  const faceLeft = (dx, prev) => Math.abs(dx) < 1 ? prev : dx < 0;
  const D = { actors: new Map(), seats: [], winUse: { meal: [], quest: [], sale: [] }, speed: 1, t: 0 };
  const sexOf = a => (a.id % 2 ? 'm' : 'f');
  const isoKey = a => I.charKey(CLS[a.core], sexOf(a));
  const sheet = (ac, v) => { const it = A.items[`iso_${ac.ik}_${v}`]; return it && it.ok ? it.img : null; };
  const standPos = (ac, seat) => { const s = I.seatStand(seat, ac.ik); return { x: s[0], y: s[1] }; };

  // ---------- 좌석 ----------
  D.layout = function (nTables) { // Lobby가 테이블 개수를 알려 준다 (탁자 하나에 2석)
    const old = D.seats; D.seats = [];
    for (const se of I.seatsFor(nTables)) {
      const inf = I.seatInfo(se), prev = old.find(o => o.id === se.id);
      se.z = inf.ay + 1; se.ap = pt(P(se.cell[0] + .5, se.cell[1] + 3.2)); se.by = prev ? prev.by : null; D.seats.push(se);
    }
  };
  function freeSeat(ac) { const fr = D.seats.filter(s => !s.by); if (!fr.length) return null; const s = fr[(ac.id * 7) % fr.length]; s.by = ac.id; return s; }
  function release(ac) { if (ac.seat) { ac.seat.by = null; ac.seat = null; } if (ac.loiter != null) { LOITER[ac.loiter].by = null; ac.loiter = null; } }
  // 앉기 상태: sp = { seat, ax, ay, flip, mode: 'down'|'idle'|'up', t }
  function startSit(ac, seat, mode) {
    if (!sheet(ac, 'sit')) { ac.sp = null; return false; }
    const inf = I.seatInfo(seat);
    ac.sp = { seat, ax: inf.ax, ay: inf.ay, flip: inf.flip, mode, t: 0, z: inf.ay + 1 };
    return true;
  }
  D.standUp = standUp;
  D.cellChairs = () => false;
  D.chairDrawables = () => [];
  const sitN = ac => I.SITI[ac.ik].n;
  // 접수 줄: 리나(접수대) 앞 손님 자리에서 왼쪽 아래(왼쪽 벽 쪽)로 한 줄
  function claimWin(win, ac) { const u = D.winUse.quest; let i = u.indexOf(null); if (i < 0) { i = u.length; u.push(null); } u[i] = ac.id; const q = P(5.4, 3.5 + i * 0.8); return { x: q[0], y: q[1], i }; }
  function freeWin(win, ac) { const u = D.winUse.quest; const i = u.indexOf(ac.id); if (i >= 0) u[i] = null; while (u.length && u[u.length - 1] === null) u.pop(); }

  // ---------- 배우 ----------
  function actor(a, at) {
    let ac = D.actors.get(a.id);
    if (ac) ac.a = a;
    if (!ac) { ac = { a, id: a.id, key: `chr_${CLS[a.core]}_${sexOf(a)}`, ik: isoKey(a), face: false, wf: 0, x: at.x, y: at.y, dir: 'back', pose: 'stand', tasks: [], ph: Math.random() * 6, bubble: null, chatAt: D.t + 6 + Math.random() * 10, seat: null, loiter: null }; D.actors.set(a.id, ac); }
    return ac;
  }
  const T = (ac, k, o) => ac.tasks.push(Object.assign({ k }, o || {}));
  function standUp(ac) {
    if (ac.pose === 'sit' || ac.loiter != null) {
      const ap = ac.seat ? ac.seat.ap : null, sp = ac.sp; release(ac); ac.pose = 'stand'; ac.sp = null;
      if (sp) { // 일어서는 모션을 먼저 하고, 자리 앞 통로로 걸어 나온 뒤 다음 행동
        const u = { k: 'unsit', sp: Object.assign({}, sp, { mode: 'up', t: 0 }), pos: { x: ac.x, y: ac.y } };
        ac.tasks.unshift(...(ap ? [u, { k: 'walk', to: ap }] : [u]));
      } else if (ap) ac.tasks.unshift({ k: 'walk', to: ap });
    }
  }
  function settle(ac) { // 앉을 자리 → 서성일 자리 → 없으면 나감
    T(ac, 'do', { fn: () => {
      const s = freeSeat(ac);
      if (s) { ac.tasks.unshift({ k: 'walk', to: s.ap }, ...(sheet(ac, 'sit') ? [{ k: 'walk', to: standPos(ac, s), zMin: s.z }] : []), { k: 'sit', seat: s }); return; }
      const li = LOITER.findIndex(l => !l.by);
      if (li >= 0) { LOITER[li].by = ac.id; ac.loiter = li; ac.tasks.unshift({ k: 'walk', to: LOITER[li] }); return; }
      ac.tasks.unshift({ k: 'walk', to: EXIT }, { k: 'remove' });
    } });
  }
  function leave(ac) { T(ac, 'do', { fn: () => { standUp(ac); ac.tasks.push({ k: 'walk', to: INSIDE }, { k: 'walk', to: EXIT }, { k: 'remove' }); } }); }
  function enter(ac) { T(ac, 'walk', { to: INSIDE }); }
  function visitWindow(ac, win, job, line) { // 창구로 가서 리나에게 응대를 받음
    let spot;
    // 일어서기(일어서는 모션 → 자리 앞 통로)가 먼저, 창구로 가는 걸음은 그 뒤에 둔다. (예전에는 걸음이 앞에 놓여 창구까지 간 뒤 의자로 되돌아가 일어서는 순간이동이 생겼음)
    T(ac, 'do', { fn: () => { const n0 = ac.tasks.length; standUp(ac); const added = ac.tasks.length - n0; spot = claimWin(win, ac); ac.tasks.splice(added, 0, { k: 'walk', to: spot }, { k: 'face', dir: 'back' }); } });
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
      let guard = 0, gone = false; const x0 = ac.x, y0 = ac.y, p0 = ac.pose;   // 서 있다가 서서 끝나는 사람은 순간이동 대신 빠르게 걸어가게 한다
      while (ac.tasks.length && guard++ < 500) {
        const k = ac.tasks.shift();
        if (k.k === 'walk') { ac.x = k.to.x; ac.y = k.to.y; ac.pose = 'stand'; ac.zMin = null; }
        else if (k.k === 'sit') { const sp0 = standPos(ac, k.seat); ac.seat = k.seat; ac.x = sp0.x; ac.y = sp0.y; ac.pose = 'sit'; startSit(ac, k.seat, 'idle'); }
        else if (k.k === 'unsit') { ac.sp = null; ac.pose = 'stand'; if (k.pos) { ac.x = k.pos.x; ac.y = k.pos.y; } }
        else if (k.k === 'face') ac.dir = k.dir;
        else if (k.k === 'do') k.fn();
        else if (k.k === 'lina' && !k.sent && k.job.onStart) k.job.onStart();
        else if (k.k === 'remove') { release(ac); D.actors.delete(id); gone = true; break; }
      }
      if (!gone && (ac.pose === 'stand' || ac.pose === 'sit')) { const gx = x0 - ac.x, gy = y0 - ac.y; if (Math.hypot(gx, gy) > 12 && Math.hypot(gx, gy) < 3000) ac.gl = { x: gx, y: gy, face: ac.face }; }   // 주가 넘어갈 때 순간이동 대신, 옛 자리에서 걸어오는 모습을 그림으로만 보여 준다 (논리 위치는 이미 도착)
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
        if (i === 0) visitWindow(ac, ok ? 'sale' : 'quest', { mode: ok ? 'happy' : 'talk', text: Speech.lina(ok ? 'lina_success' : 'lina_fail'), dur: 1.6 }, Speech.line(a, ok ? 'success' : 'fail'));
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
        if (x.ate && i < x.ate) visitWindow(ac, 'meal', i === 0 ? { mode: 'talk', text: Speech.lina('lina_meal'), dur: 1.3 } : null, Speech.line(a, 'meal'));
        if (i === 0) visitWindow(ac, 'quest', { mode: 'paper', text: Speech.lina('lina_depart'), dur: 1.7, onStart: () => Board.take(qid) }, Speech.line(a, 'accept'));
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
      if (!before.adv.has(a.id)) visitWindow(ac, 'quest', { mode: 'wave', text: Speech.lina('lina_first'), dur: 1.6 }, Speech.line(a, 'first'));
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
      if (L.kind === 'ledger' && root.UI && !root.UI.autoReport) Lina.say(Speech.lina('lina_ledger'), 2.4);
      if (L.kind === 'unlock') Lina.say(Speech.lina('lina_unlock'), 2.4);
    }
  };
  // 처음 화면: 마을에 있는 모험가를 바로 앉혀 둔다
  D.init = function (s) {
    for (const a of s.advs) if (a.alive && a.state === 'town') {
      const ac = actor(a, INSIDE); const st = freeSeat(ac);
      if (st) { const sp0 = standPos(ac, st); ac.seat = st; ac.x = sp0.x; ac.y = sp0.y; ac.pose = 'sit'; startSit(ac, st, 'idle'); } else settle(ac);
    }
  };

  // [개발] 걷기 시트 시연: 남녀 전사가 로비를 네모로 돌며 4방향을 모두 보여 줌 (한 번 더 누르면 사라짐)
  D.demoWalk = function () {
    if (D.actors.has(-1)) { D.actors.delete(-1); D.actors.delete(-2); return false; }
    const loop = o => [P(12, 4 + o), P(12, 8 + o), P(8, 8 + o), P(8, 4 + o)].map(p => ({ k: 'walk', to: pt(p) }));
    [[-1, 'warrior_f', 0, P(8, 4)], [-2, 'cleric_m', 0.8, P(12, 8)]].forEach(([id, ik, o, at]) => {
      const ac = { a: null, id, key: 'chr_' + ik, ik, face: false, wf: 0, x: at[0], y: at[1], dir: 'front', pose: 'stand', tasks: [], ph: 0, bubble: null, chatAt: 1e12, idleAt: 1e12, seat: null, loiter: null };
      const again = () => { ac.tasks.push(...loop(o), { k: 'do', fn: again }); };
      again(); D.actors.set(id, ac);
    });
    return true;
  };
  D.celebrate = function (id) { const ac = D.actors.get(id); if (ac) { ac.fx = D.t + 2.4; say(ac, '힘이 넘친다…!', 2.4); } };
  D.reset = function (s) { D.actors.clear(); for (const st of D.seats) st.by = null; for (const l of LOITER) l.by = null; for (const w in D.winUse) D.winUse[w] = []; D.init(s); };
  function say(ac, text, dur) { if (text) { ac.bubble = { text, until: D.t + (dur || 1.8), t0: D.t }; if (root.UI && root.UI.chat && ac.a) root.UI.chat(ac.a.name, text); } }

  // ---------- 매 프레임 ----------
  D.update = function (dt) {
    D.t += dt;
    for (const [id, ac] of D.actors) {
      if (ac.gl) { const G = ac.gl, len = Math.hypot(G.x, G.y), st = 420 * dt; ac.wf = (ac.wf || 0) + st / 150 * 30; if (len <= st) ac.gl = null; else { G.x -= G.x / len * st; G.y -= G.y / len * st; G.face = faceLeft(-G.x, G.face); } }
      let budget = dt;
      while (budget > 0 && ac.tasks.length) {
        const k = ac.tasks[0];
        if (k.k === 'walk') {
          const dx = k.to.x - ac.x, dy = k.to.y - ac.y, dist = Math.hypot(dx, dy), sp = k.fast ? WALK_SPEED * 3 : WALK_SPEED;
          ac.face = faceLeft(dx, ac.face); ac.pose = 'walk';
          ac.zMin = k.zMin || (ac.zMin && ac.y < ac.zMin ? ac.zMin : null);   // 의자 곁에서는 의자 앞에 그려 겹침 순서가 튀지 않게 함
          const mv = Math.min(dist, sp * budget);
          ac.wf = (ac.wf || 0) + mv / sp * WALK_FPS;
          if (dist <= sp * budget) { ac.x = k.to.x; ac.y = k.to.y; budget -= dist / sp; ac.tasks.shift(); ac.pose = 'stand'; }
          else { ac.x += dx / dist * sp * budget; ac.y += dy / dist * sp * budget; ac.ph += budget * 9; budget = 0; }
        } else if (k.k === 'wait') { if (k.t <= budget) { budget -= k.t; ac.tasks.shift(); } else { k.t -= budget; budget = 0; } }
        else if (k.k === 'say') { say(ac, k.text, 1.8); ac.tasks.shift(); }
        else if (k.k === 'face') { ac.dir = k.dir; ac.tasks.shift(); }
        else if (k.k === 'sit') {
          if (!k.began) { k.began = true; ac.seat = k.seat; ac.pose = 'sit'; ac.xfIn = D.t; if (!startSit(ac, k.seat, 'down')) { ac.tasks.shift(); continue; } }
          const sp = ac.sp, need = sitN(ac) / I.SIT.fps - sp.t;
          if (budget >= need) { budget -= need; sp.mode = 'idle'; sp.t = 0; ac.tasks.shift(); } else { sp.t += budget; budget = 0; }
        }
        else if (k.k === 'unsit') {
          const sp = k.sp; if (!k.began) { k.began = true; ac.sp = sp; ac.pose = 'sit'; }
          const need = sitN(ac) / I.SIT.fps - sp.t;
          if (budget >= need) { budget -= need; ac.zMin = sp.z; ac.xfOut = { t0: D.t, ax: sp.ax, ay: sp.ay, flip: sp.flip }; ac.sp = null; ac.pose = 'stand'; ac.tasks.shift(); } else { sp.t += budget; budget = 0; }
        }
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
        if (Math.random() < 0.5 && !Lina.job && Lina.queue.length === 0) { visitWindow(ac, 'meal', { mode: 'talk', text: Speech.lina('lina_drink'), dur: 1.1 }, Speech.line(ac.a, 'drink')); settle(ac); }
        else if (ac.loiter != null && Math.random() < 0.6) { release(ac); settle(ac); }
      }
    }
  };

  // ---------- 그리기 (Lobby의 앞뒤 정렬 묶음에 끼워 넣음) ----------
  D.drawables = function (g, t) {
    const out = [];
    for (const ac of D.actors.values()) {
      const z = ac.sp ? ac.sp.z : Math.max(ac.y, ac.zMin || 0);
      out.push({ z, ac, f: () => {
        const a = ac.a, emblem = !!(a && a.stage >= 2); // 전직 외형 그림이 들어오기 전까지는 직업 표식으로 표시
        const walkImg = sheet(ac, 'walk'), idleImg = sheet(ac, 'idle'), sitImg = sheet(ac, 'sit');
        // 서 있는 모습 (걷는 중이면 걷기, 아니면 서 있기 시트; 시트가 없으면 걷기 첫 칸)
        const standDraw = al => {
          if (ac.pose === 'walk' && walkImg) { const f = Math.floor(ac.wf || 0) % WALK_FRAMES; I.frame(g, walkImg, I.SH.walk, f % 12, Math.floor(f / 12), ac.x, ac.y, ac.face, al); }
          else if (idleImg) { const f = Math.floor(D.t * IDLE_FPS + ac.id * 5) % IDLE_FRAMES; I.frame(g, idleImg, I.SH.idle, f % 12, Math.floor(f / 12), ac.x, ac.y, false, al); }
          else if (walkImg) I.frame(g, walkImg, I.SH.walk, 0, 0, ac.x, ac.y, false, al);   // 서 있기 시트가 없는 캐릭터(남 전사)
        };
        const XF = 0.16;   // 앉기 그림 ↔ 서기 그림이 바뀔 때 겹쳐 보여 주는 시간(초): 모션이 툭 튀지 않게
        if (ac.sp && sitImg) { // 앉기·대기·일어서기
          const sp = ac.sp, n = sitN(ac); let fi;
          if (sp.mode === 'down') fi = Math.min(n - 1, Math.floor(sp.t * I.SIT.fps));
          else if (sp.mode === 'up') fi = Math.max(0, n - 1 - Math.floor(sp.t * I.SIT.fps));
          else fi = n - 1;
          const bob = sp.mode === 'idle' ? Math.sin(D.t * 2.2 + ac.id) * 0.7 : 0;
          const k = sp.mode === 'down' && ac.xfIn != null ? Math.min(1, (D.t - ac.xfIn) / XF) : 1;   // 앉기 시작: 서 있는 모습이 사라지며 앉기 그림이 나타남
          if (k < 1) standDraw(1);   // 아래층은 그대로, 위층만 서서히 나타남(둘 다 반투명이 되어 흐려지는 현상 방지)
          I.sitFrame(g, sitImg, fi, sp.ax, sp.ay + bob, sp.flip, k);
        } else {
          const xo = ac.xfOut;
          const k = xo ? Math.min(1, (D.t - xo.t0) / XF) : 1;   // 일어서기 끝: 앉기 첫 그림이 사라지며 서 있는 모습이 나타남
          standDraw(1);
          if (xo && k < 1 && sitImg) I.sitFrame(g, sitImg, 0, xo.ax, xo.ay, xo.flip, 1 - k);
          if (xo && k >= 1) ac.xfOut = null;
        }
        const yy = ac.y, H = STAND_H;
        if (emblem) { g.save(); g.fillStyle = a.stage >= 3 ? '#b03a8a' : '#d89a1e'; g.strokeStyle = '#fff8e8'; g.lineWidth = 3; g.beginPath(); g.arc(ac.x + 30, yy - H + 22, 13, 0, 7); g.fill(); g.stroke();
          g.fillStyle = '#fff8e8'; g.font = '700 15px "Malgun Gothic", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(a.cls[0], ac.x + 30, yy - H + 23); g.restore(); }
        if (ac.fx && D.t < ac.fx) { const k = 1 - (ac.fx - D.t) / 2.4; g.save(); g.globalAlpha = Math.min(1, (ac.fx - D.t) * 1.5);
          for (let i = 0; i < 10; i++) { const an = i / 10 * 6.283 + D.t * 2.5, r = 55 + Math.sin(D.t * 6 + i) * 10; const x = ac.x + Math.cos(an) * r, y = yy - H * 0.5 + Math.sin(an) * r * 0.9 - k * 30;
            g.fillStyle = i % 2 ? '#ffe28a' : '#fff8e8'; g.beginPath(); for (let j = 0; j < 8; j++) { const rr = j % 2 ? 4 : 11, aa = j / 8 * 6.283; g.lineTo(x + Math.cos(aa) * rr, y + Math.sin(aa) * rr); } g.fill(); } g.restore(); }
      } });
    }
    for (const it of out) { const ac = it.ac; if (!ac) continue; const f0 = it.f; it.f = () => { const G = ac.gl; if (!G) { f0(); return; } const sp = ac.sp, po = ac.pose, fc = ac.face; ac.x += G.x; ac.y += G.y; ac.sp = null; ac.pose = 'walk'; ac.face = G.face; try { f0(); } finally { ac.x -= G.x; ac.y -= G.y; ac.sp = sp; ac.pose = po; ac.face = fc; } }; it.z += ac.gl ? ac.gl.y : 0; }
    return out;
  };
  // ---------- 명찰 (2026.11): 길드의 모험가 머리 위에 [등급 배지] 이름 Lv.N 을 항상 표시 ----------
  const BADGE = {}; // 등급 배지 그림 (처음 쓸 때 불러옴)
  const badgeImg = L => { if (!BADGE[L]) { const im = new Image(); im.src = `assets/ui/hud/badge_${L}.png`; BADGE[L] = im; } return BADGE[L]; };
  // 명찰 설정값 — docs/tools/nameplate_tuner.html 에서 조절한 숫자를 그대로 붙여 넣는 자리
  const NP = {
    lift: -4,        // 머리 위 높이: 클수록 위로 (음수 = 머리 쪽으로 내려감)
    dx: 0,           // 좌우 이동 (px)
    sitDy: 0,        // 앉은 캐릭터만 추가로 위(+)/아래(−) 이동
    h: 30,           // 명찰 높이
    fs: 17,          // 이름 글자 크기
    lfs: 17,         // 레벨 글자 크기
    bs: 24,          // 등급 배지 크기
    bdx: -2, bdy: -2,  // 배지만 따로 이동 (px, +는 오른쪽·아래)
    ndx: -3, ndy: 0,  // 이름만 따로 이동
    ldx: 3, ldy: 0,  // 레벨만 따로 이동
    pad: 10,         // 양 끝 여백
    gap: 6,          // 배지·이름·레벨 사이 간격
    ow: 4,           // 글자 외곽선 굵기
    nameColor: '#fff8e8', lvColor: '#ffd98a', outline: 'rgba(46,32,18,.92)',
    pill: false,     // 알약 배경 사용 여부
    bubbleGap: 16    // 말풍선과 명찰 사이 추가 간격 (명찰이 말풍선을 가리지 않도록 위로)
  };
  D.nameplate = NP;
  const headY = ac => ac.y - (ac.pose === 'sit' ? 135 : 141);   // 서 있을 때 명찰이 머리에 더 붙도록 150 → 141
  function plate(g, ac) {
    const a = ac.a; if (!a || a.alive === false) return 0;
    const GRs = (root.GuildGame && root.GuildGame.GR) || ['F', 'E', 'D', 'C', 'B', 'A', 'S'], L = GRs[a.grade] || 'F', im = badgeImg(L);
    const nm = String(a.name), lv = 'Lv.' + (a.lv || 1), bs = NP.bs, pad = NP.pad, gap = NP.gap, H = NP.h;
    const FF = '"MaruBuri", "Malgun Gothic", "Apple SD Gothic Neo", sans-serif';
    g.save(); g.font = `700 ${NP.fs}px ${FF}`;
    const nw = Math.ceil(g.measureText(nm).width); g.font = `700 ${NP.lfs}px ${FF}`; const lw = Math.ceil(g.measureText(lv).width);
    const w = pad + bs + gap + nw + gap + lw + pad, x0 = ac.x - w / 2 + NP.dx, yb = headY(ac) - NP.lift - (ac.pose === 'sit' ? NP.sitDy : 0), y0 = yb - H;
    if (NP.pill) {
      g.shadowColor = 'rgba(40,25,12,.35)'; g.shadowBlur = 5; g.shadowOffsetY = 2;
      g.beginPath(); g.roundRect(x0, y0, w, H, H / 2); g.fillStyle = 'rgba(255,249,232,.94)'; g.fill();
      g.shadowColor = 'transparent'; g.shadowBlur = 0; g.shadowOffsetY = 0; g.lineWidth = 2; g.strokeStyle = '#6b4527'; g.stroke();
    }
    if (im.complete && im.naturalWidth) { const bw = bs * im.naturalWidth / im.naturalHeight; g.drawImage(im, x0 + pad - 2 + (bs - bw) / 2 + NP.bdx, y0 + (H - bs) / 2 + NP.bdy, bw, bs); }
    g.textBaseline = 'middle'; g.textAlign = 'left'; g.lineJoin = 'round'; g.lineWidth = NP.ow; g.strokeStyle = NP.outline;
    const ty = y0 + H / 2 + 1, tx1 = x0 + pad + bs + gap + NP.ndx, tx2 = x0 + pad + bs + gap + nw + gap + NP.ldx;
    const dark = NP.pill;   // 알약 배경을 쓰면 글자는 어두운 색
    g.font = `700 ${NP.fs}px ${FF}`;
    if (!dark) g.strokeText(nm, tx1, ty + NP.ndy); g.fillStyle = dark ? '#3a2616' : NP.nameColor; g.fillText(nm, tx1, ty + NP.ndy);
    g.font = `700 ${NP.lfs}px ${FF}`;
    if (!dark) g.strokeText(lv, tx2, ty + NP.ldy); g.fillStyle = dark ? '#9a6228' : NP.lvColor; g.fillText(lv, tx2, ty + NP.ldy);
    g.restore(); return (headY(ac) - y0) + 8 + NP.bubbleGap;   // 말풍선 꼬리 끝이 명찰 위 8px 에 오도록
  }
  D.bubbles = function (g) {
    for (const ac of D.actors.values()) {
      const G = ac.gl; if (G) { ac.x += G.x; ac.y += G.y; }
      const up = plate(g, ac);   // 명찰이 있으면 말풍선은 그 위로
      if (ac.bubble) bubble(g, ac.x, headY(ac) - up, ac.bubble.text, false, D.t - (ac.bubble.t0 == null ? D.t - 1 : ac.bubble.t0), ac.bubble.until - D.t);
      if (G) { ac.x -= G.x; ac.y -= G.y; }
    }
    if (Lina.bubble) bubble(g, Lina.x, Lina.feet - 150, Lina.bubble.text, true, Lina.t - (Lina.bubble.t0 == null ? Lina.t - 1 : Lina.bubble.t0), Lina.bubble.until - Lina.t);
  };
  // 말풍선 (2026.11 개편 · B안): 왼쪽 아래 꼬리가 달린 사각 말풍선. 갈색 테두리 + 밝은 종이색 바탕 + 굵은 글씨.
  // (x, y) = 꼬리 끝(캐릭터 머리 위). age: 뜬 지 몇 초(커지며 등장), remain: 사라질 때까지 남은 초(끝 0.25초는 투명해짐), left: 사용 안 함
  // 예전 모양(꼬리 없는 둥근 상자 + 금색 안쪽 선)은 bubbleOld 로 보관
  function bubble(g, x, y, text, left, age, remain) {
    const S = { fs: 26, px: 24, h: 54, r: 12, lw: 3, tw: 26, th: 22, tx: 34, line: '#6b4527', fill: '#fffaf0', ink: '#3a2616' };
    g.save();
    g.font = `700 ${S.fs}px "MaruBuri", "Malgun Gothic", "Apple SD Gothic Neo", sans-serif`;
    const w = Math.max(72, Math.ceil(g.measureText(text).width) + S.px * 2), h = S.h;
    const bx = Math.max(12, Math.min(1908 - w, x - S.tx)), by = y - S.th - h;
    const tx = Math.max(S.r + 4, Math.min(w - S.r - S.tw - 4, x - bx));   // 화면 가장자리에서도 꼬리가 상자 안쪽에 붙음
    // 등장: 꼬리 끝을 기준으로 0.6→1배 (살짝 튕김), 퇴장: 투명
    const a = Math.min(1, Math.max(0, age) / 0.18), k = a >= 1 ? 1 : 1 + 1.7 * Math.pow(a - 1, 3) + 0.7 * Math.pow(a - 1, 2), sc = 0.6 + 0.4 * Math.max(0, Math.min(1.08, k));
    g.globalAlpha *= Math.min(1, a * 1.4, Math.max(0, remain) / 0.25);
    g.translate(x, y); g.scale(sc, sc); g.translate(-x, -y);
    const body = new Path2D(); body.roundRect(bx, by, w, h, S.r);
    const tail = new Path2D(); tail.moveTo(bx + tx - S.tw * 0.2, by + h - 1); tail.lineTo(x, y); tail.lineTo(bx + tx + S.tw, by + h - 1); tail.closePath();
    g.lineJoin = 'round'; g.lineWidth = S.lw * 2; g.strokeStyle = S.line;
    g.shadowColor = 'rgba(40,25,12,.35)'; g.shadowBlur = 8; g.shadowOffsetY = 3;
    g.stroke(body); g.stroke(tail);
    g.shadowColor = 'transparent'; g.shadowBlur = 0; g.shadowOffsetY = 0;
    g.fillStyle = S.fill; g.fill(body); g.fill(tail);
    g.beginPath(); g.moveTo(bx + tx - S.tw * 0.2 + 1, by + h - S.lw - 1); g.lineTo(bx + tx + S.tw - 1, by + h - S.lw - 1); g.lineTo(bx + tx + S.tw - 1, by + h + 2); g.lineTo(bx + tx - S.tw * 0.2 + 1, by + h + 2); g.fill(); // 꼬리 이음매
    g.fillStyle = S.ink; g.textBaseline = 'middle'; g.textAlign = 'center'; g.fillText(text, bx + w / 2, by + h / 2 + 1);
    g.restore();
  }
  D.drawBubble = bubble;   // 마을(town.js)에서도 같은 말풍선을 쓴다
  // [보관] 예전 말풍선 (되돌릴 때 주석 해제)
  // function bubbleOld(g, x, y, text, left, age, remain) {
  //   g.save();
  //   g.font = '600 24px "MaruBuri", "Malgun Gothic", "Apple SD Gothic Neo", sans-serif';
  //   const padX = 22, w = Math.max(64, Math.ceil(g.measureText(text).width) + padX * 2), h = 50, r = 20;
  //   const bx = Math.max(12, Math.min(1908 - w, x - w / 2)), by = y - h - 6;
  //   const tipx = bx + w / 2, tipy = by + h; // 등장할 때 크기 변화의 기준점(상자 아래 가운데)
  //   // 등장: 꼬리 끝을 기준으로 0.6→1배 (살짝 튕김), 퇴장: 투명
  //   const a = Math.min(1, Math.max(0, age) / 0.18), k = a >= 1 ? 1 : 1 + 1.7 * Math.pow(a - 1, 3) + 0.7 * Math.pow(a - 1, 2), sc = 0.6 + 0.4 * Math.max(0, Math.min(1.08, k));
  //   g.globalAlpha *= Math.min(1, a * 1.4, Math.max(0, remain) / 0.25);
  //   g.translate(tipx, tipy); g.scale(sc, sc); g.translate(-tipx, -tipy);
  //   const body = (ins) => { const p = new Path2D(); p.roundRect(bx + ins, by + ins, w - ins * 2, h - ins * 2, Math.max(2, r - ins)); return p; };
  //   const outer = body(0);
  //   g.shadowColor = 'rgba(58,38,24,.30)'; g.shadowBlur = 10; g.shadowOffsetY = 4;
  //   const gr = g.createLinearGradient(0, by, 0, by + h); gr.addColorStop(0, '#fffaf0'); gr.addColorStop(1, '#f3e2bf');
  //   g.fillStyle = gr; g.fill(outer);
  //   g.shadowColor = 'transparent'; g.shadowBlur = 0; g.shadowOffsetY = 0;
  //   g.lineJoin = 'round'; g.lineWidth = 3; g.strokeStyle = '#7a5434'; g.stroke(outer);
  //   g.save(); g.clip(outer); g.lineWidth = 1.5; g.strokeStyle = 'rgba(224,168,66,.9)'; g.stroke(body(5)); g.restore(); // 안쪽 금색 선
  //   g.fillStyle = '#3b2a1e'; g.textBaseline = 'middle'; g.textAlign = 'center'; g.fillText(text, bx + w / 2, by + h / 2 + 1);
  //   g.restore();
  // }
  root.Director = D;
})(this);
