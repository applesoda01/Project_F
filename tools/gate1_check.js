// 관문 1 검증 (명령줄판): 게임 규칙과 시뮬레이터를 각각 100판씩 1년 돌려 비교한다.
// 게임 안 개발 패널의 "관문 1 검증"과 같은 계산. 깃허브 자동 검사에서도 쓴다.
//   node tools/gate1_check.js            → 표 출력, 기준을 벗어나면 종료 코드 1
//   node tools/gate1_check.js --md out   → 결과를 마크다운 파일로도 저장
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const JS = path.join(__dirname, '..', 'prototype', 'js');
const ctx = { console, Math, JSON, Date }; ctx.window = ctx; vm.createContext(ctx);
for (const f of ['data_gen.js', 'sim_engine.js', 'game_core.js']) vm.runInContext(fs.readFileSync(path.join(JS, f), 'utf8'), ctx, { filename: f });
const Sim = ctx.GuildSim, Gm = ctx.GuildGame, N = 100;

let op = 0, d = 0, f = 0;
for (let i = 0; i < N; i++) { const g = Gm.newGame(Sim.defaults(), 7000 + i); for (let w = 0; w < 48; w++) Gm.stepWeek(g); op += g.history.reduce((t, m) => t + m.net, 0) / g.history.length; d += g.stats.done; f += g.stats.fail; }
const cfg = Sim.defaults(); cfg.run.maxYears = 1; let o2 = 0, d2 = 0, f2 = 0;
for (let i = 0; i < N; i++) { const r = Sim.simulate(cfg, 'balanced', 7000 + i); o2 += r.firstNetF.reduce((a, c) => a + c, 0) / r.firstNetF.length; d2 += r.qDone; f2 += r.qFail; }
const gOp = op / N, sOp = o2 / N, gS = d / (d + f), sS = d2 / (d2 + f2);
const okOp = gOp >= 300 && gOp <= 600 && Math.abs(gOp - sOp) / sOp < 0.1, okS = gS >= 0.65 && gS <= 0.85 && Math.abs(gS - sS) < 0.05;

const mark = ok => ok ? '✅ 통과' : '⚠️ 확인 필요';
const md = [
  '### 관문 1 검증 (첫해, 100판)', '',
  '| 지표 | 게임 | 시뮬레이터 | 기준 | 판정 |', '| --- | ---: | ---: | --- | --- |',
  `| 첫해 월 운영 순이익 | ${Math.round(gOp)}G | ${Math.round(sOp)}G | 300~600G, 차이 10% 미만 | ${mark(okOp)} |`,
  `| 의뢰 성공률 | ${(gS * 100).toFixed(1)}% | ${(sS * 100).toFixed(1)}% | 65~85%, 차이 5%p 미만 | ${mark(okS)} |`,
  '', '기준값 (2026-10 데이터 분리 시점): 436G · 75.9%'
].join('\n');
console.log(md);
const i = process.argv.indexOf('--md'); if (i > 0 && process.argv[i + 1]) fs.writeFileSync(process.argv[i + 1], md + '\n');
process.exit(okOp && okS ? 0 : 1);
