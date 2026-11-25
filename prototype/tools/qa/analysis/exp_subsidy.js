// 18 승산 훑기 덧붙임 (2026-11-25 19:19) — 왕국 보조금 비율 econ.subsidyRate 0.5(지금) · 0.1.  node exp_subsidy.js [판 수] [결과 파일]
// 바탕: exp_odds.js 와 같음 (1차 조건 4 + 세기 qMul · 요리 dishK). 규칙은 exp_buy.js 의 메모리 패치를 그대로 씀(게임 파일은 그대로). 보조금 비율은 그 판의 cfg.econ 만 바꿈.
const { BUY0 } = require('./exp_buy.js');
const { play, avg, med, Gm } = require('./harness.js');
const N = +process.argv[2] || 100, W = 48, OUT = process.argv[3];
const V0 = Gm.DISH.map(d => d.val);
const run = (b, dk, sr) => { Gm.DISH.forEach((d, i) => { d.val = V0[i] * (dk || 1); }); const R = []; for (let i = 0; i < N; i++) R.push(play(7000 + i, W, { keepState: true, cfg: c => { c.econ.subsidyRate = sr; if (b) c.buy = Object.assign(JSON.parse(JSON.stringify(BUY0)), b); } })); Gm.DISH.forEach((d, i) => { d.val = V0[i]; }); return R; };
const C4 = q => ({ on: true, split: true, cookOrder: true, qMul: q });
const CELLS = [['c0', '지금 규칙 (참고)', null, 1], ['q100d1', '조건 4 · 세기 ×1 · 요리 +3', C4(1), 1], ['q150d3', '조건 4 · 세기 ×1.5 · 요리 +9', C4(1.5), 3], ['q175d2', '조건 4 · 세기 ×1.75 · 요리 +6', C4(1.75), 2]];
const SR = [0.5, 0.1];
const pm = (a, b) => { const d = a.map((x, i) => x - b[i]), m = avg(d), sd = Math.sqrt(d.reduce((t, v) => t + (v - m) ** 2, 0) / (d.length - 1)); return `${m >= 0 ? '+' : ''}${m.toFixed(0)} ± ${(1.96 * sd / Math.sqrt(d.length)).toFixed(0)}`; };
const out = [], P = s => out.push(s); const res = {};
P(`18 승산 훑기 덧붙임 — 왕국 보조금 비율 (${N}판 · 48주 · 시드 7000~${7000 + N - 1} · 같은 시드 짝 비교 · ± 95%) — 규칙은 측정 도구 안에서만 흉내 냄`);
P(`보조금 = 4주마다 그동안 성공한 외부 의뢰의 기본 보상(q.reward, ×2 · 보상 나누기 배수 전) 합 × subsidyRate (game_core.js 1578). 금고 「0 가까이」 = 48주 중 한 번이라도 주말 금고가 그 값 이하`);
for (const [k, , b, dk] of CELLS) for (const sr of SR) { const t0 = Date.now(); res[k + '_' + sr] = run(b, dk, sr); console.error(k, sr, ((Date.now() - t0) / 1000).toFixed(0) + 's'); }
for (const [k, lab] of CELLS) for (const sr of SR) {
  const R = res[k + '_' + sr], R5 = res[k + '_0.5']; P(`\n==== ${lab} · 보조금 비율 ${sr} ====`);
  const net = R.map(m => avg(m.hist.map(h => h.net))); P(`  월 순수입 ${avg(net).toFixed(0)}G${sr !== 0.5 ? ` (같은 칸 비율 0.5 대비 ${pm(net, R5.map(m => avg(m.hist.map(h => h.net))))})` : ''} · 한 달 보조금 ${avg(R.map(m => avg(m.hist.map(h => h.subsidy || 0)))).toFixed(0)}G`);
  for (const [l, a, b2, w] of [['1~12주', 0, 3, 12], ['13~24주', 3, 6, 24], ['25~36주', 6, 9, 36], ['37~48주', 9, 12, 48]]) {
    const f = g => avg(R.map(m => avg(m.hist.slice(a, b2).map(g)))), gd = R.map(m => (m.wk.find(x => x.w === w) || {}).gold || 0);
    P(`  [${l}] 한 달: 수수료 ${f(h => h.fee || 0).toFixed(0)} · 보조금 ${f(h => h.subsidy || 0).toFixed(0)} · 식사 ${f(h => h.meal || 0).toFixed(0)} · 순수입 ${f(h => h.net || 0).toFixed(0)}G | ${w}주 금고 평균 ${avg(gd).toFixed(0)}G (중앙 ${med(gd)} · 가장 낮은 판 ${Math.min(...gd)}G)`); }
  const lo = R.map(m => Math.min(...m.wk.map(x => x.gold))), lw = R.map(m => { const x = m.wk.reduce((b3, y) => y.gold < b3.gold ? y : b3, m.wk[0]); return x.w; });
  P(`  48주 중 가장 낮았던 주말 금고: 평균 ${avg(lo).toFixed(0)}G (중앙 ${med(lo)}G) · 그 주 중앙 ${med(lw)}주 | 0 이하 ${(100 * lo.filter(v => v <= 0).length / N).toFixed(0)}% · 50G 이하 ${(100 * lo.filter(v => v <= 50).length / N).toFixed(0)}% · 100G 이하 ${(100 * lo.filter(v => v <= 100).length / N).toFixed(0)}% 의 판`);
  { const lo2 = R.map(m => Math.min(...m.wk.filter(x => x.w > 12).map(x => x.gold)));
    P(`  13주 뒤만 보면 가장 낮았던 주말 금고: 평균 ${avg(lo2).toFixed(0)}G (중앙 ${med(lo2)}G) | 0 이하 ${(100 * lo2.filter(v => v <= 0).length / N).toFixed(0)}% · 50G 이하 ${(100 * lo2.filter(v => v <= 50).length / N).toFixed(0)}% · 100G 이하 ${(100 * lo2.filter(v => v <= 100).length / N).toFixed(0)}% · 200G 이하 ${(100 * lo2.filter(v => v <= 200).length / N).toFixed(0)}% 의 판`); }
  const tb = R.map(m => (m.end.deco || []).filter(x => x === 'table').length), dc = R.map(m => (m.end.deco || []).filter(x => x !== 'table').length);
  const bl = {}; for (const m of R) for (const f of m.end.built || []) bl[f] = (bl[f] || 0) + 1; const up = {}; for (const m of R) for (const f of m.end.up || []) up[f] = (up[f] || 0) + 1;
  P(`  48주에 놓인 테이블 세트 평균 ${avg(tb).toFixed(2)} (2세트 ${(100 * tb.filter(x => x === 2).length / N).toFixed(0)}% · 3세트 ${(100 * tb.filter(x => x === 3).length / N).toFixed(0)}% · 4세트 ${(100 * tb.filter(x => x >= 4).length / N).toFixed(0)}%) · 장식 ${avg(dc).toFixed(2)}개`);
  P(`  지어진 시설 (판의 %): ${Object.keys(bl).map(f => `${f} ${(100 * bl[f] / N).toFixed(0)}%`).join(' · ')} | 업그레이드: ${Object.keys(up).length ? Object.keys(up).map(f => `${f} ${(100 * up[f] / N).toFixed(0)}%`).join(' · ') : '없음'}`);
  P(`  대장간 · 물약 상점(리퀘스트 기부로 열림): ${(100 * R.filter(m => m.g.townUnlock && m.g.townUnlock.smith).length / N).toFixed(0)}% · ${(100 * R.filter(m => m.g.townUnlock && m.g.townUnlock.potion).length / N).toFixed(0)}% | 리퀘스트 완료 ${avg(R.map(m => m.end.reqDone)).toFixed(1)}개`);
  const gE = R.map(m => m.first.gE || 999), dn = avg(R.map(m => m.stats.done)), fl = avg(R.map(m => m.stats.fail));
  P(`  길드 E급: 중앙 ${med(gE) >= 999 ? '48주 안 못 닿음' : med(gE) + '주'} · 48주 안 ${(100 * gE.filter(v => v <= 48).length / N).toFixed(0)}% | 성공률 ${(100 * dn / (dn + fl)).toFixed(1)}% · 성공한 원정 ${dn.toFixed(1)}건`);
}
const txt = out.join('\n'); console.log(txt); if (OUT) require('fs').writeFileSync(OUT, txt + '\n');
