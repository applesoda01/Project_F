/* 로비 그리기 (M2-3) + 게시판 표시 (M2-4)
   그리는 순서 (기획서 '레이어 구성'):
     1 벽 → 2 바닥 → 3 게시판 (지금은 lobby_wall 한 장에 함께 있음)
     4 의뢰서 → 5 리나 → 6 접수대 → 7 소품  (2026.11 아이소메트릭 로비: 배경은 접수대를 오려 낸 그림, 접수대는 별도 그림으로 리나 앞에 그림)
     8 앞뒤 정렬 묶음: 가구·모험가를 발 위치(y)로 정렬. 좌석은 정렬 키를 따로 줘서 의자·사람·테이블 순서를 지킨다
     9 말풍선 → 10 조명 → 11 화면 UI (HTML 층) */
(function (root) {
  'use strict';
  const A = root.Assets, I = root.Iso;

  // ---------- 고정 배치 (1920×1080) ----------
  // 게시판: 왼쪽 벽의 코르크판. 벽면을 따라 기울어 있어서 쪽지를 같은 기울기로 그린다.
  // 코르크 안쪽 모서리 (왼쪽 위·오른쪽 위·왼쪽 아래), 8열 × 3행 = 24칸
  const BOARD = { tl: [541, 386], tr: [745, 308], bl: [541, 495], cols: 8, rows: 3, w: 84, h: 110, s: 0.27 };
  // 게시판 전체 조절값 (2026.11) — docs/tools/board_tuner.html 에서 조절한 숫자를 그대로 붙여 넣는 자리
  const BT = {
    dx: 2, dy: -5,     // 게시판 전체 이동 (px, +는 오른쪽·아래)
    rot: -1.5,         // 게시판 전체 회전 (도, +는 시계 방향)
    gw: 100, gh: 100,  // 쪽지가 퍼지는 범위 가로·세로 (%)
    ns: 100,           // 쪽지 크기 (%)
    tilt: 0,           // 모든 쪽지 각도에 더하는 값 (도)
    jit: 100,          // 쪽지마다 제각각인 각도 크기 (%, 0 이면 모두 똑바로)
    pj: 100,           // 쪽지마다 제각각인 위치 흔들림 (%)
    sway: 100,         // 바람에 흔들리는 크기 (%)
    wall: 100          // 벽면 기울기 (%, 0 이면 정면, 100 이면 벽을 따라 기울어짐)
  };
  const SLOTS = [];
  let UVX = 1, UVY = 0, NS = BOARD.s;
  function layout() { // BOARD 의 세 모서리를 BT 로 옮기고 돌려서 24칸 좌표와 쪽지 기울기를 다시 계산
    const ux0 = (BOARD.tr[0] - BOARD.tl[0]) * BT.gw / 100, uy0 = (BOARD.tr[1] - BOARD.tl[1]) * BT.gw / 100;
    const vx0 = (BOARD.bl[0] - BOARD.tl[0]) * BT.gh / 100, vy0 = (BOARD.bl[1] - BOARD.tl[1]) * BT.gh / 100;
    const cx0 = BOARD.tl[0] + ((BOARD.tr[0] - BOARD.tl[0]) + (BOARD.bl[0] - BOARD.tl[0])) / 2, cy0 = BOARD.tl[1] + ((BOARD.tr[1] - BOARD.tl[1]) + (BOARD.bl[1] - BOARD.tl[1])) / 2;
    const r = BT.rot * Math.PI / 180, co = Math.cos(r), si = Math.sin(r);
    const ux = ux0 * co - uy0 * si, uy = ux0 * si + uy0 * co, vx = vx0 * co - vy0 * si, vy = vx0 * si + vy0 * co;
    const cx = cx0 + BT.dx, cy = cy0 + BT.dy, UL = Math.hypot(ux, uy);
    UVX = ux / UL; UVY = uy / UL; NS = BOARD.s * BT.ns / 100;
    SLOTS.length = 0;
    for (let k = 0; k < BOARD.cols; k++) for (let q = 0; q < BOARD.rows; q++) { const fu = (k + .5) / BOARD.cols - .5, fv = (q + .5) / BOARD.rows - .5; SLOTS.push({ x: cx + ux * fu + vx * fv, y: cy + uy * fu + vy * fv }); }
  }
  layout();
  // 의뢰가 적을 때도 게시판 전체에 고루 퍼지도록 채우는 순서
  const FILL = [0, 13, 6, 19, 3, 16, 9, 22, 1, 14, 7, 20, 4, 17, 10, 23, 2, 15, 8, 21, 5, 18, 11, 12];
  const TABLES = I.TABLES;
  // 등급 인장 색 (F~S). 'color' 혼합으로 밝기는 원본 인장을 따른다
  const SEAL = ['#9a9a9a', '#3fae4a', '#2f6fd0', '#8a4fd0', '#e0782a', '#d0302c', '#e8b828'];
  const hash = n => { n = (n ^ 61) ^ (n >>> 16); n = n + (n << 3); n ^= n >>> 4; n = Math.imul(n, 0x27d4eb2d); return (n ^ (n >>> 15)) >>> 0; };

  const sealCache = {};
  function sealFor(g) { // 등급별 인장: 처음 쓸 때 한 번 만듦 (file:// 에서도 되도록 픽셀 읽기 없이 합성만)
    if (sealCache[g]) return sealCache[g];
    const it = A.items.quest_seal, S = 72, c = document.createElement('canvas'); c.width = c.height = S;
    const x = c.getContext('2d');
    x.drawImage(it.img, 0, 0, S, S);
    x.globalCompositeOperation = 'color'; x.fillStyle = SEAL[g]; x.fillRect(0, 0, S, S);
    if (g === 6) { x.globalCompositeOperation = 'screen'; x.fillStyle = 'rgba(120,90,10,.9)'; x.fillRect(0, 0, S, S); }
    x.globalCompositeOperation = 'destination-in'; x.drawImage(it.img, 0, 0, S, S);
    x.globalCompositeOperation = 'source-over';
    x.font = 'bold 38px Georgia, "Times New Roman", serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillStyle = g === 6 ? 'rgba(70,44,10,.92)' : 'rgba(255,248,232,.92)';
    x.fillText('FEDCBAS'[g], S / 2, S / 2 + 2);
    return (sealCache[g] = c);
  }

  // ---------- 게시판 (M2-4) ----------
  // 의뢰마다 칸을 고정해 두고(다른 쪽지가 떨어져도 자리가 바뀌지 않음), 붙을 때·떼어질 때 연출을 넣는다.
  const Board = { notes: new Map(), held: new Set(), t: 0 };
  Board.hold = id => Board.held.add(id);
  Board.reset = () => { Board.notes.clear(); Board.held.clear(); };
  Board.take = id => { const n = Board.notes.get(id); Board.held.delete(id); if (n) { n.st = 'taken'; n.t0 = Board.t; } };
  Board.sync = function (s, cap) {
    const live = new Set(s.board.map(q => q.id));
    const used = new Set([...Board.notes.values()].map(n => n.slot));
    for (const q of s.board) if (!Board.notes.has(q.id)) {
      const fi = FILL.findIndex((si, i) => i < Math.max(cap, s.board.length) && !used.has(si));
      const slot = fi >= 0 ? FILL[fi] : FILL[Board.notes.size % FILL.length];
      used.add(slot); Board.notes.set(q.id, { q, slot, st: 'new', t0: Board.t });
    }
    for (const [id, n] of Board.notes) {
      if (live.has(id) || Board.held.has(id) || n.st === 'taken' || n.st === 'gone') continue;
      n.st = 'gone'; n.t0 = Board.t; // 떠나지 않고 사라진 의뢰(철회 등)는 그냥 빛이 바래며 사라짐
    }
  };
  // ---------- 2배 이벤트 의뢰: 종이가 금빛으로 빛남 (2026.11) ----------
  // 의뢰 데이터에 q.x2 = true 가 있으면 적용. 종이 모양 그대로 금빛을 덮고(source-atop), 대각선 빛줄기가 훑고 지나가며, 모서리에 별빛이 깜빡인다.
  const GL = { c: null };
  function glowPaper(g, img, W, H, t, ph) {
    if (!GL.c) { GL.c = document.createElement('canvas'); GL.c.width = 84; GL.c.height = 110; }
    const o = GL.c.getContext('2d'); o.clearRect(0, 0, 84, 110); o.globalCompositeOperation = 'source-over'; o.drawImage(img, 0, 0, W, H);
    o.globalCompositeOperation = 'source-atop';
    const pulse = .5 + .5 * Math.sin(t * 2.4 + ph);
    o.fillStyle = `rgba(255,214,96,${(.22 + .20 * pulse).toFixed(3)})`; o.fillRect(0, 0, W, H);          // 숨쉬는 금빛
    const sw = ((t * 0.55 + ph) % 1.6) - .3, x = sw * (W + H);                                               // 빛줄기: 왼쪽 위 → 오른쪽 아래
    const gr = o.createLinearGradient(x - 26, 0, x + 26, 0); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(.5, 'rgba(255,252,225,.85)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    o.save(); o.translate(0, 0); o.transform(1, 0, -.35, 1, H * .17, 0); o.fillStyle = gr; o.fillRect(-60, 0, W + 160, H); o.restore();
    o.globalCompositeOperation = 'source-over';
    g.drawImage(GL.c, 0, 0);
    g.save(); g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 4; i++) {   // 별빛
      const a = Math.sin(t * 3 + ph * 2 + i * 1.9), k = Math.max(0, a); if (k < .05) continue;
      const sx = [6, W - 8, 10, W - 14][i], sy = [10, 22, H - 18, H - 8][i], r = 3 + 4 * k;
      g.fillStyle = `rgba(255,236,160,${(.9 * k).toFixed(3)})`; g.beginPath(); g.moveTo(sx, sy - r); g.quadraticCurveTo(sx, sy, sx + r, sy); g.quadraticCurveTo(sx, sy, sx, sy + r); g.quadraticCurveTo(sx, sy, sx - r, sy); g.quadraticCurveTo(sx, sy, sx, sy - r); g.fill();
    }
    g.restore();
  }
  // 2배 의뢰 별가루 파티클: 종이 주변에서 반짝이며 위로 떠올라 사라진다 (화면 좌표, 쪽지가 흔들려도 입자는 제자리에서 흩날림)
  const SPARK = ['255,236,150', '255,250,215', '255,214,96', '255,255,255'];
  function sparkles(g, n, cx, cy, sc) {
    const now = Board.t, dt = Math.min(.1, Math.max(0, now - (n.pt_t == null ? now : n.pt_t))); n.pt_t = now;
    const P = n.pts || (n.pts = []);
    n.pt_acc = (n.pt_acc || 0) + dt * 9;                                  // 초당 약 9개
    while (n.pt_acc >= 1) { n.pt_acc -= 1;
      const a = Math.random() * 6.283, r = 4 + Math.random() * 15 * sc;
      P.push({ x: cx + Math.cos(a) * r * .85, y: cy + Math.sin(a) * r * 1.05 - 2, vx: (Math.random() - .5) * 7, vy: -(5 + Math.random() * 11), life: 0, max: .9 + Math.random() * .9, sz: 1.6 + Math.random() * 2.8, ph: Math.random() * 6.3, c: SPARK[(Math.random() * SPARK.length) | 0] });
      if (P.length > 40) P.shift();
    }
    g.save(); g.globalCompositeOperation = 'lighter';
    for (let i = P.length - 1; i >= 0; i--) {
      const q = P[i]; q.life += dt; if (q.life >= q.max) { P.splice(i, 1); continue; }
      q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= (1 - .6 * dt);
      const u = q.life / q.max, env = Math.sin(u * Math.PI), tw = .55 + .45 * Math.sin(q.life * 16 + q.ph), a = Math.max(0, env * tw), r = q.sz * (.6 + .6 * env);
      g.fillStyle = `rgba(${q.c},${(a * .30).toFixed(3)})`; g.beginPath(); g.arc(q.x, q.y, r * 2.2, 0, 6.283); g.fill();            // 부드러운 번짐
      g.fillStyle = `rgba(${q.c},${(a * .95).toFixed(3)})`; g.beginPath();                                                       // 네 갈래 별
      g.moveTo(q.x, q.y - r * 1.8); g.quadraticCurveTo(q.x, q.y, q.x + r * 1.8, q.y); g.quadraticCurveTo(q.x, q.y, q.x, q.y + r * 1.8); g.quadraticCurveTo(q.x, q.y, q.x - r * 1.8, q.y); g.quadraticCurveTo(q.x, q.y, q.x, q.y - r * 1.8); g.fill();
    }
    g.restore();
  }
  function drawNote(g, n, t) {
    const q = n.q, h = hash(q.id), slot = SLOTS[n.slot], paper = h % 3, age = Board.t - n.t0;
    const base = ((h >>> 3) % 50 - 25) / 10 * BT.jit / 100 + BT.tilt;
    const amp = (1.2 + ((h >>> 9) % 10) / 10) * BT.sway / 100, spd = 0.9 + ((h >>> 13) % 7) / 10, ph = ((h >>> 17) % 628) / 100;
    let sway = Math.sin(t * spd * 2.1 + ph) * amp + Math.sin(t * spd * 3.7 + ph * 1.7) * amp * 0.25;
    let x = slot.x + ((h >>> 20) % 5 - 2) * BT.pj / 100, y = slot.y + ((h >>> 24) % 5 - 2) * BT.pj / 100, sc = 1, al = 1, rot = 0, flat = 0; // flat: 0=벽면 기울기, 1=화면 정면
    if (n.st === 'new') { // 붙이기: 살짝 큰 채로 내려와 핀에 꽂히고 흔들림이 크게 시작
      const e = Math.min(1, age / 0.45); sc = 1.25 - 0.25 * e; al = e; y -= (1 - e) * 12; sway += Math.sin(age * 9) * 7 * Math.max(0, 1 - age / 1.2);
      if (age > 1.2) n.st = 'pinned';
    } else if (n.st === 'taken') { // 떼어 내기: 리나 손으로 날아가며 정면을 향하고 커졌다 사라짐
      const e = Math.min(1, age / 0.6), Lx = root.Lina.x, Ly = root.Lina.feet - 95;
      x += (Lx - x) * e * e; y += (Ly - y) * e * e - Math.sin(e * Math.PI) * 50; sc = 1 + 0.9 * e; flat = e; al = 1 - Math.max(0, e - 0.7) / 0.3; rot = e * 25;
      if (age > 0.6) { Board.notes.delete(q.id); return; }
    } else if (n.st === 'gone') {
      const e = Math.min(1, age / 0.8); al = 1 - e; y += e * 8; rot = e * 8;
      if (age > 0.8) { Board.notes.delete(q.id); return; }
    }
    const W = BOARD.w, H = BOARD.h, s = NS * sc, wl = BT.wall / 100;
    g.save(); g.globalAlpha = al;
    g.translate(x, y);
    g.transform((UVX + (1 - UVX) * flat) * s, (UVY * wl - UVY * wl * flat) * s, 0, s, 0, 0);
    g.rotate((base + sway + rot) * Math.PI / 180); g.translate(-W / 2, -H / 2);
    const x2 = !!q.x2;
    if (x2) { g.shadowColor = `rgba(255,205,70,${(.55 + .3 * Math.sin(t * 2.4 + h % 7)).toFixed(3)})`; g.shadowBlur = 12; g.shadowOffsetY = 0; g.shadowOffsetX = 0; }   // 종이 둘레의 금빛 번짐
    else { g.shadowColor = 'rgba(40,22,8,.38)'; g.shadowBlur = 3; g.shadowOffsetY = 2; g.shadowOffsetX = 0; }
    A.draw(g, 'quest_paper_' + paper, 0, 0);
    g.shadowColor = 'transparent';
    if (x2) { const it = A.items['quest_paper_' + paper]; if (it && it.img) glowPaper(g, it.img, W, H, t, (h % 100) / 40); }
    A.draw(g, 'quest_stamp_' + q.type, W / 2 - 22, H * 0.3, { rot: (((h >>> 5) % 16) - 8) * Math.PI / 180, px: 0.5, py: 0.5 });
    g.drawImage(sealFor(q.g), W * 0.58, H * 0.66, 30, 30);
    g.restore();
    if (q.x2 && t !== 0 && n.st !== 'gone') sparkles(g, n, x, y, sc);   // 별가루 (still 모드·사라지는 중에는 생략)
  }
  function drawEmptySlot(g, slot) { // 빈 칸: 핀 자국
    g.fillStyle = 'rgba(90,55,30,.5)'; g.beginPath(); g.arc(slot.x, slot.y - 12, 1.8, 0, 7); g.fill();
  }

  // ---------- 테이블 ----------
  let lastTables = -1;
  const tableCount = s => 2 + (s.grade >= 1 ? 1 : 0) + (s.grade >= 2 ? 1 : 0); // [가안] 정식 하우징(M3-8) 전까지 등급으로 대신함 (칸은 6개까지 마련됨)
  function floorImg(g, key, gx, gy) { // 바닥 칸 (gx,gy) 위의 가구. 2배 크기로 저장된 그림을 0.5배로, 칸 가운데·앞 꼭짓점에 놓음
    const it = A.items[key]; if (!it || !it.img) return { z: -1e9, f: () => {} };
    const a = I.P(gx + .5, gy + .5), b = I.P(gx + 1, gy + 1), w = it.img.width / 2, h = it.img.height / 2;
    return { z: b[1], f: () => { g.drawImage(it.img, a[0] - w / 2, b[1] - h, w, h); } };
  }
  function emptyTable(g, c) {
    g.save(); g.setLineDash([10, 8]); g.strokeStyle = 'rgba(255,243,214,.55)'; g.lineWidth = 3;
    g.beginPath(); g.ellipse(c[0], c[1] + 8, 52, 24, 0, 0, 7); g.stroke(); g.restore();
  }

  const Lobby = { SLOTS, FILL, TABLES, Board, BT, layout };
  Lobby.update = function (s, dt) {
    const n = tableCount(s);
    if (n !== lastTables) { lastTables = n; root.Director.layout(n); }
    Board.t += dt;
  };
  Lobby.draw = function (g, s, t, opt) {
    opt = opt || {};
    const cap = root.GuildGame.boardCap(s);
    Board.sync(s, cap);
    // 1~3 벽·바닥·게시판
    // 접수대를 오려 낸 배경 (E급부터 문이 열린 그림). 계절·시간대 모듈이 준비되면 바깥을 계절에 맞춰 그리고, 없으면 일반 낮 그림 한 장
    if (!(root.LobbySky && root.LobbySky.draw(g, s, t, opt))) {   // 계절 모듈이 준비 전이면 배경 한 장 + 지은 시설 쪽 문만 열림 (2026-11-12)
      A.draw(g, 'iso_bg', 0, 0);
      const op = A.items.iso_bg_open, m = (s.built['집무실'] ? 1 : 0) | (s.built['관리소'] ? 2 : 0);
      if (op && op.img && m) for (const [bit, r] of [[1, [810, 180, 155, 268]], [2, [965, 180, 152, 268]]]) if (m & bit) g.drawImage(op.img, r[0] * op.img.width / 1920, r[1] * op.img.height / 1080, r[2] * op.img.width / 1920, r[3] * op.img.height / 1080, r[0], r[1], r[2], r[3]);
    }
    // 4 의뢰서
    const usedSlots = new Set([...Board.notes.values()].map(n => n.slot));
    for (let i = 0; i < Math.min(cap, SLOTS.length); i++) if (!usedSlots.has(FILL[i])) drawEmptySlot(g, SLOTS[FILL[i]]);
    for (const n of [...Board.notes.values()].sort((a, b) => (a.st === 'taken') - (b.st === 'taken'))) if (n.st !== 'taken') drawNote(g, n, opt.still ? 0 : t);
    // 5 리나
    root.Lina.draw(g);
    // 6 접수대 (리나 앞)
    A.draw(g, 'iso_counter', I.COUNTER_AT[0], I.COUNTER_AT[1]);
    // 떼어 낸 쪽지는 리나 손으로 날아가므로 카운터보다 앞에 그림
    for (const n of Board.notes.values()) if (n.st === 'taken') drawNote(g, n, t);
    // 8 앞뒤 정렬 묶음
    const list = root.Director.drawables(g, t), nt = tableCount(s);
    for (let i = 0; i < TABLES.length; i++) {
      const [tx, ty] = TABLES[i];
      if (i >= nt) { const c = I.P(tx + .5, ty + .5); list.push({ z: c[1] - 200, f: () => emptyTable(g, c) }); continue; }
      list.push(floorImg(g, 'iso_chair_l', tx - 1, ty), floorImg(g, 'iso_chair_r', tx, ty - 1));
      const tb = floorImg(g, 'iso_table', tx, ty); tb.z += 0.5; list.push(tb);
    }
        list.sort((a, b) => a.z - b.z).forEach(o => o.f());
    // 9 말풍선
    root.Director.bubbles(g);
    if (opt.debug) debug(g);
  };
  function debug(g) { // 슬롯·자리·좌표 확인용
    g.save(); g.fillStyle = 'rgba(255,0,120,.9)'; g.font = '11px sans-serif'; g.textAlign = 'center';
    SLOTS.forEach((sl, i) => { g.beginPath(); g.arc(sl.x, sl.y, 2, 0, 7); g.fill(); g.fillText(FILL.indexOf(i) + 1, sl.x, sl.y - 6); });
    g.strokeStyle = 'rgba(0,160,255,.8)'; g.fillStyle = 'rgba(0,160,255,.9)'; g.font = '16px sans-serif';
    g.fillText('리나 자리', I.LINA_AT[0], I.LINA_AT[1] + 16); g.beginPath(); g.arc(I.CUST_AT[0], I.CUST_AT[1], 6, 0, 7); g.fill(); g.fillText('손님 자리', I.CUST_AT[0], I.CUST_AT[1] + 22);
    for (const st of root.Director.seats) { g.strokeStyle = st.by ? 'rgba(255,120,0,.9)' : 'rgba(0,200,120,.9)'; g.strokeRect(st.ap.x - 8, st.ap.y - 8, 16, 16); }
    g.restore();
  }
  root.Lobby = Lobby;
})(this);
