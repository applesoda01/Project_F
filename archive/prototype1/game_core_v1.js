/* 이세계 모험가 길드 — 프로토타입 게임 규칙 (M1: 코어 루프)
   화면과 분리된 순수 로직. 유니티 이식 시 이 파일을 C#으로 옮긴다.
   수치는 밸런스 시뮬레이터(GuildSim.defaults)와 같은 값을 쓴다. */
(function (root) {
  'use strict';
  const GR = ['F', 'E', 'D', 'C', 'B', 'A', 'S'];
  const STATS = ['힘', '민첩', '지력', '정신', '기교'];
  const CLASS1 = ['전사', '궁수', '마법사', '성직자', '도적'];
  const QTYPE = ['토벌', '사냥·채집', '조사', '호위·구호', '탐사'];
  const RISK = ['신중', '보통', '무모'], SPEND = ['절약', '보통', '낭비'], SOCIAL = ['독불장군', '보통', '사교적'];
  const WPM = 4, WPY = 48;
  const NAMES = ['아론', '벨라', '카스', '다리아', '에단', '피오나', '가빈', '헤라', '이반', '줄리아', '켄트', '루나', '마커스', '니나', '오웬', '페넬로페', '퀸', '로사', '세스', '타냐',
    '울릭', '베라', '웨스', '자라', '알마', '브루노', '클라라', '데인', '엘사', '펠릭', '그레타', '호레이스', '이리스', '잭', '카야', '레오', '미라벨', '네드', '올가', '피터',
    '리타', '사일러스', '테오', '우나', '빅터', '윌라', '엘런', '노아', '아이다', '벤', '실비아', '조엘', '헬가', '라이언', '소피', '토빈', '마야', '다넬', '에이미', '고든'];

  function attachRng(s) { s.R = function () { s.rngState = (s.rngState + 0x6D2B79F5) >>> 0; let t = s.rngState; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; return s; }
  function serialize(s) { const o = Object.assign({}, s); delete o.R; return JSON.stringify(o); }
  function deserialize(str) { return attachRng(JSON.parse(str)); }

  function newGame(cfg, seed) {
    const s = {
      cfg, seed: seed >>> 0, rngState: seed >>> 0,
      week: 0, grade: 0, gold: cfg.econ.startGold, trust: 50, pop: cfg.town.startPop,
      built: { 게시판: true, 접수대: true, 주점: true, 판매창구: true }, eff: {}, meals: [0, 0, 0, 0, 0, 0, 0],
      filter: [1, 0, 0, 0, 0, 0, 0], // 게시판 칸 배분 (등급별 비율)
      advs: [], board: [], active: [], nextId: 1, log: [],
      month: blankLedger(), lastMonth: null, history: [],
      stats: { done: 0, fail: 0 }
    };
    attachRng(s);
    for (let i = 0; i < cfg.adv.startCount; i++) spawnAdv(s, { attach: 20, quiet: true });
    log(s, '길드가 문을 열었습니다. 모험가 ' + cfg.adv.startCount + '명이 첫 손님으로 찾아왔습니다.', 'info');
    return s;
  }
  function hasBatchim(w) { const c = w.charCodeAt(w.length - 1); return c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 !== 0; }
  function J(w, a, b) { return w + (hasBatchim(w) ? a : b); }
  const names = party => party.map(m => m.name).join('·');
  function blankLedger() { return { fee: 0, resale: 0, meal: 0, tavern: 0, subsidy: 0, upkeep: 0, other: 0, quests: 0, success: 0 }; }
  const ri = (s, n) => Math.floor(s.R() * n);
  function log(s, text, kind) { s.log.unshift({ week: s.week, text, kind: kind || 'info' }); if (s.log.length > 200) s.log.pop(); }
  const effN = (s, f) => s.eff[f] || 0;
  const popStage = s => { let k = 0; for (const t of s.cfg.town.stages) if (s.pop >= t) k++; return k; };
  const feeRate = s => s.cfg.econ.feeBase + s.cfg.econ.feePerInfo * effN(s, '정보실');
  function boardCap(s) { return s.cfg.quest.boardCap[s.grade] + [0, 2, 5, 5][Math.min(3, effN(s, '게시판'))]; }

  function spawnAdv(s, o) {
    o = o || {};
    const A = s.cfg.adv;
    const core = o.core != null ? o.core : ri(s, 5);
    const used = new Set(s.advs.map(a => a.name));
    let name = NAMES[ri(s, NAMES.length)]; for (let k = 0; k < 20 && used.has(name); k++) name = NAMES[ri(s, NAMES.length)];
    const a = {
      id: s.nextId++, name, core, cls: CLASS1[core], stage: 1, pair: null,
      stats: [0, 0, 0, 0, 0].map((_, i) => i === core ? A.startCore + s.R() * 4 : A.startOther + s.R() * 3),
      lv: 1, xp: 0, bank: 0, grade: 0, ach: 0, attach: o.attach || 0,
      risk: ri(s, 3), spend: ri(s, 3), social: ri(s, 3), wallet: 0, gear: -1,
      state: 'away', until: 0, joined: s.week, alive: true, done: 0
    };
    s.advs.push(a);
    if (!o.quiet) log(s, `${a.cls} ${J(a.name, '이', '가')} 길드를 처음 찾아왔습니다.`, 'arrive');
    return a;
  }

  function finalStat(s, a, i) {
    const GE = s.cfg.gear; let v = Math.min(s.cfg.growth.statCap, a.stats[i]);
    if (a.gear >= 0) { if (i === a.core) v += GE.weaponStat[a.gear]; if (i === (a.core + 2) % 5) v += GE.accStat[a.gear]; }
    return v;
  }
  function makeQuest(s, g) {
    const Q = s.cfg.quest; const type = ri(s, 5); const n = Q.reqCount[g]; const req = [type];
    while (req.length < n) { const k = ri(s, 5); if (!req.includes(k)) req.push(k); }
    const R0 = Q.ref[g] * n * (0.85 + s.R() * 0.30);
    return { id: s.nextId++, g, type, req, r: R0 / n, reward: Q.reward[g], posted: s.week };
  }
  function successP(s, party, q) {
    const Q = s.cfg.quest; let F = 0, bottleneck = false;
    for (const k of q.req) {
      const vals = party.map(a => finalStat(s, a, k) * (k === a.core ? 1 + [0.03, 0.06, 0.10][a.stage - 1] : 1)).sort((x, y) => y - x);
      const P0 = vals[0] + Q.partyAssist * vals.slice(1).reduce((x, y) => x + y, 0);
      const fill = Math.min(P0 / q.r, 1.5); if (fill < 0.5) bottleneck = true; F += fill;
    }
    F /= q.req.length;
    let p = Math.max(0.05, Math.min(0.97, 0.55 + 1.1 * (F - 1)));
    if (bottleneck) p /= 2;
    return p;
  }
  function perceived(s, a, p) { const err = Math.max(0, 0.10 - 0.02 * effN(s, '정보실')); return Math.min(1, p * [0.9, 1.0, 1.2][a.risk] + (s.R() * 2 - 1) * err); }

  function gainXp(s, a, xp) {
    const G = s.cfg.growth; a.xp += xp;
    for (;;) {
      const need = G.lvA * Math.pow(a.lv, G.lvB);
      if (a.xp < need) break;
      if (a.lv >= G.lvCap[a.stage - 1]) { a.bank += a.xp; a.xp = 0; break; }
      a.xp -= need; a.lv++;
      for (let i = 0; i < 5; i++) a.stats[i] = Math.min(G.statCap, a.stats[i] + (i === a.core ? 2.0 : 0.4));
      log(s, `${a.name}의 레벨이 ${a.lv}${[1,3,6,7,8,0].includes(a.lv % 10) || a.lv % 10 === 0 ? '이' : '가'} 되었습니다.`, 'grow');
    }
  }
  function tryGradeUp(s, a) {
    const lvReq = [0, 5, 10, 18, 26, 35, 45], achReq = [0, 5, 5, 7, 7, 10, 10]; const n = a.grade + 1;
    if (n > 6 || n > s.grade || n === 6) return;
    if (a.lv >= lvReq[n] && a.ach >= achReq[n]) { a.grade = n; a.ach = 0; log(s, `${J(a.name, '이', '가')} ${GR[n]}급 모험가가 되었습니다.`, 'grow'); }
  }

  // ---------- 플레이어 행동 ----------
  function setFilter(s, weights) { s.filter = weights.map((w, g) => g <= s.grade ? Math.max(0, w) : 0); }
  function withdrawQuest(s, qid) {
    const i = s.board.findIndex(q => q.id === qid); if (i < 0) return false;
    const q = s.board[i]; const cost = Math.round(q.reward * 0.10);
    s.board.splice(i, 1); s.gold -= cost; s.month.other -= cost; s.trust = Math.max(0, s.trust - 2);
    log(s, `${GR[q.g]}급 ${QTYPE[q.type]} 의뢰를 게시판에서 뗐습니다. 등록비·위약금 ${cost}G, 신뢰도 −2.`, 'warn');
    return true;
  }
  function debugSetGrade(s, g) { s.grade = Math.max(0, Math.min(6, g)); log(s, `[디버그] 길드 등급을 ${GR[s.grade]}로 바꿨습니다.`, 'debug'); }

  // ---------- 진행 ----------
  function generateQuests(s) {
    const Q = s.cfg.quest, T = s.cfg.town;
    const mult = T.inflowMult[popStage(s)] * (0.7 + 0.6 * s.trust / 100) * (1 + 0.1 * s.grade) * (1 + 0.1 * Math.min(1, effN(s, '접수대')));
    const n = Math.round(Q.perMonth * mult / WPM + s.R() * 0.5);
    const cap = boardCap(s);
    // 필터: 등급별 칸 배분
    const tot = s.filter.slice(0, s.grade + 1).reduce((a, b) => a + b, 0) || 1;
    const quota = s.filter.map((w, g) => g <= s.grade ? Math.round(cap * w / tot) : 0);
    for (let i = 0; i < n; i++) {
      let r = s.R() * tot, g = 0; for (; g <= s.grade; g++) { r -= s.filter[g]; if (r <= 0) break; } g = Math.min(g, s.grade);
      const count = s.board.filter(q => q.g === g).length;
      if (s.board.length < cap && count < Math.max(1, quota[g])) s.board.push(makeQuest(s, g));
    }
  }
  function present(s, a) {
    if (!a.alive || a.state === 'quest') return false;
    if (a.attach >= 100) return true;
    const interval = s.cfg.adv.visitBaseWeeks * (1 + (100 - a.attach) / 50);
    return s.R() < Math.min(1, 2 / interval);
  }
  function mealFor(s, q) { for (let g = q.g; g >= 0; g--) if (s.meals[g] > 0) return g; return -1; }

  function departures(s) {
    const Q = s.cfg.quest, E = s.cfg.econ;
    for (const a of s.advs) { if (!a.alive || a.state === 'quest') continue; a.state = present(s, a) ? 'town' : 'away'; }
    const idle = s.advs.filter(a => a.state === 'town');
    for (const a of idle) {
      if (a.state !== 'town') continue;
      const range = [[-1, 0], [-1, 1], [0, 2]][a.risk];
      const lo = Math.max(0, a.grade + range[0]), hi = Math.min(s.grade, a.grade + range[1]);
      const th = [0.70, 0.55, 0.35][a.risk];
      const cands = s.board.filter(q => q.g >= lo && q.g <= hi).sort((x, y) => y.g - x.g);
      for (const q of cands) {
        let party = [a];
        let pp = perceived(s, a, successP(s, party, q));
        if (pp < [0.30, 0.50, 0.70][a.social]) {
          const mates = idle.filter(b => b !== a && b.state === 'town' && Math.abs(b.grade - q.g) <= 1).slice(0, 4);
          for (const m of mates) { party.push(m); if (perceived(s, a, successP(s, party, q)) >= th) break; }
          pp = perceived(s, a, successP(s, party, q));
        }
        if (pp < th) continue;
        s.board.splice(s.board.indexOf(q), 1);
        // 출발 전 식사
        let eaters = 0; const mg = mealFor(s, q);
        if (mg >= 0) for (const m of party) {
          const price = Q.reward[mg] * E.mealPriceRate;
          if (m.wallet >= price && s.R() < E.mealBuyRate[m.spend]) { m.wallet -= price; const inc = price * E.mealMargin; s.gold += inc; s.month.meal += inc; eaters++; }
        }
        const mealB = mg >= 0 ? (eaters / party.length) * E.mealBonus[mg] * (s.meals[mg] >= 2 ? 1 : 0.6) : 0;
        const p = Math.min(0.97, successP(s, party, q) * (1 + mealB));
        const weeks = Q.weeks[q.g];
        for (const m of party) { m.state = 'quest'; m.until = s.week + weeks; }
        s.active.push({ q, party: party.map(m => m.id), p, back: s.week + weeks, ate: eaters });
        log(s, `${J(names(party), '이', '가')} ${GR[q.g]}급 ${QTYPE[q.type]} 의뢰를 맡아 떠났습니다.${eaters ? ' (출발 전 식사 ' + eaters + '명)' : ''}`, 'depart');
        break;
      }
    }
  }

  function returns(s) {
    const Q = s.cfg.quest, G = s.cfg.growth, A = s.cfg.adv, E = s.cfg.econ;
    const back = s.active.filter(x => x.back <= s.week); s.active = s.active.filter(x => x.back > s.week);
    for (const x of back) {
      const party = x.party.map(id => s.advs.find(a => a.id === id));
      const ok = s.R() < x.p; const q = x.q; s.month.quests++;
      if (ok) {
        s.stats.done++; s.month.success++;
        const fee = q.reward * feeRate(s), resale = q.reward * E.resaleRate;
        s.gold += fee + resale; s.month.fee += fee; s.month.resale += resale;
        const each = q.reward * (1 - feeRate(s)) / party.length;
        for (const a of party) {
          a.wallet += each; a.done++;
          gainXp(s, a, G.xpBase * Math.pow(G.xpGradeMult, q.g));
          a.stats[q.type] = Math.min(G.statCap, a.stats[q.type] + Q.subGrowth);
          a.attach = Math.min(100, a.attach + A.attachSuccess);
          if (q.g >= a.grade + 1 || (q.g >= a.grade && a.grade === s.grade)) a.ach++;
          tryGradeUp(s, a);
        }
        s.trust = Math.min(100, s.trust + 0.3);
        // 요리 해금
        if ((q.type === 0 || q.type === 1 || (q.type === 2 && (q.g === 2 || q.g === 6))) && s.meals[q.g] < 2 && s.R() < E.mealUnlockChance) {
          s.meals[q.g]++; log(s, `새 식재료를 얻어 ${GR[q.g]}급 요리가 식당 메뉴에 올랐습니다.`, 'unlock');
        }
        log(s, `${J(names(party), '이', '가')} ${GR[q.g]}급 ${QTYPE[q.type]} 의뢰에 성공했습니다. 길드 수입 ${Math.round(fee + resale)}G.`, 'success');
      } else {
        s.stats.fail++; s.trust = Math.max(0, s.trust - 0.6);
        for (const a of party) gainXp(s, a, G.xpBase * Math.pow(G.xpGradeMult, q.g) * G.xpFailRate);
        log(s, `${J(names(party), '이', '가')} ${GR[q.g]}급 ${QTYPE[q.type]} 의뢰에 실패했습니다.`, 'fail');
      }
      for (const a of party) { a.state = 'town'; a.until = 0; }
    }
  }

  function monthly(s) {
    const E = s.cfg.econ, A = s.cfg.adv, T = s.cfg.town, GE = s.cfg.gear;
    s.gold += E.subsidy[s.grade]; s.month.subsidy += E.subsidy[s.grade];
    const inTown = s.advs.filter(a => a.alive && a.state !== 'quest').length;
    const tav = inTown * WPM * 0.5 * E.tavernPerAdvWeek * Math.pow(E.tavernGradeMult, s.grade);
    s.gold += tav; s.month.tavern += tav;
    let up = 0; for (const f of Object.keys(s.built)) up += (FAC_COST[f] != null ? E.buildCost[FAC_COST[f]] : 0) * E.upkeepRate;
    s.gold -= up; s.month.upkeep -= up;
    const residents = s.advs.filter(a => a.alive && a.attach >= 100).length;
    s.pop += s.pop * (T.growthBase + T.growthPerGrade * s.grade) + residents * T.perResident;
    for (const a of s.advs) if (a.alive && a.state !== 'quest') a.attach = Math.min(100, a.attach + A.attachPerMonthInTown * 0.5);
    for (const a of s.advs) if (a.alive && a.attach < A.leaveAttach && s.week - a.joined > A.leaveAfterYears * WPY && a.state !== 'quest') { a.alive = false; log(s, `${J(a.name, '이', '가')} 이 마을을 떠났습니다. (애착도 ${Math.round(a.attach)})`, 'warn'); }
    const lam = A.arrivalPerMonth * (1 + A.arrivalPerGrade * s.grade);
    let k = Math.floor(lam); if (s.R() < lam - k) k++;
    for (let i = 0; i < k; i++) spawnAdv(s, {});
    for (const a of s.advs) {
      if (!a.alive) continue;
      const ng = Math.min(s.grade, a.gear + 1); if (ng <= a.gear) continue;
      const price = GE.weaponPrice[ng] * GE.setMult;
      if (a.wallet >= price * (1 + GE.reserveMult[a.spend] * 0.5)) { a.wallet -= price; a.gear = ng; log(s, `${J(a.name, '이', '가')} ${GR[ng]}급 장비를 샀습니다. (${Math.round(price)}G)`, 'grow'); }
    }
    const net = s.month.fee + s.month.resale + s.month.meal + s.month.tavern + s.month.subsidy + s.month.upkeep + s.month.other;
    s.month.net = net;
    s.lastMonth = s.month; s.history.push(Object.assign({ week: s.week }, s.month));
    log(s, `${dateLabel(s.week)} 결산: 운영 순이익 ${Math.round(net)}G (의뢰 ${s.month.quests}건, 성공 ${s.month.success}건)`, 'ledger');
    s.month = blankLedger();
  }
  const FAC_COST = { 게시판: null, 접수대: null, 주점: null, 판매창구: null, 관리소: 1, 집무실: 1, 훈련장: 2, 창고: 2, 추모실: 2, 정보실: 3, 의무실: 3, 도서관: 3, 해체장: 4, 휴게실: 5, '명예의 전당': 5 };

  function build(s, f) {
    const g = FAC_COST[f]; if (g == null || s.built[f]) return false;
    if (g > s.grade) { log(s, `${J(f, '은', '는')} ${GR[g]}급 길드부터 지을 수 있습니다.`, 'warn'); return false; }
    const c = s.cfg.econ.buildCost[g]; if (s.gold < c) { log(s, `${f} 건설비 ${c}G가 부족합니다.`, 'warn'); return false; }
    s.gold -= c; s.built[f] = true; log(s, `${J(f, '을', '를')} 지었습니다. (${c}G)`, 'build'); return true;
  }

  function stepWeek(s) {
    if (s.week % WPM === 0) generateQuests(s);
    returns(s);
    departures(s);
    s.week++;
    if (s.week % WPM === 0) monthly(s);
  }
  function dateLabel(w) { const y = Math.floor(w / WPY) + 1, m = Math.floor((w % WPY) / WPM) + 1, wk = (w % WPM) + 1; return `${y}년차 ${m}월 ${wk}주`; }

  const api = { serialize, deserialize, GR, STATS, CLASS1, QTYPE, RISK, SPEND, SOCIAL, WPM, WPY, FAC_COST, newGame, stepWeek, setFilter, withdrawQuest, build, debugSetGrade, successP, dateLabel, boardCap, feeRate, spawnAdv, log };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.GuildGame = api;
})(this);
