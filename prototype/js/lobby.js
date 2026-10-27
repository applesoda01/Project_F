/* 로비 그리기 (M2-3) + 게시판 표시 (M2-4)
   그리는 순서 (기획서 '레이어 구성'):
     1 벽 → 2 바닥 → 3 게시판 (지금은 lobby_wall 한 장에 함께 있음)
     4 의뢰서 → 5 리나 → 6 카운터 → 7 소품
     8 앞뒤 정렬 묶음: 가구·모험가를 발 위치(y)로 정렬. 좌석은 정렬 키를 따로 줘서 의자·사람·테이블 순서를 지킨다
     9 말풍선 → 10 조명 → 11 화면 UI (HTML 층) */
(function (root) {
  'use strict';
  const A = root.Assets;

  // ---------- 고정 배치 (1920×1080) ----------
  const BOARD = { x0: 370, x1: 1550, rows: [64, 204], cols: 12, w: 84, h: 110 };
  const SLOTS = [];
  for (let k = 0; k < BOARD.cols; k++) for (const y of BOARD.rows) SLOTS.push({ x: Math.round(BOARD.x0 + k * (BOARD.x1 - BOARD.x0 - BOARD.w) / (BOARD.cols - 1)), y });
  // 의뢰가 적을 때도 게시판 전체에 고루 퍼지도록 채우는 순서
  const FILL = [0, 13, 6, 19, 3, 16, 9, 22, 1, 14, 7, 20, 4, 17, 10, 23, 2, 15, 8, 21, 5, 18, 11, 12];
  const COUNTER_Y = 372;
  // 테이블 자리 4칸 (뒷줄 2, 앞줄 2). y는 테이블 기준선
  const TABLES = [{ x: 500, y: 700 }, { x: 1420, y: 700 }, { x: 500, y: 920 }, { x: 1420, y: 920 }];
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
  function drawNote(g, n, t) {
    const q = n.q, h = hash(q.id), slot = SLOTS[n.slot], paper = h % 3, age = Board.t - n.t0;
    const base = ((h >>> 3) % 80 - 40) / 10;
    const amp = 1.6 + ((h >>> 9) % 14) / 10, spd = 0.9 + ((h >>> 13) % 7) / 10, ph = ((h >>> 17) % 628) / 100;
    let sway = Math.sin(t * spd * 2.1 + ph) * amp + Math.sin(t * spd * 3.7 + ph * 1.7) * amp * 0.25;
    let x = slot.x + (h >>> 20) % 9 - 4, y = slot.y + (h >>> 24) % 10 - 3, sc = 1, al = 1, rot = 0;
    if (n.st === 'new') { // 붙이기: 살짝 큰 채로 내려와 핀에 꽂히고 흔들림이 크게 시작
      const e = Math.min(1, age / 0.45); sc = 1.25 - 0.25 * e; al = e; y -= (1 - e) * 26; sway += Math.sin(age * 9) * 7 * Math.max(0, 1 - age / 1.2);
      if (age > 1.2) n.st = 'pinned';
    } else if (n.st === 'taken') { // 떼어 내기: 리나 쪽으로 날아가며 작아짐
      const e = Math.min(1, age / 0.6), Lx = root.Lina.x + 40, Ly = 380;
      x += (Lx - x) * e * e; y += (Ly - y) * e * e - Math.sin(e * Math.PI) * 60; sc = 1 - 0.55 * e; al = 1 - Math.max(0, e - 0.7) / 0.3; rot = e * 25;
      if (age > 0.6) { Board.notes.delete(q.id); return; }
    } else if (n.st === 'gone') {
      const e = Math.min(1, age / 0.8); al = 1 - e; y += e * 14; rot = e * 8;
      if (age > 0.8) { Board.notes.delete(q.id); return; }
    }
    const W = BOARD.w, H = BOARD.h;
    g.save(); g.globalAlpha = al;
    g.translate(x + W / 2, y + H * 0.06); g.rotate((base + sway + rot) * Math.PI / 180); g.scale(sc, sc); g.translate(-W / 2, -H * 0.06);
    g.shadowColor = 'rgba(40,22,8,.38)'; g.shadowBlur = 5; g.shadowOffsetY = 4; g.shadowOffsetX = 1;
    A.draw(g, 'quest_paper_' + paper, 0, 0);
    g.shadowColor = 'transparent';
    A.draw(g, 'quest_stamp_' + q.type, W / 2 - 22, H * 0.3, { rot: (((h >>> 5) % 16) - 8) * Math.PI / 180, px: 0.5, py: 0.5 });
    g.drawImage(sealFor(q.g), W * 0.58, H * 0.66, 30, 30);
    g.restore();
  }
  function drawEmptySlot(g, slot) { // 빈 칸: 핀 자국 (lobby_board_slot_empty 대신 코드로)
    g.fillStyle = 'rgba(90,55,30,.45)'; g.beginPath(); g.arc(slot.x + BOARD.w / 2, slot.y + 7, 3.5, 0, 7); g.fill();
  }

  // ---------- 테이블 ----------
  let lastTables = -1;
  const tableCount = s => 2 + (s.grade >= 1 ? 1 : 0) + (s.grade >= 2 ? 1 : 0); // [가안] 정식 하우징(M3-8) 전까지 등급으로 대신함
  function emptyTable(g, T) {
    g.save(); g.setLineDash([14, 10]); g.lineWidth = 4; g.strokeStyle = 'rgba(255,243,214,.8)';
    g.beginPath(); g.ellipse(T.x, T.y + 40, 150, 58, 0, 0, 7); g.stroke();
    g.setLineDash([]); g.fillStyle = 'rgba(255,243,214,.9)'; g.font = '700 22px "Malgun Gothic", sans-serif'; g.textAlign = 'center';
    g.fillText('+ 테이블 놓기', T.x, T.y + 48); g.restore();
  }

  const Lobby = { SLOTS, FILL, TABLES, Board };
  Lobby.update = function (s, dt) {
    const n = tableCount(s);
    if (n !== lastTables) { lastTables = n; root.Director.layout(TABLES.slice(0, n)); }
    Board.t += dt;
  };
  Lobby.draw = function (g, s, t, opt) {
    opt = opt || {};
    const cap = root.GuildGame.boardCap(s);
    Board.sync(s, cap);
    // 1~3 벽·바닥·게시판
    A.draw(g, 'lobby_wall', 0, 0);
    // 4 의뢰서
    const usedSlots = new Set([...Board.notes.values()].map(n => n.slot));
    for (let i = 0; i < Math.min(cap, SLOTS.length); i++) if (!usedSlots.has(FILL[i])) drawEmptySlot(g, SLOTS[FILL[i]]);
    for (const n of [...Board.notes.values()].sort((a, b) => (a.st === 'taken') - (b.st === 'taken'))) if (n.st !== 'taken') drawNote(g, n, opt.still ? 0 : t);
    // 5 리나
    root.Lina.draw(g);
    // 6 카운터
    A.draw(g, 'lobby_counter', 0, COUNTER_Y);
    // 떼어 낸 쪽지는 리나 손으로 날아가므로 카운터보다 앞에 그림
    for (const n of Board.notes.values()) if (n.st === 'taken') drawNote(g, n, t);
    // 8 앞뒤 정렬 묶음
    const list = root.Director.drawables(g, t), nt = tableCount(s), cellChairs = root.Director.cellChairs();
    if (cellChairs) list.push(...root.Director.chairDrawables(g)); // 앉기 시트와 같은 셀 좌표의 의자 (모든 자리)
    for (let i = 0; i < 4; i++) {
      const T = TABLES[i];
      if (i >= nt) { list.push({ z: T.y, f: () => emptyTable(g, T) }); continue; }
      const lv = i === 1 && s.grade >= 1 ? 2 : 1;
      // 탁자 하나에 4석: 위쪽 2석(정면 의자, 탁자 뒤) + 왼쪽·오른쪽 1석씩(옆모습 의자). 좌표는 actors.js 의 D.layout 과 같이 바꿀 것
      if (!cellChairs) { // 앉기 시트용 의자 그림이 없을 때의 기존 의자
        for (const dx of [-root.Director.TOP_DX, root.Director.TOP_DX]) list.push({ z: T.y + 30, f: () => A.draw(g, `chair_lv${lv}_front`, T.x + dx, T.y - 2) });
        list.push({ z: T.y + 93, f: () => A.draw(g, `chair_lv${lv}_side_l`, T.x - 100, T.y + 62) });
        list.push({ z: T.y + 93, f: () => A.draw(g, `chair_lv${lv}_side_r`, T.x + 100, T.y + 62) });
      }
      list.push({ z: T.y + 96, f: () => { g.fillStyle = 'rgba(60,30,10,.18)'; g.beginPath(); g.ellipse(T.x, T.y + 92, 70, 13, 0, 0, 7); g.fill(); A.draw(g, `table_lv${lv}`, T.x, T.y + 96); } });
    }
    list.sort((a, b) => a.z - b.z).forEach(o => o.f());
    // 9 말풍선
    root.Director.bubbles(g);
    if (opt.debug) debug(g);
  };
  function debug(g) { // 레이어 경계와 슬롯 확인용
    g.save(); g.strokeStyle = 'rgba(255,0,120,.7)'; g.lineWidth = 2;
    SLOTS.forEach((sl, i) => { g.strokeRect(sl.x, sl.y, BOARD.w, BOARD.h); g.fillStyle = 'rgba(255,0,120,.9)'; g.font = '14px sans-serif'; g.fillText(FILL.indexOf(i) + 1, sl.x + 4, sl.y + 16); });
    g.strokeStyle = 'rgba(0,160,255,.8)'; g.beginPath(); g.moveTo(0, COUNTER_Y); g.lineTo(1920, COUNTER_Y); g.stroke();
    g.fillStyle = 'rgba(0,160,255,.9)'; g.font = '16px sans-serif'; g.fillText('카운터 레이어 y=372', 10, COUNTER_Y - 6);
    for (const [k, x] of Object.entries(root.Lina.WIN)) { g.fillText(k, x - 20, 630); g.beginPath(); g.arc(x, 650, 6, 0, 7); g.fill(); }
    for (const st of root.Director.seats) { g.strokeStyle = st.by ? 'rgba(255,120,0,.9)' : 'rgba(0,200,120,.9)'; g.strokeRect(st.x - 20, st.y - 20, 40, 20); }
    g.restore();
  }
  root.Lobby = Lobby;
})(this);
