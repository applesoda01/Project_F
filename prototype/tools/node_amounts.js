// 칸의 양 · 경험치를 목표에 맞춰 셈하는 도구 (2026-11-27 · 바닥 공사 짓는 차례 4 · 명세 3장 「양을 맞추는 계산 도구」)
//   게임 코드 · 틀 자료를 건드리지 않음. 표를 내놓기만 하고, 확인받은 뒤 틀 자료에 넣는다.
//   node prototype/tools/node_amounts.js            → 표 출력
//   node prototype/tools/node_amounts.js --md out   → 표를 마크다운 파일로도 저장
// 셈하는 법은 명세 3장 「어림셈」과 같음 (난수 없음 · 평균값으로 한 번):
//   몬스터 칸: 박자 = 마릿수 × 한 마리 체력 ÷ (저마다 (공격력 − 적의 방어) × 빠르기의 합) · 맨 앞이 잃는 체력 = 적의 공격력 × 마릿수 × 박자 ÷ 2
//   일 칸: 박자 = 양 ÷ 그 능력치의 합 · 함정: 양 ÷ 기교 합, 5박자를 넘으면 모두 최대 체력의 30%
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const JS = path.join(__dirname, '..', 'js');
const ctx = { console, Math, JSON, Date }; ctx.window = ctx; vm.createContext(ctx);
for (const f of ['data_gen.js', 'combat.js']) vm.runInContext(fs.readFileSync(path.join(JS, f), 'utf8'), ctx, { filename: f });
const GD = ctx.GAME_DATA, B = GD.balance, CB = ctx.GuildCombat.make(GD), C = B.combat, G = B.growth;
const CL = ['전사', '궁수', '마법사', '성직자', '도적'], ST = ['힘', '민첩', '지력', '정신', '기교'];
const r1 = x => Math.round(x * 10) / 10, r0 = Math.round, pct = x => r0(x * 100) + '%';

// ---------- 기준이 되는 사람 (명세: 기준 레벨 · 그 일에 맞는 직업 · 별 하나 · 처음 능력치의 가운데(주력 17 · 나머지 7.5) · 고비 보너스는 주력에 · 장비 · 준비물 없음) ----------
// 성장(A세션 2026-11-27 14:32): 레벨업 몫(주력 +core1 · 나머지 +0.4) + 고비 보너스(주력) + 승급 보너스(gradeStat · 다섯에 각각) + 처음 해낸 의뢰마다 +1(11-6)
//   처음 해낸 의뢰: 그 묶음에서 자기 의뢰인의 틀 둘 × 레벨 셋 = 6장을 다 해냈다고 봄 (어림) → 다음 묶음의 시작에 주력 +6
const BUNDLES = [['F 첫 묶음', 1, 0], ['F 둘째 묶음', 5, 0], ['E 첫 묶음', 10, 1], ['E 둘째 묶음', 15, 1]];   // [이름, 기준 레벨, 그때의 모험가 등급]
function refStats(core, lv, grade, bundleIdx) {
  const st = [0, 1, 2, 3, 4].map(i => i === core ? 17 : 7.5), add = [0, 0, 0, 0, 0], why = [];
  for (let l = 2; l <= lv; l++) { for (let i = 0; i < 5; i++) st[i] += i === core ? G.core1 : 0.4; }
  let mile = 0; (G.mileLv || []).forEach((L, k) => { if (L <= lv) mile += G.milePts[k]; }); st[core] += mile;
  let gs = 0; for (let g = 1; g <= grade; g++) gs += (G.gradeStat || [])[g] || 0; for (let i = 0; i < 5; i++) st[i] += gs;
  const first = 6 * bundleIdx; st[core] += first;
  return { st, mile, gs, first, lvUp: (lv - 1) * G.core1 };
}
function unitFor(core, st) { const a = { core, lv: 1, risk: 1, spend: 1, social: 1, stage: 1, line: [core], stats: st, sp: null, quirk: null }; return CB.unit(a, i => st[i], -1, 0); }

