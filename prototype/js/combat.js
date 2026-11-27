/* 의뢰 전투 계산 (docs/design/quest_combat.md → 2026-11 개편: docs/balance/equip_enhance_v1.md · monster_v1.md)
   전투 의뢰의 성패와 대가(체력·물약·부상)를 정한다. 시뮬레이터·게임·미니 뷰가 함께 쓴다.
   수치는 GAME_DATA.balance.combat (data/balance.csv 의 combat 구분).
   규칙: 피해 = 공격 − 방어 (0이면 0, 최소 피해 없음) · 한 줄 대열(앞에서부터 맞고 앞의 적부터 때림) ·
         웨이브(그룹 단위로 싸우고 체력·마력 이월, 보스는 마지막에 혼자) · 1차 스킬 20% 발동(성직자 제외, 마력 소모) ·
         기교 = 공격 속도(행동 게이지) · 민첩 = 치명타 확률(상한 없음) */
(function (root) {
  'use strict';
  const GRADES = 'FEDCBAS';
  // 1차 직업(능력치 index): 0 전사(힘) 1 궁수(민첩) 2 마법사(지력) 3 성직자(정신) 4 도적(기교)
  const WEAPON = ['sword', 'bow', 'staff', 'mace', 'dagger'];
  const ARMOR = ['heavy', 'light', 'robe', 'robe', 'light'];
  const ACC = ['ring', 'anklet', 'necklace', 'rosary', 'gloves'];
  const POS = [0, 1, 1, 2, 0];            // 자동 배치 묶음: 0 앞(전사·도적, 체력 높은 순) 1 가운데(궁수·마법사) 2 맨 뒤(성직자)

  // 장비 기본값 (편집기에 아이템이 없는 등급용). 방어구 방어: 중갑 10 + 15×등급, 경갑 −2, 로브 −4 / 체력 (50|40|30)×순번 / 마력 (0|10|20)×순번 / 무기 공격 10 + 15×등급
  function defaultGear(type, g) {
    const n = g + 1, o = { atk: 0, def: 0, mdef: 0, hp: 0, mp: 0 };
    if (WEAPON.includes(type)) o.atk = 10 + 15 * g;
    else if (type === 'heavy') { o.def = 10 + 15 * g; o.hp = 50 * n; }
    else if (type === 'light') { o.def = 8 + 15 * g; o.hp = 40 * n; o.mp = 10 * n; }
    else if (type === 'robe') { o.def = 6 + 15 * g; o.hp = 30 * n; o.mp = 20 * n; }
    return o;
  }

  function mulberry(seed) { let a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  function make(data) {
    const C = (data && data.balance && data.balance.combat) || null;
    const QB = (data && data.balance && data.balance.quirk) || null, QD = (data && data.quirks) || [];   // 2026-11-20 버릇
    const DB = (data && data.balance && data.balance.dungeon) || null, DGS = (data && data.dungeons) || {};   // 2026-11-20 던전 (특별 장비 · 방)
    const DGI = {}; for (const k in DGS) for (const it of DGS[k].items || []) DGI[it.key] = Object.assign({ dg: k }, it);
    const DGMON = {}; for (const k in DGS) { for (const r in DGS[k].rooms) for (const p in DGS[k].rooms[r]) for (const f of DGS[k].rooms[r][p]) DGMON[f.m] = k; }
    const items = (data && data.content && data.content.items) || [];
    const gearCache = {};
    function gear(type, g) { // 편집기에서 만든 장비가 있으면 그 값, 없으면 기본값
      const key = type + g; if (gearCache[key]) return gearCache[key];
      const it = items.find(i => i.kind === 'gear' && i.gtype === type && i.grade === GRADES[g]);
      return (gearCache[key] = it ? { atk: it.atk || 0, def: it.def || 0, mdef: 0, hp: it.hp || 0, mp: it.mp || 0 } : defaultGear(type, g));
    }
    const skillMp = i => (C.skillMp || [20, 20, 30, 0, 15])[i];
    const skillRate = () => (C.skillRate != null ? C.skillRate : 0.2);
    const groupMax = g => (C.groupMax || [2, 3, 4, 4, 5, 6, 6])[g] || 2;

    // 모험가 → 전투 수치. a: { core, lv, risk, spend }, stat(i): 장비 판정 능력치까지 더한 최종 능력치, gearG: 장비 등급(-1 없음)
    function unit(a, stat, gearG, mealB) {
      const c = a.core, st = i => stat(i);
      const gw = Array.isArray(gearG) ? gearG[0] : gearG, ga = Array.isArray(gearG) ? gearG[1] : gearG;   // 2026-11-18: 장비 3칸 [무기, 방어구, 장신구] 또는 예전 한 벌 등급
      const W = gw >= 0 ? gear(WEAPON[c], gw) : null, Ar = ga >= 0 ? gear(ARMOR[c], ga) : null;
      const sum = k => (W ? W[k] : 0) + (Ar ? Ar[k] : 0);
      const qk = a.quirk && QB ? a.quirk : null;   // 2026-11-20 버릇 상시 장점: 다혈질 공격 + · 술꾼 체력 + · 헌신 감싸기 (수치 balance.csv quirk)
      // 2026-11-20 던전 특별 장비 (a.sp = [무기, 방어구, 장신구] 키): 장비 수치 + · 세트 2부위(체력 · 공격 +) · 3부위(그 던전 몬스터 상대 ×, 어디서나 공격 ×) · 레어(파티 전원 공격 ×, fight에서)
      const SP = DB && DB.on && Array.isArray(a.sp) ? a.sp.map(k => DGI[k]).filter(it => it && (it.rare ? DB.rare : DB.set)) : [];
      const spS = k => SP.reduce((t, it) => t + (it[k] || 0), 0), setN = {}; for (const it of SP) if (it.set) setN[it.set] = (setN[it.set] || 0) + 1;
      const set2 = Object.values(setN).some(n => n >= 2), set3 = Object.keys(setN).find(k => setN[k] >= 3);
      // 2026-11-27 바닥 ② · ②-A (2-2): 레벨이 전투값에 바로 닿지 않음 — 체력 = hpBase + 힘 × hpPerStr · 마력 = mpBase + 지력 × mpPerMind · 공격력 = atkBase + 주력 × atkPerCore. 설정이 없으면 옛 식(class*)
      const NEWF = !!(C.hpBase && C.atkBase);
      const maxHp = (NEWF ? C.hpBase[c] : C.classHp[c] + a.lv * C.classHpLv[c]) + st(0) * C.hpPerStr + sum('hp') + (qk === 'drunk' ? QB.drunkHp : 0) + spS('hp') + (set2 ? DB.setHp : 0);
      const maxMp = (NEWF ? C.mpBase[c] : C.classMp[c] + a.lv * C.classMpLv[c]) + st(2) * C.mpPerMind + sum('mp');
      const atk = ((NEWF ? C.atkBase[c] + st(c) * C.atkPerCore[c] : C.classAtk[c] + a.lv * C.classAtkLv[c] + st(c)) + sum('atk') + (qk === 'hot' ? QB.hotAtk : 0) + spS('atk') + (set2 ? DB.setAtk : 0)) * (1 + (mealB || 0)) * (set3 ? 1 + DB.set3Atk : 1);
      let vs = null; if (set3) { vs = {}; for (const m in DGMON) if (DGMON[m] === DGI[SP.find(it => it.set === set3).key].dg) vs[m] = 1 + DB.set3Vs; }
      return { a, core: c, row: POS[c], hp: maxHp, maxHp, mp: maxMp, maxMp, atk, def: sum('def') + spS('def'), mdef: 0, vs, rare: SP.some(it => it.rare),
        evade: 0, crit: st(1) * C.critPerDex, speed: 1 + st(4) * C.speedPerSkill, agi: st(1), skill: st(4), stat: [st(0), st(1), st(2), st(3), st(4)],   // stat: 일 칸 · 함정의 셈 (2026-11-27 바닥 5)
        heal: c === 3 ? C.healBase + st(3) * C.healPerSpirit : 0, pots: a.pots || 0, potLine: C.potionHp[a.risk], down: false, used: 0, cover: qk === 'devoted' ? QB.devotedCover : 0 };
    }

    // 전투. units: unit() 배열, enemies: [{hp, atk, def, boss, name}], g: 의뢰 등급, R: 0~1 난수 함수(없으면 고정 씨앗), wantLog: 미니 뷰 기록
    // 기록(log): hit{by,to(적 순번),hp,c(치명타),k(스킬)} · hurt{to,hp} · heal{by,to,hp} · potion{to,hp} · down{to} · wave{n}. r = 라운드
    // 2026-11-27 바닥 공사 「짓는 차례」 1 (명세 ②-D): 한 번에 끝까지 돌던 것을 begin(상태 만들기) · step(한 라운드) · end(결과)로 나눔.
    //   규칙은 그대로. 상태(st)에는 함수도 모험가 객체도 넣지 않음 — 난수는 step에 넘기고, 아군은 .ally · .id로 가리킴.
    //   30라운드에서 물러나는 것(maxRounds)은 begin의 opt.maxRounds로만 켬 — fight(옛 길)는 켜고, 박자로 도는 새 원정은 끔(기한이 대신함 · 3-2).
    function begin(units, enemies, g, leaderRisk, opt) {
      opt = opt || {};
      const P = units.map((u, k) => { const o = Object.assign({}, u, { gauge: 0, ally: true, id: u.id != null ? u.id : (u.a ? u.a.id : undefined), k }); delete o.a; return o; });   // 2026-11-27 바닥 ①: 상태에는 모험가 객체를 넣지 않고 아이디만 (저장할 때 모험가가 두 번 적히지 않게). k = 넘겨받은 순번
      P.sort((x, y) => POS[x.core] - POS[y.core] || y.maxHp - x.maxHp);                 // 자동 배치: 맨 앞 → 맨 뒤
      const E = enemies.map((e, i) => ({ i, name: e.name, mon: e.mon, hp: e.hp, maxHp: e.hp, atk: e.atk, def: e.def || 0, boss: !!e.boss, gauge: 0, speed: e.speed || 1, crit: e.crit || 0 }));   // 2026-11-27 바닥 5 (16-3): 몬스터의 빠르기 · 치명타 (옛 몬스터는 1 · 0)
      if (DB && DB.on && DB.rare && P.some(u => u.rare)) for (const u of P) if (!u._rp) { u.atk *= 1 + DB.rareParty; u._rp = 1; }   // 2026-11-20 레어 장신구: 같은 파티 전원 공격 + (방을 이어 가도 한 번만)
      const normal = E.filter(e => !e.boss), bosses = E.filter(e => e.boss), gs = groupMax(g), waves = [];   // 물결은 적의 순번(i)으로 적음 (저장할 수 있게)
      for (let k = 0; k < normal.length; k += gs) waves.push(normal.slice(k, k + gs).map(e => e.i));
      for (const b of bosses) waves.push([b.i]);
      return { P, E, waves, g, potHeal: C.potionHeal[g], retreat: C.retreatHp[leaderRisk], maxRounds: opt.maxRounds || 0,
        totalMax: P.reduce((t, u) => t + u.maxHp, 0), round: 0, wi: 0, open: false, selfChecked: false, result: null, done: waves.length === 0, log: opt.log ? [] : null };
    }

    // 한 라운드. 물결이 바뀌는 일(새 물결 알림 · 물결을 다 잡은 뒤의 판정)도 여기서 함. 끝나면 st.done
    function step(st, R) {
      if (st.done) return st;
      const rnd = R || mulberry(20261111);
      const { P, E } = st, C_ = C;
      const W = st.waves[st.wi].map(i => E[i]);
      const push = e => { if (st.log) st.log.push(Object.assign({ r: st.round }, e)); };
      const vary = () => 1 + (rnd() * 2 - 1) * C_.dmgVar;
      const strike = (u, mult, tgt, k) => {                      // 한 번의 타격: (공격 × 배율 × 흔들림 [× 치명타]) − 방어, 0 미만이면 0
        let d = u.atk * mult * vary() * ((u.vs && tgt.mon && u.vs[tgt.mon]) || 1), crit = 0;   // 2026-11-20 세트 3부위: 그 던전 몬스터 상대 ×
        if (rnd() < u.crit) { d *= C_.critMult; crit = 1; }
        const dealt = Math.max(0, d - (u.core === 2 ? 0 : tgt.def)); tgt.hp -= dealt;   // 2026-11-27 바닥 5 (16-5): 마법사의 공격은 방어를 무시
        push({ t: 'hit', by: u.id, to: tgt.i, hp: Math.max(0, tgt.hp), c: crit, k, d: Math.round(dealt), mp: Math.round(u.mp) });
      };
      const front = list => list.find(e => e.hp > 0);
      const behind = (list, e) => { const k = list.indexOf(e); return list.slice(k + 1).find(x => x.hp > 0); };
      const alive = () => P.reduce((t, u) => t + (u.down ? 0 : u.hp), 0);
      if (!st.open) { st.open = true; push({ t: 'wave', n: st.wi + 1 }); }
      if (W.some(e => e.hp > 0)) {
        st.round++;
        const actors = [...P.filter(u => !u.down), ...W.filter(e => e.hp > 0)];
        for (const x of actors) { x.gauge += 100 * (x.speed || 1); x.n = Math.floor(x.gauge / 100); x.gauge -= x.n * 100; }
        const order = actors.slice().sort((x, y) => (y.speed || 1) - (x.speed || 1));
        const maxN = Math.max(0, ...order.map(x => x.n));
        for (let k = 1; k <= maxN && !st.result; k++) {
          for (const x of order) {
            if (x.n < k) continue;
            if (!W.some(e => e.hp > 0)) break;
            if (x.ally) {                                        // 아군 행동
              if (x.down) continue;
              const hurt = P.filter(p => !p.down && p.hp < p.maxHp * 0.5).sort((p, q) => p.hp / p.maxHp - q.hp / q.maxHp)[0];
              if (x.heal && hurt && x.mp >= C_.healMp) { x.mp -= C_.healMp; const before = hurt.hp; hurt.hp = Math.min(hurt.maxHp, hurt.hp + x.heal); push({ t: 'heal', by: x.id, to: hurt.id, hp: hurt.hp, d: Math.round(hurt.hp - before), mp: Math.round(x.mp) }); continue; }
              const t0 = front(W); if (!t0) break;
              const cost = skillMp(x.core);
              if (x.core !== 3 && x.mp >= cost && rnd() < skillRate()) {
                x.mp -= cost;
                if (x.core === 0 || x.core === 1) { strike(x, 1, t0, 'double'); const t1 = front(W); if (t1) strike(x, 1, t1, 'double'); }        // 더블 스윙 · 연사: 1배 두 번
                else if (x.core === 2) { for (const e of W) if (e.hp > 0) strike(x, 1.5, e, 'fire'); }                // 파이어볼: 앞에 나온 무리 전체 (2026-11-27 바닥 5 · 16-11)
                else strike(x, 1.5, t0, 'stab');                                                                                                    // 급소 찌르기: 1.5배 한 번
              } else strike(x, 1, t0, null);
            } else {                                             // 적 행동: 살아 있는 맨 앞 아군부터
              if (x.hp <= 0) continue;
              const live = P.filter(q => !q.down); if (!live.length) break;
              let tgt = live[0];
              if (tgt.hp < tgt.maxHp * 0.3) { const cv = live.find(q => q !== tgt && q.cover && q.hp >= q.maxHp * q.cover); if (cv) { if (!cv.covered) push({ t: 'cover', by: cv.id, to: tgt.id }); cv.covered = (cv.covered || 0) + 1; tgt = cv; } }   // 2026-11-20 헌신: 위기(체력 30% 아래)의 동료 대신 맞음
              const dealt = Math.max(0, x.atk * vary() * (x.crit && rnd() < x.crit ? C_.critMult : 1) - tgt.def) * (tgt.dmgTaken || 1); tgt.hp -= dealt;   // 2026-11-27 바닥 5: 몬스터의 치명타(16-2 · 치명타가 있는 몬스터만 굴림) · 덧대기(받는 피해 ×)
              if (tgt.hp <= 0) { tgt.hp = 0; tgt.down = true; push({ t: 'hurt', to: tgt.id, hp: 0, d: Math.round(dealt) }); push({ t: 'down', to: tgt.id }); continue; }
              push({ t: 'hurt', to: tgt.id, hp: tgt.hp, d: Math.round(dealt) });
              if (tgt.hp < tgt.maxHp * tgt.potLine && tgt.pots > 0) { tgt.pots--; tgt.used++; const before = tgt.hp; tgt.hp = Math.min(tgt.maxHp, tgt.hp + tgt.maxHp * st.potHeal); push({ t: 'potion', to: tgt.id, hp: tgt.hp, d: Math.round(tgt.hp - before) }); }
              if (tgt.flee && tgt.hp < tgt.maxHp * tgt.flee) { tgt.down = true; tgt.fled = 'coward'; push({ t: 'flee', to: tgt.id, why: 'coward' }); }   // 2026-11-20 겁쟁이: 「위험」 전투에서 체력이 낮으면 혼자 물러남 (쓰러짐과 달리 부상 없음)
            }
          }
        }
        let left = alive();
        if (!st.selfChecked && left < st.totalMax * (P.find(u => u.selfP)?.selfAt || 0)) { st.selfChecked = true; for (const u of P) if (u.selfP && !u.down && rnd() < u.selfP) { u.down = true; u.fled = 'selfish'; push({ t: 'flee', to: u.id, why: 'selfish' }); left -= u.hp; } }   // 2026-11-20 이기적: 파티가 기울면 혼자 후퇴 (전투당 1번 판정, 이기적이 있을 때만 난수)
        if (!P.some(u => !u.down)) st.result = 'wipe';
        else if (!W.some(e => e.hp > 0)) { /* 물결 끝 — 아래에서 */ }
        else if (left < st.totalMax * st.retreat) st.result = 'retreat';
        else if (st.maxRounds && st.round >= st.maxRounds) st.result = 'retreat';
      }
      if (!st.result && !W.some(e => e.hp > 0)) {                 // 이 물결을 다 잡음 → 다음 물결 또는 승리
        st.wi++; st.open = false;
        if (st.wi >= st.waves.length) st.result = 'win';
        else if (alive() < st.totalMax * st.retreat) st.result = 'retreat';
      }
      if (st.result) st.done = true;
      return st;
    }

    // 결과 — 옛 fight가 돌려주던 모양 그대로
    function end(st) {
      const { P, E } = st;
      const enemyLeft = E.reduce((t, e) => t + Math.max(0, e.hp), 0) / Math.max(1, E.reduce((t, e) => t + e.maxHp, 0));
      return { win: st.result === 'win', result: st.result, rounds: st.round, units: P, hpFrac: P.reduce((t, u) => t + (u.down ? 0 : u.hp), 0) / st.totalMax, enemyLeft, foesLeft: E.map(e => Math.max(0, e.hp)), log: st.log };   // foesLeft: 적마다 남은 체력 (침공 재참전용, 2026-11-16)
    }

    // 옛 길: 한 번 부르면 끝까지 (30라운드에서 물러남). 리퀘스트 · 던전 · 침공 · 상단 호위와 지금의 게시판 의뢰가 씀
    function fight(units, enemies, g, R, leaderRisk, wantLog) {
      const rnd = R || mulberry(20261111);
      const st = begin(units, enemies, g, leaderRisk, { log: wantLog, maxRounds: C.maxRounds });
      while (!st.done) step(st, rnd);
      const r = end(st); for (const u of r.units) if (units[u.k]) u.a = units[u.k].a;   // 옛 길을 부르는 곳은 u.a를 읽으므로 돌려줄 때 다시 붙임
      return r;
    }

    // 출발 판단용 예상 성공 확률: 같은 조건으로 고정 씨앗 전투를 여러 번 돌려 이긴 비율을 구함 (같은 입력이면 항상 같은 값)
    function predict(units, enemies, g, leaderRisk) {
      const N = 30; let win = 0;
      for (let k = 0; k < N; k++) if (fight(units, enemies, g, mulberry(9100 + k * 131), leaderRisk, false).win) win++;
      return Math.max(0.02, Math.min(0.98, (win + 0.5) / (N + 1)));
    }

    // ---------- 버릇 (2026-11-20 야간 작업, docs/design/proposal_quirks_v1.md · data/quirks.csv · balance.csv quirk) ----------
    //   게임(game_core.js)과 시뮬레이터(sim_engine.js)가 같은 규칙을 쓰도록 여기 모음. 버릇이 없는 모험가 · rate 0이면 난수를 쓰지 않음
    //   원칙: 장점은 늘, 리스크는 가끔 · 보호 구간(safeWeeks 전)에는 리스크 없음 · 토박이(애착 homeAt 이상)는 리스크 × homeMul
    const QK = {
      list: QD,
      byKey: k => QD.find(q => q.key === k) || null,
      roll(R, a, Qc) {   // 새 모험가에게 버릇 1개 또는 null. 막는 성향(허세꾼 ↛ 무모, 겁쟁이 ↛ 신중)은 고르지 않음
        if (!Qc || !(Qc.rate > 0) || !QD.length) return null;
        if (R() >= Qc.rate) return null;
        const ok = QD.filter(q => !q.block || a[q.block[0]] !== q.block[1]);
        return ok.length ? ok[Math.floor(R() * ok.length)].key : null;
      },
      risk(Qc, a, week, p) { if (!Qc || !a || week < (Qc.safeWeeks || 0)) return 0; return p * (a.attach >= Qc.homeAt ? Qc.homeMul : 1); },
      rainy(seed, week) {   // 비 오는 달 (lobby_sky.js calendar 와 같은 식 — 그림과 규칙이 같은 달에 비) · 2026-11-23: 첫 달은 비 없음
        const h = n => { n = (n ^ 61) ^ (n >>> 16); n = n + (n << 3); n ^= n >>> 4; n = Math.imul(n, 0x27d4eb2d); return (n ^ (n >>> 15)) >>> 0; };
        const w = Math.max(0, week || 0), mAbs = Math.floor(w / 4), mo = (2 + mAbs) % 12 + 1;
        return mAbs > 0 && mo >= 3 && mo <= 8 && h(mAbs * 7919 + 13 + ((seed >>> 0) % 100003) * 131) % 100 < 20;
      },
      xpMul(Qc, a, rivalHere) { if (!Qc || !a || !a.quirk) return 1; return 1 + (a.quirk === 'selfish' ? Qc.selfishXp : 0) + (a.quirk === 'rival' && rivalHere ? Qc.rivalXp : 0); },
      // 전투 직전: 상황에 따른 장점 · 리스크를 유닛에 적용하고, 터진 일(로그용)과 후퇴 기준(leaderRisk)을 돌려줌
      //   ctx: { Qc, week, R, p(출발 승산), risk(대장 성향), ate(a)→bool, dish(먹을 요리가 있었나), bad(a,b)→서먹, pal(a,b)→단짝 }
      prep(units, ctx) {
        const Qc = ctx.Qc, ev = []; let risk = ctx.risk;
        if (!Qc || !units.some(u => u.a.quirk)) return { ev, risk };
        const A = units.map(u => u.a);
        for (const u of units) {
          const a = u.a, k = a.quirk; if (!k) continue;
          if (k === 'coward' && ctx.p < 0.4) u.flee = Qc.cowardFlee;   // 장점: 「위험」 전투에서만
          if (k === 'selfish' && !A.some(b => b !== a && ctx.pal && ctx.pal(a, b))) { u.selfP = QK.risk(Qc, a, ctx.week, Qc.selfishFlee); u.selfAt = Qc.selfishAt; }
          if (k === 'glutton' && ctx.dish && !ctx.ate(a) && ctx.R() < QK.risk(Qc, a, ctx.week, Qc.glutHunger)) { u.atk *= Qc.glutHungerMul; u.hp *= Qc.glutHungerMul; u.maxHp *= Qc.glutHungerMul; ev.push({ k: 'hunger', id: a.id }); }
          if (k === 'hot' && ctx.bad) { const b = A.find(x => x !== a && ctx.bad(a, x)); if (b && ctx.R() < QK.risk(Qc, a, ctx.week, Qc.hotFight)) { const ub = units.find(z => z.a === b); u.atk = Math.max(0, u.atk - Qc.hotFightAtk); ub.atk = Math.max(0, ub.atk - Qc.hotFightAtk); ev.push({ k: 'quarrel', id: a.id, with: b.id }); } }
          if (k === 'rival' && risk < 2 && A.some(b => b !== a && b.grade === a.grade) && ctx.R() < QK.risk(Qc, a, ctx.week, Qc.rivalRush)) { risk = Math.min(2, risk + 1); ev.push({ k: 'rush', id: a.id }); }
        }
        return { ev, risk };
      },
      injAdj(Qc, a, u, week) { if (!Qc || !a || !a.quirk) return 0; if (a.quirk === 'drunk') return -Qc.drunkInj; if (a.quirk === 'devoted' && u && u.covered && week >= (Qc.safeWeeks || 0)) return Qc.devotedInj; return 0; }
    };

    // ---------- 던전 (2026-11-20, docs/design/proposal_dungeon_v1.md) — 게임 · 시뮬레이터 공용 규칙 ----------
    const MONS = ((data && data.content && data.content.monsters) || []);
    const DG = {
      list: DGS, items: DGI,
      on: Dc => !!(Dc && Dc.on && Object.keys(DGS).length),
      foes(d, room, path, mul) {   // 방의 적 목록 (몬스터 표 · 던전 보스) × 배율
        const R = d.rooms[room] || {}, L = R[path] || R.base || R.safe || []; const out = [];
        for (const f of L) { const m = d.mobs[f.m] || MONS.find(x => x.id === f.m); if (!m) continue; for (let k = 0; k < f.n; k++) out.push({ name: m.name, mon: f.m, hp: m.hp * mul, atk: m.atk * mul, def: m.def || 0, boss: !!(d.mobs[f.m]) }); }
        return out;
      },
      chip: p => p >= 0.7 ? 0 : p >= 0.4 ? 1 : 2,   // 승산 칩 여유 · 팽팽 · 위험 (화면과 같은 기준)
      // 대장의 성향 · 버릇대로 고름 (사용자 결정: 안 고르면 성향대로): 무모 · 경쟁심 · 허세꾼 = 위험 / 계속, 신중 · 겁쟁이 = 안전 / 귀환, 보통 = 반반
      lean(lead, R) { if (lead.quirk === 'coward') return -1; if (lead.quirk === 'rival' || lead.quirk === 'bluff') return 1; return lead.risk === 2 ? 1 : lead.risk === 0 ? -1 : (R() < 0.5 ? 1 : -1); },
      path(lead, R, Dc) { return Dc.branch ? (DG.lean(lead, R) > 0 ? 'risky' : 'safe') : 'safe'; },
      // 원정 한 번: units(unit() 배열)을 방마다 이어 싸움 — 후퇴선에 닿으면 귀환 (전멸까지 안 감). choose(kind, ctx) 가 있으면 플레이어 선택(화면 단계), 없으면 성향대로
      run(d, units, lead, risk, R, Dc, opt) {
        opt = opt || {}; const keep = !!opt.cleared, rooms = []; let U = units, cleared3 = false, boss = false, last = null, risky = 0, mats = 0, rare = 0;
        const foeMul = p => (keep ? Dc.foeKeep : 1) * (p === 'risky' ? Dc.foeRisky : p === 'safe' ? Dc.foeSafe : 1);
        const order = ['1', '2', '3']; let curRisk = risk;
        for (let i = 0; i < order.length + 1; i++) {
          let room = order[i], path = 'base';
          if (i >= 3) {   // 방 3 뒤 「계속 / 귀환」
            if (!Dc.cont || !d.rooms['4']) break;
            const hp = U.reduce((t, u) => t + (u.down ? 0 : u.hp), 0) / Math.max(1, U.reduce((t, u) => t + u.maxHp, 0));
            let go = false;
            if (hp >= Dc.contHp) { go = opt.choose ? opt.choose('cont', { hp }) : DG.lean(lead, R) > 0; if (go === undefined) return { rooms, units: U, cleared3, boss, risky, mats, rare, last, pending: { kind: 'cont', hp: Math.round(hp * 100) } }; }   // 2026-11-21 화면 단계: 아직 안 고름 → 여기서 멈춤
            rooms.push({ ask: 'cont', go: !!go, hp: Math.round(hp * 100) }); if (!go) break;
            room = '4'; if (Dc.push) curRisk = Math.min(2, curRisk + 1);
          } else if (i > 0 && d.rooms[room] && (d.rooms[room].risky || d.rooms[room].safe)) {
            if (opt.choose && Dc.branch) { const c = opt.choose('path', { room }); if (c === undefined) return { rooms, units: U, cleared3, boss, risky, mats, rare, last, pending: { kind: 'path', room } }; path = c ? 'risky' : 'safe'; }
            else path = DG.path(lead, R, Dc);
            rooms.push({ ask: 'path', room, path }); if (path === 'risky') risky++;
          }
          const foes = DG.foes(d, room, path, foeMul(path)), r = DB && C ? fight(U, foes, d.g, R, curRisk, !!opt.log) : null; if (!r) break;
          last = { room, path, foes, r }; rooms.push({ room, path, result: r.result, log: r.log });
          U = r.units;
          if (r.result !== 'win') break;
          mats += Dc.matRoom + (path === 'risky' ? Dc.matRisky : 0) + (room === '4' ? Dc.matBoss : 0); if (R() < Dc.rareMat) rare++;
          if (room === '3') cleared3 = true; if (room === '4') boss = true;
        }
        return { rooms, units: U, cleared3, boss, risky, mats, rare, last };
      },
      odds(d, units, lead, risk, Dc, cleared, how) {   // 출발 승산 = 방 1~3을 안전한 길로 끝까지 갈 확률 (고정 씨앗 20번, 체력이 방 사이로 이어짐 — 한 번 싸움으로 보는 predict보다 정확)
        const N = 20, D2 = Object.assign({}, Dc, { cont: 0 }); let win = 0;
        for (let k = 0; k < N; k++) if (DG.run(d, units, lead, risk, mulberry(9300 + k * 137), D2, { cleared, choose: how === 'lean' ? null : () => how === 'risky' }).cleared3) win++;
        return Math.max(0.02, Math.min(0.98, (win + 0.5) / (N + 1)));
      },
      prog(Dc, p0, res) { if (!res.cleared3) return Dc.progFail; return (Dc.progOk[DG.chip(p0)] || 0) + Dc.progRisky * res.risky + (res.boss ? Dc.progBoss : 0); }
    };


    // ---------- 새 의뢰 (2026-11-27 바닥 공사 5 · 명세 ③-E · 결정 20-1 「고친 어림셈」) ----------
    // 몬스터 표(GAME_DATA.frames.monsters)의 한 줄 → 전투값. 모험가와 같은 식 (16-2): 체력 = hpBase + 힘 × hpPerStr · 공격력 = atkBase + 주력 × atkPerCore · 치명타 = 민첩 × critPerDex · 빠르기 = spdBase + 기교 × speedPerSkill
    function monUnit(m, key) {
      return { name: m.name, mon: key, hp: m.hpBase + m.st[0] * C.hpPerStr, atk: m.atkBase + m.st[m.core] * C.atkPerCore[m.core], def: m.def || 0,
        crit: m.st[1] * C.critPerDex, speed: m.spdBase + m.st[4] * C.speedPerSkill, boss: !!m.boss, flee: !!m.flee, dex: m.st[1] };
    }
    // 칸 하나의 무리들 → [[몬스터 키…]…]. 끝 무리는 우두머리가 대신할 수 있음 (c.boss)
    function wavesOf(c, MON) { const out = []; for (let w = 0; w < c.waves; w++) out.push(c.boss && w === c.waves - 1 ? [c.boss] : Array((MON[c.mon] || {}).pack || 1).fill(c.mon)); return out; }
    // 달아나기까지의 박자 (16-6): fleeBase × (파티에서 가장 높은 기교나 민첩 ÷ 그 몬스터의 민첩)
    const fleeWin = (P, m, fleeBase) => m.flee && fleeBase ? fleeBase * Math.max(...P.map(u => Math.max(u.agi || 0, u.skill || 0))) / Math.max(1, m.dex) : 0;
    // 어림셈 — 굴리지 않고 평균값으로 한 번. P = unit() 배열(앞에서부터 맨 앞 → 뒤 · hp는 지금 값) · cells = 남은 칸 · o: { MON, worse, fleeBase, seenMon(k), seenTrap, base(lv) }
    //   고친 것 다섯 (도구의 표와 견줌 · tools/estimate_check.js): ① 무리 안에서 앞에서부터 하나씩 쓰러지고 게이지가 0에서 차므로 처음 한 대가 늦음 ② 치명타의 기댓값 ③ 파이어볼은 무리 전체
    //   ④ 달아나는 무리는 창에서 끊김 ⑤ 성직자는 50% 아래로 내려갈 때마다 한 번씩 · 그리고 ⑥ 한 마리를 잡는 타수를 올림으로 셈(남는 피해가 버려짐)
    //   모르는 몬스터(15-3)의 칸은 그 레벨의 「보통 몬스터」로, 모르는 함정(15-2)은 셈하지 않음
    function estimate(P, cells, o) {
      o = o || {}; const MON = o.MON, X = o.worse ? 1.15 : 1, cm = C.critMult, sr = skillRate();
      const hp = P.map(u => u.hp), lost = P.map(() => 0); let beats = 0;
      const up = k => lost[k] < hp[k];
      for (const c of cells) {
        if (c.done) continue;
        if (c.k === 'M') {
          const unknown = o.seenMon && !o.seenMon(c.mon) && o.plain;
          const cc = unknown ? { mon: o.plain, waves: c.waves } : c;
          for (const wv of wavesOf(cc, MON)) {
            const vs = wv.map(k => monUnit(MON[k], k)), n = vs.length, alive = (n + 1) / 2, live = P.filter((u, k) => up(k));
            if (!live.length) break;
            let t = vs.reduce((sum, v) => sum + 1 / Math.max(1e-9, live.reduce((r, u) => {
              const hit = Math.max(1e-9, u.atk * (1 + (u.crit || 0) * (cm - 1)) - (u.core === 2 ? 0 : v.def));
              const fire = u.core === 2 && u.mp >= skillMp(2) ? (1 - sr) + sr * 1.5 * alive : 1;
              return r + (u.speed || 1) * fire / Math.ceil(v.hp * X / hit - 1e-9); }, 0)), 0);
            const win = fleeWin(live, vs[0], o.fleeBase); if (win && t > win) t = win;
            beats += t;
            let take = vs.reduce((sum, v, i) => sum + Math.max(0, v.atk * X * (1 + v.crit * (cm - 1)) - P[0].def) * (P[0].dmgTaken || 1) * Math.max(0, t * (i + 1) / n * v.speed - 0.5), 0);
            for (let k = 0; k < P.length && take > 0; k++) { const d = Math.min(hp[k] - lost[k], take); lost[k] += d; take -= d; }
          }
        } else if (c.k === 'W') { const sum = P.reduce((t, u, k) => t + (up(k) ? (u.stat ? u.stat[c.stat] : 0) : 0), 0); beats += sum > 0 ? c.amt * X / sum : 999; }
        else if (c.k === 'T') { if (o.seenTrap === false) continue; const sum = P.reduce((t, u) => t + (u.stat ? u.stat[4] : 0), 0), t = sum > 0 ? c.amt * X / sum : 99; if (t > 5) { beats += 5; P.forEach((u, k) => { lost[k] += u.maxHp * 0.3; }); } else beats += t; }
      }
      const cl = P.findIndex(u => u.core === 3);
      if (cl >= 0) { let heals = Math.floor((P[cl].mp || 0) / C.healMp); while (heals > 0 && lost[0] > 0 && hp[0] - lost[0] < P[0].maxHp * 0.5) { lost[0] = Math.max(0, lost[0] - P[cl].heal); heals--; } }
      P.forEach((u, k) => { if (u.pots > 0 && hp[k] - lost[k] < u.maxHp * u.potLine && hp[k] - lost[k] > 0) lost[k] = Math.max(0, lost[k] - u.maxHp * C.potionHeal[0] * Math.min(u.pots, 1)); });
      const left = P.map((u, k) => Math.max(0, hp[k] - lost[k]) / u.maxHp);
      return { beats, left, front: 1 - left[0], low: Math.min(...left), down: left.some(x => x <= 0) };
    }

    return { ok: !!C, C, unit, fight, begin, step, end, predict, gear, defaultGear, WEAPON, ARMOR, ACC, QK, DG, monUnit, wavesOf, fleeWin, estimate };
  }

  const api = { make, defaultGear, WEAPON, ARMOR, ACC };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.GuildCombat = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
