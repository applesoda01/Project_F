// 관문 1 검증 (명령줄판): 게임 규칙을 100판씩 1년 돌려 옛 기준과 견준다. 깃허브 자동 검사에서도 쓴다.
// 2026-11-27 「시간과 미니뷰」 9-1: 참고용으로 내림. 판정은 씨앗 고정 검사(seed_check.js)가 맡고,
// 기준(월 300~600G · 성공률 80~95%)은 옛 경제의 것이라 벗어나도 종료 코드 0. 새 기준은 바닥 공사 뒤에 다시 정함.
// 시뮬레이터 쪽(sim_engine.js의 규칙)은 --with-sim 을 줄 때만 돌린다 (시뮬레이터 규칙은 더 맞추지 않음).
//   node prototype/tools/gate1_check.js              → 게임 쪽만, 표 출력 (항상 종료 코드 0)
//   node prototype/tools/gate1_check.js --with-sim   → 시뮬레이터 쪽도 돌려 함께 보임
//   node prototype/tools/gate1_check.js --md out     → 결과를 마크다운 파일로도 저장
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const JS = path.join(__dirname, '..', 'js');
const ctx = { console, Math, JSON, Date }; ctx.window = ctx; vm.createContext(ctx);
for (const f of ['data_gen.js', 'combat.js', 'sim_engine.js', 'game_core.js']) vm.runInContext(fs.readFileSync(path.join(JS, f), 'utf8'), ctx, { filename: f });
const Sim = ctx.GuildSim, Gm = ctx.GuildGame, N = 100;

let op = 0, d = 0, f = 0, cf = 0, mgS = 0, mgLo = 1e9;   // cf: 첫 3달(12주) 금고 변화 · 월 평균(건설 포함) · mg: 금고 최저 (2026-11-23 개선 분석 1, 참고 지표)
for (let i = 0; i < N; i++) { const g = Gm.newGame(Sim.defaults(), 7000 + i); Gm.autoPlace(g, true); /* 테이블: 첫 주 2세트, 이후 월말 여유 있으면 1세트씩 (시뮬레이터와 같음, 2026-11-12) */ const g0 = g.gold; let mg = g.gold; for (let w = 0; w < 48; w++) { Gm.autoRequests(g); /* 리퀘스트 자동 처리 (2026-11-16, 시뮬레이터 reqStep과 같은 규칙) */ Gm.stepWeek(g); Gm.autoCook(g); /* 요리: 재료가 모이면 바로 만든다고 가정 (시뮬레이터와 같음) */ if (g.week % Gm.WPM === 0) Gm.autoPlace(g, false); mg = Math.min(mg, g.gold); if (w === 11) cf += (g.gold - g0) / 3; } mgS += mg; mgLo = Math.min(mgLo, mg); op += g.history.reduce((t, m) => t + m.net, 0) / g.history.length; d += g.stats.done; f += g.stats.fail; }
const withSim = process.argv.includes('--with-sim');
const cfg = Sim.defaults(); cfg.run.maxYears = 1; let o2 = 0, d2 = 0, f2 = 0;
if (withSim) for (let i = 0; i < N; i++) { const r = Sim.simulate(cfg, 'balanced', 7000 + i); o2 += r.firstNetF.reduce((a, c) => a + c, 0) / r.firstNetF.length; d2 += r.qDone; f2 += r.qFail; }
const gOp = op / N, sOp = o2 / N, gS = d / (d + f), sS = d2 / (d2 + f2);
const okOp = gOp >= 300 && gOp <= 600 && (!withSim || Math.abs(gOp - sOp) / sOp < 0.1), okS = gS >= 0.80 && gS <= 0.95 && (!withSim || Math.abs(gS - sS) < 0.05);

const mark = ok => ok ? '기준 안' : '기준 밖';   // 판정이 아니라 참고 (2026-11-27)
const simV = v => withSim ? v : '—';
const md = [
  '### 관문 1 (참고 · 첫해, 100판)', '',
  '> 판정은 씨앗 고정 검사(`seed_check.js`)가 합니다. 아래 기준은 옛 경제의 것이라 벗어나도 실패로 치지 않습니다. 새 기준은 바닥 공사 뒤에 다시 정합니다.' + (withSim ? '' : ' 시뮬레이터 쪽은 `--with-sim`을 줄 때만 돌립니다.'), '',
  '| 지표 | 게임 | 시뮬레이터 | 옛 기준 | 참고 |', '| --- | ---: | ---: | --- | --- |',
  `| 첫해 월 운영 순이익 | ${Math.round(gOp)}G | ${simV(Math.round(sOp) + 'G')} | 300~600G${withSim ? ', 차이 10% 미만' : ''} | ${mark(okOp)} |`,
  `| 의뢰 성공률 | ${(gS * 100).toFixed(1)}% | ${simV((sS * 100).toFixed(1) + '%')} | 80~95%${withSim ? ', 차이 5%p 미만' : ''} | ${mark(okS)} |`,
  `| (참고) 첫 3달 금고 변화 · 건설 포함 | 월 ${Math.round(cf / N)}G | — | 기준 없음 [임시] | 참고 |`,
  `| (참고) 첫해 금고 최저 | 평균 ${Math.round(mgS / N)}G · 가장 낮은 판 ${Math.round(mgLo)}G | — | 기준 없음 [임시] | 참고 |`,
  '', '기준값 (2026-10 데이터 분리 시점): 436G · 75.9% / 2026-11 전투 도입: 게임 459G · 93.2%, 시뮬레이터 454G · 92.0%'
].join('\n');
console.log(md);
const i = process.argv.indexOf('--md'); if (i > 0 && process.argv[i + 1]) fs.writeFileSync(process.argv[i + 1], md + '\n');
process.exit(0);   // 참고용 — 기준을 벗어나도 0 (2026-11-27)