// ---------- 열 틀 (명세 3장 「틀 10개」 · 시간과 미니뷰 12-1) ----------
//   side: 'fight' | 'work' · mon: 몬스터 칸의 몬스터 키 · work: 일 칸의 능력치(0 ~ 4) · lv: 레벨마다의 칸 (M = 몬스터 · W = 일 · T = 함정)
const FR = [
  { id: 'q_slay_F', name: '광견병 물리치료', giver: '굼바', side: 'fight', mon: 'dog', work: 0, trap: false, end: 'dogBoss' },
  { id: 'q_hunt_F_2', name: '오늘 저녁 삼겹살', giver: '굼바', side: 'work', mon: 'boar', work: 0, trap: false },
  { id: 'q_slay_F_2', name: '그 멧돼지는 이름이 있다', giver: '사냥꾼', side: 'fight', mon: 'boar', work: 1, trap: false, end: 'boarBoss' },
  { id: 'q_hunt_F', name: '장작이 부족해요', giver: '사냥꾼', side: 'work', mon: 'dog', work: 1, trap: false },
  { id: 'q_study_F', name: '이거 마석 맞냐', giver: '헤르만', side: 'fight', mon: 'rock', work: 2, trap: false },
  { id: 'q_study_F_2', name: '먹어도 되나요', giver: '헤르만', side: 'work', mon: 'boar', work: 2, trap: false },
  { id: 'q_guard_F', name: '무명천 사수작전', giver: '세실리아', side: 'fight', mon: 'thief', work: 3, trap: false },
  { id: 'q_guard_F_2', name: '잡초 말고 약초', giver: '세실리아', side: 'work', mon: 'dog', work: 3, trap: false },
  { id: 'q_mine_F', name: '반짝이면 다 내 거', giver: '탐험가', side: 'fight', mon: 'magpie', work: 4, trap: true },
  { id: 'q_mine_F_2', name: '펄떡이는 생선', giver: '탐험가', side: 'work', mon: 'slime', work: 4, trap: true },
];
const LAYOUT = { fight: ['MM', 'MMW', 'MMWM'], work: ['WW', 'WWM', 'WWMW'] };

// ---------- 몬스터의 버릇 → 능력치 [제 안 · 조정] ----------
//   틀의 성격(명세: 16 ~ 26박자 · 25 ~ 50% 안에서 다르게)과 버릇의 모양(한 칸의 마릿수 · 방어)을 정하고, 체력과 공격력은 「전사 혼자 Lv 1」에 맞춰 풂
//   T = Lv 1 종이 전체의 박자(몬스터 칸 둘), loss = 전사가 잃는 체력의 몫, n = 한 칸의 마릿수(Lv 1), def = 방어
const HABIT = {
  dog: { name: '들개 (떼)', T: 18, loss: 0.45, n: 4, def: 5 },
  boar: { name: '멧돼지 (큰 놈 하나)', T: 22, loss: 0.45, n: 1, def: 15 },
  rock: { name: '돌슬라임 (단단한 놈)', T: 24, loss: 0.30, n: 2, def: 28 },
  thief: { name: '도적 (아픈 놈)', T: 18, loss: 0.50, n: 2, def: 8 },
  magpie: { name: '까치 (달아나는 놈)', T: 20, loss: 0.30, n: 3, def: 5 },
  slime: { name: '슬라임 (생선의 끼어드는 칸)', T: 20, loss: 0.35, n: 2, def: 15 },
};
const ref0 = unitFor(0, refStats(0, 1, 0, 0).st);                         // 기준 전사 Lv 1
const rate = (u, def) => Math.max(0, u.atk - def) * (u.speed || 1);
const MON = {};
for (const k in HABIT) {
  const h = HABIT[k], Tc = h.T / 2, H = rate(ref0, h.def) * Tc;             // 한 칸 = 전체의 절반
  const hp = H / h.n, atk = (h.loss * ref0.maxHp / 2) / (h.n * Tc / 2);     // 한 칸에서 잃는 체력 = atk × n × Tc ÷ 2
  MON[k] = { key: k, name: h.name, n: h.n, hp: r0(hp), atk: r1(atk), def: h.def };
}
MON.dogBoss = { key: 'dogBoss', name: '우두머리 들개 (Lv 3 끝 · 큰 떼 안에)', n: 1, hp: MON.dog.hp * 3, atk: r1(MON.dog.atk * 2), def: 10 };   // [제 안] 들개 셋만큼 단단하고 두 배 아픔
MON.boarBoss = { key: 'boarBoss', name: '순돌이 (Lv 3 끝 · 더 큰 놈)', n: 1, hp: r0(MON.boar.hp * 1.5), atk: r1(MON.boar.atk * 1.3), def: 18 };   // [제 안]
const WORK_PER_CELL = 10;   // 일 칸 하나 = 맞는 직업(능력치 17)이 혼자 10박자 → Lv 1 일 쪽 종이 20박자
const workAmt = lv => r0(17 * WORK_PER_CELL * lv);
const TRAP = 60;            // 명세 3-3의 예 (도적 기교 15가 4박자) [조정] — 레벨마다 늘릴지는 정하지 않음 (아래 물음)

