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
      const W = gearG >= 0 ? gear(WEAPON[c], gearG) : null, Ar = gearG >= 0 ? gear(ARMOR[c], gearG) : null;
      const sum = k => (W ? W[k] : 0) + (Ar ? Ar[k] : 0);
      const maxHp = C.classHp[c] + a.lv * C.classHpLv[c] + st(0) * C.hpPerStr + sum('hp');
      const maxMp = C.classMp[c] + a.lv * C.classMpLv[c] + st(2) * C.mpPerMind + sum('mp');
      const atk = (C.classAtk[c] + a.lv * C.classAtkLv[c] + sum('atk') + st(c)) * (1 + (mealB || 0));
      return { a, core: c, row: POS[c], hp: maxHp, maxHp, mp: maxMp, maxMp, atk, def: sum('def'), mdef: 0,
        evade: 0, crit: st(1) * C.critPerDex, speed: 1 + st(4) * C.speedPerSkill, agi: st(1),
        heal: c === 3 ? C.healBase + st(3) * C.healPerSpirit : 0, pots: a.pots || 0, potLine: C.potionHp[a.risk], down: false, used: 0 };
    }

    // 전투. units: unit() 배열, enemies: [{hp, atk, def, boss, name}], g: 의뢰 등급, R: 0~1 난수 함수(없으면 고정 씨앗), wantLog: 미니 뷰 기록
    // 기록(log): hit{by,to(적 순번),hp,c(치명타),k(스킬)} · hurt{to,hp} · heal{by,to,hp} · potion{to,hp} · down{to} · wave{n}. r = 라운드
    function fight(units, enemies, g, R, leaderRisk, wantLog) {
      const rnd = R || mulberry(20261111);
      const P = units.map(u => Object.assign({}, u, { gauge: 0 }));
      P.sort((x, y) => POS[x.core] - POS[y.core] || y.maxHp - x.maxHp);                 // 자동 배치: 맨 앞 → 맨 뒤
      const E = enemies.map((e, i) => ({ i, name: e.name, hp: e.hp, maxHp: e.hp, atk: e.atk, def: e.def || 0, boss: !!e.boss, gauge: 0 }));
      const normal = E.filter(e => !e.boss), bosses = E.filter(e => e.boss), gs = groupMax(g), waves = [];
      for (let k = 0; k < normal.length; k += gs) waves.push(normal.slice(k, k + gs));
      for (const b of bosses) waves.push([b]);
      const vary = () => 1 + (rnd() * 2 - 1) * C.dmgVar;
      const potHeal = C.potionHeal[g], retreat = C.retreatHp[leaderRisk], log = wantLog ? [] : null;
      const totalMax = P.reduce((t, u) => t + u.maxHp, 0);
      let round = 0, result = null, wi = 0;
      const push = e => { if (log) log.push(Object.assign({ r: round }, e)); };
      const strike = (u, mult, tgt, k) => {                      // 한 번의 타격: (공격 × 배율 × 흔들림 [× 치명타]) − 방어, 0 미만이면 0
        let d = u.atk * mult * vary(), crit = 0;
        if (rnd() < u.crit) { d *= C.critMult; crit = 1; }
        const dealt = Math.max(0, d - tgt.def); tgt.hp -= dealt;
        push({ t: 'hit', by: u.a.id, to: tgt.i, hp: Math.max(0, tgt.hp), c: crit, k, d: Math.round(dealt), mp: Math.round(u.mp) });
      };
      const front = list => list.find(e => e.hp > 0);
      const behind = (list, e) => { const k = list.indexOf(e); return list.slice(k + 1).find(x => x.hp > 0); };

      while (!result && wi < waves.length) {
        const W = waves[wi]; push({ t: 'wave', n: wi + 1 });
        while (!result && W.some(e => e.hp > 0)) {
          round++;
          const actors = [...P.filter(u => !u.down), ...W.filter(e => e.hp > 0)];
          for (const x of actors) { x.gauge += 100 * (x.speed || 1); x.n = Math.floor(x.gauge / 100); x.gauge -= x.n * 100; }
          const order = actors.slice().sort((x, y) => (y.speed || 1) - (x.speed || 1));
          const maxN = Math.max(0, ...order.map(x => x.n));
          for (let step = 1; step <= maxN && !result; step++) {
            for (const x of order) {
              if (x.n < step) continue;
              if (!W.some(e => e.hp > 0)) break;
              if (x.a) {                                           // 아군 행동
                if (x.down) continue;
                const hurt = P.filter(p => !p.down && p.hp < p.maxHp * 0.5).sort((p, q) => p.hp / p.maxHp - q.hp / q.maxHp)[0];
                if (x.heal && hurt && x.mp >= C.healMp) { x.mp -= C.healMp; const before = hurt.hp; hurt.hp = Math.min(hurt.maxHp, hurt.hp + x.heal); push({ t: 'heal', by: x.a.id, to: hurt.a.id, hp: hurt.hp, d: Math.round(hurt.hp - before), mp: Math.round(x.mp) }); continue; }
                const t0 = front(W); if (!t0) break;
                const cost = skillMp(x.core);
                if (x.core !== 3 && x.mp >= cost && rnd() < skillRate()) {
                  x.mp -= cost;
                  if (x.core === 0 || x.core === 1) { strike(x, 1, t0, 'double'); const t1 = front(W); if (t1) strike(x, 1, t1, 'double'); }        // 더블 스윙 · 연사: 1배 두 번
                  else if (x.core === 2) { const b = behind(W, t0); strike(x, 1.5, t0, 'fire'); if (b) strike(x, 1.5, b, 'fire'); }                // 파이어볼: 대상 + 바로 뒤 1명
                  else strike(x, 1.5, t0, 'stab');                                                                                                    // 급소 찌르기: 1.5배 한 번
                } else strike(x, 1, t0, null);
              } else {                                             // 적 행동: 살아 있는 맨 앞 아군부터
                if (x.hp <= 0) continue;
                const live = P.filter(p => !p.down); if (!live.length) break;
                const tgt = live[0];
                const dealt = Math.max(0, x.atk * vary() - tgt.def); tgt.hp -= dealt;
                if (tgt.hp <= 0) { tgt.hp = 0; tgt.down = true; push({ t: 'hurt', to: tgt.a.id, hp: 0, d: Math.round(dealt) }); push({ t: 'down', to: tgt.a.id }); continue; }
                push({ t: 'hurt', to: tgt.a.id, hp: tgt.hp, d: Math.round(dealt) });
                if (tgt.hp < tgt.maxHp * tgt.potLine && tgt.pots > 0) { tgt.pots--; tgt.used++; const before = tgt.hp; tgt.hp = Math.min(tgt.maxHp, tgt.hp + tgt.maxHp * potHeal); push({ t: 'potion', to: tgt.a.id, hp: tgt.hp, d: Math.round(tgt.hp - before) }); }
              }
            }
          }
          const left = P.reduce((t, u) => t + (u.down ? 0 : u.hp), 0);
          if (!P.some(u => !u.down)) result = 'wipe';
          else if (!W.some(e => e.hp > 0)) { /* 웨이브 종료 */ }
          else if (left < totalMax * retreat) result = 'retreat';
          else if (round >= C.maxRounds) result = 'retreat';
        }
        if (!result) { wi++; if (wi >= waves.length) result = 'win'; else if (P.reduce((t, u) => t + (u.down ? 0 : u.hp), 0) < totalMax * retreat) result = 'retreat'; }
      }
      const enemyLeft = E.reduce((t, e) => t + Math.max(0, e.hp), 0) / Math.max(1, E.reduce((t, e) => t + e.maxHp, 0));
      return { win: result === 'win', result, rounds: round, units: P, hpFrac: P.reduce((t, u) => t + (u.down ? 0 : u.hp), 0) / totalMax, enemyLeft, log };
    }

    // 출발 판단용 예상 성공 확률: 같은 조건으로 고정 씨앗 전투를 여러 번 돌려 이긴 비율을 구함 (같은 입력이면 항상 같은 값)
    function predict(units, enemies, g, leaderRisk) {
      const N = 30; let win = 0;
      for (let k = 0; k < N; k++) if (fight(units, enemies, g, mulberry(9100 + k * 131), leaderRisk, false).win) win++;
      return Math.max(0.02, Math.min(0.98, (win + 0.5) / (N + 1)));
    }

    return { ok: !!C, C, unit, fight, predict, gear, defaultGear, WEAPON, ARMOR, ACC };
  }

  const api = { make, defaultGear, WEAPON, ARMOR, ACC };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.GuildCombat = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
