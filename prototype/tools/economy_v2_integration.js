// 경제 개편 V2 8단계 E8-2 · E8-3: 통합 측정 (2026-11-18). 실행: node prototype/tools/economy_v2_integration.js
// ① 첫해 100판 × 48주 (지금 기본값 · 탐색 포인트 3~4곳 비교)  ② 100판 × 96주 계약 정책 4가지 (정원 contract.slots — F급 1명 [임시])
// 자동 플레이 = 관문 1과 같음 (autoRequests · stepWeek · autoCook · 4주마다 autoPlace). 발주 · 수수료 조정은 자동 플레이가 하지 않음
const fs = require('fs'), vm = require('vm'), JS = require('path').join(__dirname, '..', 'js');
const ctx = { console, Math, JSON, Date }; ctx.window = ctx; vm.createContext(ctx);
for (const f of ['data_gen.js', 'combat.js', 'sim_engine.js', 'game_core.js']) vm.runInContext(fs.readFileSync(JS + '/' + f, 'utf8'), ctx);
const Sim = ctx.GuildSim, Gm = ctx.GuildGame, N = +(process.env.N || 100);
const P = (a, q = 0.5) => { a = a.slice().sort((x, y) => x - y); return a[Math.floor((a.length - 1) * q)]; };
const avg = a => a.reduce((x, y) => x + y, 0) / (a.length || 1);

// 자동 계약: terms(조건) · max(최대 몇 명). 월 기준액 큰 후보부터 제안, 거절이면 보수를 5G씩 올림(60G까지), 끝나기 1주 전 같은 조건으로 갱신
function autoContract(g, max, T) {
  if (!max || !Gm.contractOpen(g)) return;
  for (const a of g.advs) { const c = a.contract; if (a.alive && c && !c.next && g.week >= c.end - 1) for (let p = c.pay; p <= 60; p += 5) if (Gm.contractPropose(g, a.id, { weeks: 12, rate: c.rate, pay: p, sup: c.sup }).ok) break; }
  let have = g.advs.filter(a => a.alive && a.contract).length;
  const al = g.advs.filter(a => a.alive && !a.contract && !Gm.contractWhy(g, a)).sort((x, y) => Gm.earnMonthly(g, y) - Gm.earnMonthly(g, x));
  for (const a of al) { if (have >= max) break; for (let p = T.pay; p <= 60; p += 5) if (Gm.contractPropose(g, a.id, Object.assign({}, T, { pay: p })).ok) { have++; break; } }
}

function play(seed, W, cfgFn, cMax, cTerms) {
  const c = Sim.defaults(); if (cfgFn) cfgFn(c);
  const g = Gm.newGame(c, seed); Gm.autoPlace(g, true);
  const r = { low: 1e9, e: null, d: null, gear24: 0, cMaxN: 0, cWeeks: 0 };
  for (let w = 0; w < W; w++) {
    Gm.autoRequests(g); Gm.stepWeek(g); Gm.autoCook(g); if (g.week % Gm.WPM === 0) Gm.autoPlace(g, false);
    autoContract(g, cMax, cTerms);
    if (g.week >= 2) r.low = Math.min(r.low, g.gold);
    if (r.e == null && g.grade >= 1) r.e = g.week; if (r.d == null && g.grade >= 2) r.d = g.week;
    const al = g.advs.filter(a => a.alive), cn = al.filter(a => a.contract).length; r.cMaxN = Math.max(r.cMaxN, cn); r.cWeeks += cn;
    if (g.week === 24) r.gear24 = al.filter(a => a.gear >= 0).length / (al.length || 1);
  }
  const al = g.advs.filter(a => a.alive), H = g.history;
  Object.assign(r, { g, H, gold: g.gold, done: g.stats.done, fail: g.stats.fail, gear: al.filter(a => a.gear >= 0).length / (al.length || 1), wallet: avg(al.map(a => a.wallet || 0)), advN: al.length,
    net1: avg(H.slice(0, 12).map(m => m.net)), net2: H.length > 12 ? avg(H.slice(12, 24).map(m => m.net)) : null, neg: H.filter(m => m.net < 0).length,
    matBuy: avg(H.slice(0, 12).map(m => -(m.matBuy || 0))), sub: avg(H.slice(0, 12).map(m => m.subsidy || 0)), cpay: avg(H.map(m => -(m.cpay || 0) - (m.csup || 0))) });
  return r;
}
function batch(W, cfgFn, cMax, cTerms) { const R = []; for (let i = 0; i < N; i++) R.push(play(7000 + i, W, cfgFn, cMax, cTerms)); return R; }
const fmt = x => Math.round(x).toLocaleString('en-US');