// ---------- 어림셈 (난수 없음) ----------
function estimate(party, cells, opt) {
  opt = opt || {}; let beats = 0; const hp = party.map(u => u.maxHp), lost = party.map(() => 0); let trapHit = 0;
  for (const c of cells) {
    if (c.k === 'M') {
      const m = MON[c.mon], magic = u => opt.magicIgnoresDef && (u.core === 2);
      const dmg = party.reduce((t, u) => t + Math.max(0, u.atk - (magic(u) ? 0 : m.def)) * (u.speed || 1), 0);
      const t = dmg > 0 ? c.n * m.hp / dmg : Infinity; beats += t;
      let take = m.atk * c.n * t / 2, k = 0; while (take > 0 && k < party.length) { const can = hp[k] - lost[k]; const d = Math.min(can, take); lost[k] += d; take -= d; if (lost[k] >= hp[k]) k++; }
    } else if (c.k === 'W') { const sum = party.reduce((t, u) => t + u.stats[c.w], 0); beats += c.amt / Math.max(1e-9, sum); }
    else if (c.k === 'T') { const sum = party.reduce((t, u) => t + u.stats[4], 0), t = TRAP * c.lv / Math.max(1e-9, sum); if (t > 5) { beats += 5; trapHit++; party.forEach((u, i) => { lost[i] += u.maxHp * 0.3; }); } else beats += t; }
  }
  return { beats, loss: lost.map((l, i) => l / hp[i]), front: lost[0] / hp[0], down: lost.some((l, i) => l >= hp[i] - 1e-9), trapHit };
}
function cellsOf(fr, lv) {
  return LAYOUT[fr.side][lv - 1].split('').map((ch, i, arr) => {
    if (ch === 'W') return { k: 'W', w: fr.work, amt: workAmt(lv) };
    const last = lv === 3 && i === arr.length - 1 && fr.end;   // Lv 3의 끝은 큰 놈이 낌
    const base = MON[fr.mon];
    return last ? { k: 'M', mon: fr.end, n: 1, extra: { mon: fr.mon, n: base.n * lv } } : { k: 'M', mon: fr.mon, n: base.n * lv };
  }).concat(fr.trap ? [{ k: 'T', lv }] : []).flatMap(c => c.extra ? [{ k: 'M', mon: c.extra.mon, n: c.extra.n }, { k: 'M', mon: c.mon, n: 1, sameCell: true }] : [c]);
}
const unitWithStats = (core, st) => Object.assign(unitFor(core, st), { stats: st, core });
const refUnit = (core, b) => { const R = refStats(core, BUNDLES[b][1], BUNDLES[b][2], b); return unitWithStats(core, R.st); };

// ---------- 표 ----------
const out = [];
out.push('# 칸의 양 · 경험치 — 계산 도구의 표 (확인받기 전 · 틀 자료에 넣지 않음)', '');
out.push(`설정: 체력 = 기본 + 힘 × ${C.hpPerStr} · 공격력 = 기본 + 주력 × atkPerCore · 빠르기 = 1 + 기교 × ${C.speedPerSkill} · 1차 주력 +${G.core1}/레벨 · 고비 ${G.mileLv.join('·')} → ${G.milePts.join('·')} · 승급 보너스 ${G.gradeStat.join('·')}`, '');

