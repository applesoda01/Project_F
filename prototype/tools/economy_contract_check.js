// 경제 개편 V2 계약 · 정산 검사 도구 (E1-1, 2026-11-17 B 세션)
// 결정표(docs/design/economy_v2_decisions.md) 3장 · 7장의 실패 사례를 게임 코드(vm으로 불러온 game_core.js)에 직접 돌려 본다.
// 아직 게임에 없는 함수가 필요한 사례는 "미구현(건너뜀)"으로 표시하고 실패로 치지 않는다.
//   node prototype/tools/economy_contract_check.js          → 표 출력, 실패가 1건이라도 있으면 종료 코드 1
//   node prototype/tools/economy_contract_check.js --md out → 결과를 마크다운 파일로도 저장
//
// 쓰는 게임 함수 (72998d8 기준, A 1~5 · 7단계): econSplit · rateOf · contractWhy · contractTermsWhy · contractEval · contractPropose
//   · build · upgrade · reqNominate · reqOf · serialize/deserialize. 월 보수 · 출발 막기는 stepWeek를 돌려 결과로 본다.
// 게임에 없는 함수가 필요해지면 그 사례의 need에 이름을 넣으면 "미구현(건너뜀)"으로 표시된다.
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const JS = path.join(__dirname, '..', 'js');
const ctx = { console, Math, JSON, Date }; ctx.window = ctx; vm.createContext(ctx);
for (const f of ['data_gen.js', 'combat.js', 'sim_engine.js', 'game_core.js']) vm.runInContext(fs.readFileSync(path.join(JS, f), 'utf8'), ctx, { filename: f });
const Sim = ctx.GuildSim, Gm = ctx.GuildGame;

// 기대값은 정수로만 계산한다 (요율은 % 정수로 바꿔 계산 → 부동소수 내림 오차를 잡기 위함)
function expectSplit(R, rates) {
  const n = rates.length, b = Math.floor(R / n), r = R - b * n;
  const base = rates.map((_, i) => b + (i < r ? 1 : 0));
  const fee = base.map((x, i) => Math.floor(x * Math.round(rates[i] * 100) / 100));
  const net = base.map((x, i) => x - fee[i]);
  return { base, fee, net, guild: fee.reduce((t, x) => t + x, 0) };
}
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const pick = o => ({ base: Array.from(o.base), fee: Array.from(o.fee), net: Array.from(o.net), guild: o.guild });
const sum = a => a.reduce((t, x) => t + x, 0);
const wallets = s => s.advs.map(a => a.wallet || 0);
const step = g => { Gm.autoRequests(g); Gm.stepWeek(g); Gm.autoCook(g); if (g.week % Gm.WPM === 0) Gm.autoPlace(g, false); };
function newRun(seed, weeks) {   // 관문 1과 같은 진행으로 몇 주 돌린 판
  const g = Gm.newGame(Sim.defaults(), seed); Gm.autoPlace(g, true);
  for (let w = 0; w < weeks; w++) { Gm.autoRequests(g); Gm.stepWeek(g); Gm.autoCook(g); if (g.week % Gm.WPM === 0) Gm.autoPlace(g, false); }
  return g;
}
const reload = s => { const t = Gm.deserialize(Gm.serialize(s)); t.cfg = Object.assign(Sim.defaults(), t.cfg); return t; };
function returning(seed) {   // 다음 주에 성공해서 돌아오는 원정(번호 있음)이 있는 판과 그 원정
  const g = newRun(seed, 2);
  for (let w = 0; w < 40; w++) { const x = g.active.find(e => e.uid != null && e.back <= g.week + 1 && e.ok); if (x) return { pre: g, dup: JSON.parse(JSON.stringify(x)) }; step(g); }
  throw new Error('돌아오는 원정을 찾지 못함');
}

