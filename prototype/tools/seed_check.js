// 씨앗 고정 검사 (2026-11-27, 「시간과 미니뷰」 9-1): 게임 쪽 규칙(game_core.js)만 화면 없이 돌려,
// 적어 둔 결과(seed_baseline.json)와 판마다 견준다. 관문 1(게임과 시뮬레이터 견주기)을 대신하는 검사.
//   node prototype/tools/seed_check.js            → 견주기. 달라진 판이 있으면 표를 보이고 종료 코드 1
//   node prototype/tools/seed_check.js --update   → 지금 결과로 seed_baseline.json을 새로 씀
//   node prototype/tools/seed_check.js --md out   → 결과 표를 마크다운 파일로도 저장
// 돌리는 고리는 gate1_check.js의 게임 쪽과 같다: newGame → autoPlace → 48주 동안 autoRequests · stepWeek · autoCook (월말 autoPlace)
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const JS = path.join(__dirname, '..', 'js');
const BASE = path.join(__dirname, 'seed_baseline.json');
const SEED0 = 7000, N = 20, WEEKS = 48;
const KEYS = [['gold', '금고'], ['done', '성공'], ['fail', '실패'], ['alive', '모험가'], ['fame', '명성'], ['pop', '인구']];

const ctx = { console, Math, JSON, Date }; ctx.window = ctx; vm.createContext(ctx);
for (const f of ['data_gen.js', 'combat.js', 'sim_engine.js', 'game_core.js']) vm.runInContext(fs.readFileSync(path.join(JS, f), 'utf8'), ctx, { filename: f });
const Sim = ctx.GuildSim, Gm = ctx.GuildGame;   // Sim은 설정표(balance.csv)를 읽는 defaults()만 쓴다
const r3 = x => Math.round((x || 0) * 1000) / 1000;

function run(seed) {
  const g = Gm.newGame(Sim.defaults(), seed); Gm.autoPlace(g, true);
  for (let w = 0; w < WEEKS; w++) { Gm.autoRequests(g); Gm.stepWeek(g); Gm.autoCook(g); if (g.week % Gm.WPM === 0) Gm.autoPlace(g, false); }
  return { seed, gold: r3(g.gold), done: g.stats.done, fail: g.stats.fail, alive: g.advs.filter(a => a.alive).length, fame: r3(g.fame), pop: r3(g.pop) };
}

const t0 = Date.now(), now = []; for (let i = 0; i < N; i++) now.push(run(SEED0 + i));
const sec = ((Date.now() - t0) / 1000).toFixed(1);
const sum = rows => Object.fromEntries(KEYS.map(([k]) => [k, r3(rows.reduce((t, r) => t + r[k], 0) / rows.length)]));
const head = `씨앗 ${SEED0}~${SEED0 + N - 1} · ${N}판 · ${WEEKS}주`;

if (process.argv.includes('--update')) {
  fs.writeFileSync(BASE, '{\n "note": ' + JSON.stringify(`씨앗 고정 검사의 기준 (${head}). node prototype/tools/seed_check.js --update 로 새로 씀`) + ',\n "written": "' + new Date().toISOString().slice(0, 10) + '",\n "seeds": [\n' + now.map(r => '  ' + JSON.stringify(r)).join(',\n') + '\n ]\n}\n');   // 판마다 한 줄 (차이를 git으로 보기 쉽게)
  const a = sum(now); console.log(`씨앗 고정 검사: 기준을 새로 썼습니다 (${head}, ${sec}초). 평균 — ${KEYS.map(([k, n]) => `${n} ${a[k]}`).join(' · ')}`); process.exit(0);
}
if (!fs.existsSync(BASE)) { console.log('seed_baseline.json이 없습니다. --update 로 먼저 만드세요.'); process.exit(1); }
const base = JSON.parse(fs.readFileSync(BASE, 'utf8')).seeds, bySeed = Object.fromEntries(base.map(r => [r.seed, r]));
const fmt = (a, b) => a === b ? String(a) : `${a} → ${b} (${b - a > 0 ? '+' : ''}${r3(b - a)})`;
const diff = now.filter(r => { const b = bySeed[r.seed]; return !b || KEYS.some(([k]) => b[k] !== r[k]); });
const A = sum(base.filter(b => now.some(r => r.seed === b.seed))), B = sum(now);
const lines = [`### 씨앗 고정 검사 (${head}, ${sec}초)`, ''];
if (!diff.length) lines.push(`✅ 달라진 것 없음 — 평균 ${KEYS.map(([k, n]) => `${n} ${B[k]}`).join(' · ')}`);
else {
  lines.push(`⚠️ 달라진 판 ${diff.length} / ${N}`, '', `| 씨앗 | ${KEYS.map(([, n]) => n).join(' | ')} |`, `| --- |${KEYS.map(() => ' ---: |').join('')}`);
  for (const r of diff) { const b = bySeed[r.seed] || {}; lines.push(`| ${r.seed} | ${KEYS.map(([k]) => fmt(b[k], r[k])).join(' | ')} |`); }
  lines.push(`| **평균** | ${KEYS.map(([k]) => fmt(A[k], B[k])).join(' | ')} |`, '', '바뀐 것이 의도한 것이면 `node prototype/tools/seed_check.js --update`로 기준을 새로 쓰세요.');
}
const md = lines.join('\n'); console.log(md);
const mi = process.argv.indexOf('--md'); if (mi > 0 && process.argv[mi + 1]) fs.writeFileSync(process.argv[mi + 1], md + '\n');
process.exit(diff.length ? 1 : 0);
