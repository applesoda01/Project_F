// 야간 6단계 (2026-11-20): 버릇 9종 측정 — 100판, 버릇 있음(rate 0.3) vs 없음(rate 0)
//   node docs/design/quirk_measure_1120.js   (저장소 루트에서) → quirk_measure_1120.json
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const JS = path.join(__dirname, '..', '..', 'prototype', 'js');
const ctx = { console, Math, JSON, Date }; ctx.window = ctx; vm.createContext(ctx);
for (const f of ['data_gen.js', 'combat.js', 'sim_engine.js', 'game_core.js']) vm.runInContext(fs.readFileSync(path.join(JS, f), 'utf8'), ctx, { filename: f });
const Sim = ctx.GuildSim, Gm = ctx.GuildGame;
const N = 100, WEEKS = 72;
const med = L => { const a = L.slice().sort((x, y) => x - y); return a.length ? a[Math.floor(a.length / 2)] : null; };
function run(rate, dish12) {   // dish12: 12주에 F급 요리를 모두 발견한 것으로 (자동 진행은 요리를 발견하지 않아 대식가 효과가 안 보임)
  const clr = [], net48 = [], adv = {}, ev = {}, cnt = { ok: 0, n: 0 };
  for (let i = 0; i < N; i++) {
    const c = Sim.defaults(); c.quirk.rate = rate;
    const s = Gm.newGame(c, 3000 + i); Gm.autoPlace(s, true); const seen = new Set(); let gold48 = null;
    for (let w = 1; w <= WEEKS; w++) {
      if (dish12 && w === 12) for (const d of Gm.DISH || []) if (d.g === 0) s.dishes[d.name] = 12;
      Gm.autoRequests(s); Gm.stepWeek(s);
      if (s.week === 48) gold48 = s.gold;
      for (const x of s.active) { if (seen.has(x.uid)) continue; seen.add(x.uid); if (x.start > 48) continue;
        for (const id of x.party) { const a = s.advs.find(b => b.id === id); if (!a || a.home) continue; const k = a.quirk || '없음', A = adv[k] = adv[k] || { n: 0, ok: 0, hurt: 0, ppl: new Set(), lv: [], att: [] }; A.n++; if (x.ok) A.ok++; A.ppl.add(i + ':' + id);
          const u = x.fight && x.fight.units.find(z => z.id === id); if (u && u.down && !u.fled) A.hurt++; }
        cnt.n++; if (x.ok) cnt.ok++; }
      if (s.week === 48) for (const a of s.advs) if (a.alive && !a.home) { const k = a.quirk || '없음', A = adv[k] = adv[k] || { n: 0, ok: 0, hurt: 0, ppl: new Set(), lv: [], att: [] }; A.lv.push(a.lv); A.att.push(a.attach); }
    }
    const M = s.main || {}; clr.push(M.clear != null ? M.clear : 999);
    for (const k in s.quirkN || {}) ev[k] = (ev[k] || 0) + s.quirkN[k];
    net48.push(gold48);
  }
  const A = {}; for (const k in adv) { const o = adv[k]; A[k] = { 원정: o.n, 성공률: Math.round(o.ok / Math.max(1, o.n) * 1000) / 10, 부상률: Math.round(o.hurt / Math.max(1, o.n) * 1000) / 10, 사람: o.ppl.size, '48주Lv중앙': med(o.lv), '48주애착중앙': Math.round(med(o.att) || 0) }; }
  return { 침공클리어중앙: med(clr), '48주안클리어': clr.filter(w => w <= 48).length, '72주안못깸': clr.filter(w => w === 999).length, '48주금고중앙': Math.round(med(net48)), 원정성공률: Math.round(cnt.ok / cnt.n * 1000) / 10, 모험가별: A, 터진일_100판: ev };
}
const out = { at: '2026-11-20', on: run(0.3), off: run(0), onDish: run(0.3, true), offDish: run(0, true) };
console.log(JSON.stringify(out, null, 1));
fs.writeFileSync(path.join(__dirname, 'quirk_measure_1120.json'), JSON.stringify(out, null, 1) + '\n');
