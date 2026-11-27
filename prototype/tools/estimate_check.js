// 어림셈(estimate · 명세 ③-E)과 도구의 표(전투 규칙을 고정 씨앗 40번)를 틀마다 견줌 (2026-11-27 · 바닥 공사 5의 ① · 명세 덧붙임 「셈하는 법」)
//   게임 코드를 건드리지 않음. 틀과 몬스터는 data/quest_frames_F.json(GAME_DATA.frames)에서 읽음.
//   node prototype/tools/estimate_check.js [--md 파일]
// 「명세의 어림셈」은 명세 ③-E 그대로 + 16장으로 생긴 것 둘(몬스터의 빠르기 · 마법은 방어 무시) — 견줌용. 「고친 어림셈」은 게임의 CB.estimate(combat.js)를 그대로 부름.
//   --guard: 고친 어림셈의 15% 넘는 줄이 GUARD_MAX를 넘으면 실패(종료 코드 1) — 늘 돌리는 검사(.github/workflows)에서 씀
//   몬스터 칸은 무리마다 셈(무리는 차례로 나옴 · 16-1). 성직자: 맨 앞이 50% 아래로 내려간 만큼을 마력이 닿는 만큼 치유로 뺌. 물약: 무릅쓰기의 선 아래로 내려가면 한 병만큼 뺌.
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const JS = path.join(__dirname, '..', 'js');
const ctx = { console, Math, JSON, Date }; ctx.window = ctx; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(JS, 'data_gen.js'), 'utf8'), ctx, { filename: 'data_gen.js' });
// 16장의 전투 규칙(몬스터의 빠르기 · 치명타 · 마법은 방어 무시 · 파이어볼은 무리 전체 · 덧대기)은 2026-11-27 바닥 5에서 combat.js에 들어감 — 흉내 내지 않고 그대로 씀
const csrc = fs.readFileSync(path.join(JS, 'combat.js'), 'utf8');
vm.runInContext(csrc, ctx, { filename: 'combat.js' });
const GD = ctx.GAME_DATA, B = GD.balance, CB = ctx.GuildCombat.make(GD), C = B.combat, G = B.growth, FD = GD.frames;
const CL = ['전사', '궁수', '마법사', '성직자', '도적'];
const r0 = Math.round, r1 = x => Math.round(x * 10) / 10, pct = x => r0(x * 100) + '%';
const RISK = 1, SEEDS = 40, GUARD_MAX = 1;   // 지킴이 (A세션 2026-11-27 17:55): 고친 어림셈이 15% 넘게 어긋나는 줄이 이보다 늘면 알림 (지금 1줄 · 올림 셈을 넣기 전 3줄)
function mulberry(seed) { let a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// 기준 사람 (node_amounts.js와 같음 · F 첫 묶음 · Lv 1 · 장비 없음)
function person(core) {
  const st = [0, 1, 2, 3, 4].map(i => i === core ? 17 : 7.5);
  const a = { core, lv: 1, risk: RISK, spend: 1, social: 1, stage: 1, line: [core], stats: st, sp: null, quirk: null, pots: 0 };
  const u = CB.unit(a, i => st[i], -1, 0); delete u.a; return Object.assign(u, { stats: st, core, name: CL[core] });
}
const MON = FD.monsters;
const mv = k => { const m = MON[k]; return { hp: m.hpBase + m.st[0] * C.hpPerStr, atk: m.atkBase + m.st[m.core] * C.atkPerCore[m.core], crit: m.st[1] * C.critPerDex, speed: m.spdBase + m.st[4] * C.speedPerSkill, def: m.def, flee: m.flee, dex: m.st[1] }; };
const wavesOf = c => { const out = []; for (let w = 0; w < c.waves; w++) out.push(c.boss && w === c.waves - 1 ? [c.boss] : Array(MON[c.mon].pack).fill(c.mon)); return out; };

// ---------- 도구의 셈 (전투 규칙 · 고정 씨앗) ----------
function fightCell(party, hp, mp, c, R) {
  const enemies = [], waves = [];
  for (const wv of wavesOf(c)) { const ids = []; for (const k of wv) { const v = mv(k); ids.push(enemies.length); enemies.push({ name: MON[k].name, mon: k, hp: v.hp, atk: v.atk, def: v.def, speed: v.speed, crit: v.crit, boss: !!MON[k].boss }); } waves.push(ids); }
  const st = CB.begin(party.map((u, k) => Object.assign({}, u, { hp: hp[k], mp: mp[k], id: k })), enemies, 0, RISK, {}); st.waves = waves; st.done = !waves.length;
  const m = mv(c.mon), win = m.flee ? FD.fleeBase * Math.max(...party.map(u => Math.max(u.stats[1], u.stats[4]))) / m.dex : 0;
  let wi = -1, w0 = 0;
  while (!st.done) { if (st.wi !== wi) { wi = st.wi; w0 = st.round; } if (win && st.round - w0 >= win) for (const i of st.waves[st.wi]) st.E[i].hp = 0; CB.step(st, R); }
  for (const u of st.P) { hp[u.k] = u.down ? 0 : u.hp; mp[u.k] = u.mp; }
  return { beats: st.round, ok: st.result === 'win' };
}
function simOnce(party, cells, seed) {
  const R = mulberry(seed), hp = party.map(u => u.maxHp), mp = party.map(u => u.maxMp); let b = 0, ok = true;
  for (const c of cells) {
    if (c.k === 'M') { const r = fightCell(party, hp, mp, c, R); b += r.beats; if (!r.ok) { ok = false; break; } }
    else if (c.k === 'W') b += c.amt / party.reduce((t, u, k) => t + (hp[k] > 0 ? u.stats[c.stat] : 0), 0);
    else { const t = c.amt / party.reduce((t, u) => t + u.stats[4], 0); if (t > 5) { b += 5; party.forEach((u, k) => { hp[k] = Math.max(0, hp[k] - u.maxHp * 0.3); }); } else b += t; }
  }
  return { beats: b, front: 1 - hp[0] / party[0].maxHp, ok };
}
function sim(party, cells, n, base) { let b = 0, f = 0, fail = 0; const each = []; for (let s = 0; s < n; s++) { const r = simOnce(party, cells, (base || 4400) + s * 977); b += r.beats; f += r.front; if (!r.ok) fail++; each.push(r); } return { beats: b / n, front: f / n, fail: fail / n, each }; }

// ---------- 어림셈 (명세 ③-E · 굴리지 않음) ----------
function estimate(party, cells, worse) {
  const X = worse ? 1.15 : 1, hp = party.map(u => u.maxHp), lost = party.map(() => 0); let beats = 0;
  const dmgTo = (u, def) => Math.max(0, u.atk - (u.core === 2 ? 0 : def)) * (u.speed || 1);
  for (const c of cells) {
    if (c.k === 'M') {
      for (const wv of wavesOf(c)) {
        const vs = wv.map(mv), sumHp = vs.reduce((t, v) => t + v.hp * X, 0), def = vs[0].def;
        const dmg = party.reduce((t, u, k) => t + (lost[k] < hp[k] ? dmgTo(u, def) : 0), 0), t = dmg > 0 ? sumHp / dmg : 999; beats += t;
        let take = vs.reduce((s, v) => s + Math.max(0, v.atk * X - party[0].def) * v.speed, 0) * t / 2;   // (적 공격 − 방어) × 빠르기 × 마릿수 × 박자 ÷ 2
        for (let k = 0; k < party.length && take > 0; k++) { const can = hp[k] - lost[k], d = Math.min(can, take); lost[k] += d; take -= d; }
      }
    } else if (c.k === 'W') beats += c.amt * X / party.reduce((t, u, k) => t + (lost[k] < hp[k] ? u.stats[c.stat] : 0), 0);
    else { const t = c.amt * X / party.reduce((t, u) => t + u.stats[4], 0); if (t > 5) { beats += 5; party.forEach((u, k) => { lost[k] += u.maxHp * 0.3; }); } else beats += t; }
  }
  // 성직자: 맨 앞이 50% 아래로 내려간 만큼을, 마력이 닿는 만큼 치유로 뺌 · 물약: 선 아래로 내려가면 한 병
  const cl = party.findIndex(u => u.core === 3);
  if (cl >= 0) { const can = Math.floor(party[cl].maxMp / C.healMp) * party[cl].heal, over = Math.max(0, lost[0] - hp[0] * 0.5); lost[0] -= Math.min(over, can); }
  if (party[0].pots > 0 && lost[0] > hp[0] * (1 - party[0].potLine)) lost[0] -= Math.min(lost[0], hp[0] * C.potionHeal[0]);
  return { beats, front: Math.min(1, lost[0] / hp[0]), down: lost[0] >= hp[0] };
}


// ---------- 고친 어림셈 = 게임의 estimate (combat.js · 결정 20-1) ----------
const estimate2 = (P, cells) => CB.estimate(P.map(u => Object.assign({}, u, { hp: u.maxHp, mp: u.maxMp })), cells, { MON, fleeBase: FD.fleeBase });

// ---------- 견줄 사람들 (node_amounts.js와 같은 「알맞은 인원」) ----------
const duoOf = fr => [0, fr.work === 0 ? 4 : fr.work], thirdOf = d => [4, 1, 2].find(c => !d.includes(c));
const partyOf = (fr, lv) => { const d = duoOf(fr); return (lv === 1 ? [fr.side === 'fight' ? 0 : fr.work] : lv === 2 ? d : d.concat(thirdOf(d))).map(person); };

const out = [], rows = [];
out.push('# 어림셈(estimate)과 도구의 표 — 틀마다 견줌 (바닥 공사 5의 ① · 2026-11-27)', '');
out.push(`도구 = 전투 규칙을 고정 씨앗 ${SEEDS}번 돌린 평균(4번의 표와 같음) · 어림셈 = 명세 ③-E의 손셈(적힌 양) + 16장의 둘(몬스터의 빠르기 · 마법은 방어 무시). 사람은 「알맞은 인원」(Lv 1 혼자 · Lv 2 둘 · Lv 3 셋 · 장비 없음). 어긋남 = (어림셈 − 도구) ÷ 도구 · 맨 앞은 %p.`, '');
out.push('| 틀 | Lv | 사람 | 박자 도구 → 어림셈 (어긋남) | 맨 앞 도구 → 어림셈 (%p) | 15% 넘음 | 고친 어림셈: 박자 · 맨 앞 |', '| --- | :---: | --- | --- | --- | :---: | --- |');
for (const fr of FD.frames) for (let lv = 1; lv <= 3; lv++) {
  const P = partyOf(fr, lv), cells = fr.lv[lv - 1], s = sim(P, cells, SEEDS), e = estimate(P, cells), db = (e.beats - s.beats) / s.beats, df = e.front - s.front;
  const bad = Math.abs(db) > 0.15 || Math.abs(df) > 0.15, e2 = estimate2(P, cells), db2 = (e2.beats - s.beats) / s.beats, df2 = e2.front - s.front; rows.push({ fr, lv, db, df, bad, s, e, P, cells, db2, df2, bad2: Math.abs(db2) > 0.15 || Math.abs(df2) > 0.15 });
  out.push(`| ${fr.name} | ${lv} | ${P.map(u => u.name).join(' + ')} | ${r0(s.beats)} → ${r0(e.beats)} (${db >= 0 ? '+' : ''}${pct(db)}) | ${pct(s.front)} → ${pct(e.front)} (${df >= 0 ? '+' : ''}${r0(df * 100)}) | ${bad ? '✕' : ''} | ${r0(e2.beats)} (${db2 >= 0 ? '+' : ''}${pct(db2)}) · ${pct(e2.front)} (${df2 >= 0 ? '+' : ''}${r0(df2 * 100)})${Math.abs(db2) > 0.15 || Math.abs(df2) > 0.15 ? ' ✕' : ''} |`);
}
const nb = rows.filter(r => r.bad).length, mb = rows.reduce((t, r) => t + Math.abs(r.db), 0) / rows.length, mf = rows.reduce((t, r) => t + Math.abs(r.df), 0) / rows.length;
const nb2 = rows.filter(r => r.bad2).length, mb2 = rows.reduce((t, r) => t + Math.abs(r.db2), 0) / rows.length, mf2 = rows.reduce((t, r) => t + Math.abs(r.df2), 0) / rows.length;
out.push('', `- 30줄 가운데 15% 넘게 어긋난 줄: 명세의 어림셈 **${nb}** (평균 박자 ${pct(mb)} · 맨 앞 ${r0(mf * 100)}%p) → 고친 어림셈 **${nb2}** (평균 박자 ${pct(mb2)} · 맨 앞 ${r0(mf2 * 100)}%p).`, '');

// Lv 1 다섯 직업 혼자 (싸움 쪽) — 「누가 갈 수 있나」를 가르는 자리
out.push('## Lv 1 싸움 종이를 다섯 직업이 혼자 (맨 앞이 잃는 체력 · 도구 → 명세의 어림셈 / 고친 어림셈)', '', `| 틀 | ${CL.join(' | ')} |`, `| --- |${CL.map(() => ' :---: |').join('')}`);
for (const fr of FD.frames.filter(f => f.side === 'fight')) out.push(`| ${fr.name} | ${CL.map((_, c) => { const P = [person(c)], s = sim(P, fr.lv[0], SEEDS), e = estimate(P, fr.lv[0]); const e2 = estimate2(P, fr.lv[0]); return `${pct(s.front)}${s.fail ? '✕' : ''} → ${pct(e.front)}${e.down ? '✕' : ''} / ${pct(e2.front)}${e2.down ? '✕' : ''}`; }).join(' | ')} |`);
out.push('', '- ✕ = 도구에서 물러남/전멸이 나온 판이 있음 · 어림셈에서 쓰러짐.', '');

// 「고정 씨앗 한두 번 돌리기」 안: 한 번 · 두 번의 값이 40번 평균에서 얼마나 벗어나는지와 한 번의 시간
{ const one = [], two = []; let t0 = process.hrtime.bigint(), calls = 0;
  for (const r of rows) { const a = simOnce(r.P, r.cells, 4400), b = simOnce(r.P, r.cells, 4400 + 977); calls += 2;
    one.push({ b: Math.abs(a.beats - r.s.beats) / r.s.beats, f: Math.abs(a.front - r.s.front) }); two.push({ b: Math.abs((a.beats + b.beats) / 2 - r.s.beats) / r.s.beats, f: Math.abs((a.front + b.front) / 2 - r.s.front) }); }
  const per = Number(process.hrtime.bigint() - t0) / 1e6 / calls; let te = process.hrtime.bigint(); for (let i = 0; i < 20; i++) for (const r of rows) estimate(r.P, r.cells); const perE = Number(process.hrtime.bigint() - te) / 1e6 / (20 * rows.length); te = process.hrtime.bigint(); for (let i = 0; i < 20; i++) for (const r of rows) estimate2(r.P, r.cells); const perE2 = Number(process.hrtime.bigint() - te) / 1e6 / (20 * rows.length);
  const avg = (a, k) => a.reduce((t, x) => t + x[k], 0) / a.length, mx = (a, k) => Math.max(...a.map(x => x[k]));
  out.push('## 안: 어림셈을 「고정 씨앗 한두 번 돌리기」로', '',
    '| | 박자 어긋남 (평균 · 가장 큼) | 맨 앞 어긋남 (평균 · 가장 큼) | 한 번의 시간 |', '| --- | --- | --- | --- |',
    `| 어림셈 (손셈) | ${pct(mb)} · ${pct(Math.max(...rows.map(r => Math.abs(r.db))))} | ${r0(mf * 100)}%p · ${r0(Math.max(...rows.map(r => Math.abs(r.df))) * 100)}%p | ${r1(perE * 1000)}µs |`,
    `| 고친 어림셈 | ${pct(mb2)} · ${pct(Math.max(...rows.map(r => Math.abs(r.db2))))} | ${r0(mf2 * 100)}%p · ${r0(Math.max(...rows.map(r => Math.abs(r.df2))) * 100)}%p | ${r1(perE2 * 1000)}µs |`,
    `| 씨앗 한 번 | ${pct(avg(one, 'b'))} · ${pct(mx(one, 'b'))} | ${r0(avg(one, 'f') * 100)}%p · ${r0(mx(one, 'f') * 100)}%p | ${r1(per * 1000)}µs |`,
    `| 씨앗 두 번 (평균) | ${pct(avg(two, 'b'))} · ${pct(mx(two, 'b'))} | ${r0(avg(two, 'f') * 100)}%p · ${r0(mx(two, 'f') * 100)}%p | ${r1(per * 2000)}µs |`, '');
  module.exports = { per, perE };
}
const md = out.join('\n');
if (process.argv.includes('--guard')) {
  const n2 = rows.filter(r => r.bad2).length;
  console.log(`어림셈 지킴이: 고친 어림셈이 15% 넘게 어긋난 줄 ${n2} / ${rows.length} (한도 ${GUARD_MAX})${n2 > GUARD_MAX ? ' — 늘었습니다: ' + rows.filter(r => r.bad2).map(r => r.fr.name + ' Lv' + r.lv).join(' · ') : ''}`);
  process.exit(n2 > GUARD_MAX ? 1 : 0);
}
console.log(md);
const mi = process.argv.indexOf('--md'); if (mi > 0 && process.argv[mi + 1]) fs.writeFileSync(process.argv[mi + 1], md + '\n');
