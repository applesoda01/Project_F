'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const JS = path.join(__dirname, '..', 'js');
const ctx = { console, Math, JSON, Date }; ctx.window = ctx; vm.createContext(ctx);
for (const f of ['data_gen.js', 'combat.js', 'sim_engine.js', 'game_core.js']) vm.runInContext(fs.readFileSync(path.join(JS, f), 'utf8'), ctx, { filename: f });
const Sim = ctx.GuildSim, Gm = ctx.GuildGame, N = 100;
function run(nom, need, core, cond) {
  Gm.NOM_CFG.cond = cond || 'one';
  let op = 0, d = 0, f = 0; const chk = {}; let sent = 0, tried = 0, okN = 0, failN = 0;
  for (let i = 0; i < N; i++) {
    const g = Gm.newGame(Sim.defaults(), 7000 + i); Gm.autoPlace(g, true);
    for (let w = 0; w < 48; w++) {
      if (nom && g.week >= 16 && (g.week - 16) % 6 === 0) {
        g.requests = []; Gm.NOM_SAMPLE.forEach((dd, j) => { dd.req[1] = need; dd.req[0] = core ? -1 : [0, 1, 2][j]; }); Gm.nomEnsure(g);
        for (const r of g.requests) {
          const L = Gm.nomList(g, r.id), el = L.filter(x => x.ok && x.meets);
          const key = g.week + '|' + r.d.key; (chk[key] = chk[key] || []).push(el.length);
          for (const x of el.sort((a, b) => b.chance - a.chance)) { if (Gm.nomMeets(g, r)) break; Gm.nominate(g, r.id, x.id); }
          if (Gm.NOM_CFG.cond === 'one' && Gm.nomMeets(g, r)) for (const x of L.filter(x => x.ok && !r.party.includes(x.id)).sort((a, b) => (b.chance - a.chance) || (b.stat - a.stat))) { if (r.party.length >= r.d.party[1]) break; Gm.nominate(g, r.id, x.id); }
          else if (Gm.NOM_CFG.cond === 'all') for (const x of el.filter(x => !r.party.includes(x.id)).sort((a, b) => b.chance - a.chance)) { if (r.party.length >= r.d.party[1]) break; Gm.nominate(g, r.id, x.id); }
          tried++; if (Gm.nomSend(g, r.id)) { sent++; for (const id of r.party) { const a = g.advs.find(z => z.id === id); a.state = 'quest_wait'; } }
        }
        for (const a of g.advs) if (a.state === 'quest_wait') a.state = 'town';
      }
      Gm.stepWeek(g); Gm.autoCook(g); if (g.week % Gm.WPM === 0) Gm.autoPlace(g, false);
      for (const r of (g.requests || [])) if (r.result && !r.counted) { r.counted = 1; r.result.ok ? okN++ : failN++; }
    }
    op += g.history.reduce((t, m) => t + m.net, 0) / g.history.length; d += g.stats.done; f += g.stats.fail;
  }
  const byWeek = {}; for (const [k, v] of Object.entries(chk)) { const wk = k.split('|')[0]; (byWeek[wk] = byWeek[wk] || []).push(v.reduce((a, b) => a + b, 0) / v.length); }
  return { op: Math.round(op / N), succ: (d / (d + f) * 100).toFixed(1), sentRate: tried ? Math.round(sent / tried * 100) : 0, namedOk: okN, namedFail: failN, elig: Object.fromEntries(Object.entries(byWeek).map(([w, a]) => [w, (a.reduce((x, y) => x + y, 0) / a.length).toFixed(1)])) };
}
const out = { base: run(false, 0) };
for (const need of [15, 18, 22, 26]) out['all' + need] = run(true, need, false, 'all');
for (const need of [15, 18, 22, 26]) out['one' + need] = run(true, need, false, 'one');
console.log(JSON.stringify(out, null, 1));
fs.writeFileSync(process.argv[2] || '/tmp/nom_measure.json', JSON.stringify(out, null, 1));