out.push('## 1. 기준이 되는 사람 (묶음마다 · 별 하나 · 장비 없음)', '', '| 묶음 | 레벨 | 주력 (레벨업 · 고비 · 승급 · 처음 해낸 의뢰) | 나머지 넷 | 전사 체력 · 공격력 | 마법사 체력 · 공격력 |', '| --- | :---: | --- | :---: | --- | --- |');
BUNDLES.forEach(([nm, lv, gr], b) => { const R = refStats(0, lv, gr, b), w = unitFor(0, R.st), M = refStats(2, lv, gr, b), m = unitFor(2, M.st);
  out.push(`| ${nm} | ${lv} | ${r1(R.st[0])} (17 + ${r1(R.lvUp)} · ${R.mile} · ${R.gs} · ${R.first}) | ${r1(R.st[1])} | ${r0(w.maxHp)} · ${r1(w.atk)} | ${r0(m.maxHp)} · ${r1(m.atk)} |`); });
out.push('', '- 처음 해낸 의뢰: 그 묶음에서 자기 의뢰인의 6장(틀 둘 × 레벨 셋)을 다 해냈다고 보고 다음 묶음에 주력 +6 (어림). 승급 보너스는 Lv 10에 E급이 된다고 봄.', '');

out.push('## 2. 몬스터의 능력치 [제 안 · 조정] — 「전사 혼자 Lv 1」에 맞춰 푼 값', '', '| 몬스터 (버릇) | 한 칸의 마릿수 (Lv 1) | 체력 | 공격력 | 방어 | 맞춘 목표 (Lv 1 종이 · 전사 혼자) | 지금 자료의 값 |', '| --- | :---: | :---: | :---: | :---: | --- | --- |');
const OLD = { dog: '들개 150 · 22 · 10', boar: '멧돼지 260 · 25 · 15', thief: '도적 180 · 28 · 12', slime: '슬라임 200 · 18 · 20', rock: '(없음 · 새로)', magpie: '(없음 · 새로)', dogBoss: '(없음 · 새로)', boarBoss: '(없음 · 새로)' };
for (const k in MON) { const m = MON[k], h = HABIT[k]; out.push(`| ${m.name} | ${m.n} | ${m.hp} | ${m.atk} | ${m.def} | ${h ? `${h.T}박자 · 체력 ${pct(h.loss)}` : '큰 놈 [제 안]'} | ${OLD[k]} |`); }
out.push('', `- 일 칸 하나의 양 = 능력치 17이 혼자 ${WORK_PER_CELL}박자 = **${workAmt(1)}** (Lv 2 = ${workAmt(2)} · Lv 3 = ${workAmt(3)}). 함정 = ${TRAP} (명세 3-3의 예).`, '');

out.push('## 3. Lv 1 종이를 다섯 직업이 혼자 갈 때 (박자 · 잃는 체력 · 맨 앞이 쓰러지면 ✕)', '', `| 틀 | 쪽 | ${CL.join(' | ')} | 답이 되는 직업 (12-1) |`, `| --- | :---: |${CL.map(() => ' :---: |').join('')} --- |`);
const ANSWER = { dog: '덧대기 · 마법사의 범위공격', boar: '물약 · 성직자 · 도적의 급소', rock: '날 세우기 · 마법', thief: '궁수 · 날 세우기 · 치유', magpie: '빠른 도적 · 궁수', slime: '—' };
for (const fr of FR) {
  const cells = cellsOf(fr, 1);
  const row = CL.map((_, c) => { const e = estimate([refUnit(c, 0)], cells); return `${r0(e.beats)} · ${pct(e.front)}${e.down ? ' ✕' : ''}${e.trapHit ? ' (함정)' : ''}`; });
  out.push(`| ${fr.name} (${fr.giver}) | ${fr.side === 'fight' ? '싸움' : '일'} | ${row.join(' | ')} | ${fr.side === 'fight' ? ANSWER[fr.mon] : ST[fr.work] + ' → ' + CL[fr.work]} |`);
}
{ const fr = FR[4], e = estimate([refUnit(2, 0)], cellsOf(fr, 1), { magicIgnoresDef: true }); out.push('', `- 「이거 마석 맞냐」를 마법사가 혼자 — 마법이 방어를 무시한다면(빈 곳 13): ${r0(e.beats)}박자 · ${pct(e.front)}. 지금 코드는 마법도 방어를 뺌.`); }
{ const t = CL.map((_, c) => { const u = refUnit(c, 0); return `${CL[c]} ${r1(MON.magpie.n * MON.magpie.hp / rate(u, MON.magpie.def))}`; }); out.push(`- 까치 한 칸(${MON.magpie.n}마리)을 다 잡는 박자: ${t.join(' · ')} — 빠르기(기교 × 0.005)의 차이가 작아 「빠른 도적 · 궁수」가 전사보다 빨리 잡지 못함. \`node,fleeBeats\`는 정하지 않음 (아래 물음).`, ''); }

