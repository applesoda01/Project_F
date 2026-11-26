// 게임의 승산 식(questP)을 정한 경우에 넣어 보는 셈 — 주를 넘기는 시뮬레이션이 아님. 게임 파일은 고치지 않음.
const fs = require('fs'), path = require('path'), vm = require('vm');
const JS = path.join(__dirname, '..', '..', '..', 'js');
const ctx = { console, Math, JSON, Date }; ctx.window = ctx; vm.createContext(ctx);
for (const f of ['data_gen.js', 'combat.js', 'sim_engine.js', 'game_core.js']) vm.runInContext(fs.readFileSync(path.join(JS, f), 'utf8'), ctx, { filename: f });
const Sim = ctx.GuildSim, Gm = ctx.GuildGame, G = ctx.GAME_DATA;
const mode = process.argv[2];
const g = Gm.newGame(Sim.defaults(), 7000);
if (mode === 'peek') {
  const T = G.content.quests.find(q => q.id === 'q_slay_F'); console.log(JSON.stringify(T.enemies), T.ref, JSON.stringify(T.stats));
  console.log(Object.keys(G.content).join(','));
  const mons = G.content.monsters || G.content.mons || []; console.log(JSON.stringify((Array.isArray(mons) ? mons : Object.values(mons)).slice(0, 3)).slice(0, 500));
  console.log('quest cfg', JSON.stringify({ diff: g.cfg.quest.diff, ref: g.cfg.quest.ref, ncBase: g.cfg.quest.ncBase, ncIntF: g.cfg.quest.ncIntF, assist: g.cfg.quest.partyAssist }));
  console.log('growth', JSON.stringify(g.cfg.growth).slice(0, 400));
  const a = Gm.spawnAdv(g, {}); console.log(JSON.stringify({ cls: a && a.cls, core: a && a.core, stats: a && a.stats, star: a && a.star }));
  console.log(g.advs.map(x => [x.cls, x.core, x.star, x.risk].join('/')).join(' | '));
}
if (mode === 'grid') {
  const DF = g.cfg.quest.diff[0], NCM = [1, +(process.argv[3] || 1.6), +(process.argv[4] || 2.2)];
  const CLS = ['전사', '궁수', '마법사', '성직자', '도적'];
  const pool = {}; let guard = 0;
  while (Object.keys(pool).length < 5 && guard++ < 400) { const a = Gm.spawnAdv(g, {}); if (a && !pool[a.cls]) pool[a.cls] = a; }
  for (const a of g.advs) if (!pool[a.cls]) pool[a.cls] = a;
  console.log('직업 → 주력:', Object.values(pool).map(a => a.cls + ':' + a.core).join(' '));
  let nid = 9000;
  const mk = (cls, lv) => { const b = pool[cls], a = JSON.parse(JSON.stringify(b)); a.id = nid++; a.name = cls + lv; a.star = 1; a.lv = lv; a.stats = a.stats.map((v, i) => (i === b.core ? 15 : 6) + (i === b.core ? 2 : 0.4) * (lv - 1)); a.state = 'town'; a.alive = true; a.risk = 1; g.advs.push(a); return a; };
  const byCore = c => Object.values(pool).find(a => a.core === c).cls;
  const quest = (tid, L) => { const T = G.content.quests.find(q => q.id === tid), type = T.type, q = { id: nid++, g: 0, type, req: [type], r: T.ref * DF * (T.enemies && T.enemies.length ? 1 : NCM[L - 1]), reward: 100 * L, posted: 0, tid, name: T.name, weeks: 1 };
    if (T.enemies && T.enemies.length) { const L1 = []; for (const e of T.enemies) for (let k = 0; k < e.count; k++) L1.push(e); const CM = [0.5, 1, 2][L - 1]; const all = CM < 1 ? L1.slice(0, Math.max(1, Math.ceil(L1.length * CM))) : []; if (CM >= 1) for (let r = 0; r < CM; r++) for (const e of L1) all.push(e);
      q.enemies = all.map(e => ({ hp: e.hp * DF, atk: e.atk * DF, def: e.def || 0, name: e.name, mon: e.mon, boss: false })); q.seen = q.enemies.map(e => ({ hp: e.hp, atk: e.atk, def: e.def, name: e.name, boss: false })); q.foe = DF; }
    return q; };
  const P = (party, q) => { let t = 0; const K = 6; for (let i = 0; i < K; i++) t += Gm.questP(g, party, q); return Math.round(t / K * 100); };
  for (const tid of ['q_slay_F', 'q_hunt_F', 'q_study_F', 'q_guard_F', 'q_mine_F', 'q_hunt_F_2']) {
    const T = G.content.quests.find(q => q.id === tid), fit = byCore(T.type);
    console.log(`\n${T.name} · 종류 ${T.type} · ${(T.enemies || []).map(e => e.name + '×' + e.count).join('+') || '싸움 없음'} · 맞는 직업 ${fit}`);
    for (const lv of [1, 3, 5, 8]) { const row = [];
      for (const n of [1, 2, 3]) { const party = []; for (let i = 0; i < n; i++) party.push(mk(fit, lv)); row.push(`${n}명 ` + [1, 2, 3].map(L => P(party, quest(tid, L))).join('/')); }
      const oc = fit === '마법사' ? '전사' : '마법사'; const mix = [mk(fit, lv), mk(oc, lv)]; row.push('맞는1+다른1 ' + [1, 2, 3].map(L => P(mix, quest(tid, L))).join('/')); row.push('다른 직업 혼자 ' + [1, 2, 3].map(L => P([mk(oc, lv)], quest(tid, L))).join('/'));
      console.log(`  Lv${lv}: ` + row.join(' | ')); }
  }
}
