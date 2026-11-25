// 18 승산 훑기 (2026-11-25) — 퀘스트의 세기 × 요리의 효과.  node exp_odds.js [판 수] [칸들 예: q1d1,q130d2] [결과 파일]
// 바탕: 1차 측정(exp_buy.js)의 조건 4 = 사는 판단 + 보상 나누기 + 주문할 때 만드는 식당. 규칙은 exp_buy.js 의 메모리 패치를 그대로 씀(게임 파일은 그대로).
// 손잡이: cfg.buy.qMul(게시판 퀘스트의 판정 기준치 · 적 체력 · 공격력 배수) · dishK(길드 요리 효과 배수, Gm.DISH 의 val 에 곱함).
// 결과: results/28_승산_훑기.txt · 정리: docs/design/현황/18_승산_훑기.md
const { BUY0 } = require('./exp_buy.js');   // __PF_PATCH 를 걸고 손잡이 기본값만 받아 옴 (exp_buy 의 측정은 돌지 않음)
const { play, avg, med, Gm } = require('./harness.js');
const N = +process.argv[2] || 30, W = 48, ONLY = process.argv[3] ? process.argv[3].split(',') : null, OUT = process.argv[4];
const QM = [1, 1.15, 1.3, 1.5, 1.75], DK = [1, 2, 3];
const key = (q, d) => `q${Math.round(q * 100)}d${d}`;
const V0 = Gm.DISH.map(d => d.val);
const run = (b, dk) => { Gm.DISH.forEach((d, i) => { d.val = V0[i] * (dk || 1); }); const R = []; for (let i = 0; i < N; i++) R.push(play(7000 + i, W, { keepState: true, snap: [12, 24, 36, 48], cfg: c => { if (b) c.buy = Object.assign(JSON.parse(JSON.stringify(BUY0)), b); } })); Gm.DISH.forEach((d, i) => { d.val = V0[i]; }); return R; };
const pm = (a, b) => { const d = a.map((x, i) => x - b[i]), m = avg(d), sd = Math.sqrt(d.reduce((t, v) => t + (v - m) ** 2, 0) / (d.length - 1)); return { m, ci: 1.96 * sd / Math.sqrt(d.length) }; };
const fD = (o, k) => `${o.m >= 0 ? '+' : ''}${o.m.toFixed(k || 0)} ± ${o.ci.toFixed(k || 0)}`;
const net = R => R.map(m => avg(m.hist.map(h => h.net)));
const WHY = { need: '필요 없음', earn: '벌이가 적음', saving: '모으는 중', wallet: '지갑이 빔', tight: '빠듯해서 아낌', dear: '비쌈', nodish: '맞는 요리 없음', soldout: '품절', seat: '자리 없음', money: '주머니에 안 맞음' };
const IDLE = { mates: '같이 갈 사람 없음(동료 기다림)', noq: '맞는 의뢰 없음', fee: '수수료 고민', rest: '휴식', req: '리퀘스트 대기', sleep: '늦잠', rain: '비 와서 쉼', '?': '까닭 없음' };
const Z = () => ({ g: 0, inn: 0, innG: 0, no: 0, why: {}, gwhy: {}, potN: 0, potG: 0, prepN: 0, prepG: 0, bigN: 0, bigG: 0, band: [0, 0, 0], tband: [0, 0, 0], need: [0, 0, 0], eatN: 0, upN: 0, eatB: [0, 0, 0], upB: [0, 0, 0], w0G: 0, w0B: 0, gqN: 0, gqRw: 0, gqRwG: 0 });
const sumB = (m, qs) => { const o = Z(); for (const q of qs) { const b = (m.g.bstat || [])[q]; if (!b) continue; for (const k in o) { if (Array.isArray(o[k])) o[k] = o[k].map((v, i) => v + ((b[k] || [])[i] || 0)); else if (typeof o[k] === 'object') { for (const x in (b[k] || {})) o[k][x] = (o[k][x] || 0) + b[k][x]; } else o[k] += b[k] || 0; } } return o; };
const out = [], P = s => out.push(s);
const cells = [['c0', '지금 규칙 (참고)', null, 1]]; for (const q of QM) for (const d of DK) cells.push([key(q, d), `세기 ×${q} · 요리 +${3 * d}`, { on: true, split: true, cookOrder: true, qMul: q }, d]);
const res = {};
for (const [k, , b, d] of cells) { if (ONLY && !ONLY.includes(k) && k !== 'c0' && k !== 'q100d1') continue; const t0 = Date.now(); res[k] = run(b, d); console.error(k, ((Date.now() - t0) / 1000).toFixed(0) + 's'); }
const c0 = res.c0, b1 = res.q100d1;
P(`18 승산 훑기 (${N}판 · 48주 · 시드 7000~${7000 + N - 1} · 같은 시드 짝 비교 · ± 95%) — 바탕: 1차 조건 4 (사는 판단 + 보상 나누기 + 주문할 때 만드는 식당). 규칙은 측정 도구 안에서만 흉내 냄`);
P(`세기 = 게시판 퀘스트(무작위 틀)의 판정 기준치 · 적 체력 · 공격력 배수. 요리 = 길드 요리 효과 (F급 +3 기준, 모든 요리 val × 배수). 여관 +1 그대로`);
const pct = (a, t) => t ? (100 * a / t).toFixed(0) + '%' : '—';
// 한눈에 표
P('\n[한눈에] 48주 합 — 준비 없이 본 승산 여유 · 팽팽 · 위험 | 먹어서 한 단계 오름 | 성공률 | 성공한 원정 | E급 48주 안 (중앙) | 월 순수입 (조건4 세기1 요리+3 대비) | 식사 수입/월');
for (const [k, lab] of cells) { const R = res[k]; if (!R) continue; const S = R.map(m => sumB(m, [0, 1, 2, 3])), a = f => avg(S.map(f)), bt = a(o => o.band[0] + o.band[1] + o.band[2]);
  const dn = avg(R.map(m => m.stats.done)), fl = avg(R.map(m => m.stats.fail)), gE = R.map(m => m.first.gE || 999), x = net(R);
  P(`  ${k.padEnd(7)} ${lab.padEnd(18)} 승산 ${pct(a(o => o.band[2]), bt)} · ${pct(a(o => o.band[1]), bt)} · ${pct(a(o => o.band[0]), bt)} (계산 ${pct(a(o => o.tband[2]), bt)} · ${pct(a(o => o.tband[1]), bt)} · ${pct(a(o => o.tband[0]), bt)}) | 오름 ${pct(a(o => o.upN), a(o => o.eatN))} (${a(o => o.upN).toFixed(1)}/${a(o => o.eatN).toFixed(1)}명) | 성공률 ${(100 * dn / (dn + fl)).toFixed(1)}% | 원정 ${dn.toFixed(1)} | E급 ${(100 * gE.filter(v => v <= 48).length / N).toFixed(0)}% (${med(gE) >= 999 ? '못 닿음' : med(gE) + '주'}) | 순수입 ${avg(x).toFixed(0)}G${b1 && k !== 'q100d1' ? ` (${fD(pm(x, net(b1)))})` : ''} | 식사 ${avg(R.map(m => avg(m.hist.map(h => h.meal || 0)))).toFixed(0)}G`); }
