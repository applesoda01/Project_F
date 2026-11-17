// 의뢰 0건 판 대책 비교 (2026-11-17 B 세션) — 게임 파일은 고치지 않는다.
// game_core.js 소스를 메모리에서만 바꿔(문자열 치환) 안마다 따로 불러 관문 1과 같은 방식(100판 × 48주, 시드 7000~7099)으로 잰다.
//   node prototype/tools/economy_v2_zero_quest.js [--md out.md]
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), cp = require('child_process');
const JS = path.join(__dirname, '..', 'js'), N = 100, WEEKS = 48, SEED0 = 7000;
const SRC = Object.fromEntries(['data_gen.js', 'combat.js', 'sim_engine.js', 'game_core.js'].map(f => [f, fs.readFileSync(path.join(JS, f), 'utf8')]));

const A_HOOK = 'initHouses(s);   // 2026-11-13';
const B_HOOK = "const st = (s.cfg.adv || {}).fameStep; if (!st) return;";
const FIX_A = '{ const f = s.advs.filter(a => a.home); if (f.length >= 2 && f.every(a => a.risk === 0)) f[1].risk = 1; } ';
const visit = n => ` if ((s.fame || 0) === 0 && s.week > 0 && s.week % ${n} === 0 && s.advs.filter(x => x.alive).length < advCap(s)) spawnAdv(s, {});`;
const VARIANTS = [
  { key: 'base', name: '지금 (기준)', patch: src => src },
  { key: '1a', name: '안 ①-가: 창립 2명이 둘 다 신중이면 2번째를 보통으로',
    patch: src => src.replace(A_HOOK, FIX_A + A_HOOK) },
  { key: '1b', name: '안 ①-나: 창립 2번째는 늘 신중이 아님 (신중이면 보통으로)',
    patch: src => src.replace(A_HOOK, '{ const f = s.advs.filter(a => a.home); if (f.length >= 2 && f[1].risk === 0) f[1].risk = 1; } ' + A_HOOK) },
  ...[4, 8].map(n => ({ key: '2_' + n, name: `안 ②: 명성 0이면 ${n}주마다 1명 방문`,
    patch: src => src.replace(B_HOOK, B_HOOK + visit(n)) })),
  { key: '1a2_8', name: '안 ①-가 + ② 8주 (함께)', patch: src => src.replace(A_HOOK, FIX_A + A_HOOK).replace(B_HOOK, B_HOOK + visit(8)) }
];

function load(v) {
  const ctx = { console, Math, JSON, Date }; ctx.window = ctx; vm.createContext(ctx);
  for (const f of Object.keys(SRC)) {
    const s = f === 'game_core.js' ? v.patch(SRC[f]) : SRC[f];
    if (f === 'game_core.js' && v.key !== 'base' && s === SRC[f]) throw new Error('치환 실패: ' + v.key + ' (game_core.js 문구가 바뀜)');
    vm.runInContext(s, ctx, { filename: f });
  }
  return ctx;
}
const med = a => { const s = a.slice().sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const runs = {};
for (const v of VARIANTS) {
  const { GuildSim: Sim, GuildGame: Gm } = load(v);
  const r = { net: 0, d: 0, f: 0, idle: [], clear: [], offer: [], first: {}, done: [] };
  for (let i = 0; i < N; i++) {
    const g = Gm.newGame(Sim.defaults(), SEED0 + i); Gm.autoPlace(g, true); let first = Infinity;
    for (let w = 0; w < WEEKS; w++) {
      Gm.autoRequests(g); Gm.stepWeek(g); Gm.autoCook(g); if (g.week % Gm.WPM === 0) Gm.autoPlace(g, false);
      if (first === Infinity && g.stats.done + g.stats.fail > 0) first = g.week;
    }
    r.net += g.history.reduce((t, m) => t + m.net, 0) / g.history.length; r.d += g.stats.done; r.f += g.stats.fail;
    if (g.stats.done + g.stats.fail === 0) r.idle.push(SEED0 + i);
    r.first[SEED0 + i] = first; r.done.push(g.stats.done);
    r.clear.push(g.main && g.main.clear != null ? g.main.clear : Infinity);
    r.offer.push(g.main && g.main.offered != null ? g.main.offered : Infinity);
  }
  runs[v.key] = r;
}
const base = runs.base, IDLE0 = base.idle, W = x => x === Infinity ? '48주 넘음' : x + '주';
let rev = '(git 없음)'; try { rev = cp.execSync('git rev-parse --short HEAD', { cwd: path.join(__dirname, '..', '..') }).toString().trim(); } catch (e) { /* 그대로 */ }
const md = [
  `측정: \`node prototype/tools/economy_v2_zero_quest.js\` · 커밋 \`${rev}\` · 게임 규칙 ${N}판 × ${WEEKS}주 · 시드 ${SEED0}~${SEED0 + N - 1} · 게임 파일은 그대로, 안은 메모리에서만 적용`, '',
  '| 안 | 의뢰 0건 판 | 관문 1 (월 순이익 · 성공률) | 침공 등장 중앙 | 승급 중앙 (48주 안) | 기준과 결과가 달라진 판 |',
  '| --- | ---: | ---: | ---: | ---: | ---: |',
  ...VARIANTS.map(v => { const r = runs[v.key];
    const diff = r.done.filter((x, i) => x !== base.done[i] || r.clear[i] !== base.clear[i]).length;
    return `| ${v.name} | **${r.idle.length}판**${r.idle.length ? ' (' + r.idle.join(', ') + ')' : ''} | ${Math.round(r.net / N)}G · ${(r.d / (r.d + r.f) * 100).toFixed(1)}% | ${W(med(r.offer))} | ${W(med(r.clear))} (${r.clear.filter(x => x <= WEEKS).length}판) | ${v.key === 'base' ? '—' : diff + '판'} |`; }), '',
  `기준에서 0건이던 ${IDLE0.length}판(시드 ${IDLE0.join(', ')})의 첫 의뢰 주 · 승급 주:`, '',
  '| 안 | ' + IDLE0.join(' | ') + ' |', '| --- |' + IDLE0.map(() => ' ---: |').join(''),
  ...VARIANTS.filter(v => v.key !== 'base').map(v => { const r = runs[v.key];
    return `| ${v.name} | ` + IDLE0.map(s => `${W(r.first[s])} · ${W(r.clear[s - SEED0])}`).join(' | ') + ' |'; })
].join('\n');
console.log(md);
const i = process.argv.indexOf('--md'); if (i > 0 && process.argv[i + 1]) fs.writeFileSync(process.argv[i + 1], md + '\n');