const cpay = g => g.history.reduce((t, m) => t + (m.cpay || 0), 0) + (g.month.cpay || 0);   // 계약 보수 누계 (음수 = 지급)
function cand(g, not) {   // 계약 후보로 만든 모험가 (애착 60 · 성공 5회로 맞춤 — 후보 조건 자체는 K1에서 봄)
  const a = g.advs.find(x => x.alive && x !== not && !x.contract); a.attach = Math.max(a.attach, 60); a.done = Math.max(a.done || 0, 5); return a;
}
function sign(g, a, terms) {   // 집무실을 짓고(검사용) 기본값 또는 terms로 계약 → 그 모험가
  g.built['집무실'] = true; a = a || cand(g); const keep = g.gold; if (g.gold < 0) g.gold = 0;
  const r = Gm.contractPropose(g, a.id, terms || {}); g.gold = keep;
  if (!r.ok) { a.earn = []; const r2 = Gm.contractPropose(g, a.id, terms || {}); if (!r2.ok) throw new Error('계약 체결 실패: ' + (r2.why || r2.mood)); }
  return a;
}
function gate(tweak) {
  let op = 0, d = 0, f = 0;
  for (let i = 0; i < 100; i++) {
    const cfg = Sim.defaults(); tweak(cfg); const g = Gm.newGame(cfg, 7000 + i); Gm.autoPlace(g, true);
    for (let w = 0; w < 48; w++) step(g);
    op += g.history.reduce((t, m) => t + m.net, 0) / g.history.length; d += g.stats.done; f += g.stats.fail;
  }
  return { G: Math.round(op / 100), S: (d / (d + f) * 100).toFixed(1) };
}

