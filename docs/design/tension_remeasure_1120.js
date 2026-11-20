// 야간 작업 0단계 (2026-11-20): 오늘(11-19) 바뀐 규칙 기준으로 「여유 · 팽팽 · 위험」 비율 다시 재기
//   node docs/design/tension_remeasure_1120.js   (저장소 루트에서)
//   ① 제안서 3장과 같은 방법 (무작위 2인 파티 × 게시판 전투 의뢰, 8 · 24 · 40주) — 비교용
//   ② 실제로 떠난 원정의 출발 승산 (100판 × 48주, 게시판 · 리퀘스트 따로) — 플레이어가 실제로 보는 장면
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const JS = path.join(__dirname, '..', '..', 'prototype', 'js');
const ctx = { console, Math, JSON, Date }; ctx.window = ctx; vm.createContext(ctx);
for (const f of ['data_gen.js', 'combat.js', 'sim_engine.js', 'game_core.js']) vm.runInContext(fs.readFileSync(path.join(JS, f), 'utf8'), ctx, { filename: f });
const Sim = ctx.GuildSim, Gm = ctx.GuildGame, CB = ctx.GuildCombat.make(ctx.GAME_DATA);
const band = p => p >= 0.7 ? '여유' : p >= 0.4 ? '팽팽' : '위험';
// ①
let seed = 1; const R = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
const r1 = { 여유: 0, 팽팽: 0, 위험: 0 }; let n1 = 0;
for (let i = 0; i < 60; i++) {
  const s = Gm.newGame(Sim.defaults(), 9000 + i); Gm.autoPlace(s, true);
  for (let w = 1; w <= 40; w++) {
    Gm.autoRequests(s); Gm.stepWeek(s);
    if (![8, 24, 40].includes(w)) continue;
    const A = s.advs.filter(a => a.alive);
    for (const q of s.board) {
      if (!q.enemies || !q.enemies.length) continue;
      for (let t = 0; t < 3 && A.length >= 2; t++) {
        const k = Math.floor(R() * A.length), m = (k + 1 + Math.floor(R() * (A.length - 1))) % A.length, P = [A[k], A[m]];
        const U = P.map(a => CB.unit(a, z => Gm.finalStat(s, a, z), Gm.eqOf(a), 0));
        r1[band(CB.predict(U, q.seen, q.g, P[0].risk))]++; n1++;
      }
    }
  }
}
// ②
const r2 = { board: { 여유: 0, 팽팽: 0, 위험: 0 }, req: { 여유: 0, 팽팽: 0, 위험: 0 } }, byWeek = {}; const seen = new Set();
let wins = { board: [0, 0], req: [0, 0] };
for (let i = 0; i < 100; i++) {
  const s = Gm.newGame(Sim.defaults(), 7000 + i); Gm.autoPlace(s, true);
  for (let w = 1; w <= 48; w++) {
    Gm.autoRequests(s); Gm.stepWeek(s);
    for (const x of s.active) {
      const key = i + ':' + x.uid; if (seen.has(key) || !x.fight) continue; seen.add(key);
      const k = x.q.rq ? 'req' : 'board', b = band(x.rate / 100); r2[k][b]++;
      const seg = x.start < 12 ? '1~11주' : x.start < 24 ? '12~23주' : '24~48주'; byWeek[seg] = byWeek[seg] || { 여유: 0, 팽팽: 0, 위험: 0 }; byWeek[seg][b]++;
      wins[k][0]++; if (x.ok) wins[k][1]++;
    }
  }
}
const pct = o => { const t = Object.values(o).reduce((a, b) => a + b, 0) || 1; const r = {}; for (const k in o) r[k] = Math.round(o[k] / t * 1000) / 10; r.n = t; return r; };
const out = { at: '2026-11-20', random2: pct(r1), departed: { board: pct(r2.board), req: pct(r2.req) }, departedByWeek: Object.fromEntries(Object.entries(byWeek).map(([k, v]) => [k, pct(v)])), winRate: { board: Math.round(wins.board[1] / Math.max(1, wins.board[0]) * 1000) / 10, req: Math.round(wins.req[1] / Math.max(1, wins.req[0]) * 1000) / 10 } };
console.log(JSON.stringify(out, null, 1));
fs.writeFileSync(path.join(__dirname, 'tension_remeasure_1120.json'), JSON.stringify(out, null, 1) + '\n');
