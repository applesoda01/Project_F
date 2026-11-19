// 버릇 제안서(proposal_quirks_v1.md) 측정: 장점(공격 +5 · 체력 +15)이 모의 전투 승산을 얼마나 올리는지
//   node docs/design/proposal_quirks_measure.js   (저장소 루트에서)
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const JS = path.join(__dirname, '..', '..', 'prototype', 'js');
const ctx = { console, Math, JSON, Date }; ctx.window = ctx; vm.createContext(ctx);
for (const f of ['data_gen.js', 'combat.js', 'sim_engine.js', 'game_core.js']) vm.runInContext(fs.readFileSync(path.join(JS, f), 'utf8'), ctx, { filename: f });
const Sim = ctx.GuildSim, Gm = ctx.GuildGame, CB = ctx.GuildCombat.make(ctx.GAME_DATA);
const N = 60, CHECK = [8, 24, 40];
const rows = []; let bossQ = 0, allQ = 0;
for (let i = 0; i < N; i++) {
  const s = Gm.newGame(Sim.defaults(), 9000 + i); Gm.autoPlace(s, true);
  for (let w = 1; w <= 40; w++) {
    Gm.autoRequests(s); Gm.stepWeek(s);
    if (!CHECK.includes(w)) continue;
    const A = s.advs.filter(a => a.alive);
    for (const q of s.board) {
      if (!q.enemies || !q.enemies.length) continue; allQ++; if (q.enemies.some(e => e.boss)) bossQ++;
      for (let t = 0; t < 3 && A.length >= 2; t++) {
        const k = Math.floor(Math.random() * A.length), m = (k + 1 + Math.floor(Math.random() * (A.length - 1))) % A.length, P = [A[k], A[m]];
        const U = mod => P.map((a, j) => { const u = CB.unit(a, z => Gm.finalStat(s, a, z), Gm.eqOf(a), 0); if (j === 0 && mod) mod(u); return u; });
        const p0 = CB.predict(U(), q.seen, q.g, P[0].risk), pA = CB.predict(U(u => { u.atk += 5; }), q.seen, q.g, P[0].risk), pH = CB.predict(U(u => { u.hp += 15; u.maxHp += 15; }), q.seen, q.g, P[0].risk);
        rows.push({ w, p0, dA: pA - p0, dH: pH - p0 });
      }
    }
  }
}
const avg = (L, k) => L.reduce((t, r) => t + r[k], 0) / Math.max(1, L.length);
const band = r => r.p0 >= 0.7 ? '여유' : r.p0 >= 0.4 ? '팽팽' : '위험';
const out = { n: rows.length, bossShare: bossQ / Math.max(1, allQ), all: { dAtk: avg(rows, 'dA'), dHp: avg(rows, 'dH') }, byBand: {} };
for (const b of ['여유', '팽팽', '위험']) { const L = rows.filter(r => band(r) === b); out.byBand[b] = { n: L.length, dAtk: avg(L, 'dA'), dHp: avg(L, 'dH') }; }
console.log(JSON.stringify(out, null, 1));
fs.writeFileSync(path.join(__dirname, 'proposal_quirks_result.json'), JSON.stringify(out, null, 1) + '\n');
