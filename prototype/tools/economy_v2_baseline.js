// 경제 개편 V2 기준 측정 (E0-5, 2026-11-17 B 세션)
// 관문 1과 같은 방식(게임 규칙 100판 · 48주, 시드 7000~7099, Sim.defaults())으로 첫해 경제 지표를 잰다.
// 저장소 파일을 바꾸지 않는다. 결과를 마크다운으로 출력(--md 파일 경로를 주면 파일로도 저장).
//   node prototype/tools/economy_v2_baseline.js [--md out.md]
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), cp = require('child_process');
const JS = path.join(__dirname, '..', 'js');
const ctx = { console, Math, JSON, Date }; ctx.window = ctx; vm.createContext(ctx);
for (const f of ['data_gen.js', 'combat.js', 'sim_engine.js', 'game_core.js']) vm.runInContext(fs.readFileSync(path.join(JS, f), 'utf8'), ctx, { filename: f });
const Sim = ctx.GuildSim, Gm = ctx.GuildGame, N = 100, WEEKS = 48, SEED0 = 7000;

const stat = a => { const s = a.slice().sort((x, y) => x - y), q = p => s[Math.min(s.length - 1, Math.floor(p * s.length))];
  return { mean: a.reduce((t, x) => t + x, 0) / a.length, p10: q(0.1), med: q(0.5), p90: q(0.9), min: s[0], max: s[s.length - 1] }; };
const KEYS = ['fee', 'resale', 'meal', 'tavern', 'subsidy', 'reqIn', 'upkeep', 'scout', 'prep', 'build', 'other'];
const per = { net: [], start: [], low: [], lowWeek: [], end: [], clear: [], offer: [], advs: [], fame: [], neg: [] }; const idle = [];
const cat = Object.fromEntries(KEYS.map(k => [k, 0])); let months = 0, done = 0, fail = 0;

for (let i = 0; i < N; i++) {
  const g = Gm.newGame(Sim.defaults(), SEED0 + i); Gm.autoPlace(g, true);
  per.start.push(g.gold); let low = Infinity, lowW = 0;   // 저점은 1주 결산 뒤부터 (시작 배치 직후 금고는 따로)
  for (let w = 0; w < WEEKS; w++) {   // 관문 1(gate1_check.js)과 같은 진행
    Gm.autoRequests(g); Gm.stepWeek(g); Gm.autoCook(g); if (g.week % Gm.WPM === 0) Gm.autoPlace(g, false);
    if (g.gold < low) { low = g.gold; lowW = g.week; }
  }
  const H = g.history;
  per.net.push(H.reduce((t, m) => t + m.net, 0) / H.length);
  per.neg.push(H.filter(m => m.net < 0).length);
  for (const m of H) { months++; for (const k of KEYS) cat[k] += +m[k] || 0; }
  per.low.push(low); per.lowWeek.push(lowW); per.end.push(g.gold);
  done += g.stats.done; fail += g.stats.fail; if (g.stats.done + g.stats.fail === 0) idle.push(SEED0 + i);
  per.clear.push(g.main && g.main.clear != null ? g.main.clear : Infinity);
  per.offer.push(g.main && g.main.offered != null ? g.main.offered : Infinity);
  per.advs.push(g.advs.filter(a => a.alive).length); per.fame.push(g.fame || 0);
}
// 시뮬레이터 (관문 1과 같은 설정)
const cfg = Sim.defaults(); cfg.run.maxYears = 1; let sNet = 0, sD = 0, sF = 0;
for (let i = 0; i < N; i++) { const r = Sim.simulate(cfg, 'balanced', SEED0 + i); sNet += r.firstNetF.reduce((a, c) => a + c, 0) / r.firstNetF.length; sD += r.qDone; sF += r.qFail; }

const G = v => Math.round(v).toLocaleString('en-US') + 'G', W = v => v === Infinity ? '48주 넘음' : v + '주';
const row = (name, s, f) => `| ${name} | ${f(s.mean)} | ${f(s.p10)} | ${f(s.med)} | ${f(s.p90)} | ${f(s.min)} ~ ${f(s.max)} |`;
let rev = '(git 없음)'; try { rev = cp.execSync('git rev-parse --short HEAD', { cwd: path.join(__dirname, '..', '..') }).toString().trim(); } catch (e) { /* 없으면 그대로 */ }
const clearIn = per.clear.filter(x => x <= WEEKS).length, offerIn = per.offer.filter(x => x <= WEEKS).length;
const md = [
  `측정: \`node prototype/tools/economy_v2_baseline.js\` · 커밋 \`${rev}\` · 게임 규칙 ${N}판 × ${WEEKS}주 · 시드 ${SEED0}~${SEED0 + N - 1} · 설정 \`Sim.defaults()\` · 진행 방식은 관문 1(\`gate1_check.js\`)과 같음`, '',
  '### 관문 1', '',
  '| 지표 | 게임 | 시뮬레이터 |', '| --- | ---: | ---: |',
  `| 첫해 월 운영 순이익 | ${G(stat(per.net).mean)} | ${G(sNet / N)} |`,
  `| 의뢰 성공률 | ${(done / (done + fail) * 100).toFixed(1)}% | ${(sD / (sD + sF) * 100).toFixed(1)}% |`, '',
  '### 첫해 지표 (게임 규칙, 판별 분포)', '',
  '| 지표 | 평균 | 하위 10% | 중앙값 | 상위 10% | 최소 ~ 최대 |', '| --- | ---: | ---: | ---: | ---: | ---: |',
  row('월 운영 순이익', stat(per.net), G),
  row('시작 배치 직후 금고 (0주)', stat(per.start), G),
  row('현금 저점 (1~48주 주말 금고 최저)', stat(per.low), G),
  row('현금 저점이 온 주', stat(per.lowWeek), W),
  row('연말 금고 (48주)', stat(per.end), G),
  row('적자 달 수 (12달 중)', stat(per.neg), v => (Math.round(v * 10) / 10) + '달'),
  row('1년 뒤 모험가', stat(per.advs), v => (Math.round(v * 10) / 10) + '명'),
  row('1년 뒤 명성', stat(per.fame), v => String(Math.round(v))), '',
  '| 진행 | 중앙값 | 48주 안 |', '| --- | ---: | ---: |',
  `| 메인 퀘스트(침공) 등장 | ${W(stat(per.offer).med)} | ${offerIn}판 |`,
  `| 침공 승리 = E급 승급 | ${W(stat(per.clear).med)} | ${clearIn}판 |`, '',
  `의뢰를 1건도 하지 않은 판: **${idle.length}판** (시드 ${idle.join(', ') || '없음'})`, '',
  '### 한 달 평균 장부 (게임 규칙, 전체 ' + months + '달 평균) — 운영 순이익 = 건설 · 업그레이드를 뺀 나머지 합', '',
  '| 항목 | 키 | 한 달 평균 |', '| --- | --- | ---: |',
  ...[['의뢰 수수료', 'fee'], ['소재 자동 차익', 'resale'], ['식당', 'meal'], ['주점', 'tavern'], ['왕국 보조금', 'subsidy'], ['리퀘스트 수입', 'reqIn'], ['유지비', 'upkeep'], ['섭외비', 'scout'], ['침공 정비 물약', 'prep'], ['건설 · 업그레이드', 'build'], ['기타', 'other']]
    .map(([n, k]) => `| ${n} | \`${k}\` | ${G(cat[k] / months)} |`)
].join('\n');
console.log(md);
const i = process.argv.indexOf('--md'); if (i > 0 && process.argv[i + 1]) fs.writeFileSync(process.argv[i + 1], md + '\n');
