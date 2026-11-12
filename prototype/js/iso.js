/* 아이소메트릭 로비 공통 (2026.11)
   - 길드 1층 바닥을 14×14 칸으로 나눈 좌표(P), 테이블 6칸, 접수대·손님·입구 위치
   - 9명 모험가 시트(걷기·서기·앉기)와 접수원 리나 시트를 그리는 공용 함수
   - 시트 규격: 걷기·서기 셀 160×200(발밑 197), 앉기 셀 180×175(의자 기준점 = 시트 안 (360,620)을 0.25배), 리나 셀 192×192(발밑 183, 0.87배) */
(function (root) {
  'use strict';
  // 바닥 네 모서리(화면 1920×1080)를 쌍선형으로 이어 칸 좌표 → 화면 좌표로 바꿈. gx: 오른쪽 벽 쪽, gy: 왼쪽 벽 쪽
  const T0 = [960, 380], L0 = [222, 705], R0 = [1697, 712], B0 = [955, 1077];
  function P(gx, gy) {
    const k = gx * gy / 196;
    return [T0[0] + gx / 14 * (R0[0] - T0[0]) + gy / 14 * (L0[0] - T0[0]) + k * (B0[0] - R0[0] - L0[0] + T0[0]),
            T0[1] + gx / 14 * (R0[1] - T0[1]) + gy / 14 * (L0[1] - T0[1]) + k * (B0[1] - R0[1] - L0[1] + T0[1])];
  }
  const TABLES = [[4, 9], [7, 9], [10, 9], [4, 12], [7, 12], [10, 12]];
  const LINA_AT = [1221, 505];                 // 리나 발밑 (접수대 뒤). 확정 2026.11
  const CUST_AT = P(5.4, 3.5), ENTRY = P(13.2, 10.6), DOOR_OUT = P(14.6, 12.2);
  const COUNTER_AT = [1020, 410];              // 접수대 그림(배경에서 오려 낸 것) 왼쪽 위
  const SH = {
    lina: { cw: 192, ch: 192, cols: 12, piv: 183, sc: 0.87 },
    walk: { cw: 160, ch: 200, cols: 12, piv: 197, sc: 1.0 },
    idle: { cw: 160, ch: 200, cols: 12, piv: 197, sc: 1.0 }
  };
  const SIT = { fw: 180, fh: 175, sc: 0.25, fps: 24, cols: 12 };
  // n: 앉기 프레임 수, f0: 서 있는 첫 프레임의 [가운데 x, 발밑 y, 머리 y] (시트 원본 좌표)
  const SITI = {
    cleric_f: { n: 38, f0: [370.0, 593, 79] }, rogue_f: { n: 49, f0: [384.0, 582, 62] }, archer_m: { n: 43, f0: [352.5, 605, 92] },
    mage_m: { n: 44, f0: [331.0, 618, 68] }, cleric_m: { n: 48, f0: [372.5, 610, 92] }, rogue_m: { n: 43, f0: [383.0, 578, 62] },
    mage_f: { n: 46, f0: [376.5, 580, 67] }, warrior_f: { n: 38, f0: [359.5, 588, 72] }, archer_f: { n: 35, f0: [370.0, 587, 70] },
    warrior_m: { n: 35, f0: [362.0, 592, 73] }   // 새 갈색 남 전사 (2026.11)
  };
  // 자리: 탁자 칸 (tx,ty) 의 좌우. side 'r' = 위쪽 칸(오른쪽 의자, 그림 좌우반전), 'l' = 왼쪽 칸
  function seatInfo(se) { const a = P(se.cell[0] + .5, se.cell[1] + .5), b = P(se.cell[0] + 1, se.cell[1] + 1); return { ax: a[0], ay: b[1], flip: se.side === 'r' }; }
  function seatStand(se, c) { const si = seatInfo(se), f = SITI[c].f0, k = si.flip ? -1 : 1; return [si.ax + (f[0] - 360) * SIT.sc * k, si.ay + (f[1] - 620) * SIT.sc]; }
  function seatsFor(nTables) {
    const L = [];
    for (let i = 0; i < Math.min(nTables, TABLES.length); i++) {
      const [tx, ty] = TABLES[i];
      L.push({ id: i * 2, cell: [tx, ty - 1], side: 'r', tab: i });
      L.push({ id: i * 2 + 1, cell: [tx - 1, ty], side: 'l', tab: i });
    }
    return L;
  }
  // 시트 한 칸 그리기. 발밑 (x,y), flip 이면 좌우반전
  function frame(g, img, sh, col, row, x, y, flip, alpha, extraSc) {
    if (!img) return;
    const s = sh.sc * (extraSc || 1);
    g.save(); g.translate(x, y); if (flip) g.scale(-1, 1); if (alpha != null) g.globalAlpha *= alpha;
    g.drawImage(img, col * sh.cw, row * sh.ch, sh.cw, sh.ch, -sh.cw / 2 * s, -sh.piv * s, sh.cw * s, sh.ch * s);
    g.restore();
  }
  // 앉기 시트 한 칸 (fi 번째 프레임) — 의자 기준점 (ax,ay)
  function sitFrame(g, img, fi, ax, ay, flip, alpha) {
    if (!img) return;
    g.save(); g.translate(ax, ay); if (flip) g.scale(-1, 1); if (alpha != null) g.globalAlpha *= alpha;
    g.drawImage(img, (fi % SIT.cols) * SIT.fw, Math.floor(fi / SIT.cols) * SIT.fh, SIT.fw, SIT.fh, -360 * SIT.sc, -620 * SIT.sc, SIT.fw, SIT.fh);
    g.restore();
  }
  // 걷기 시트가 없는 직업(전사 남)은 같은 직업 다른 성별 → 없으면 성직자 여성으로 대신함
  function charKey(cls, sex) {
    const c = cls + '_' + sex; if (SITI[c]) return c;
    const alt = cls + '_' + (sex === 'm' ? 'f' : 'm'); return SITI[alt] ? alt : 'cleric_f';
  }
  root.Iso = { P, TABLES, LINA_AT, CUST_AT, ENTRY, DOOR_OUT, COUNTER_AT, SH, SIT, SITI, seatInfo, seatStand, seatsFor, frame, sitFrame, charKey, CHARS: Object.keys(SITI) };
})(this);
