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
  function deserialize(str) { return migrate(attachRng(JSON.parse(str))); }

  function newGame(cfg, seed) {
    const s = {
      cfg, seed: seed >>> 0, rngState: seed >>> 0,
      week: 0, grade: 0, gold: cfg.econ.startGold, trust: 50, fame: 0, pop: cfg.town.startPop,
      built: { 게시판: true, 접수대: true, 주점: true, 판매창구: true }, eff: {}, meals: [0, 0, 0, 0, 0, 0, 0],
      filter: [1, 0, 0, 0, 0, 0, 0], // 게시판 칸 배분 (등급별 비율)
      advs: [], board: [], active: [], nextId: 1, log: [],
      month: blankLedger(), lastMonth: null, history: [],
      stats: { done: 0, fail: 0 },
      proposals: [], discovered: {} // 전직 제안 대기열, 발견한 직업 (M3-2)
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
      state: 'away', until: 0, joined: s.week, alive: true, done: 0,
      cls1: CLASS1[core], line: [core], fin: false, promoCool: 0, skills: [{ line: core, form: CLASS1[core] }], career: [{ week: s.week, text: '길드에 처음 옴' }]
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
      if (a.lv >= lvCapOf(s, a)) { a.bank += a.xp; a.xp = 0; break; }
      a.xp -= need; a.lv++;
      const gr = growthOf(a);
      for (let i = 0; i < 5; i++) a.stats[i] = Math.min(G.statCap, a.stats[i] + gr[i]);
      log(s, `${a.name}의 레벨이 ${a.lv}${[1,3,6,7,8,0].includes(a.lv % 10) || a.lv % 10 === 0 ? '이' : '가'} 되었습니다.`, 'grow');
    }
  }
  function tryGradeUp(s, a) {
    const lvReq = [0, 5, 10, 18, 26, 35, 45], achReq = [0, 5, 5, 7, 7, 10, 10]; const n = a.grade + 1;
    if (n > 6 || n > s.grade || n === 6) return;
    if (a.lv >= lvReq[n] && a.ach >= achReq[n]) { a.grade = n; a.ach = 0; if (a.career) a.career.push({ week: s.week, text: `${GR[n]}급 모험가로 승급` }); log(s, `${J(a.name, '이', '가')} ${GR[n]}급 모험가가 되었습니다.`, 'grow'); }
  }

  // ---------- 직업과 전직 (M3-1 성장 · M3-2 전직) ----------
  // 능력치 index: 0 힘 1 민첩 2 지력 3 정신 4 기교. 수치는 기획서 7.5의 [가안].
  const CLASS2 = [ // [이름, 조건, 종결]
    ['광전사', { 0: 50 }, true], ['사냥꾼', { 1: 50 }, true], ['괴도', { 4: 50 }, true], ['마도사', { 2: 50 }, false], ['신관', { 3: 50 }, false],
    ['레인저', { 0: 35, 1: 35 }], ['마검사', { 0: 40, 2: 30 }], ['기사', { 0: 30, 3: 40 }], ['쌍검사', { 0: 30, 4: 40 }], ['마궁사', { 1: 40, 2: 30 }],
    ['수도사', { 1: 35, 3: 35 }], ['추적자', { 1: 30, 4: 40 }], ['점성술사', { 2: 40, 3: 30 }], ['연금술사', { 2: 35, 4: 35 }], ['광대', { 3: 30, 4: 40 }]
  ].map(([name, req, fin]) => ({ name, req, fin: !!fin, line: Object.keys(req).map(Number) }));
  const CLASS3 = [ // 3차 심화: [2차, 3차, 조건, 마을 건물]
    ['레인저', '레인저 로드', { 0: 60, 1: 60 }, '사냥꾼 조합'], ['마검사', '마검성', { 0: 70, 2: 55 }, '마법 학원'], ['기사', '성기사', { 0: 55, 3: 70 }, '성당'],
    ['쌍검사', '검무사', { 0: 55, 4: 70 }, '투기장'], ['마궁사', '마궁성', { 1: 70, 2: 55 }, '마법 학원'], ['수도사', '권성', { 1: 60, 3: 60 }, '수련원'],
    ['추적자', '저격수', { 1: 70, 4: 55 }, '망루'], ['마도사', '대마도사', { 2: 80 }, '마탑'], ['점성술사', '예언자', { 2: 55, 3: 70 }, '천문대'],
    ['연금술사', '연성술사', { 2: 70, 4: 55 }, '연금 공방'], ['신관', '대신관', { 3: 80 }, '대성당'], ['광대', '바드', { 3: 70, 4: 55 }, '극장']
  ].map(([from, name, req, town]) => ({ from, name, req, town, line: Object.keys(req).map(Number) }));
  const ATTACH_TITLE = ['방랑자', '길손', '동반자', '마을의 수호자'];
  const attachTier = a => a.attach >= 90 ? 3 : a.attach >= 60 ? 2 : a.attach >= 30 ? 1 : 0;
  function lvCapOf(s, a) { return a.fin || a.stage >= 3 ? 50 : s.cfg.growth.lvCap[a.stage - 1]; }
  // 레벨업 1회 성장치: 1차 주력 2.0·나머지 0.4 / 2차 특화 2.4·0.525 / 2차 조합 1.8·1.8·0.3 / 3차 심화 2.2·2.0(특화 2.8)·나머지 합 1.3
  function growthOf(a) {
    const g = [0, 0, 0, 0, 0], L = a.line || [a.core];
    if (a.stage === 1) { for (let i = 0; i < 5; i++) g[i] = i === a.core ? 2.0 : 0.4; return g; }
    if (a.stage === 2) { for (let i = 0; i < 5; i++) g[i] = L.length === 1 ? (L.includes(i) ? 2.4 : 0.525) : (L.includes(i) ? 1.8 : 0.3); return g; }
    if (L.length === 1) { for (let i = 0; i < 5; i++) g[i] = L.includes(i) ? 2.8 : 0.325; return g; }
    for (let i = 0; i < 5; i++) g[i] = i === L[0] ? 2.2 : i === L[1] ? 2.0 : 1.3 / 3;
    return g;
  }
  const meets = (a, req) => Object.keys(req).every(k => a.stats[k] >= req[k]);
  // 지금 제안할 수 있는 직업 (조건 충족 + 추가 조건). locked: 능력치는 됐지만 추가 조건이 없는 직업
  function promoOptions(s, a) {
    const out = [], locked = [];
    if (!a.alive) return { out, locked };
    if (a.stage === 1) {
      for (const c of CLASS2) if (meets(a, c.req)) (s.built['관리소'] ? out : locked).push({ name: c.name, need: '모험가 관리소' });
    } else if (a.stage === 2 && !a.fin) {
      const c = CLASS3.find(x => x.from === a.cls);
      if (c && meets(a, c.req)) locked.push({ name: c.name, need: c.town + ' (마을 건물, 3차 프로토타입)' });
    }
    const margin = n => { const c = CLASS2.find(x => x.name === n); return c ? Object.keys(c.req).reduce((t, k) => t + a.stats[k] - c.req[k], 0) : 0; };
    out.sort((x, y) => margin(y.name) - margin(x.name));
    return { out, locked };
  }
  // 매달: 조건을 채운 모험가를 리나가 제안 목록에 올린다
  function proposeClasses(s) {
    s.proposals = s.proposals || []; s.discovered = s.discovered || {}; if (s.fame == null) s.fame = 0;
    for (const a of s.advs) {
      if (!a.alive) continue;
      const { out, locked } = promoOptions(s, a);
      for (const o of out.concat(locked)) if (!s.discovered[o.name]) { s.discovered[o.name] = s.week; log(s, `새 직업의 길을 찾았습니다: ${o.name} (${a.name})`, 'unlock'); }
      if (!out.length || s.week < (a.promoCool || 0) || s.proposals.some(p => p.id === a.id)) continue;
      s.proposals.push({ id: a.id, opts: out.map(o => o.name), week: s.week, to: a.stage + 1 });
      log(s, `${J(a.name, '이', '가')} ${a.stage + 1}차 전직 조건을 채웠습니다. 접수원이 전직을 제안합니다.`, 'promo');
    }
  }
  // 길드 마스터의 결정: cls = 고른 직업 이름, null = 보류
  function decidePromotion(s, id, cls) {
    const pi = s.proposals.findIndex(p => p.id === id); if (pi < 0) return null;
    const p = s.proposals[pi]; s.proposals.splice(pi, 1);
    const a = s.advs.find(x => x.id === id); if (!a || !a.alive) return null;
    if (!cls) { a.promoCool = s.week + 12; log(s, `${a.name}의 전직 제안을 보류했습니다. (3개월 뒤 다시 제안)`, 'info'); return { held: true }; }
    const base = [0.40, 0.65, 0.90, 1.00][attachTier(a)], chance = Math.min(1, base * (p.to === 2 ? 1.2 : 0.9));
    if (s.R() > chance) {
      a.promoCool = s.week + 12; a.career.push({ week: s.week, text: `${cls} 전직 제안을 거절` });
      log(s, `${J(a.name, '이', '가')} ${cls} 전직을 거절했습니다. (수락 확률 ${Math.round(chance * 100)}%, 3개월 뒤 다시 제안)`, 'warn');
      return { accepted: false, chance };
    }
    promote(s, a, cls); return { accepted: true, chance };
  }
  function promote(s, a, name) {
    const c2 = CLASS2.find(x => x.name === name), c3 = CLASS3.find(x => x.name === name), c = c2 || c3; if (!c) return;
    const from = a.cls;
    a.stage = c2 ? 2 : 3; a.cls = name; a.line = c.line.slice(); a.fin = !!(c2 && c2.fin);
    for (const k of a.skills) if (a.line.includes(k.line)) k.form = name; // 바탕 능력치가 새 직업 조건에 있는 스킬만 진화
    a.career.push({ week: s.week, text: `${from} → ${name} 전직` });
    const lastJ = (name.charCodeAt(name.length - 1) - 0xac00) % 28; // ㄹ 받침(8)이거나 받침이 없으면 '로'
    log(s, `${J(a.name, '이', '가')} ${name}${lastJ === 0 || lastJ === 8 ? '로' : '으로'} 전직했습니다!`, 'promo');
    const bank = a.bank; a.bank = 0; if (bank > 0) gainXp(s, a, bank); // 상한에 막혀 쌓아 둔 경험치 반영
  }
  // 예전 저장 데이터 보정
  function migrate(s) {
    s.proposals = s.proposals || []; s.discovered = s.discovered || {}; if (s.fame == null) s.fame = 0;
    for (const a of s.advs) {
      if (!a.cls1) a.cls1 = CLASS1[a.core];
      if (!a.line) a.line = [a.core];
      if (a.fin == null) a.fin = false;
      if (!a.skills) a.skills = [{ line: a.core, form: a.cls1 }];
      if (!a.career) a.career = [{ week: a.joined || 0, text: '길드에 처음 옴' }];
      if (a.promoCool == null) a.promoCool = 0;
    }
    return s;
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
  function debugSetGrade(s, g) { const ng = Math.max(0, Math.min(6, g)); for (let k = s.grade + 1; k <= ng; k++) s.fame = Math.min(s.cfg.fame.cap, (s.fame || 0) + s.cfg.fame.gradeUp[k]); s.grade = ng; log(s, `[디버그] 길드 등급을 ${GR[s.grade]}로 바꿨습니다.`, 'debug'); }

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
        s.fame = Math.min(s.cfg.fame.cap, (s.fame || 0) + s.cfg.fame.succ[q.g]);
        // 요리 해금
        if ((q.type === 0 || q.type === 1 || (q.type === 2 && (q.g === 2 || q.g === 6))) && s.meals[q.g] < 2 && s.R() < E.mealUnlockChance) {
          s.meals[q.g]++; log(s, `새 식재료를 얻어 ${GR[q.g]}급 요리가 식당 메뉴에 올랐습니다.`, 'unlock');
        }
        log(s, `${J(names(party), '이', '가')} ${GR[q.g]}급 ${QTYPE[q.type]} 의뢰에 성공했습니다. 길드 수입 ${Math.round(fee + resale)}G.`, 'success');
      } else {
        s.stats.fail++; s.trust = Math.max(0, s.trust - 0.6); s.fame = Math.max(0, (s.fame || 0) - s.cfg.fame.fail[q.g]);
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
    // 새 모험가 방문 수 = 기본 × 신뢰도 보정(0.7~1.3) × 명성 보정(1~1.6)
    const F = s.cfg.fame, lam = A.arrivalPerMonth * (0.7 + 0.6 * s.trust / 100) * (1 + F.maxBonus * Math.min(1, (s.fame || 0) / F.full));
    let k = Math.floor(lam); if (s.R() < lam - k) k++;
    for (let i = 0; i < k; i++) spawnAdv(s, {});
    for (const a of s.advs) {
      if (!a.alive) continue;
      const ng = Math.min(s.grade, a.gear + 1); if (ng <= a.gear) continue;
      const price = GE.weaponPrice[ng] * GE.setMult;
      if (a.wallet >= price * (1 + GE.reserveMult[a.spend] * 0.5)) { a.wallet -= price; a.gear = ng; log(s, `${J(a.name, '이', '가')} ${GR[ng]}급 장비를 샀습니다. (${Math.round(price)}G)`, 'grow'); }
    }
    proposeClasses(s);
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

  const api = { CLASS2, CLASS3, ATTACH_TITLE, attachTier, lvCapOf, growthOf, promoOptions, decidePromotion, finalStat, serialize, deserialize, GR, STATS, CLASS1, QTYPE, RISK, SPEND, SOCIAL, WPM, WPY, FAC_COST, newGame, stepWeek, setFilter, withdrawQuest, build, debugSetGrade, successP, dateLabel, boardCap, feeRate, spawnAdv, log };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.GuildGame = api;
})(this);