const CASES = [
  { id: 'S1', name: '정수 배분: 101G · 3명 · 10%', need: ['econSplit'], src: '결정 8 · 3-1', run() {
    const got = pick(Gm.econSplit(101, [0.1, 0.1, 0.1])), want = { base: [34, 34, 33], fee: [3, 3, 3], net: [31, 31, 30], guild: 9 };
    return { ok: same(got, want) && sum(got.net) + got.guild === 101, detail: `실수령 ${got.net.join(' · ')} + 길드 ${got.guild} = ${sum(got.net) + got.guild}G (기대 31 · 31 · 30 + 9 = 101G)` };
  } },
  { id: 'S2', name: '정수 배분: 1,000G 혼성 10 · 10 · 20 · 20%', need: ['econSplit'], src: '결정 8 · 3-1', run() {
    const got = pick(Gm.econSplit(1000, [0.1, 0.1, 0.2, 0.2])), want = expectSplit(1000, [0.1, 0.1, 0.2, 0.2]);
    return { ok: same(got, want) && sum(got.net) + got.guild === 1000, detail: `실수령 ${got.net.join(' · ')} + 길드 ${got.guild} = ${sum(got.net) + got.guild}G (기대 ${want.net.join(' · ')} + ${want.guild})` };
  } },
  { id: 'S3', name: '정수 배분: 무작위 2,000건 총액 보존 · 길드 몫 내림', need: ['econSplit'], src: '결정 8 · 3-1', run() {
    const RATES = [0.1, 0.15, 0.2, 0.25, 0.3]; let seed = 12345; const rnd = n => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % n; };
    for (let k = 0; k < 2000; k++) {
      const n = 1 + rnd(4), R = rnd(3000), rates = Array.from({ length: n }, () => RATES[rnd(RATES.length)]);
      const got = pick(Gm.econSplit(R, rates)), want = expectSplit(R, rates);
      if (!same(got, want) || sum(got.net) + got.guild !== R) return { ok: false, detail: `${R}G · 수수료 ${rates.join(', ')} → ${JSON.stringify(got)} (기대 ${JSON.stringify(want)})` };
    }
    return { ok: true, detail: '1~4명 · 0~2,999G · 수수료 10~30% 2,000건 모두 일치' };
  } },
  { id: 'D1', name: '같은 원정이 같은 주에 두 번 돌아와도 한 번만 정산', need: ['econSplit'], src: '결정 9 · 3-3 · E1-6', run() {
    const { pre, dup } = returning(7000);
    const c1 = reload(pre), c2 = reload(pre); c2.active.push(JSON.parse(JSON.stringify(dup)));
    step(c1); step(c2);
    return { ok: c1.gold === c2.gold && c1.stats.done === c2.stats.done && sum(wallets(c1)) === sum(wallets(c2)) && c2.settled[dup.uid] != null,
      detail: `원정 #${dup.uid} 복제 → 금고 차이 ${Math.round(c2.gold - c1.gold)}G · 성공 수 차이 ${c2.stats.done - c1.stats.done} · 지갑 합 차이 ${Math.round(sum(wallets(c2)) - sum(wallets(c1)))}G` };
  } },
  { id: 'D2', name: '정산한 원정: 저장 → 불러오기 뒤 다시 들어와도 정산 안 함', need: ['econSplit'], src: '결정 9 · 3-3 · E1-6', run() {
    const { pre, dup } = returning(7000), done = reload(pre); step(done);   // 정산까지 끝난 판
    const c1 = reload(done), c2 = reload(done); const d = JSON.parse(JSON.stringify(dup)); d.back = c2.week; c2.active.push(d);
    step(c1); step(c2);
    return { ok: c2.settled[dup.uid] != null && c1.gold === c2.gold && c1.stats.done === c2.stats.done && sum(wallets(c1)) === sum(wallets(c2)),
      detail: `불러온 뒤 원정 #${dup.uid} 다시 넣음 → 금고 차이 ${Math.round(c2.gold - c1.gold)}G · 성공 수 차이 ${c2.stats.done - c1.stats.done}` };
  } },
  { id: 'D3', name: '계약 보수: 매주 저장 → 불러오기를 해도 총액 · 금고 같음, 12주 계약 보수는 75G를 넘지 않음', need: ['contractPropose'], src: '결정 9 · 3-3 · E1-6', run() {
    const g0 = newRun(7000, 6), a = sign(g0), c1 = reload(g0); let c2 = reload(g0);
    for (let w = 0; w < 14; w++) { step(c1); step(c2); c2 = reload(c2); }
    const p1 = cpay(c1), p2 = cpay(c2);
    return { ok: Math.round(c1.gold) === Math.round(c2.gold) && p1 === p2 && p1 <= 0 && p1 >= -75 && p1 <= -70,
      detail: `${a.name} 12주 · 월 25G → 그대로 ${-p1}G / 매주 다시 불러옴 ${-p2}G · 금고 차이 ${Math.round(c2.gold - c1.gold)}G (기대 70~75G, 근무 주만큼 버림)` };
  } },
  { id: 'N1', name: '금고 마이너스: 계약 보수(자동 지급)는 마이너스여도 나감', need: ['contractPropose'], src: '결정 7 · 2-9', run() {
    const g = newRun(7000, 6); sign(g); g.gold = -100000; const p0 = cpay(g);
    for (let w = 0; w < 5; w++) step(g);
    return { ok: cpay(g) < p0 && g.gold < 0, detail: `금고 −100,000G에서 5주 → 보수 ${p0 - cpay(g)}G 지급, 금고 ${Math.round(g.gold)}G` };
  } },
  { id: 'N2', name: '금고 마이너스 동안 건설 · 업그레이드 · 지명 막힘', need: ['build', 'upgrade', 'reqNominate', 'reqOf'], src: '결정 7 · 2-9', run() {
    const g = newRun(7000, 4), R = Gm.reqOf(g), a = g.advs.find(x => x.alive);
    R.open.push({ id: 'chkN2', key: 'f_req_bat01', state: 'open', stage: 1, who: null, party: [], refused: {}, at: g.week, isNew: true, fails: 0 });
    // 지명은 다른 조건(★ 능력 등)으로도 막힐 수 있어, "금고 적자" 이유로 막혔는지를 본다. 지명은 집무실이 있어야 열림
    const try3 = gold => { const h = reload(g); h.gold = gold; const b = Gm.build(h, '집무실'); h.built['집무실'] = true; const r = Gm.reqNominate(h, 'chkN2', a.id) || {};
      return [b, Gm.upgrade(h, '게시판'), !/적자/.test(r.why || '')]; };
    const neg = try3(-1), rich = try3(100000);
    return { ok: neg.every(x => x === false) && rich.every(x => x === true), detail: `-1G: ${neg.join(' · ')} / 100,000G: ${rich.join(' · ')} (집무실 건설 · 게시판 업그레이드 · 지명이 적자 이유로 안 막힘)` };
  } },
  { id: 'N3', name: '금고 마이너스 동안 새 계약 막힘', need: ['contractWhy'], src: '결정 7 · 2-9', run() {
    const g = newRun(7000, 6); g.built['집무실'] = true; const a = cand(g);
    g.gold = -1; const neg = Gm.contractWhy(g, a) || ''; g.gold = 0; const zero = Gm.contractWhy(g, a) || '';
    return { ok: /적자/.test(neg) && !/적자/.test(zero), detail: `-1G: "${neg}" / 0G: "${zero || '제안 가능'}"` };
  } },
  { id: 'K1', name: '계약 제안 실패 사례: 집무실 없음 · 범위 밖 · 정원 초과 · 중복 체결 · 같은 조건 같은 답', need: ['contractWhy', 'contractTermsWhy', 'contractEval', 'contractPropose'], src: 'E2-1 · 결정 2 · 4 · 5', run() {
    const g = newRun(7000, 6), a = cand(g), why0 = Gm.contractWhy(g, a) || '';
    const bad = [{ weeks: 10 }, { rate: 0.35 }, { pay: 7 }, { pay: 65 }, { sup: 35 }].map(t => Gm.contractTermsWhy(g, Object.assign(Gm.contractDefault(g), t)));
    const okT = Gm.contractTermsWhy(g, Gm.contractDefault(g));
    sign(g, a); const b = cand(g, a), whyFull = Gm.contractWhy(g, b) || '', whyDup = Gm.contractWhy(g, a) || '';
    const e1 = Gm.contractEval(g, b, Gm.contractDefault(g)), e2 = Gm.contractEval(g, b, Gm.contractDefault(g));
    const ok = /집무실/.test(why0) && bad.every(Boolean) && okT === null && /정원/.test(whyFull) && /계약 중/.test(whyDup) && same(e1, e2);
    return { ok, detail: `집무실 전: "${why0}" · 범위 밖 5가지 모두 막힘 ${bad.every(Boolean)} · 정원: "${whyFull}" · 중복: "${whyDup}" · 같은 조건 두 번 ${e1.mood}/${e2.mood}` };
  } },
  { id: 'C1', name: '계약 끝 주 계산: 체결 주 w ~ w + 기간 − 1', need: ['contractPropose'], src: '결정 9 · 3-2', run() {
    const g = newRun(7000, 6), w = g.week, a = sign(g, null, { weeks: 8 }), c = a.contract;
    return { ok: c.start === w && c.end === w + 7, detail: `체결 ${w}주 · 8주 계약 → ${c.start}~${c.end}주 (기대 ${w}~${w + 7}주)` };
  } },
  { id: 'C2', name: '계약 끝을 넘는 의뢰 · 지명은 출발 불가 (20판 × 40주)', need: ['contractPropose', 'reqNominate', 'reqOf'], src: '결정 9 · 3-2', run() {
    let over = 0, trips = 0;
    for (let i = 0; i < 20; i++) {
      const g = newRun(7000 + i, 6); sign(g, null, { weeks: 8 });
      for (let w = 0; w < 40; w++) { step(g);
        for (const x of g.active) for (const id of x.party) { const m = g.advs.find(b => b.id === id), c = m && m.contract;
          if (c && !c.next && x.start >= c.start && x.start <= c.end) { trips++; if (x.back > c.end + 1) over++; } } }
    }
    const g = newRun(7000, 6), a = sign(g, null, { weeks: 8 }), R = Gm.reqOf(g);
    R.open.push({ id: 'chkC2', key: 'f_req_bat01', state: 'open', stage: 1, who: null, party: [], refused: {}, at: g.week, isNew: true, fails: 0 });
    a.contract.end = g.week; const last = Gm.reqNominate(reload(g), 'chkC2', a.id) || {};
    a.contract.end = g.week + 1; const before = Gm.reqNominate(reload(g), 'chkC2', a.id) || {};
    const ok = over === 0 && trips > 0 && /계약/.test(last.why || '') && !/계약이 곧/.test(before.why || '');
    return { ok, detail: `계약 중 출발 ${trips}건 중 끝을 넘음 ${over}건 · 끝 주 지명: "${last.why || '통과'}" · 끝 1주 전 지명: "${before.why || '통과'}"` };
  } },
  { id: 'X1', name: '계약 모험가가 죽거나 떠나면 근무 주만큼 정산하고 계약 해제 (위로금 없음)', need: ['contractPropose'], src: 'E3-6 · 결정 20', run() {
    const g = newRun(7000, 6), a = sign(g); step(g); step(g); step(g); const wk = a.contract.wk, p0 = cpay(g); a.alive = false; step(g);   // 6주 체결 · 8주 월말 지급 뒤 1주 더 근무
    return { ok: a.contract === null && p0 - cpay(g) === Math.floor(25 * wk / 4), detail: `월말 지급 뒤 ${wk}주 더 근무하고 사망 → 계약 ${a.contract === null ? '해제' : '남음'} · 지급 ${p0 - cpay(g)}G (기대 ⌊25 × ${wk} ÷ 4⌋ = ${Math.floor(25 * wk / 4)}G)` };
  } },
  { id: 'M1', name: '혼성 파티 수수료: 계약 모험가 = 계약 수수료, 자유 = 의뢰 수수료', need: ['rateOf', 'contractPropose'], src: 'E3-5 · 결정 4 · 11', run() {
    const g = newRun(7000, 6), a = sign(g, null, { rate: 0.25 }), b = cand(g, a), q = g.board[0] || {};
    const ra = Gm.rateOf(g, a, q), rb = Gm.rateOf(g, b, q), sp = Gm.econSplit(101, [ra, rb]);
    return { ok: ra === 0.25 && rb === Gm.questFee(g, q) && sum(Array.from(sp.net)) + sp.guild === 101,
      detail: `계약 ${Math.round(ra * 100)}% · 자유 ${Math.round(rb * 100)}% → 101G = 실수령 ${Array.from(sp.net).join(' · ')} + 길드 ${sp.guild}` };
  } },
  { id: 'G1', name: 'V2 설정을 모두 예전 값으로 돌리면 관문 1 = 560G · 95.5% (대장간 해금 데이터 변경 전 558G · 95.6%)', need: [], src: 'E1-7 · 결정표 7장', run() {
    const r = gate(c => { c.econ.feePerInfo = 0.02; c.econ.subsidyMode = 0; c.econ.resaleRate = 0.08; c.econ.matBuyRate = 0; c.econ.restK = 0; c.contract.slots = 0; c.adv.zeroFameVisit = 0; c.adv.founderMix = 0; c.econ.drawMode = 0; c.late.on = 0; c.adv.fameStep = 5; c.adv.fameSkip = 0; c.adv.founderWarrior = 0; c.gear.pieceBuy = 0; });   // 2026-11-17 cd248c4: 의뢰 0건 판 대책 두 가지도 끔
    return { ok: r.G === 560 && r.S === '95.5', detail: `게임 ${r.G}G · ${r.S}% (eb10e81 559G에서 −1G는 정수 배분 버림. 2026-11-18 대장간 리퀘스트 조건 완화(데이터)로 558 → 560G. 끈 것: 정보실 +2%p 복원 · 매달 보조금 · 자동 차익 8% · 매입 0 · 거름 0 · 계약 정원 0 · 의뢰 0건 대책 2가지)` };
  } },
  { id: 'G2', name: '지금 설정 관문 1 (기록용, 월 순이익 300~600G 안이면 통과)', need: [], src: '관문 1', run() {
    const r = gate(() => {});
    return { ok: r.G >= 300 && r.G <= 600, detail: `게임 ${r.G}G · ${r.S}% (A 기록 72998d8: 435G · 96.1%, 성공률 95% 초과는 E8-5에서 다시 합의)` };
  } }
];

