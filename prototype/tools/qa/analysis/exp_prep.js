// 야간 S1 (2026-11-26) — 출발 판단에 준비물(정비 · 점)을 넣으면 「팽팽 · 위험」으로 떠나는 사람이 생기는가.  node exp_prep.js [판 수] [결과 파일]
// 바탕: 18 승산 훑기의 조건 4(사는 판단 + 보상 나누기 + 주문할 때 만드는 식당 — exp_buy.js 의 메모리 패치) + 왕국 보조금 10%.
// 게임 파일과 수치는 그대로. 아래 규칙은 이 도구 안에서만 메모리 패치로 흉내 냅니다(cfg.buy.prepK 가 0 이면 꺼짐).
//   · 정비(싸움이 있는 퀘스트) · 점(싸움이 없는 퀘스트): 13주부터 있다고 봄. 값 = 길드 등급 보상 × 0.2 (F 20G) · 길드 수입.
//   · 효과: 그 원정 동안 산 사람의 모든 능력치 × (1 + prepK). 「승산 한 단계」를 어림한 손잡이 — 실제로 오른 승산은 결과에 적음.
//   · 출발 판단: 대장이 「준비하면 오를 승산」을 미리 셈 (준비 전 느낀 승산 × 준비 뒤 / 준비 전 계산 승산). 살 돈이 있는 사람만 삼.
//     산다 = ① 준비하면 출발 기준을 넘음(준비 덕에 떠남) ② 이미 떠날 만한데 승산이 위험(늘) · 팽팽(60%)이라서.
//   · 품삯: 정비대 · 점술가의 자리 둘 × 20G를 13주부터 달마다 냄.
// 결과: results/30_출발_판단에_준비물.txt · 정리: docs/design/현황/18_출발_판단에_준비물.md
const { BUY0 } = require('./exp_buy.js');
const prev = global.__PF_PATCH;
global.__PF_PATCH = (f, src) => {
  src = prev(f, src);
  if (f !== 'game_core.js') return src;
  const one = (a, b) => { if (src.split(a).length !== 2) throw new Error('exp_prep: 붙일 자리 ' + a.slice(0, 50)); src = src.replace(a, () => b); };
  // 능력치: 준비한 사람은 × (1 + __prep)
  { const i = src.indexOf('  function finalStat(s, a, i) {'), j = src.indexOf('    return v;\n  }', i); if (i < 0 || j < 0) throw new Error('exp_prep: finalStat');
    src = src.slice(0, j) + '    if (a.__prep) v *= 1 + a.__prep;\n' + src.slice(j); }
  // 출발 판단: 준비하면 오를 승산을 셈
  one('      if (pp < thq) continue;\n', `      let __buy = null; const __pp0 = pp;
      { const BY = s.cfg.buy; if (BY && BY.prepK && s.week >= BY.prepFrom) {
        const price = Math.round(s.cfg.quest.reward[Math.min(6, s.grade)] * BY.prepRate), can = party.filter(m => m.wallet >= price);
        if (can.length) { const p1 = questP(s, party, q); for (const m of can) m.__prep = BY.prepK; const p2 = questP(s, party, q); for (const m of can) m.__prep = 0;
          const pp2 = Math.min(1, p1 > 0 ? pp * p2 / p1 : p2), band = pp >= 0.7 ? 2 : pp >= 0.4 ? 1 : 0, enable = pp < thq && pp2 >= thq;
          if (enable || (pp >= thq && (band === 0 || (band === 1 && s.R() < BY.like)))) __buy = { can, price, pp2, enable, p1, p2 }; } } }
      if (__buy) pp = __buy.pp2;
      if (pp < thq) continue;
`);
  // 출발 직전: 돈을 내고 효과를 붙임 → 출발 → 효과를 뗌
  one('      s.board.splice(s.board.indexOf(q), 1);\n      launchParty(s, q, party, pp); went = true;\n      if (sneak)', `      { const PS = s.prepStat = s.prepStat || { pre: [0, 0, 0], post: [0, 0, 0], dep: 0, buyE: 0, buyN: 0, n: 0, g: 0, comb: 0, nc: 0, lift: 0, liftN: 0 }, bd = x => x >= 0.7 ? 2 : x >= 0.4 ? 1 : 0;
        PS.dep += party.length; PS.pre[bd(__pp0)] += party.length; PS.post[bd(pp)] += party.length;
        if (__buy) { const BY = s.cfg.buy; for (const m of __buy.can) { m.wallet -= __buy.price; m.__prep = BY.prepK; s.gold += __buy.price; s.month.svc = (s.month.svc || 0) + __buy.price; PS.g += __buy.price; PS.n++; }
          if (__buy.enable) PS.buyE++; else PS.buyN++; if (isCombat(q)) PS.comb++; else PS.nc++; PS.lift += __buy.p2 - __buy.p1; PS.liftN++; } }
      s.board.splice(s.board.indexOf(q), 1);
      launchParty(s, q, party, pp); went = true; for (const m of party) m.__prep = 0;
      if (sneak)`);
  // 장부: 준비물 수입 · 품삯
  one('    const net = s.month.fee + ', `    { const BY = s.cfg.buy; if (BY && BY.prepK && s.week >= BY.prepFrom) { s.gold -= BY.prepUp; s.month.upkeep -= BY.prepUp; } }
    const net = (s.month.svc || 0) + s.month.fee + `);
  return src;
};
const { play, avg, med, Gm } = require('./harness.js');
const N = +process.argv[2] || 100, W = 48, OUT = process.argv[3];
const PREP = { prepFrom: 13, prepRate: 0.2, prepUp: 40, like: 0.6 };
const C4 = (q, k) => Object.assign({ on: true, split: true, cookOrder: true, qMul: q, prepK: k }, PREP);
const CELLS = []; for (const q of [1, 1.3, 1.5]) for (const k of [0, 0.15, 0.3]) CELLS.push([`q${q * 100}k${k * 100}`, `세기 ×${q} · 준비물 ${k ? '×' + (1 + k) : '없음'}`, C4(q, k), q, k]);
const run = b => { const R = []; for (let i = 0; i < N; i++) R.push(play(7000 + i, W, { keepState: true, cfg: c => { c.econ.subsidyRate = 0.1; c.buy = Object.assign(JSON.parse(JSON.stringify(BUY0)), b); } })); return R; };
const pmS = (a, b) => { const d = a.map((x, i) => x - b[i]), m = avg(d), sd = Math.sqrt(d.reduce((t, v) => t + (v - m) ** 2, 0) / (d.length - 1)); return `${m >= 0 ? '+' : ''}${m.toFixed(0)} ± ${(1.96 * sd / Math.sqrt(d.length)).toFixed(0)}`; };
const out = [], P = s => out.push(s), res = {};
P(`야간 S1 · 출발 판단에 준비물 (${N}판 · 48주 · 시드 7000~${7000 + N - 1} · 같은 시드 짝 비교 · ± 95%) — 규칙은 측정 도구 안에서만 흉내 냄`);
P(`바탕: 18 승산 훑기 조건 4 + 보조금 10% · 요리 +3 그대로. 준비물: 13주부터 · 20G · 길드 수입 · 품삯 한 달 40G(13주부터). 효과 = 산 사람의 능력치 × (1 + k)`);
for (const [key, , b] of CELLS) { const t0 = Date.now(); res[key] = run(b); console.error(key, ((Date.now() - t0) / 1000).toFixed(0) + 's'); }
const net = R => R.map(m => avg(m.hist.map(h => h.net)));
const netF = (R, a, b) => R.map(m => avg(m.hist.slice(a, b).map(h => h.net)));
for (const [key, lab, , q, k] of CELLS) {
  const R = res[key], R0 = res[`q${q * 100}k0`]; P(`\n==== ${lab} ====`);
  P(`  월 순수입 ${avg(net(R)).toFixed(0)}G${k ? ` (같은 세기 · 준비물 없음 대비 ${pmS(net(R), net(R0))})` : ''} | 13~48주만: ${avg(netF(R, 3, 12)).toFixed(0)}G${k ? ` (${pmS(netF(R, 3, 12), netF(R0, 3, 12))})` : ''}`);
  const PS = R.map(m => m.g.prepStat || { pre: [0, 0, 0], post: [0, 0, 0], dep: 0, buyE: 0, buyN: 0, n: 0, g: 0, comb: 0, nc: 0, lift: 0, liftN: 0 }), a = f => avg(PS.map(f));
  const dep = a(o => o.dep), pc = (x, t) => t ? (100 * x / t).toFixed(0) + '%' : '—';
  P(`  게시판 출발(사람 · 한 판): ${dep.toFixed(1)}명 | 준비 전 느낀 승산 위험 · 팽팽 · 여유: ${[0, 1, 2].map(i => pc(a(o => o.pre[i]), dep)).join(' · ')} | 준비 뒤: ${[0, 1, 2].map(i => pc(a(o => o.post[i]), dep)).join(' · ')}`);
  if (k) {
    const n13 = 9; // 13~48주 = 9달
    P(`  준비물 산 파티(한 판): 준비 덕에 떠남 ${a(o => o.buyE).toFixed(1)} · 떠날 만했지만 삼 ${a(o => o.buyN).toFixed(1)} | 정비 ${a(o => o.comb).toFixed(1)} · 점 ${a(o => o.nc).toFixed(1)} | 산 사람 ${a(o => o.n).toFixed(1)}명 · ${a(o => o.g).toFixed(0)}G (13주 뒤 한 달 ${(a(o => o.g) / n13).toFixed(0)}G) · 품삯 한 달 40G`);
    P(`  준비가 올린 계산 승산(파티 평균): +${(100 * a(o => o.liftN ? o.lift / o.liftN : 0)).toFixed(1)}%p`);
  }
  const dn = avg(R.map(m => m.stats.done)), fl = avg(R.map(m => m.stats.fail)), gE = R.map(m => m.first.gE || 999);
  P(`  성공한 원정 ${dn.toFixed(1)}건${k ? ` (${pmS(R.map(m => m.stats.done), R0.map(m => m.stats.done))})` : ''} · 성공률 ${(100 * dn / (dn + fl)).toFixed(1)}% · 길드 E급 중앙 ${med(gE) >= 999 ? '48주 안 못 닿음' : med(gE) + '주'} · 48주 안 ${(100 * gE.filter(x => x <= 48).length / N).toFixed(0)}%`);
  const meal = R.map(m => avg(m.hist.map(h => h.meal || 0))); P(`  식사 수입 한 달 ${avg(meal).toFixed(0)}G | 부상 ${avg(R.map(m => m.stats.injuries || 0)).toFixed(1)} · 사망 ${avg(R.map(m => m.stats.deaths || 0)).toFixed(2)}`);
}
const txt = out.join('\n'); console.log(txt); if (OUT) require('fs').writeFileSync(OUT, txt + '\n');
