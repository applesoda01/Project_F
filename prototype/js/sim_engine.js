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
      late: { on: 1, base: -0.01, soft: 1 },   // 2026-11-18 결정 19 · 30: 늦장 실패
      qlv: { on: 1, need: 3, max: 3, foe: 0.15, pay: 0.2, var: 0.6, fresh: 4 },   // 2026-11-18 결정 35: 의뢰 레벨 [임시]
      quirk: { rate: 0.3, safeWeeks: 12, homeAt: 85, homeMul: 0.5, hotAtk: 5, hotRel: 1, hotFight: 0.2, hotFightAtk: 5, hotFightRel: 5, drunkHp: 15, drunkInj: 1, drunkSleep: 0.06, drunkDrink: 1, drunkAttach: 1, cowardFlee: 0.3, cowardStat: 3, cowardQuit: 0.2, bluffNom: 0.05, bluffNew: 2, bluffSneak: 0.1, bluffTh: 0.2, devotedNom: 0.05, devotedCover: 0.3, devotedInj: 1, selfishXp: 0.1, selfishAt: 0.5, selfishFlee: 0.1, selfishRel: 5, glutBuff: 1.5, glutMeal: 1, glutHunger: 0.1, glutHungerMul: 0.9, omenRare: 10, omenRain: 0.2, rivalXp: 0.1, rivalRush: 0.2 },   // 2026-11-20 야간: 버릇 9종 (data/quirks.csv · balance.csv quirk) [임시], 규칙은 combat.js QK
      dungeon: { on: 1, branch: 1, cont: 1, push: 0, set: 1, rare: 1, recipe: 1, title: 1, keep: 1, openWeek: 12, weeks: 1, party: [2, 3], progOk: [25, 40, 55], progFail: 5, progRisky: 5, progBoss: 10, setAt: 50, foeRisky: 1, foeSafe: 0.8, foeKeep: 0.7, matRoom: 1, matRisky: 1, matBoss: 3, rareMat: 0.3, contHp: 0.5, autoTh: 0.6, autoMode: 0, clearFame: 25, clearGold: 500, royal: 1, auto: 0, autoGap: 3, autoWait: 1, setHp: 15, setAtk: 5, set3Vs: 0.25, set3Atk: 0.05, rareParty: 0.05, craftFee: 120, titleAttach: 5 },   // 2026-11-20 던전 (data/dungeons.csv · dungeon_items.csv · balance.csv dungeon) [임시], 규칙은 combat.js DG · game_core dg*
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
        x2Rate: 0.05,                              // 게시될 때 ×2 의뢰(골드만 2배)가 될 확률 (2026-11-12)
        upBoardWeeks: 1,                           // 게시판 업그레이드: 의뢰 기한 +주                // 의뢰 성공·실패 시 신뢰도 (2026-11-12 정수화, 예전 0.3·0.6)
        partyAssist: 0.25,                         // 파티원 보조 계수
        deathBase: [0.01, 0.01, 0.03, 0.03, 0.05, 0.05, 0.08],
        soloMul: 0.5, partyFrom: [12, 24], partyRate: [0.2, 0.33], partyMul: [2, 3],   // 2026-11-19 보호 구간 혼자 판 · 그 뒤 파티 판 (balance.csv가 덮어씀)
        subGrowth: 0.2,                            // 성공 시 유형 능력치 성장
        diff: [1, 1, 1, 1, 1, 1, 1],                // 의뢰 난이도 배수 (등급별): 판정 기준치와 적 체력 · 공격력에 곱함 (2026-11-16)
        bossMult: 1.15                             // 보스급 기준치 배수
      },
      growth: {
        xpBase: 80, xpGradeMult: 2.0,              // 성공 경험치 = xpBase × mult^등급
        xpFailRate: 0.3,
        lvA: 20, lvB: 1.55,                        // 다음 레벨 필요 경험치 = A × Lv^B
        lvCap: [30, 40, 50],
        trainPerWeek: 0.10,                        // 훈련장·도서관 주간 훈련량
        statCap: 100,
        gradeStat: [0, 3, 4, 5, 6, 8, 10],         // 2026-11-12 승급 시 능력치 5개에 각각 (balance.csv와 같게)
        gradeLv: [0, 4, 10, 18, 26, 35, 45], gradeAch: [0, 4, 5, 7, 7, 10, 10]   // 2026-11-20 사용자 결정 B: 승급 조건을 balance.csv로 (E급 Lv5 · 실적 5 → Lv4 · 실적 4)
      },
      adv: {
        arrivalPerMonth: 0.8, arrivalPerGrade: 0.10,       // arrivalPerGrade: 명성 도입 전 공식 (참고용, 지금은 쓰지 않음)
        zeroFameVisit: 0, founderMix: 1, founderWarrior: 1,   // founderWarrior: 2026-11-18 결정 33 — 첫 모험가는 전사, 나머지는 전사 외
          // 2026-11-17 의뢰 0건 판 대책 ②: 명성 0인 동안 N주마다 1명 방문 (0이면 끔)
        fameSkip: 1,                                       // 결정 32: 1 = 상한이 차 있을 때 닿은 칸은 넘김, 0 = 예전처럼 기다림
        fameStep: [6, 10, 10, 10, 10, 10, 10],             // 2026-11-18 결정 32: 등급별 명성 간격 (F 6 · E 10 [임시], D 이상 가안). 0이면 예전 확률 방식
        startCount: 5, startCore: 15, startOther: 6,
        attachSuccess: 2, attachPerMonthInTown: 1,
        visitBaseWeeks: 2,
        leaveAfterYears: 2, leaveAttach: 20,
        heirDelayWeeks: 24,
        departTh: [0.70, 0.55, 0.35], seekTh: [0.30, 0.50, 0.70],   // 출발 기준(신중|보통|무모), 동료 찾는 기준(독불장군|보통|사교적)
        relParty: 30   // 2026-11-19: 동료를 고를 때 친밀도 흔들림 폭 [임시] (2026-11-20부터 시뮬레이터도 씀, balance.csv와 같게)
      },
      econ: {
        startGold: 3000, feeBase: 0.10, feePerInfo: 0.02,
        subsidy: [300, 500, 800, 1200, 2000, 3000, 4500],
        buildCost: [0, 2000, 4000, 8000, 15000, 30000, 0],
        upkeepRate: 0,   // 2026-11-05 시설 유지비 없앰 (balance.csv와 같게)
        tavernPerAdvWeek: 4, tavernGradeMult: 1.6,
        feeOpt: [0.05, 0.1, 0.15, 0.2], restK: 0.5,   // 2026-11-19 결정 42: 5% 추가   // 결정 22: 높은 수수료를 거르는 세기 [임시]
        subsidyMode: 1, subsidyRate: 0.5, subsidyEvery: 1,   // 2026-11-17 V2 결정 13: 반기 지급 · 성공 보상 합의 50% [임시] (0 = 예전 매달 고정)   // 2026-11-17 V2 결정 11: 의뢰별 요율 선택지 [임시]
        resaleRate: 0, matBuyRate: 0.7, consignFee: 0.1, orderMult: 1.5, orderMax: 6, orderDup: 2, orderBias: 0.5, orderMode: 1, orderMultOpt: [1.2, 1.5, 2], orderBiasOpt: [0.3, 0.5, 0.7], orderTarget: 6, orderFirst: 0, carOn: 1, carStay: 1, carNotice: 2, carKinds: 3, carMult: [1.1, 1.6], carQty: [5, 15], carQtyLv: 5, carRel: [200, 600], consWeeks: 8, consEdge: 0.1, gqHuntTake: 5, gqScoutWeeks: 4, gqPatrolWeeks: 8, gqHelpPop: 200, gqHelpPop2: 5, gqTrainXp: 1, gqTrainAttach: 3, gqAutoHunt: 1,   /* 2026-11-20 결정 57~62: 떠돌이 상단 · 길드 의뢰 ② 토벌 (balance.csv와 같게) */ gqOn: 1, gqOffice: 1, gqMax: [2, 3, 4, 5, 6, 7, 8], gqUpBoard: 1, gqPct: [0.5, 3], gqWeeks: [2, 4, 6], gqAutoLow: 4, gqAutoN: 6, gqAutoPct: 0.5, gqAutoWeeks: 4, gqAutoKeep: 200, buyRateMin: 0.5, buyRateMax: 1.2, buyRateStep: 0.05, sellTh: [0.9, 0.85, 0.75], sellAttach: [60, 90], sellAttachCut: [0.05, 0.1],   /* 2026-11-20 결정 49~56: 길드 의뢰 · 매입 개편 (balance.csv와 같게) */   /* 2026-11-19 결정 41: 상시 발주 */ drawMode: 1, drawPts: [2, 3],   // 2026-11-17 V2 결정 12: 소재 자동 차익 8% 없앰 → 자동 매입 70% · 위탁 10% [임시] (balance.csv와 같게)
        effectCost: [0.10, 0.20, 0.35],
        effectOpen: 0,                             // 시설 효과 개방 (0 = 끔. 2026-11-12: 프로토타입 게임에는 없으므로 시뮬레이터도 끔)
        mealPriceRate: 0.15, mealMargin: 0.60, mealBuyRate: [0.30, 0.60, 0.90],
        scoutFee: [20, 40, 80, 150, 250, 400, 600],   // 지명 섭외비: 모험가 등급별, 부탁할 때마다 (거절당해도 나감, 2026-11-16)
        officeCost: 1000,                          // 집무실 건설비 (2026-11-12, F급)
        upgradeCost: [500, 1000, 2000, 4000, 8000, 15000, 30000],   // 시설 업그레이드 비용 (시설 등급별)
        upMargin: 5, upSell: 3,                    // 주점 업그레이드 마진 +G, 판매 창구 업그레이드 소재 +G
        drinkMargin: [2, 3, 4, 5, 6, 7, 8],        // 술 1잔 길드 마진 (2026-11-12, F·E 확정, D 이상 가안). 확률은 mealBuyRate
        mealBonus: [0.03, 0.04, 0.045, 0.05, 0.06, 0.05, 0.07], mealUnlockChance: 0.5, mealPerDish: 0.02, mealMode: 1,
        mealCook: 1, mealPrep: 4, mealKeep: 0, mealLeft: 2, mealSale: 0.5, freeAttach: 1, mealPK: 1.5, mealPMin: 0.1, mealPMax: 1.6, shopRate: 1.5, stapleGrade: -1, mealPriceMode: 0, mealCostK: 2, mealGradeAdd: [5, 15, 25, 40, 50, 70, 100], escOn: 1, escWait: 2, escChance: 0.5, escPay: 1.2, escWeeks: 2, escRel: 100, escRelFail: 50, escBonus: 0.1, carFirstWeek: 0, mktSupplyPop: 0, autoRareRate: 0, matBaseOn: 0, matEffort: [0.5, 2], matRareK: 2,
        popOn: 1, popStart: 60, popTake: 5, popRegen: 0.05, popLow: 30, popHigh: 85, popLowBoard: 0.5, popLowDraw: 0.5, popLowJudge: 0.15, popHighTown: 2,   // 2026-11-19 V4 3단계 (결정 44)
        mktOn: 1, mktTarget: 20, mktTargetSpice: 15, mktK: 0.6, mktMin: 0.5, mktMax: 2, mktUse: 0.1, mktPop: 100, buyRateOpt: [0.5, 0.7, 0.9], storeCap: 30, lowBuyK: 0.25   // 2026-11-19 V4 2단계 (결정 40 · 43)   // 2026-11-19 V4 1단계 (결정 37 · 38 · 39): 식당 재료 소모 · 메뉴 가격 · 잡화 양념 (balance.csv와 같게)   // mealMode 1 = 요리 버프(능력치 +n, 발견 보너스 없음, 2026-11-19) · 0 = 예전 C안
      },
      gear: {
        needSmith: 1,   // 2026-11-19: 대장간이 생긴 뒤부터 장비를 삼 (0 = 예전처럼 처음부터)
        pieceBuy: 1, giftAttach: [1, 2, 3, 4, 5, 6, 7],   // 2026-11-18 대장간: 장비 1칸씩 사기 · 선물 애착 [임시]
        craftFee: [30, 60, 120, 240, 480, 960, 1920],   // 2026-11-19 대장간 만들기 공임 (F 30 · E 60 [임시], D 이상 가안)
        potionFee: [5, 10, 20, 40, 50, 65, 125],   // 2026-11-19 물약 상점 달이기 공임 1병 (F 5 · E 10 [임시], D 이상 가안)
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
      deco: { attach: 1, trust: 1, mat: 1, fame: 1, gold: 5, xp: 5, injury: 1, x2PerMonth: 1 },   // F급 장식 효과 (2026-11-12, guild_interior.md 10-2). 시뮬레이터는 run.deco 목록에 있는 장식만 놓였다고 봄
      fame: {                                    // 명성 [가안]: 높을수록 모험가가 많이 찾아옴 (방문 수 = 기본 × 신뢰도 보정 × 명성 보정)
        succ: [1, 2, 3, 4, 5, 6, 8],              // 의뢰 성공 시 등급별 상승 (2026-11-12 정수화, D 이상 가안)
        fail: [1, 2, 3, 4, 5, 6, 8],              // 의뢰 실패 시 등급별 하락 (2026-11-12 정수화, D 이상 가안)
        gradeUp: [0, 25, 50, 75, 100, 125, 150],  // 길드 승급 시 상승
        maxBonus: 0.6, full: 500, cap: 1000       // 명성 보정 = 1 + 0.6 × min(1, 명성/500) → 최대 1.6배 (명성 도입 전 S급 보정과 같음)
      },
      contract: {   // 2026-11-17 경제 개편 V2 계약 모험가 [임시] (balance.csv contract.* 와 같게, 결정표 economy_v2_decisions.md)
        slots: 1, minAttach: 30, minDone: 3, weeksOpt: [8, 12], weeks: 12, rateOpt: [0.15, 0.2, 0.25, 0.3], rate: 0.2, pay: 25, payMax: 60, sup: 10, supMax: 30, step: 5, supUse: 0.5,
        attachAdj: 0.15, spendReq: [0.95, 1, 1.03], riskReq: [0.97, 1, 1.05], socialReq: [1.05, 1, 0.98], maybe: 0.05, callMax: 2, callWin: 4, look: 8, ratioMin: 1, minPay: [20, 40, 60, 80, 100, 120, 150]
      },
      town: {
        startPop: 150, baseAdd: 2, perSuccess: [1, 2, 3, 4, 5, 6, 8], residentAttach: 65, perResident: 2,   // 2026-11-13 정수 가산형 인구 (balance.csv와 같게)
        houseCap: [40, 45, 50, 60, 75], upgradePerMonth: 2, upgradeWait: 3,                                    // 민가 수용·레벨업 (docs/design/town_houses_v1.md)
        stages: [300, 1000, 2000, 3500], inflowMult: [1.0, 1.3, 1.6, 2.0, 2.5],
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
  // 2026-11-20 결정 64: 소재 기준가 = 등급 기본값 × 수고(2.5 ÷ 주로 나오는 의뢰에서 한 번에 가져오는 수, matEffort 범위) × 희귀(30% 이상으로 나오는 의뢰가 없으면 matRareK). 게임 · 시뮬레이터가 같이 씀
  function matBaseTable(econ) {
    const G = gameData(), out = {}, E = econ || {}; if (!G || !G.content || !E.matBaseOn) return out;
    const SP = E.matGradeP || [6, 9, 12, 30, 36, 48, 90], R = E.matEffort || [0.5, 2], rk = E.matRareK != null ? E.matRareK : 2, p0 = 2.5;
    const Q = G.content.quests.filter(q => (q.board || q.core) && q.type >= 0);
    for (const m of G.content.materials) {
      if (m.price) { out[m.id] = m.price; continue; }
      const b = SP[Math.max(0, 'FEDCBAS'.indexOf(m.grade))]; let best = null;
      for (const t of Q) { const r = (t.rewards || []).find(x => x.m === m.id); if (!r || r.p < 30) continue; const sc = (r.role === '주' ? 1000 : 0) + r.p; if (!best || sc > best.sc) best = { t, sc }; }
      if (!best) { out[m.id] = Math.max(1, Math.round(b * rk)); continue; }
      const T = best.t, per = T.enemies && T.enemies.length ? T.enemies.reduce((a, e) => a + (e.count || 1), 0) : p0;
      out[m.id] = Math.max(1, Math.round(b * Math.min(R[1], Math.max(R[0], p0 / per))));
    }
    return out;
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
    const STATS_ = ['힘', '민첩', '지력', '정신', '기교'], DISH_FX = (e => { const m = /\+\s*(\d+(?:\.\d+)?)%?/.exec(e || ''); if (!m) return { stats: [], pct: 0, val: 0 }; const part = (e || '').slice(0, m.index); return { stats: part.includes('모든 능력치') ? [0, 1, 2, 3, 4] : STATS_.map((n, i) => part.includes(n) ? i : -1).filter(i => i >= 0), pct: +m[1] / 100, val: +m[1] }; });
    const DISH = (() => { const G = gameData(); if (!G || !G.meals) return []; return G.meals.map(m => { const it = G.content && G.content.items.find(i => i.kind === 'food' && i.name === m.name); return Object.assign({ name: m.name, serv: m.serv || 2, g: 'FEDCBAS'.indexOf(m.grade), mats: it ? (it.recipe || []).map(r => r.m) : [] }, DISH_FX((it && it.desc) || m.effect)); }).filter(d => d.mats.length); })();
    { const G = gameData(); if (G && G.dungeons) for (const k in G.dungeons) { const dd = G.dungeons[k].dish; if (dd) DISH.push(Object.assign({ name: dd.name, g: dd.g, mats: dd.recipe.map(r => r.m), dungeon: k }, DISH_FX('모든 능력치 +3'))); } }   // 2026-11-20 던전 요리 (게임과 같음): 던전 클리어로만 배움
    const MEAL_N = 'FEDCBAS'.split('').map(g => { const G = gameData(); return ((G && G.meals) || []).filter(m => m.grade === g).length || 2; });   // 등급별 요리 수 (meals.csv)
    const R = rng(seed);
    const bot = BOTS[botKey];
    const Q = cfg.quest, G = cfg.growth, A = cfg.adv, E = cfg.econ, GE = cfg.gear, P = cfg.promo, T = cfg.town, EN = cfg.ending;
    const ri = n => Math.floor(R() * n);
    const pick = arr => arr[ri(arr.length)];

    const s = {
      qlv: {},   // 의뢰 레벨 (결정 35)
      week: 0, grade: 0, gold: E.startGold, pop: T.startPop, trust: 50, fame: 0,
      op: 0, built: cfg.run && cfg.run.preTut ? {} : { '집무실': true }, eff: {},   /* 2026-11-19 시작 = 튜토리얼이 끝난 상태(리나 지원으로 집무실이 있음, 게임 autoPlace(first)와 같음). run.preTut 이면 예전처럼 없음 */ meals: [0, 0, 0, 0, 0, 0, 0], mats: {}, dishes: {}, advs: [], board: [], nextId: 1,
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
    // 마을 민가 (게임 game_core.js townMonthly와 같은 규칙, 2026-11-13)
    const GDh = gameData(), HS = ((GDh && GDh.townHouses) || []).map(r => ({ st: r[5], size: r[3] * r[4] }));
    const hCap = h => T.houseCap[h.lv - 1] * (h.size === 2 && h.lv >= 2 ? 2 : 1);
    const capAll = () => s.houses.reduce((t, h) => t + hCap(h), 0);
    function addHouses(need) { const st = popStage() + 1; let cap = capAll(); while (cap < need && s.houses.length < HS.length && HS[s.houses.length].st <= st) { const h = { size: HS[s.houses.length].size, lv: 1, age: 0 }; s.houses.push(h); cap += hCap(h); } }
    s.houses = []; s.popAdd = 0; if (HS.length) addHouses(s.pop);
    const feeRate = () => E.feeBase + E.feePerInfo * effN('정보실');

    function newAdv(opts) {
      opts = opts || {};
      const core = opts.core != null ? opts.core : ri(5);
      const stats = [0, 0, 0, 0, 0].map((_, i) => i === core ? A.startCore + R() * 4 : A.startOther + R() * 3);
      const g = opts.grade || 0;
      const a = {
        id: s.nextId++, core, stage: 1, pair: null, cls: 'base', stats, lv: 1, xp: 0, bank: 0,
        grade: 0, ach: 0, attach: opts.attach || 0, home: !!opts.home, risk: opts.risk != null ? opts.risk : ri(3), spend: ri(3), social: ri(3),
        wallet: 0, gear: -1, eq: [-1, -1, -1], pots: 0, busy: 0, alive: true, joined: s.week, heirOf: opts.heirOf || null, heirWeek: opts.heirOf ? s.week : null,
        demonHeir: !!opts.demonHeir, demonMark: false, rebirth: !!opts.rebirth, external: g > 0
      };
      if (g > 0) { // 외부 고등급 방문자: 등급에 맞게 성장시킴
        for (let i = 0; i < 5; i++) a.stats[i] += Q.ref[g] * (i === core ? 0.9 : 0.4);
        a.lv = [1, 5, 10, 18, 26, 35, 45][g]; a.grade = g; a.stage = g >= 3 ? 2 : 1;
        if (a.stage === 2) { a.pair = [core, (core + 1 + ri(4)) % 5]; a.cls = 'combo'; }
      }
      if (!opts.home && CB && CB.QK) a.quirk = CB.QK.roll(R, a, cfg.quirk);   // 2026-11-20 버릇 (게임 spawnAdv와 같음: 창립 멤버 제외)
      s.advs.push(a); return a;
    }
    // ---------- 버릇 (2026-11-20 야간 작업, 규칙은 combat.js QK — 게임 game_core.js와 같음. 시뮬레이터에는 친밀도가 없어 다툼 · 단짝 예외 · 허세꾼 신입 애착은 빠짐) ----------
    const QC = cfg.quirk || null, qkRisk = (a, p) => CB && CB.QK ? CB.QK.risk(QC, a, s.week, p) : 0;
    const rivalHere = a => s.advs.some(b => b !== a && b.alive && b.grade === a.grade);
    const qkMul = a => CB && CB.QK ? CB.QK.xpMul(QC, a, rivalHere(a)) : 1;
    const qkN = k => { s.st.quirk = s.st.quirk || {}; s.st.quirk[k] = (s.st.quirk[k] || 0) + 1; };
    // ---------- 친밀도 (2026-11-20 사용자 요청: 시뮬레이터에도 친밀도) — 게임 game_core.js MEM · relBase · relStep · relTier와 같은 식 ----------
    //   처음 40 (성향 궁합: 무모 · 신중 −15 · 둘 다 사교적 +10 · 독불장군 −10) · 같은 파티 성공 +8(궁합 ±) · 실패 −3 · 단짝 60 이상 · 서먹 30 미만 [임시]
    //   쓰는 곳: 동료 고르기(adv.relParty) · 버릇(다혈질 다툼 · 친밀도 +1 더, 이기적 단짝 예외 · 혼자 후퇴 −5, 허세꾼 신입 애착)
    const REL = { start: 40, win: 8, fail: -3, good: 60, bad: 30 };
    const relKey = (a, b) => a.id < b.id ? a.id + '-' + b.id : b.id + '-' + a.id;
    const relBase = (a, b) => { let v = REL.start; if (Math.abs(a.risk - b.risk) === 2) v -= 15; if (a.social === 2 && b.social === 2) v += 10; if (a.social === 0 || b.social === 0) v -= 10; return v; };
    const relOf = (a, b) => { const v = s.rel[relKey(a, b)]; return v == null ? relBase(a, b) : v; };
    const relAdd = (a, b, d) => { if (a === b) return; const k = relKey(a, b), v = Math.max(0, Math.min(100, relOf(a, b) + d)); s.rel[k] = v; if (d > 0 && v >= REL.good && s.palMet[k] == null) { s.palMet[k] = s.week; (s.st.palWeeks = s.st.palWeeks || []).push(s.week); } };
    const relStep = (a, b) => { let d = REL.win; if (Math.abs(a.risk - b.risk) === 2) d -= 2; if (a.social === 2 && b.social === 2) d += 1; if (a.social === 0 || b.social === 0) d -= 1; return Math.max(2, Math.min(REL.win + 2, d)); };
    const relTier = v => v >= REL.good ? 'good' : v < REL.bad ? 'bad' : '';
    s.rel = s.rel || {}; s.palMet = s.palMet || {};

    function finalStat(a, i) {
      let v = Math.min(G.statCap, a.stats[i]);
      { const e = eqOf(a);   // 2026-11-18 장비 3칸 (게임과 같음)
        if (i === a.core) v += (e[0] >= 0 ? GE.weaponStat[e[0]] : 0) + (e[2] >= 0 ? GE.accStat[e[2]] : 0);
        if (a.pair && a.pair.includes(i) && i !== a.core && e[1] >= 0) v += GE.armorStat[e[1]];
      }
      return v;
    }
    const eqOf = a => Array.isArray(a.eq) ? a.eq : [a.gear, a.gear, a.gear];
    const eqNext = a => { if (GE.pieceBuy === 0) { const e0 = eqOf(a), lo = Math.min(...e0), g0 = Math.min(s.grade, lo + 1); return g0 <= lo ? null : { k: -1, g: g0, price: GE.weaponPrice[g0] * GE.setMult }; } const e = eqOf(a), ord = a.core === 0 || a.core === 3 ? [1, 0, 2] : [0, 1, 2]; let b = null; for (const k of ord) { const g = Math.min(s.grade, e[k] + 1); if (g <= e[k]) continue; if (!b || e[k] < e[b.k]) b = { k, g, price: GE.weaponPrice[g] }; } return b; };   // 게임 eqNext와 같음
    const power = a => { let t = 0; for (let i = 0; i < 5; i++) t += finalStat(a, i); const w = eqOf(a)[0]; return t + (w >= 0 ? GE.weaponAtk[w] : 0) * 0.5; };
    const skillBonus = a => [0.03, 0.06, 0.10][a.stage - 1];

    function makeQuest(g, boss, FT) {   // FT: 정한 의뢰 틀 (길드 의뢰 카드, 게임 makeQuest force와 같음)
      const type = ri(5);
      const n = Q.reqCount[g];
      const req = [type];
      while (req.length < n) { const k = ri(5); if (!req.includes(k)) req.push(k); }
      let C = boss ? null : FT ? [FT] : TPL[type + '_' + g];
      if (!boss && !FT) { const O = liveOrders().filter(o => !SPICE.has(o.m)), B = O.length ? Math.max(...O.map(oBias)) : 0, DUP = E.orderDup || 2; if (B > 0 && R() < B) { const W = []; for (const k in TPL) if (k.endsWith('_' + g)) for (const t of TPL[k]) if ((t.rewards || []).some(r => r.p >= 30 && O.some(o => o.m === r.m)) && s.board.filter(x => x.T && x.T.id === t.id).length < DUP && !(resLow(baseMatOf(t)) && R() < (E.popLowBoard != null ? E.popLowBoard : 0.5))) W.push(t); if (W.length) C = [W[Math.floor(R() * W.length)]]; } }   // 2026-11-19 결정 41 (게임과 같음)
      if (!boss && !FT && C) { const F2 = C.filter(x => !s.board.some(b => b.T === x)); if (!F2.length) return null; C = F2; }   // 게시판에 같은 의뢰가 있으면 안 붙임 (게임과 같음, 2026-11-19)
      let T = !C ? null : C.length > 1 ? C[Math.floor(R() * C.length)] : C[0];   // 칸 후보 중 하나 (1개면 난수 안 씀)
      if (!boss && !FT && T && resLow(baseMatOf(T)) && R() < (E.popLowBoard != null ? E.popLowBoard : 0.5)) { const W = []; for (const k in TPL) if (k.endsWith('_' + g)) for (const t of TPL[k]) if (!resLow(baseMatOf(t)) && !s.board.some(b => b.T === t)) W.push(t); if (W.length) T = W[Math.floor(R() * W.length)]; }   // 결정 44 (게임과 같음)
      const req2 = T && T.stats && T.stats.length ? T.stats.slice() : req;
      const QL = cfg.qlv && cfg.qlv.on ? cfg.qlv : null, LV = QL && T && T.board ? (s.qlv[T.id] || (s.qlv[T.id] = { lv: 1, wins: 0, fresh: 0 })) : null, lv = LV ? LV.lv : 1, fz = !!(LV && LV.fresh > 0);   // 의뢰 레벨 (게임과 같음, 결정 35)
      const DF = ((Q.diff || [])[g] || 1) * (QL ? 1 + QL.foe * (lv - 1) : 1);   // 난이도 배수 (게임 makeQuest와 같음)
      const R0 = (T ? T.ref : Q.ref[g]) * n * (0.85 + R() * 0.30) * (boss ? Q.bossMult : 1) * DF * (T && resLow(baseMatOf(T)) ? 1 + (E.popLowJudge != null ? E.popLowJudge : 0.15) : 1);
      const enemies = [], seen = [];
      if (COMBAT && T && T.enemies) {
        // 개체 차이: 실제 적은 게시된 정보보다 강하거나 약할 수 있음(±enemyVar). 정보실이 있으면 예측이 실제에 가까워짐
        const v = fz ? QL.var : (CB.C.enemyVar || 0), f0 = (1 + (R() * 2 - 1) * v), f = f0 * DF, look = Math.min(1, 0.25 * effN('정보실'));
        const F = Q.partyFrom, PM = (g !== 0 || !F || boss) ? 1 : s.week < F[0] ? (Q.soloMul || 1) : (R() < Q.partyRate[s.week < F[1] ? 0 : 1] ? Q.partyMul[s.week < F[1] ? 0 : 1] : 1);   // 게임 partyMulOf와 같음 (2026-11-19)
        const L0 = []; for (const e of T.enemies) for (let k = 0; k < e.count; k++) L0.push(e);
        const FL = PM < 1 ? L0.slice(0, Math.max(1, Math.ceil(L0.length * PM))) : L0.concat(...Array.from({ length: Math.max(0, PM - 1) }, () => L0.filter(e => !e.boss)));
        for (const e of FL) {
          enemies.push({ hp: e.hp * f, atk: e.atk * f, def: e.def || 0, name: e.name, boss: !!e.boss });
          seen.push({ hp: e.hp * DF * (1 + (f0 - 1) * look), atk: e.atk * DF * (1 + (f0 - 1) * look), def: e.def || 0, name: e.name, boss: !!e.boss });
        }
      }
      return { g, type: T && T.type >= 0 ? T.type : type, req: req2, r: R0 / n, boss: !!boss, T, enemies, seen, combat: enemies.length > 0, posted: s.week, lv, lvm: QL ? 1 + QL.pay * (lv - 1) : 1, fz };
    }

    function successP(party, q, sm) {
      let F = 0, bottleneck = false;
      for (const k of q.req) {
        const vals = party.map(a => (finalStat(a, k) + (a.quirk === 'coward' && QC && (q.type === 2 || q.type === 4) ? QC.cowardStat : 0)) * (sm ? sm(a, k) : 1) * (k === a.core ? 1 + skillBonus(a) : 1)).sort((x, y) => y - x);   // 2026-11-20 겁쟁이: 조사 · 탐사 판정 + (게임과 같음)
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
    const unitOf = (a, mealB, sm) => CB.unit(a, i => finalStat(a, i) * (sm ? sm(a, i) : 1), eqOf(a), mealB);
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
    function gradeBonus(a, n) { const gb = (G.gradeStat || [])[n] || 0; for (let i = 0; i < 5; i++) a.stats[i] = Math.min(G.statCap, a.stats[i] + gb); }   // 2026-11-12 승급 보너스
    function tryGradeUp(a) {
      const lvReq = G.gradeLv || [0, 4, 10, 18, 26, 35, 45], achReq = G.gradeAch || [0, 4, 5, 7, 7, 10, 10];   // 2026-11-20 balance.csv growth.gradeLv · gradeAch (게임과 같음)
      const n = a.grade + 1;
      if (n > 6 || n > s.grade + 1 || n === 6) return; // S급은 길드 S 승급 순간에만. 2026-11-12: 상한 = 길드 등급 + 1 (게임과 같음)
      if (a.lv >= lvReq[n] && a.ach >= achReq[n]) { gradeBonus(a, n); a.grade = n; a.ach = 0; }
    }

    function kill(a, byDemon) {
      a.alive = false; s.st.deaths++; if (byDemon) s.st.battleDeaths++;
      s.trust = Math.max(0, s.trust - (byDemon ? 0 : 1));
      s.heirsQueue.push({ at: s.week + A.heirDelayWeeks, core: R() < 0.7 ? a.core : ri(5), demon: byDemon, risk: byDemon ? 2 : (a.risk === 2 ? 0 : a.risk) });
    }

    function present(a) {
      if (!a.alive || a.busy > 0) return false;
      if (a.attach >= 100 || a.home) return true;
      if (a.heirWeek != null && s.week - a.heirWeek < WPY) return R() < 0.8;
      const interval = A.visitBaseWeeks * (1 + (100 - a.attach) / 50);
      return R() < Math.min(1, 2 / interval);
    }

    // 의뢰 기한 (2026-11-12): 게시 후 expireWeeks 주 동안 아무도 받지 않으면 사라지고 신뢰도 하락
    function expireQuests() {
      const W = Q.expireWeeks || 4;
      for (let i = s.board.length - 1; i >= 0; i--) if (s.board[i].gq == null && s.week - s.board[i].posted >= W) { s.board.splice(i, 1); s.trust = Math.max(0, s.trust - (Q.trustExpire != null ? Q.trustExpire : 1)); s.st.qExpire = (s.st.qExpire || 0) + 1; }
    }
    function generateQuests() {
      if (s.week % WPM === 0) s.x2Owed = s.deco.has('trophy') ? (cfg.deco.x2PerMonth || 0) : 0;
      const mult = T.inflowMult[popStage()] * (0.7 + 0.6 * s.trust / 100) * (1 + 0.1 * s.grade) * (1 + 0.1 * Math.min(1, effN('접수대')));
      const n = Math.round(Q.perMonth * mult / WPM + R() * 0.5);
      const cap = Q.boardCap[s.grade] + [0, 2, 5, 5][Math.min(3, effN('게시판'))];
      for (let i = 0; i < n; i++) {
        // 필터: 상위 등급 집중도(filterFocus)에 따라 배분
        let g = s.grade;
        const r = R();
        if (r > bot.filterFocus) g = ri(s.grade + 1);
        if (s.board.length < cap) { const q = makeQuest(g, false); if (q) { markX2(q); s.board.push(q); } }
      }
    }
    // ×2 의뢰 (2026-11-12): 게시될 때 x2Rate 확률, 트로피 장식장이 있으면 달마다 처음 게시되는 의뢰부터 x2PerMonth건 보장 (게임 markX2와 같음)
    const drawList = q => {   // 2026-11-18 결정 27 (게임 drawList와 같음, 시뮬레이터는 발주 없음)
      const RW = q.T.rewards || []; if (!E.drawMode) return RW;
      const main = RW.filter(r => r.p >= 30), rare = RW.filter(r => r.p < 30), P = E.drawPts || [2, 3];
      let k = q.enemies && q.enemies.length ? q.enemies.length : P[0] + Math.floor(R() * (P[1] - P[0] + 1));
      if (resLow(baseMatOf(q.T))) k = Math.max(1, Math.floor(k * (E.popLowDraw != null ? E.popLowDraw : 0.5)));   // 결정 44
      if ((q.lv || 1) > 1) { const kk = k * q.lvm; k = Math.floor(kk) + (R() < kk - Math.floor(kk) ? 1 : 0); }   // 의뢰 레벨: 소재 개수
      { const G = q.gq != null && (s.gq || []).find(o => o.id === q.gq); if (G && G.kind === 'mat') { const out = []; for (let i = 0; i < k; i++) out.push({ m: G.m, p: 100 }); return out.concat(rare.filter(r => r.m !== G.m)); } }   // 2026-11-20 길드 의뢰 ① 소재 납품: 그 소재만 모아 옴 (게임 drawList와 같음)
      const tot = main.reduce((a, r) => a + r.p, 0), out = [], om = main.find(r => liveOrders().some(o => o.m === r.m)), oo = om && (s.orders || []).find(o => o.m === om.m), ob = oo ? oBias(oo) : 0;   // 발주 중인 소재 (게임과 같음)
      for (let i = 0; i < k && main.length; i++) { if (om && (ob >= 1 || R() < ob)) { out.push({ m: om.m, p: 100 }); continue; } let x = R() * tot, pick = main[main.length - 1]; for (const r of main) { x -= r.p; if (x <= 0) { pick = r; break; } } out.push({ m: pick.m, p: 100 }); }
      return out.concat(rare.map(r => { const so = SPICE.has(r.m) && liveOrders().find(o => o.m === r.m); return so ? { m: r.m, p: Math.max(r.p, oBias(so) * 100) } : r; }));   // 결정 46 (게임 drawList 와 같음)
    };
    const baseMat = T => (T.rewards || []).reduce((b, r) => (!b || r.p > b.p ? r : b), null)?.m;
    // 2026-11-17 경제 개편 V2 결정 12: 게임 dropMats 와 같은 자동 매입 70% · 위탁 10% · 월말 자동 판매(음식 아닌 소재 10개 남김)
    const SIM_MAT = {}; { const G = gameData(); if (G && G.content) for (const m of G.content.materials) SIM_MAT[m.id] = m; }
    const SELL_P = [6, 9, 12, 30, 36, 48, 90], GRL = ['F', 'E', 'D', 'C', 'B', 'A', 'S'];
    // 2026-11-19 V4 3단계 (결정 44): 사냥터 · 채집지 개체수 (게임 resOf · resWeekly 와 같음)
    const baseMatOf = T0 => T0 ? ((T0.rewards || []).reduce((b, r) => (!b || r.p > b.p ? r : b), null) || {}).m : null;
    const RES_G = {}, RES_IDS = (() => { const o = {}; for (const k in TPL) for (const t of TPL[k]) { const m = baseMatOf(t), g = +k.split('_')[1]; if (m) { o[m] = o[m] || !!(t.enemies && t.enemies.length); RES_G[m] = Math.min(RES_G[m] != null ? RES_G[m] : 9, g); } } return o; })();
    const resOf = m => { if (!E.popOn || !(m in RES_IDS)) return null; const RS = s.res = s.res || {}; if (RS[m] == null) RS[m] = E.popStart != null ? E.popStart : 60; return RS[m]; };
    const resLow = m => { const v = resOf(m); return v != null && v < (E.popLow || 30); };
    const resBand = m => { const v = resOf(m); if (v == null || RES_G[m] > s.grade) return null; return v < (E.popLow || 30) ? 0 : v > (E.popHigh || 80) ? 2 : 1; };   // 게임 resBand 와 같음
    const resTake = (m, n) => { if (resOf(m) == null) return; s.res[m] = Math.max(0, s.res[m] - (E.popTake != null ? E.popTake : 3) * n); };
    function resWeekly() { if (!E.popOn) return; const rg = E.popRegen != null ? E.popRegen : 0.12, hi = E.popHigh || 85; let worst = null; for (const m in RES_IDS) { if (RES_G[m] > s.grade) continue; const v = Math.max(1, resOf(m)); s.res[m] = Math.min(100, v + rg * v * (1 - v / 100)); if (RES_IDS[m] && s.res[m] > hi && (!worst || s.res[m] > s.res[worst])) worst = m; } if (worst && s.week % WPM === WPM - 1) s.popAdd -= (E.popHighTown != null ? E.popHighTown : 2); }   // 게임 resWeekly 와 같음
    const BASEP = matBaseTable(E);   // 결정 64
    const matBase0 = id => { if (BASEP[id] != null) return BASEP[id]; const m = SIM_MAT[id]; return m ? (m.price || SELL_P[Math.max(0, GRL.indexOf(m.grade))]) : 0; };
    // 2026-11-19 V4 2단계: 소재 시세 (게임 mktWeekly · matPrice 와 같음). 시뮬레이터는 소재 처리를 기본(매입 70%)으로만 씀
    const SPICE_N = ['소금', '향신료', '신선한 물', '밀가루'];
    const mT = id => SIM_MAT[id] && SPICE_N.includes(SIM_MAT[id].name) ? (E.mktTargetSpice || 15) : (E.mktTarget || 20);
    const mM = id => { const K = s.mkt = s.mkt || {}; if (K[id] == null) K[id] = mT(id); return K[id]; };
    const mMult = id => { if (!E.mktOn) return 1; const T = mT(id); return Math.max(E.mktMin || 0.5, Math.min(E.mktMax || 2, 1 + (E.mktK != null ? E.mktK : 0.6) * (T - mM(id)) / T)); };
    const matBase = id => Math.max(1, Math.round(matBase0(id) * mMult(id)));   // 시뮬레이터 안의 모든 소재 값 = 시세
    const mAdd = (id, n) => { if (E.mktOn && SIM_MAT[id]) { mM(id); s.mkt[id] += n; } };
    function mktWeekly() { if (!E.mktOn) return; const use = E.mktUse != null ? E.mktUse : 0.1, pd = E.mktPop || 100, p0 = T.startPop || 150; for (const id in SIM_MAT) { const t = mT(id), M = mM(id); s.mkt[id] = Math.max(0, M + t * use + (E.mktSupplyPop ? (s.pop || p0) : p0) / pd - M * use - (s.pop || p0) / pd); } }
    // 2026-11-19 V4 1단계 (게임 game_core.js 와 같은 규칙): 상시 발주 · 식당 재료 소모 · 잡화 양념
    const SPICE = new Set(Object.keys(SIM_MAT).filter(id => ['소금', '향신료', '신선한 물', '밀가루'].includes(SIM_MAT[id].name)));
    const oMult = o => o.mult, oPrice = o => Math.floor(matBase(o.m) * oMult(o) + 1e-9);
    const oBias = o => { const i = (E.orderMultOpt || [1.2, 1.5, 2]).findIndex(x => Math.abs(x - o.mult) < 1e-9); return E.orderBiasOpt && i >= 0 ? E.orderBiasOpt[i] : (E.orderBias || 0); };
    const oLive = o => (s.mats[o.m] || 0) < o.target && s.gold >= oPrice(o);
    const liveOrders = () => (s.orders || []).filter(oLive);
    const ordBonus = q => { const O = liveOrders(); if (!O.length || !q.T) return 0; let b = 0; for (const r of q.T.rewards || []) { const o = r.p >= 30 && O.find(x => x.m === r.m); if (o) b += oPrice(o) * r.p / 100; } return b; };
    function autoOrders() {   // 게임 autoOrders 와 같음
      if (!E.mealCook || !(E.orderMode || E.gqOn)) return; const max = E.orderMax != null ? E.orderMax : 3, t = E.orderTarget || 6;
      { const A = s.soldAvg = s.soldAvg || {}, W = s.soldW || {}; for (const d of DISH) if (s.dishes[d.name]) { A[d.name] = (A[d.name] || 0) * 0.7 + (W[d.name] || 0) * 0.3; menuOf(d).prep = Math.max(1, Math.min(10, Math.ceil(A[d.name]) + 1)); } s.soldW = {}; }   // 게임 autoOrders · autoPrep 와 같음
      if (!E.orderMode) { autoGq(); autoRare(); return; }   // 2026-11-20: 게임 autoCook (상시 발주 꺼짐 + 길드 의뢰 켬 → autoPrep · autoGq)
      const srcOk = m => { const sp = SPICE.has(m); for (const k in TPL) { const g = +k.split('_')[1]; if (g > s.grade) continue; for (const t2 of TPL[k]) if ((t2.rewards || []).some(r => r.m === m && (r.p >= 30 || (sp && r.p > 0)))) return true; } return false; };   // 결정 46 (게임 orderSources 와 같음)
      for (const d of DISH) { if (!s.dishes[d.name] || d.g > s.grade) continue;
        for (const m of d.mats) { if ((SPICE.has(m) && E.shopRate) || (s.orders || []).some(o => o.m === m)) continue; if ((s.orders || []).length >= max) return; if (!srcOk(m)) continue; (s.orders = s.orders || []).push({ m, target: t, mult: E.orderMult != null ? E.orderMult : 1.5 }); } }
    }
    // ---------- 2026-11-20 V4 결정 49~56: 길드 의뢰 ① 소재 납품 (게임 gqSrc ~ autoGq 와 같음) ----------
    // 시뮬레이터는 의뢰 결과를 출발 때 정하므로, 귀환 뒤 처리(gqAfter: 다시 게시 · 끝)는 s.gqBack 에 귀환 주를 적어 두고 그 주에 함
    const gqMax = () => { const M = E.gqMax || [2, 3, 4, 5, 6, 7, 8]; return (M[s.grade] != null ? M[s.grade] : M[M.length - 1]) + (s.up && s.up['게시판'] ? (E.gqUpBoard != null ? E.gqUpBoard : 1) : 0); };
    function tplLow(ok) { let best = null, bg = 99, bk = -1; for (const k in TPL) { const g = +k.split('_')[1]; if (g > s.grade) continue; for (const t of TPL[k]) { const v = ok(t); if (v === false || v == null) continue; if (g < bg || (g === bg && v > bk)) { best = t; bg = g; bk = v; } } } return best ? { T: best, g: bg } : null; }   // 게임 tplLow 와 같음
    function gqSrcK(kind, m) {   // 게임 gqSrcK (자동 플레이가 쓰는 ① 소재 납품 · ② 토벌만)
      if (kind === 'hunt') return tplLow(t => t.enemies && t.enemies.length && baseMatOf(t) === m ? 1 : null);
      return tplLow(t => { const r = (t.rewards || []).find(x => x.m === m && (x.p >= 30 || (SPICE.has(m) && x.p > 0))); return r ? r.p : null; }); }
    const gqSrc = m => gqSrcK('mat', m);
    const gqPer = T0 => T0 && T0.enemies && T0.enemies.length ? T0.enemies.reduce((a, e) => a + (e.count || 1), 0) : 2.5;
    const gqBase = (m, n) => { const S = gqSrc(m); return (S ? Math.max(1, Math.round(S.T.reward / gqPer(S.T))) : 0) * n; };
    const gqBaseK = (kind, m, n) => { if (kind !== 'hunt') return gqBase(m, n); const S = gqSrcK('hunt', m); return S ? S.T.reward : 0; };   // ② 토벌 기준 = 그 사냥터 의뢰 보상 (게임 gqBaseK 와 같음)
    const gqRange = (m, n, kind) => { const b = gqBaseK(kind || 'mat', m, n), P = E.gqPct || [0.5, 3]; return [Math.max(10, Math.ceil(b * P[0] / 10 - 1e-9) * 10), Math.max(10, Math.floor(b * P[1] / 10 + 1e-9) * 10)]; };
    const gqPayFor = (o, k) => Math.floor(o.reward * (o.got + k) / o.n + 1e-9) - Math.floor(o.reward * o.got / o.n + 1e-9);
    const gqOpen = () => !E.gqOffice || has('집무실');
    function gqPost(o) { const q = makeQuest(o.g, false, o.T), k = Math.min(o.n - o.got, Math.max(1, Math.round(gqPer(o.T)))); q.gq = o.id; q.gqk = o.kind; q.x2 = false; q.gqRw = o.kind === 'mat' ? gqPayFor(o, k) : o.hold; s.board.push(q); return q; }   // 수수료 0 · 명성 · 신뢰 0 · 보조금 실적 제외 (runQuest)
    function gqPlace(m, n, reward, weeks, kind) { kind = kind || 'mat'; const S = gqSrcK(kind, m); if (!S || s.gold < reward) return; if (kind === 'hunt') s.st.gqHuntN = (s.st.gqHuntN || 0) + 1; const o = { id: s.gqNext = (s.gqNext || 0) + 1, kind, m, n, got: 0, reward, hold: reward, end: s.week + weeks, g: S.g, T: S.T }; s.gold -= reward; (s.gq = s.gq || []).push(o); gqPost(o); }   // 보상은 금고에서 맡아 둠 (운영 순이익에는 지급할 때 넣음)
    function gqClose(o) { if (o.hold > 0) s.gold += o.hold; o.hold = 0; s.gq = (s.gq || []).filter(x => x !== o); }
    function gqWeekly() { for (const o of (s.gq || []).slice()) if (s.week >= o.end) { const i = s.board.findIndex(q => q.gq === o.id); if (i < 0) continue; s.board.splice(i, 1); gqClose(o); } }
    function gqReturns() {   // 게임 returns → gqAfter (generateQuests 뒤)
      const due = (s.gqBack || []).filter(x => x.w <= s.week); if (!due.length) return; s.gqBack = s.gqBack.filter(x => x.w > s.week);
      for (const x of due) { const o = (s.gq || []).find(y => y.id === x.id); if (!o) continue;
        if (o.kind !== 'mat' && x.ok) { const pay = o.hold; o.hold = 0; o.got = 1; s.op -= pay; s.st.gqPaid = (s.st.gqPaid || 0) + pay; splitPay(x.party || [], pay); if (o.kind === 'hunt') { s.st.gqHuntWin = (s.st.gqHuntWin || 0) + 1; if (resOf(o.m) != null) s.res[o.m] = Math.max(0, s.res[o.m] - (x.kill || 1) * (E.gqHuntTake != null ? E.gqHuntTake : 5)); } gqClose(o); continue; }   // 게임 gqAfter → gqWin: 성공하면 맡아 둔 보상 전부 · 토벌은 개체수 −처치 수 × gqHuntTake
        if (o.kind === 'mat' && o.got >= o.n) gqClose(o); else if (s.week < o.end) gqPost(o); else gqClose(o); }
    }
    function autoRare() { const r = E.autoRareRate; if (!r || !E.gqOn) return; const B = s.buyRate = s.buyRate || {};   // 결정 68 (게임 autoRare 와 같음)
      for (const d of DISH) { if (!s.dishes[d.name] || d.g > s.grade) continue; for (const m of d.mats) { if (STAPLE(m)) continue; if ((s.mats[m] || 0) < 1) B[m] = r; else delete B[m]; } } }
    function autoGq() {
      if (!E.gqOn) return; const low = E.gqAutoLow != null ? E.gqAutoLow : 4, n = E.gqAutoN || 6, pct = E.gqAutoPct || 1.2, wk = E.gqAutoWeeks || 4;
      if (E.gqAutoHunt && gqOpen()) for (const m in RES_IDS) { if ((s.gq || []).length >= gqMax()) return; if (!RES_IDS[m] || resBand(m) !== 2 || (s.gq || []).some(o => o.kind === 'hunt' && o.m === m) || !gqSrcK('hunt', m)) continue;   // 게임 autoGq: 개체수 '많음'인 사냥터는 토벌
        const Rg = gqRange(m, 1, 'hunt'), rw = Math.min(Rg[1], Math.max(Rg[0], Math.round(gqBaseK('hunt', m, 1) * pct / 10) * 10)); if (s.gold - rw >= (E.gqAutoKeep != null ? E.gqAutoKeep : 200)) gqPlace(m, 1, rw, wk, 'hunt'); }
      // 결정 63: 소재 납품 없음 — 상시 재료는 식당이 시장에서 삼 (게임 autoGq 와 같음)
    }
    // 매입 개편 (결정 52 · 53, 게임 sellTh 와 같음): 파티 판매 기준 = 씀씀이별 기준 평균 − 애착 할인
    function sellTh(party) { const Tt = E.sellTh || [0.9, 0.85, 0.75], Aa = E.sellAttach || [60, 90], Cc = E.sellAttachCut || [0.05, 0.1]; const ps = (party || []).filter(Boolean); if (!ps.length) return 0;
      return ps.reduce((t, a) => t + (Tt[a.spend] != null ? Tt[a.spend] : 0.85) - ((a.attach || 0) >= Aa[1] ? Cc[1] : (a.attach || 0) >= Aa[0] ? Cc[0] : 0), 0) / ps.length; }
    // ---------- 2026-11-20 V4 결정 57~62: 떠돌이 상단 (게임 CARS ~ autoCar 와 같음, 시세 = matBase) ----------
    const CAR_FOOD = new Set(); for (const d of DISH) if (!d.dungeon) for (const m of d.mats) CAR_FOOD.add(m);   // 게임과 같음: 던전 요리 재료 제외
    const CARS = [
      { id: 'farm', g: 0, gap: [5, 8], likes: m => CAR_FOOD.has(m) },
      { id: 'smith', g: 1, gap: [8, 12], likes: m => /^mat_(mine|hunt|slay|guard)_/.test(m) || m === 'mat_x015' || m === 'mat_x001' },
      { id: 'herb', g: 2, gap: [10, 14], likes: m => /^mat_study_/.test(m) || ['mat_x016', 'mat_x008'].includes(m) },
    ];
    const carGap = c => { const G0 = (E.carGap || {})[c.id] || c.gap; return G0[0] + Math.floor(R() * (G0[1] - G0[0] + 1)); };
    const carRelLv = st => { const T0 = E.carRel || [200, 600]; return st.rel >= T0[1] ? 3 : st.rel >= T0[0] ? 2 : 1; };
    function carState(c) { const C = s.car = s.car || {}; if (!C[c.id]) C[c.id] = { next: Math.max(s.week, E.carFirstWeek || 0) + carGap(c), rel: 0, here: false, order: [], last: {} }; return C[c.id]; }
    const carOpenList = () => CARS.filter(c => c.g <= s.grade);
    function carMakeOrder(c, st) {
      const lv = carRelLv(st), k = (E.carKinds || 3) + (lv - 1), M = E.carMult || [1.1, 1.6], Qn = E.carQty || [5, 15];
      const pool = Object.keys(SIM_MAT).filter(m => GRL.indexOf(SIM_MAT[m].grade) <= s.grade && c.likes(m));
      const out = []; while (out.length < k && pool.length) { const i = Math.floor(R() * pool.length), m = pool.splice(i, 1)[0];
        out.push({ m, mult: Math.round((M[0] + R() * (M[1] - M[0])) * 100) / 100, max: Qn[0] + Math.floor(R() * (Qn[1] - Qn[0] + 1)) + (lv - 1) * (E.carQtyLv != null ? E.carQtyLv : 5), sold: 0 }); }
      return out;
    }
    const carPrice = o => Math.max(1, Math.round(matBase(o.m) * o.mult));
    const carLastMult = m => { let b = 0; for (const c of carOpenList()) { const st = (s.car || {})[c.id]; if (st && st.last[m] > b) b = st.last[m]; } return b; };
    const consN = m => (s.cons || []).filter(e => e.m === m).reduce((t0, e) => t0 + e.n, 0);
    const consFee = sale => sale > 0 ? Math.min(sale, Math.max(1, Math.round(sale * (E.consignFee != null ? E.consignFee : 0.1)))) : 0;   // 게임 consignFeeOf 와 같음
    function carSell(st, o, n) { n = Math.min(n, o.max - o.sold, s.mats[o.m] || 0); if (n <= 0) return; const g = carPrice(o) * n; s.mats[o.m] -= n; o.sold += n; st.rel += g; s.gold += g; s.op += g; s.st.carG = (s.st.carG || 0) + g; }   // 상단 판매는 시장 재고에 넣지 않음
    function carConsSell(st) {
      for (const e of (s.cons || []).slice()) { const o = st.order.find(x => x.m === e.m); if (!o || o.sold >= o.max) continue;
        const k = Math.min(e.n, o.max - o.sold), sale = carPrice(o) * k, fee = consFee(sale); o.sold += k; st.rel += sale; e.n -= k;
        splitPay(e.ps, sale - fee); s.gold += fee; s.op += fee; s.st.consFee = (s.st.consFee || 0) + fee; s.st.consN = (s.st.consN || 0) + k;
        if (e.n <= 0) s.cons.splice(s.cons.indexOf(e), 1); }
    }
    function carWeekly() {   // 게임 carWeekly 와 같음 (stepWeek 의 gqWeekly 뒤)
      if (!E.carOn) return; const keep = E.consWeeks || 8;
      for (const c of carOpenList()) { const st = carState(c);
        if (st.here && s.week >= st.until) { st.here = false; for (const o of st.order) st.last[o.m] = o.mult; st.order = []; st.next = s.week + carGap(c); }
        if (!st.here && s.week >= st.next) { st.here = true; st.until = s.week + (E.carStay || 1); st.order = carMakeOrder(c, st); s.st.carVisit = (s.st.carVisit || 0) + 1; carConsSell(st); } }
      for (const e of (s.cons || []).slice()) if (s.week - e.w >= keep) { splitPay(e.ps, matBase(e.m) * e.n); mAdd(e.m, e.n); s.cons.splice(s.cons.indexOf(e), 1); }   // 8주가 지나면 모험가가 찾아가 시장에 팖
    }
    const needsMoney = a => { if (a.spend === 2) return true; const nx = eqNext(a); return !!nx && a.wallet < nx.price * (1 + GE.reserveMult[a.spend] * 0.5); };   // 게임 needsMoney 와 같음
    function consWant(party, m) {   // 게임 consWant 와 같음 (시장 · 매입가 = matBase 기준)
      if (!E.carOn) return false; const lm = carLastMult(m); if (!lm) return false; const mp = matBase(m), rate = E.matBuyRate != null ? E.matBuyRate : 0.85, alt = Math.max(mp, Math.floor(mp * rate + 1e-9));
      if (mp * lm * 0.9 < alt * (E.consEdge != null ? 1 + E.consEdge : 1.1)) return false;
      return (party || []).every(a => a && !needsMoney(a)) && (s.mats[m] || 0) + consN(m) < (E.storeCap || 30);
    }
    function consAdd(party, m) { const L = s.cons = s.cons || [], e = L.find(x => x.m === m && x.w === s.week && x.ps.length === party.length && x.ps.every((a, i) => a === party[i])); if (e) e.n++; else L.push({ m, ps: party.slice(), n: 1, w: s.week }); }
    function autoCar() {   // 게임 autoCar 와 같음: 리퀘스트 필요량 + 메뉴 재료 gqAutoLow 는 남기고 주문서대로 팖
      if (!E.carOn) return; const RS = {}; if (s.rq) for (const r of s.rq.open) for (const [m, k] of Object.entries(needOf(r).mats || {})) RS[m] = (RS[m] || 0) + k;
      const low = E.gqAutoLow != null ? E.gqAutoLow : 4, menu = new Set(); for (const d of DISH) if (s.dishes[d.name]) for (const m of d.mats) menu.add(m);
      for (const c of carOpenList()) { const st = (s.car || {})[c.id]; if (!st || !st.here) continue; for (const o of st.order) { if (menu.has(o.m)) continue; const n = (s.mats[o.m] || 0) - ((RS[o.m] || 0) + (menu.has(o.m) ? low : 0)); if (n > 0) carSell(st, o, n); } }
    }
    const dishBase = d => { if (E.mealPriceMode === 1 && d.mats.length) { const c = d.mats.reduce((a, m) => a + matBase0(m), 0) / (d.serv || 2), A = E.mealGradeAdd || [5, 15, 25, 40, 50, 70, 100]; return Math.max(1, Math.round(c * (E.mealCostK || 2) + (A[d.g] || 0))); } return Math.round(Q.reward[d.g] * E.mealPriceRate); };   // 게임 dishBase 와 같음
    const menuOf = d => { const M = s.menu = s.menu || {}; if (!M[d.name]) M[d.name] = { price: dishBase(d), prep: E.mealPrep != null ? E.mealPrep : 4, left: E.mealLeft === 2 ? 'free' : 'sale' }; return M[d.name]; };
    const salePrice = d => { const mu = menuOf(d), old = ((s.bowls || {})[d.name] || []).some(b => b.n > 0 && b.w < s.week); return mu.left === 'sale' && old ? Math.max(1, Math.floor(mu.price * (E.mealSale != null ? E.mealSale : 0.5) + 1e-9)) : mu.price; };   // 결정 47 (게임과 같음)
    const priceK = (d, price) => Math.max(E.mealPMin != null ? E.mealPMin : 0.1, Math.min(E.mealPMax != null ? E.mealPMax : 1.6, 1 + (E.mealPK != null ? E.mealPK : 1.5) * (1 - price / (dishBase(d) || 1))));
    const stockOf = d => ((s.bowls || {})[d.name] || []).reduce((a, b) => a + b.n, 0);
    const shopPrice = id => Math.ceil(matBase(id) * (E.shopRate != null ? E.shopRate : 1.5) - 1e-9);
    const STAPLE = id => SPICE.has(id) || (SIM_MAT[id] && DISH.some(d => d.mats.includes(id)) && GRL.indexOf(SIM_MAT[id].grade) <= (E.stapleGrade != null ? E.stapleGrade : -1));   // 결정 65: 상시 재료 (게임 isStaple 과 같음)
    function kitchenWeekly() {
      if (!E.mealCook) return; const B = s.bowls = s.bowls || {};
      for (const d of DISH) { if (!s.dishes[d.name]) continue;
        const L0 = B[d.name] || [], L = L0.filter(b => b.n > 0 && s.week - b.w <= 1), mu = menuOf(d); let have = L.reduce((a, b) => a + b.n, 0);
        if (mu.left === 'free') { let waste = L0.filter(b => b.n > 0 && s.week - b.w > 1).reduce((a, b) => a + b.n, 0); const T2 = s.advs.filter(a => a.alive && a.busy === 0).sort((x, y) => x.attach - y.attach); let k = 0; while (waste > 0 && k < T2.length) { const a = T2[k++]; a.attach = Math.min(100, a.attach + (E.freeAttach != null ? E.freeAttach : 1)); waste--; } }   // 결정 47: 무료 식사
        while (have < mu.prep) {
          const RS = {}; if (s.rq) for (const r of s.rq.open) for (const [m, k] of Object.entries(needOf(r).mats || {})) RS[m] = (RS[m] || 0) + k;   // 게임 reqReserve 와 같음
          const keep = m => (RS[m] || 0) + (E.mealKeep || 0), need = d.mats.filter(m => !((s.mats[m] || 0) - keep(m) >= 1)); if (need.some(m => !STAPLE(m)) || (need.length && !E.shopRate) || need.some(m => E.mktOn && mM(m) < 1)) break;   // 결정 65: 희귀 재료가 없거나 시장에도 없으면 품절
          const cost = need.reduce((a, m) => a + shopPrice(m), 0); if (cost > s.gold) break;
          for (const m of need) { const c = shopPrice(m); s.gold -= c; s.op -= c; s.st.shopPaid = (s.st.shopPaid || 0) + c; s.mats[m] = (s.mats[m] || 0) + 1; mAdd(m, -1); }   // 시장에서 사면 시장 재고가 줄어 시세가 오름
          for (const m of d.mats) s.mats[m]--;
          const n = d.serv || 2; L.push({ n, w: s.week }); have += n;
        }
        B[d.name] = L; }
    }
    const takeBowl = d => { const L = (s.bowls || {})[d.name] || []; L.sort((a, b) => a.w - b.w); const b = L.find(x => x.n > 0); if (b) b.n--; };
    const splitPay = (ps, total) => { const live = ps.filter(a => a.alive); if (!live.length || total <= 0) return; const b0 = Math.floor(total / live.length), rem = total - b0 * live.length; live.forEach((a, i) => { a.wallet += b0 + (i < rem ? 1 : 0); }); };   // 그 의뢰에서 가장 잘 나오는 소재
    function markX2(q) {
      const r = R();
      if (s.x2Owed > 0) { q.x2 = true; s.x2Owed--; } else if (r < (Q.x2Rate || 0)) q.x2 = true;
      if (q.x2) s.st.x2 = (s.st.x2 || 0) + 1;
    }

    function mealFor(q) { // 그 의뢰 등급 이하에서 가장 높은 해금 요리 등급
      for (let g = q.g; g >= 0; g--) if (s.meals[g] > 0) return g;
      return -1;
    }
    function runQuest(party, q) {
      let mealB = 0, sm = null;
      if (QC && party.some(m => m.quirk === 'bluff')) for (const b of party) if (b.quirk === 'bluff') for (const m of party) if (m !== b && s.rel[relKey(b, m)] == null && m.joined >= s.week - 8) m.attach = Math.min(100, m.attach + QC.bluffNew);   // 허세꾼: 처음 같은 파티가 된 신입 애착 + (게임과 같음)
      let dish = null, bs = -1; for (const d of DISH) { if (!s.dishes[d.name] || d.g > q.g || (E.mealCook && stockOf(d) <= 0)) continue; const sc = d.stats.filter(k => q.req.includes(k)).length * 1000 + d.g * 10 + d.pct * 100; if (sc > bs) { bs = sc; dish = d; } }   // 게임 dishFor와 같음
      const ate = new Set();   // 2026-11-20: 대식가 배고픔 판정에 쓰려고 밖으로 꺼냄
      if (dish) {
        let eaters = 0;
        for (const a of party) {
          if (s.seatUsed >= s.tables * 2) break;   // 2026-11-12: 앉을 자리(테이블 세트 × 2)만큼만 이번 주에 식사
          if (E.mealCook && stockOf(dish) <= 0) break;   // 2026-11-19 결정 37: 품절
          const full = E.mealCook ? menuOf(dish).price : Q.reward[dish.g] * E.mealPriceRate, sp = E.mealCook ? salePrice(dish) : full; let price = full;
          if (!(a.wallet >= full && R() < Math.min(1, E.mealBuyRate[a.spend] * (a.quirk === 'glutton' && QC ? QC.glutMeal : 1) * (E.mealCook ? priceK(dish, full) : 1)))) { if (!(sp < full && a.wallet >= sp && R() < Math.min(1, E.mealBuyRate[a.spend] * (a.quirk === 'glutton' && QC ? QC.glutMeal : 1) * priceK(dish, sp)))) continue; price = sp; }   // 결정 47 (게임과 같음)
          const inc = E.mealCook ? price : price * E.mealMargin;
          { s.seatUsed++; a.wallet -= price; if (E.mealCook) { takeBowl(dish); const W = s.soldW = s.soldW || {}; W[dish.name] = (W[dish.name] || 0) + 1; } s.gold += inc; s.op += inc; s.st.mealIncome += inc; eaters++; ate.add(a); }
        }
        const gb = a => a.quirk === 'glutton' && QC ? QC.glutBuff : 1;   // 2026-11-20 대식가 요리 버프 × (게임과 같음)
        if (dish.stats.length) sm = (a, k) => ate.has(a) && dish.stats.includes(+k) ? (E.mealMode ? 1 + dish.val * gb(a) / Math.max(1, finalStat(a, +k)) : 1 + dish.pct * gb(a)) : 1;   // 2026-11-19 버프: 능력치 +val (게임과 같음)
        // 메뉴가 2개 열려 있으면 의뢰 유형에 맞는 요리를 고를 확률이 높음
        mealB = E.mealMode ? 0 : (eaters / party.length) * E.mealPerDish * Object.keys(s.dishes).length * (1 + 0.5 * (effN('주점') >= 3 ? 1 : 0));   // 2026-11-05: 발견한 요리 하나당 +2% (등급 무관)
      }
      let ok, fightRes = null; const qkEv = [];
      if (q.combat) {
        const C = CB.C, price = C.potionPrice[Math.min(q.g, s.grade)];
        for (const a of party) { const want = C.potionCarry[a.spend] - (R() < 0.5 ? 1 : 0); while (a.pots < want && a.wallet >= price) { a.wallet -= price; a.pots++; s.st.potionGold += price; } }
        const U = party.map(a => unitOf(a, mealB, sm));
        const pr = CB.QK && QC && party.some(a => a.quirk) ? CB.QK.prep(U, { Qc: QC, week: s.week, R, p: party.some(a => a.quirk === 'coward') ? questP(party, q) : 1, risk: party[0].risk, ate: a => ate.has(a), dish: !!dish, bad: (a, b) => relTier(relOf(a, b)) === 'bad', pal: (a, b) => relTier(relOf(a, b)) === 'good' }) : { ev: [], risk: party[0].risk };   // 게임 launchParty와 같음
        for (const e of pr.ev) { qkN(e.k); if (e.k === 'quarrel') qkEv.push(e); }
        fightRes = CB.fight(U, q.enemies, q.g, R, pr.risk);
        for (const u of fightRes.units) { if (u.fled) qkN(u.fled === 'selfish' ? 'selfFlee' : 'cowardFlee'); if (u.fled === 'selfish') qkEv.push({ k: 'selfFlee', a: u.a }); if (u.covered) qkN('cover'); }
        ok = fightRes.win; s.st.combatQ++; if (ok) s.st.combatWin++;
        if (q.g <= 1) { const k = q.g * 2 + (party.every(m => Math.min(...eqOf(m)) >= q.g) ? 1 : 0); s.st.gearFx[k][1]++; if (ok) s.st.gearFx[k][0]++; }   // F·E급: 그 등급 장비를 다 갖춘 파티인지
      } else {
        if (QC && dish) for (const m of party) if (m.quirk === 'glutton' && !ate.has(m) && R() < qkRisk(m, QC.glutHunger)) { qkN('hunger'); const s0 = sm, hm = m; sm = (a, k) => (s0 ? s0(a, k) : 1) * (a === hm ? QC.glutHungerMul : 1); }   // 대식가 배고픔 (게임과 같음)
        const p = Math.min(0.97, successP(party, q, sm) * (1 + mealB));
        ok = R() < p;
      }
      let late = false; { const L = cfg.late; if (L && L.on) { const pr = m => L.base + [0, 0.01, 0.04][m.spend] + [-0.01, 0, 0.03][m.social] + [-0.01, 0, 0.02][m.risk]; if (party.some(m => R() < Math.max(0, pr(m)))) { if (ok && L.soft) late = true; ok = false; } } }   // 결정 19 · 30 (게임과 같음)
      if (fightRes) for (const u of fightRes.units) {   // 전투의 대가: 물약 소모, 쓰러진 사람은 부상·사망 판정
        const a = u.a; a.pots = u.pots; s.st.potionsUsed += u.used;
        if (!u.down || u.fled) continue;   // 2026-11-20 혼자 물러난 사람은 부상 없음 (게임과 같음)
        s.st.injuries++;
        const d = (q.T ? q.T.death : Q.deathBase[q.g]) * CB.C.deathRisk[a.risk] * (1 - 0.15 * Math.min(1, effN('의무실')));
        if (R() < d) { kill(a, false); s.st.questDeaths++; continue; }
        a.busy += Math.max(1, CB.C.injuryWeeks[q.g] - (has('의무실') ? CB.C.injuryClinic : 0) - (s.deco.has('fireplace') ? cfg.deco.injury : 0) + (CB.QK ? CB.QK.injAdj(QC, a, u, s.week) : 0));   // 2026-11-20 술꾼 −1주 · 헌신 +1주
      }
      const fee = q.boss ? 0 : q.reward != null ? 0 : 0;
      const reward = q.gq != null ? 0 : (q.T ? q.T.reward * (q.lvm || 1) : Q.reward[q.g]) * (q.boss ? 2 : 1) * (q.x2 ? 2 : 1);   // ×2 의뢰는 골드만 2배 · 길드 의뢰: 보상은 납품마다 (아래 소재 처리)
      if (q.gq != null) (s.gqBack = s.gqBack || []).push({ id: q.gq, w: s.week + (q.T ? q.T.weeks : Q.weeks[q.g]), ok, party: party.slice(), kill: (q.enemies || []).length || 1 });   // 귀환 주에 gqAfter (성공 · 실패 모두)
      { const L = cfg.qlv; if (L && L.on && q.T && s.qlv[q.T.id]) { const V = s.qlv[q.T.id]; if (q.fz && V.fresh > 0) V.fresh--; if (ok && !resLow(baseMatOf(q.T)) && V.lv < L.max && ++V.wins >= L.need) { V.lv++; V.wins = 0; V.fresh = L.fresh; } } }   // 의뢰 레벨 (게임 qlvAfter와 같음)
      if (ok) {
        s.st.qDone++; if (q.gq == null) s.subHalf = (s.subHalf || 0) + (q.T ? q.T.reward * (q.lvm || 1) : Q.reward[q.g]); s.popAdd += T.perSuccess[q.g] || 0;   // 성과 보조금 실적: 기본 보상만 (게임과 같음 — ×2 · 보스 배수 전, 2026-11-18 보스 ×2 집계를 빼서 게임에 맞춤)   // 의뢰 성공 → 인구 (2026-11-13)
        const omR = QC && party.some(a => a.quirk === 'omen') && CB && CB.QK && !CB.QK.rainy(seed, s.week) ? QC.omenRare : 0;   // 2026-11-20 미신가: 맑은 달 희귀 소재 +%p
        if (q.T) { let paid = 0; const G = q.gq != null && (s.gq || []).find(o => o.id === q.gq), th = E.gqOn ? sellTh(party) : 0;
          for (const r of drawList(q)) if (R() * 100 < r.p + (omR && r.p < 30 ? omR : 0)) {
            if (G && G.kind === 'mat' && G.m === r.m && G.got < G.n) { const pay = gqPayFor(G, 1); G.got++; G.hold -= pay; s.op -= pay; s.st.gqPaid = (s.st.gqPaid || 0) + pay; s.mats[r.m] = (s.mats[r.m] || 0) + 1; splitPay(party, pay); resTake(r.m, 1); continue; }   // 2026-11-20 길드 의뢰 ①: 약속한 소재는 길드 창고로, 1개씩 맡아 둔 돈에서 지급 (게임 dropMats와 같음)
            mAdd(r.m, 1); resTake(r.m, 1);
            { const o = (s.orders || []).find(x => x.m === r.m && oLive(x)); if (o) { const op = oPrice(o); s.gold -= op; s.op -= op; s.st.orderPaid = (s.st.orderPaid || 0) + op; s.mats[r.m] = (s.mats[r.m] || 0) + 1; splitPay(party, op); continue; } }
            const rate = (E.gqOn && s.buyRate && s.buyRate[r.m] != null) ? s.buyRate[r.m] : E.matBuyRate != null ? E.matBuyRate : (E.gqOn ? 0.85 : 0.7), bp = Math.floor(matBase(r.m) * rate + 1e-9), room = (s.mats[r.m] || 0) < (E.storeCap || 30);
            if (E.gqOn && consWant(party, r.m)) { consAdd(party, r.m); continue; }   // 2026-11-20 결정 62: 상단 위탁 (게임 dropMats 와 같음)
            if (E.gqOn) { if (rate >= th - 1e-9 && s.gold >= bp && room) { s.mats[r.m] = (s.mats[r.m] || 0) + 1; s.gold -= bp; s.op -= bp; s.st.matBuyPaid = (s.st.matBuyPaid || 0) + bp; paid += bp; } else { splitPay(party, matBase(r.m)); s.st.mktSellN = (s.st.mktSellN || 0) + 1; } continue; }   // 결정 52 · 53: 매입가가 파티 판매 기준 이상 · 금고 · 창고 여유가 있으면 길드, 아니면 모험가가 시장에 직접 팖 (위탁 없음, 게임 dropMats와 같음 — 시뮬레이터 시세 = matBase)
            if (room && s.gold >= bp) { s.mats[r.m] = (s.mats[r.m] || 0) + 1; s.gold -= bp; s.op -= bp; s.st.matBuyPaid = (s.st.matBuyPaid || 0) + bp; paid += bp; } else (s.consign = s.consign || []).push({ m: r.m, ps: party.slice() });
          }
          splitPay(party, paid); }   // 소재 획득 → 자동 매입 (게임 dropMats와 같음)
        if (q.T && s.deco.has('locker')) { const b = baseMat(q.T); if (b) s.mats[b] = (s.mats[b] || 0) + cfg.deco.mat; }   // 사물함: 기본 소재 +1
        const canMk = m => E.mealCook && E.shopRate && STAPLE(m) && (!E.mktOn || mM(m) >= 1);   // 게임 canMarket 과 같음 (결정 65 확장)
        for (const d of DISH) if (!d.dungeon && !s.dishes[d.name] && d.g <= s.grade && d.mats.every(m => s.mats[m] > 0 || canMk(m)) && d.mats.some(m => s.mats[m] > 0) && d.mats.filter(m => !(s.mats[m] > 0)).reduce((a, m) => a + shopPrice(m), 0) <= s.gold) { for (const m of d.mats) if (!(s.mats[m] > 0)) { const c = shopPrice(m); s.gold -= c; s.op -= c; s.st.shopPaid = (s.st.shopPaid || 0) + c; s.mats[m] = 1; mAdd(m, -1); } for (const m of d.mats) s.mats[m]--; s.dishes[d.name] = s.week; s.meals[d.g]++; s.st.mealsUnlocked.push(s.week); }
        // 2026-11-17 경제 개편 V2 결정 8: 게임 econSplit 과 같은 정수 배분 (나머지는 대장 먼저 1G씩, 길드 몫 버림)
        const RW = Math.floor(reward), n = party.length, b0 = Math.floor(RW / n), rem = RW - b0 * n, fr = feeRate();
        const nets = party.map((_, i) => { const b = b0 + (i < rem ? 1 : 0); return b - Math.floor(b * fr + 1e-9); });
        const inc = (RW - nets.reduce((x, y) => x + y, 0)) + reward * E.resaleRate * (1 + 0.1 * effN('판매창구'));
        const bench = s.deco.has('bench') && q.gq == null ? cfg.deco.gold : 0;
        s.gold += inc + bench; s.op += inc + bench; s.st.feeInc = (s.st.feeInc || 0) + inc + bench;
        party.forEach((a, i) => { a.wallet += nets[i]; });
        for (const a of party) {
          gainXp(a, (G.xpBase * Math.pow(G.xpGradeMult, q.g) + (s.deco.has('map') ? cfg.deco.xp : 0)) * qkMul(a));   // 2026-11-20 이기적 · 경쟁심 경험치 +
          a.stats[q.type] = Math.min(G.statCap, a.stats[q.type] + Q.subGrowth);
          a.attach = Math.min(100, a.attach + A.attachSuccess * (1 + 0.2 * Math.min(1, effN('휴게실'))) + (s.deco.has('plant') ? cfg.deco.attach : 0));
          if (q.g >= a.grade + 1 || (q.g >= a.grade && a.grade === s.grade)) a.ach++;
          tryGradeUp(a);
        }
        s.trust = Math.min(100, s.trust + (q.gq != null ? 0 : q.T && q.T.trustS != null ? q.T.trustS : Q.trustSucc) + (s.deco.has('boardDeco') ? cfg.deco.trust : 0));   // 길드 의뢰 카드: 명성 · 신뢰 0 (게임 gqPost와 같음)
        s.fame = Math.min(cfg.fame.cap, s.fame + (q.gq != null ? 0 : q.T ? q.T.fameS : cfg.fame.succ[q.g]) + (s.deco.has('banner') ? cfg.deco.fame : 0));
      } else {
        s.st.qFail++;
        if (!late && q.gq == null) { s.trust = Math.max(0, s.trust - (q.T && q.T.trustF != null ? q.T.trustF : Q.trustFail));
        s.fame = Math.max(0, s.fame - (q.T ? q.T.fameF : cfg.fame.fail[q.g])); }
        for (const a of party) {
          gainXp(a, G.xpBase * Math.pow(G.xpGradeMult, q.g) * G.xpFailRate * qkMul(a));
          if (q.combat) continue;   // 전투 의뢰는 위에서 쓰러진 사람만 판정
          const d = (q.T ? q.T.death : Q.deathBase[q.g]) * [0.5, 1, 1.5][a.risk] * (1 - 0.15 * Math.min(1, effN('의무실')));
          if (R() < d) { kill(a, false); s.st.questDeaths++; }
        }
      }
      // 친밀도 (게임 memQuest · qkReturn과 같음): 같은 파티 성공 +relStep(다혈질 +1 더) / 실패 −3, 다툼 · 혼자 후퇴는 −
      for (let i = 0; i < party.length; i++) for (let j = i + 1; j < party.length; j++) { const a = party[i], b = party[j]; relAdd(a, b, ok ? relStep(a, b) + ((a.quirk === 'hot' || b.quirk === 'hot') && QC ? QC.hotRel : 0) : REL.fail); }
      for (const e of qkEv) { if (e.k === 'quarrel') { const a = party.find(m => m.id === e.id), b = party.find(m => m.id === e.with); if (a && b) relAdd(a, b, -QC.hotFightRel); } else if (e.k === 'selfFlee') for (const b of party) if (b !== e.a) relAdd(e.a, b, -QC.selfishRel); }
      return ok;
    }

    function adventurersChoose() {
      const idle = s.advs.filter(a => present(a) && !a.resv && !a.dgResv);   // 2026-11-20 던전 예약자도 (게임 reqReserved와 같음)   // 2026-11-19: 지명 예약자는 게시판 의뢰를 받지 않음 (게임 reqReserved와 같음)   // s.seatUsed 는 weekly 에서 0으로 (지명 출발이 먼저 식사)
      for (const a of idle) {
        if (a.busy > 0 || !a.alive) continue;
        if (a.quirk && QC) {   // 2026-11-20 버릇: 술꾼 늦잠 · 미신가 비 (게임 qkSkip과 같음)
          if (a.quirk === 'drunk' && R() < qkRisk(a, QC.drunkSleep) * (s.drinkIds && s.drinkIds.has(a) ? 2 : 1)) { qkN('oversleep'); continue; }
          if (a.quirk === 'omen' && CB.QK.rainy(seed, s.week) && R() < qkRisk(a, QC.omenRain)) { qkN('omenWait'); continue; }
        }
        const range = [[-1, 0], [-1, 1], [0, 2]][a.risk];
        let hi = Math.min(s.grade, a.grade + range[1]), lo = Math.min(hi, Math.max(0, a.grade + range[0]));   // 게임과 같음 (2026-11-12)
        let th = A.departTh[a.risk];
        if (a.quirk === 'bluff' && QC && R() < qkRisk(a, QC.bluffSneak)) { hi = Math.min(s.grade, hi + 1); th -= QC.bluffTh; qkN('sneak'); }   // 허세꾼 (게임과 같음)
        const GE = cfg.gear, nxe = eqNext(a), needy = a.spend === 2 || (!!nxe && a.wallet < nxe.price * (1 + GE.reserveMult[a.spend] * 0.5));   // 게임 needsMoney 와 같음 (V2 결정 11)
        const effq = q => ((q.gq != null ? q.gqRw : Math.floor((q.T ? q.T.reward * (q.lvm || 1) : Q.reward[q.g]) * (q.x2 ? 2 : 1) * (1 - feeRate()) + 1e-9)) + ordBonus(q)) / (q.T ? q.T.weeks : Q.weeks[q.g]), oh = q => (E.orderFirst || !E.orderMode) && ordBonus(q) > 0 ? 1 : 0;   // 발주 값 (게임 questEff 와 같음) · 상시 발주(orderMode 1)는 '가장 먼저 맡음' 없이 발주 값으로만 끌림 (게임 ordHit 와 같음)
        const cands = s.board.map((q, i) => ({ q, i })).filter(o => o.q.g >= lo && o.q.g <= hi).sort(needy ? (x, y) => (oh(y.q) - oh(x.q)) || (effq(y.q) - effq(x.q)) || (y.q.g - x.q.g) : (x, y) => (oh(y.q) - oh(x.q)) || (y.q.g - x.q.g));   // 발주 소재 의뢰를 가장 먼저 (게임 pickOrder 와 같음)
        const base0 = E.feeBase != null ? E.feeBase : 0.1, skipP = needy && E.restK && a.quirk !== 'selfish' ? Math.min(1, Math.max(0, feeRate() - base0) / base0 * E.restK) : 0;   // 게임과 같은 보완(결정 22) — 시뮬레이터는 수수료가 하나
        for (const { q, i } of cands) {
          if (skipP > 0 && R() < skipP) continue;
          let party = [a];
          let pp = perceived(a, questP(party, q));
          if (pp < A.seekTh[a.social]) {
            let mates = idle.filter(b => b !== a && b.busy === 0 && b.alive && Math.abs(b.grade - q.g) <= 1);
            const RP = A.relParty || 0;   // 2026-11-20 친밀도: 동료를 고를 때 친밀도 + 흔들림(±relParty/2) 큰 순서 (게임과 같음)
            if (RP > 0 && mates.length > 1) mates = mates.map(b => ({ b, k: relOf(a, b) + (R() - 0.5) * RP })).sort((x, y) => y.k - x.k).map(x => x.b);
            mates = mates.slice(0, 4);
            for (const m of mates) { party.push(m); if (perceived(a, questP(party, q)) >= th) break; }
            pp = perceived(a, questP(party, q));
          }
          if (pp >= th && QC && pp < 0.7 && party.some(m => m.quirk === 'coward' && R() < qkRisk(m, QC.cowardQuit))) { qkN('cowardQuit'); break; }   // 겁쟁이 출발 직전 빠짐 (게임과 같음)
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
      const dr = new Set();
      for (const a of idle) if (a.alive && a.busy === 0 && R() < Math.min(1, E.mealBuyRate[a.spend] * (a.quirk === 'drunk' && QC ? QC.drunkDrink : 1))) { const m = DM[s.grade] || DM[0]; s.gold += m; s.op += m; dr.add(a); }
      if (QC) for (const a of dr) { if (a.quirk !== 'drunk' || a.qkMo === Math.floor(s.week / WPM)) continue; const b = [...dr].find(x => x !== a); if (!b) continue; a.qkMo = Math.floor(s.week / WPM); b.attach = Math.min(100, b.attach + QC.drunkAttach); }   // 술꾼: 함께 마신 동료 애착 + (게임과 같음)
      s.drinkIds = dr;
      s.idleIds = new Set(idle.filter(a => a.alive && a.busy === 0));   // 2026-11-20 던전: 이번 주 마을에 남은 사람 (게임 state 'town'과 같음 — 다음 주 예약 즉시 출발 판정에 씀)
    }

    function bestParty(pool, q, n) {
      const sorted = pool.slice().sort((x, y) => power(y) - power(x));
      let party = [];
      for (const a of sorted) { party.push(a); if (party.length >= n) break; if (successP(party, q) >= 0.95) break; }
      return party;
    }

    function bossStep() {
      const g = s.grade;
      if (g === 0 && COMBAT && !(cfg.run && cfg.run.noMain)) return;   // 2026-11-18 E8-1: F급에는 승급용 보스 의뢰가 없음 (게임과 같음 — F → E는 리퀘스트 8회 + 메인 퀘스트). 예전엔 첫해 판당 3.3번 돌아 수수료 · 보조금 실적이 게임보다 많았음
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
      if (g === 0 && COMBAT && !(cfg.run && cfg.run.noMain)) return;   // F → E 승급은 메인 퀘스트(mainStep)로 (2026-11-16)
      if (g >= 6 || s.phase !== 'normal' || s.bossDone < P.N[g] || s.invasionCooldown > s.week) return;
      if (g === 5 && s.advs.filter(a => a.alive && !a.external && a.grade >= 5 && a.lv >= 45).length < P.sCandidates) return;
      const enemy = P.invasionScale * typical(g + 1) * 0.5;
      const est = (() => { const d = s.advs.filter(a => a.alive); const pw = d.reduce((t, a) => t + power(a) * (a.attach >= 100 ? 1 : 0.6), 0); const x = pw / enemy - 1; return 1 / (1 + Math.exp(-P.battleK * x)); })();
      if (est < bot.promoteTh && s.week - (s.st.reach[g] || 0) < 6 * WPY) return; // 보류 (단, 6년 이상 정체면 강행)
      const res = battle(enemy, defenders(), true);
      if (res.win) {
        s.st.invW++; s.grade++; s.st.reach[s.grade] = s.week; s.fame = Math.min(cfg.fame.cap, s.fame + cfg.fame.gradeUp[s.grade]); s.bossDone = 0; s.boss = []; s.bossRefill = [];
        if (s.grade === 6) {
          for (const a of s.advs) if (a.alive && !a.external && a.grade === 5 && a.lv >= 45) { gradeBonus(a, 6); a.grade = 6; }
          s.phase = 'officers'; s.officer = 0; s.mainCooldown = s.week + 4;
        }
      } else {
        s.st.invL++; s.pop *= (1 - T.invasionLoss); s.invasionCooldown = s.week + 2 * WPM;
      }
    }

    function raidStep() {
      if (s.grade === 0 && COMBAT && !(cfg.run && cfg.run.noMain)) return;   // 2026-11-20: F급(1년 차)에는 게임에 습격이 없음 — 침공(메인 퀘스트)만 (game_core.js와 같게). 예전엔 시뮬레이터만 습격 방어 보상금을 써서 관문 1 차이가 벌어짐
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
      if (E.subsidyMode === 1) { if (Math.floor(s.week / WPM + 1) % (E.subsidyEvery || 6) === 0) { const pay = Math.floor((s.subHalf || 0) * (E.subsidyRate != null ? E.subsidyRate : 0.5) + 1e-9); s.gold += pay; s.op += pay; if (s.week < WPY) s.st.subPaid = (s.st.subPaid || 0) + pay; s.subHalf = 0; } }   // V2 결정 13: 반기 지급 (게임과 같음)
      else { s.gold += E.subsidy[s.grade]; s.op += E.subsidy[s.grade]; }
      { const cf = E.consignFee != null ? E.consignFee : 0.1; for (const e of s.consign || []) { const sale = matBase(e.m), fee = sale > 0 ? Math.min(sale, Math.max(1, Math.round(sale * cf))) : 0; s.gold += fee; s.op += fee; splitPay(e.ps, sale - fee); } s.consign = []; }   // 위탁품 판매 (결정 12)
      for (const id in s.mats) { const m = SIM_MAT[id]; if (m && m.line !== 'food' && s.mats[id] > 10) { const k = s.mats[id] - 10; let g = 0; for (let i = 0; i < k; i++) { g += matBase(id) + (s.up && s.up['판매창구'] ? (E.upSell || 3) : 0); mAdd(id, 1); } s.mats[id] = 10; s.gold += g; s.op += g; if (s.week < WPY) s.st.sellInc = (s.st.sellInc || 0) + g; } }   // 자동 판매 (게임 autoSell과 같음)
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
      tablePolicy(false);   // 테이블 세트 (게임 autoPlace와 같은 시점: 월말 결산 뒤)
      // 인구
      { const st = popStage() + 1; let up = 0;
        for (const h of s.houses) { if (up >= T.upgradePerMonth) break; if (h.lv < st && h.age >= T.upgradeWait) { h.lv++; h.age = 0; up++; } }
        for (const h of s.houses) h.age++;
        const residents = s.advs.filter(a => a.alive && a.attach >= T.residentAttach).length;
        const want = s.pop + T.baseAdd + s.popAdd + (s.rq ? s.rq.popMonthly : 0) + residents * T.perResident; s.popAdd = 0;
        if (HS.length) { addHouses(want); s.pop = Math.min(want, capAll()); } else s.pop = want; }
      // 애착(마을에 머문 모험가)
      for (const a of s.advs) if (a.alive && a.busy === 0) a.attach = Math.min(100, a.attach + A.attachPerMonthInTown * 0.5);
      // 이탈
      for (const a of s.advs) if (a.alive && !a.rebirth && a.attach < A.leaveAttach && s.week - a.joined > A.leaveAfterYears * WPY) a.alive = false;
      // 신규 모험가 (fameStep이 0일 때만 예전 확률 방식. 지금은 매주 명성 방문 = fameArrivals)
      if (!A.fameStep) { const lam = A.arrivalPerMonth * (0.7 + 0.6 * s.trust / 100) * (1 + cfg.fame.maxBonus * Math.min(1, s.fame / cfg.fame.full)); // 신뢰도 × 명성
      let k = Math.floor(lam); if (R() < lam - k) k++;
      const advCap = (A.capByGrade || [8, 12, 16, 20, 24, 28, 32])[s.grade] || 8;   // 2026-11-12: 게임(game_core.js advCap)과 같게 길드 등급별 모험가 상한 적용
      for (let i = 0; i < k && s.advs.filter(x => x.alive).length < advCap; i++) {
        const ext = R() < 0.05 && s.grade > 0 ? Math.min(6, s.grade + (R() < 0.3 ? 2 : 1)) : 0;
        const a = newAdv({ grade: ext });
        if (s.demonFlagFallback) { a.demonHeir = true; a.heirWeek = s.week; s.demonFlagFallback = false; s.st.demonFallback = true; }
      } }
      // 2세
      s.heirsQueue = s.heirsQueue.filter(h => { if (h.at <= s.week) { newAdv({ core: h.core, heirOf: true, demonHeir: h.demon, risk: h.risk }); s.st.heirs++; return false; } return true; });
      // 전직 제안 (월 1회)
      for (const a of s.advs) if (a.alive) tryPromoteClass(a);
      // 장비 구매
      for (const a of s.advs) {
        if (!a.alive || (GE.needSmith && !(s.townUnlock || {}).smith)) continue;   // 2026-11-19: 대장간이 생기기 전에는 장비를 사지 않음 (게임과 같음)
        const n = eqNext(a); if (!n) continue;   // 2026-11-18: 한 달에 1칸 (게임과 같음)
        if (a.wallet >= n.price * (1 + GE.reserveMult[a.spend] * 0.5)) { a.wallet -= n.price; const e = eqOf(a).slice(); if (n.k < 0) e.fill(n.g); else e[n.k] = n.g; a.eq = e; a.gear = Math.min(...e); }
      }
      if (s.gold < 0) s.st.negMonths++;
      if (s.week < WPY) s.st.firstNetF.push(s.op);
      s.op = 0;
    }


    // ===== 서브 퀘스트 (리퀘스트) · 지명 (2026-11-16) — 게임 game_core.js 의 req* 규칙 + autoRequests(검증용 자동 처리)와 같은 모델 =====
    // 등장: 매주 조건을 채운 것 중 하나가 50% (동시에 4개) · 마감 없음 · 계절 퀘스트는 그 계절에만 진행 · 실패해도 다시 도전
    // 자동 처리: 돈 내기는 내고도 1,500G 남을 때 · 납품은 소재가 있을 때 · 지명은 집무실에서 조건(★) 채운 모험가부터 불러 예상 성공률 60% 이상이면 보냄
    const NQ = (cfg.run && cfg.run.noRequests) ? [] : (((gameData() || {}).namedQuests) || []), NQ_BY = {}; for (const d of NQ) NQ_BY[d.id] = d;
    const RQC = { maxOpen: Infinity, appear: 0.5, base: [0.40, 0.65, 0.90, 1.00], riskMul: [[1.0, 0.8, 0.5], [1.0, 1.0, 0.8], [1.0, 1.1, 1.2]], rowOrder: [0, 4, 1, 3, 2], bossHp: 3, bossAtk: 1.3, reserve: 400, send: 0.6 };
    const RQT = { hunt: 0, search: 2 }, RQT_BY = { f_req_bat05: 3, f_req_srch04: 1, f_req_srch01: 3, f_req_srch05: 3, f_req_srch06: 3 };
    const R2 = rng((seed ^ 0x9E3779B9) >>> 0);   // 게임처럼 리퀘스트 난수는 따로
    s.rq = { open: [], done: {}, popMonthly: 0 }; s.st.reqAppear = 0; s.st.reqDone = 0; s.st.reqFail = 0; s.st.reqGold = 0;
    const seasonOf = w => { const mo = (2 + Math.floor(w / WPM)) % 12 + 1; return mo >= 3 && mo <= 5 ? 'spring' : mo >= 6 && mo <= 8 ? 'summer' : mo >= 9 && mo <= 11 ? 'autumn' : 'winter'; };
    const alive = () => s.advs.filter(a => a.alive);
    const OWN = { any: a => true, social40: a => a.social === 2 && a.attach >= 40, calm65: a => a.attach >= 65 && a.risk !== 2 && a.social !== 0, wild8: a => (a.risk === 2 || a.social === 0) && a.lv >= 8 };
    const ownerFor = d => { if (!d.owner) return null; const used = new Set(s.rq.open.map(r => r.who).filter(Boolean)); return alive().filter(a => OWN[d.owner](a) && !used.has(a)).sort((x, y) => y.attach - x.attach || x.id - y.id)[0] || null; };
    function condOk(c) {
      const k = c[0], op = c[1], v = c[2], n = c[3], cmp = x => op === '=' ? x === v : x >= v;
      if (k === 'done') return !!s.rq.done[v];
      if (k === 'pop') return cmp(Math.round(s.pop)); if (k === 'fame') return cmp(Math.floor(s.fame)); if (k === 'trust') return cmp(Math.floor(s.trust)); if (k === 'gold') return cmp(Math.floor(s.gold));
      if (k === 'advs') return cmp(alive().length); if (k === 'tables') return cmp(s.tables); if (k === 'decos') return cmp(s.deco.size);
      if (k === 'wins') return cmp(s.st.combatWin); if (k === 'dishes') return cmp(Object.keys(s.dishes).length); if (k === 'social') return cmp(alive().filter(a => a.social === 2).length);
      if (k === 'lv') return alive().filter(a => a.lv >= v).length >= n;
      if (k.indexOf('stat.') === 0) { const i = { str: 0, dex: 1, int: 2, wis: 3, tec: 4 }[k.slice(5)]; return alive().some(a => Math.round(finalStat(a, i)) >= v); }
      if (k.indexOf('mat.') === 0) return cmp(s.mats[k.slice(4)] || 0);
      return false;
    }
    const yearOf = w => Math.floor(w / WPY);
    const eligible = d => !s.rq.open.some(r => r.d === d) && !(s.rq.done[d.id] != null && (d.repeat !== 'yearly' || yearOf(s.rq.done[d.id]) >= yearOf(s.week)));
    const ready = d => d.cond.every(condOk) && (!d.season.length || d.season.includes(seasonOf(s.week))) && (!d.owner || !!ownerFor(d));
    const nominated = d => d.type === 'hunt' || d.type === 'search';
    const lockOf = r => (r.d.season.length && !r.d.season.includes(seasonOf(s.week))) || (nominated(r.d) && !has('집무실'));
    const needOf = r => r.d.type === 'donate' ? { gold: r.d.cost.gold, mats: {} } : r.d.type === 'deliver' ? { gold: 0, mats: r.d.cost.mats } : r.d.type === 'town' ? (r.stage === 1 ? { gold: 0, mats: r.d.cost.mats } : { gold: r.d.cost.gold2, mats: {} }) : { gold: 0, mats: {} };
    const canPay = r => { const n = needOf(r); return s.gold >= n.gold && Object.keys(n.mats).every(m => (s.mats[m] || 0) >= n.mats[m]); };
    const meets = (r, a) => !r.d.req ? true : r.d.req[0] === -1 ? a === r.who : Math.round(finalStat(a, r.d.req[0] === -2 ? a.core : r.d.req[0])) >= r.d.req[1];
    const chanceOf = (r, a) => a === r.who ? 1 : Math.min(1, RQC.base[attachTier(a)] * RQC.riskMul[a.risk][r.d.risk] + (QC && a.quirk === 'bluff' ? QC.bluffNom : QC && a.quirk === 'devoted' ? QC.devotedNom : 0));   // 2026-11-20 허세꾼 · 헌신 지명 수락 +
    function questOf(r) {
      const d = r.d, si = !d.req || d.req[0] === -2 ? 0 : d.req[0] >= 0 ? d.req[0] : (r.who ? r.who.core : 0), enemies = [], seen = [];
      if (d.type === 'hunt' && COMBAT) for (const f of d.foes) { const M = ((gameData().content || {}).monsters || []).find(m => m.id === f.mon); if (!M) continue;
        for (let k = 0; k < f.count; k++) { const e = { hp: M.hp * (f.boss ? RQC.bossHp : 1), atk: M.atk * (f.boss ? RQC.bossAtk : 1), def: M.def || 0, name: f.name, boss: !!f.boss }; enemies.push(e); seen.push(Object.assign({}, e)); } }
      return { g: 0, type: RQT_BY[d.id] != null ? RQT_BY[d.id] : RQT[d.type], req: [si], r: d.r || Q.ref[0], boss: false, enemies, seen, combat: enemies.length > 0, posted: s.week,
        T: { reward: d.rw.gold, weeks: d.weeks, death: 0, fameS: d.rw.fame, fameF: 0, trustS: d.rw.trust, trustF: 1, rewards: [] } };
    }
    const sortRow = party => party.slice().sort((x, y) => RQC.rowOrder.indexOf(x.core) - RQC.rowOrder.indexOf(y.core));
    function complete(r, party) {
      const d = r.d, rw = d.rw;
      if (!nominated(d)) { if (rw.gold) { s.gold += rw.gold; s.op += rw.gold; s.st.reqGold = (s.st.reqGold || 0) + rw.gold; }   /* 납품 보상: 운영 순이익에 넣음 (게임 month.reqIn) */ if (rw.fame) s.fame = Math.min(cfg.fame.cap, s.fame + rw.fame); if (rw.trust) s.trust = Math.min(100, s.trust + rw.trust); }
      if (rw.pop) s.popAdd += rw.pop;
      if (rw.attach) { const w = rw.attach[0], n = rw.attach[1], list = w === 'all' ? alive() : w === 'party' ? (party || []) : (r.who ? [r.who] : []); for (const a of list) if (a.alive) a.attach = Math.min(100, a.attach + n); }
      for (const m of Object.keys(rw.mats)) s.mats[m] = (s.mats[m] || 0) + rw.mats[m];
      if (rw.town) (s.townUnlock = s.townUnlock || {})[rw.town] = true;   // 2026-11-19: 마을 건물 해금 (대장간 = 장비 구매 시작, 게임과 같음)
      if (rw.unlock === 'table') s.tableCap = Math.min(4, s.tableCap + 1);   // 장식은 자동 배치가 사지 않으므로(게임 autoPlace와 같음) 효과 없음
      const ex = rw.extra || {};
      if (ex.popMonthly) s.rq.popMonthly += ex.popMonthly;
      if (ex.recipe) { const dd = DISH.find(x => !x.dungeon && !s.dishes[x.name] && x.g <= s.grade); if (dd) { s.dishes[dd.name] = s.week; s.meals[dd.g]++; } }
      if (ex.ownerStat && r.who && r.who.alive) r.who.stats[r.who.core] = Math.min(G.statCap, r.who.stats[r.who.core] + ex.ownerStat);
      if (ex.ownerXp && r.who && r.who.alive) gainXp(r.who, ex.ownerXp);
      s.rq.done[d.id] = s.week; s.rq.open.splice(s.rq.open.indexOf(r), 1); s.st.reqDone++;
    }
    function reqStep() {
      if (!NQ.length) return;
      for (const r of s.rq.open.slice()) {
        const d = r.d;
        if (r.run) {   // 원정 중인 지명 파티: 게임처럼 돌아오는 주에 결과를 반영 (그동안 목록 칸을 차지함, 2026-11-16)
          if (s.week < r.run.at) continue;
          const x = r.run; delete r.run;
          if (x.win) complete(r, x.party); else { r.party = r.who ? [r.who] : []; s.st.reqFail++; }
          continue;
        }
        if (r.who && !r.who.alive) { s.rq.open.splice(s.rq.open.indexOf(r), 1); continue; }
        if (d.type === 'install') { const m = /^(\w+)(>=|=)(\d+)$/.exec(d.goal || ''); if (m && condOk([m[1], m[2], +m[3], 1])) complete(r, null); continue; }
        if (nominated(d) && !has('집무실') && s.gold - (E.officeCost || 1000) >= RQC.reserve) { s.gold -= (E.officeCost || 1000); s.built['집무실'] = true; s.st.facWeek['집무실'] = s.week; }
        if (lockOf(r)) continue;
        if (!nominated(d)) {
          const n = needOf(r); if (!canPay(r) || s.gold - n.gold < RQC.reserve) continue;
          s.gold -= n.gold; s.st.reqGold += n.gold; for (const m of Object.keys(n.mats)) s.mats[m] -= n.mats[m];   // 돈 내기는 건설처럼 운영 순이익(op)에 넣지 않음
          if (d.type === 'town' && r.stage === 1) r.stage = 2; else complete(r, null);
          continue;
        }
        if (mqBlocked()) continue;   // 침공 대비 주에는 지명하지 않음 (게임과 같음)
        r.party = r.party.filter(a => a.alive && (a === r.who || a.busy === 0 || (r.waitUntil && a.busy <= 2)));   // 그사이 다른 의뢰를 떠난 사람은 파티에서 뺌
        const pool = alive().filter(a => (a.busy === 0 || (a.busy <= 2 && !a.resv)) && !a.dgResv && !r.party.includes(a) && r.refused.get(a) !== s.week).sort((x, y) => { const k = a => finalStat(a, d.req && d.req[0] === -2 ? a.core : questOf(r).req[0]); return (meets(r, y) - meets(r, x)) || (k(y) - k(x)); });
        const q0 = questOf(r), okNow = () => r.party.length >= d.party[0] && r.party.some(a => meets(r, a)) && r.party.every(a => a.alive) && questP(sortRow(r.party), q0) >= RQC.send;
        for (const a of pool) { if (r.party.length >= d.party[1] || okNow()) break; if (!meets(r, a) && !r.party.some(m => meets(r, m))) break;   /* ★부터 구한다 (게임 autoRequests와 같음) */ const fee = a === r.who ? 0 : (E.scoutFee || [])[a.grade] || 0; if (s.gold - fee < RQC.reserve) break; s.gold -= fee; a.wallet += fee; s.op -= fee; s.st.scoutGold = (s.st.scoutGold || 0) + fee;   /* 섭외비: 거절당해도 나감, 운영 순이익에 넣음 · 2026-11-17 결정 10: 부탁받은 모험가 지갑으로 */ if (R2() < chanceOf(r, a)) r.party.push(a); else r.refused.set(a, s.week); R2(); }
        if (!okNow()) continue;
        if (r.party.some(a => a.busy > 0)) {   // 2026-11-19 예약: 곧 돌아올 사람을 기다림(게임 autoWaitMax와 같은 3주), 넘으면 그 사람을 빼고 다시 구함
          if (!r.waitUntil) r.waitUntil = s.week + 3;
          if (s.week >= r.waitUntil) { for (const a of r.party) a.resv = false; r.party = r.party.filter(a => a === r.who || a.busy === 0); r.waitUntil = 0; } else for (const a of r.party) a.resv = true;
          continue;
        }
        for (const a of r.party) a.resv = false; r.waitUntil = 0;
        const party = sortRow(r.party), q = questOf(r);
        if (QC && party.some(a => a.quirk === 'coward' || a.quirk === 'omen')) {   // 2026-11-20 겁쟁이 · 미신가: 출발 직전 미룸 → 다음 주 (게임 reqLaunch와 같음)
          const pp = questP(party, q), cw = pp < 0.7 && party.some(a => a.quirk === 'coward' && R() < qkRisk(a, QC.cowardQuit));
          const om = !cw && CB.QK.rainy(seed, s.week) && party.some(a => a.quirk === 'omen' && R() < qkRisk(a, QC.omenRain));
          if (cw || om) { qkN(cw ? 'cowardQuit' : 'omenWait'); continue; }
        }
        for (const m of party) m.busy = d.weeks;
        r.run = { at: s.week + d.weeks, win: runQuest(party, q), party };   // 결과는 지금 정하고, 반영은 돌아오는 주에
      }
      if (s.rq.open.length < RQC.maxOpen) {
        const cands = NQ.filter(d => eligible(d) && ready(d));
        if (cands.length && R2() < RQC.appear) { const d = cands[Math.floor(R2() * cands.length)], ow = ownerFor(d); s.rq.open.push({ d, stage: 1, who: ow, party: ow && d.party ? [ow] : [], refused: new Map() }); s.st.reqAppear++; }
      }
    }

    // ---------- F급 메인 퀘스트: 침공 "다리를 지켜라" (2026-11-16) — 게임 game_core.js MAIN_CFG · mainFight · mainWeekly와 같은 규칙 ----------
    const MQC = { foeScale: 0.8, need: 10, lead: 2, block: 1, retry: 4, rest: 0.3, revive: 0.4, castle: 1, group: 6, deathLoss: 0.01, popLoss: 0.1, trustLoss: 5, gold: 1000, fame: 10, accept: 0.6, trials: 20,
      waves: [{ mon: 'mon_04', n: 6, hp: 1.1, atk: 1.1 }, { mon: 'mon_04', n: 6, hp: 1.43, atk: 1.32 }, { mon: 'mon_04', n: 6, hp: 1.76, atk: 1.54 }, { mon: 'mon_05', n: 1, hp: 5.5, atk: 3.3, boss: true }] };
    const MQ2 = [{ 0: 50 }, { 1: 50 }, { 4: 50 }, { 2: 50 }, { 3: 50 }, { 0: 35, 1: 35 }, { 0: 40, 2: 30 }, { 0: 30, 3: 40 }, { 0: 30, 4: 40 }, { 1: 40, 2: 30 }, { 1: 35, 3: 35 }, { 1: 30, 4: 40 }, { 2: 40, 3: 30 }, { 2: 35, 4: 35 }, { 3: 30, 4: 40 }];   // 2차 전직 조건 (게임 CLASS2)
    const MONS = (gameData() && gameData().content && gameData().content.monsters) || [];
    s.mq = { state: 'none', at: null, cool: 0, tries: 0 }; s.st.mainOffer = null; s.st.mainClear = null; s.st.mainTries = 0;
    const mqFoes = w => { const M = MONS.find(m => m.id === w.mon) || { hp: 300, atk: 55, def: 20 }; return Array.from({ length: w.n }, () => ({ hp: M.hp * w.hp * MQC.foeScale, atk: M.atk * w.atk * MQC.foeScale, def: M.def || 0, boss: !!w.boss })   /* 게임 MAIN_CFG.foeScale과 같음 (2026-11-19) */); };
    const mqBlocked = () => s.mq.state === 'set' && s.mq.at - s.week <= MQC.block;
    function mqFight(defs, Rf) {
      const down = new Set(); let castle = 0;
      let U = sortRow(defs).map(a => Object.assign(unitOf(a, 0), { pots: 0 }));
      if (!U.length) return { win: false, down };
      for (let w = 0; w < MQC.waves.length; w++) {
        let foes = mqFoes(MQC.waves[w]);
        for (;;) {
          const r = CB.fight(U.filter(u => !u.down && u.hp > 0), foes, MQC.group, Rf, 2), by = new Map(r.units.map(u => [u.a, u]));
          U = U.map(u => { const x = by.get(u.a); return x ? Object.assign(u, { hp: x.down ? 0 : x.hp, down: x.down }) : u; });
          for (const u of U) if (u.down) down.add(u.a);
          if (r.win) break;
          if (castle >= MQC.castle) return { win: false, down };
          castle++;
          const left = r.foesLeft || foes.map(e => e.hp);   // 남은 적은 남은 체력 그대로 (게임 mainWaveFight와 같음)
          foes = foes.map((e, i) => Object.assign({}, e, { hp: left[i] })).filter(e => e.hp > 0); if (!foes.length) break;
          U = U.map(u => Object.assign(u, { hp: Math.max(u.down ? 0 : u.hp, u.maxHp * MQC.revive), down: false }));
        }
        if (w < MQC.waves.length - 1) U = U.map(u => u.down ? Object.assign(u, { hp: u.maxHp * MQC.revive, down: false }) : Object.assign(u, { hp: Math.min(u.maxHp, u.hp + u.maxHp * MQC.rest) }));
      }
      return { win: true, down };
    }
    function mainStep() {
      if (!COMBAT || s.grade > 0 || (cfg.run && cfg.run.noMain)) return; const M = s.mq, al = () => s.advs.filter(a => a.alive && !a.external);
      if (M.state === 'offer') {   // 자동: 예상 승률이 accept 이상이면 받음
        const defs = al(), Rp = rng((((seed >>> 0) ^ 0x51ED270B) + s.week * 7919) >>> 0); let win = 0;
        for (let i = 0; i < MQC.trials; i++) if (mqFight(defs, Rp).win) win++;
        if (defs.length && win / MQC.trials >= MQC.accept) { M.state = 'set'; M.at = s.week + MQC.lead; }
      }
      if (M.state === 'none' && s.st.reqDone >= MQC.need) { M.state = 'offer'; s.st.mainOffer = s.week; }   // 리퀘스트를 need회 들어주면 등장 (게임 mainReady와 같음)
      else if (M.state === 'cool' && s.week >= M.cool) M.state = 'offer';
      else if (M.state === 'set' && s.week >= M.at) {
        const defs = al().filter(a => a.busy === 0), r = mqFight(defs, R); M.tries++; s.st.mainTries++;
        const wk = Math.max(1, CB.C.injuryWeeks[0] - (has('의무실') ? CB.C.injuryClinic : 0) - (s.deco.has('fireplace') ? cfg.deco.injury : 0));
        for (const a of defs) { if (!r.down.has(a)) continue; s.st.injuries++; if (!r.win && R() < MQC.deathLoss) { a.alive = false; s.st.questDeaths++; continue; } a.busy += wk; }
        if (r.win) { M.state = 'done'; s.st.mainClear = s.week; s.grade = 1; s.st.reach[1] = s.week; s.gold += MQC.gold; s.op += MQC.gold; s.fame = Math.min(cfg.fame.cap, s.fame + MQC.fame); }
        else { s.pop -= Math.floor(s.pop * MQC.popLoss); s.trust = Math.max(0, s.trust - MQC.trustLoss); M.state = 'cool'; M.cool = s.week + MQC.retry; }
      }
    }

    // ---------- 던전 (2026-11-20) — 규칙 combat.js DG (게임과 공용), 수치 cfg.dungeon. 게임 game_core.js dg* 와 같은 규칙 ----------
    const DGL = CB && CB.DG, DC = cfg.dungeon || {}, dgOn = () => !!(DGL && COMBAT && DGL.on(DC));
    const dgDef = () => DGL.list[s.dg.key];
    const dgOdds = (party, how) => { const P = sortRow(party); return DGL.odds(dgDef(), P.map(a => unitOf(a, 0)), P[0], P[0].risk, DC, !!s.dg.clear, how); };
    function dgLaunch(party0) {
      const d = dgDef(), party = sortRow(party0), lead = party[0], U0 = party.map(a => unitOf(a, 0)), p0 = DGL.odds(d, U0, lead, lead.risk, DC, !!s.dg.clear);
      const pr = CB.QK && QC && party.some(a => a.quirk) ? CB.QK.prep(U0, { Qc: QC, week: s.week, R, p: p0, risk: lead.risk, ate: () => false, dish: false, bad: (a, b) => relTier(relOf(a, b)) === 'bad', pal: (a, b) => relTier(relOf(a, b)) === 'good' }) : { ev: [], risk: lead.risk };
      for (const e of pr.ev) qkN(e.k);
      const res = DGL.run(d, U0, lead, pr.risk, R, DC, { cleared: !!s.dg.clear }), ok = res.cleared3;
      for (const u of res.units) { if (u.fled) qkN(u.fled === 'selfish' ? 'selfFlee' : 'cowardFlee'); if (u.covered) qkN('cover'); }
      const gain = s.dg.clear ? 0 : DGL.prog(DC, p0, res), chip = DGL.chip(p0);
      s.st.dgChip = s.st.dgChip || [0, 0, 0]; s.st.dgChip[chip]++;
      for (const u of res.units) {   // 쓰러진 사람: 부상 · 사망 (게임 returns의 전투 부상과 같은 식, 던전 등급 기준)
        const a = u.a; a.pots = u.pots; s.st.potionsUsed += u.used;
        if (!u.down || u.fled) continue; s.st.injuries++; s.st.dgInj = (s.st.dgInj || 0) + 1;
        const dr = Q.deathBase[d.g] * CB.C.deathRisk[a.risk] * (1 - 0.15 * Math.min(1, effN('의무실')));
        if (R() < dr) { kill(a, false); s.st.questDeaths++; continue; }
        a.busy += Math.max(1, CB.C.injuryWeeks[d.g] - (has('의무실') ? CB.C.injuryClinic : 0) - (s.deco.has('fireplace') ? cfg.deco.injury : 0) + (CB.QK ? CB.QK.injAdj(QC, a, u, s.week) : 0));
      }
      for (const m of party) m.busy += DC.weeks;
      s.dg.run = { at: s.week + DC.weeks, party, ok, gain, mats: res.mats, rare: res.rare, boss: res.boss, risky: res.risky, start: s.week };
    }
    function dgReturn() {
      const x = s.dg.run, D = s.dg, d = dgDef(); delete D.run; const party = x.party.filter(a => a.alive);
      for (const a of party) { gainXp(a, G.xpBase * Math.pow(G.xpGradeMult, d.g) * (x.ok ? 1 : G.xpFailRate) * qkMul(a)); if (x.ok) a.attach = Math.min(100, a.attach + A.attachSuccess); }
      if (x.mats) s.mats.mat_mine_E = (s.mats.mat_mine_E || 0) + x.mats; if (x.rare) s.mats.mat_study_E = (s.mats.mat_study_E || 0) + x.rare;
      for (let i = 0; i < party.length; i++) for (let j = i + 1; j < party.length; j++) relAdd(party[i], party[j], x.ok ? relStep(party[i], party[j]) : REL.fail);
      const p0 = D.prog; if (!D.clear) D.prog = Math.min(100, D.prog + x.gain);
      D.runs.unshift({ w: x.start, ok: x.ok, boss: x.boss, gain: x.gain }); s.st.dgRuns = (s.st.dgRuns || 0) + 1; if (x.ok) s.st.dgOk = (s.st.dgOk || 0) + 1;
      if (DC.set && !D.setRecipe && p0 < DC.setAt && D.prog >= DC.setAt) { D.setRecipe = s.week; s.st.dgSet = s.week; }
      if (!D.clear && D.prog >= 100) {
        D.clear = s.week; s.st.dgClear = s.week;
        if (DC.royal) { s.fame = Math.min(cfg.fame.cap, s.fame + DC.clearFame); s.gold += DC.clearGold; s.op += DC.clearGold; }   // 왕국 포상 (게임과 같음)
        const rare = d.items.find(it => it.rare); if (DC.rare && rare && !D.rare) { D.rare = { key: rare.key, holder: null, gone: null }; s.gearInv[rare.key] = 1; }
        const dd = DISH.find(z => z.dungeon === d.key); if (DC.recipe && dd && !s.dishes[dd.name]) { s.dishes[dd.name] = s.week; s.meals[dd.g]++; }
        if (DC.title) for (const a of party) a.attach = Math.min(100, a.attach + DC.titleAttach);
      }
    }
    function dgGive(a, it) {
      s.gearInv[it.key]--; a.sp = Array.isArray(a.sp) ? a.sp.slice() : [null, null, null];
      const old = a.sp[it.slot]; if (old && DGL.items[old] && !DGL.items[old].rare) s.gearInv[old] = (s.gearInv[old] || 0) + 1;
      a.sp[it.slot] = it.key; if ((a.eq[it.slot] == null ? -1 : a.eq[it.slot]) < it.g) a.eq[it.slot] = it.g;
      if (it.rare) { const prev = s.advs.find(b => s.dg.rare && b.id === s.dg.rare.holder); if (prev && prev !== a && Array.isArray(prev.sp)) prev.sp[2] = null; s.dg.rare.holder = a.id; }
    }
    function dgStep() {
      if (!dgOn()) return;
      if (s.dg && s.dg.run && s.week >= s.dg.run.at) dgReturn();
      if (!s.dg && s.week >= DC.openWeek) { s.dg = { key: Object.keys(DGL.list)[0], open: s.week, prog: 0, clear: null, setRecipe: null, runs: [], rare: null, plan: null, made: {} }; s.gearInv = s.gearInv || {}; }
      if (!s.dg) return; const D = s.dg;
      if (D.rare && D.rare.holder != null && !D.rare.gone) { const a = s.advs.find(x => x.id === D.rare.holder); if (!a || !a.alive) { D.rare.gone = s.week; s.st.dgRareLost = s.week; } }
      const items = dgDef().items;
      if (DC.auto && !D.run && !D.plan && !mqBlocked()) {   // 자동 진행 (게임 dgAuto와 같음): 부위마다 한 벌 만들기 · 주기 · 파티 예약
        for (const it of items) if (!it.rare && !D.made[it.key] && DC.set && D.setRecipe && it.recipe.every(r => (s.mats[r.m] || 0) >= r.n) && s.gold - DC.craftFee > 300 && s.gold >= DC.craftFee) { for (const r of it.recipe) s.mats[r.m] -= r.n; s.gold -= DC.craftFee; s.op -= DC.craftFee; s.gearInv[it.key] = (s.gearInv[it.key] || 0) + 1; D.made[it.key] = 1; s.st.dgCraft = (s.st.dgCraft || 0) + 1; }
        const pool = alive().filter(a => !a.resv && !s.rq.open.some(r => r.party.includes(a)) && (DC.autoWait ? a.busy <= 1 : a.busy === 0 && s.idleIds && s.idleIds.has(a)));   // autoWait 0 = 지난주 마을에 남은 사람만 (게임 state 'town')
        for (const it of items) while ((s.gearInv[it.key] || 0) > 0) { const c = pool.filter(a => !(a.sp && a.sp[it.slot] === it.key)).sort((x, y) => y.lv - x.lv)[0] || alive().filter(a => !(a.sp && a.sp[it.slot] === it.key)).sort((x, y) => y.lv - x.lv)[0]; if (!c) break; dgGive(c, it); }
        const gapOk = !D.runs.length || s.week - D.runs[0].w >= DC.autoGap;
        if (gapOk && (!D.clear || DC.keep) && pool.length >= DC.party[0]) {
          const P = pool.slice().sort((x, y) => y.lv - x.lv); let best = null;
          for (let n = DC.party[0]; n <= Math.min(DC.party[1], P.length); n++) for (let st = 0; st + n <= P.length; st++) { const party = P.slice(st, st + n), p = dgOdds(party, 'lean'); if (p < (DC.autoMode ? 0.4 : DC.autoTh)) continue; const sc = DC.autoMode ? -Math.abs(p - 0.55) : p; if (!best || sc > best.sc) best = { party, sc }; }
          if (best) { D.plan = { party: best.party, at: s.week, by: s.week + 3, now: best.party.every(a => a.busy === 0 && s.idleIds && s.idleIds.has(a)) }; for (const a of best.party) a.dgResv = true; }
        }
      }
      if (D.plan) s.st.dgPlanW = (s.st.dgPlanW || 0) + D.plan.party.length;
      if (D.plan) {   // 예약 파티 출발 (게임 dgTail과 같음): 모두 돌아오면 출발, autoWaitMax(3)주 넘으면 취소
        const P = D.plan, clear = () => { for (const a of P.party) a.dgResv = false; D.plan = null; };
        if (mqBlocked() || D.run || P.party.some(a => !a.alive)) clear();
        else if (P.party.some(a => a.busy > 0) || (s.week <= P.at && !P.now)) { if (s.week >= P.by) clear(); }   // 게임은 예약한 사람이 다음 주 출발 판정 때 마을로 나옴(departures) → 예약 때 모두 마을에 있었으면 그 주, 아니면 빨라도 한 주 뒤 출발
        else { clear(); dgLaunch(P.party); }
      }
    }

    function weekly() {
      // 훈련
      for (const a of s.advs) {
        if (!a.alive || a.busy > 0) continue;
        if (has('훈련장')) { const m = 1 + [0, 0.15, 0.40, 0.40][Math.min(3, effN('훈련장'))]; for (const i of [0, 1, 4]) if (i === a.core || (a.pair && a.pair.includes(i))) a.stats[i] = Math.min(G.statCap, a.stats[i] + G.trainPerWeek * m); }
        if (has('도서관')) { const m = 1 + (effN('도서관') ? 0.15 : 0); for (const i of [2, 3]) if (i === a.core || (a.pair && a.pair.includes(i))) a.stats[i] = Math.min(G.statCap, a.stats[i] + G.trainPerWeek * m); }
      }
      expireQuests(); gqWeekly(); carWeekly();   // 길드 의뢰 카드는 기한(gqWeekly)으로만 내려감 (게임 stepWeek와 같음)
      generateQuests();   // 2026-11-12: 매주 게시 (예전에는 매달 초에만 = 월 유입의 1/4만 들어왔음)
      gqReturns();        // 2026-11-20 길드 의뢰: 귀환 뒤 다시 게시 · 끝 (게임 returns → gqAfter 자리)
      s.seatUsed = 0;   // 이번 주 식사한 좌석 수
      resWeekly();       // 2026-11-19 V4 3단계: 개체수
      mktWeekly();       // 2026-11-19 V4 2단계: 소재 시세
      kitchenWeekly();   // 2026-11-19 V4 1단계: 식당이 이번 주 팔 그릇을 만듦 (게임 stepWeekTail 과 같은 자리: 리퀘스트 출발 전)
      mainStep();         // 메인 퀘스트(침공): 수주 · 등장 · 침공 판정 (게임 autoMain → mainWeekly 순서와 같음)
      reqStep();          // 리퀘스트: 자동 처리 → 지명 파티 출발(게시판보다 먼저) → 등장 판정
      dgStep();           // 2026-11-20 던전: 돌아옴 · 열림 · 자동 예약 · 예약 파티 출발 (게임 dgReturn · dgWeekly · dgAuto · dgTail과 같은 규칙)
      if (!mqBlocked()) adventurersChoose();   // 침공 1주 전: 의뢰 출발 금지
      bossStep();
      invasionStep();
      raidStep();
      endgameStep();
      for (const a of s.advs) if (a.busy > 0) a.busy--;
      autoOrders(); autoCar();   // 2026-11-20 게임 autoCook 끝의 autoCar · 2026-11-19: 게임 자동 플레이(autoCook 뒤 autoOrders)와 같음
    }

    // 시작 모험가 3명
    for (let i = 0; i < A.startCount; i++) newAdv({ attach: 20, home: true, core: A.founderWarrior ? (i === 0 ? 0 : 1 + ri(4)) : undefined });   // 창립 멤버: 늘 길드에 머묾 (게임과 같음) · 결정 33: 첫 모험가 전사
    if (A.founderMix !== 0) { const f = s.advs.filter(a => a.home); if (f.length >= 2 && f.every(a => a.risk === 0)) f[1].risk = 1; }   // 의뢰 0건 판 대책 ① (게임과 같음)
    // 로비 배치 (2026-11-12): 놓인 장식(cfg.run.deco 목록) · 테이블 세트 수. 테이블은 첫 주에 2세트, 이후 매달 금고 여유(구매 뒤 1,000G 이상)가 있으면 1세트씩 4세트까지 (게임 autoPlace와 같음)
    s.deco = new Set((cfg.run && cfg.run.deco) || []); s.tables = 0; s.x2Owed = 0;
    s.tableCap = 2; const buyTables = n0 => { const P = 200, MAX = s.tableCap; /* 2026-11-13: 테이블은 처음 2세트까지. 3·4세트는 서브 퀘스트 보상 (2026-11-16: reqStep 이 tableCap 을 올림) */ let n = n0; while (n-- > 0 && s.tables < MAX && s.gold >= P) { s.gold -= P; s.tables++; } };
    const tablePolicy = first => { if (cfg.run && cfg.run.noTables) return; if (first) buyTables(2); else if (s.tables < s.tableCap && s.gold - 200 >= 1000) buyTables(1); };
    tablePolicy(true);

    const maxW = cfg.run.maxYears * WPY;
    for (s.week = 0; s.week < maxW && !s.ended; s.week++) {
      if (!s.rebirthAdded && s.week === (EN.rebirthYear - 1) * WPY) {
        s.rebirthAdded = true; s.st.rebirth = true;
        const a = newAdv({ risk: 0 }); a.rebirth = true; a.stage = 3; a.cls = 'ext'; a.pair = [0, 1, 2]; a.lv = 45;
        a.stats = [0, 0, 0, 0, 0].map(() => EN.rebirthTotal / 5); a.grade = Math.min(6, s.grade + 2); a.gear = s.grade; a.eq = [s.grade, s.grade, s.grade];
      }
      if (!s.demonFlagFallback && !s.st.demonFallback && s.week === EN.demonHeirFallbackYear * WPY && !s.advs.some(a => a.alive && a.demonHeir)) s.demonFlagFallback = true;
      weekly();
      { const z = cfg.adv.zeroFameVisit || 0, cap0 = (cfg.adv.capByGrade || [8, 12, 16, 20, 24, 28, 32])[s.grade] || 8; if (z && (s.fame || 0) === 0 && s.week > 0 && s.week % z === 0 && s.advs.filter(x => x.alive).length < cap0) newAdv({}); }   // 대책 ② (게임과 같음)
      { const st = cfg.adv.fameStep; if (st) {   // 명성 방문 (게임 fameArrivals와 같은 규칙: 명성 fameStep(5)마다 1명, 상한이 차면 기다림)
        const cap = (cfg.adv.capByGrade || [8, 12, 16, 20, 24, 28, 32])[s.grade] || 8, stp = () => Array.isArray(st) ? (st[Math.min(s.grade, st.length - 1)] || st[st.length - 1]) : st; if (s.fameNext == null) s.fameNext = stp();   // 결정 32 (게임과 같음): 등급별 간격 · 차면 넘김
        while (s.fame >= s.fameNext) { const room = s.advs.filter(x => x.alive).length < cap; if (!room && cfg.adv.fameSkip === 0) break; s.fameNext += stp(); if (!room) continue; const ext = R() < 0.05 && s.grade > 0 ? Math.min(6, s.grade + (R() < 0.3 ? 2 : 1)) : 0; const a = newAdv({ grade: ext }); if (s.demonFlagFallback) { a.demonHeir = true; a.heirWeek = s.week; s.demonFlagFallback = false; s.st.demonFallback = true; } }
      } }
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

  const api = { defaults, matBaseTable, simulate, aggregate, BOTS, GR, ST, WPY };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.GuildSim = api;
})(this);
