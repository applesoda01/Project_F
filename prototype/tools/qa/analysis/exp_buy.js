// 18 「모험가가 물건을 사는 판단」 1차 측정 (2026-11-25) — node exp_buy.js [판 수] [조건들]
// 시안 원본: docs/design/18_사는_판단_시안_2026-11-25.md · 결과: results/27_사는_판단_1차.txt · 정리: docs/design/현황/18_사는_판단_1차_측정.md
// 게임 파일과 수치는 그대로. 읽어 들인 game_core.js 를 메모리에서만 바꿔 끼우고(__PF_PATCH), 규칙은 그 판의 cfg.buy 가 켤 때만 움직입니다.
// cfg.buy 가 없으면(조건 0) 원래 규칙 그대로 — 기록용 셈(s.bstat)만 더해집니다.
const BUY0 = {   // 손잡이 [시안 기본값 · 모두 임시]
  on: false,        // 1. 사는 판단 (밥 · 물약)
  split: false,     // 2. 보상 나누기: 보상 = 한 사람 몫 × 알맞은 인원 (파티 판 q.party = 2 | 3)
  cookOrder: false, // 3. 식당: 주문할 때 재료를 씀 · 주재료는 길드 창고(모험가가 잡아 온 것)만 · 양념은 시장에서 삼 · 남은 그릇은 상하지 않음
  fixPrice: true,   // 사는 판단이 켜지면 길드 요리 값 = 여관 값(요리 등급 보상 × innRate). 봇은 값을 바꾸지 않음
  innRate: 0.2,     // 여관 밥 값 = 길드 등급 보상 × 이 값 (F 20G)
  innVal: 1,        // 여관 밥: 모든 능력치 +1 (그 퀘스트 동안)
  spend: [[0.3, 0.5, 0.7], [0.5, 0.7, 0.9]],   // 씀씀이 몫 [모으는 중, 모을 것 없음][절약, 보통, 낭비]
  bigK: [0.1, 0.2, 0.4],                       // 큰일: 지갑 × 이 값을 더함
  need: [[2, 2, 2], [2, 2, 1], [2, 1, 1]],     // [신중, 보통, 무모][위험, 팽팽, 여유] → 2 꼭 필요 · 1 있으면 좋다 · 0 필요 없다
  like: 0.6,                                   // 「있으면 좋다」의 살 마음
  bands: [0.4, 0.7],                           // 승산 표시: 40% 아래 위험 · 70% 이상 여유 (밥 먹기 전의 값 = 출발 때 예상)
  tight: 0.5,                                  // 주머니: 값 ≤ 남은 돈/2 → 1 · ≤ 남은 돈 → tight · 넘으면 0
  cheap: [0.8, 1.2], dear: [1.25, 0.5],        // 견줌: 여관 값의 0.8배 이하 1.2 · 1.25배 초과 0.5 · 그 사이 1.0
  front: [0, 4],                               // 앞줄 직업(core): 전사 · 도적 (combat.js POS 0)
};
const BS = `function __bs(s){ s.bstat = s.bstat || [0,1,2,3].map(() => ({ g: 0, inn: 0, innG: 0, no: 0, why: {}, gwhy: {}, potN: 0, potG: 0, prepN: 0, prepG: 0, bigN: 0, bigG: 0, pl: {}, ps: {}, pe: {} })); return s.bstat[Math.min(3, Math.floor(Math.max(0, s.week) / 12))]; }
  function kCan(s, d) { if (stockOf(s, d) > 0) return true; if (!(s.cfg.buy && s.cfg.buy.cookOrder)) return false; const RS = reqReserve(s); return d.mats.every(m => (s.mats[m] || 0) - (RS[m] || 0) >= 1 || (SPICE.has(m) && shopPrice(s, m) <= s.gold)); }
  function kServe(s, d) { if (stockOf(s, d) > 0) { takeBowl(s, d); return; } const RS = reqReserve(s);
    for (const m of d.mats) if (!((s.mats[m] || 0) - (RS[m] || 0) >= 1)) { const c = shopPrice(s, m); s.gold -= c; s.month.shop = (s.month.shop || 0) - c; s.mats[m] = (s.mats[m] || 0) + 1; mktAdd(s, m, -1); }
    for (const m of d.mats) s.mats[m]--; const B = s.bowls = s.bowls || {}; (B[d.name] = B[d.name] || []).push({ n: (d.serv || 2) - 1, w: s.week }); s.month.cooked = (s.month.cooked || 0) + (d.serv || 2); }
  `;