console.log(`# 경제 V2 통합 측정 (${N}판, 시드 7000~${7000 + N - 1})\n`);
console.log('## ① 첫해 48주\n');
console.log('| 안 | 월 순이익 | 성공률 | 금고 최저점 중앙 · 하위10% | 적자 달 (전체) | 48주 안 E 승급 · 중앙 | 48주 금고 중앙 | 장비 보유 24 · 48주 | 모험가 지갑 평균 | 매입 / 보조금 (월) |');
console.log('| --- | ---: | ---: | --- | ---: | --- | ---: | --- | ---: | --- |');
for (const [name, fn] of [['지금 (포인트 2~3곳)', null], ['탐색 포인트 3~4곳', c => { c.econ.drawPts = [3, 4]; }]]) {
  const R = batch(48, fn, 0), ew = R.map(r => r.e == null ? 999 : r.e), me = P(ew), d = R.reduce((t, r) => t + r.done, 0), f = R.reduce((t, r) => t + r.fail, 0);
  console.log(`| ${name} | ${fmt(avg(R.map(r => r.net1)))}G | ${(100 * d / (d + f)).toFixed(1)}% | ${fmt(P(R.map(r => r.low)))}G · ${fmt(P(R.map(r => r.low), 0.1))}G | ${R.reduce((t, r) => t + r.neg, 0)} | ${ew.filter(x => x <= 48).length}판 · ${me > 48 ? '48+' : me + '주'} | ${fmt(P(R.map(r => r.gold)))}G | ${(100 * avg(R.map(r => r.gear24))).toFixed(0)}% · ${(100 * avg(R.map(r => r.gear))).toFixed(0)}% | ${fmt(avg(R.map(r => r.wallet)))}G | ${fmt(avg(R.map(r => r.matBuy)))} / ${fmt(avg(R.map(r => r.sub)))}G |`);
}
console.log('\n## ② 96주 · 계약 정책\n');
console.log('| 안 | 1년차 · 2년차 월 순이익 | 성공률 | 적자 달 | E 승급 96주 안 · 중앙 | D 승급 96주 안 | 96주 금고 중앙 | 계약 인원 최대 평균 · 계약 주 평균 | 계약 지출 (월) | 모험가 수 |');
console.log('| --- | --- | ---: | ---: | --- | ---: | ---: | --- | ---: | ---: |');
const DF = { weeks: 12, rate: 0.2, pay: 25, sup: 10 };
for (const [name, max, T] of [['계약 0명', 0, DF], ['계약 정원까지 · 기본 조건 (20% · 25G · 지원 10)', 99, DF], ['정원까지 · 고수수료 저지원 (30% · 지원 0)', 99, { weeks: 12, rate: 0.3, pay: 25, sup: 0 }], ['정원까지 · 저수수료 고지원 (15% · 지원 30)', 99, { weeks: 12, rate: 0.15, pay: 25, sup: 30 }]]) {
  const R = batch(96, null, max, T), ew = R.map(r => r.e == null ? 999 : r.e), me = P(ew), d = R.reduce((t, r) => t + r.done, 0), f = R.reduce((t, r) => t + r.fail, 0);
  console.log(`| ${name} | ${fmt(avg(R.map(r => r.net1)))} · ${fmt(avg(R.map(r => r.net2)))}G | ${(100 * d / (d + f)).toFixed(1)}% | ${R.reduce((t, r) => t + r.neg, 0)} | ${ew.filter(x => x <= 96).length}판 · ${me > 96 ? '96+' : me + '주'} | ${R.filter(r => r.d != null).length}판 | ${fmt(P(R.map(r => r.gold)))}G | ${avg(R.map(r => r.cMaxN)).toFixed(1)}명 · ${avg(R.map(r => r.cWeeks)).toFixed(0)}주 | ${fmt(avg(R.map(r => r.cpay)))}G | ${avg(R.map(r => r.advN)).toFixed(1)} |`);
}