for (const [k, lab] of cells) {
  const R = res[k]; if (!R) continue; P(`\n==== ${k} · ${lab} ====`);
  const x = net(R); P(`  월 순수입 ${avg(x).toFixed(0)}G${c0 && k !== 'c0' ? ` · 지금 규칙 대비 ${fD(pm(x, net(c0)))}` : ''}${b1 && k !== 'q100d1' && k !== 'c0' ? ` · 조건4(세기1 요리+3) 대비 ${fD(pm(x, net(b1)))}` : ''}`);
  for (const [lab2, qs, h0, h1, w0, w1] of [['48주', [0, 1, 2, 3], 0, 12, 0, 48], ['1~12주', [0], 0, 3, 0, 12], ['13~24주', [1], 3, 6, 12, 24], ['25~36주', [2], 6, 9, 24, 36], ['37~48주', [3], 9, 12, 36, 48]]) {
    const S = R.map(m => sumB(m, qs)), a = f => avg(S.map(f)), bt = a(o => o.band[0] + o.band[1] + o.band[2]), nt = a(o => o.need[0] + o.need[1] + o.need[2]), tot = a(o => o.g + o.inn + o.no);
    const why = {}; for (const o of S) for (const y in o.why) why[y] = (why[y] || 0) + o.why[y] / N;
    const f = g => avg(R.map(m => avg(m.hist.slice(h0, h1).map(g))));
    const idle = {}; let idN = 0; for (const m of R) for (const wk of m.wk.slice(w0, w1)) for (const y in wk.idle) { if (y[0] === '_') continue; idle[y] = (idle[y] || 0) + wk.idle[y] / N; idN += wk.idle[y] / N; }
    P(`  [${lab2}] 준비 없이 본 승산 (출발한 사람): 여유 ${pct(a(o => o.band[2]), bt)} · 팽팽 ${pct(a(o => o.band[1]), bt)} · 위험 ${pct(a(o => o.band[0]), bt)} (${bt.toFixed(1)}명) | 계산한 승산(questP)으로: 여유 ${pct(a(o => o.tband[2]), bt)} · 팽팽 ${pct(a(o => o.tband[1]), bt)} · 위험 ${pct(a(o => o.tband[0]), bt)}`);
    P(`      밥을 먹은 사람 ${a(o => o.eatN).toFixed(1)}명 중 한 단계 오름 ${pct(a(o => o.upN), a(o => o.eatN))} — 팽팽에서 ${pct(a(o => o.upB[1]), a(o => o.eatB[1]))} (${a(o => o.eatB[1]).toFixed(1)}명) · 위험에서 ${pct(a(o => o.upB[0]), a(o => o.eatB[0]))} (${a(o => o.eatB[0]).toFixed(1)}명) · 여유였던 사람 ${a(o => o.eatB[2]).toFixed(1)}명`);
    P(`      필요(밥): 꼭 필요 ${pct(a(o => o.need[2]), nt)} · 있으면 좋다 ${pct(a(o => o.need[1]), nt)} · 필요 없다 ${pct(a(o => o.need[0]), nt)}`);
    P(`      밥: 길드 ${a(o => o.g).toFixed(1)} · 여관 ${a(o => o.inn).toFixed(1)} · 못 먹음 ${a(o => o.no).toFixed(1)} / ${tot.toFixed(1)}${Object.keys(why).length ? ' — 못 먹은 까닭: ' + Object.keys(why).sort((p, q) => why[q] - why[p]).map(y => `${WHY[y] || y} ${why[y].toFixed(1)}`).join(' · ') : ''}`);
    P(`      한 달: 식사 ${f(h => h.meal || 0).toFixed(0)}G · 순수입 ${f(h => h.net || 0).toFixed(0)}G | 준비에 쓴 돈 ÷ 출발 때 지갑: 평소 ${pct(a(o => o.prepG), a(o => o.w0G))} · 큰일 ${pct(a(o => o.bigG), a(o => o.w0B))}`);
    P(`      쉰 모험가 (사람 × 주, 마을에 있었는데 안 떠난 까닭): ${Object.keys(idle).sort((p, q) => idle[q] - idle[p]).map(y => `${IDLE[y] || y} ${idle[y].toFixed(1)}`).join(' · ')}`);
    if (lab2 === '48주') P(`      길드 의뢰로 떠난 파티 ${a(o => o.gqN).toFixed(1)}번 · 그중 카드에 보상(reward > 0)이 있던 것 ${a(o => o.gqRw).toFixed(1)}번 · 평균 ${(a(o => o.gqRwG) / Math.max(1e-9, a(o => o.gqRw))).toFixed(0)}G`);
  }
  const dn = avg(R.map(m => m.stats.done)), fl = avg(R.map(m => m.stats.fail));
  P(`  성공률 ${(100 * dn / (dn + fl)).toFixed(1)}% · 성공한 원정 ${dn.toFixed(1)}건${c0 && k !== 'c0' ? ` (지금 규칙 대비 ${fD(pm(R.map(m => m.stats.done), c0.map(m => m.stats.done)), 1)})` : ''} · 부상 ${avg(R.map(m => m.stats.injuries)).toFixed(1)} · 사망 ${avg(R.map(m => m.stats.deaths)).toFixed(2)}`);
  const gE = R.map(m => m.first.gE || 999); P(`  길드 E급: 중앙 ${med(gE) >= 999 ? '48주 안 못 닿음' : med(gE) + '주'} · 48주 안 ${(100 * gE.filter(v => v <= 48).length / N).toFixed(0)}%`);
  const wl = w => avg(R.map(m => { const L = (m.snap[w] || { adv: [] }).adv.filter(a => a.alive); return L.length ? avg(L.map(a => a.wallet)) : 0; }));
  P(`  모험가 한 명의 지갑: 12주 ${wl(12).toFixed(0)} · 24주 ${wl(24).toFixed(0)} · 36주 ${wl(36).toFixed(0)} · 48주 ${wl(48).toFixed(0)}G`);
}
const txt = out.join('\n'); console.log(txt); if (OUT) require('fs').writeFileSync(OUT, txt + '\n');
