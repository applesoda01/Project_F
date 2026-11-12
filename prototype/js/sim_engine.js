/* 이세계 모험가 길드 — 밸런스 시뮬레이터 엔진 v0.1
   주 단위로 진행(1개월 = 4주, 1년 = 48주). 모든 수치는 CFG에서 바꿀 수 있음. */
(function (root) {
  'use strict';
  const GR = ['F', 'E', 'D', 'C', 'B', 'A', 'S'];
  const ST = ['힘', '민첩', '지력', '정신', '기교'];
  const WPM = 4, WPY = 48;

  function baseDefaults() { // 코드에 박힌 기본값 (data/balance.csv 가 없을 때만 그대로 쓰임)
    return {
      run: { runs: 100, maxYears: 20, seed: 1 },
      quest: {
        ref: [15, 25, 35, 45, 60, 75, 90],        // 판정 기준치
        reqCount: [1, 1, 2, 2, 3, 3, 4],           // 요구 능력치 수
        reward: [100, 200, 400, 800, 1500, 3000, 6000],
        weeks: [1, 1, 1, 2, 2, 2, 3],              // 소요 주
        perMonth: 10,                              // 기본 월 유입량
        boardCap: [18, 18, 18, 18, 18, 18, 18],   // 2026-11-12 프로토타입: 처음부터 18칸
        expireWeeks: 4,                            // 게시 후 만료까지 주
        trustExpire: 1,                            // 만료 시 신뢰도 하락
        trustSucc: 1, trustFail: 2,
        upBoardWeeks: 1,                           // 게시판 업그레이드: 의뢰 기한 +주                // 의뢰 성공·실패 시 신뢰도 (2026-11-12 정수화, 예전 0.3·0.6)
        partyAssist: 0.25,                         // 파티원 보조 계수
        deathBase: [0.01, 0.01, 0.03, 0.03, 0.05, 0.05, 0.08],
        subGrowth: 0.2,                            // 성공 시 유형 능력치 성장
        bossMult: 1.15                             // 보스급 기준치 배수
      },
      growth: {
        xpBase: 80, xpGradeMult: 2.0,              // 성공 경험치 = xpBase × mult^등급
        xpFailRate: 0.3,
        lvA: 20, lvB: 1.55,                        // 다음 레벨 필요 경험치 = A × Lv^B
        lvCap: [30, 40, 50],
        trainPerWeek: 0.10,                        // 훈련장·도서관 주간 훈련량
        statCap: 100
      },
      adv: {
        arrivalPerMonth: 0.8, arrivalPerGrade: 0.10,       // arrivalPerGrade: 명성 도입 전 공식 (참고용, 지금은 쓰지 않음)
        startCount: 5, startCore: 15, startOther: 6,
        attachSuccess: 2, attachPerMonthInTown: 1,
        visitBaseWeeks: 2,
        leaveAfterYears: 2, leaveAttach: 20,
        heirDelayWeeks: 24,
        departTh: [0.70, 0.55, 0.35], seekTh: [0.30, 0.50, 0.70]   // 출발 기준(신중|보통|무모), 동료 찾는 기준(독불장군|보통|사교적)
      },
      econ: {
        startGold: 3000, feeBase: 0.10, feePerInfo: 0.02,
        subsidy: [300, 500, 800, 1200, 2000, 3000, 4500],
        buildCost: [0, 2000, 4000, 8000, 15000, 30000, 0],
        upkeepRate: 0,   // 2026-11-05 시설 유지비 없앰 (balance.csv와 같게)
        tavernPerAdvWeek: 4, tavernGradeMult: 1.6,
        resaleRate: 0.08,
        effectCost: [0.10, 0.20, 0.35],
        effectOpen: 0,                             // 시설 효과 개방 (0 = 끔. 2026-11-12: 프로토타입 게임에는 없으므로 시뮬레이터도 끔)
        mealPriceRate: 0.15, mealMargin: 0.60, mealBuyRate: [0.30, 0.60, 0.90],
        officeCost: 1000,                          // 집무실 건설비 (2026-11-12, F급)
        upgradeCost: [500, 1000, 2000, 4000, 8000, 15000, 30000],   // 시설 업그레이드 비용 (시설 등급별)
        upMargin: 5, upSell: 3,                    // 주점 업그레이드 마진 +G, 판매 창구 업그레이드 소재 +G
        drinkMargin: [2, 3, 4, 5, 6, 7, 8],        // 술 1잔 길드 마진 (2026-11-12, F·E 확정, D 이상 가안). 확률은 mealBuyRate
        mealBonus: [0.03, 0.04, 0.045, 0.05, 0.06, 0.05, 0.07], mealUnlockChance: 0.5, mealPerDish: 0.02
      },
      gear: {
        weaponPrice: [150, 400, 1000, 2500, 6000, 14000, 30000], setMult: 3.0,
        weaponStat: [3, 5, 8, 12, 16, 21, 27], armorStat: [1, 2, 4, 6, 8, 10, 13],
        accStat: [2, 3, 5, 7, 10, 13, 17], weaponAtk: [10, 18, 28, 40, 55, 72, 92],
        reserveMult: [2.0, 1.0, 0.3]               // 절약 / 보통 / 낭비
      },
      promo: {
        N: [2, 3, 3, 4, 4, 5],
        upAccept: 0.1,                             // 관리소 업그레이드: 전직 수락 확률 +10%p (2026-11-12)
        bossRefillWeeks: 6,
        invasionScale: 16, raidScale: 4, battleK: 6, battleDeathWin: 0.01, battleDeathLoss: 0.03,
        raidMonths: [8, 6, 5, 4, 3],
        sCandidates: 2
      },
      fame: {                                    // 명성 [가안]: 높을수록 모험가가 많이 찾아옴 (방문 수 = 기본 × 신뢰도 보정 × 명성 보정)
        succ: [1, 2, 3, 4, 5, 6, 8],              // 의뢰 성공 시 등급별 상승 (2026-11-12 정수화, D 이상 가안)
        fail: [1, 2, 3, 4, 5, 6, 8],              // 의뢰 실패 시 등급별 하락 (2026-11-12 정수화, D 이상 가안)
        gradeUp: [0, 25, 50, 75, 100, 125, 150],  // 길드 승급 시 상승
        maxBonus: 0.6, full: 500, cap: 1000       // 명성 보정 = 1 + 0.6 × min(1, 명성/500) → 최대 1.6배 (명성 도입 전 S급 보정과 같음)
      },
      town: {
        startPop: 150, growthBase: 0.012, growthPerGrade: 0.002, perResident: 1,
        stages: [300, 1000, 3000, 8000], inflowMult: [1.0, 1.3, 1.6, 2.0, 2.5],
        raidLoss: 0.05, invasionLoss: 0.10
      },
      ending: {
        officerScale: [4.0, 4.3, 4.6], demonScale: 6.0,
        demonPopMult: [1.0, 1.0, 1.0, 0.85, 0.70],
        rebirthYear: 15, rebirthTotal: 300,
        mainRetryWeeks: 8, demonRetryWeeks: 24,
        demonHeirFallbackYear: 8
      }
    };
  }
  // 밸런스 수치는 data/balance.csv → prototype/js/data_gen.js 에서 읽어 기본값을 덮어쓴다 (게임·시뮬레이터 공통)
  function gameData() {
    if (typeof window !== 'undefined' && window.GAME_DATA) return window.GAME_DATA;
    if (typeof require === 'function' && typeof __dirname !== 'undefined') {
      const path = require('path');
      for (const p of ['data_gen.js', '../prototype/js/data_gen.js']) { try { return require(path.join(__dirname, p)); } catch (e) { /* 다음 경로 */ } }
    }
    return null;
  }
  // 의뢰 전투 계산 (combat.js). 없으면 예전처럼 모든 의뢰를 능력치 판정으로
  function combatLib() {
    if (root && root.GuildCombat) return root.GuildCombat;
    if (typeof require === 'function' && typeof __dirname !== 'undefined') { try { return require(require('path').join(__dirname, 'combat.js')); } catch (e) { /* 없음 */ } }
    return null;
  }
  // 소재 편집기의 기본 의뢰 35칸(data/collegium_data.json → GAME_DATA.content). 없으면 balance 값만 씀
  function questTemplates() {
    const G = gameData(), m = {};
    if (G && G.content) for (const q of G.content.quests) if ((q.board || q.core) && q.type >= 0) { const k = q.type + '_' + 'FEDCBAS'.indexOf(q.grade); (m[k] = m[k] || [])[q.core ? 'unshift' : 'push'](q); }
    return m;
  }
  function defaults() {
    const d = baseDefaults(), G = gameData();
    if (G && G.balance) for (const sec in G.balance) for (const k in G.balance[sec]) if (d[sec] && k in d[sec]) d[sec][k] = JSON.parse(JSON.stringify(G.balance[sec][k]));
    return d;
  }

  // 플레이어 성향(봇)
  const BOTS = {
    balanced: { name: '균형형', bossTh: 0.60, promoteTh: 0.60, filterFocus: 0.5, buildEffects: 1 },
    elite:    { name: '정예형', bossTh: 0.50, promoteTh: 0.50, filterFocus: 0.8, buildEffects: 0.5 },
    nurture:  { name: '육성형', bossTh: 0.70, promoteTh: 0.85, filterFocus: 0.2, buildEffects: 1.5 },
    safe:     { name: '안전형', bossTh: 0.75, promoteTh: 0.75, filterFocus: 0.4, buildEffects: 1 }
  };

  // 시설: [이름, 등급]
  const FAC = [
    ['관리소', 1], ['집무실', 1], ['훈련장', 2], ['창고', 2], ['추모실', 2],
    ['정보실', 3], ['의무실', 3], ['도서관', 3], ['해체장', 4], ['휴게실', 5], ['명예의 전당', 5]
  ];
  const PROMO_FAC = [null, '관리소', '훈련장', '의무실', '해체장', '명예의 전당']; // F→E … A→S

  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0; let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function simulate(cfg, botKey, seed) {
    const TPL = questTemplates();
    const CL = combatLib(), CB = CL ? CL.make(gameData()) : null, COMBAT = !!(CB && CB.ok);   // 전투 의뢰 = 적이 있는 의뢰
    // 요리 (docs/design/cooking.md): meals.csv 메뉴 + 편집기 요리 레시피. 시뮬레이터는 '재료가 다 모이면 바로 만드는' 플레이어로 가정 (게임 autoCook과 같음)
    const STATS_ = ['힘', '민첩', '지력', '정신', '기교'], DISH_FX = (e => { const m = /\+\s*(\d+(?:\.\d+)?)%/.exec(e || ''); if (!m) return { stats: [], pct: 0 }; const part = (e || '').slice(0, m.index); return { stats: part.includes('모든 능력치') ? [0, 1, 2, 3, 4] : STATS_.map((n, i) => part.includes(n) ? i : -1).filter(i => i >= 0), pct: +m[1] / 100 }; });
    const DISH = (() => { const G = gameData(); if (!G || !G.meals) return []; return G.meals.map(m => { const it = G.content && G.content.items.find(i => i.kind === 'food' && i.name === m.name); return Object.assign({ name: m.name, g: 'FEDCBAS'.indexOf(m.grade), mats: it ? (it.recipe || []).map(r => r.m) : [] }, DISH_FX((it && it.desc) || m.effect)); }).filter(d => d.mats.length); })();
    const MEAL_N = 'FEDCBAS'.split('').map(g => { const G = gameData(); return ((G && G.meals) || []).filter(m => m.grade === g).length || 2; });   // 등급별 요리 수 (meals.csv)
    const R = rng(seed);
    const bot = BOTS[botKey];
    const Q = cfg.quest, G = cfg.growth, A = cfg.adv, E = cfg.econ, GE = cfg.gear, P = cfg.promo, T = cfg.town, EN = cfg.ending;
    const ri = n => Math.floor(R() * n);
    const pick = arr => arr[ri(arr.length)];

    const s = {
      week: 0, grade: 0, gold: E.startGold, pop: T.startPop, trust: 50, fame: 0,
      op: 0, built: {}, eff: {}, meals: [0, 0, 0, 0, 0, 0, 0], mats: {}, dishes: {}, advs: [], board: [], nextId: 1,
      boss: [], bossDone: 0, bossRefill: [], invasionCooldown: 0,
      nextRaid: P.raidMonths[0] * WPM, heirsQueue: [],
      phase: 'normal', officer: 0, mainCooldown: 0, demonFlagFallback: false, ended: false, rebirthAdded: false,
      st: { reach: [0, null, null, null, null, null, null], end: null, endRebirth: false, deaths: 0, battleDeaths: 0, heirs: 0,
        qDone: 0, qFail: 0, raidsW: 0, raidsL: 0, invW: 0, invL: 0, goldYear: [], advYear: [], fameYear: [], trustYear: [], lvYear: [], popYear: [],
        firstNetF: [], firstStage2: null, firstStage3: null, lvAt2: [], lvAt3: [], demonAwake: false, demonFallback: false,
        negMonths: 0, mealIncome: 0, combatQ: 0, combatWin: 0, gearFx: [[0, 0], [0, 0], [0, 0], [0, 0]], injuries: 0, potionsUsed: 0, potionGold: 0, questDeaths: 0, mealsUnlocked: [], officerFails: 0, demonFails: 0, rebirth: false, facWeek: {} }
    };
    for (const f of ['게시판', '접수대', '주점', '판매창구']) s.built[f] = true;

    const has = f => !!s.built[f];
    const effN = f => s.eff[f] || 0;
    const popStage = () => { let k = 0; for (const t of T.stages) if (s.pop >= t) k++; return k; };
    const feeRate = () => E.feeBase + E.feePerInfo * effN('정보실');

    function newAdv(opts) {
      opts = opts || {};
      const core = opts.core != null ? opts.core : ri(5);
      const stats = [0, 0, 0, 0, 0].map((_, i) => i === core ? A.startCore + R() * 4 : A.startOther + R() * 3);
      const g = opts.grade || 0;
      const a = {
        id: s.nextId++, core, stage: 1, pair: null, cls: 'base', stats, lv: 1, xp: 0, bank: 0,
        grade: 0, ach: 0, attach: opts.attach || 0, risk: opts.risk != null ? opts.risk : ri(3), spend: ri(3), social: ri(3),
        wallet: 0, gear: -1, pots: 0, busy: 0, alive: true, joined: s.week, heirOf: opts.heirOf || null, heirWeek: opts.heirOf ? s.week : null,
        demonHeir: !!opts.demonHeir, demonMark: false, rebirth: !!opts.rebirth, external: g > 0
      };
      if (g > 0) { // 외부 고등급 방문자: 등급에 맞게 성장시킴
        for (let i = 0; i < 5; i++) a.stats[i] += Q.ref[g] * (i === core ? 0.9 : 0.4);
        a.lv = [1, 5, 10, 18, 26, 35, 45][g]; a.grade = g; a.stage = g >= 3 ? 2 : 1;
        if (a.stage === 2) { a.pair = [core, (core + 1 + ri(4)) % 5]; a.cls = 'combo'; }
      }
      s.advs.push(a); return a;
    }

    function finalStat(a, i) {
      let v = Math.min(G.statCap, a.stats[i]);
      if (a.gear >= 0) {
        if (i === a.core) v += GE.weaponStat[a.gear] + GE.accStat[a.gear];
        if (a.pair && a.pair.includes(i) && i !== a.core) v += GE.armorStat[a.gear];
      }
      return v;
    }
    const power = a => { let t = 0; for (let i = 0; i < 5; i++) t += finalStat(a, i); return t + (a.gear >= 0 ? GE.weaponAtk[a.gear] : 0) * 0.5; };
    const skillBonus = a => [0.03, 0.06, 0.10][a.stage - 1];

    function makeQuest(g, boss) {
      const type = ri(5);
      const n = Q.reqCount[g];
      const req = [type];
      while (req.length < n) { const k = ri(5); if (!req.includes(k)) req.push(k); }
      const C = boss ? null : TPL[type + '_' + g], T = !C ? null : C.length > 1 ? C[Math.floor(R() * C.length)] : C[0];   // 칸 후보 중 하나 (1개면 난수 안 씀)
      const req2 = T && T.stats && T.stats.length ? T.stats.slice() : req;
      const R0 = (T ? T.ref : Q.ref[g]) * n * (0.85 + R() * 0.30) * (boss ? Q.bossMult : 1);
      const enemies = [], seen = [];
      if (COMBAT && T && T.enemies) {
        // 개체 차이: 실제 적은 게시된 정보보다 강하거나 약할 수 있음(±enemyVar). 정보실이 있으면 예측이 실제에 가까워짐
        const v = CB.C.enemyVar || 0, f = 1 + (R() * 2 - 1) * v, look = Math.min(1, 0.25 * effN('정보실'));
        for (const e of T.enemies) for (let k = 0; k < e.count; k++) {
          enemies.push({ hp: e.hp * f, atk: e.atk * f, def: e.def || 0, name: e.name, boss: !!e.boss });
          seen.push({ hp: e.hp * (1 + (f - 1) * look), atk: e.atk * (1 + (f - 1) * look), def: e.def || 0, name: e.name, boss: !!e.boss });
        }
      }
      return { g, type, req: req2, r: R0 / n, boss: !!boss, T, enemies, seen, combat: enemies.length > 0, posted: s.week };
    }

    function successP(party, q, sm) {
      let F = 0, bottleneck = false;
      for (const k of q.req) {
        const vals = party.map(a => finalStat(a, k) * (sm ? sm(a, k) : 1) * (k === a.core ? 1 + skillBonus(a) : 1)).sort((x, y) => y - x);
        const P0 = vals[0] + Q.partyAssist * vals.slice(1).reduce((x, y) => x + y, 0);
        const fill = Math.min(P0 / q.r, 1.5);
        if (fill < 0.5) bottleneck = true;
        F += fill;
      }
      F /= q.req.length;
      let p = 0.55 + 1.1 * (F - 1);
      p = Math.max(0.05, Math.min(0.97, p));
      if (bottleneck) p /= 2;
      return p;
    }
    const unitOf = (a, mealB, sm) => CB.unit(a, i => finalStat(a, i) * (sm ? sm(a, i) : 1), a.gear, mealB);
    // 예상 성공 확률: 전투 의뢰는 예측 전투, 비전투 의뢰는 능력치 판정
    function questP(party, q) { return q.combat ? CB.predict(party.map(a => unitOf(a, 0)), q.seen, q.g, party[0].risk) : successP(party, q); }
    function perceived(a, p) {
      const err = Math.max(0, 0.10 - 0.02 * effN('정보실'));
      return Math.min(1, p * [0.9, 1.0, 1.2][a.risk] + (R() * 2 - 1) * err);
    }

    function gainXp(a, xp) {
      a.xp += xp;
      for (;;) {
        const need = G.lvA * Math.pow(a.lv, G.lvB);
        if (a.xp < need) break;
        if (a.lv >= G.lvCap[a.stage - 1]) { a.bank += a.xp; a.xp = 0; break; }
        a.xp -= need; a.lv++; levelUp(a);
      }
    }
    function levelUp(a) {
      const g = new Array(5).fill(0);
      if (a.stage === 1) { for (let i = 0; i < 5; i++) g[i] = i === a.core ? 2.0 : 0.4; }
      else if (a.cls === 'spec') { for (let i = 0; i < 5; i++) g[i] = i === a.core ? (a.stage === 2 ? 2.4 : 2.8) : (a.stage === 2 ? 0.525 : 0.325); }
      else if (a.cls === 'combo') { for (let i = 0; i < 5; i++) g[i] = a.pair.includes(i) ? (a.stage === 2 ? 1.8 : (i === a.pair[0] ? 2.2 : 2.0)) : (a.stage === 2 ? 0.3 : 0.433); }
      else if (a.cls === 'ext') { for (let i = 0; i < 5; i++) g[i] = a.pair.includes(i) ? 1.5 : 0.5; }
      for (let i = 0; i < 5; i++) a.stats[i] = Math.min(G.statCap, a.stats[i] + g[i]);
    }
    function attachTier(a) { return a.attach >= 90 ? 3 : a.attach >= 60 ? 2 : a.attach >= 30 ? 1 : 0; }

    function tryPromoteClass(a) {
      const base = [0.40, 0.65, 0.90, 1.00][attachTier(a)];
      const st = a.stats;
      if (a.stage === 1 && has('관리소')) {
        const others = [0, 1, 2, 3, 4].filter(i => i !== a.core).sort((x, y) => st[y] - st[x]);
        const b = others[0];
        const combo = (st[a.core] >= 35 && st[b] >= 35) || (st[a.core] >= 40 && st[b] >= 30) || (st[b] >= 40 && st[a.core] >= 30);
        const spec = st[a.core] >= 50 && (a.core === 2 || a.core === 3); // 마도사·신관만 3차로 이어짐
        if (!combo && !spec) return;
        if (R() > Math.min(1, base * 1.2)) return;
        a.stage = 2;
        if (combo) { a.cls = 'combo'; a.pair = [a.core, b]; } else { a.cls = 'spec'; a.pair = [a.core]; }
        onStage(a, 2);
      } else if (a.stage === 2) {
        if (a.cls === 'spec') {
          if (s.grade >= 3 && st[a.core] >= 80) { if (R() <= base * 0.9) { a.stage = 3; onStage(a, 3); } }
          return;
        }
        const [x, y] = a.pair;
        const hi = Math.max(st[x], st[y]), lo = Math.min(st[x], st[y]);
        const deep = s.grade >= 3 && ((lo >= 60) || (hi >= 70 && lo >= 55));
        const third = [0, 1, 2, 3, 4].filter(i => !a.pair.includes(i)).sort((p, q) => st[q] - st[p])[0];
        const ext = s.grade >= 5 && st[x] >= 45 && st[y] >= 45 && st[third] >= 45 && st[x] + st[y] + st[third] >= 150;
        if (!deep && !ext) return;
        if (R() > base * 0.9) return;
        a.stage = 3;
        if (!deep) { a.cls = 'ext'; a.pair = [x, y, third]; }
        onStage(a, 3);
      }
    }
    function onStage(a, n) {
      if (n === 2) { if (s.st.firstStage2 == null) s.st.firstStage2 = s.week; s.st.lvAt2.push(a.lv); }
      if (n === 3) { if (s.st.firstStage3 == null) s.st.firstStage3 = s.week; s.st.lvAt3.push(a.lv); }
      if (a.bank > 0) { const b = a.bank; a.bank = 0; gainXp(a, b); }
    }
    function tryGradeUp(a) {
      const lvReq = [0, 5, 10, 18, 26, 35, 45], achReq = [0, 5, 5, 7, 7, 10, 10];
      const n = a.grade + 1;
      if (n > 6 || n > s.grade || n === 6) return; // S급은 길드 S 승급 순간에만
      if (a.lv >= lvReq[n] && a.ach >= achReq[n]) { a.grade = n; a.ach = 0; }
    }

    function kill(a, byDemon) {
      a.alive = false; s.st.deaths++; if (byDemon) s.st.battleDeaths++;
      s.trust = Math.max(0, s.trust - (byDemon ? 0 : 1));
      s.heirsQueue.push({ at: s.week + A.heirDelayWeeks, core: R() < 0.7 ? a.core : ri(5), demon: byDemon, risk: byDemon ? 2 : (a.risk === 2 ? 0 : a.risk) });
    }

    function present(a) {
      if (!a.alive || a.busy > 0) return false;
      if (a.attach >= 100) return true;
      if (a.heirWeek != null && s.week - a.heirWeek < WPY) return R() < 0.8;
      const interval = A.visitBaseWeeks * (1 + (100 - a.attach) / 50);
      return R() < Math.min(1, 2 / interval);
    }

    // 의뢰 기한 (2026-11-12): 게시 후 expireWeeks 주 동안 아무도 받지 않으면 사라지고 신뢰도 하락
    function expireQuests() {
      const W = Q.expireWeeks || 4;
      for (let i = s.board.length - 1; i >= 0; i--) if (s.week - s.board[i].posted >= W) { s.board.splice(i, 1); s.trust = Math.max(0, s.trust - (Q.trustExpire != null ? Q.trustExpire : 1)); s.st.qExpire = (s.st.qExpire || 0) + 1; }
    }
    function generateQuests() {
      const mult = T.inflowMult[popStage()] * (0.7 + 0.6 * s.trust / 100) * (1 + 0.1 * s.grade) * (1 + 0.1 * Math.min(1, effN('접수대')));
      const n = Math.round(Q.perMonth * mult / WPM + R() * 0.5);
      const cap = Q.boardCap[s.grade] + [0, 2, 5, 5][Math.min(3, effN('게시판'))];
      for (let i = 0; i < n; i++) {
        // 필터: 상위 등급 집중도(filterFocus)에 따라 배분
        let g = s.grade;
        const r = R();
        if (r > bot.filterFocus) g = ri(s.grade + 1);
        if (s.board.length < cap) s.board.push(makeQuest(g, false));
      }
    }

    function mealFor(q) { // 그 의뢰 등급 이하에서 가장 높은 해금 요리 등급
      for (let g = q.g; g >= 0; g--) if (s.meals[g] > 0) return g;
      return -1;
    }
    function runQuest(party, q) {
      let mealB = 0, sm = null;
      let dish = null, bs = -1; for (const d of DISH) { if (!s.dishes[d.name] || d.g > q.g) continue; const sc = d.stats.filter(k => q.req.includes(k)).length * 1000 + d.g * 10 + d.pct * 100; if (sc > bs) { bs = sc; dish = d; } }   // 게임 dishFor와 같음
      if (dish) {
        let eaters = 0; const ate = new Set();
        for (const a of party) {
          const price = Q.reward[dish.g] * E.mealPriceRate;
          if (a.wallet >= price && R() < E.mealBuyRate[a.spend]) { a.wallet -= price; s.gold += price * E.mealMargin; s.op += price * E.mealMargin; s.st.mealIncome += price * E.mealMargin; eaters++; ate.add(a); }
        }
        if (dish.stats.length) sm = (a, k) => ate.has(a) && dish.stats.includes(+k) ? 1 + dish.pct : 1;
        // 메뉴가 2개 열려 있으면 의뢰 유형에 맞는 요리를 고를 확률이 높음
        mealB = (eaters / party.length) * E.mealPerDish * Object.keys(s.dishes).length * (1 + 0.5 * (effN('주점') >= 3 ? 1 : 0));   // 2026-11-05: 발견한 요리 하나당 +2% (등급 무관)
      }
      let ok, fightRes = null;
      if (q.combat) {
        const C = CB.C, price = C.potionPrice[Math.min(q.g, s.grade)];
        for (const a of party) { const want = C.potionCarry[a.spend] - (R() < 0.5 ? 1 : 0); while (a.pots < want && a.wallet >= price) { a.wallet -= price; a.pots++; s.st.potionGold += price; } }
        fightRes = CB.fight(party.map(a => unitOf(a, mealB, sm)), q.enemies, q.g, R, party[0].risk);
        ok = fightRes.win; s.st.combatQ++; if (ok) s.st.combatWin++;
        if (q.g <= 1) { const k = q.g * 2 + (party.every(m => m.gear >= q.g) ? 1 : 0); s.st.gearFx[k][1]++; if (ok) s.st.gearFx[k][0]++; }   // F·E급: 그 등급 장비를 다 갖춘 파티인지
      } else {
        const p = Math.min(0.97, successP(party, q, sm) * (1 + mealB));
        ok = R() < p;
      }
      if (fightRes) for (const u of fightRes.units) {   // 전투의 대가: 물약 소모, 쓰러진 사람은 부상·사망 판정
        const a = u.a; a.pots = u.pots; s.st.potionsUsed += u.used;
        if (!u.down) continue;
        s.st.injuries++;
        const d = (q.T ? q.T.death : Q.deathBase[q.g]) * CB.C.deathRisk[a.risk] * (1 - 0.15 * Math.min(1, effN('의무실')));
        if (R() < d) { kill(a, false); s.st.questDeaths++; continue; }
        a.busy += Math.max(1, CB.C.injuryWeeks[q.g] - (has('의무실') ? CB.C.injuryClinic : 0));
      }
      const fee = q.boss ? 0 : q.reward != null ? 0 : 0;
      const reward = (q.T ? q.T.reward : Q.reward[q.g]) * (q.boss ? 2 : 1);
      if (ok) {
        s.st.qDone++;
        if (q.T) for (const r of q.T.rewards || []) if (R() * 100 < r.p) s.mats[r.m] = (s.mats[r.m] || 0) + 1;   // 소재 획득 (게임 dropMats와 같음)
        for (const d of DISH) if (!s.dishes[d.name] && d.g <= s.grade && d.mats.every(m => s.mats[m] > 0)) { for (const m of d.mats) s.mats[m]--; s.dishes[d.name] = s.week; s.meals[d.g]++; s.st.mealsUnlocked.push(s.week); }
        const inc = reward * feeRate() + reward * E.resaleRate * (1 + 0.1 * effN('판매창구'));
        s.gold += inc; s.op += inc;
        const each = reward * (1 - feeRate()) / party.length;
        for (const a of party) {
          a.wallet += each;
          gainXp(a, G.xpBase * Math.pow(G.xpGradeMult, q.g));
          a.stats[q.type] = Math.min(G.statCap, a.stats[q.type] + Q.subGrowth);
          a.attach = Math.min(100, a.attach + A.attachSuccess * (1 + 0.2 * Math.min(1, effN('휴게실'))));
          if (q.g >= a.grade + 1 || (q.g >= a.grade && a.grade === s.grade)) a.ach++;
          tryGradeUp(a);
        }
        s.trust = Math.min(100, s.trust + (q.T && q.T.trustS != null ? q.T.trustS : Q.trustSucc));
        s.fame = Math.min(cfg.fame.cap, s.fame + (q.T ? q.T.fameS : cfg.fame.succ[q.g]));
      } else {
        s.st.qFail++;
        s.trust = Math.max(0, s.trust - (q.T && q.T.trustF != null ? q.T.trustF : Q.trustFail));
        s.fame = Math.max(0, s.fame - (q.T ? q.T.fameF : cfg.fame.fail[q.g]));
        for (const a of party) {
          gainXp(a, G.xpBase * Math.pow(G.xpGradeMult, q.g) * G.xpFailRate);
          if (q.combat) continue;   // 전투 의뢰는 위에서 쓰러진 사람만 판정
          const d = (q.T ? q.T.death : Q.deathBase[q.g]) * [0.5, 1, 1.5][a.risk] * (1 - 0.15 * Math.min(1, effN('의무실')));
          if (R() < d) { kill(a, false); s.st.questDeaths++; }
        }
      }
      return ok;
    }

    function adventurersChoose() {
      const idle = s.advs.filter(present);
      for (const a of idle) {
        if (a.busy > 0 || !a.alive) continue;
        const range = [[-1, 0], [-1, 1], [0, 2]][a.risk];
        const lo = Math.max(0, a.grade + range[0]), hi = Math.min(s.grade, a.grade + range[1]);
        const th = A.departTh[a.risk];
        const cands = s.board.map((q, i) => ({ q, i })).filter(o => o.q.g >= lo && o.q.g <= hi).sort((x, y) => y.q.g - x.q.g);
        for (const { q, i } of cands) {
          let party = [a];
          let pp = perceived(a, questP(party, q));
          if (pp < A.seekTh[a.social]) {
            const mates = idle.filter(b => b !== a && b.busy === 0 && b.alive && Math.abs(b.grade - q.g) <= 1).slice(0, 4);
            for (const m of mates) { party.push(m); if (perceived(a, questP(party, q)) >= th) break; }
            pp = perceived(a, questP(party, q));
          }
          if (pp >= th) {
            s.board.splice(i, 1);
            for (const m of party) m.busy = q.T ? q.T.weeks : Q.weeks[q.g];
            runQuest(party, q);
            break;
          }
        }
      }
      // 술 (2026-11-12, 게임 departures 끝과 같은 규칙): 이번 주 마을에 남은 모험가가 씀씀이 성향별 확률로 1잔, 길드 마진 econ.drinkMargin[등급]
      const DM = E.drinkMargin || [2, 3, 4, 5, 6, 7, 8];
      for (const a of idle) if (a.alive && a.busy === 0 && R() < E.mealBuyRate[a.spend]) { const m = DM[s.grade] || DM[0]; s.gold += m; s.op += m; }
    }

    function bestParty(pool, q, n) {
      const sorted = pool.slice().sort((x, y) => power(y) - power(x));
      let party = [];
      for (const a of sorted) { party.push(a); if (party.length >= n) break; if (successP(party, q) >= 0.95) break; }
      return party;
    }

    function bossStep() {
      const g = s.grade;
      if (g >= 6 || s.phase !== 'normal') return;
      const need = PROMO_FAC[g];
      if (need && !has(need)) return;
      if (g === 5 && s.advs.filter(a => a.alive && !a.external && a.grade >= 5 && a.lv >= 45).length < P.sCandidates) {
        // S급 후보가 부족해도 보스급 의뢰는 진행 가능
      }
      // 보충
      const vis = P.N[g] + 2;
      s.bossRefill = s.bossRefill.filter(w => { if (w <= s.week) { s.boss.push(makeQuest(g + 1, true)); return false; } return true; });
      while (s.boss.length + s.bossRefill.length < vis) s.boss.push(makeQuest(g + 1, true));
      if (s.bossDone >= P.N[g]) return;
      const pool = s.advs.filter(a => a.alive && a.busy === 0);
      for (let i = 0; i < s.boss.length; i++) {
        const q = s.boss[i];
        const party = bestParty(pool.filter(a => a.busy === 0), q, 5);
        if (!party.length) break;
        const p = successP(party, q);
        if (p >= bot.bossTh) {
          s.boss.splice(i, 1); i--;
          for (const m of party) m.busy = Q.weeks[q.g];
          const ok = runQuest(party, q);
          if (ok) { s.bossDone++; s.bossRefill.push(s.week + P.bossRefillWeeks); }
          else s.boss.push(makeQuest(g + 1, true));
          if (s.bossDone >= P.N[g]) break;
        }
      }
    }

    function townPower(participants) { return participants.reduce((t, a) => t + power(a), 0); }
    const typical = g => 5 * Q.ref[g] * 0.75;
    function battle(enemy, participants, kindDemon) {
      const our = townPower(participants);
      const x = our / Math.max(1, enemy) - 1;
      const pw = 1 / (1 + Math.exp(-cfg.promo.battleK * x));
      const win = R() < pw;
      for (const a of participants) {
        const d = (win ? cfg.promo.battleDeathWin : cfg.promo.battleDeathLoss) * [0.5, 1, 1.5][a.risk] * (1 - 0.15 * Math.min(1, effN('의무실')));
        if (!a.rebirth && R() < d) kill(a, kindDemon);
      }
      return { win, pw };
    }
    function defenders() {
      const list = s.advs.filter(a => a.alive && a.busy === 0 && (a.attach >= 100 || R() < 0.6));
      // 보상금
      let cost = 0; for (const a of list) if (a.attach < 100) cost += Q.reward[a.grade] * (a.attach >= 60 ? 0.5 : 1.0);
      s.gold -= cost; s.op -= cost;
      return list;
    }

    function invasionStep() {
      const g = s.grade;
      if (g >= 6 || s.phase !== 'normal' || s.bossDone < P.N[g] || s.invasionCooldown > s.week) return;
      if (g === 5 && s.advs.filter(a => a.alive && !a.external && a.grade >= 5 && a.lv >= 45).length < P.sCandidates) return;
      const enemy = P.invasionScale * typical(g + 1) * 0.5;
      const est = (() => { const d = s.advs.filter(a => a.alive); const pw = d.reduce((t, a) => t + power(a) * (a.attach >= 100 ? 1 : 0.6), 0); const x = pw / enemy - 1; return 1 / (1 + Math.exp(-P.battleK * x)); })();
      if (est < bot.promoteTh && s.week - (s.st.reach[g] || 0) < 6 * WPY) return; // 보류 (단, 6년 이상 정체면 강행)
      const res = battle(enemy, defenders(), true);
      if (res.win) {
        s.st.invW++; s.grade++; s.st.reach[s.grade] = s.week; s.fame = Math.min(cfg.fame.cap, s.fame + cfg.fame.gradeUp[s.grade]); s.bossDone = 0; s.boss = []; s.bossRefill = [];
        if (s.grade === 6) {
          for (const a of s.advs) if (a.alive && !a.external && a.grade === 5 && a.lv >= 45) a.grade = 6;
          s.phase = 'officers'; s.officer = 0; s.mainCooldown = s.week + 4;
        }
      } else {
        s.st.invL++; s.pop *= (1 - T.invasionLoss); s.invasionCooldown = s.week + 2 * WPM;
      }
    }

    function raidStep() {
      if (s.week < s.nextRaid) return;
      s.nextRaid = s.week + P.raidMonths[popStage()] * WPM;
      if (s.invasionCooldown > s.week) return;
      const enemy = P.raidScale * typical(s.grade) * 0.5;
      const res = battle(enemy, defenders(), true);
      if (res.win) s.st.raidsW++; else { s.st.raidsL++; s.pop *= (1 - T.raidLoss); s.trust = Math.max(0, s.trust - 5); }
    }

    function endgameStep() {
      if (s.phase === 'normal' || s.ended || s.week < s.mainCooldown) return;
      const pool = s.advs.filter(a => a.alive && a.busy === 0);
      const top = pool.slice().sort((x, y) => power(y) - power(x)).slice(0, 5);
      if (s.phase === 'officers') {
        const enemy = EN.officerScale[s.officer] * typical(6) * 0.5;
        const res = battle(enemy, top, true);
        if (res.win) { s.officer++; s.mainCooldown = s.week + 3 * WPM; if (s.officer >= 3) s.phase = 'demon'; }
        else { s.st.officerFails++; s.pop *= 0.97; s.mainCooldown = s.week + EN.mainRetryWeeks; }
      } else if (s.phase === 'demon') {
        const avg = top.reduce((t, a) => t + a.grade, 0) / Math.max(1, top.length);
        if (top.length < 5 || avg < 5) { s.mainCooldown = s.week + WPM; return; }
        // 마인 각성 확인
        if (!s.st.demonAwake && s.advs.some(a => a.alive && a.demonHeir && a.stage >= 2 && a.attach >= 70)) s.st.demonAwake = true;
        const enemy = EN.demonScale * typical(6) * 0.5 * EN.demonPopMult[popStage()];
        const res = battle(enemy, top, true);
        if (res.win) { s.ended = true; s.st.end = s.week; s.st.endRebirth = top.some(a => a.rebirth); }
        else { s.st.demonFails++; s.mainCooldown = s.week + EN.demonRetryWeeks; }
      }
    }

    function monthly() {
      // 수입
      s.gold += E.subsidy[s.grade]; s.op += E.subsidy[s.grade];
      // 주점 매출은 2026-11-12부터 매주 술 1잔 단위 (adventurersChoose 끝)
      // 유지비
      let up = 0; for (const [f, g] of FAC) if (has(f)) up += E.buildCost[g] * E.upkeepRate;
      s.gold -= up; s.op -= up;
      // 건설: 승급 필수 시설 우선, 이후 등급 순
      const order = FAC.filter(([, g]) => g <= s.grade).slice().sort((x, y) => (PROMO_FAC.includes(y[0]) ? 1 : 0) - (PROMO_FAC.includes(x[0]) ? 1 : 0));
      for (const [f, g] of order) {
        if (has(f)) continue;
        const c = E.buildCost[g];
        if (s.gold - c >= 500) { s.gold -= c; s.built[f] = true; s.st.facWeek[f] = s.week; }
      }
      // 시설 효과 개방 (금전 부분만 모델링)
      const effFac = ['정보실', '의무실', '훈련장', '도서관', '휴게실', '주점', '접수대', '게시판', '판매창구'];
      for (const f of (E.effectOpen === 0 ? [] : effFac)) {   // 2026-11-12: econ.effectOpen 0 = 프로토타입(게임에 효과 개방이 없음 → 게임과 같게 끔)
        const baseG = f === '주점' || f === '접수대' || f === '게시판' || f === '판매창구' ? 0 : FAC.find(x => x[0] === f)[1];
        if (!(has(f))) continue;
        const max = f === '정보실' ? 5 : 3;
        const n = effN(f); if (n >= max) continue;
        const effG = Math.min(6, baseG + Math.min(n, 2));
        if (effG > s.grade + 1) continue; // 소재 등급이 아직 없음
        const cost = E.buildCost[Math.max(1, effG)] * E.effectCost[Math.min(2, n)];
        if (s.gold - cost >= 1000 / bot.buildEffects) { s.gold -= cost; s.eff[f] = n + 1; }
      }
      // 인구
      const residents = s.advs.filter(a => a.alive && a.attach >= 100).length;
      s.pop += s.pop * (T.growthBase + T.growthPerGrade * s.grade) + residents * T.perResident;
      // 애착(마을에 머문 모험가)
      for (const a of s.advs) if (a.alive && a.busy === 0) a.attach = Math.min(100, a.attach + A.attachPerMonthInTown * 0.5);
      // 이탈
      for (const a of s.advs) if (a.alive && !a.rebirth && a.attach < A.leaveAttach && s.week - a.joined > A.leaveAfterYears * WPY) a.alive = false;
      // 신규 모험가
      const lam = A.arrivalPerMonth * (0.7 + 0.6 * s.trust / 100) * (1 + cfg.fame.maxBonus * Math.min(1, s.fame / cfg.fame.full)); // 신뢰도 × 명성
      let k = Math.floor(lam); if (R() < lam - k) k++;
      const advCap = (A.capByGrade || [8, 12, 16, 20, 24, 28, 32])[s.grade] || 8;   // 2026-11-12: 게임(game_core.js advCap)과 같게 길드 등급별 모험가 상한 적용
      for (let i = 0; i < k && s.advs.filter(x => x.alive).length < advCap; i++) {
        const ext = R() < 0.05 && s.grade > 0 ? Math.min(6, s.grade + (R() < 0.3 ? 2 : 1)) : 0;
        const a = newAdv({ grade: ext });
        if (s.demonFlagFallback) { a.demonHeir = true; a.heirWeek = s.week; s.demonFlagFallback = false; s.st.demonFallback = true; }
      }
      // 2세
      s.heirsQueue = s.heirsQueue.filter(h => { if (h.at <= s.week) { newAdv({ core: h.core, heirOf: true, demonHeir: h.demon, risk: h.risk }); s.st.heirs++; return false; } return true; });
      // 전직 제안 (월 1회)
      for (const a of s.advs) if (a.alive) tryPromoteClass(a);
      // 장비 구매
      for (const a of s.advs) {
        if (!a.alive) continue;
        const ng = Math.min(s.grade, a.gear + 1);
        if (ng <= a.gear) continue;
        const price = GE.weaponPrice[ng] * GE.setMult;
        if (a.wallet >= price * (1 + GE.reserveMult[a.spend] * 0.5)) { a.wallet -= price; a.gear = ng; }
      }
      if (s.gold < 0) s.st.negMonths++;
      if (s.week < WPY) s.st.firstNetF.push(s.op);
      s.op = 0;
    }

    function weekly() {
      // 훈련
      for (const a of s.advs) {
        if (!a.alive || a.busy > 0) continue;
        if (has('훈련장')) { const m = 1 + [0, 0.15, 0.40, 0.40][Math.min(3, effN('훈련장'))]; for (const i of [0, 1, 4]) if (i === a.core || (a.pair && a.pair.includes(i))) a.stats[i] = Math.min(G.statCap, a.stats[i] + G.trainPerWeek * m); }
        if (has('도서관')) { const m = 1 + (effN('도서관') ? 0.15 : 0); for (const i of [2, 3]) if (i === a.core || (a.pair && a.pair.includes(i))) a.stats[i] = Math.min(G.statCap, a.stats[i] + G.trainPerWeek * m); }
      }
      expireQuests();
      generateQuests();   // 2026-11-12: 매주 게시 (예전에는 매달 초에만 = 월 유입의 1/4만 들어왔음)
      adventurersChoose();
      bossStep();
      invasionStep();
      raidStep();
      endgameStep();
      for (const a of s.advs) if (a.busy > 0) a.busy--;
    }

    // 시작 모험가 3명
    for (let i = 0; i < A.startCount; i++) newAdv({ attach: 20 });

    const maxW = cfg.run.maxYears * WPY;
    for (s.week = 0; s.week < maxW && !s.ended; s.week++) {
      if (!s.rebirthAdded && s.week === (EN.rebirthYear - 1) * WPY) {
        s.rebirthAdded = true; s.st.rebirth = true;
        const a = newAdv({ risk: 0 }); a.rebirth = true; a.stage = 3; a.cls = 'ext'; a.pair = [0, 1, 2]; a.lv = 45;
        a.stats = [0, 0, 0, 0, 0].map(() => EN.rebirthTotal / 5); a.grade = Math.min(6, s.grade + 2); a.gear = s.grade;
      }
      if (!s.demonFlagFallback && !s.st.demonFallback && s.week === EN.demonHeirFallbackYear * WPY && !s.advs.some(a => a.alive && a.demonHeir)) s.demonFlagFallback = true;
      weekly();
      if (s.week % WPM === WPM - 1) monthly();
      if (s.week % WPY === WPY - 1) {
        const alive = s.advs.filter(a => a.alive);
        const top = alive.slice().sort((x, y) => y.lv - x.lv).slice(0, 5);
        s.st.goldYear.push(s.gold); s.st.advYear.push(alive.length); s.st.fameYear.push(s.fame); s.st.trustYear.push(s.trust); s.st.popYear.push(s.pop);
        s.st.lvYear.push(top.length ? top.reduce((t, a) => t + a.lv, 0) / top.length : 0);
      }
    }
    s.st.finalGrade = s.grade;
    s.st.dbg = { bossDone: s.bossDone, cand: s.advs.filter(a => a.alive && !a.external && a.grade >= 5 && a.lv >= 45).length, gradeA: s.advs.filter(a => a.alive && a.grade === 5).length, gradeB: s.advs.filter(a => a.alive && a.grade === 4).length, lv45: s.advs.filter(a => a.alive && a.lv >= 45).length, alive: s.advs.filter(a=>a.alive).length, maxLv: Math.max(...s.advs.filter(a=>a.alive).map(a=>a.lv)), stage3: s.advs.filter(a=>a.alive&&a.stage===3).length, top: s.advs.filter(a=>a.alive).sort((x,y)=>y.lv-x.lv).slice(0,14).map(a=>'g'+a.grade+'L'+a.lv+'s'+a.stage+'r'+a.risk+'x'+(a.rebirth?1:0)) };
    s.st.finalPop = s.pop;
    return s.st;
  }

  function quant(arr, q) { if (!arr.length) return null; const b = arr.slice().sort((x, y) => x - y); return b[Math.min(b.length - 1, Math.floor(b.length * q))]; }

  function aggregate(results, cfg) {
    const n = results.length, Y = cfg.run.maxYears;
    const yr = w => w == null ? null : w / WPY;
    const out = { n };
    out.reach = [];
    for (let g = 1; g <= 6; g++) {
      const v = results.map(r => r.reach[g]).filter(x => x != null).map(yr);
      out.reach.push({ grade: GR[g], pct: v.length / n, p10: quant(v, 0.1), med: quant(v, 0.5), p90: quant(v, 0.9) });
    }
    const ends = results.map(r => r.end).filter(x => x != null).map(yr);
    out.endPct = ends.length / n; out.end15 = results.filter(r => r.end != null && r.end < 15 * WPY).length / n;
    out.endMed = quant(ends, 0.5); out.endP10 = quant(ends, 0.1); out.endP90 = quant(ends, 0.9);
    out.endHist = new Array(Y).fill(0); for (const e of ends) out.endHist[Math.min(Y - 1, Math.floor(e))]++;
    out.rebirthPct = results.filter(r => r.rebirth).length / n;
    out.rebirthEndPct = results.filter(r => r.endRebirth).length / n;
    const avg = f => results.reduce((t, r) => t + f(r), 0) / n;
    out.deaths = avg(r => r.deaths); out.heirs = avg(r => r.heirs);
    out.successRate = avg(r => r.qDone / Math.max(1, r.qDone + r.qFail));
    out.raidWin = avg(r => r.raidsW / Math.max(1, r.raidsW + r.raidsL));
    out.invLoss = avg(r => r.invL);
    out.negMonths = avg(r => r.negMonths);
    out.bankruptPct = results.filter(r => r.negMonths > 0).length / n;
    out.netF = avg(r => r.firstNetF.length ? r.firstNetF.reduce((a, b) => a + b, 0) / r.firstNetF.length : 0);
    const s2 = results.map(r => r.firstStage2).filter(x => x != null).map(yr), s3 = results.map(r => r.firstStage3).filter(x => x != null).map(yr);
    out.stage2Year = quant(s2, 0.5); out.stage3Year = quant(s3, 0.5);
    const l2 = [].concat(...results.map(r => r.lvAt2)), l3 = [].concat(...results.map(r => r.lvAt3));
    out.lvAt2 = l2.length ? l2.reduce((a, b) => a + b, 0) / l2.length : null;
    out.lvAt3 = l3.length ? l3.reduce((a, b) => a + b, 0) / l3.length : null;
    out.demonAwakePct = results.filter(r => r.demonAwake).length / n;
    out.demonFallbackPct = results.filter(r => r.demonFallback).length / n;
    const series = key => { const rows = []; for (let y = 0; y < Y; y++) { const v = results.map(r => r[key][y]).filter(x => x != null); rows.push(v.length ? { p10: quant(v, 0.1), med: quant(v, 0.5), p90: quant(v, 0.9) } : null); } return rows; };
    out.gold = series('goldYear'); out.advs = series('advYear'); out.lv = series('lvYear'); out.pop = series('popYear');
    return out;
  }

  const api = { defaults, simulate, aggregate, BOTS, GR, ST, WPY };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.GuildSim = api;
})(this);