const res = CASES.map(c => {
  const miss = c.need.filter(n => typeof Gm[n] !== 'function');
  if (miss.length) return { c, st: 'skip', detail: `미구현: ${miss.join(', ')}` };
  try { const r = c.run(); return { c, st: r.ok ? 'pass' : 'fail', detail: r.detail }; }
  catch (e) { return { c, st: 'fail', detail: '오류: ' + (e && e.message) }; }
});
const LABEL = { pass: '✅ 통과', fail: '❌ 실패', skip: '⏸ 미구현(건너뜀)' }, cnt = k => res.filter(r => r.st === k).length;
const md = [
  '### 경제 V2 계약 · 정산 검사 (E1-1)', '',
  '| ID | 사례 | 근거 | 결과 | 내용 |', '| --- | --- | --- | --- | --- |',
  ...res.map(r => `| ${r.c.id} | ${r.c.name} | ${r.c.src} | ${LABEL[r.st]} | ${r.detail} |`), '',
  `통과 ${cnt('pass')} · 실패 ${cnt('fail')} · 미구현 ${cnt('skip')} (모두 ${res.length}건)`
].join('\n');
console.log(md);
const i = process.argv.indexOf('--md'); if (i > 0 && process.argv[i + 1]) fs.writeFileSync(process.argv[i + 1], md + '\n');
process.exit(cnt('fail') ? 1 : 0);
