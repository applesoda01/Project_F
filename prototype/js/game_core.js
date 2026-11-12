/* 이세계 모험가 길드 — 프로토타입 게임 규칙 (M1: 코어 루프)
   화면과 분리된 순수 로직. 유니티 이식 시 이 파일을 C#으로 옮긴다.
   수치는 밸런스 시뮬레이터(GuildSim.defaults)와 같은 값을 쓴다. */
(function (root) {
  'use strict';
  const GR = ['F', 'E', 'D', 'C', 'B', 'A', 'S'];
  const STATS = ['힘', '민첩', '지력', '정신', '기교'];
  const CLASS1 = ['전사', '궁수', '마법사', '성직자', '도적'];
  const GD = root.GAME_DATA || {};                      // data/*.csv 에서 만든 데이터 (data_gen.js)
  // 소재 편집기의 기본 의뢰 35칸 (data/collegium_data.json). 이름·소요 주·보상·기준치·명성·신뢰도·요구 능력치를 덮어씀. 없으면 balance 값
  // 칸(유형_등급)마다 후보 목록. 기본 의뢰가 맨 앞, 칸에 추가한 퀘스트가 뒤. 후보가 2개 이상일 때만 무작위로 고름(난수 1회 추가)
  const STATS_ = ['힘', '민첩', '지력', '정신', '기교'];
  const DISH_FX = (e => { const m = /\+\s*(\d+(?:\.\d+)?)%/.exec(e || ''); if (!m) return { stats: [], pct: 0 }; const part = (e || '').slice(0, m.index); return { stats: part.includes('모든 능력치') ? [0, 1, 2, 3, 4] : STATS_.map((n, i) => part.includes(n) ? i : -1).filter(i => i >= 0), pct: +m[1] / 100 }; });   // '힘·기교 +3%' → {stats:[0,4], pct:0.03} (요리별 능력치 효과)
  const QBYID = {}, MAT = {}; if (GD.content) { for (const t of GD.content.quests) QBYID[t.id] = t; for (const m of GD.content.materials) MAT[m.id] = m; }
  // 요리: meals.csv의 메뉴(등급·순서) + 편집기 요리 아이템의 레시피(이름으로 연결)
  const DISH = (GD.meals || []).map(m => { const it = GD.content && GD.content.items.find(i => i.kind === 'food' && i.name === m.name); return Object.assign({ name: m.name, g: GR.indexOf(m.grade), mats: it ? (it.recipe || []).map(r => r.m) : [], icon: it ? it.icon : '', effect: (it && it.desc) || m.effect || '' }, DISH_FX((it && it.desc) || m.effect)); })   // 효과 원본 = 소재 편집기 요리 '효과'(desc), 비면 meals.csv.filter(d => d.mats.length);
  const TPL = {}; if (GD.content) for (const t of GD.content.quests) if ((t.board || t.core) && t.type >= 0) { const k = t.type + '_' + GR.indexOf(t.grade); (TPL[k] = TPL[k] || [])[t.core ? 'unshift' : 'push'](t); }
  // 전투 계산 (combat.js, docs/design/quest_combat.md). 적이 있는 의뢰는 전투로 성패를 정함. combat.js 가 없으면 예전 판정
  const CL = root.GuildCombat || (typeof require === 'function' ? (() => { try { return require('./combat.js'); } catch (e) { return null; } })() : null);
  const CB = CL ? CL.make(GD) : null, COMBAT = !!(CB && CB.ok);
  const QTYPE = GD.questTypes || ['토벌', '사냥·채집', '조사', '호위·구호', '탐사'];
  const RISK = ['신중', '보통', '무모'], SPEND = ['절약', '보통', '낭비'], SOCIAL = ['독불장군', '보통', '사교적'];
  const WPM = 4, WPY = 48;
  const NAMES = GD.names || ['아론', '벨라', '카스', '다리아', '에단', '피오나', '가빈', '헤라', '이반', '줄리아', '켄트', '루나', '마커스', '니나', '오웬', '페넬로페', '퀸', '로사', '세스', '타냐',
    '울릭', '베라', '웨스', '자라', '알마', '브루노', '클라라', '데인', '엘사', '펠릭', '그레타', '호레이스', '이리스', '잭', '카야', '레오', '미라벨', '네드', '올가', '피터',
    '리타', '사일러스', '테오', '우나', '빅터', '윌라', '엘런', '노아', '아이다', '벤', '실비아', '조엘', '헬가', '라이언', '소피', '토빈', '마야', '다넬', '에이미', '고든'];

  function attachRng(s) { s.R = function () { s.rngState = (s.rngState + 0x6D2B79F5) >>> 0; let t = s.rngState; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; return s; }
  function serialize(s) { const o = Object.assign({}, s); delete o.R; return JSON.stringify(o); }
  function deserialize(str) { return migrate(attachRng(JSON.parse(str))); }

  function newGame(cfg, seed) {
    const s = {
      cfg, seed: seed >>> 0, rngState: seed >>> 0,
      expireV: 1, up: {}, place: { items: [], next: 1 }, week: 0, grade: 0, gold: cfg.econ.startGold, trust: 50, fame: 0, pop: cfg.town.startPop,
      built: { 게시판: true, 접수대: true, 주점: true, 판매창구: true }, eff: {}, meals: [0, 0, 0, 0, 0, 0, 0],
      filter: [4, 0, 0, 0, 0, 0, 0], filterV: 2, // 게시판 칸 배분: 등급별 비중 0(없음)·1(적게)·2(보통)·4(우선) (docs/design/popup_board.md)
      advs: [], board: [], active: [], nextId: 1, log: [],
      month: blankLedger(), lastMonth: null, history: [],
      stats: { done: 0, fail: 0, combat: 0, combatWin: 0, injuries: 0, deaths: 0, potions: 0 },
      proposals: [], discovered: {}, // 전직 제안 대기열, 발견한 직업 (M3-2)
      knownMats: {}, // 알게 된 소재 id → true. 처음 얻으면 기록 (의뢰 게시판·식당의 ? 실루엣이 풀림)
      mats: {}, dishes: {}, // 가진 소재 id → 개수, 발견한 요리 이름 → 발견한 주 (docs/design/cooking.md)
      ui: { expView: null } // 화면 배치 저장. expView: 원정 미니 뷰 위치 {x, y}(1920×1080 기준 왼쪽 위), null이면 기본 자리
    };
    attachRng(s);
    for (let i = 0; i < cfg.adv.startCount; i++) spawnAdv(s, { attach: 20, quiet: true });
    log(s, '길드가 문을 열었습니다. 모험가 ' + cfg.adv.startCount + '명이 첫 손님으로 찾아왔습니다.', 'guild');
    return s;
  }
  function hasBatchim(w) { const c = w.charCodeAt(w.length - 1); return c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 !== 0; }
  function J(w, a, b) { return w + (hasBatchim(w) ? a : b); }
  const names = party => party.map(m => m.name).join('·');
  function blankLedger() { return { fee: 0, resale: 0, meal: 0, tavern: 0, subsidy: 0, upkeep: 0, other: 0, quests: 0, success: 0, build: 0, dishes: {}, wd: [], builds: [], inTown: 0 }; }   // build·dishes·wd·builds·inTown: 장부 화면 내역용 (운영 순이익 net에는 건설비를 넣지 않음 = 관문 1 기준)
  const ri = (s, n) => Math.floor(s.R() * n);
  // 기록용 의뢰 이름: 편집기에서 지은 이름이 있으면 「이름」, 기본 이름(○○ F급 의뢰)이면 등급·유형
  function qn(q) { return q.name && !/급 의뢰/.test(q.name) ? `${GR[q.g]}급 「${q.name}」` : `${GR[q.g]}급 ${QTYPE[q.type]}`; }
  // 도감: 의뢰를 다녀오면(성공·실패 모두) 그 의뢰의 몬스터를 만난 것으로 기록
  function seeMons(s, q) {
    s.seenMons = s.seenMons || {}; const T = QBYID[q.tid]; if (!T) return;
    for (const e of T.enemies || []) if (e.mon && !s.seenMons[e.mon]) { s.seenMons[e.mon] = s.week; log(s, `처음 보는 몬스터를 만났습니다: ${e.name || e.mon}`, 'unlock'); }
  }
  function log(s, text, kind, extra) { s.log.unshift(Object.assign({ week: s.week, text, kind: kind || 'info' }, extra || {})); if (s.log.length > 600) s.log.pop(); }   // 기록 600개 = 약 2년치 (길드 기록 팝업)
  const effN = (s, f) => s.eff[f] || 0;
  const popStage = s => { let k = 0; for (const t of s.cfg.town.stages) if (s.pop >= t) k++; return k; };
  const feeRate = s => s.cfg.econ.feeBase + s.cfg.econ.feePerInfo * effN(s, '정보실');
  // 게시판 칸 배분: 버튼 4단계의 비중. 칸 수 = 최대 칸 × 비중 ÷ 합 (최대 나머지 방식으로 합을 정확히 맞춤)
  const FILTER_W = [0, 1, 2, 4], FILTER_NAME = ['없음', '적게', '보통', '우선'];
  const filterLevel = w => w >= 4 ? 3 : w >= 2 ? 2 : w >= 1 ? 1 : 0;
  function boardQuota(s) {
    const cap = boardCap(s), w = s.filter.map((v, g) => g <= s.grade ? v : 0), tot = w.reduce((a, b) => a + b, 0);
    if (!tot) return w.map(() => 0);
    const raw = w.map(v => cap * v / tot), q = raw.map(Math.floor);
    let left = cap - q.reduce((a, b) => a + b, 0);
    raw.map((v, g) => [v - q[g], g]).filter(x => w[x[1]] > 0).sort((a, b) => b[0] - a[0] || b[1] - a[1]).forEach(([, g]) => { if (left > 0) { q[g]++; left--; } });
    return q;
  }
  function boardCap(s) { return s.cfg.quest.boardCap[s.grade] + [0, 2, 5, 5][Math.min(3, effN(s, '게시판'))]; }

  // 길드 등급별 모험가 상한 (설정 adv.capByGrade 가 없으면 F~S 순서로 8·12·16·20·24·28·32명)
  function advCap(s) { const A = (s.cfg && s.cfg.adv) || {}, C = A.capByGrade || [8, 12, 16, 20, 24, 28, 32]; return C[s.grade] || 8; }
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
      risk: ri(s, 3), spend: ri(s, 3), social: ri(s, 3), wallet: 0, gear: -1, pots: 0,
      state: 'away', until: 0, joined: s.week, alive: true, done: 0,
      cls1: CLASS1[core], line: [core], fin: false, promoCool: 0, skills: [{ line: core, form: CLASS1[core] }], career: [{ week: s.week, text: '길드에 처음 옴' }]
    };
    s.advs.push(a);
    if (!o.quiet) log(s, `${a.cls} ${J(a.name, '이', '가')} 길드를 처음 찾아왔습니다.`, 'arrive', { who: [a.name] });
    return a;
  }

  function finalStat(s, a, i) {
    const GE = s.cfg.gear; let v = Math.min(s.cfg.growth.statCap, a.stats[i]);
    if (a.gear >= 0) { if (i === a.core) v += GE.weaponStat[a.gear] + GE.accStat[a.gear]; }   // 장신구: 주력 능력치 +3×등급 순번 (직업 제한 없는 장신구를 주력에 맞게 착용한다고 봄)
    return v;
  }
  function makeQuest(s, g) {
    const Q = s.cfg.quest; const type = ri(s, 5); const n = Q.reqCount[g]; const req = [type];
    while (req.length < n) { const k = ri(s, 5); if (!req.includes(k)) req.push(k); }
    const C = TPL[type + '_' + g], T = !C ? null : C.length > 1 ? C[Math.floor(s.R() * C.length)] : C[0];   // 후보 1개면 난수를 쓰지 않아 예전과 같은 결과
    const R0 = (T ? T.ref : Q.ref[g]) * n * (0.85 + s.R() * 0.30);
    const q = { id: s.nextId++, g, type, req: T && T.stats && T.stats.length ? T.stats.slice() : req, r: R0 / n, reward: T ? T.reward : Q.reward[g], posted: s.week };
    if (T) Object.assign(q, { tid: T.id, name: T.name, weeks: T.weeks, fameS: T.fameS, fameF: T.fameF, trustS: T.trustS, trustF: T.trustF, death: T.death });
    if (COMBAT && T && T.enemies && T.enemies.length) {
      // 개체 차이: 실제 적은 게시 정보보다 강하거나 약할 수 있음(±enemyVar). 모험가는 게시 정보(seen)로 판단, 정보실이 있으면 실제에 가까워짐
      const f = 1 + (s.R() * 2 - 1) * (CB.C.enemyVar || 0), look = Math.min(1, 0.25 * effN(s, '정보실'));
      q.enemies = []; q.seen = []; q.foe = f;
      for (const e of T.enemies) for (let k = 0; k < e.count; k++) {
        q.enemies.push({ hp: e.hp * f, atk: e.atk * f, def: e.def || 0, name: e.name, mon: e.mon, boss: !!e.boss });
        q.seen.push({ hp: e.hp * (1 + (f - 1) * look), atk: e.atk * (1 + (f - 1) * look), def: e.def || 0, name: e.name, boss: !!e.boss });
      }
    }
    return q;
  }
  function successP(s, party, q, sm) {   // sm(a, k): 요리 능력치 배율 (없으면 1)
    const Q = s.cfg.quest; let F = 0, bottleneck = false;
    for (const k of q.req) {
      const vals = party.map(a => finalStat(s, a, k) * (sm ? sm(a, k) : 1) * (k === a.core ? 1 + [0.03, 0.06, 0.10][a.stage - 1] : 1)).sort((x, y) => y - x);
      const P0 = vals[0] + Q.partyAssist * vals.slice(1).reduce((x, y) => x + y, 0);
      const fill = Math.min(P0 / q.r, 1.5); if (fill < 0.5) bottleneck = true; F += fill;
    }
    F /= q.req.length;
    let p = Math.max(0.05, Math.min(0.97, 0.55 + 1.1 * (F - 1)));
    if (bottleneck) p /= 2;
    return p;
  }
  const isCombat = q => !!(q.enemies && q.enemies.length && COMBAT);
  const unitOf = (s, a, mealB, sm) => CB.unit(a, i => finalStat(s, a, i) * (sm ? sm(a, i) : 1), a.gear, mealB);
  // 예상 성공 확률: 전투 의뢰는 예측 전투(게시 정보 기준), 비전투 의뢰는 능력치 판정
  function questP(s, party, q) { return isCombat(q) ? CB.predict(party.map(a => unitOf(s, a, 0)), q.seen, q.g, party[0].risk) : successP(s, party, q); }
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
      // 같은 주에 여러 번 오르면 한 줄로 합침 (Lv 1 → 3)
      const lp = s.log.slice(0, 30).find(e => e.week === s.week && e.lvAdv === a.id);
      if (lp) { lp.lvTo = a.lv; lp.text = `${a.name}의 레벨이 올랐습니다. (Lv ${lp.lvFrom} → ${a.lv})`; }
      else log(s, `${a.name}의 레벨이 올랐습니다. (Lv ${a.lv - 1} → ${a.lv})`, 'grow', { who: [a.name], lvAdv: a.id, lvFrom: a.lv - 1, lvTo: a.lv });
    }
  }
  function tryGradeUp(s, a) {
    const lvReq = [0, 5, 10, 18, 26, 35, 45], achReq = [0, 5, 5, 7, 7, 10, 10]; const n = a.grade + 1;
    if (n > 6 || n > s.grade + 1 || n === 6) return;   // 2026-11-12: 모험가 등급 상한 = 길드 등급 + 1 (1년 차 F급 길드에서도 E급 승급)
    if (a.lv >= lvReq[n] && a.ach >= achReq[n]) {
      const gb = (s.cfg.growth.gradeStat || [])[n] || 0, cap = s.cfg.growth.statCap;   // 2026-11-12: 승급 보너스 = 능력치 5개에 각각 고정값
      for (let i = 0; i < 5; i++) a.stats[i] = Math.min(cap, a.stats[i] + gb);
      a.grade = n; a.ach = 0; if (a.career) a.career.push({ week: s.week, text: `${GR[n]}급 모험가로 승급` }); log(s, `${J(a.name, '이', '가')} ${GR[n]}급 모험가가 되었습니다.`, 'grow', { who: [a.name], gup: { id: a.id, g: n, bonus: gb } }); }   // gup: 축하 팝업용
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
  const ATTACH_TITLE = ['방랑자', '신입', '동반자', '마을의 수호자'];
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
      for (const o of out.concat(locked)) if (!s.discovered[o.name]) { s.discovered[o.name] = s.week; log(s, `새 직업의 길을 찾았습니다: ${o.name} (${a.name})`, 'unlock', { who: [a.name] }); }
      if (!out.length || s.week < (a.promoCool || 0) || s.proposals.some(p => p.id === a.id)) continue;
      s.proposals.push({ id: a.id, opts: out.map(o => o.name), week: s.week, to: a.stage + 1 });
      log(s, `${J(a.name, '이', '가')} ${a.stage + 1}차 전직 조건을 채웠습니다. 접수원이 전직을 제안합니다.`, 'promo', { who: [a.name] });
    }
  }
  // 길드 마스터의 결정: cls = 고른 직업 이름, null = 보류
  function decidePromotion(s, id, cls) {
    const pi = s.proposals.findIndex(p => p.id === id); if (pi < 0) return null;
    const p = s.proposals[pi]; s.proposals.splice(pi, 1);
    const a = s.advs.find(x => x.id === id); if (!a || !a.alive) return null;
    if (!cls) { a.promoCool = s.week + 12; log(s, `${a.name}의 전직 제안을 보류했습니다. (3개월 뒤 다시 제안)`, 'promo', { who: [a.name] }); return { held: true }; }
    const base = [0.40, 0.65, 0.90, 1.00][attachTier(a)], chance = Math.min(1, base * (p.to === 2 ? 1.2 : 0.9) + (upg(s, '관리소') ? (s.cfg.promo.upAccept || 0.1) : 0));   // 관리소 업그레이드 +10%p
    if (s.R() > chance) {
      a.promoCool = s.week + 12; a.career.push({ week: s.week, text: `${cls} 전직 제안을 거절` });
      log(s, `${J(a.name, '이', '가')} ${cls} 전직을 거절했습니다. (수락 확률 ${Math.round(chance * 100)}%, 3개월 뒤 다시 제안)`, 'promo', { who: [a.name] });
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
    log(s, `${J(a.name, '이', '가')} ${name}${lastJ === 0 || lastJ === 8 ? '로' : '으로'} 전직했습니다!`, 'promo', { who: [a.name], done: true });
    const bank = a.bank; a.bank = 0; if (bank > 0) gainXp(s, a, bank); // 상한에 막혀 쌓아 둔 경험치 반영
  }
  // 예전 저장 데이터 보정
  function migrate(s) {
    s.proposals = s.proposals || []; s.discovered = s.discovered || {}; s.knownMats = s.knownMats || {}; s.seenMons = s.seenMons || {}; if (s.fame == null) s.fame = 0;
    s.mats = s.mats || {}; s.up = s.up || {};
    if (!s.place) {   // 2026-11-12 자유 배치 도입 전 저장: 그때 있던 테이블(등급별 2·3·4세트)을 예전 자리에 무료로 놓아 줌
      s.place = { items: [], next: 1 }; const n = 2 + (s.grade >= 1 ? 1 : 0) + (s.grade >= 2 ? 1 : 0);
      for (const [gx, gy] of OLD_TABLES.slice(0, n)) s.place.items.push({ uid: s.place.next++, id: 'table', gx, gy });
    }
    if (!s.expireV) { s.expireV = 1; for (const q of s.board || []) q.posted = s.week; }   // 2026-11-12 의뢰 기한 도입 전 저장: 게시판 의뢰가 한꺼번에 만료되지 않게 기한을 새로 시작
    if (!s.dishes) { s.dishes = {}; for (let g = 0; g < 7; g++) DISH.filter(d => d.g === g).slice(0, s.meals[g] || 0).forEach(d => { s.dishes[d.name] = s.week; }); }   // 예전 저장: 등급별 해금 수 → 앞에서부터 그만큼 발견한 것으로
    syncMeals(s);
    s.ui = s.ui || {}; if (s.ui.expView === undefined) s.ui.expView = null; // 예전 저장에는 화면 배치가 없음
    for (const a of s.advs) {
      if (!a.cls1) a.cls1 = CLASS1[a.core];
      if (!a.line) a.line = [a.core];
      if (a.fin == null) a.fin = false;
      if (!a.skills) a.skills = [{ line: a.core, form: a.cls1 }];
      if (!a.career) a.career = [{ week: a.joined || 0, text: '길드에 처음 옴' }];
      if (a.promoCool == null) a.promoCool = 0;
      if (a.pots == null) a.pots = 0;   // 전투 도입 전 저장
    }
    for (const k of ['combat', 'combatWin', 'injuries', 'deaths', 'potions']) if (s.stats[k] == null) s.stats[k] = 0;
    if (s.filterV !== 2) {   // 예전 슬라이더(0~10) → 버튼 4단계: 0 없음, 1~2 적게, 3~6 보통, 7~10 우선
      s.filter = s.filter.map(v => v <= 0 ? 0 : v <= 2 ? 1 : v <= 6 ? 2 : 4);
      if (!s.filter.slice(0, s.grade + 1).some(v => v > 0)) s.filter[s.grade] = 4;
      s.filterV = 2;
    }
    return s;
  }

  // ---------- 플레이어 행동 ----------
  // 칸 배분 바꾸기. 열린 등급이 모두 0(없음)이 되면 거절하고 false
  function setFilter(s, weights) {
    const next = weights.map((w, g) => g <= s.grade ? Math.max(0, w) : 0);
    if (!next.some(w => w > 0)) return false;
    s.filter = next; return true;
  }
  // 새 등급이 열리면 그 등급만 "우선"(4), 기존 등급 값은 그대로
  function openGrades(s, g0) { for (let g = g0 + 1; g <= s.grade; g++) s.filter[g] = FILTER_W[3]; }
  // 의뢰 기한 (2026-11-12, docs/design/popup_board.md 10장): 게시 후 expireWeeks 주 동안 아무도 받지 않으면 사라지고 신뢰도 하락
  const expireWeeks = s => (s.cfg.quest.expireWeeks || 4) + (upg(s, '게시판') ? (s.cfg.quest.upBoardWeeks || 1) : 0);   // 게시판 업그레이드 +1주
  function expireQuests(s) {
    const W = expireWeeks(s), dt = s.cfg.quest.trustExpire != null ? s.cfg.quest.trustExpire : 1;
    for (let i = s.board.length - 1; i >= 0; i--) {
      const q = s.board[i]; if (s.week - q.posted < W) continue;
      s.board.splice(i, 1); s.trust = Math.max(0, s.trust - dt); s.month.expired = (s.month.expired || 0) + 1;
      log(s, `${qn(q)} 의뢰가 기한(${W}주)이 지나 게시판에서 사라졌습니다. 신뢰도 −${dt}.`, 'expire');
    }
  }
  function withdrawQuest(s, qid) {
    const i = s.board.findIndex(q => q.id === qid); if (i < 0) return false;
    const q = s.board[i]; const cost = Math.round(q.reward * 0.10);
    s.board.splice(i, 1); s.gold -= cost; s.month.other -= cost; (s.month.wd = s.month.wd || []).push({ g: q.g, type: q.type, name: q.name || '', cost }); s.trust = Math.max(0, s.trust - 2);
    log(s, `${qn(q)} 의뢰를 게시판에서 뗐습니다. 등록비·위약금 ${cost}G, 신뢰도 −2.`, 'withdraw');
    return true;
  }
  function debugSetGrade(s, g) { const ng = Math.max(0, Math.min(6, g)); for (let k = s.grade + 1; k <= ng; k++) s.fame = Math.min(s.cfg.fame.cap, (s.fame || 0) + s.cfg.fame.gradeUp[k]); const g0 = s.grade; s.grade = ng; openGrades(s, g0); log(s, `[디버그] 길드 등급을 ${GR[s.grade]}로 바꿨습니다.`, 'debug'); }

  // ---------- 진행 ----------
  function generateQuests(s) {
    if (s.week % WPM === 0) s.x2Owed = hasDeco(s, 'trophy') ? (s.cfg.deco.x2PerMonth || 0) : 0;
    const Q = s.cfg.quest, T = s.cfg.town;
    const mult = T.inflowMult[popStage(s)] * (0.7 + 0.6 * s.trust / 100) * (1 + 0.1 * s.grade) * (1 + 0.1 * Math.min(1, effN(s, '접수대')));
    const n = Math.round(Q.perMonth * mult / WPM + s.R() * 0.5);
    const cap = boardCap(s);
    // 필터: 등급별 칸 배분
    const tot = s.filter.slice(0, s.grade + 1).reduce((a, b) => a + b, 0) || 1;
    const quota = boardQuota(s);
    for (let i = 0; i < n; i++) {
      let r = s.R() * tot, g = 0; for (; g <= s.grade; g++) { r -= s.filter[g]; if (r <= 0) break; } g = Math.min(g, s.grade);
      const count = s.board.filter(q => q.g === g).length;
      if (s.board.length < cap && count < Math.max(1, quota[g])) { const q = makeQuest(s, g); markX2(s, q); s.board.push(q); }
    }
  }
  // ×2 의뢰 (2026-11-12, guild_interior.md 2-2·10-2): 게시될 때 quest.x2Rate 확률로 골드만 2배. 트로피 장식장이 있으면 달마다 처음 게시되는 의뢰부터 deco.x2PerMonth건 보장
  function markX2(s, q) {
    const r = s.R();
    if (s.x2Owed > 0) { q.x2 = true; s.x2Owed--; } else if (r < (s.cfg.quest.x2Rate || 0)) q.x2 = true;
    if (q.x2) s.stats.x2 = (s.stats.x2 || 0) + 1;
  }
  function present(s, a) {
    if (!a.alive || a.state === 'quest') return false;
    if (a.state === 'injured' && s.week < a.until) return false;   // 부상 회복 중
    if (a.attach >= 100) return true;
    const interval = s.cfg.adv.visitBaseWeeks * (1 + (100 - a.attach) / 50);
    return s.R() < Math.min(1, 2 / interval);
  }
  // 등급별 요리 수 (meals.csv). 해금은 그 수까지, 식사 보너스는 2개 이상 열리면 100% (요리별 능력치 맞춤은 나중에)
  const MEAL_N = GR.map(g => (GD.meals || []).filter(m => m.grade === g).length || 2);
  function mealFor(s, q) { for (let g = q.g; g >= 0; g--) if (s.meals[g] > 0) return g; return -1; }
  // 출발 전 요리 고르기 (C안): 발견한 요리 중 의뢰 등급 이하에서 요구 능력치와 가장 많이 겹치는 것 → 같으면 높은 등급 → 높은 수치
  function dishFor(s, q) { let best = null, bs = -1; for (const d of DISH) { if (!s.dishes[d.name] || d.g > q.g) continue; const sc = d.stats.filter(k => q.req.includes(k)).length * 1000 + d.g * 10 + d.pct * 100; if (sc > bs) { bs = sc; best = d; } } return best; }

  // ---------- 소재와 요리 조합 (docs/design/cooking.md) ----------
  function dropMats(s, q) {
    const T = QBYID[q.tid]; if (!T) return;
    for (const r of T.rewards || []) {
      if (s.R() * 100 >= r.p) continue;
      s.mats[r.m] = (s.mats[r.m] || 0) + 1;
      if (!s.knownMats[r.m]) { s.knownMats[r.m] = true; const m = MAT[r.m]; if (m) log(s, `처음 보는 소재를 얻었습니다: ${m.name}`, 'unlock'); }
    }
  }
  function syncMeals(s) { s.meals = GR.map((_, g) => DISH.filter(d => d.g === g && s.dishes[d.name]).length); }   // 식사 보너스는 등급별 발견 수로 판정 (예전 규칙 그대로)
  // 조합: 소재 각 1개씩 1~3개. 결과 kind = known(이미 아는 요리, 소재 안 씀) · ok(발견) · none(하나도 안 겹침) · extra(하나 더 들어감) · missing(모자람) · wrong(틀린 재료)
  function cook(s, ids) {
    ids = [...new Set(ids)].filter(Boolean).slice(0, 3);
    if (!ids.length || ids.some(m => !(s.mats[m] > 0))) return { kind: 'invalid' };
    const same = d => d.mats.length === ids.length && d.mats.every(m => ids.includes(m));
    const hit = DISH.find(same);
    if (hit && s.dishes[hit.name]) return { kind: 'known', dish: hit };
    for (const m of ids) s.mats[m]--;
    if (hit) { s.dishes[hit.name] = s.week; syncMeals(s); log(s, `새 요리를 발견했습니다: ${hit.name}`, 'unlock'); return { kind: 'ok', dish: hit }; }
    // 힌트: 넣은 재료와 가장 많이 겹치는 미발견 요리 (같으면 낮은 등급 → 무작위). 길드 등급 이하 요리가 남아 있으면 그 안에서만
    let pool = DISH.filter(d => !s.dishes[d.name] && d.g <= s.grade); if (!pool.length) pool = DISH.filter(d => !s.dishes[d.name]);
    const ov = d => d.mats.filter(m => ids.includes(m)).length;
    const best = pool.reduce((b, d) => Math.max(b, ov(d)), 0);
    if (!best) return { kind: 'none' };
    let c = pool.filter(d => ov(d) === best); const g0 = Math.min(...c.map(d => d.g)); c = c.filter(d => d.g === g0);
    const d = c.length > 1 ? c[Math.floor(s.R() * c.length)] : c[0];
    const extra = ids.filter(m => !d.mats.includes(m)), missing = d.mats.filter(m => !ids.includes(m));
    if (!missing.length) return { kind: 'extra', mat: extra[0] };
    if (!extra.length) return { kind: 'missing' };
    return { kind: 'wrong', mat: extra[0] };
  }
  // 시험용 자동 조합 (관문 1 검증·시뮬레이터와 같은 기준): 재료가 다 있는 미발견 요리를 바로 만듦 (실패 없음 = 가장 잘하는 플레이어)
  // [개발] 식당 시험: fill = F·E 음식 소재 각 3개(알게 됨 처리), reset = 발견한 요리 초기화
  function debugKitchen(s, mode) {
    if (mode === 'reset') { s.dishes = {}; syncMeals(s); return; }
    for (const id in MAT) { const m = MAT[id]; if (m.line === 'food' && GR.indexOf(m.grade) <= 1) { s.mats[id] = (s.mats[id] || 0) + 3; s.knownMats[id] = true; } }
  }
  function autoCook(s) { for (const d of DISH) if (!s.dishes[d.name] && d.g <= s.grade && d.mats.every(m => s.mats[m] > 0)) cook(s, d.mats); }


  function departures(s) {
    s.seatUsed = 0;   // 이번 주 식사한 좌석 수
    const Q = s.cfg.quest, E = s.cfg.econ;
    for (const a of s.advs) { if (!a.alive || a.state === 'quest') continue; if (a.state === 'injured' && s.week < a.until) continue; a.state = present(s, a) ? 'town' : 'away'; if (a.state === 'town') a.lastSeen = s.week; }   // lastSeen: 마지막으로 길드에 온 주
    const idle = s.advs.filter(a => a.state === 'town');
    for (const a of idle) {
      if (a.state !== 'town') continue;
      const range = [[-1, 0], [-1, 1], [0, 2]][a.risk];
      const hi = Math.min(s.grade, a.grade + range[1]), lo = Math.min(hi, Math.max(0, a.grade + range[0]));   // 2026-11-12: 길드보다 1등급 높은 모험가도 길드 최고 등급 의뢰는 고름
      const th = s.cfg.adv.departTh[a.risk];
      const cands = s.board.filter(q => q.g >= lo && q.g <= hi).sort((x, y) => y.g - x.g);
      for (const q of cands) {
        let party = [a];
        let pp = perceived(s, a, questP(s, party, q));
        if (pp < s.cfg.adv.seekTh[a.social]) {
          const mates = idle.filter(b => b !== a && b.state === 'town' && Math.abs(b.grade - q.g) <= 1).slice(0, 4);
          for (const m of mates) { party.push(m); if (perceived(s, a, questP(s, party, q)) >= th) break; }
          pp = perceived(s, a, questP(s, party, q));
        }
        if (pp < th) continue;
        s.board.splice(s.board.indexOf(q), 1);
        // 출발 전 식사
        let eaters = 0; const dish = dishFor(s, q), ate = new Set();
        if (dish) for (const m of party) {
          if (s.seatUsed >= seatsOf(s)) break;   // 2026-11-12: 앉을 자리(테이블 세트 × 2)만큼만 이번 주에 식사 (guild_interior.md 10-3)
          const price = Q.reward[dish.g] * E.mealPriceRate;
          if (m.wallet >= price && s.R() < E.mealBuyRate[m.spend]) { s.seatUsed++; m.wallet -= price; const inc = price * E.mealMargin + (upg(s, '주점') ? (E.upMargin || 5) : 0); s.gold += inc; s.month.meal += inc; eaters++; ate.add(m.id); const md = s.month.dishes = s.month.dishes || {}; md[dish.name] = (md[dish.name] || 0) + 1; }
        }
        // 식사 효과 (C안): ① 발견한 요리 하나당 +2% (비전투 성공 확률·전투 공격력, 먹은 비율만큼) ② 먹은 요리의 능력치 +n% (먹은 사람만)
        const mealB = dish ? (eaters / party.length) * E.mealPerDish * Object.keys(s.dishes).length : 0;
        const sm = dish && dish.stats.length ? (a, k) => ate.has(a.id) && dish.stats.includes(+k) ? 1 + dish.pct : 1 : null;
        const weeks = q.weeks || Q.weeks[q.g];              // 편집기에서 기간을 바꾼 의뢰는 그 값
        let p, fight = null;
        if (isCombat(q)) {
          // 전투 의뢰: 출발할 때 물약을 사고 전투를 미리 계산해 둠 (귀환할 때 결과 반영, 미니 뷰가 기록을 재생)
          const C = CB.C, price = C.potionPrice[Math.min(q.g, s.grade)];
          for (const m of party) { const want = C.potionCarry[m.spend] - (s.R() < 0.5 ? 1 : 0); while (m.pots < want && m.wallet >= price) { m.wallet -= price; m.pots++; } }
          const r = CB.fight(party.map(m => unitOf(s, m, mealB, sm)), q.enemies, q.g, s.R, party[0].risk, true);
          fight = { win: r.win, result: r.result, rounds: r.rounds, log: r.log.map(e => e.hp != null ? Object.assign({}, e, { hp: Math.round(e.hp) }) : e),
            units: r.units.map(u => ({ id: u.a.id, maxHp: Math.round(u.maxHp), maxMp: Math.round(u.maxMp || 0), hp: Math.round(u.hp), down: u.down, pots: u.pots, used: u.used })),
            enemies: q.enemies.map(e => ({ name: e.name, mon: e.mon, boss: e.boss, maxHp: Math.round(e.hp), atk: Math.round(e.atk) })) };
          p = r.win ? 1 : 0;
        } else p = Math.min(0.97, successP(s, party, q, sm) * (1 + mealB));
        // 비전투 의뢰도 결과를 출발할 때 정해 둠 (미니 뷰가 귀환 전에 결과 장면을 보여 줌). rate = 출발 때 예상 성공률(위험도 표시용)
        const ok = fight ? fight.win : s.R() < p, rate = Math.round(pp * 100);
        for (const m of party) { m.state = 'quest'; m.until = s.week + weeks; }
        s.active.push({ q, party: party.map(m => m.id), p, ok, rate, start: s.week, weeks, back: s.week + weeks, ate: eaters, dish: dish && eaters ? dish.name : null, fight });
        log(s, `${J(names(party), '이', '가')} ${qn(q)} 의뢰를 맡아 떠났습니다.${eaters ? ` (출발 전 ${dish.name} ${eaters}명)` : ''}`, 'depart', { who: party.map(x => x.name) });
        break;
      }
    }
    // 술 (2026-11-12): 이번 주 마을에 남은 모험가가 씀씀이 성향별 확률(식사와 같은 econ.mealBuyRate)로 1잔. 길드 마진 econ.drinkMargin[길드 등급]
    const DM = E.drinkMargin || [2, 3, 4, 5, 6, 7, 8]; s.drinks = [];
    for (const a of s.advs) if (a.alive && a.state === 'town' && s.R() < E.mealBuyRate[a.spend]) { const m = (DM[s.grade] || DM[0]) + (upg(s, '주점') ? (E.upMargin || 5) : 0); s.gold += m; s.month.tavern += m; s.month.drinks = (s.month.drinks || 0) + 1; s.drinks.push(a.id); }
  }

  function returns(s) {
    const Q = s.cfg.quest, G = s.cfg.growth, A = s.cfg.adv, E = s.cfg.econ;
    const back = s.active.filter(x => x.back <= s.week); s.active = s.active.filter(x => x.back > s.week);
    for (const x of back) {
      const party = x.party.map(id => s.advs.find(a => a.id === id));
      const q = x.q, F = x.fight; s.month.quests++; seeMons(s, q);
      const ok = x.ok != null ? x.ok : F ? F.win : s.R() < x.p;   // 예전 저장(출발 때 결과 없음)은 귀환 때 판정
      if (F) { s.stats.combat++; if (ok) s.stats.combatWin++; }
      if (ok) {
        s.stats.done++; s.month.success++;
        const RW = q.reward * (q.x2 ? 2 : 1), DV = s.cfg.deco;   // ×2 의뢰는 골드만 2배 (명성·경험치는 그대로)
        const fee = RW * feeRate(s) + (hasDeco(s, 'bench') ? DV.gold : 0), resale = RW * E.resaleRate;   // 벤치 +5G는 중계 수입에 더함
        s.gold += fee + resale; s.month.fee += fee; s.month.resale += resale;
        const each = RW * (1 - feeRate(s)) / party.length;
        for (const a of party) {
          a.wallet += each; a.done++;
          gainXp(s, a, G.xpBase * Math.pow(G.xpGradeMult, q.g) + (hasDeco(s, 'map') ? DV.xp : 0));
          a.stats[q.type] = Math.min(G.statCap, a.stats[q.type] + Q.subGrowth);
          a.attach = Math.min(100, a.attach + A.attachSuccess + (hasDeco(s, 'plant') ? DV.attach : 0));
          if (q.g >= a.grade + 1 || (q.g >= a.grade && a.grade === s.grade)) a.ach++;
          tryGradeUp(s, a);
        }
        s.trust = Math.min(100, s.trust + (q.trustS != null ? q.trustS : s.cfg.quest.trustSucc) + (hasDeco(s, 'boardDeco') ? DV.trust : 0));
        s.fame = Math.min(s.cfg.fame.cap, (s.fame || 0) + (q.fameS != null ? q.fameS : s.cfg.fame.succ[q.g]) + (hasDeco(s, 'banner') ? DV.fame : 0));
        // 소재 획득: 편집기 보상표 확률대로 (요리는 이제 식당에서 조합으로만 발견 — 예전 '토벌·사냥 성공 시 50% 해금'은 없앰)
        dropMats(s, q);
        if (hasDeco(s, 'locker')) { const T = QBYID[q.tid], b = T && (T.rewards || []).reduce((x, r) => (!x || r.p > x.p ? r : x), null); if (b) { s.mats[b.m] = (s.mats[b.m] || 0) + DV.mat; if (!s.knownMats[b.m]) { s.knownMats[b.m] = true; const m = MAT[b.m]; if (m) log(s, `처음 보는 소재를 얻었습니다: ${m.name}`, 'unlock'); } } }   // 사물함: 기본 소재 +1
        log(s, `${J(names(party), '이', '가')} ${qn(q)} 의뢰에 성공했습니다.${q.x2 ? ' (×2 보상)' : ''} 길드 수입 ${Math.round(fee + resale)}G.`, 'success', { who: party.map(x => x.name) });
      } else {
        s.stats.fail++; s.trust = Math.max(0, s.trust - (q.trustF != null ? q.trustF : s.cfg.quest.trustFail)); s.fame = Math.max(0, (s.fame || 0) - (q.fameF != null ? q.fameF : s.cfg.fame.fail[q.g]));
        for (const a of party) gainXp(s, a, G.xpBase * Math.pow(G.xpGradeMult, q.g) * G.xpFailRate);
        log(s, `${J(names(party), '이', '가')} ${qn(q)} 의뢰에 실패했습니다.`, 'fail', { who: party.map(x => x.name) });
      }
      for (const a of party) { a.state = 'town'; a.until = 0; }
      if (F) for (const u of F.units) {   // 전투의 대가: 물약 소모, 쓰러진 사람은 사망 판정 → 살면 부상
        const a = party.find(m => m && m.id === u.id); if (!a) continue;
        a.pots = u.pots; s.stats.potions += u.used;
        if (!u.down) continue;
        s.stats.injuries++;
        const d = (q.death != null ? q.death : Q.deathBase[q.g]) * CB.C.deathRisk[a.risk] * (1 - 0.15 * Math.min(1, effN(s, '의무실')));
        if (s.R() < d) { a.alive = false; a.dead = true; a.state = 'dead'; s.stats.deaths++; log(s, `${J(a.name, '이', '가')} ${qn(q)} 의뢰에서 쓰러져 돌아오지 못했습니다.`, 'death', { who: [a.name] }); continue; }
        const wk = Math.max(1, CB.C.injuryWeeks[q.g] - (s.built['의무실'] ? CB.C.injuryClinic : 0) - (hasDeco(s, 'fireplace') ? s.cfg.deco.injury : 0));   // 벽난로 −1주
        a.state = 'injured'; a.until = s.week + wk; a.injuredFrom = q.name || `${GR[q.g]}급 ${QTYPE[q.type]} 의뢰`;   // 모험가 팝업 오버 창용
        log(s, `${J(a.name, '이', '가')} 전투에서 쓰러져 부상을 입었습니다. ${wk}주 동안 쉽니다.`, 'injury', { who: [a.name] });
      }
    }
  }

  function monthly(s) {
    const E = s.cfg.econ, A = s.cfg.adv, T = s.cfg.town, GE = s.cfg.gear;
    s.gold += E.subsidy[s.grade]; s.month.subsidy += E.subsidy[s.grade];
    const inTown = s.advs.filter(a => a.alive && a.state !== 'quest').length;
    s.month.inTown = inTown;   // 주점 매출은 2026-11-12부터 매주 술 1잔 단위 (departures 끝)
    let up = 0; for (const f of Object.keys(s.built)) up += (FAC_COST[f] != null ? E.buildCost[FAC_COST[f]] : 0) * E.upkeepRate;
    s.gold -= up; s.month.upkeep -= up;
    const residents = s.advs.filter(a => a.alive && a.attach >= 100).length;
    s.pop += s.pop * (T.growthBase + T.growthPerGrade * s.grade) + residents * T.perResident;
    for (const a of s.advs) if (a.alive && a.state !== 'quest') a.attach = Math.min(100, a.attach + A.attachPerMonthInTown * 0.5);
    for (const a of s.advs) if (a.alive && a.attach < A.leaveAttach && s.week - a.joined > A.leaveAfterYears * WPY && a.state !== 'quest') { a.alive = false; log(s, `${J(a.name, '이', '가')} 이 마을을 떠났습니다. (애착도 ${Math.round(a.attach)})`, 'leave', { who: [a.name] }); }
    // 새 모험가 방문 수 = 기본 × 신뢰도 보정(0.7~1.3) × 명성 보정(1~1.6)
    const F = s.cfg.fame, lam = A.arrivalPerMonth * (0.7 + 0.6 * s.trust / 100) * (1 + F.maxBonus * Math.min(1, (s.fame || 0) / F.full));
    let k = Math.floor(lam); if (s.R() < lam - k) k++;
    for (let i = 0; i < k && s.advs.filter(x => x.alive).length < advCap(s); i++) spawnAdv(s, {});   // 등급 상한이 차면 새 모험가는 오지 않는다
    for (const a of s.advs) {
      if (!a.alive) continue;
      const ng = Math.min(s.grade, a.gear + 1); if (ng <= a.gear) continue;
      const price = GE.weaponPrice[ng] * GE.setMult;
      if (a.wallet >= price * (1 + GE.reserveMult[a.spend] * 0.5)) { a.wallet -= price; a.gear = ng; log(s, `${J(a.name, '이', '가')} ${GR[ng]}급 장비를 샀습니다. (${Math.round(price)}G)`, 'grow', { who: [a.name] }); }
    }
    proposeClasses(s);
    const net = s.month.fee + s.month.resale + s.month.meal + s.month.tavern + s.month.subsidy + s.month.upkeep + s.month.other;
    s.month.net = net; s.month.grade = s.grade; s.month.feeRate = feeRate(s);
    s.lastMonth = s.month; s.history.push(Object.assign({ week: s.week }, s.month));
    log(s, `${dateLabel(s.week)} 결산: 운영 순이익 ${Math.round(net)}G (의뢰 ${s.month.quests}건, 성공 ${s.month.success}건)`, 'ledger', { net: Math.round(net), nq: s.month.quests, nok: s.month.success });
    s.month = blankLedger();
  }
  const FAC_COST = { 게시판: null, 접수대: null, 주점: null, 판매창구: null, 관리소: 1, 집무실: 0, 훈련장: 2, 창고: 2, 추모실: 2, 정보실: 3, 의무실: 3, 도서관: 3, 해체장: 4, 휴게실: 5, '명예의 전당': 5 };


  // ---------- 길드 로비 배치 (2026-11-12, docs/design/guild_interior.md 10장) ----------
  // 바닥 14×14칸(gx: 오른쪽 벽 쪽, gy: 왼쪽 벽 쪽), 벽 L·R 각 14칸. 놓을 수 있는 칸은 data/lobby_grid.json (tools/lobby_grid_editor.html)
  // 카이로소프트 방식: 종류마다 개수 제한, 옮기기 무료, 파괴는 돈을 돌려받지 않고 지을 수 있는 수만 복구
  const DECO = [
    { id: 'table', name: '테이블 세트', kind: 'table', price: 200, max: 4, desc: '테이블 1 + 의자 2 (2석)' },
    { id: 'plant', name: '화분', kind: 'floor', price: 150, max: 1, img: 'deco_plant', fx: '의뢰 성공 시 애착 +1' },
    { id: 'boardDeco', name: '의뢰 게시판 장식', kind: 'wall', price: 250, max: 1, img: 'deco_crest', fx: '의뢰 성공 시 신뢰도 +1' },
    { id: 'locker', name: '모험가 사물함', kind: 'floor', price: 300, max: 1, img: 'deco_locker', fx: '의뢰 성공 시 기본 소재 +1개' },
    { id: 'banner', name: '길드 현수막', kind: 'wall', price: 350, max: 1, img: 'deco_banner', fx: '의뢰 성공 시 명성 +1' },
    { id: 'bench', name: '의뢰인 대기 벤치', kind: 'floor', price: 400, max: 1, img: 'deco_bench', fx: '의뢰 성공 시 +5G' },
    { id: 'map', name: '낡은 지도', kind: 'wall', price: 400, max: 1, img: 'deco_map', fx: '의뢰 성공 시 경험치 +5' },
    { id: 'fireplace', name: '벽난로', kind: 'fire', price: 500, max: 1, img: 'deco_fireplace', fx: '부상 기간 −1주 (최소 1주)' },
    { id: 'trophy', name: '트로피 장식장', kind: 'floor', price: 650, max: 1, img: 'deco_trophy', fx: '매달 ×2 의뢰 1건 보장' }
  ];
  const DECO_BY = Object.fromEntries(DECO.map(d => [d.id, d]));
  const LN = 14, OLD_TABLES = [[4, 9], [7, 9], [10, 9], [4, 12], [7, 12], [10, 12]];   // 예전 고정 테이블 자리 (예전 저장 옮겨 담기용)
  const grid = () => GD.lobbyGrid || { floor: Array.from({ length: LN }, () => Array(LN).fill(0)), wallL: Array(LN).fill(0), wallR: Array(LN).fill(0) };
  // 물건이 차지하는 칸: 테이블 세트 = 테이블 칸 + 왼쪽 의자(gx−1) + 위쪽 의자(gy−1)
  function cellsOf(id, p) {
    const d = DECO_BY[id]; if (!d || !p) return [];
    if (d.kind === 'wall' || d.kind === 'fire') return [p.wall + p.i];
    return d.kind === 'table' ? [[p.gx, p.gy], [p.gx - 1, p.gy], [p.gx, p.gy - 1]].map(c => c.join(',')) : [p.gx + ',' + p.gy];
  }
  function placeOk(s, id, p, skipUid) {
    const d = DECO_BY[id], G = grid(); if (!d || !p) return false;
    const used = new Set(); for (const it of s.place.items) if (it.uid !== skipUid) cellsOf(it.id, it).forEach(c => used.add(c));
    if (d.kind === 'wall' || d.kind === 'fire') {
      if ((p.wall !== 'L' && p.wall !== 'R') || !(p.i >= 0 && p.i < LN)) return false;
      const v = (p.wall === 'L' ? G.wallL : G.wallR)[p.i];
      return (d.kind === 'fire' ? v === 2 : v === 0) && !used.has(p.wall + p.i);
    }
    for (const c of cellsOf(id, p)) { const [x, y] = c.split(',').map(Number); if (!(x >= 0 && y >= 0 && x < LN && y < LN) || G.floor[y][x] !== 0 || used.has(c)) return false; }
    return true;
  }
  const placedN = (s, id) => s.place.items.filter(it => it.id === id).length;
  function placeBuy(s, id, p) {
    const d = DECO_BY[id]; if (!d) return false;
    if (placedN(s, id) >= d.max) { log(s, `${d.name}은(는) ${d.max}개까지 놓을 수 있습니다.`, 'sys'); return false; }
    if (s.gold < d.price) { log(s, `${d.name} 가격 ${d.price}G가 부족합니다.`, 'sys'); return false; }
    if (!placeOk(s, id, p)) return false;
    const it = Object.assign({ uid: s.place.next++, id }, p.wall ? { wall: p.wall, i: p.i } : { gx: p.gx, gy: p.gy });
    s.place.items.push(it); s.gold -= d.price; s.month.build = (s.month.build || 0) - d.price; (s.month.builds = s.month.builds || []).push({ f: d.name, c: d.price });
    log(s, `${J(d.name, '을', '를')} 놓았습니다. (${d.price}G)`, 'build'); return it;
  }
  function placeMove(s, uid, p) {
    const it = s.place.items.find(x => x.uid === uid); if (!it || !placeOk(s, it.id, p, uid)) return false;
    delete it.gx; delete it.gy; delete it.wall; delete it.i; Object.assign(it, p.wall ? { wall: p.wall, i: p.i } : { gx: p.gx, gy: p.gy }); return true;   // 옮기기는 무료
  }
  function placeDestroy(s, uid) {
    const k = s.place.items.findIndex(x => x.uid === uid); if (k < 0) return false;
    const it = s.place.items.splice(k, 1)[0], d = DECO_BY[it.id]; log(s, `${J(d.name, '을', '를')} 치웠습니다. (돌려받는 돈 없음)`, 'build'); return true;
  }
  const tablesOf = s => s.place.items.filter(it => it.id === 'table').map(it => [it.gx, it.gy]);
  const hasDeco = (s, id) => !!(s.place && s.place.items.some(it => it.id === id));
  const seatsOf = s => 2 * (s.place ? s.place.items.filter(it => it.id === 'table').length : 0);   // 테이블 세트 하나에 2석
  // 검증용 자동 배치 (관문 1·개발 패널): 시뮬레이터 tablePolicy와 같은 규칙. 첫 주 2세트, 이후 월말마다 구매 뒤 1,000G 이상 남으면 1세트씩 4세트까지. 자리는 예전 고정 테이블 칸
  function autoPlace(s, first) {
    const want = first ? 2 : (placedN(s, 'table') < 4 && s.gold - 200 >= 1000 ? 1 : 0);
    for (let k = 0; k < want; k++) { const spot = OLD_TABLES.find(([gx, gy]) => placeOk(s, 'table', { gx, gy })); if (!spot || s.gold < 200 || placedN(s, 'table') >= 4) break; placeBuy(s, 'table', { gx: spot[0], gy: spot[1] }); }
  }
  // 건설비: 등급별 기본값, 집무실만 따로 (2026-11-12: F급 1,000G)
  const facCost = (s, f) => f === '집무실' ? (s.cfg.econ.officeCost || 1000) : s.cfg.econ.buildCost[FAC_COST[f] || 0];
  // 시설 업그레이드 1단계 (2026-11-12, docs/design/popup_fac.md 6장): 지은 시설만, 금전만. 효과는 각 규칙에서 upg(s, 시설)로 확인
  const UPG = ['게시판', '접수대', '주점', '판매창구', '관리소'];
  const upg = (s, f) => !!(s.up && s.up[f]);
  const upgCost = (s, f) => (s.cfg.econ.upgradeCost || [500, 1000])[FAC_COST[f] || 0];
  function upgrade(s, f) {
    if (!UPG.includes(f) || !s.built[f] || upg(s, f)) return false;
    const c = upgCost(s, f); if (s.gold < c) { log(s, `${f} 업그레이드 비용 ${c}G가 부족합니다.`, 'sys'); return false; }
    s.up = s.up || {}; s.up[f] = { at: s.week }; s.gold -= c; s.month.build = (s.month.build || 0) - c; (s.month.builds = s.month.builds || []).push({ f: f + ' 업그레이드', c });
    log(s, `${J(f, '을', '를')} 업그레이드했습니다. (${c}G)`, 'build'); return true;
  }
  function build(s, f) {
    const g = FAC_COST[f]; if (g == null || s.built[f]) return false;
    if (g > s.grade) { log(s, `${J(f, '은', '는')} ${GR[g]}급 길드부터 지을 수 있습니다.`, 'sys'); return false; }
    const c = facCost(s, f); if (s.gold < c) { log(s, `${f} 건설비 ${c}G가 부족합니다.`, 'sys'); return false; }
    s.gold -= c; s.month.build = (s.month.build || 0) - c; (s.month.builds = s.month.builds || []).push({ f, c }); s.built[f] = true; log(s, `${J(f, '을', '를')} 지었습니다. (${c}G)`, 'build'); return true;
  }

  function stepWeek(s) {
    expireQuests(s);
    generateQuests(s);   // 2026-11-12: 매주 게시 (예전에는 매달 초에만 = 월 유입의 1/4만 들어왔음)
    returns(s);
    departures(s);
    s.week++;
    if (s.week % WPM === 0) monthly(s);
  }
  function dateLabel(w) { const y = Math.floor(w / WPY) + 1, m = Math.floor((w % WPY) / WPM) + 1, wk = (w % WPM) + 1; return `${y}년차 ${m}월 ${wk}주`; }

  const api = { autoPlace, hasDeco, seatsOf, DECO, DECO_BY, placeOk, placeBuy, placeMove, placeDestroy, placedN, cellsOf, tablesOf, lobbyGrid: grid, expireWeeks, upgrade, upg, upgCost, facCost, UPG, advCap, CLASS2, CLASS3, ATTACH_TITLE, attachTier, lvCapOf, growthOf, promoOptions, decidePromotion, finalStat, serialize, deserialize, GR, STATS, CLASS1, QTYPE, RISK, SPEND, SOCIAL, WPM, WPY, FAC_COST, newGame, stepWeek, setFilter, withdrawQuest, build, debugSetGrade, successP, questP, isCombat, boardQuota, FILTER_W, FILTER_NAME, filterLevel, openGrades, cook, autoCook, debugKitchen, DISH, dateLabel, boardCap, feeRate, spawnAdv, log };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.GuildGame = api;
})(this);