out.push('## 4. Lv 2 · 3 — 둘 · 셋이 갈 때 (같은 Lv 1 기준 사람 · 양 × 2 · × 3 · 명세: 30박자쯤 · 40박자쯤)', '', '| 틀 | Lv 1 혼자 (맞는 직업) | Lv 2 둘 | Lv 2 맨 앞 | Lv 3 셋 | Lv 3 맨 앞 |', '| --- | :---: | :---: | :---: | :---: | :---: |');
for (const fr of FR) {
  const c0 = fr.side === 'fight' ? 0 : fr.work, mate = fr.side === 'fight' ? fr.work : 0;   // 둘째는 끼어드는 칸의 능력치를 맡는 직업
  const e1 = estimate([refUnit(c0, 0)], cellsOf(fr, 1)), e2 = estimate([refUnit(0, 0), refUnit(fr.side === 'fight' ? fr.work : fr.work, 0)].sort((a, b) => (a.core === 0 ? -1 : 1)), cellsOf(fr, 2)), e3 = estimate([refUnit(0, 0), refUnit(fr.work, 0), refUnit(fr.work === 0 ? 3 : 0, 0)], cellsOf(fr, 3));
  out.push(`| ${fr.name} | ${r0(e1.beats)} · ${pct(e1.front)} | ${r0(e2.beats)} | ${pct(e2.front)}${e2.down ? ' ✕' : ''} | ${r0(e3.beats)} | ${pct(e3.front)}${e3.down ? ' ✕' : ''} |`);
}
out.push('', '- 둘 = 전사 + 그 틀의 일 능력치에 맞는 직업 · 셋 = 거기에 전사(일 능력치가 힘이면 성직자) 한 명 더. 맨 앞은 전사. 몬스터는 한꺼번에 덤비므로 맨 앞이 레벨만큼 더 맞음(6-3).', '');

