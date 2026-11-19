// V4 1단계 측정 (2026-11-19): 식당 재료 소모 · 메뉴 가격 · 잡화 양념 · 상시 발주 · 수수료 5% (결정 37~42)
// 실행: node prototype/tools/market_v4_measure.js   (N=100 기본, 환경 변수 N으로 판 수)
// 자동 플레이 = 관문 1과 같음 (autoRequests · stepWeek · autoCook(+autoOrders) · 4주마다 autoPlace). OFF=1 이면 V4 규칙을 끈 예전 결과
'use strict';
const fs = require('fs'), vm = require('vm'), JS = require('path').join(__dirname, '..', 'js');
const ctx = { console, Math, JSON, Date }; ctx.window = ctx; vm.createContext(ctx);
for (const f of ['data_gen.js', 'combat.js', 'sim_engine.js', 'game_core.js']) vm.runInContext(fs.readFileSync(JS + '/' + f, 'utf8'), ctx);
const Sim = ctx.GuildSim, Gm = ctx.GuildGame, N = +(process.env.N || 100), W = 48;
const P = (a, q = 0.5) => { a = a.slice().sort((x, y) => x - y); return a[Math.floor((a.length - 1) * q)]; };
const avg = a => a.reduce((x, y) => x + y, 0) / (a.length || 1);

function play(seed, tweak) {
  const c = Sim.defaults(); if (process.env.OFF) { c.econ.mealCook = 0; c.econ.orderMode = 0; } if (tweak) tweak(c);
  const g = Gm.newGame(c, seed); Gm.autoPlace(g, true);
  const r = { low: 1e9, e: null, soldOutW: 0, shortW: 0, menuW: 0 };
  for (let w = 0; w < W; w++) {
    Gm.autoRequests(g); Gm.stepWeek(g); Gm.autoCook(g); if (g.week % Gm.WPM === 0) Gm.autoPlace(g, false);
    if (g.week >= 2) r.low = Math.min(r.low, g.gold);
    if (r.e == null && g.grade >= 1) r.e = g.week;
    if (c.econ.popOn) for (const m in (g.res || {})) { const b = Gm.resBand(g, m); r.rb = r.rb || [0, 0, 0]; if (b != null) r.rb[b]++; }   // 개체수: 적음 / 보통 / 많음 (자원지 × 주)
    if (c.econ.mktOn) for (const id in (g.knownMats || {})) { const x = Gm.mktMult(g, id); r.mk = r.mk || [0, 0, 0, 0]; r.mk[x <= 0.55 ? 0 : x < 0.7 ? 1 : x <= 1.4 ? 2 : 3]++; }   // 시세 분포: 바닥 · 낮음 · 보통(0.7~1.4) · 높음
    for (const d of Gm.DISH) if (g.dishes[d.name]) { r.menuW++; if (c.econ.mealCook && Gm.stockOf(g, d) <= 0) { if ((g.kShort || {})[d.name]) r.shortW++; else r.soldOutW++; } }   // 품절: 다 팔림 / 재료 · 금고 부족으로 못 만듦
  }
  const H = g.history, al = g.advs.filter(a => a.alive), S = k => avg(H.map(m => m[k] || 0));
  return { gold: g.gold, low: r.low, e: r.e, done: g.stats.done, fail: g.stats.fail, net: avg(H.map(m => m.net)), meal: S('meal'), shop: -S('shop'), order: -S('order'), matBuy: -S('matBuy'),
    cooked: S('cooked'), waste: S('waste'), soldOutRate: r.menuW ? r.soldOutW / r.menuW : 0, shortRate: r.menuW ? r.shortW / r.menuW : 0, orderGot: (g.orders || []).reduce((a, o) => a + (o.got || 0), 0),
    mk: r.mk || [0, 0, 0, 0], rb: r.rb || [0, 0, 0], harm: H.reduce((a, m) => a + (m.resHarm || 0), 0), wallet: avg(al.map(a => a.wallet || 0)), gear: al.filter(a => (a.eq || []).some(x => x >= 0)).length / (al.length || 1), neg: H.filter(m => m.net < 0).length };
}
function batch(tweak) { const R = []; for (let i = 0; i < N; i++) R.push(play(7000 + i, tweak)); return R; }
function line(name, R) {
  const done = R.reduce((a, r) => a + r.done, 0), fail = R.reduce((a, r) => a + r.fail, 0), F = k => avg(R.map(r => r[k]));
  const MK = [0, 1, 2, 3].map(i => R.reduce((a, r) => a + r.mk[i], 0)), MT = MK.reduce((a, b) => a + b, 0) || 1;
  const RB = [0, 1, 2].map(i => R.reduce((a, r) => a + r.rb[i], 0)), RT = RB.reduce((a, b) => a + b, 0) || 1;
  return `| ${name} | ${MK.map(v => Math.round(v / MT * 100)).join(' / ')}% | ${RB.map(v => Math.round(v / RT * 100)).join(' / ')}% · 피해 ${Math.round(avg(R.map(r => r.harm)))}달 | ${Math.round(F('net'))}G | ${(done / (done + fail) * 100).toFixed(1)}% | ${Math.round(P(R.map(r => r.gold)))}G | ${Math.round(P(R.map(r => r.low)))}G | ${R.filter(r => r.e != null).length}판 | ${Math.round(F('meal'))} | ${Math.round(F('matBuy'))} / ${Math.round(F('order'))} / ${Math.round(F('shop'))} | ${F('cooked').toFixed(1)} / ${F('waste').toFixed(1)} | ${(F('soldOutRate') * 100).toFixed(0)}% / ${(F('shortRate') * 100).toFixed(0)}% | ${Math.round(F('orderGot'))} | ${Math.round(F('wallet'))}G · ${(F('gear') * 100).toFixed(0)}% |`;
}
const head = '| 안 | 시세 분포 (≤0.55 / ~0.7 / 0.7~1.4 / >1.4) | 개체수 적음 / 보통 / 많음 · 피해 | 월 순이익 | 성공률 | 48주 금고 중앙 | 금고 최저 중앙 | 48주 안 E 승급 | 식사 매출/월 | 매입 / 발주 / 잡화 (월) | 만든 / 버린 그릇 (월) | 품절 주: 다 팔림 / 재료 부족 | 발주로 들어온 소재(판당) | 지갑 · 장비 |\n| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | ---: | ---: | --- |';
const cases = (process.env.CASES || 'base').split(',');
const T = {
  base: null,
  prep2: c => { c.econ.mealPrep = 2; },
  prep6: c => { c.econ.mealPrep = 6; },
  nomkt: c => { c.econ.mktOn = 0; },
  nopop: c => { c.econ.popOn = 0; },
};
console.log(head);
for (const k of cases) console.log(line(k + (process.env.OFF ? ' (V4 끔)' : ''), batch(T[k])));
