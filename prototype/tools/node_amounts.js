// 칸의 양 · 몬스터 · 장비 · 경험치를 목표에 맞춰 셈하는 도구 (2026-11-27 · 바닥 공사 짓는 차례 4 · 명세 3장 「양을 맞추는 계산 도구」 · 덧붙임 16-1 ~ 16-8)
//   게임 코드 · 틀 자료를 건드리지 않음. 표를 내놓기만 하고, 확인받은 뒤 틀 자료에 넣는다.
//   node prototype/tools/node_amounts.js            → 표 출력
//   node prototype/tools/node_amounts.js --md out   → 표를 마크다운 파일로도 저장
// 셈하는 법 (16장으로 바뀜): 무리로 나뉘어 차례로 덤비고(16-1) 몬스터가 게이지로 움직이므로(16-3) 손셈 식 대신
//   게임의 전투 규칙(combat.js의 begin · step)을 그대로 돌려 고정 씨앗 SEEDS번의 평균을 낸다. 같은 입력이면 늘 같은 표.
//   아직 게임에 없는 16장의 규칙 넷은 이 도구 안에서만 흉내 낸다 (5번에서 게임에 넣음):
//     ① 몬스터의 빠르기 · 치명타(16-2 · 16-3) ② 마법사의 공격은 방어를 무시(16-5) ③ 칸의 무리 = 종류마다의 pack(16-1) ④ 달아나는 무리(16-6)
//     ⑤ 무리가 나타나면 첫 박자에 한 번 침(16-9) ⑥ 파이어볼은 앞에 나온 무리 전체(16-11) ⑦ 덧대기 = 받는 피해 × dmgTaken(16-12의 준비물 줄)
//   일 칸: 박자 = 양 ÷ 그 능력치의 합 · 함정: 양(60 × 레벨) ÷ 기교 합, 5박자를 넘으면 모두 최대 체력의 30%
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const JS = path.join(__dirname, '..', 'js');
const ctx = { console, Math, JSON, Date }; ctx.window = ctx; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(JS, 'data_gen.js'), 'utf8'), ctx, { filename: 'data_gen.js' });
const PATCH = [   // [찾을 글, 바꿀 글, 무엇]
  ['boss: !!e.boss, gauge: 0 }));', 'boss: !!e.boss, gauge: e.gauge0 || 0, speed: e.speed || 1, crit: e.crit || 0, flee: 0 }));', '① 몬스터의 빠르기 · 치명타'],
  ['const dealt = Math.max(0, d - tgt.def);', 'const dealt = Math.max(0, d - (u.core === 2 ? 0 : tgt.def));', '② 마법은 방어를 무시'],
  ['const dealt = Math.max(0, x.atk * vary() - tgt.def);', 'const dealt = Math.max(0, x.atk * vary() * (rnd() < (x.crit || 0) ? C_.critMult : 1) - tgt.def) * (tgt.dmgTaken || 1);', '① 몬스터의 치명타 · ⑦ 덧대기'],
  ["else if (x.core === 2) { const b = behind(W, t0); strike(x, 1.5, t0, 'fire'); if (b) strike(x, 1.5, b, 'fire'); }", "else if (x.core === 2) { for (const e of W) if (e.hp > 0) strike(x, 1.5, e, 'fire'); }", '⑥ 파이어볼은 무리 전체'],
];
let csrc = fs.readFileSync(path.join(JS, 'combat.js'), 'utf8');
for (const [a, b, what] of PATCH) { if (!csrc.includes(a)) throw new Error('combat.js가 바뀌어 흉내 낼 자리를 못 찾음: ' + what); csrc = csrc.replace(a, b); }
vm.runInContext(csrc, ctx, { filename: 'combat.js' });
const GD = ctx.GAME_DATA, B = GD.balance, CB = ctx.GuildCombat.make(GD), C = B.combat, G = B.growth;
const CL = ['전사', '궁수', '마법사', '성직자', '도적'], ST = ['힘', '민첩', '지력', '정신', '기교'];
const r1 = x => Math.round(x * 10) / 10, r2 = x => Math.round(x * 100) / 100, r0 = Math.round, pct = x => r0(x * 100) + '%';
const SEEDS = 40, RISK = 1, FIRST = !process.argv.includes('--no-first');   // 16-9: 무리가 나타나면 첫 박자에 한 번 침 (--no-first = 옛 규칙 · 게이지 0)   // 고정 씨앗 40번 · 무릅쓰기 「보통」(체력 합이 30% 아래면 물러남)
function mulberry(seed) { let a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// ---------- 기준이 되는 사람 (별 하나 · 처음 능력치의 가운데(주력 17 · 나머지 7.5) · 고비 보너스는 주력에) ----------
//   성장(14:32): 레벨업 몫(주력 +core1 · 나머지 +0.4) + 고비 보너스 + 승급 보너스(gradeStat · 다섯에 각각) + 처음 해낸 의뢰 +1(한 묶음에 6장으로 어림)
const BUNDLES = [['F 첫 묶음', 1, 0], ['F 둘째 묶음', 5, 0], ['E 첫 묶음', 10, 1], ['E 둘째 묶음', 15, 1]];
function refStats(core, lv, grade, b) {
  const st = [0, 1, 2, 3, 4].map(i => i === core ? 17 : 7.5);
  for (let l = 2; l <= lv; l++) for (let i = 0; i < 5; i++) st[i] += i === core ? G.core1 : 0.4;
  let mile = 0; G.mileLv.forEach((L, k) => { if (L <= lv) mile += G.milePts[k]; }); st[core] += mile;
  let gs = 0; for (let g = 1; g <= grade; g++) gs += G.gradeStat[g] || 0; for (let i = 0; i < 5; i++) st[i] += gs;
  st[core] += 6 * b;
  return { st, mile, gs, first: 6 * b, lvUp: (lv - 1) * G.core1 };
}
// 장비: 무기는 공격력 +, 갑옷은 방어 + 체력 + 마력 (직업마다 갑옷의 종류가 다름: 전사 heavy · 궁수와 도적 light · 마법사와 성직자 robe)
const ARMOR_OF = ['heavy', 'light', 'robe', 'robe', 'light'];
function person(core, b, gear, prep) {
  const R = refStats(core, BUNDLES[b][1], BUNDLES[b][2], b), st = R.st;
  const a = { core, lv: 1, risk: RISK, spend: 1, social: 1, stage: 1, line: [core], stats: st, sp: null, quirk: null, pots: 0 };
  const u = CB.unit(a, i => st[i], -1, 0);
  if (gear) { const A = gear.armor[ARMOR_OF[core]]; u.atk += gear.weapon; u.def += A.def; u.maxHp += A.hp; u.hp = u.maxHp; u.maxMp += A.mp || 0; u.mp = u.maxMp; }
  if (prep === 'sharp') u.atk *= 1.2; if (prep === 'pad') u.dmgTaken = 0.8; if (prep === 'potion') u.pots = 1;   // 16-12 준비물: 날 세우기 · 덧대기 · 물약 1병
  delete u.a; return Object.assign(u, { stats: st, core, name: CL[core] });
}

// ---------- 새 몬스터 표 (16-2 · 16-3) — 모양은 버릇으로 정하고(SHAPE), 체력과 공격력은 「전사 혼자 Lv 1」에 맞춰 hpBase · atkBase로 풂 ----------
//   전투값은 모험가와 같은 식: 체력 = hpBase + 힘 × hpPerStr · 공격력 = atkBase + 주력 × atkPerCore[core] · 치명타 = 민첩 × critPerDex · 빠르기 = spdBase + 기교 × speedPerSkill
//   T = Lv 1 종이(몬스터 칸 둘 = 무리 둘)의 박자 · loss = 전사가 잃는 체력 · 지력 · 정신은 F급에서 쓰이지 않음(16-8 · 값만 적어 둠)
const SHAPE = {   // st = [힘, 민첩, 지력, 정신, 기교] [제 안]
  dog: { name: '들개', habit: '떼', core: 0, st: [2, 12, 2, 4, 10], def: 2, spdBase: 0.25, pack: 4, T: 18, loss: 0.45 },
  boar: { name: '멧돼지', habit: '큰 놈 하나 · 느리고 아픔', core: 0, st: [10, 5, 1, 6, 4], def: 8, spdBase: 0.2, pack: 1, T: 22, loss: 0.45 },
  rock: { name: '돌슬라임', habit: '단단한 놈', core: 0, st: [2, 2, 3, 10, 2], def: 30, spdBase: 0.2, pack: 2, T: 24, loss: 0.30 },
  thief: { name: '도적', habit: '아픈 놈', core: 1, st: [6, 6, 8, 6, 16], def: 5, spdBase: 0.25, pack: 2, T: 18, loss: 0.50 },
  magpie: { name: '까치', habit: '달아나는 놈 · 빠르고 약함', core: 0, st: [2, 28, 6, 4, 30], def: 0, spdBase: 0.25, pack: 3, T: 20, loss: 0.30, flee: true },
  slime: { name: '슬라임', habit: '생선의 끼어드는 칸', core: 0, st: [6, 2, 1, 4, 4], def: 12, spdBase: 0.2, pack: 2, T: 20, loss: 0.35 },
};
const BOSS = {   // Lv 3의 끝 칸에서 마지막 무리 대신 나옴. 체력 · 공격력은 같은 종류 한 무리의 몫에 배수 [제 안]
  dogBoss: { name: '우두머리 들개', of: 'dog', core: 0, st: [6, 16, 3, 6, 14], def: 6, spdBase: 0.25, hpX: 1.2, atkX: 2.0 },
  boarBoss: { name: '순돌이', of: 'boar', core: 0, st: [12, 5, 2, 8, 4], def: 10, spdBase: 0.2, hpX: 1.4, atkX: 1.3 },
};
const MON = {};
const combatVals = m => ({ hp: m.hpBase + m.st[0] * C.hpPerStr, atk: m.atkBase + m.st[m.core] * C.atkPerCore[m.core], crit: m.st[1] * C.critPerDex, speed: m.spdBase + m.st[4] * C.speedPerSkill });
const foe = (k, boss) => { const m = MON[k], v = combatVals(m); return { name: m.name, mon: k, hp: v.hp, atk: v.atk, def: m.def, speed: v.speed, crit: v.crit, boss: !!boss, gauge0: FIRST ? 100 - 100 * v.speed : 0 }; };

// ---------- 틀 열 (명세 3장 「틀 10개」 · 12-1) ----------
const FR = [
  { name: '광견병 물리치료', giver: '굼바', side: 'fight', mon: 'dog', work: 0, end: 'dogBoss', answer: [2], answerWhy: '마법사(파이어볼) · 갑옷' },
  { name: '오늘 저녁 삼겹살', giver: '굼바', side: 'work', mon: 'boar', work: 0 },
  { name: '그 멧돼지는 이름이 있다', giver: '사냥꾼', side: 'fight', mon: 'boar', work: 1, end: 'boarBoss', answer: [3], answerWhy: '성직자 · 물약' },
  { name: '장작이 부족해요', giver: '사냥꾼', side: 'work', mon: 'dog', work: 1 },
  { name: '이거 마석 맞냐', giver: '헤르만', side: 'fight', mon: 'rock', work: 2, answer: [2], answerWhy: '마법사 · 날 세우기' },
  { name: '먹어도 되나요', giver: '헤르만', side: 'work', mon: 'boar', work: 2 },
  { name: '무명천 사수작전', giver: '세실리아', side: 'fight', mon: 'thief', work: 3, answer: [3], answerWhy: '성직자의 치유 · 날 세우기' },
  { name: '잡초 말고 약초', giver: '세실리아', side: 'work', mon: 'dog', work: 3 },
  { name: '반짝이면 다 내 거', giver: '탐험가', side: 'fight', mon: 'magpie', work: 4, trap: true, answer: [4, 1], answerWhy: '도적 · 궁수 (놓친 마릿수로)', byFled: true },
  { name: '펄떡이는 생선', giver: '탐험가', side: 'work', mon: 'slime', work: 4, trap: true },
];
const LAYOUT = { fight: ['MM', 'MMW', 'MMWM'], work: ['WW', 'WWM', 'WWMW'] };
const LVX = [0, 1, 1.5, 2];   // 16-10: 자리마다의 양 Lv 1 · 2 · 3 = 1 · 1.5 · 2배
const WORK_PER_CELL = 10, workAmt = lv => r0(17 * WORK_PER_CELL * LVX[lv]), TRAP = 60, trapAmt = lv => r0(TRAP * LVX[lv]);   // 일 칸 170 · 255 · 340 · 함정 60 · 90 · 120
// 몬스터 칸의 무리 수 (16-10): Lv 1 = 칸마다 1 · Lv 2 = 앞 칸 1, 뒤 칸 2 · Lv 3 = 칸마다 2. Lv 3의 끝 칸은 한 무리를 우두머리가 대신함
//   일 쪽 틀의 Lv 2는 몬스터 칸이 하나뿐 → 「앞 칸」으로 보아 1 [읽은 것 · 여쭘]
function cellsOf(fr, lv) {
  let mi = 0;
  const cells = LAYOUT[fr.side][lv - 1].split('').map((ch, i, arr) => {
    if (ch === 'W') return { k: 'W', w: fr.work, amt: workAmt(lv) };
    const waves = lv === 1 ? 1 : lv === 2 ? (mi++ === 0 ? 1 : 2) : 2;
    const boss = lv === 3 && i === arr.length - 1 && fr.end;
    return { k: 'M', mon: fr.mon, waves, boss: boss ? fr.end : null };
  });
  if (fr.trap) cells.push({ k: 'T', lv });
  return cells;
}

// ---------- 전투 규칙을 돌림 ----------
let FLEE_BASE = 0;   // 16-6 · 아래에서 풂
function fightCell(party, hp, mp, cell, R) {
  const m = MON[cell.mon], enemies = [], waves = [];
  for (let w = 0; w < cell.waves; w++) {
    if (cell.boss && w === cell.waves - 1) { waves.push([enemies.length]); enemies.push(foe(cell.boss, true)); continue; }
    const ids = []; for (let j = 0; j < m.pack; j++) { ids.push(enemies.length); enemies.push(foe(cell.mon)); } waves.push(ids);
  }
  const units = party.map((u, k) => Object.assign({}, u, { hp: hp[k], mp: mp[k], id: k }));
  const st = CB.begin(units, enemies, 0, RISK, {}); st.waves = waves; st.done = !waves.length;   // ③ 칸의 무리 = pack
  const window = m.flee && FLEE_BASE ? FLEE_BASE * Math.max(...party.map(u => Math.max(u.stats[1], u.stats[4]))) / m.st[1] : 0;
  let wi = -1, w0 = 0, fled = 0;
  while (!st.done) {
    if (st.wi !== wi) { wi = st.wi; w0 = st.round; }
    if (window && st.round - w0 >= window) { for (const i of st.waves[st.wi]) if (st.E[i].hp > 0) { st.E[i].hp = 0; fled++; } }   // ④ 못 잡은 무리는 달아남 (칸은 지남)
    CB.step(st, R);
  }
  for (const u of st.P) { hp[u.k] = u.down ? 0 : u.hp; mp[u.k] = u.mp; }
  return { beats: st.round, ok: st.result === 'win', fled };
}
// 종이 하나를 SEEDS번 — 박자 · 맨 앞(party[0])이 잃는 체력 · 실패(물러남 · 전멸)의 몫 · 달아난 몬스터
function paper(party, cells, opt) {
  opt = opt || {}; let beats = 0, front = 0, fail = 0, fled = 0;
  for (let s = 0; s < SEEDS; s++) {
    const R = mulberry(4400 + s * 977), hp = party.map(u => u.maxHp), mp = party.map(u => u.maxMp); let b = 0, ok = true;
    for (const c of cells) {
      if (c.k === 'M') { const r = fightCell(party, hp, mp, c, R); b += r.beats; fled += r.fled; if (!r.ok) { ok = false; break; } }
      else if (c.k === 'W') { if (opt.fightOnly) continue; b += c.amt / party.reduce((t, u, k) => t + (hp[k] > 0 ? u.stats[c.w] : 0), 0); }
      else if (c.k === 'T') { if (opt.fightOnly) continue; const t = trapAmt(c.lv) / party.reduce((t, u) => t + u.stats[4], 0); if (t > 5) { b += 5; party.forEach((u, k) => { hp[k] = Math.max(0, hp[k] - u.maxHp * 0.3); }); } else b += t; }
    }
    beats += b; front += 1 - hp[0] / party[0].maxHp; if (!ok) fail++;
  }
  return { beats: beats / SEEDS, front: front / SEEDS, fail: fail / SEEDS, fled: fled / SEEDS };
}
const tag = e => `${r0(e.beats)} · ${pct(e.front)}${e.fail ? ` ✕${pct(e.fail)}` : ''}`;

// ---------- 몬스터를 풂: 전사 혼자 Lv 1 · 장비 없음 · Lv 1 싸움 종이(무리 둘)가 T박자 · 체력 loss ----------
const bisect = (f, lo, hi, n) => { for (let i = 0; i < (n || 30); i++) { const mid = (lo + hi) / 2; if (f(mid)) hi = mid; else lo = mid; } return (lo + hi) / 2; };
const W0 = person(0, 0);
function solve(m, T, loss) {
  const two = [{ k: 'M', mon: m.key, waves: 1 }, { k: 'M', mon: m.key, waves: 1 }], hpS = m.st[0] * C.hpPerStr, atkS = m.st[m.core] * C.atkPerCore[m.core];
  m.atkBase = 1 - atkS;
  for (let it = 0; it < 3; it++) {
    m.hpBase = bisect(h => { m.hpBase = h; return paper([W0], two).beats >= T; }, -hpS + 1, 3000);
    m.atkBase = bisect(a => { m.atkBase = a; return paper([W0], two).front >= loss; }, -atkS + 0.1, 300);
  }
  m.hpBase = r0(m.hpBase); m.atkBase = r1(m.atkBase);
}
for (const k in SHAPE) { MON[k] = Object.assign({ key: k, hpBase: 0, atkBase: 0 }, SHAPE[k]); solve(MON[k], SHAPE[k].T, SHAPE[k].loss); }
for (const k in BOSS) {
  const b = BOSS[k], of = MON[b.of], v = combatVals(of);
  MON[k] = Object.assign({ key: k, pack: 1, boss: true }, b, { hpBase: r0(v.hp * of.pack * b.hpX - b.st[0] * C.hpPerStr), atkBase: r1(v.atk * b.atkX - b.st[b.core] * C.atkPerCore[b.core]) });
}
// ④ fleeBase (16-6 · 16-12 ⑤): 혼자 갈 때 도적 · 궁수는 다 잡고 전사는 절반쯤 놓침 — Lv 1 종이(까치 두 무리 · 6마리)의 놓친 몫으로 잼
const MAG2 = [{ k: 'M', mon: 'magpie', waves: 1 }, { k: 'M', mon: 'magpie', waves: 1 }];
const fledFrac = (c, fb) => { const keep = FLEE_BASE; FLEE_BASE = fb; const f = paper([person(c, 0)], MAG2).fled / (2 * MON.magpie.pack); FLEE_BASE = keep; return f; };
{ const catchAll = r1(bisect(fb => fledFrac(4, fb) === 0 && fledFrac(1, fb) === 0, 1, 80, 24));   // 도적 · 궁수가 다 잡는 가장 작은 값
  const half = r1(bisect(fb => fledFrac(0, fb) <= 0.5, 1, 80, 24));                                    // 전사가 절반 놓치는 값
  FLEE_BASE = Math.ceil(catchAll);
  MON.magpie.fleeNote = { catchAll, half, at: CL.map((_, c) => fledFrac(c, FLEE_BASE)), atHalf: CL.map((_, c) => fledFrac(c, half)) }; }

// ---------- 장비 (16-13) — 무기 7 · 갑옷은 방어만(안 B) · 정수. heavy를 풀고 light = heavy × 0.8 · robe = × 0.6을 반올림 ----------
//   목표(16-4): 잃는 체력 × 0.75쯤. 전사 혼자 · Lv 1 싸움 종이 다섯(몬스터 칸만)의 평균
const fightFr = FR.filter(f => f.side === 'fight');
const avgOver = (gear, key, prep) => fightFr.reduce((t, fr) => t + paper([person(0, 0, gear, prep)], cellsOf(fr, 1), { fightOnly: true })[key], 0) / fightFr.length;
const bare = { beats: avgOver(null, 'beats'), front: avgOver(null, 'front') };
const mkGear = (w, h, l, r) => ({ weapon: w, armor: { heavy: { def: h, hp: 0, mp: 0 }, light: { def: l, hp: 0, mp: 10 }, robe: { def: r, hp: 0, mp: 20 } } });
const WEAP = 7, DEF_RAW = bisect(d => avgOver(mkGear(0, d, 0, 0), 'front') <= bare.front * 0.75, 0, 40, 20);
const DEF = [Math.round(DEF_RAW), Math.round(DEF_RAW * 0.8), Math.round(DEF_RAW * 0.6)];
const ARM = mkGear(0, ...DEF), GEAR = mkGear(WEAP, ...DEF), WPN = mkGear(WEAP, 0, 0, 0);

// ---------- 표 ----------
const out = [];
out.push('# 칸의 양 · 몬스터 · 장비 · 경험치 — 계산 도구의 표 (덧붙임 16-1 ~ 16-13에 맞춤 · 확인받기 전 · 틀 자료에 넣지 않음)', '');
out.push(FIRST ? '규칙: 무리가 나타나면 몬스터는 첫 박자에 한 번 침(16-9) · 파이어볼은 앞에 나온 무리 전체(16-11) · 양 1 · 1.5 · 2배(16-10).' : '**비교용 (--no-first): 무리가 나올 때 몬스터의 게이지는 0.**', '');
out.push(`셈하는 법: 게임의 전투 규칙(begin · step)을 고정 씨앗 ${SEEDS}번 돌린 평균 · 무릅쓰기 「보통」(체력 합 30% 아래면 물러남) · 도구 안에서만 흉내 낸 새 규칙: ① 몬스터의 빠르기 · 치명타 ② 마법은 방어를 무시 ③ 칸의 무리 = pack ④ 달아나는 무리 ⑤ 먼저 달려듦 ⑥ 파이어볼은 무리 전체 ⑦ 덧대기 · 표기: 박자 · 맨 앞이 잃는 체력 (✕ = 물러남/전멸의 몫)`, '');

out.push('## 1. 기준이 되는 사람 (별 하나 · 장비 없음)', '', '| 묶음 | 레벨 | 주력 (17 + 레벨업 · 고비 · 승급 · 처음 해낸 의뢰) | 나머지 넷 | 전사 체력 · 공격력 | 마법사 체력 · 공격력 |', '| --- | :---: | --- | :---: | --- | --- |');
BUNDLES.forEach(([nm, lv, gr], b) => { const R = refStats(0, lv, gr, b), w = person(0, b), m = person(2, b);
  out.push(`| ${nm} | ${lv} | ${r1(R.st[0])} (${r1(R.lvUp)} · ${R.mile} · ${R.gs} · ${R.first}) | ${r1(R.st[1])} | ${r0(w.maxHp)} · ${r1(w.atk)} | ${r0(m.maxHp)} · ${r1(m.atk)} |`); });
out.push('');

out.push('## 2. 새 몬스터 표 (16-2 · 16-3) [제 안 · 조정]', '', '모양(능력치 다섯 · def · spdBase · pack)은 버릇에서 골랐고, `hpBase` · `atkBase`는 「전사 혼자 · 장비 없음 · Lv 1 싸움 종이(무리 둘)」가 목표에 맞게 풀었습니다.', '',
  '| 몬스터 (버릇) | core | 힘 · 민첩 · 지력 · 정신 · 기교 | hpBase | atkBase | def | spdBase | pack | → 체력 · 공격력 · 치명타 · 빠르기 | 맞춘 목표 |', '| --- | :---: | --- | :---: | :---: | :---: | :---: | :---: | --- | --- |');
for (const k in MON) { const m = MON[k], v = combatVals(m);
  out.push(`| ${m.name} (${m.habit || 'Lv 3 끝 · ' + MON[m.of].name + ' 한 무리 대신'}) | ${ST[m.core]} | ${m.st.join(' · ')} | ${m.hpBase} | ${m.atkBase} | ${m.def} | ${m.spdBase} | ${m.pack} | ${r0(v.hp)} · ${r1(v.atk)} · ${pct(v.crit)} · ${r2(v.speed)} (${r1(1 / v.speed)}박자에 한 번) | ${m.T ? `${m.T}박자 · ${pct(m.loss)}` : `한 무리 체력 × ${m.hpX} · 한 마리 공격 × ${m.atkX}`} |`); }
out.push('', `- 비교 — 지금 자료(옛 리퀘스트 · 던전이 그대로 씀): 들개 150 · 22 · 10 / 멧돼지 260 · 25 · 15 / 도적 180 · 28 · 12 / 슬라임 200 · 18 · 20 (체력 · 공격 · 방어).`);
out.push('');

out.push('## 3. Lv 1 종이를 다섯 직업이 혼자 (장비 없음)', '', `| 틀 | 쪽 | ${CL.join(' | ')} |`, `| --- | :---: |${CL.map(() => ' :---: |').join('')}`);
for (const fr of FR) { const c = cellsOf(fr, 1); out.push(`| ${fr.name} (${fr.giver}) | ${fr.side === 'fight' ? '싸움' : '일 · ' + ST[fr.work]} | ${CL.map((_, k) => { const e = paper([person(k, 0)], c); return tag(e) + (e.fled ? ` (놓침 ${r1(e.fled)})` : ''); }).join(' | ')} |`); }
out.push('', '- 싸움 쪽은 전사, 일 쪽은 그 능력치의 직업이 목표(20박자쯤 · 싸움은 40%쯤)에 맞춘 사람입니다(16-7). 「놓침」 = 달아난 까치의 평균 마릿수.', '');

out.push('## 4. 장비 (16-13) [조정] — F급 · 무기 공격력 7 (다섯 무기 같은 값) · 갑옷은 방어만(체력 보탬 없음) · 정수', '',
  '| | 무기 공격력 | heavy (전사) | light (궁수 · 도적) | robe (마법사 · 성직자) |', '| --- | :---: | :---: | :---: | :---: |',
  '| 지금 | 10 | 방어 10 · 체력 50 | 8 · 40 · 마력 10 | 6 · 30 · 마력 20 |',
  `| **새 값** | **${WEAP}** | **방어 ${DEF[0]}** | **방어 ${DEF[1]}** · 마력 10 | **방어 ${DEF[2]}** · 마력 20 |`, '',
  `(풀어 낸 heavy 방어 = ${r1(DEF_RAW)} → 반올림. 마력 보탬은 지금 값 그대로 둠)`, '');
out.push('전사 혼자 · Lv 1 싸움 종이 (몬스터 칸만) — 장비와 준비물의 값 (16-4 · 16-12):', '', '| 틀 (버릇) | 장비 없음 | F 무기만 | F 갑옷만 | **F 무기 + 갑옷** | 날 세우기 (공격 +20%) | 덧대기 (받는 피해 −20%) | 물약 1병 |', '| --- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |');
for (const fr of fightFr) { const c = cellsOf(fr, 1), e = (g, p) => { const r = paper([person(0, 0, g, p)], c, { fightOnly: true }); return tag(r) + (r.fled ? ` · 놓침 ${r1(r.fled)}` : ''); };
  out.push(`| ${fr.name} (${MON[fr.mon].habit}) | ${e(null)} | ${e(WPN)} | ${e(ARM)} | **${e(GEAR)}** | ${e(null, 'sharp')} | ${e(null, 'pad')} | ${e(null, 'potion')} |`); }
out.push('', `- 평균: 장비 없음 ${r1(bare.beats)}박자 · ${pct(bare.front)} → 무기 ${r1(avgOver(WPN, 'beats'))}박자 (${pct(avgOver(WPN, 'beats') / bare.beats - 1)}) · 갑옷 ${pct(avgOver(ARM, 'front'))} (× ${r2(avgOver(ARM, 'front') / bare.front)}) · 날 세우기 ${r1(avgOver(null, 'beats', 'sharp'))}박자 · ${pct(avgOver(null, 'front', 'sharp'))} · 덧대기 ${pct(avgOver(null, 'front', 'pad'))} · 물약 ${pct(avgOver(null, 'front', 'potion'))}. 목표: 무기 박자 −15% · 갑옷 잃는 체력 × 0.75.`,
  '- 물약은 체력이 30% 아래로 내려갈 때 마심(무릅쓰기 「보통」). Lv 1 혼자에서는 그만큼 깊이 다치는 일이 드물어 값이 작게 나옵니다.', '');

out.push('## 5. Lv 2 · 3 — 둘 · 셋 (Lv 1 기준 사람 · 장비 없음 · 16-10: 양 1 · 1.5 · 2배 · 무리 수 Lv 2 = 앞 칸 1 · 뒤 칸 2 / Lv 3 = 칸마다 2)', '', '목표: Lv 2 둘이 30박자쯤 · 맨 앞 50 ~ 65% / Lv 3 셋이 40박자쯤 · 65 ~ 85%', '',
  '| 틀 | 둘 (전사 +) | Lv 2 | 셋 (+) | Lv 3 | Lv 3 · F 무기 + 갑옷 |', '| --- | --- | :---: | --- | :---: | :---: |');
const duoOf = fr => [0, fr.work === 0 ? 4 : fr.work];   // 둘째 = 그 틀의 일 능력치의 직업(힘이면 도적)
const thirdOf = d => [4, 1, 2].find(c => !d.includes(c));   // 셋째: 성직자 없이(16-1) — 도적 · 궁수 · 마법사 가운데 아직 없는 직업
const sum2 = [], sum3 = [];
for (const fr of FR) {
  const d = duoOf(fr), t = d.concat(thirdOf(d)), P2 = d.map(c => person(c, 0)), P3 = t.map(c => person(c, 0)), P3g = t.map(c => person(c, 0, GEAR));
  const e2 = paper(P2, cellsOf(fr, 2)), e3 = paper(P3, cellsOf(fr, 3)), e3g = paper(P3g, cellsOf(fr, 3)); sum2.push(e2); sum3.push(e3);
  out.push(`| ${fr.name} | ${CL[d[1]]} | ${tag(e2)} | ${CL[t[2]]} | ${tag(e3)} | ${tag(e3g)} |`);
}
const rng = (a, k, f) => `${f(Math.min(...a.map(e => e[k])))} ~ ${f(Math.max(...a.map(e => e[k])))}`;
out.push('', `- 범위: Lv 2 ${rng(sum2, 'beats', r0)}박자 · 맨 앞 ${rng(sum2, 'front', pct)} / Lv 3 ${rng(sum3, 'beats', r0)}박자 · 맨 앞 ${rng(sum3, 'front', pct)}.`,
  '- 맨 앞 = 전사(앞줄 · 체력이 큰 쪽). 일 칸은 그 능력치의 합으로 셈(쓰러진 사람은 빠짐). 무명천 · 잡초 말고 약초의 둘째는 성직자라 치유가 섞임.', '- 일 쪽 틀의 Lv 2는 몬스터 칸이 하나뿐이라 「앞 칸」으로 보아 무리 1로 셈 [읽은 것].', '');

out.push('## 6. 「답」(16-12) — Lv 2 · 전사 + 답 대 전사 + 다른 직업 · 몬스터 칸만 · 박자 20% 이상 줄거나 맨 앞 15%p 이상 덜 잃으면 ○', '', `| 틀 | 답 | ${CL.slice(1).map(c => '전사 + ' + c).join(' | ')} | 판정 |`, `| --- | --- |${CL.slice(1).map(() => ' :---: |').join('')} --- |`);
for (const fr of fightFr.filter(f => !f.byFled)) {
  const r = {}; for (let c = 1; c < 5; c++) r[c] = paper([person(0, 0), person(c, 0)], cellsOf(fr, 2), { fightOnly: true });
  const others = [1, 2, 3, 4].filter(c => !fr.answer.includes(c)), ob = others.reduce((t, c) => t + r[c].beats, 0) / others.length, of_ = others.reduce((t, c) => t + r[c].front, 0) / others.length;
  const best = fr.answer.map(c => ({ c, db: 1 - r[c].beats / ob, df: of_ - r[c].front })), ok = best.some(x => x.db >= 0.2 || x.df >= 0.15);
  out.push(`| ${fr.name} | ${fr.answerWhy} | ${[1, 2, 3, 4].map(c => (fr.answer.includes(c) ? '**' : '') + tag(r[c]) + (fr.answer.includes(c) ? '**' : '')).join(' | ')} | ${ok ? '○' : '✕'} ${best.map(x => `${CL[x.c]} 박자 ${x.db >= 0 ? '−' : '+'}${pct(Math.abs(x.db))} · 체력 ${x.df >= 0 ? '−' : '+'}${r0(Math.abs(x.df) * 100)}%p`).join(' / ')} |`);
}
{ const f = MON.magpie.fleeNote, ok = f.at[4] === 0 && f.at[1] === 0 && f.at[0] >= 0.4 && f.at[0] <= 0.6;
  out.push('', `**까치(반짝이면 다 내 거) — 놓친 마릿수로 (16-12 ⑤ · 혼자 · Lv 1 · 6마리):** fleeBase = **${FLEE_BASE}** → ${CL.map((c, i) => `${c} ${pct(f.at[i])}`).join(' · ')} 놓침 → ${ok ? '○' : '✕'}`,
    `- 도적 · 궁수가 다 잡는 가장 작은 fleeBase = ${f.catchAll} · 전사가 절반 놓치는 fleeBase = ${f.half} (그때 ${CL.map((c, i) => `${c} ${pct(f.atHalf[i])}`).join(' · ')}).`,
    `- 창 = fleeBase × (파티의 가장 높은 기교나 민첩 ÷ 까치 민첩 ${MON.magpie.st[1]}) → 이 값에서 도적 · 궁수 ${r1(FLEE_BASE * 17 / 28)}박자 · 전사 ${r1(FLEE_BASE * 7.5 / 28)}박자.`, ''); }

// ---------- 그 레벨의 기준 양 (15-3 · 16장 「그 밖」: 새 모양 = 무리 · 능력치) ----------
const PLAIN = MON.plain = { key: 'plain', name: '보통 몬스터', habit: '버릇 없음', core: 0, st: [4, 8, 4, 6, 8], def: 8, spdBase: 0.25, pack: 2, hpBase: 0, atkBase: 0 };
solve(PLAIN, 20, 0.40);
{ const v = combatVals(PLAIN);
  out.push('## 7. 그 레벨의 기준 양 — 틀의 개성을 뺀 값 (15-3 · 모르는 몬스터 자리의 셈)', '', `보통 몬스터 = 능력치 ${PLAIN.st.join(' · ')} · hpBase ${PLAIN.hpBase} · atkBase ${PLAIN.atkBase} · def ${PLAIN.def} · spdBase ${PLAIN.spdBase} · pack ${PLAIN.pack} → 체력 ${r0(v.hp)} · 공격력 ${r1(v.atk)} · 빠르기 ${r2(v.speed)} (전사 혼자 Lv 1 · 무리 둘이 20박자 · 40%)`, '',
    '| 레벨 | 몬스터 칸 하나 (보통 몬스터 · 16-10의 무리 수) | 일 칸 하나의 양 | 함정 |', '| :---: | --- | :---: | :---: |');
  for (let lv = 1; lv <= 3; lv++) out.push(`| ${lv} | ${['', '무리 1 (2마리)', '앞 칸 무리 1 (2마리) · 뒤 칸 무리 2 (4마리)', '무리 2 (4마리)'][lv]} | ${workAmt(lv)} | ${trapAmt(lv)} |`);
  out.push(''); }

// ---------- 경험치 (받음 · 16장 「그 밖」) ----------
const TRIPS = 2.5, NODES = 3, GM = G.xpGradeMult || 2, LVA = 160, LVB = 0.23, XPN = 3.2;
const xpAt = w => (Math.min(w, 72) + Math.max(0, w - 72) * GM) * TRIPS * NODES * XPN;
function lvAt(xp) { let lv = 1, x = xp; for (;;) { const need = LVA * Math.pow(lv, LVB); if (x < need || lv >= 70) return lv + x / need; x -= need; lv++; } }
out.push('## 8. 경험치 (받은 값 · lvA 160 · lvB 0.23 · xpNode 3.2)', '', '| | 36주 | 48주 | 72주 | 144주 |', '| --- | :---: | :---: | :---: | :---: |', '| 목표 | 5 | — | 10 | 20 |', `| 예상 (한 주 ${TRIPS}번 · ${NODES}칸 · E급 종이 × ${GM}) | ${[36, 48, 72, 144].map(w => r1(lvAt(xpAt(w)))).join(' | ')} |`, '', '- 참고: 옛 경험치에서 잰 48주 평균 레벨 6.36. 가정(한 주 2.5번)은 봇으로 잴 때 다시 봅니다.', '');

const md = out.join('\n'); console.log(md);
const mi = process.argv.indexOf('--md'); if (mi > 0 && process.argv[mi + 1]) fs.writeFileSync(process.argv[mi + 1], md + '\n');
