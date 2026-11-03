/* 의뢰 전투 계산 (docs/design/quest_combat.md, B 기반 C안)
   전투 의뢰의 성패와 대가(체력·물약·부상)를 정한다. 시뮬레이터·게임·미니 뷰가 함께 쓴다.
   수치는 GAME_DATA.balance.combat (data/balance.csv 의 combat 구분). 전투 수치는 5배 단위. */
(function (root) {
  'use strict';
  const GRADES = 'FEDCBAS';
  // 1차 직업(능력치 index): 0 전사(힘) 1 궁수(민첩) 2 마법사(지력) 3 성직자(정신) 4 도적(기교)
  const WEAPON = ['sword', 'bow', 'staff', 'mace', 'dagger'];
  const ARMOR = ['heavy', 'light', 'robe', 'robe', 'light'];
  const ACC = ['ring', 'anklet', 'necklace', 'rosary', 'gloves'];
  const ROW = [0, 1, 2, 2, 0];            // 0 앞줄 1 가운데 2 뒷줄 (적은 앞줄부터 공격)
  // 장비 기본값 (장비 초안 v0.1, 전투 수치 5배). 편집기 gearDefaults 와 같은 식
  const ATK = [10, 18, 28, 40, 55, 72, 92], DM = [8, 14, 22, 32, 44, 58, 74], DS = [3, 6, 9, 13, 18, 24, 30];
  const r5 = x => Math.round(x / 5) * 5;

  function defaultGear(type, g) {
    const k = ATK[g] / 10, o = { atk: 0, def: 0, mdef: 0, hp: 0, mp: 0 };
    if (WEAPON.includes(type)) { o.atk = ATK[g] * 5; if (type === 'sword') o.hp = r5(25 * k); if (type === 'staff') o.mp = r5(25 * k); if (type === 'mace') o.mdef = r5(10 * k); }
    else if (ARMOR.includes(type)) {
      const m = DM[g], sb = DS[g], avg = (m + sb) / 2;
      if (type === 'heavy') { o.def = m * 5; o.mdef = sb * 5; o.hp = r5(60 * k); } else if (type === 'robe') { o.def = sb * 5; o.mdef = m * 5; o.hp = r5(20 * k); } else { o.def = Math.ceil(avg) * 5; o.mdef = Math.floor(avg) * 5; o.hp = r5(40 * k); }
    } else { o.mp = r5((type === 'necklace' ? 30 : 15) * k); if (type === 'rosary') o.mdef = r5(10 * k); }
    return o;
  }

  function make(data) {
    const C = (data && data.balance && data.balance.combat) || null;
    const items = (data && data.content && data.content.items) || [];
    const gearCache = {};
    function gear(type, g) { // 편집기에서 만든 장비가 있으면 그 값, 없으면 기본값
      const key = type + g; if (gearCache[key]) return gearCache[key];
      const it = items.find(i => i.kind === 'gear' && i.gtype === type && i.grade === GRADES[g]);
      return (gearCache[key] = it ? { atk: it.atk || 0, def: it.def || 0, mdef: it.mdef || 0, hp: it.hp || 0, mp: it.mp || 0 } : defaultGear(type, g));
    }

    // 모험가 → 전투 수치. a: { core, lv, risk, spend }, stat(i): 장비 판정 능력치까지 더한 최종 능력치, gearG: 장비 등급(-1 없음)
    function unit(a, stat, gearG, mealB) {
      const c = a.core, st = i => stat(i);
      const W = gearG >= 0 ? gear(WEAPON[c], gearG) : null, Ar = gearG >= 0 ? gear(ARMOR[c], gearG) : null, Ac = gearG >= 0 ? gear(ACC[(c + 2) % 5], gearG) : null;
      const sum = k => (W ? W[k] : 0) + (Ar ? Ar[k] : 0) + (Ac ? Ac[k] : 0);
      const maxHp = C.classHp[c] + a.lv * C.classHpLv[c] + st(0) * C.hpPerStr + sum('hp');
      const maxMp = C.classMp[c] + a.lv * C.classMpLv[c] + (st(2) + st(3)) * C.mpPerMind + sum('mp');
      const atk = (C.classAtk[c] + a.lv * C.classAtkLv[c] + sum('atk') + st(c)) * (1 + (mealB || 0));
      return { a, core: c, row: ROW[c], hp: maxHp, maxHp, mp: maxMp, maxMp, atk, def: sum('def'), mdef: sum('mdef') + st(3) * C.mdefPerSpirit,
        evade: Math.min(C.evadeCap, st(1) * C.evadePerAgi), crit: Math.min(C.critCap, st(4) * C.critPerDex), agi: st(1),
        heal: c === 3 ? C.healBase + st(3) * C.healPerSpirit : 0, pots: a.pots || 0, potLine: C.potionHp[a.risk], down: false, used: 0 };
    }

    // 전투. units: unit() 배열, enemies: [{hp, atk, name}], g: 의뢰 등급, R: 0~1 난수 함수(없으면 기댓값으로 계산)
    // 기록(log, 미니 뷰 재생용): hit{by,to(적 순번),hp,c(치명타)} · miss{to} · hurt{to,hp} · heal{by,to,hp} · potion{to,hp} · down{to}. r = 라운드
    function fight(units, enemies, g, R, leaderRisk, wantLog) {
      const P = units.map(u => Object.assign({}, u)), E = enemies.map(e => ({ name: e.name, hp: e.hp, maxHp: e.hp, atk: e.atk }));
      const exp = !R, rnd = () => (exp ? 0.5 : R());
      const vary = () => (exp ? 1 : 1 + (R() * 2 - 1) * C.dmgVar);
      const potHeal = C.potionHeal[g];
      const retreat = C.retreatHp[leaderRisk];
      const log = wantLog ? [] : null;
      const totalMax = P.reduce((t, u) => t + u.maxHp, 0);
      const order = P.slice().sort((x, y) => y.agi - x.agi);
      let round = 0, result = null;
      while (!result) {
        round++;
        for (const u of order) {
          if (u.down) continue;
          const alive = E.filter(e => e.hp > 0); if (!alive.length) break;
          const hurt = P.filter(x => !x.down && x.hp < x.maxHp * 0.5).sort((x, y) => x.hp / x.maxHp - y.hp / y.maxHp)[0];
          if (u.heal && hurt && u.mp >= C.healMp) { u.mp -= C.healMp; hurt.hp = Math.min(hurt.maxHp, hurt.hp + u.heal); if (log) log.push({ r: round, t: 'heal', by: u.a.id, to: hurt.a.id, hp: hurt.hp }); continue; }
          const tgt = alive.sort((x, y) => x.hp - y.hp)[0];
          let d = u.atk * vary(), crit = 0;
          if (exp) d *= 1 + u.crit * (C.critMult - 1); else if (R() < u.crit) { d *= C.critMult; crit = 1; }
          tgt.hp -= d; if (log) log.push({ r: round, t: 'hit', by: u.a.id, to: E.indexOf(tgt), hp: Math.max(0, tgt.hp), c: crit });
        }
        if (!E.some(e => e.hp > 0)) { result = 'win'; break; }
        for (const e of E) {
          if (e.hp <= 0) continue;
          const live = P.filter(x => !x.down); if (!live.length) break;
          const row = Math.min(...live.map(x => x.row)), tgt = live.filter(x => x.row === row)[0];
          let d = e.atk * 100 / (100 + tgt.def) * vary();
          if (exp) d *= 1 - tgt.evade; else if (R() < tgt.evade) { if (log) log.push({ r: round, t: 'miss', to: tgt.a.id }); continue; }
          tgt.hp -= d;
          if (tgt.hp <= 0) { tgt.hp = 0; tgt.down = true; if (log) log.push({ r: round, t: 'down', to: tgt.a.id }); continue; }
          if (tgt.hp < tgt.maxHp * tgt.potLine && tgt.pots > 0) { tgt.pots--; tgt.used++; tgt.hp = Math.min(tgt.maxHp, tgt.hp + tgt.maxHp * potHeal); if (log) log.push({ r: round, t: 'potion', to: tgt.a.id, hp: tgt.hp }); }
          if (log) log.push({ r: round, t: 'hurt', to: tgt.a.id, hp: tgt.hp });
        }
        const left = P.reduce((t, u) => t + (u.down ? 0 : u.hp), 0);
        if (!P.some(u => !u.down)) result = 'wipe';
        else if (left < totalMax * retreat) result = 'retreat';
        else if (round >= C.maxRounds) result = 'retreat';
      }
      const enemyLeft = E.reduce((t, e) => t + Math.max(0, e.hp), 0) / Math.max(1, E.reduce((t, e) => t + e.maxHp, 0));
      return { win: result === 'win', result, rounds: round, units: P, hpFrac: P.reduce((t, u) => t + (u.down ? 0 : u.hp), 0) / totalMax, enemyLeft, log };
    }

    // 출발 판단용 예상 성공 확률: 기댓값 전투 1회의 여유를 확률로 바꿈 (시뮬레이터로 맞춘 식)
    function predict(units, enemies, g, leaderRisk) {
      const f = fight(units, enemies, g, null, leaderRisk, false);
      const line = C.retreatHp[leaderRisk];
      // 무작위 전투 4,000회로 맞춘 식: 여유(남은 체력 − 후퇴선)가 0.1 이상이면 거의 이김
      if (f.win) return Math.min(0.99, 0.65 + 3.5 * Math.max(0, f.hpFrac - line));
      return Math.max(0.01, 0.3 * Math.pow(1 - f.enemyLeft, 3));
    }

    return { ok: !!C, C, unit, fight, predict, gear, defaultGear, WEAPON, ARMOR, ACC };
  }

  const api = { make, defaultGear, WEAPON, ARMOR, ACC };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.GuildCombat = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