const NEWBUY = `
          const BY = s.cfg.buy, B = __bs(s), combat = isCombat(q), band = pp >= BY.bands[1] ? 2 : pp >= BY.bands[0] ? 1 : 0;
          const big = band === 0 || (!!q.rq && combat), MC = mealCookOn(s);
          const innP = Math.round(Q.reward[Math.min(6, s.grade)] * BY.innRate);
          const rawRW = (q.gq != null ? (q.reward || 0) : q.reward * (q.x2 ? 2 : 1)) * (BY.split ? (q.party || 1) : 1);
          const sh = econSplit(rawRW, party.map(m => rateOf(s, m, q))).net, lv2m = [0, BY.like, 1];
          const pocket = (price, rem) => price <= rem / 2 ? 1 : price <= rem ? BY.tight : 0;
          const cmpK = p => p <= innP * BY.cheap[0] ? BY.cheap[1] : p <= innP * BY.dear[0] ? 1 : BY.dear[1];
          const gp = dish ? (BY.fixPrice ? Math.round(Q.reward[dish.g] * BY.innRate) : (MC ? menuOf(s, dish).price : Q.reward[dish.g] * E.mealPriceRate)) : 0;
          const C = CB.C, potP = C.potionPrice[Math.min(q.g, s.grade)];
          party.forEach((m, i) => {
            const saving = !!(s.townUnlock || {}).smith && !!eqNext(s, m);
            let rem = Math.min(Math.max(0, m.wallet), Math.max(0, sh[i]) * BY.spend[saving ? 0 : 1][m.spend] + (big ? Math.max(0, m.wallet) * BY.bigK[m.spend] : 0));
            const base = BY.need[m.risk][band], potL = combat ? Math.min(2, base + (BY.front.includes(m.core) ? 1 : 0)) : 0, mealL = Math.min(2, base + (m.quirk === 'glutton' ? 1 : 0));
            const items = []; for (let k = m.pots; k < C.potionCarry[m.spend]; k++) items.push({ t: 'pot', L: potL }); items.push({ t: 'meal', L: mealL });
            items.sort((a, b) => (b.L - a.L) || ((a.t === 'pot' ? 0 : 1) - (b.t === 'pot' ? 0 : 1)));
            const whyMoney = price => m.wallet < price ? 'wallet' : saving ? 'saving' : 'earn';
            for (const it of items) {
              if (it.t === 'pot') { if (!(it.L > 0 && s.R() < lv2m[it.L])) continue; const pk = pocket(potP, rem); if (!(pk > 0 && s.R() < pk)) continue; m.wallet -= potP; m.pots++; rem -= potP; B.potN++; B.potG += potP; continue; }
              if (!(it.L > 0 && s.R() < lv2m[it.L])) { B.no++; B.why.need = (B.why.need || 0) + 1; continue; }
              let gw = null; if (!dish) gw = 'nodish'; else if (MC && !kCan(s, dish)) gw = 'soldout'; else if (s.seatUsed >= seatsOf(s)) gw = 'seat';
              if (!gw) { const pk = pocket(gp, rem), pr = Math.min(1, pk * cmpK(gp));
                if (s.R() < pr) { s.seatUsed++; m.wallet -= gp; rem -= gp; if (MC) { kServe(s, dish); const W = s.soldW = s.soldW || {}; W[dish.name] = (W[dish.name] || 0) + 1; } const inc = gp + (upg(s, '주점') ? (E.upMargin || 5) : 0); s.gold += inc; s.month.meal += inc; eaters++; ate.add(m.id); const md = s.month.dishes = s.month.dishes || {}; md[dish.name] = (md[dish.name] || 0) + 1; B.g++; continue; }
                gw = pk === 0 ? 'money' : cmpK(gp) < 1 ? 'dear' : 'tight'; }
              B.gwhy[gw] = (B.gwhy[gw] || 0) + 1;
              const pk2 = pocket(innP, rem);
              if (pk2 > 0 && s.R() < pk2) { m.wallet -= innP; rem -= innP; innSet.add(m.id); B.inn++; B.innG += innP; continue; }
              B.no++; const r = pk2 === 0 ? whyMoney(innP) : 'tight'; B.why[r] = (B.why[r] || 0) + 1;
            }
          });
`;
global.__PF_PATCH = (f, src) => {
  if (f !== 'game_core.js') return src;
  const one = (a, b) => { if (src.split(a).length !== 2) throw new Error('exp_buy: 붙일 자리를 찾지 못했습니다: ' + a.slice(0, 50)); src = src.replace(a, () => b); };
  // 도우미 (launchParty 바로 앞)
  one('  function launchParty(s, q, party, pp) {', BS + '  function launchParty(s, q, party, pp) {');
  // 밥: 새 판단 / 원래 판단(+셈)
  const A = '        let eaters = 0; const dish = dishFor(s, q), ate = new Set();\n', Z = '        // 식사 효과 (C안)';
  const i0 = src.indexOf(A), i1 = src.indexOf(Z); if (i0 < 0 || i1 < i0) throw new Error('exp_buy: 밥 자리');
  let old = src.slice(i0 + A.length, i1);
  if (old.split('if (MC && stockOf(s, dish) <= 0) break;').length !== 2 || old.split('takeBowl(s, dish);').length !== 2) throw new Error('exp_buy: 밥 안쪽');
  old = old.replace('if (MC && stockOf(s, dish) <= 0) break;', 'if (MC && !kCan(s, dish)) break;').replace('takeBowl(s, dish);', 'kServe(s, dish);');
  src = src.slice(0, i0) + '        let eaters = 0; const dish = dishFor(s, q), ate = new Set(), innSet = new Set(), BYON = !!(s.cfg.buy && s.cfg.buy.on);\n        if (BYON) {' + NEWBUY + '        } else {\n' + old + '        { const B = __bs(s); B.g += eaters; B.no += party.length - eaters; if (!dish) B.why.nodish = (B.why.nodish || 0) + party.length; }\n        }\n' + src.slice(i1);
  // 여관 밥: 모든 능력치 +innVal
  { const m = src.match(/        let sm = dish && dish\.stats\.length \?[^\n]*\n/); if (!m) throw new Error('exp_buy: sm');
    src = src.replace(m[0], m[0] + '        if (innSet.size) { const s0 = sm, iv = s.cfg.buy.innVal; sm = (a, k) => (s0 ? s0(a, k) : 1) * (innSet.has(a.id) ? 1 + iv / Math.max(1, finalStat(s, a, +k)) : 1); }\n'); }
  // 물약: 새 판단이면 원래 구매를 건너뜀 · 원래 구매도 셈
  one('for (const m of party) { const want = C.potionCarry[m.spend]', 'if (!BYON) for (const m of party) { const want = C.potionCarry[m.spend]');
  one('while (m.pots < want && m.wallet >= price) { m.wallet -= price; m.pots++; }', 'while (m.pots < want && m.wallet >= price) { m.wallet -= price; m.pots++; __bs(s).potN++; __bs(s).potG += price; }');
  // 준비에 쓴 돈 · 파티 인원 (출발 때)
  one('        party.forEach((m, i) => { const c = m.contract; if (!c || s.week < c.start', '        { const B = __bs(s), used = party.reduce((t, m, i) => t + Math.max(0, w0[i] - m.wallet), 0), bg = pp < ((s.cfg.buy || BUY_D).bands[0]) || (!!q.rq && isCombat(q)); if (bg) { B.bigN += party.length; B.bigG += used; } else { B.prepN += party.length; B.prepG += used; } B.pl[party.length] = (B.pl[party.length] || 0) + 1; }\n        party.forEach((m, i) => { const c = m.contract; if (!c || s.week < c.start');
  // 보상 나누기
  one('const RW = q.gq != null ? 0 : q.reward * (q.x2 ? 2 : 1), DV = s.cfg.deco;', 'const RW = q.gq != null ? 0 : q.reward * (q.x2 ? 2 : 1) * (s.cfg.buy && s.cfg.buy.split ? (q.party || 1) : 1), DV = s.cfg.deco;');
  { const m = src.match(/        const sp = econSplit\(RW, [^\n]*\n/); if (!m) throw new Error('exp_buy: sp');
    src = src.replace(m[0], m[0] + '        { const B = __bs(s), n = party.length; B.ps[n] = (B.ps[n] || 0) + 1; B.pe[n] = (B.pe[n] || 0) + sp.net.reduce((a, b) => a + b, 0) / n; }\n'); }
  // 식당: 주문할 때 만듦
  one('(mealCookOn(s) && stockOf(s, d) <= 0)', '(mealCookOn(s) && !kCan(s, d))');
  one('  function kitchenWeekly(s) {\n    if (!mealCookOn(s)) return;', '  function kitchenWeekly(s) {\n    if (!mealCookOn(s) || (s.cfg.buy && s.cfg.buy.cookOrder)) return;');
  return 'const BUY_D = ' + JSON.stringify({ bands: BUY0.bands }) + ';\n' + src;
};
const { play, avg, med, Gm } = require('./harness.js');
const N = +process.argv[2] || 30, W = 48, ONLY = process.argv[3] ? process.argv[3].split(',') : null;
const C = {
  c0: ['0. 지금 규칙 (기준)', null],
  c1: ['1. 사는 판단만', { on: true }],
  c2: ['2. 보상 나누기만', { split: true }],
  c3: ['3. 식당만 (주문할 때 만듦)', { cookOrder: true }],
  c4: ['4. 1 + 2 + 3', { on: true, split: true, cookOrder: true }],
};
const run = b => { const R = []; for (let i = 0; i < N; i++) R.push(play(7000 + i, W, { keepState: true, snap: [12, 24, 36, 48], cfg: c => { if (b) c.buy = Object.assign(JSON.parse(JSON.stringify(BUY0)), b); } })); return R; };
const pm = (a, b) => { const d = a.map((x, i) => x - b[i]), m = avg(d), sd = Math.sqrt(d.reduce((t, v) => t + (v - m) ** 2, 0) / (d.length - 1)); return { m, ci: 1.96 * sd / Math.sqrt(d.length) }; };
const fmtD = o => `${o.m >= 0 ? '+' : ''}${o.m.toFixed(0)} ± ${o.ci.toFixed(0)}`;
const net = R => R.map(m => avg(m.hist.map(h => h.net)));
const WHY = { need: '필요 없음', earn: '벌이가 적음', saving: '모으는 중', wallet: '지갑이 빔', tight: '빠듯해서 아낌', dear: '비쌈', nodish: '맞는 요리 없음', soldout: '품절', seat: '자리 없음', money: '주머니에 안 맞음' };
const res = {}; const out = []; const P = s => out.push(s);
P(`18 사는 판단 1차 (${N}판 · 48주 · 시드 7000~${7000 + N - 1} · 같은 시드 짝 비교 · ± 는 95% 구간) — 규칙은 측정 도구 안에서만 흉내 냄`);
for (const k of Object.keys(C)) { if (ONLY && !ONLY.includes(k)) continue; const t0 = Date.now(); res[k] = run(C[k][1]); console.error(k, ((Date.now() - t0) / 1000).toFixed(0) + 's'); }
const base = res.c0, b0 = base ? net(base) : null;
const sumB = (m, qs) => { const o = { g: 0, inn: 0, innG: 0, no: 0, why: {}, gwhy: {}, potN: 0, potG: 0, prepN: 0, prepG: 0, bigN: 0, bigG: 0, pl: {}, ps: {}, pe: {} }; for (const q of qs) { const b = (m.g.bstat || [])[q]; if (!b) continue; for (const k of ['g', 'inn', 'innG', 'no', 'potN', 'potG', 'prepN', 'prepG', 'bigN', 'bigG']) o[k] += b[k]; for (const k of ['why', 'gwhy', 'pl', 'ps', 'pe']) for (const x in b[k]) o[k][x] = (o[k][x] || 0) + b[k][x]; } return o; };
for (const k of Object.keys(res)) {
  const R = res[k], x = net(R); P(`\n==== ${C[k][0]} ====`);
  P(`  월 순수입 ${avg(x).toFixed(0)}G${b0 && k !== 'c0' ? ` (기준 대비 ${fmtD(pm(x, b0))})` : ''}`);
  const H = (m, a, b) => m.hist.slice(a, b);
  for (const [lab, a, b] of [['48주', 0, 12], ['1~12주', 0, 3], ['13~24주', 3, 6], ['25~36주', 6, 9], ['37~48주', 9, 12]]) {
    const f = g => avg(R.map(m => avg(H(m, a, b).map(g))));
    const fee = f(h => h.fee || 0), sub = f(h => h.subsidy || 0), meal = f(h => h.meal || 0), tav = f(h => h.tavern || 0), nt = f(h => h.net || 0);
    P(`  [${lab}] 한 달: 수수료 ${fee.toFixed(0)} · 보조금 ${sub.toFixed(0)} · 식사 ${meal.toFixed(0)} · 술 ${tav.toFixed(0)} · 그 밖 ${(nt - fee - sub - meal - tav).toFixed(0)} · 순수입 ${nt.toFixed(0)}G`); }
  for (const [lab, qs] of [['48주', [0, 1, 2, 3]], ['1~12주', [0]], ['13~24주', [1]], ['25~36주', [2]], ['37~48주', [3]]]) {
    const S = R.map(m => sumB(m, qs)), a = f => avg(S.map(f)), tot = a(o => o.g + o.inn + o.no);
    const why = {}; for (const o of S) for (const x in o.why) why[x] = (why[x] || 0) + o.why[x] / N; const gw = {}; for (const o of S) for (const x in o.gwhy) gw[x] = (gw[x] || 0) + o.gwhy[x] / N;
    P(`  [${lab}] 밥 (한 판 합): 길드 ${a(o => o.g).toFixed(1)} · 여관 ${a(o => o.inn).toFixed(1)} (${a(o => o.innG).toFixed(0)}G) · 못 먹음 ${a(o => o.no).toFixed(1)} / 출발한 사람 ${tot.toFixed(1)}`);
    if (Object.keys(why).length) P(`      못 먹은 까닭: ${Object.keys(why).sort((p, q) => why[q] - why[p]).map(x => `${WHY[x] || x} ${why[x].toFixed(1)}`).join(' · ')}`);
    if (Object.keys(gw).length) P(`      길드에서 안 먹은 까닭(여관으로 간 사람 포함): ${Object.keys(gw).sort((p, q) => gw[q] - gw[p]).map(x => `${WHY[x] || x} ${gw[x].toFixed(1)}`).join(' · ')}`);
    P(`      물약 ${a(o => o.potN).toFixed(1)}병 · ${a(o => o.potG).toFixed(0)}G | 준비에 쓴 돈 한 사람 한 번: 평소 ${(a(o => o.prepG) / Math.max(1e-9, a(o => o.prepN))).toFixed(1)}G (${a(o => o.prepN).toFixed(1)}번) · 큰일 ${(a(o => o.bigG) / Math.max(1e-9, a(o => o.bigN))).toFixed(1)}G (${a(o => o.bigN).toFixed(1)}번)`);
  }
  const wl = w => avg(R.map(m => { const L = (m.snap[w] || { adv: [] }).adv.filter(a => a.alive); return L.length ? avg(L.map(a => a.wallet)) : 0; }));
  P(`  모험가 한 명의 지갑: 12주 ${wl(12).toFixed(0)} · 24주 ${wl(24).toFixed(0)} · 36주 ${wl(36).toFixed(0)} · 48주 ${wl(48).toFixed(0)}G`);
  P(`  48주 동안 산 장비 칸 (모든 모험가 합): ${avg(R.map(m => m.adv.reduce((t, a) => t + (a.eq || []).filter(e => e >= 0).length, 0))).toFixed(1)}칸`);
  const dn = avg(R.map(m => m.stats.done)), fl = avg(R.map(m => m.stats.fail));
  P(`  성공한 원정 ${dn.toFixed(1)}건${base && k !== 'c0' ? ` (기준 대비 ${(o => `${o.m >= 0 ? "+" : ""}${o.m.toFixed(1)} ± ${o.ci.toFixed(1)}`)(pm(R.map(m => m.stats.done), base.map(m => m.stats.done)))})` : ''} · 성공률 ${(100 * dn / (dn + fl)).toFixed(1)}% · 부상 ${avg(R.map(m => m.stats.injuries)).toFixed(1)} · 사망 ${avg(R.map(m => m.stats.deaths)).toFixed(2)}`);
  const gE = R.map(m => m.first.gE || 999); P(`  길드 E급: 중앙 ${med(gE) >= 999 ? '48주 안 못 닿음' : med(gE) + '주'} · 48주 안 ${(100 * gE.filter(x => x <= 48).length / N).toFixed(0)}%`);
  const T = R.map(m => sumB(m, [0, 1, 2, 3])); const nAll = {}; for (const o of T) for (const x in o.pl) nAll[x] = (nAll[x] || 0) + o.pl[x] / N;
  const tot = Object.values(nAll).reduce((a, b) => a + b, 0);
  P(`  파티 인원 (출발 한 판 합 · 비율 · 성공했을 때 한 사람이 받은 돈 평균): ${[1, 2, 3, 4, 5].map(n => { const c = nAll[n] || 0, ps = T.reduce((t, o) => t + (o.ps[n] || 0), 0), pe = T.reduce((t, o) => t + (o.pe[n] || 0), 0); return `${n}명 ${c.toFixed(1)}번 (${(100 * c / Math.max(1e-9, tot)).toFixed(0)}%) · ${ps ? (pe / ps).toFixed(0) + 'G' : '—'}`; }).join(' | ')}`);
}
const txt = out.join('\n'); console.log(txt);
if (process.argv[4]) require('fs').writeFileSync(process.argv[4], txt + '\n');