// ---------- 경험치 (11-2): 36주 Lv 5 · 72주 Lv 10 · 144주 Lv 20 ----------
//   가정 [어림]: 한 주에 2.5번 다녀옴 · 한 번에 평균 3칸(Lv 1 ~ 3의 가운데) · 다 지나감 · E급 종이(72주 뒤)의 칸은 경험치 × xpGradeMult(지금 2)
const TRIPS = 2.5, NODES = 3, GM = G.xpGradeMult || 2;
const xpAt = (w, xn) => (Math.min(w, 72) + Math.max(0, w - 72) * GM) * TRIPS * NODES * xn;
function lvAt(xp, A, Bx) { let lv = 1, x = xp; for (;;) { const need = A * Math.pow(lv, Bx); if (x < need || lv >= 70) return lv + x / need; x -= need; lv++; } }
const TARGET = [[36, 5], [72, 10], [144, 20]];
let best = null; const A0 = G.lvA;
for (let Bx = 0; Bx <= 2.0001; Bx += 0.01) for (let xn = 0.5; xn <= 120; xn *= 1.01) {
  const err = TARGET.reduce((t, [w, L]) => t + Math.pow(Math.log(lvAt(xpAt(w, xn), A0, Bx) / L), 2), 0);
  if (!best || err < best.err) best = { err, Bx: Math.round(Bx * 100) / 100, xn: Math.round(xn * 10) / 10 };
}
out.push('## 5. 경험치 [조정] — 36주 Lv 5 · 72주 Lv 10 · 144주 Lv 20 (11-2)', '');
out.push(`가정 [어림]: 한 주에 ${TRIPS}번 · 한 번에 ${NODES}칸 · 실패 없음 · 72주 뒤(E급 종이)는 칸의 경험치 × ${GM}. \`lvA\`는 지금 값 ${A0}에 두고 \`lvB\`와 \`xpNode\`를 맞춤.`, '');
out.push('| | 설정 | 36주 | 48주 | 72주 | 144주 |', '| --- | --- | :---: | :---: | :---: | :---: |');
out.push(`| 목표 | — | 5 | — | 10 | 20 |`);
out.push(`| **새 값 (제 안)** | lvA ${A0} · lvB **${best.Bx}** · xpNode **${best.xn}** | ${[36, 48, 72, 144].map(w => r1(lvAt(xpAt(w, best.xn), A0, best.Bx))).join(' | ')} |`);
{ const xpOld = w => w * 1 * G.xpBase * (w > 72 ? 1 : 1); out.push(`| 옛 경험치 (참고) | lvA ${A0} · lvB ${G.lvB} · 성공마다 ${G.xpBase} × ${GM}^등급 · 한 주에 1번 | ${[36, 48, 72, 144].map(w => r1(lvAt(Math.min(w, 72) * G.xpBase + Math.max(0, w - 72) * G.xpBase * GM, A0, G.lvB))).join(' | ')} |`); }
out.push('', '- 참고: 옛 경험치 위에서 잰 값 — 씨앗 20판 · 48주의 평균 레벨 **6.36** (바닥 ② 뒤 · 2026-11-27). 위 「옛 경험치」 줄은 한 사람이 매주 F급 의뢰 하나를 해낸다는 셈이라 잰 값(여럿의 평균 · 쉬는 주 포함)보다 높게 나옴.', `- 맞춘 정도: 로그 제곱 오차 ${best.err.toFixed(4)}. 거듭제곱 한 줄로는 세 점을 다 맞추지 못함(36 → 72주는 두 배, 72 → 144주는 E급 배수로 세 배의 경험치).`, '');


// ---------- 그 레벨의 기준 양 (15-3 · A세션 14:36): 틀의 개성을 뺀 값 — 모험가가 모르는 몬스터의 자리를 셈할 때 씀 ----------
//   몬스터 칸: 버릇 없는 「보통 몬스터」 — Lv 1 종이 20박자 · 전사 체력 40% (명세의 가운데) · 방어 10 → 칸의 체력 합 · 공격력 합 (마릿수는 따지지 않음)
//   일 칸 = 능력치 17이 혼자 10박자 × 레벨 · 함정 = 60 × 레벨 (함정을 레벨마다 늘리는지는 정하지 않음)
const BASE_DEF = 10, BASE_T = 20, BASE_LOSS = 0.40;
const baseMon = lv => { const Tc = BASE_T / 2; return { hp: r0(rate(ref0, BASE_DEF) * Tc * lv), atk: r1(BASE_LOSS * ref0.maxHp / 2 / (Tc / 2) * lv), def: BASE_DEF }; };
out.push('## 6. 그 레벨의 기준 양 — 틀의 개성을 뺀 값 (15-3 · 모르는 몬스터 자리의 셈)', '', '| 레벨 | 몬스터 칸 (체력 합 · 공격력 합 · 방어) | 일 칸의 양 | 함정 |', '| :---: | --- | :---: | :---: |');
for (let lv = 1; lv <= 3; lv++) { const m = baseMon(lv); out.push(`| ${lv} | ${m.hp} · ${m.atk} · ${m.def} | ${workAmt(lv)} | ${TRAP * lv} |`); }
out.push('', `- 보통 몬스터 = Lv 1 종이 ${BASE_T}박자 · 전사 혼자 체력 ${pct(BASE_LOSS)} · 방어 ${BASE_DEF}. 공격력 합 = 칸 안 모든 몬스터의 공격력을 더한 것 (한꺼번에 덤빔 · 6-3).`, '- 틀 자료에는 레벨마다 이 세 값을 \`base\`로 함께 적을 생각 (모양은 5번에서 여쭘).', '');

const md = out.join('\n'); console.log(md);
const mi = process.argv.indexOf('--md'); if (mi > 0 && process.argv[mi + 1]) fs.writeFileSync(process.argv[mi + 1], md + '\n');
