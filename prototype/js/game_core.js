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
  const DISH_FX = (e => { const m = /\+\s*(\d+(?:\.\d+)?)%?/.exec(e || ''); if (!m) return { stats: [], pct: 0, val: 0 }; const part = (e || '').slice(0, m.index); return { stats: part.includes('모든 능력치') ? [0, 1, 2, 3, 4] : STATS_.map((n, i) => part.includes(n) ? i : -1).filter(i => i >= 0), pct: +m[1] / 100, val: +m[1] }; });   // '힘·기교 +3' → {stats:[0,4], val:3, pct:0.03} (요리별 능력치 효과 · 2026-11-19 버프: 능력치 +val, 예전 방식은 +pct)
  const QBYID = {}, MAT = {}; if (GD.content) { for (const t of GD.content.quests) QBYID[t.id] = t; for (const m of GD.content.materials) MAT[m.id] = m; }
  // 요리: meals.csv의 메뉴(등급·순서) + 편집기 요리 아이템의 레시피(이름으로 연결)
  const DISH = (GD.meals || []).map(m => { const it = GD.content && GD.content.items.find(i => i.kind === 'food' && i.name === m.name); return Object.assign({ name: m.name, serv: m.serv || 2, g: GR.indexOf(m.grade), mats: it ? (it.recipe || []).map(r => r.m) : [], icon: it ? it.icon : '', effect: (it && it.desc) || m.effect || '' }, DISH_FX((it && it.desc) || m.effect)); })   // 효과 원본 = 소재 편집기 요리 '효과'(desc), 비면 meals.csv.filter(d => d.mats.length);
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
      advs: [], board: [], active: [], nextId: 1, log: [], uidNext: 1, settled: {}, paidMonth: {},   // uidNext · settled · paidMonth: 경제 개편 V2 정산 1회 보장 (원정 번호 → 정산한 주, 월 보수 지급한 달)
      month: blankLedger(), lastMonth: null, history: [],
      stats: { done: 0, fail: 0, combat: 0, combatWin: 0, injuries: 0, deaths: 0, potions: 0 },
      proposals: [], discovered: {}, // 전직 제안 대기열, 발견한 직업 (M3-2)
      knownMats: {}, // 알게 된 소재 id → true. 처음 얻으면 기록 (의뢰 게시판·식당의 ? 실루엣이 풀림)
      mats: {}, dishes: {}, // 가진 소재 id → 개수, 발견한 요리 이름 → 발견한 주 (docs/design/cooking.md)
      ui: { expView: null } // 화면 배치 저장. expView: 원정 미니 뷰 위치 {x, y}(1920×1080 기준 왼쪽 위), null이면 기본 자리
    };
    attachRng(s);
    for (let i = 0; i < cfg.adv.startCount; i++) { let core; if ((cfg.adv || {}).founderWarrior) core = i === 0 ? 0 : 1 + ri(s, 4); spawnAdv(s, { attach: 20, quiet: true, home: true, core }); }   // 창립 멤버: 늘 길드에 머묾 (2026-11-16) · 2026-11-18 결정 33: 첫 모험가는 전사(튜토리얼에서 오는 첫 모험가), 나머지는 전사 외 무작위 (adv.founderWarrior 0이면 예전처럼 무작위)
    if ((s.cfg.adv || {}).founderMix !== 0) { const f = s.advs.filter(a => a.home); if (f.length >= 2 && f.every(a => a.risk === 0)) f[1].risk = 1; }   // 2026-11-17 의뢰 0건 판 대책 ① (adv.founderMix 0이면 끔): 창립 2명이 둘 다 신중이면 2번째를 보통으로 (economy_v2_zero_quest.md)
    initHouses(s);   // 2026-11-13 시작 인구만큼 초가
    log(s, '길드가 문을 열었습니다. 모험가 ' + cfg.adv.startCount + '명이 첫 손님으로 찾아왔습니다.', 'guild');
    return s;
  }
  function hasBatchim(w) { const c = w.charCodeAt(w.length - 1); return c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 !== 0; }
  function J(w, a, b) { return w + (hasBatchim(w) ? a : b); }
  const names = party => party.map(m => m.name).join('·');
  function blankLedger() { return { shop: 0, gift: 0, order: 0, matBuy: 0, consign: 0, cpay: 0, csup: 0, fee: 0, resale: 0, meal: 0, tavern: 0, subsidy: 0, upkeep: 0, other: 0, reqIn: 0, scout: 0, quests: 0, success: 0, popAdd: 0, build: 0, dishes: {}, wd: [], builds: [], inTown: 0 }; }   // build·dishes·wd·builds·inTown: 장부 화면 내역용 (운영 순이익 net에는 건설비를 넣지 않음 = 관문 1 기준)
  const ri = (s, n) => Math.floor(s.R() * n);
  // 기록용 의뢰 이름: 편집기에서 지은 이름이 있으면 「이름」, 기본 이름(○○ F급 의뢰)이면 등급·유형
  function qn(q) { return q.name && !/급 의뢰/.test(q.name) ? `${GR[q.g]}급 「${q.name}」` : `${GR[q.g]}급 ${QTYPE[q.type]}`; }
  // 도감: 의뢰를 다녀오면(성공·실패 모두) 그 의뢰의 몬스터를 만난 것으로 기록
  function seeMons(s, q) {
    s.seenMons = s.seenMons || {}; const T = QBYID[q.tid] || (q.rq ? { enemies: q.enemies } : null); if (!T) return;
    for (const e of T.enemies || []) if (e.mon && !s.seenMons[e.mon]) { s.seenMons[e.mon] = s.week; log(s, `처음 보는 몬스터를 만났습니다: ${e.name || e.mon}`, 'unlock'); }
  }
  function log(s, text, kind, extra) { s.log.unshift(Object.assign({ week: s.week, text, kind: kind || 'info' }, extra || {})); if (s.log.length > 600) s.log.pop(); }   // 기록 600개 = 약 2년치 (길드 기록 팝업)
  const effN = (s, f) => s.eff[f] || 0;
  const popStage = s => { let k = 0; for (const t of s.cfg.town.stages) if (s.pop >= t) k++; return k; };
  // ---------- 마을 민가 · 인구 (2026-11-13 docs/design/town_houses_v1.md) ----------
  // 집 수는 인구가 정함: 인구가 지금 집들의 수용 합을 넘으면 해금된 민가 자리에 1레벨(초가) 집이 생김.
  // 집은 매달 오래된 집부터 upgradePerMonth채가 한 레벨씩 오름(지은 뒤 upgradeWait개월, 상한 = 마을 단계 1~5). 1×2 자리는 2레벨(목조)부터 2칸.
  const HOUSE_SLOTS = (GD.townHouses || []).map(r => ({ id: r[0], gx: r[1], gy: r[2], w: r[3], d: r[4], st: r[5], c: r[6] }));
  const houseCap = (T, h) => T.houseCap[h.lv - 1] * (h.size === 2 && h.lv >= 2 ? 2 : 1);
  const housingCap = s => (s.houses || []).reduce((t, h) => t + houseCap(s.cfg.town, h), 0);
  function addHouses(s, need) {   // need 명을 담을 때까지 해금된 자리에 초가를 지음. 지은 수를 돌려줌
    const T = s.cfg.town, st = popStage(s) + 1; let cap = housingCap(s), n = 0;
    while (cap < need && s.houses.length < HOUSE_SLOTS.length && HOUSE_SLOTS[s.houses.length].st <= st) {
      const sl = HOUSE_SLOTS[s.houses.length], h = { slot: sl.id, size: sl.w * sl.d, lv: 1, age: 0 };
      s.houses.push(h); cap += houseCap(T, h); n++;
    }
    return n;
  }
  function initHouses(s) { s.houses = []; if (HOUSE_SLOTS.length) addHouses(s, s.pop); }
  const LV_NAME = ['초가', '목조 집', '회반죽 집', '2층 회반죽 집', '석조 집'];
  function townMonthly(s) {
    const T = s.cfg.town; if (!s.houses) initHouses(s);
    const st = popStage(s) + 1; let up = 0, upCap = 0;
    for (const h of s.houses) {   // 오래된 집부터 (s.houses는 지은 순서)
      if (up >= T.upgradePerMonth) break;
      if (h.lv < st && h.age >= T.upgradeWait) { const c0 = houseCap(T, h); h.lv++; h.age = 0; up++; upCap += houseCap(T, h) - c0; }
    }
    for (const h of s.houses) h.age++;
    const residents = s.advs.filter(a => a.alive && a.attach >= T.residentAttach).length;
    const want = s.pop + T.baseAdd + (s.month.popAdd || 0) + residents * T.perResident;
    const built = HOUSE_SLOTS.length ? addHouses(s, want) : 0;
    const cap = HOUSE_SLOTS.length ? housingCap(s) : Infinity;
    const wasFull = !!s.housingFull; s.housingFull = want > cap; s.pop = Math.min(want, cap);
    if (s.housingFull && !wasFull) log(s, `마을에 집이 부족해 인구가 ${Math.round(s.pop)}명에서 더 늘지 않습니다. 집이 고쳐 지어지거나 마을 단계가 오르면 다시 늘어납니다.`, 'town');   // 2026-11-17 주거지 부족 안내 (처음 부족해질 때 한 번)
    if (up) log(s, `마을 집 ${up}채를 고쳐 지었습니다. (주거 +${upCap}명 · 지금 마을에서는 ${LV_NAME[Math.min(4, st - 1)]}까지)`, 'town');
    if (built) log(s, `마을에 새 집이 ${built}채 생겼습니다. (인구 ${Math.round(s.pop)}명 · 집 ${s.houses.length}채)`, 'town');
  }
  const feeRate = s => s.cfg.econ.feeBase + s.cfg.econ.feePerInfo * effN(s, '정보실');
  // 2026-11-17 경제 개편 V2 결정 8: 정수 배분. 1인 몫 = 총액 ÷ 인원의 몫, 나머지는 파티 슬롯 순서(대장 먼저)로 1G씩. 길드 몫 = 1인 몫 × 각자 요율, 버림. 합계는 늘 총액
  function econSplit(total, rates) {
    total = Math.max(0, Math.floor(total)); const n = rates.length; if (!n) return { base: [], fee: [], net: [], guild: 0 };
    const b0 = Math.floor(total / n), r = total - b0 * n, base = rates.map((_, i) => b0 + (i < r ? 1 : 0));
    const fee = base.map((b, i) => Math.floor(b * rates[i] + 1e-9)), net = base.map((b, i) => b - fee[i]);
    return { base, fee, net, guild: fee.reduce((x, y) => x + y, 0) };
  }
  // 2026-11-17 경제 개편 V2 결정 11 (5단계): 의뢰별 수수료. 의뢰에 붙은 수수료 → 등급 칸 수수료 → 기본 수수료 순. 선택지 10 · 15 · 20% [임시], 15% = 집무실 · 20% = 게시판 업그레이드 뒤
  const questFee = (s, q) => q && q.fee != null ? q.fee : q && s.gradeFee && s.gradeFee[q.g] != null ? s.gradeFee[q.g] : feeRate(s);
  const rateOf = (s, a, q) => a.contract ? a.contract.rate : questFee(s, q);   // 개인 수수료: 계약 모험가 = 계약 수수료, 자유 = 그 의뢰의 수수료
  const feeBase0 = s => s.cfg.econ.feeBase != null ? s.cfg.econ.feeBase : 0.1;
  function feeOptions(s) { const O = s.cfg.econ.feeOpt || [0.1, 0.15, 0.2], b = feeBase0(s); return O.filter(r => r <= b + 1e-9 || (r < 0.2 - 1e-9 ? !!s.built['집무실'] : upg(s, '게시판'))); }   // 2026-11-19 결정 42: 기본(10%) 이하(5%)는 처음부터 · 15% = 집무실 · 20% = 게시판 업그레이드
  const feeLock = (s, r) => r <= feeBase0(s) + 1e-9 ? '' : r < 0.2 - 1e-9 ? '집무실을 지으면 열립니다' : '게시판 업그레이드 뒤 열립니다';
  const feeOk = (s, r) => feeOptions(s).some(x => Math.abs(x - r) < 1e-9);
  function setGradeFee(s, g, r) { if (!feeOk(s, r)) return false; (s.gradeFee = s.gradeFee || [null, null, null, null, null, null, null])[g] = r; return true; }   // 새로 출발하는 의뢰부터 (출발한 의뢰는 출발 때 요율, E5-2)
  function setQuestFee(s, qid, r) { const q = s.board.find(x => x.id === qid); if (!q || !feeOk(s, r)) return false; q.fee = r; return true; }
  // 모험가가 의뢰를 고르는 순서 (결정 11): 돈이 필요한 모험가는 주당 실수령(혼자 간다고 볼 때) 높은 순, 아니면 지금처럼 등급 높은 순 + 같은 등급이면 요율 낮은 순
  function needsMoney(s, a) { const GE = s.cfg.gear; if (a.spend === 2) return true; const n = eqNext(s, a); if (!n) return false; return a.wallet < n.price * (1 + GE.reserveMult[a.spend] * 0.5); }   // 2026-11-18: 다음 장비 1칸 값 기준
  // 2026-11-18 결정 25: 발주 소재가 나오는 의뢰는 '주우면 받는 발주 값 × 나올 확률'만큼 실수령을 더 크게 봄
  const orderBonus = (s, q) => { const O = s.orders, T = QBYID[q.tid]; if (!O || !O.length || !T) return 0; let b = 0; for (const r of T.rewards || []) { const o = r.p >= 30 && O.find(x => x.m === r.m && orderLive(s, x)); if (o) b += orderPriceOf(s, o) * r.p / 100;   /* 양념(희귀) 발주는 모든 F급 의뢰에 붙으므로 의뢰 고르기에는 넣지 않음 */ } return b; };
  const questEff = (s, q) => (Math.floor(q.reward * (q.x2 ? 2 : 1) * (1 - questFee(s, q)) + 1e-9) + orderBonus(s, q)) / (q.weeks || s.cfg.quest.weeks[q.g]);
  function lowBuySkip(s, q) { const T = QBYID[q.tid]; if (!T) return 0; const main = (T.rewards || []).reduce((b, r) => (!b || r.p > b.p ? r : b), null); if (!main) return 0; const p = matPol(s, main.m); if (p.mode !== 'buy') return 0; const r = polRate(s, main.m), b = s.cfg.econ.matBuyRate != null ? s.cfg.econ.matBuyRate : 0.7; return r < b - 1e-9 ? Math.min(1, (b - r) / 0.2 * (s.cfg.econ.lowBuyK != null ? s.cfg.econ.lowBuyK : 0.25)) : 0; }
  const ordHit = (s, q) => (s.cfg.econ.orderFirst || !s.cfg.econ.orderMode) && orderBonus(s, q) > 0 ? 1 : 0;   /* 2026-11-19 상시 발주는 늘 켜져 있어 '가장 먼저 맡음'을 끄고 발주 값(실수령)으로만 끌림 [임시] */   /* 2026-11-18 결정 26: 발주한 소재가 나오는 의뢰를 가장 먼저 맡음 */
  const cheapHit = (s, q) => questFee(s, q) < feeBase0(s) - 1e-9 ? 1 : 0;   /* 2026-11-19 결정 42: 기본보다 싼 수수료(5%) 의뢰는 모든 모험가가 먼저 맡음 → 빨리 처리 */
  // 2026-11-19 결정 42: 의뢰 카드의 예상 처리 주 (같은 등급에서 먼저 맡힐 의뢰 수 ÷ 마을에 있는 모험가 수, 기본보다 비싸면 +1주, 최대 4)
  function questEta(s, q) { const idle = s.advs.filter(a => a.alive && a.state === 'town').length, fq = questFee(s, q), cq = cheapHit(s, q);
    const ahead = s.board.filter(x => x !== q && x.g === q.g && (cheapHit(s, x) > cq || (cheapHit(s, x) === cq && (questFee(s, x) < fq - 1e-9 || (Math.abs(questFee(s, x) - fq) < 1e-9 && x.posted < q.posted))))).length;
    return Math.min(4, 1 + Math.floor(ahead / Math.max(1, idle)) + (fq > feeBase0(s) + 1e-9 ? 1 : 0)); }
  const pickOrder = (s, a) => needsMoney(s, a) ? (x, y) => (ordHit(s, y) - ordHit(s, x)) || (cheapHit(s, y) - cheapHit(s, x)) || (questEff(s, y) - questEff(s, x)) || (y.g - x.g) : (x, y) => (ordHit(s, y) - ordHit(s, x)) || (cheapHit(s, y) - cheapHit(s, x)) || (y.g - x.g) || (questFee(s, x) - questFee(s, y));
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
      risk: ri(s, 3), spend: ri(s, 3), social: ri(s, 3), wallet: 0, gear: -1, eq: [-1, -1, -1], pots: 0, home: !!o.home, contract: null,   // contract: 계약 모험가 조건 (경제 개편 V2 2단계에서 채움, null = 자유 모험가)
      state: 'away', until: 0, joined: s.week, alive: true, done: 0,
      cls1: CLASS1[core], line: [core], fin: false, promoCool: 0, skills: [{ line: core, form: CLASS1[core] }], career: [{ week: s.week, text: '길드에 처음 옴' }]
    };
    s.advs.push(a);
    if (!o.quiet) log(s, `${a.cls} ${J(a.name, '이', '가')} 길드를 처음 찾아왔습니다.`, 'arrive', { who: [a.name] });
    return a;
  }

  // ---------- 장비 3칸 (2026-11-18 대장간 결정: 무기 · 방어구 · 장신구를 따로 삼) ----------
  const EQ_NAME = ['무기', '방어구', '장신구'];
  const eqOf = a => Array.isArray(a.eq) ? a.eq : (g => [g, g, g])(a.gear == null ? -1 : a.gear);
  const eqOrder = a => a.core === 0 || a.core === 3 ? [1, 0, 2] : [0, 1, 2];   // 사는 순서: 앞에 서는 전사 · 성직자는 방어구부터, 나머지는 무기부터, 장신구는 마지막
  function setEq(a, k, g) { const e = eqOf(a).slice(); e[k] = g; a.eq = e; a.gear = Math.min(...e); }   // a.gear = 가장 낮은 칸 (예전 코드 · 도구 호환)
  function eqNext(s, a) {   // 다음에 살 칸: 가장 낮은 칸부터, 같으면 eqOrder 순 → { k, g, price } 또는 null(길드 등급까지 다 참)
    const e = eqOf(a), GE = s.cfg.gear; let best = null;
    if (GE.pieceBuy === 0) { const lo = Math.min(...e), g = Math.min(s.grade, lo + 1); return g <= lo ? null : { k: -1, g, price: GE.weaponPrice[g] * GE.setMult }; }   // gear.pieceBuy 0 = 예전처럼 한 벌(세 칸)을 한꺼번에
    for (const k of eqOrder(a)) { const g = Math.min(s.grade, e[k] + 1); if (g <= e[k]) continue; if (!best || e[k] < e[best.k]) best = { k, g, price: GE.weaponPrice[g] }; }
    return best;
  }
  function finalStat(s, a, i) {
    const GE = s.cfg.gear; let v = Math.min(s.cfg.growth.statCap, a.stats[i]);
    { const e = eqOf(a); if (i === a.core) v += (e[0] >= 0 ? GE.weaponStat[e[0]] : 0) + (e[2] >= 0 ? GE.accStat[e[2]] : 0); }   // 장신구 칸: 주력 능력치 +3 × 등급 순번   // 장신구: 주력 능력치 +3×등급 순번 (직업 제한 없는 장신구를 주력에 맞게 착용한다고 봄)
    return v;
  }
  // ---------- 모험가 기억 · 친밀도 (2026-11-18, docs/design/proposal_adv_memory_v1.md 2장) ----------
  //   대사 고르기 전용 기록. 규칙 · 난수(s.R)에 영향 없음 → 관문 1 · 시뮬레이터 그대로.
  //   a.mem = 최근 일 [{ k: 종류, w: 주, n: 말한 횟수, …빈칸 재료 }] 최대 5개 · 8주 지나면 흐려짐 · 2번 말하면 지움 [임시]
  //   종류: win_big(어려운 의뢰 성공) · fail(실패, late=늦장) · hurt(부상) · saved(구해 줌 got/gave) · gift(마스터 선물) · grow(레벨 5단위 · 승급 · 전직) · nomin(지명 수락 · 거절) · qlv(하던 의뢰가 Lv업)
  //   s.rel["작은id-큰id"] = 친밀도 0~100 (처음 40, 숨김) — 같은 파티 성공 +2~+7(성향 궁합, 기본 +5) · 실패 −3 · 로비 대화 주 1번 +1 [임시]
  const MEM = { max: 5, weeks: 8, say: 2, hard: 75, relStart: 40, relWin: 5, relFail: -3 };   // [임시] 친밀도: 처음 40 · 같은 파티 성공 +5(궁합 ±) · 실패 −3
  function remember(s, a, k, o) {
    if (!a || !a.alive) return;
    const m = Object.assign({ k, w: s.week, n: 0 }, o || {});
    a.mem = (a.mem || []).filter(x => s.week - x.w < MEM.weeks); a.mem.push(m); if (a.mem.length > MEM.max) a.mem.shift();
    s.memN = s.memN || {}; s.memN[k] = (s.memN[k] || 0) + 1;
  }
  const memOf = (s, a) => (a && a.mem || []).filter(x => s.week - x.w < MEM.weeks && x.n < MEM.say);   // 지금 말할 수 있는 기억
  function memSaid(a, m) { m.n++; if (m.n >= MEM.say) a.mem = (a.mem || []).filter(x => x !== m); }
  const relKey = (i, j) => i < j ? i + '-' + j : j + '-' + i;
  const relBase = (s, i, j) => { const a = s.advs.find(x => x.id === i), b = s.advs.find(x => x.id === j); if (!a || !b) return MEM.relStart; let v = MEM.relStart; if (Math.abs(a.risk - b.risk) === 2) v -= 15; if (a.social === 2 && b.social === 2) v += 10; if (a.social === 0 || b.social === 0) v -= 10; return v; };   // 처음 친밀도 = 성향 궁합 (무모 · 신중 −15 · 둘 다 사교적 +10 · 독불장군 −10) [임시]
  const relOf = (s, i, j) => { const v = s.rel && s.rel[relKey(i, j)]; return v == null ? relBase(s, i, j) : v; };
  function relAdd(s, i, j, d) { if (i === j) return; s.rel = s.rel || {}; const k = relKey(i, j); s.rel[k] = Math.max(0, Math.min(100, relOf(s, i, j) + d)); }
  const relStep = (a, b) => { let d = MEM.relWin; if (Math.abs(a.risk - b.risk) === 2) d -= 2; if (a.social === 2 && b.social === 2) d += 1; if (a.social === 0 || b.social === 0) d -= 1; return Math.max(2, Math.min(7, d)); };   // 성향 궁합 (제안서 3-1)
  const relTier = v => v >= 70 ? 'good' : v < 30 ? 'bad' : '';
  function memQuest(s, x, ok, party, lv0) {   // 귀환 때: 파티원마다 기억 · 친밀도
    const q = x.q, F = x.fight, qname = q.name || qn(q), mon = F && F.enemies && F.enemies[0] ? F.enemies[0].name : null;
    const ids = party.filter(Boolean).map(a => a.id), others = id => ids.filter(j => j !== id);
    for (const a of party) {
      if (!a) continue;
      if (ok && !q.rq && ((x.rate != null && x.rate < MEM.hard) || q.fz)) remember(s, a, 'win_big', { q: qname, mon, with: others(a.id), rate: x.rate, fz: !!q.fz });   // fz: 막 강해진(정보 흐린) 의뢰를 해냄
      if (!ok) remember(s, a, 'fail', { q: qname, mon, with: others(a.id), late: !!x.late });
      if (F) { const u = F.units.find(z => z.id === a.id); if (u && u.down && a.alive && a.state === 'injured') remember(s, a, 'hurt', { q: qname, mon, weeks: Math.max(1, a.until - s.week), with: others(a.id) }); }
    }
    if (F && F.log) {   // 쓰러질 뻔한 동료를 치유 (치유 전 체력 30% 미만) → 받은 사람 got · 준 사람 gave, 원정마다 한 쌍 한 번
      const seen = {};
      for (const e of F.log) {
        if (e.t !== 'heal' || e.by === e.to) continue;
        const u = F.units.find(z => z.id === e.to); if (!u || e.hp == null || e.d == null || (e.hp - e.d) >= u.maxHp * 0.3) continue;
        const key = e.by + '>' + e.to; if (seen[key]) continue; seen[key] = 1;
        const by = s.advs.find(z => z.id === e.by), to = s.advs.find(z => z.id === e.to);
        remember(s, to, 'saved', { q: qname, with: [e.by], role: 'got' }); remember(s, by, 'saved', { q: qname, with: [e.to], role: 'gave' });
      }
    }
    if (lv0 != null && s.qlv && s.qlv[q.tid] && s.qlv[q.tid].lv > lv0) for (const a of party) remember(s, a, 'qlv', { q: qname, lv: s.qlv[q.tid].lv, mon });
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) { const a = party[i], b = party[j]; if (a && b) relAdd(s, a.id, b.id, ok ? relStep(a, b) : MEM.relFail); }
  }

  // 의뢰 레벨 (2026-11-18 결정 35 D안): 같은 게시판 의뢰를 qlv.need번 성공하면 Lv+1 (상한 qlv.max). 레벨당 적 · 판정 +foe, 보상 금화 · 소재 +pay.
  //   레벨이 막 오르면 그 의뢰가 qlv.fresh번 끝날 때까지 적 정보 오차가 qlv.var로 커짐 ("들개가 늘었다는데 몇 마리인지는 몰라요")
  const QLV = s => { const L = s.cfg.qlv; return L && L.on ? L : null; };
  function qlvOf(s, id) { s.qlv = s.qlv || {}; return s.qlv[id] || (s.qlv[id] = { lv: 1, wins: 0, fresh: 0 }); }
  // ---------- V4 3단계 (결정 44): 사냥터 · 채집지 개체수 ----------
  // 자원지 = 게시판 의뢰 틀의 주 소재(가장 잘 나오는 소재). 0~100, 시작 popStart. 그 소재를 1개 가져올 때마다 −popTake, 매주 +popRegen.
  // popLow 미만: 그 의뢰가 덜 올라옴(popLowBoard 확률로 다른 의뢰로) · 뽑기 수 절반 · 비전투 판정 기준 +popLowJudge · 의뢰 레벨이 오르지 않음
  // popHigh 넘음(전투 의뢰의 자원지 = 몬스터): 매주 인구 증가 −popHighTown (밭 · 가축 피해), 달마다 한 번 알림 [모두 임시]
  const resOn = s => !!(s.cfg.econ.popOn);
  const RES_G = {};   // 자원지 → 그 소재가 나오는 가장 낮은 의뢰 등급 (길드 등급보다 높으면 아직 갈 수 없는 곳이라 개체수가 움직이지 않음)
  const baseMatOf = T => T ? ((T.rewards || []).reduce((b, r) => (!b || r.p > b.p ? r : b), null) || {}).m : null;
  const RES_IDS = (() => { const o = {}; for (const k in TPL) for (const t of TPL[k]) { const m = baseMatOf(t), g = +k.split('_')[1]; if (m) o[m] = o[m] || !!(t.enemies && t.enemies.length); if (m) RES_G[m] = Math.min(RES_G[m] != null ? RES_G[m] : 9, g); } return o; })();   // 자원지 → 몬스터(사냥형) 여부
  const resOf = (s, m) => { if (!resOn(s) || !(m in RES_IDS)) return null; const R = s.res = s.res || {}; if (R[m] == null) R[m] = s.cfg.econ.popStart != null ? s.cfg.econ.popStart : 60; return R[m]; };
  const resLow = (s, m) => { const v = resOf(s, m); return v != null && v < (s.cfg.econ.popLow || 30); };
  const resBand = (s, m) => { const v = resOf(s, m); if (v == null || RES_G[m] > s.grade) return null; return v < (s.cfg.econ.popLow || 30) ? 0 : v > (s.cfg.econ.popHigh || 80) ? 2 : 1; };   // 0 적음 · 1 보통 · 2 많음 (화면은 숫자 숨김)
  function resTake(s, m, n) { if (resOf(s, m) == null) return; s.res[m] = Math.max(0, s.res[m] - (s.cfg.econ.popTake != null ? s.cfg.econ.popTake : 3) * n); }
  function resWeekly(s) {
    if (!resOn(s)) return; const E = s.cfg.econ, hi = E.popHigh || 85, rg = E.popRegen != null ? E.popRegen : 0.12;
    let worst = null;
    for (const m in RES_IDS) { if (RES_G[m] > s.grade) continue; const v = Math.max(1, resOf(s, m)); s.res[m] = Math.min(100, v + rg * v * (1 - v / 100));   // 로지스틱 회복: 많을수록 천천히 참 (내버려 두면 100에 가까워짐) · 아직 갈 수 없는 등급의 자원지는 그대로
      if (RES_IDS[m] && s.res[m] > hi && (!worst || s.res[m] > s.res[worst])) worst = m; }
    if (worst && s.week % WPM === WPM - 1) { s.month.popAdd = (s.month.popAdd || 0) - (E.popHighTown != null ? E.popHighTown : 2); s.month.resHarm = (s.month.resHarm || 0) + 1;   // 달마다 가장 넘친 몬스터 사냥터 한 곳만 피해
      const mt = MAT[worst]; log(s, `${mt ? mt.name : '짐승'}이 나오는 사냥터에 짐승이 너무 많아졌습니다. 밭과 가축이 피해를 입어 이번 달 마을이 덜 늘어납니다.`, 'town'); }
  }
  function qlvAfter(s, q, ok) {   // 귀환 때: 정보 오차 남은 수 줄이고, 성공이면 레벨 셈
    const L = QLV(s); if (!L || !q.tid || q.rq || !s.qlv || !s.qlv[q.tid]) return;
    const V = s.qlv[q.tid]; if (q.fz && V.fresh > 0) V.fresh--;
    if (ok && resLow(s, baseMatOf(QBYID[q.tid]))) ok = false;   // 결정 44: 개체수가 적을 때는 레벨이 오르지 않음 (승수도 세지 않음)
    if (ok && V.lv < L.max && ++V.wins >= L.need) { V.lv++; V.wins = 0; V.fresh = L.fresh; { const nm = q.name || '의뢰'; log(s, `「${nm}」${J(nm, '이', '가').slice(nm.length)} Lv${V.lv}로 올랐습니다. 상대가 강해진 대신 보상이 늘었습니다. (한동안 적 정보가 부정확)`, 'unlock'); } }
  }
  function makeQuest(s, g, force) {   // force: 템플릿 id (튜토리얼에서 정해진 의뢰를 올릴 때)
    const FT = force ? (() => { for (const k in TPL) for (const t of TPL[k]) if (t.id === force) return t; return null; })() : null;
    const Q = s.cfg.quest; const type = FT ? FT.type : ri(s, 5); const n = Q.reqCount[g]; const req = [type];
    while (req.length < n) { const k = ri(s, 5); if (!req.includes(k)) req.push(k); }
    let C = FT ? [FT] : TPL[type + '_' + g];
    if (!FT) { const O = liveOrders(s).filter(o => !SPICE.has(o.m)), B = O.length ? Math.max(...O.map(o => orderBiasOf(s, o))) : 0, DUP = s.cfg.econ.orderDup || 2;   // 2026-11-19 결정 41: 켜진 상시 발주 중 가장 센 쏠림 · 양념 발주는 게시판 쏠림 없음(모든 F급 의뢰에서 나옴) · 같은 의뢰는 DUP장까지만   // 2026-11-18 결정 26: 발주 중에는 새 의뢰의 orderBias [임시] 비율이 그 소재를 얻는 의뢰로 바뀜 (발주가 없으면 난수를 쓰지 않아 예전과 같은 결과)
      if (B > 0 && O && O.length && s.R() < B) { const W = []; for (const k in TPL) if (k.endsWith('_' + g)) for (const t of TPL[k]) if ((t.rewards || []).some(r => r.p >= 30 && O.some(o => o.m === r.m)) && s.board.filter(x => x.tid === t.id).length < DUP && !(resLow(s, baseMatOf(t)) && s.R() < (s.cfg.econ.popLowBoard != null ? s.cfg.econ.popLowBoard : 0.5))) W.push(t); /* 결정 44: 개체수가 적으면 발주 쏠림도 약해짐 */ if (W.length) C = [W[Math.floor(s.R() * W.length)]]; } }
    let T = !C ? null : C.length > 1 ? C[Math.floor(s.R() * C.length)] : C[0];   // 후보 1개면 난수를 쓰지 않아 예전과 같은 결과
    if (!FT && T && resLow(s, baseMatOf(T)) && s.R() < (s.cfg.econ.popLowBoard != null ? s.cfg.econ.popLowBoard : 0.5)) { const W = []; for (const k in TPL) if (k.endsWith('_' + g)) for (const t of TPL[k]) if (!resLow(s, baseMatOf(t))) W.push(t); if (W.length) T = W[Math.floor(s.R() * W.length)]; }   // 결정 44: 개체수가 적은 의뢰는 다른 의뢰로
    const QL = QLV(s), LV = QL && T && T.board ? qlvOf(s, T.id) : null, lv = LV ? LV.lv : 1;   // 의뢰 레벨 (결정 35)
    const DF = ((Q.diff || [])[g] || 1) * (QL ? 1 + QL.foe * (lv - 1) : 1);   // 난이도 배수 (2026-11-16): 판정 기준치와 적 체력 · 공격력에 곱함 · 의뢰 레벨 배수
    const R0 = (T ? T.ref : Q.ref[g]) * n * (0.85 + s.R() * 0.30) * DF * (T && resLow(s, baseMatOf(T)) ? 1 + (s.cfg.econ.popLowJudge != null ? s.cfg.econ.popLowJudge : 0.15) : 1);   // 결정 44: 개체수가 적으면 흔적 찾기가 어려움(판정 기준 +15%)
    const q = { id: s.nextId++, g, type: T && T.type >= 0 ? T.type : type, req: T && T.stats && T.stats.length ? T.stats.slice() : req, r: R0 / n, reward: (T ? T.reward : Q.reward[g]) * (QL ? 1 + QL.pay * (lv - 1) : 1), posted: s.week };
    if (LV) { q.lv = lv; if (LV.fresh > 0) q.fz = true; }
    if (T) Object.assign(q, { tid: T.id, name: T.name, weeks: T.weeks, fameS: T.fameS, fameF: T.fameF, trustS: T.trustS, trustF: T.trustF, death: T.death });
    if (COMBAT && T && T.enemies && T.enemies.length) {
      // 개체 차이: 실제 적은 게시 정보보다 강하거나 약할 수 있음(±enemyVar). 모험가는 게시 정보(seen)로 판단, 정보실이 있으면 실제에 가까워짐
      const f0 = 1 + (s.R() * 2 - 1) * (q.fz ? QL.var : (CB.C.enemyVar || 0)), f = f0 * DF, look = Math.min(1, 0.25 * effN(s, '정보실'));
      q.enemies = []; q.seen = []; q.foe = f0 * ((Q.diff || [])[g] || 1);   // 강약 표시(▲▼)는 개체 차이만 (의뢰 레벨 배수 제외)
      for (const e of T.enemies) for (let k = 0; k < e.count; k++) {
        q.enemies.push({ hp: e.hp * f, atk: e.atk * f, def: e.def || 0, name: e.name, mon: e.mon, boss: !!e.boss });
        q.seen.push({ hp: e.hp * DF * (1 + (f0 - 1) * look), atk: e.atk * DF * (1 + (f0 - 1) * look), def: e.def || 0, name: e.name, boss: !!e.boss });
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
  const unitOf = (s, a, mealB, sm) => CB.unit(a, i => finalStat(s, a, i) * (sm ? sm(a, i) : 1), eqOf(a), mealB);
  // 예상 성공 확률: 전투 의뢰는 예측 전투(게시 정보 기준), 비전투 의뢰는 능력치 판정
  function questP(s, party, q) { return isCombat(q) ? CB.predict(party.map(a => unitOf(s, a, 0)), q.seen, q.g, party[0].risk) : successP(s, party, q); }
  function perceived(s, a, p) { const err = Math.max(0, 0.10 - 0.02 * effN(s, '정보실')); return Math.min(1, p * [0.9, 1.0, 1.2][a.risk] + (s.R() * 2 - 1) * err); }

  function gainXp(s, a, xp) {
    const G = s.cfg.growth; a.xp += xp;
    for (;;) {
      const need = G.lvA * Math.pow(a.lv, G.lvB);
      if (a.xp < need) break;
      if (a.lv >= lvCapOf(s, a)) { a.bank += a.xp; a.xp = 0; break; }
      a.xp -= need; a.lv++; if (a.lv % 5 === 0) remember(s, a, 'grow', { what: 'lv', lv: a.lv });
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
      a.grade = n; a.ach = 0; if (a.career) a.career.push({ week: s.week, text: `${GR[n]}급 모험가로 승급` }); remember(s, a, 'grow', { what: 'grade', g: GR[n] }); log(s, `${J(a.name, '이', '가')} ${GR[n]}급 모험가가 되었습니다.`, 'grow', { who: [a.name], gup: { id: a.id, g: n, bonus: gb } }); }   // gup: 축하 팝업용
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
    a.career.push({ week: s.week, text: `${from} → ${name} 전직` }); remember(s, a, 'grow', { what: 'class', cls: name });
    const lastJ = (name.charCodeAt(name.length - 1) - 0xac00) % 28; // ㄹ 받침(8)이거나 받침이 없으면 '로'
    log(s, `${J(a.name, '이', '가')} ${name}${lastJ === 0 || lastJ === 8 ? '로' : '으로'} 전직했습니다!`, 'promo', { who: [a.name], done: true });
    const bank = a.bank; a.bank = 0; if (bank > 0) gainXp(s, a, bank); // 상한에 막혀 쌓아 둔 경험치 반영
  }
  // 예전 저장 데이터 보정
  function migrate(s) {
    s.proposals = s.proposals || []; s.discovered = s.discovered || {}; s.knownMats = s.knownMats || {}; s.seenMons = s.seenMons || {}; if (s.fame == null) s.fame = 0;
    s.mats = s.mats || {}; s.up = s.up || {};
    if (!s.houses) initHouses(s);   // 2026-11-13 민가 도입 전 저장: 지금 인구로 초가를 지어 줌
    if (!s.unlock && s.place) {   // 2026-11-13 설비 해금 도입 전 저장: 이미 놓은 테이블 수 · 장식은 열린 것으로 둠
      const nt = s.place.items.filter(it => it.id === 'table').length; s.unlock = { table: Math.max(2, Math.min(4, nt)), deco: {} };
      for (const it of s.place.items) if (it.id !== 'table') s.unlock.deco[it.id] = true;
    }
    if (!s.place) {   // 2026-11-12 자유 배치 도입 전 저장: 그때 있던 테이블(등급별 2·3·4세트)을 예전 자리에 무료로 놓아 줌
      s.place = { items: [], next: 1 }; const n = 2 + (s.grade >= 1 ? 1 : 0) + (s.grade >= 2 ? 1 : 0);
      for (const [gx, gy] of OLD_TABLES.slice(0, n)) s.place.items.push({ uid: s.place.next++, id: 'table', gx, gy });
    }
    if (!s.expireV) { s.expireV = 1; for (const q of s.board || []) q.posted = s.week; }   // 2026-11-12 의뢰 기한 도입 전 저장: 게시판 의뢰가 한꺼번에 만료되지 않게 기한을 새로 시작
    if (!s.dishes) { s.dishes = {}; for (let g = 0; g < 7; g++) DISH.filter(d => d.g === g).slice(0, s.meals[g] || 0).forEach(d => { s.dishes[d.name] = s.week; }); }   // 예전 저장: 등급별 해금 수 → 앞에서부터 그만큼 발견한 것으로
    syncMeals(s);
    for (const o of s.orders || []) if (o.target == null && o.n != null) { const back = Math.max(0, (o.n - (o.got || 0)) * (o.price || 0)); s.gold += back; o.target = o.n; o.mult = s.cfg.econ.orderMult != null ? s.cfg.econ.orderMult : 1.5; delete o.n; delete o.price; }   // 2026-11-19 결정 41: 예전 선지급 발주 → 남은 선지급을 돌려주고 같은 개수를 목표 재고로 하는 상시 발주
    s.ui = s.ui || {}; if (s.ui.expView === undefined) s.ui.expView = null; // 예전 저장에는 화면 배치가 없음
    for (const a of s.advs) {
      if (!Array.isArray(a.eq)) { const g = a.gear == null ? -1 : a.gear; a.eq = [g, g, g]; }   // 2026-11-18 대장간: 장비 3칸 이전 저장 = 한 벌 등급을 세 칸에 그대로
      if (!a.cls1) a.cls1 = CLASS1[a.core];
      if (!a.line) a.line = [a.core];
      if (a.fin == null) a.fin = false;
      if (!a.skills) a.skills = [{ line: a.core, form: a.cls1 }];
      if (!a.career) a.career = [{ week: a.joined || 0, text: '길드에 처음 옴' }];
      if (a.promoCool == null) a.promoCool = 0;
      if (a.pots == null) a.pots = 0;   // 전투 도입 전 저장
      if (a.contract === undefined) a.contract = null; if (!a.earn) a.earn = [];   // 2026-11-17 경제 개편 V2 전 저장: 모두 자유 모험가 (강제 고용 · 소급 급여 없음)
    }
    for (const k of ['combat', 'combatWin', 'injuries', 'deaths', 'potions']) if (s.stats[k] == null) s.stats[k] = 0;
    if (s.uidNext == null) { s.uidNext = 1; s.settled = {}; s.paidMonth = {}; }   // 2026-11-17 경제 개편 V2: 정산 1회 보장 (진행 중이던 원정은 번호 없이 예전처럼 정산)
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
    if (a.attach >= 100 || a.home) return true;   // home: 창립 멤버(시작 모험가)는 애착과 상관없이 늘 마을에 있음
    const interval = s.cfg.adv.visitBaseWeeks * (1 + (100 - a.attach) / 50);
    return s.R() < Math.min(1, 2 / interval);
  }
  // 등급별 요리 수 (meals.csv). 해금은 그 수까지, 식사 보너스는 2개 이상 열리면 100% (요리별 능력치 맞춤은 나중에)
  const MEAL_N = GR.map(g => (GD.meals || []).filter(m => m.grade === g).length || 2);
  function mealFor(s, q) { for (let g = q.g; g >= 0; g--) if (s.meals[g] > 0) return g; return -1; }
  // 출발 전 요리 고르기 (C안): 발견한 요리 중 의뢰 등급 이하에서 요구 능력치와 가장 많이 겹치는 것 → 같으면 높은 등급 → 높은 수치
  function dishFor(s, q) { let best = null, bs = -1; for (const d of DISH) { if (!s.dishes[d.name] || d.g > q.g || (mealCookOn(s) && stockOf(s, d) <= 0)) continue; const sc = d.stats.filter(k => q.req.includes(k)).length * 1000 + d.g * 10 + d.pct * 100; if (sc > bs) { bs = sc; best = d; } } return best; }

  // ---------- 소재와 요리 조합 (docs/design/cooking.md) ----------
  // 2026-11-17 경제 개편 V2 결정 12 (4단계): 소재는 주운 모험가 것 → 귀환 때 길드가 판매가의 70%(버림)로 자동 매입, 돈은 파티에게. 금고가 모자라면 위탁(팔리면 수수료 10%만 길드) [임시]
  const SELL_P = [6, 9, 12, 30, 36, 48, 90];
  const matBase = id => { const m = MAT[id]; return m ? (m.price || SELL_P[Math.max(0, GR.indexOf(m.grade))]) : 0; };
  // ---------- V4 2단계 (결정 40 · 43): 소재 시세 · 소재 처리(매입 / 위탁 / 안 받음) ----------
  // 마을 시장 재고 M: 매주 바깥 공급(목표 × 10% + 시작 인구 ÷ 100)이 들어오고 마을 소비(M × 10% + 지금 인구 ÷ 100)로 줄어듦 → 아무도 안 건드리면 목표에 머묾.
  // 의뢰에서 가져온 소재 · 길드가 판 소재는 M에 더해짐 → 많이 잡으면 값이 내려가고, 마을이 커지면 조금 오름. 시세 배수 = 1 + K × (목표 − M) ÷ 목표, 0.5 ~ 2.0 [임시]
  const mktOn = s => !!s.cfg.econ.mktOn;
  const mktTarget = (s, id) => { const E = s.cfg.econ; return SPICE.has(id) ? (E.mktTargetSpice || 15) : (E.mktTarget || 20); };
  const mktM = (s, id) => { const K = s.mkt = s.mkt || {}; if (K[id] == null) K[id] = mktTarget(s, id); return K[id]; };
  const mktMult = (s, id) => { if (!mktOn(s)) return 1; const E = s.cfg.econ, T = mktTarget(s, id); return Math.max(E.mktMin || 0.5, Math.min(E.mktMax || 2, 1 + (E.mktK != null ? E.mktK : 0.6) * (T - mktM(s, id)) / T)); };
  const matPrice = (s, id) => Math.max(1, Math.round(matBase(id) * mktMult(s, id)));   // 지금 시세 (정수)
  const mktAdd = (s, id, n) => { if (mktOn(s) && MAT[id]) { mktM(s, id); s.mkt[id] += n; } };
  function mktWeekly(s) {
    if (!mktOn(s)) return; const E = s.cfg.econ, use = E.mktUse != null ? E.mktUse : 0.1, pd = E.mktPop || 100, p0 = s.cfg.town.startPop || 150;
    const H = s.mktH = s.mktH || {};
    for (const id in MAT) { const T = mktTarget(s, id), M = mktM(s, id); s.mkt[id] = Math.max(0, M + T * use + p0 / pd - M * use - (s.pop || p0) / pd);
      if (s.knownMats && s.knownMats[id]) { const h = H[id] = H[id] || []; h.push(Math.round(mktMult(s, id) * 100)); if (h.length > 5) h.shift(); } }   // 화살표: 4주 전과 비교
  }
  const mktTrend = (s, id) => { const h = (s.mktH || {})[id] || []; if (h.length < 2) return 0; const d = h[h.length - 1] - h[0]; return d >= 5 ? 1 : d <= -5 ? -1 : 0; };
  // 소재 처리: 소재마다 매입(시세 × 50 · 70 · 90%) / 위탁(길드가 대신 팔고 수수료) / 안 받음(모험가가 직접 판매) — 결정 43
  const POL_DEF = { mode: 'buy', rate: null };
  const matPol = (s, id) => (s.matPol || {})[id] || POL_DEF;
  const polRate = (s, id) => { const p = matPol(s, id); return p.rate != null ? p.rate : (s.cfg.econ.matBuyRate != null ? s.cfg.econ.matBuyRate : 0.7); };
  function setMatPol(s, id, mode, rate) {
    if (!MAT[id]) return { ok: false, why: '없는 소재입니다' }; if (!['buy', 'consign', 'none'].includes(mode)) return { ok: false, why: '처리 방식이 없습니다' };
    const R = s.cfg.econ.buyRateOpt || [0.5, 0.7, 0.9]; if (rate != null && !R.some(x => Math.abs(x - rate) < 1e-9)) return { ok: false, why: '매입가 비율이 선택지에 없습니다' };
    (s.matPol = s.matPol || {})[id] = { mode, rate: mode === 'buy' ? (rate != null ? rate : polRate(s, id)) : null }; return { ok: true };
  }
  const matSellPrice = (s, id) => matPrice(s, id) + (upg(s, '판매창구') ? (s.cfg.econ.upSell || 3) : 0);   // 판매 창구 업그레이드 +3G · 2026-11-19: 시세
  const matBuyPrice = (s, id) => Math.floor(matPrice(s, id) * polRate(s, id) + 1e-9);   // 2026-11-19: 시세 × 소재별 매입 비율
  function payParty(s, ids, total) { const ps = ids.map(id => s.advs.find(a => a.id === id)).filter(a => a && a.alive); if (!ps.length || total <= 0) return; const sp = econSplit(total, ps.map(() => 0)); ps.forEach((a, i) => { a.wallet += sp.net[i]; }); }
  // 2026-11-18 결정 27: 몬스터 1마리 · 탐색 포인트 1곳마다 보상표의 주 소재(30% 이상)에서 확률 비율대로 1개 (발주 중인 소재가 있으면 그것), 희귀 소재(30% 미만)는 의뢰당 1번. 몬스터 없는 의뢰는 포인트 econ.drawPts [임시] 2~3곳
  function drawList(s, q, T) {
    const RW = T.rewards || [], E = s.cfg.econ; if (!E.drawMode) return RW;
    const main = RW.filter(r => r.p >= 30), rare = RW.filter(r => r.p < 30), P = E.drawPts || [2, 3];
    let k = q.enemies && q.enemies.length ? q.enemies.length : P[0] + Math.floor(s.R() * (P[1] - P[0] + 1));
    if (resLow(s, baseMatOf(T))) k = Math.max(1, Math.floor(k * (s.cfg.econ.popLowDraw != null ? s.cfg.econ.popLowDraw : 0.5)));   // 결정 44: 개체수가 적으면 뽑기 수 절반
    if ((q.lv || 1) > 1 && QLV(s)) { const kk = k * (1 + QLV(s).pay * (q.lv - 1)); k = Math.floor(kk) + (s.R() < kk - Math.floor(kk) ? 1 : 0); }   // 의뢰 레벨: 소재 개수 +pay
    const tot = main.reduce((a, r) => a + r.p, 0), om = main.find(r => liveOrders(s).some(o => o.m === r.m)), oo = om && (s.orders || []).find(o => o.m === om.m), ob = oo ? (s.cfg.econ.orderMode ? orderBiasOf(s, oo) : 1) : 0, out = [];
    for (let i = 0; i < k && main.length; i++) {
      if (om && (ob >= 1 || s.R() < ob)) { out.push({ m: om.m, p: 100 }); continue; }   // 2026-11-19 상시 발주: 뽑기마다 쏠림 비율(30 · 50 · 70%)만큼만 발주 소재 — 늘 켜져 있어 다른 소재(고철 등)가 끊기지 않게 [임시] (예전 결정 27은 전부)
      let x = s.R() * tot, pick = main[main.length - 1]; for (const r of main) { x -= r.p; if (x <= 0) { pick = r; break; } } out.push({ m: pick.m, p: 100 });
    }
    return out.concat(rare.map(r => { const so = SPICE.has(r.m) && liveOrders(s).find(o => o.m === r.m); return so ? { m: r.m, p: Math.max(r.p, orderBiasOf(s, so) * 100) } : r; }));   // 결정 46: 발주한 양념은 다른 소재 뽑기를 빼앗지 않고, 의뢰마다 한 번 굴리는 양념 확률만 쏠림 비율(30 · 50 · 70%)까지 올림 [임시]
  }
  function dropMats(s, q, party) {
    const T = QBYID[q.tid]; if (!T) return;
    const ids = (party || []).map(a => a.id); let paid = 0;
    for (const r of drawList(s, q, T)) {
      if (s.R() * 100 >= r.p) continue;
      { const o = (s.orders || []).find(x => x.m === r.m && orderLive(s, x));   // 2026-11-19 결정 41: 상시 발주 — 창고가 목표 아래인 소재는 그때 금고에서 1개 값을 파티에게 주고 창고로 (선지급 없음)
        if (o && ids.length) { const op = orderPriceOf(s, o); s.gold -= op; s.month.order = (s.month.order || 0) - op; o.got = (o.got || 0) + 1; s.mats[r.m] = (s.mats[r.m] || 0) + 1; payParty(s, ids, op); buyNote(s, r.m, ids, op, 1, true); if (!s.knownMats[r.m]) s.knownMats[r.m] = true;
          continue; } }
      mktAdd(s, r.m, 1);   // 2026-11-19 V4 2단계: 의뢰에서 나온 소재는 시장 공급으로 셈
      resTake(s, r.m, 1);  // V4 3단계: 그 자원지 개체수 −3
      const pol = matPol(s, r.m), cap = s.cfg.econ.storeCap || 30;
      if (ids.length && pol.mode === 'none') { payParty(s, ids, matPrice(s, r.m)); if (!s.knownMats[r.m]) { s.knownMats[r.m] = true; const m = MAT[r.m]; if (m) log(s, `처음 보는 소재를 얻었습니다: ${m.name}`, 'unlock'); } continue; }   // 안 받음: 모험가가 시장에 직접 팖
      const bp = matBuyPrice(s, r.m);
      if (ids.length && (pol.mode === 'consign' || (s.mats[r.m] || 0) >= cap)) { s.consign = s.consign || []; const key = ids.join(','), e = s.consign.find(x => x.m === r.m && x.ids.join(',') === key); if (e) e.n++; else s.consign.push({ m: r.m, ids: ids.slice(), n: 1 }); }   // 위탁 · 창고 상한
      else if (!ids.length || s.gold >= bp) { s.mats[r.m] = (s.mats[r.m] || 0) + 1; if (ids.length && bp) { s.gold -= bp; paid += bp; s.month.matBuy = (s.month.matBuy || 0) - bp; s.month.matBuyN = (s.month.matBuyN || 0) + 1; buyNote(s, r.m, ids, bp, 1); } }
      else { s.consign = s.consign || []; const key = ids.join(','), e = s.consign.find(x => x.m === r.m && x.ids.join(',') === key); if (e) e.n++; else s.consign.push({ m: r.m, ids: ids.slice(), n: 1 }); }   // 위탁: 길드 창고에 넣지 않음 (요리 · 납품에 못 씀)
      if (!s.knownMats[r.m]) { s.knownMats[r.m] = true; const m = MAT[r.m]; if (m) log(s, `처음 보는 소재를 얻었습니다: ${m.name}`, 'unlock'); }
    }
    if (paid) payParty(s, ids, paid);
  }
  function buyNote(s, m, ids, g, n, ord) {   // 매입 기록 (E4-4 화면용, 최근 40줄) — 같은 주 · 같은 소재 · 같은 파티는 한 줄로
    const L = s.buyLog = s.buyLog || [], key = ids.join(','), e = L.find(x => x.w === s.week && x.m === m && x.ids.join(',') === key);
    if (e && !!e.ord === !!ord) { e.n += n; e.g += g; } else { L.unshift({ w: s.week, m, ids: ids.slice(), n, g, ord: !!ord }); if (L.length > 40) L.length = 40; }
  }
  // ---------- 길드 발주 (경제 개편 V2 6단계 · 결정 24 · 25): 선지급 모으기 ----------
  const orderPrice = (s, m, mult) => Math.floor(matPrice(s, m) * (mult != null ? mult : s.cfg.econ.orderMult != null ? s.cfg.econ.orderMult : 1.5) + 1e-9);   // 1개 값 = 판매가 × 배수 [임시]
  // 2026-11-19 결정 41 (V4 1단계): 상시 발주 = 소재별 목표 창고 재고. 창고가 목표 아래이고 금고가 1개 값 이상이면 켜짐(게시판 쏠림 · 모험가 우선 · 들어올 때 지급)
  const orderMultOpts = s => s.cfg.econ.orderMultOpt || [1.2, 1.5, 2];
  const orderPriceOf = (s, o) => orderPrice(s, o.m, o.mult);
  const orderBiasOf = (s, o) => { const E = s.cfg.econ, i = orderMultOpts(s).findIndex(x => Math.abs(x - o.mult) < 1e-9); return E.orderBiasOpt && i >= 0 ? E.orderBiasOpt[i] : (E.orderBias || 0); };
  const orderLive = (s, o) => o.target != null && (s.mats[o.m] || 0) < o.target && s.gold >= orderPriceOf(s, o);
  const liveOrders = s => (s.orders || []).filter(o => orderLive(s, o));
  // ---------- 튜토리얼 도우미 (2026-11-18, docs/design/튜토리얼.md) ----------
  function tutPost(s, tid) { const q = makeQuest(s, 0, tid); tutEase(q); s.board.push(q); return q; }   // 정해진 의뢰를 게시판에 올림
  // 2026-11-19 첫 의뢰 쉽게: 원래 멧돼지 2마리면 Lv1 전사 혼자 300판 중 300판 짐 → 1마리 · 체력 50% · 공격 70% [임시] (300판: 첫 판에 무사히 이김 275판, 다시 굴려도 못 이긴 판 0)
  function tutEase(q) { if (!q || !q.enemies || !q.enemies.length) return; q.enemies = [Object.assign({}, q.enemies[0], { hp: q.enemies[0].hp * 0.5, atk: q.enemies[0].atk * 0.7 })]; if (q.seen) q.seen = q.seen.slice(0, 1); }
  function tutLaunch(s, aid, qid) {   // 정해진 모험가를 정해진 의뢰로 바로 출발시킴 (강제)
    const a = s.advs.find(x => x.id === aid), q = s.board.find(x => x.id === qid); if (!a || !q || a.state !== 'town') return false;
    s.board.splice(s.board.indexOf(q), 1);
    // 첫 의뢰는 꼭 성공하고 다치지 않게: 결과가 나쁘면 출발을 되돌리고 다시 굴림 (40번 안에 안 되면 결과를 성공으로 고침)
    const keep = JSON.stringify(a), top = s.log[0], uid0 = s.uidNext, g0 = s.gold, mm = s.month.meal, su = s.seatUsed;
    for (let k = 0; k < 40; k++) {
      launchParty(s, q, [a], questP(s, [a], q));
      const x = s.active[s.active.length - 1], good = x.ok && !x.late && (!x.fight || x.fight.units.every(u => !u.down));
      if (good) return true;
      if (k === 39) { x.ok = true; x.late = false; x.fight = null; return true; }   // 그래도 안 되면 성공으로 고치되, 진 전투 기록은 버림 (미니 뷰가 쓰러지는 장면을 재생하지 않게 — 비전투 수행 장면으로)
      s.active.pop(); Object.assign(a, JSON.parse(keep)); while (s.log.length && s.log[0] !== top) s.log.shift(); s.uidNext = uid0; s.gold = g0; s.month.meal = mm; s.seatUsed = su;
    }
    return true;
  }
  function tutSpawn(s, o) {   // 튜토리얼 모험가: 창립 멤버처럼 늘 길드에 머물고, 바로 로비에 있음. male: 남자(로비 그림은 id 홀수 = 남자, 이름은 남자 이름 중에서)
    o = o || {}; if (o.male && s.nextId % 2 === 0) s.nextId++;
    const a = spawnAdv(s, { attach: 20, home: true, core: o.core, quiet: true }); a.state = 'town'; a.until = 0;
    if (o.male) { const used = new Set(s.advs.filter(x => x !== a).map(x => x.name)), MALE = '아론 카스 에단 가빈 이반 켄트 마커스 오웬 세스 울릭 웨스 브루노 데인 펠릭 호레이스 잭 레오 네드 피터 사일러스 테오 빅터 노아 벤 조엘 라이언 토빈 다넬 고든'.split(' '), M = NAMES.filter(n => MALE.includes(n) && !used.has(n)); if (M.length) a.name = M[ri(s, M.length)]; }
    log(s, `${a.cls} ${J(a.name, '이', '가')} 길드를 처음 찾아왔습니다.`, 'arrive', { who: [a.name] });
    return a;
  }
  function tutReq(s, key) {   // 정해진 리퀘스트를 바로 엶
    const R = reqOf(s), d = NQ_BY[key]; if (!d || R.open.some(r => r.key === key)) return null;
    const ow = reqOwnerFor(s, d), r = { id: 'r' + (R.next++), key, state: 'open', stage: 1, who: ow ? ow.id : null, party: ow && d.party ? [ow.id] : [], refused: {}, at: s.week, isNew: true, fails: 0, tut: true };
    R.open.push(r); reqLog(s, r, 'req', `${J(reqGiver(s, r), '이', '가')} 리퀘스트를 맡겼습니다: 「${reqName(s, r)}」`); return r;
  }
  // 대장간 마스터 선물 (2026-11-18): 길드 금으로 장비 1칸을 사서 줌 — 다음 등급만(길드 등급까지), 애착 +gear.giftAttach[등급] [임시]
  function smithWhy(s, a, k) {
    if (!(s.townUnlock || {}).smith) return '대장간이 아직 없습니다';
    if (!a || !a.alive) return '모험가가 없습니다';
    if (s.gold < 0) return '금고 적자 — 금고가 0G 이상이 되면 선물할 수 있어요';
    const g = eqOf(a)[k] + 1; if (g > s.grade) return '길드 등급까지만 올릴 수 있습니다';
    const price = s.cfg.gear.weaponPrice[g]; if (s.gold < price) return `금고가 모자랍니다 (${price}G 필요)`;
    return null;
  }
  function smithGift(s, aid, k) {
    const a = s.advs.find(x => x.id === aid), why = smithWhy(s, a, k); if (why) return { ok: false, why };
    const g = eqOf(a)[k] + 1, price = s.cfg.gear.weaponPrice[g], att = ((s.cfg.gear.giftAttach || [1, 2])[g]) || 1;
    s.gold -= price; s.month.gift = (s.month.gift || 0) - price; setEq(a, k, g); a.attach = Math.min(100, a.attach + att);
    (s.smithLog = s.smithLog || []).unshift({ w: s.week, id: a.id, k, g, price, t: 'gift' }); if (s.smithLog.length > 30) s.smithLog.length = 30;
    (a.career = a.career || []).push({ week: s.week, text: `마스터에게 ${GR[g]}급 ${EQ_NAME[k]}를 선물받음` }); remember(s, a, 'gift', { part: EQ_NAME[k], g: GR[g] });
    log(s, `${J(a.name, '이', '가')} 마스터에게 ${GR[g]}급 ${EQ_NAME[k]}를 선물받았습니다. (${price}G · 애착 +${att})`, 'grow', { who: [a.name] });
    return { ok: true, g, price, att };
  }
  function orderSources(s, m) { const sp = SPICE.has(m), out = []; for (const k in TPL) { const g = +k.split('_')[1]; if (g > s.grade) continue; for (const t of TPL[k]) if ((t.rewards || []).some(r => r.m === m && (r.p >= 30 || (sp && r.p > 0)))) out.push(t); } return out; }   // 2026-11-19 결정 46: 양념은 희귀(15%)로 나와도 상시 발주 가능   // 발주 소재가 주 소재로 나오는 게시판 의뢰 (결정 26 · 27)
  function orderWhy(s, m, target, mult, editId) {   // 2026-11-19 결정 41: 상시 발주 (목표 재고 1~30, 1개 값 배수는 선택지 중 하나)
    const E = s.cfg.econ, max = E.orderMax != null ? E.orderMax : 3;
    if (!MAT[m]) return '없는 소재입니다';
    if (!Number.isInteger(target) || target < 1 || target > 30) return '목표 재고는 1~30개입니다';
    if (mult != null && !orderMultOpts(s).some(x => Math.abs(x - mult) < 1e-9)) return '1개 값 배수가 선택지에 없습니다';
    if (editId == null && (s.orders || []).length >= max) return `상시 발주는 동시에 ${max}건까지입니다`;
    if ((s.orders || []).some(o => o.m === m && o.id !== editId)) return '이미 발주한 소재입니다';
    if (!orderSources(s, m).length) return '지금 길드 등급 의뢰에서는 나오지 않는 소재입니다';
    return null;
  }
  function orderPlace(s, m, target, mult) {
    if (mult == null) mult = s.cfg.econ.orderMult != null ? s.cfg.econ.orderMult : 1.5;
    const why = orderWhy(s, m, target, mult); if (why) return { ok: false, why };
    (s.orders = s.orders || []).push({ id: s.uidNext++, m, target, mult, got: 0, w: s.week });
    log(s, `${MAT[m].name} 상시 발주를 걸었습니다. (창고 ${target}개 유지 · 1개 ${orderPrice(s, m, mult)}G)`, 'sys');
    return { ok: true, price: orderPrice(s, m, mult) };
  }
  function orderEdit(s, id, target, mult) {
    const o = (s.orders || []).find(x => x.id === id); if (!o) return { ok: false, why: '발주가 없습니다' };
    if (mult == null) mult = o.mult;
    const why = orderWhy(s, o.m, target, mult, id); if (why) return { ok: false, why };
    o.target = target; o.mult = mult; return { ok: true };
  }
  function orderCancel(s, id) {   // 상시 발주는 미리 낸 돈이 없으므로 그냥 내림
    const o = (s.orders || []).find(x => x.id === id); if (!o) return { ok: false, why: '발주가 없습니다' };
    s.orders = s.orders.filter(x => x !== o); log(s, `${MAT[o.m].name} 상시 발주를 내렸습니다.`, 'sys');
    return { ok: true, back: 0 };
  }
  // 자동 플레이(관문 1 · 측정용): 메뉴에 올린 요리의 주재료(양념 제외)를 목표 재고 econ.orderTarget · 기본 배수로 상시 발주 (빈 자리만큼)
  function autoOrders(s) {
    const E = s.cfg.econ, max = E.orderMax != null ? E.orderMax : 3, t = E.orderTarget || 6;
    { const A = s.soldAvg = s.soldAvg || {}, W = s.soldW || {}; for (const d of DISH) if (s.dishes[d.name]) { A[d.name] = (A[d.name] || 0) * 0.7 + (W[d.name] || 0) * 0.3; menuOf(s, d).prep = Math.max(1, Math.min(10, Math.ceil(A[d.name]) + 1)); } s.soldW = {}; }   // 자동 플레이: 준비량 = 최근 판매(지수 평균) + 1그릇
    for (const d of DISH) { if (!s.dishes[d.name] || d.g > s.grade) continue;
      for (const m of d.mats) { if ((SPICE.has(m) && E.shopRate) || (s.orders || []).some(o => o.m === m)) continue; if ((s.orders || []).length >= max) return; orderPlace(s, m, t); } }
  }
  function consignBuy(s, i) {   // 2026-11-18 E4-4: 위탁 보관 중인 소재를 지금 매입가(판매가 × 70% [임시])로 사들여 창고로
    const e = (s.consign || [])[i]; if (!e) return { ok: false, why: '위탁품이 없습니다' };
    const cost = matBuyPrice(s, e.m) * e.n;
    if (s.gold < cost) return { ok: false, why: `금고가 모자랍니다 (${cost}G 필요)` };
    s.gold -= cost; s.month.matBuy = (s.month.matBuy || 0) - cost; s.month.matBuyN = (s.month.matBuyN || 0) + e.n;
    payParty(s, e.ids, cost); s.mats[e.m] = (s.mats[e.m] || 0) + e.n; buyNote(s, e.m, e.ids, cost, e.n); s.consign.splice(i, 1);
    return { ok: true, cost, n: e.n };
  }
  function consignMonthly(s) {   // 위탁품은 월말에 판매 창구에서 팔려 소유자에게 90%, 길드는 수수료만
    const L = s.consign || []; if (!L.length) return; const rate = s.cfg.econ.consignFee != null ? s.cfg.econ.consignFee : 0.1; let feeAll = 0, n = 0;
    for (const e of L) { const sale = matSellPrice(s, e.m) * e.n, fee = Math.floor(sale * rate + 1e-9); feeAll += fee; n += e.n; payParty(s, e.ids, sale - fee); }
    s.consign = []; if (feeAll) { s.gold += feeAll; s.month.consign = (s.month.consign || 0) + feeAll; } s.month.consignN = (s.month.consignN || 0) + n;
  }
  function sellMats(s, list) {   // list: [[소재 id, 개수]] — 판매 창구 (화면 · 자동 플레이 공통)
    let n = 0, g = 0; for (const [id, k0] of list) { const k = Math.min(k0, s.mats[id] || 0); if (!MAT[id] || k <= 0) continue; s.mats[id] -= k; n += k; for (let i = 0; i < k; i++) { g += matSellPrice(s, id); mktAdd(s, id, 1); } }   // 2026-11-19 V4 2단계: 한 개 팔 때마다 시장 재고 +1
    if (n) { s.gold += g; s.month.sell = (s.month.sell || 0) + g; s.month.resale += g; } return { n, g };
  }
  function sellPreview(s, id, k) { const K = s.mkt = s.mkt || {}, m0 = mktM(s, id); let g = 0; for (let i = 0; i < k; i++) { g += matSellPrice(s, id); K[id] += mktOn(s) ? 1 : 0; } K[id] = m0; return g; }   // N개 팔면 받는 돈 (시장 재고는 되돌림)
  function autoSell(s) { const keep = 10, L = []; for (const id in s.mats) { const m = MAT[id]; if (m && m.line !== 'food' && s.mats[id] > keep) L.push([id, s.mats[id] - keep]); } return sellMats(s, L); }   // 측정용 자동 플레이: 음식이 아닌 소재는 10개만 남기고 월말에 팖
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
  function autoCook(s) { for (const d of DISH) if (!s.dishes[d.name] && d.g <= s.grade && d.mats.every(m => s.mats[m] > 0)) cook(s, d.mats); if (s.cfg.econ.mealCook && s.cfg.econ.orderMode) autoOrders(s); }   // 2026-11-19: 자동 플레이는 식당 재료도 상시 발주
  // ---------- 식당 운영 (2026-11-19 V4 1단계 · 결정 37 · 38 · 39, econ.mealCook) ----------
  // 메뉴: 요리마다 가격(1G 단위) · 한 주 준비량. 매주 출발 전에 준비량만큼 재료 1세트씩 써서 그릇을 만들고(세트당 그릇 = meals.csv), 양념이 모자라면 잡화 상인에게서 삼.
  // 그릇은 만든 주와 그다음 주까지 팔고 그 뒤 버림. 모험가는 가격 계수만큼 더 · 덜 사 먹음
  const SPICE_NAMES = ['소금', '향신료', '신선한 물', '밀가루'];
  const SPICE = new Set(Object.keys(MAT).filter(id => SPICE_NAMES.includes(MAT[id].name)));
  const mealCookOn = s => !!s.cfg.econ.mealCook;
  const dishBase = (s, d) => Math.round(s.cfg.quest.reward[d.g] * s.cfg.econ.mealPriceRate);   // 기준가 (F 25G)
  const shopPrice = (s, id) => Math.ceil(matPrice(s, id) * (s.cfg.econ.shopRate != null ? s.cfg.econ.shopRate : 1.5) - 1e-9);
  function menuOf(s, d) { const M = s.menu = s.menu || {}; if (!M[d.name]) M[d.name] = { price: dishBase(s, d), prep: s.cfg.econ.mealPrep != null ? s.cfg.econ.mealPrep : 4 }; return M[d.name]; }
  const priceK = (s, d, price) => { const E = s.cfg.econ, b = dishBase(s, d) || 1; return Math.max(E.mealPMin != null ? E.mealPMin : 0.1, Math.min(E.mealPMax != null ? E.mealPMax : 1.6, 1 + (E.mealPK != null ? E.mealPK : 1.5) * (1 - price / b))); };
  const stockOf = (s, d) => ((s.bowls || {})[d.name] || []).reduce((a, b) => a + b.n, 0);
  const dishCost = (s, d) => d.mats.reduce((a, m) => a + matPrice(s, m), 0) / (d.serv || 2);   // 1그릇 원가 = 재료 시세 합 ÷ 그릇 수
  function setMenu(s, name, price, prep) {
    const d = DISH.find(x => x.name === name); if (!d || !s.dishes[d.name]) return { ok: false, why: '발견하지 않은 요리입니다' };
    const mu = menuOf(s, d), b = dishBase(s, d);
    if (price != null) { if (!Number.isInteger(price) || price < 1 || price > b * 3) return { ok: false, why: `가격은 1 ~ ${b * 3}G입니다` }; mu.price = price; }
    if (prep != null) { if (!Number.isInteger(prep) || prep < 0 || prep > 10) return { ok: false, why: '준비량은 0~10그릇입니다' }; mu.prep = prep; }
    return { ok: true };
  }
  function kitchenWeekly(s) {
    if (!mealCookOn(s)) return;
    const B = s.bowls = s.bowls || {};
    for (const d of DISH) {
      if (!s.dishes[d.name]) continue;
      const L0 = B[d.name] || [], L = L0.filter(b => b.n > 0 && s.week - b.w <= 1);
      const waste = L0.filter(b => b.n > 0 && s.week - b.w > 1).reduce((a, b) => a + b.n, 0); if (waste) s.month.waste = (s.month.waste || 0) + waste;
      const mu = menuOf(s, d); let have = L.reduce((a, b) => a + b.n, 0); const KS = s.kShort = s.kShort || {}; KS[d.name] = false;   // kShort: 이번 주 재료 · 금고가 모자라 준비량을 못 채움 (품절 원인 구분용)
      while (have < mu.prep) {
        const keep = s.cfg.econ.mealKeep || 0, need = d.mats.filter(m => !(s.mats[m] > keep));   // mealKeep: 식당이 남겨 두는 재료 수 (납품 리퀘스트용) [임시]
        if (need.some(m => !SPICE.has(m)) || (need.length && !s.cfg.econ.shopRate)) { s.month.soldOut = (s.month.soldOut || 0) + 1; KS[d.name] = true; break; }   // 재료가 없으면 품절 (결정 46: shopRate 0 = 잡화 상인 없음, 양념도 상시 발주로)
        const cost = need.reduce((a, m) => a + shopPrice(s, m), 0); if (cost > s.gold) { KS[d.name] = true; break; }
        for (const m of need) { const c = shopPrice(s, m); s.gold -= c; s.month.shop = (s.month.shop || 0) - c; s.mats[m] = (s.mats[m] || 0) + 1; }
        for (const m of d.mats) s.mats[m]--;
        const n = d.serv || 2; L.push({ n, w: s.week }); have += n; s.month.cooked = (s.month.cooked || 0) + n;
      }
      B[d.name] = L;
    }
  }
  function takeBowl(s, d) { const L = (s.bowls || {})[d.name] || []; L.sort((a, b) => a.w - b.w); const b = L.find(x => x.n > 0); if (b) b.n--; }


  function departures(s) {
    const Q = s.cfg.quest, E = s.cfg.econ;   // s.seatUsed(이번 주 식사한 좌석 수)는 stepWeek에서 0으로 (지명 출발이 먼저 식사하므로)
    for (const a of s.advs) { if (!a.alive || a.state === 'quest') continue; if (a.state === 'injured' && s.week < a.until) continue; a.state = present(s, a) || reqReserved(s, a) ? 'town' : 'away'; if (a.state === 'town') a.lastSeen = s.week; }   // lastSeen: 마지막으로 길드에 온 주
    if (mainBlocked(s)) return;   // 침공 1주 전: 의뢰 출발 금지 (2026-11-16)
    const idle = s.advs.filter(a => a.state === 'town' && !reqReserved(s, a));   // 지명 예약자는 게시판 의뢰를 받지 않음
    for (const a of idle) {
      if (a.state !== 'town') continue;
      const range = [[-1, 0], [-1, 1], [0, 2]][a.risk];
      const hi = Math.min(s.grade, a.grade + range[1]), lo = Math.min(hi, Math.max(0, a.grade + range[0]));   // 2026-11-12: 길드보다 1등급 높은 모험가도 길드 최고 등급 의뢰는 고름
      const th = s.cfg.adv.departTh[a.risk];
      const cands = s.board.filter(q => q.g >= lo && q.g <= hi && !cPastEnd(s, a, q.weeks || s.cfg.quest.weeks[q.g])).sort(pickOrder(s, a));   // 결정 9: 계약 끝을 넘는 의뢰는 고르지 않음
      const needy = needsMoney(s, a), base0 = feeBase0(s), K = s.cfg.econ.restK || 0;   // 2026-11-19: 기본 = feeBase (선택지 첫 칸이 5%가 됨)
      for (const q of cands) {
        if (needy && lowBuySkip(s, q) > 0 && s.R() < lowBuySkip(s, q)) continue;   // 2026-11-19 결정 43: 매입가를 낮춘 소재가 나오는 의뢰는 돈이 필요한 모험가가 거름 (50% → 25%)
        if (needy && K > 0) { const f = questFee(s, q); if (f > base0 + 1e-9 && s.R() < Math.min(1, (f - base0) / base0 * K)) continue; }   // 2026-11-17 결정 22: 돈이 필요한 모험가는 수수료가 기본보다 높으면 확률로 거름(15% → 25%, 20% → 50%), 다 거르면 이번 주는 쉼
        let party = [a];
        let pp = perceived(s, a, questP(s, party, q));
        if (pp < s.cfg.adv.seekTh[a.social]) {
          const mates = idle.filter(b => b !== a && b.state === 'town' && Math.abs(b.grade - q.g) <= 1 && !cPastEnd(s, b, q.weeks || s.cfg.quest.weeks[q.g])).slice(0, 4);
          for (const m of mates) { party.push(m); if (perceived(s, a, questP(s, party, q)) >= th) break; }
          pp = perceived(s, a, questP(s, party, q));
        }
        if (pp < th) continue;
        s.board.splice(s.board.indexOf(q), 1);
        launchParty(s, q, party, pp);
        break;
      }
    }
    // 술 (2026-11-12): 이번 주 마을에 남은 모험가가 씀씀이 성향별 확률(식사와 같은 econ.mealBuyRate)로 1잔. 길드 마진 econ.drinkMargin[길드 등급]
    const DM = E.drinkMargin || [2, 3, 4, 5, 6, 7, 8]; s.drinks = [];
    for (const a of s.advs) if (a.alive && a.state === 'town' && s.R() < E.mealBuyRate[a.spend]) { const m = (DM[s.grade] || DM[0]) + (upg(s, '주점') ? (E.upMargin || 5) : 0); s.gold += m; s.month.tavern += m; s.month.drinks = (s.month.drinks || 0) + 1; s.drinks.push(a.id); }
  }
  function launchParty(s, q, party, pp) {   // 2026-11-16: 게시판 출발과 지명(리퀘스트) 출발이 같은 처리를 씀
    const Q = s.cfg.quest, E = s.cfg.econ;
    const w0 = party.map(m => m.wallet);   // 계약 지원(결정 4 · E3-3): 출발 때 식사 · 물약에 쓴 돈을 약정 한도 안에서 길드가 돌려줌
    {
      {
        // 출발 전 식사
        let eaters = 0; const dish = dishFor(s, q), ate = new Set();
        if (dish) for (const m of party) {
          if (s.seatUsed >= seatsOf(s)) break;   // 2026-11-12: 앉을 자리(테이블 세트 × 2)만큼만 이번 주에 식사 (guild_interior.md 10-3)
          const MC = mealCookOn(s); if (MC && stockOf(s, dish) <= 0) break;   // 2026-11-19 결정 37: 그릇이 다 팔리면 품절
          const price = MC ? menuOf(s, dish).price : Q.reward[dish.g] * E.mealPriceRate;
          if (m.wallet >= price && s.R() < Math.min(1, E.mealBuyRate[m.spend] * (MC ? priceK(s, dish, price) : 1))) { s.seatUsed++; m.wallet -= price; if (MC) { takeBowl(s, dish); const W = s.soldW = s.soldW || {}; W[dish.name] = (W[dish.name] || 0) + 1; } const inc = (MC ? price : price * E.mealMargin) + (upg(s, '주점') ? (E.upMargin || 5) : 0); /* 결정 39: 가격 계수 · 매출 = 판매가 (재료는 매입 · 발주 · 잡화로 이미 냄) */ s.gold += inc; s.month.meal += inc; eaters++; ate.add(m.id); const md = s.month.dishes = s.month.dishes || {}; md[dish.name] = (md[dish.name] || 0) + 1; }
        }
        // 식사 효과 (C안): ① 발견한 요리 하나당 +2% (비전투 성공 확률·전투 공격력, 먹은 비율만큼) ② 먹은 요리의 능력치 +n% (먹은 사람만)
        // 2026-11-19 사용자 결정 (econ.mealMode 1): 요리 = 이번 의뢰 동안의 버프 — 먹은 사람의 요리 능력치 +val(고정값), 발견 수 보너스 없음. 의뢰가 끝나면 사라짐. 0 = 예전 C안
        const mealB = dish && !E.mealMode ? (eaters / party.length) * E.mealPerDish * Object.keys(s.dishes).length : 0;
        const sm = dish && dish.stats.length ? (a, k) => ate.has(a.id) && dish.stats.includes(+k) ? (E.mealMode ? 1 + dish.val / Math.max(1, finalStat(s, a, +k)) : 1 + dish.pct) : 1 : null;
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
        let ok = fight ? fight.win : s.R() < p, late = false; const rate = Math.round(pp * 100);
        { const L = s.cfg.late; if (L && L.on && !q.rq) { const pr = m => L.base + [0, 0.01, 0.04][m.spend] + [-0.01, 0, 0.03][m.social] + [-0.01, 0, 0.02][m.risk]; if (party.some(m => s.R() < Math.max(0, pr(m)))) { if (ok && L.soft) late = true; ok = false; } } }   /* 2026-11-18 결정 19 · 30: 늦장 = 기한을 넘겨 실패 (파티원마다 기본 late.base [임시] + 성향: 낭비 +4% · 사교적 +3% · 무모 +2% …), 늦장 실패는 명성 · 신뢰가 깎이지 않음. 리퀘스트 원정은 제외 */
        for (const m of party) { m.state = 'quest'; m.until = s.week + weeks; }
        party.forEach((m, i) => { const c = m.contract; if (!c || s.week < c.start || s.week > c.end) return; const used = Math.max(0, Math.floor(w0[i] - m.wallet)), back = Math.min(used, Math.max(0, c.sup - (c.supMonth || 0))); if (back > 0) { m.wallet += back; s.gold -= back; c.supMonth = (c.supMonth || 0) + back; s.month.csup = (s.month.csup || 0) - back; } });   // 금고 마이너스 허용(결정 7)
        s.active.push({ late, uid: s.uidNext++, rates: party.map(m => rateOf(s, m, q)), q, party: party.map(m => m.id), p, ok, rate, start: s.week, weeks, back: s.week + weeks, ate: eaters, dish: dish && eaters ? dish.name : null, fight });
        log(s, `${J(names(party), '이', '가')} ${qn(q)} ${q.rq ? '리퀘스트' : '의뢰'}를 맡아 떠났습니다.${eaters ? ` (출발 전 ${dish.name} ${eaters}명)` : ''}`, 'depart', { who: party.map(x => x.name) });
      }
    }
  }

  function returns(s) {
    const Q = s.cfg.quest, G = s.cfg.growth, A = s.cfg.adv, E = s.cfg.econ;
    const back = s.active.filter(x => x.back <= s.week); s.active = s.active.filter(x => x.back > s.week);
    for (const x of back) {
      if (x.uid != null) { if (s.settled[x.uid] != null) continue; s.settled[x.uid] = s.week; }   // 같은 원정은 한 번만 정산

      const party = x.party.map(id => s.advs.find(a => a.id === id));
      const q = x.q, F = x.fight; s.month.quests++; seeMons(s, q);
      const ok = x.ok != null ? x.ok : F ? F.win : s.R() < x.p;   // 예전 저장(출발 때 결과 없음)은 귀환 때 판정
      if (F) { s.stats.combat++; if (ok) s.stats.combatWin++; }
      const lv0 = s.qlv && q.tid && s.qlv[q.tid] ? s.qlv[q.tid].lv : null;   // 기억(qlv)용: 이번 귀환으로 의뢰 레벨이 올랐는지
      qlvAfter(s, q, ok);
      if (ok) {
        if (!q.self) s.subHalf = (s.subHalf || 0) + q.reward;   // 반기 보조금 실적: 외부 의뢰의 기본 보상(×2 전), 원정 번호당 한 번(정산 1회 보장), 길드 자가 발주 제외 (V2 결정 13)
        s.stats.done++; s.month.success++; s.month.popAdd = (s.month.popAdd || 0) + (s.cfg.town.perSuccess[q.g] || 0);   // 의뢰 성공 → 인구 (2026-11-13)
        const RW = q.reward * (q.x2 ? 2 : 1), DV = s.cfg.deco;   // ×2 의뢰는 골드만 2배 (명성·경험치는 그대로)
        const sp = econSplit(RW, x.rates && x.rates.length === party.length ? x.rates : party.map(m => rateOf(s, m, q)));   // 출발 때 수수료로 정산 (귀환 전 정책 변경 무시), 예전 저장은 지금 요율
        const fee = sp.guild + (hasDeco(s, 'bench') ? DV.gold : 0), resale = RW * E.resaleRate;   // 벤치 +5G는 중계 수입에 더함 · 소재 자동 차익은 4단계(E4-3)에서 정리
        s.gold += fee + resale; s.month.fee += fee; s.month.resale += resale;
        party.forEach((a, i) => { a.wallet += sp.net[i]; (a.earn = a.earn || []).push({ w: s.week, b: sp.base[i] }); a.earn = a.earn.filter(e => e.w > s.week - (s.cfg.contract ? s.cfg.contract.look : 8)); });   // earn: 최근 기준액 기록 (계약 수락 판단, 결정 5)
        for (const a of party) {
          a.done++;
          gainXp(s, a, G.xpBase * Math.pow(G.xpGradeMult, q.g) + (hasDeco(s, 'map') ? DV.xp : 0));
          a.stats[q.type] = Math.min(G.statCap, a.stats[q.type] + Q.subGrowth);
          a.attach = Math.min(100, a.attach + A.attachSuccess + (hasDeco(s, 'plant') ? DV.attach : 0));
          if (q.g >= a.grade + 1 || (q.g >= a.grade && a.grade === s.grade)) a.ach++;
          tryGradeUp(s, a);
        }
        s.trust = Math.min(100, s.trust + (q.trustS != null ? q.trustS : s.cfg.quest.trustSucc) + (hasDeco(s, 'boardDeco') ? DV.trust : 0));
        s.fame = Math.min(s.cfg.fame.cap, (s.fame || 0) + (q.fameS != null ? q.fameS : s.cfg.fame.succ[q.g]) + (hasDeco(s, 'banner') ? DV.fame : 0));
        // 소재 획득: 편집기 보상표 확률대로 (요리는 이제 식당에서 조합으로만 발견 — 예전 '토벌·사냥 성공 시 50% 해금'은 없앰)
        dropMats(s, q, party);
        if (hasDeco(s, 'locker')) { const T = QBYID[q.tid], b = T && (T.rewards || []).reduce((x, r) => (!x || r.p > x.p ? r : x), null); if (b) { s.mats[b.m] = (s.mats[b.m] || 0) + DV.mat; if (!s.knownMats[b.m]) { s.knownMats[b.m] = true; const m = MAT[b.m]; if (m) log(s, `처음 보는 소재를 얻었습니다: ${m.name}`, 'unlock'); } } }   // 사물함: 기본 소재 +1
        log(s, `${J(names(party), '이', '가')} ${qn(q)} 의뢰에 성공했습니다.${q.x2 ? ' (×2 보상)' : ''} 길드 수입 ${Math.round(fee + resale)}G.`, 'success', { who: party.map(x => x.name) });
      } else {
        s.stats.fail++; if (x.late) s.stats.late = (s.stats.late || 0) + 1; else { s.trust = Math.max(0, s.trust - (q.trustF != null ? q.trustF : s.cfg.quest.trustFail)); s.fame = Math.max(0, (s.fame || 0) - (q.fameF != null ? q.fameF : s.cfg.fame.fail[q.g])); }   // 늦장 실패: 명성 · 신뢰 그대로 (결정 30)
        for (const a of party) gainXp(s, a, G.xpBase * Math.pow(G.xpGradeMult, q.g) * G.xpFailRate);
        log(s, x.late ? `${J(names(party), '이', '가')} 늦장을 부리다 ${qn(q)} 의뢰의 기한을 넘겼습니다. (명성 · 신뢰는 그대로)` : `${J(names(party), '이', '가')} ${qn(q)} 의뢰에 실패했습니다.`, 'fail', { who: party.map(x => x.name) });
      }
      for (const a of party) { a.state = 'town'; a.until = 0; }
      if (q.rq) reqReturn(s, x, ok, party);   // 리퀘스트(지명) 귀환: 보상 · 실패 처리
      if (F) for (const u of F.units) {   // 전투의 대가: 물약 소모, 쓰러진 사람은 사망 판정 → 살면 부상
        const a = party.find(m => m && m.id === u.id); if (!a) continue;
        a.pots = u.pots; s.stats.potions += u.used;
        if (!u.down) continue;
        s.stats.injuries++;
        const d = (q.death != null ? q.death : Q.deathBase[q.g]) * CB.C.deathRisk[a.risk] * (1 - 0.15 * Math.min(1, effN(s, '의무실')));
        if (s.R() < d) { a.alive = false; a.dead = true; a.state = 'dead'; s.stats.deaths++; log(s, `${J(a.name, '이', '가')} ${qn(q)} 의뢰에서 쓰러져 돌아오지 못했습니다.`, 'death', { who: [a.name] }); continue; }
        const wk = Math.max(1, CB.C.injuryWeeks[q.g] - (s.built['의무실'] ? CB.C.injuryClinic : 0) - (hasDeco(s, 'fireplace') ? s.cfg.deco.injury : 0));   // 벽난로 −1주
        a.state = 'injured'; a.until = s.week + wk; a.injuredAt = s.week; a.injuredFrom = q.name || `${GR[q.g]}급 ${QTYPE[q.type]} 의뢰`;   // 모험가 팝업 오버 창용
        log(s, `${J(a.name, '이', '가')} 전투에서 쓰러져 부상을 입었습니다. ${wk}주 동안 쉽니다.`, 'injury', { who: [a.name] });
      }
      memQuest(s, x, ok, party, lv0);   // 2026-11-18 모험가 기억 (대사용, 규칙 영향 없음)
    }
  }


  // ---------- 계약 모험가 (경제 개편 V2 2 · 3단계 · 결정표 docs/design/economy_v2_decisions.md, 수치는 balance.csv contract.* [임시]) ----------
  const CCF = s => s.cfg.contract;
  const cActive = (s, a) => !!(a && a.alive && a.contract && s.week >= a.contract.start && s.week <= a.contract.end);
  const cCallsLeft = (s, a) => { const C = CCF(s), c = a.contract; return c ? C.callMax - c.calls.filter(w => w > s.week - C.callWin).length : 0; };
  const cPastEnd = (s, a, weeks) => !!(a && a.contract && !a.contract.next && s.week + (weeks || 1) > a.contract.end);   // 결정 9: 돌아오는 주가 계약 끝을 넘음 (갱신이 정해져 있으면 괜찮음)
  const contractOpen = s => !!s.built['집무실'];   // 결정 2: F급 + 집무실
  const contractedN = s => s.advs.filter(a => a.alive && a.contract).length;
  function earnMonthly(s, a) { const C = CCF(s), L = (a.earn || []).filter(e => e.w > s.week - C.look); return Math.floor(L.reduce((t, e) => t + e.b, 0) * WPM / C.look); }   // 최근 8주 기준액 → 한 달치
  const contractDefault = s => { const C = CCF(s); return { weeks: C.weeks, rate: C.rate, pay: C.pay, sup: C.sup }; };
  function contractWhy(s, a) {   // 계약을 제안할 수 없는 까닭 (없으면 null)
    const C = CCF(s);
    if (!contractOpen(s)) return '집무실을 지으면 계약할 수 있습니다';
    if (!a || !a.alive) return '길드에 없는 모험가입니다';
    if (a.contract) { if (a.contract.next) return '다음 계약이 이미 정해져 있습니다'; if (s.week < a.contract.end - 1) return `계약 중입니다 (끝나기 2주 전부터 갱신할 수 있어요)`; }
    else if (contractedN(s) >= C.slots) return `계약 정원(${C.slots}명)이 찼습니다`;
    if (a.attach < C.minAttach) return `애착 ${C.minAttach} 이상이어야 합니다`;
    if ((a.done || 0) < C.minDone) return `의뢰 성공 ${C.minDone}회 이상이어야 합니다`;
    if (s.gold < 0) return '금고 적자 — 금고가 0G 이상이 되면 계약할 수 있어요';   // 결정 7
    return null;
  }
  function contractTermsWhy(s, t) {
    const C = CCF(s), inR = (v, lo, hi, st) => Number.isInteger(v) && v >= lo && v <= hi && v % st === 0;
    if (!C.weeksOpt.includes(t.weeks)) return '계약 기간은 ' + C.weeksOpt.join(' · ') + '주 중에서 고릅니다';
    if (!C.rateOpt.some(r => Math.abs(r - t.rate) < 1e-9)) return '길드 몫은 ' + C.rateOpt.map(r => Math.round(r * 100) + '%').join(' · ') + ' 중에서 고릅니다';
    if (!inR(t.pay, 0, C.payMax, C.step)) return `월 보수는 0~${C.payMax}G, ${C.step}G 단위입니다`;
    if (!inR(t.sup, 0, C.supMax, C.step)) return `지원 한도는 0~${C.supMax}G, ${C.step}G 단위입니다`;
    return null;
  }
  function contractEval(s, a, t) {   // 결정 5 복합식: 계약 쪽 월수입 ≥ 자유 쪽 월수입 × 요구 비율 → 수락 (같은 조건은 늘 같은 답)
    const C = CCF(s), B = earnMonthly(s, a), free = Math.floor(B * (1 - feeRate(s)) + 1e-9);
    const offer = Math.floor(B * (1 - t.rate) + 1e-9) + t.pay + Math.floor(t.sup * C.supUse);
    const ratio = 1 - C.attachAdj * Math.max(0, Math.min(70, a.attach - 30)) / 70 + (C.spendReq[a.spend] - 1) + (C.riskReq[a.risk] - 1) + (C.socialReq[a.social] - 1);
    const need = Math.floor(free * ratio + 1e-9);
    const mood = offer >= need * (1 + C.maybe) ? 'yes' : offer > need * (1 - C.maybe) ? 'maybe' : 'no';   // 화면은 3단계만 (정수 원칙)
    return { base: B, free, offer, need, ok: offer >= need, mood };
  }
  function contractPropose(s, aid, terms) {
    const a = s.advs.find(x => x.id === aid), why = contractWhy(s, a); if (why) return { ok: false, why };
    const t = Object.assign(contractDefault(s), terms || {}), tw = contractTermsWhy(s, t); if (tw) return { ok: false, why: tw };
    const e = contractEval(s, a, t);
    if (!e.ok) return { ok: false, mood: e.mood, line: e.mood === 'maybe' ? '음… 조금만 더 생각해 볼게요. 조건이 살짝 아쉬워요.' : '이 조건이면 혼자 일하는 게 낫겠어요.' };
    const c = { weeks: t.weeks, rate: t.rate, pay: t.pay, sup: t.sup };
    if (a.contract) { a.contract.next = c; log(s, `${J(a.name, '이', '가')} 계약을 갱신했습니다. (${t.weeks}주 · 길드 몫 ${Math.round(t.rate * 100)}% · 월 ${t.pay}G)`, 'grow', { who: [a.name] }); }
    else { a.contract = Object.assign(c, { start: s.week, end: s.week + t.weeks - 1, calls: [], wk: 0, supMonth: 0, since: s.week }); (a.career = a.career || []).push({ week: s.week, text: `길드와 ${t.weeks}주 계약` }); log(s, `${J(a.name, '이', '가')} 길드의 계약 모험가가 되었습니다. (${t.weeks}주 · 길드 몫 ${Math.round(t.rate * 100)}% · 월 ${t.pay}G · 지원 ${t.sup}G)`, 'grow', { who: [a.name] }); }
    return { ok: true, mood: e.mood, line: '좋아요, 마스터. 잘 부탁드려요.' };
  }
  function contractPay(s, a, why) {   // 근무한 주만큼 보수 지급 (금고 마이너스 허용, 결정 7)
    const c = a.contract; if (!c || !c.wk) return 0;
    const due = Math.floor(c.pay * c.wk / WPM); c.wk = 0; if (!due) return 0;
    s.gold -= due; s.month.cpay = (s.month.cpay || 0) - due; if (a.alive) a.wallet += due;
    return due;
  }
  function contractWeekly(s) {
    for (const a of s.advs) {
      const c = a.contract; if (!c) continue;
      if (!a.alive) { contractPay(s, a); log(s, `${a.name}의 계약이 끝났습니다.`, 'sys'); a.contract = null; continue; }   // 사망 · 떠남: 근무분 정산, 위로금은 미정(E3-6)
      if (s.week >= c.start && s.week <= c.end) c.wk = (c.wk || 0) + 1;
      if (s.week >= c.end) {   // 이번 주가 마지막 주: 근무분 정산 뒤 갱신 또는 종료
        contractPay(s, a);
        if (c.next) { const n = c.next; a.contract = Object.assign(n, { start: c.end + 1, end: c.end + n.weeks, calls: c.calls, wk: 0, supMonth: c.supMonth, since: c.since }); log(s, `${a.name}의 새 계약이 시작됩니다. (${n.weeks}주)`, 'grow', { who: [a.name] }); }
        else { a.contract = null; (a.career = a.career || []).push({ week: s.week, text: '계약 끝 · 자유 모험가로' }); log(s, `${a.name}의 계약이 끝나 자유 모험가가 되었습니다.`, 'sys', { who: [a.name] }); }
      }
    }
  }
  function contractMonthly(s) {
    const mk = Math.floor(s.week / WPM); s.paidMonth = s.paidMonth || {};
    for (const a of s.advs) { const c = a.contract; if (!c || !a.alive) continue; const key = a.id + ':' + mk; if (s.paidMonth[key]) continue; s.paidMonth[key] = 1; contractPay(s, a); c.supMonth = 0; }   // 같은 달은 한 번만 (결정 9 · E1-6)
    for (const k in s.paidMonth) if (+k.split(':')[1] < mk - 3) delete s.paidMonth[k];
  }

  function monthly(s) {
    const E = s.cfg.econ, A = s.cfg.adv, T = s.cfg.town, GE = s.cfg.gear;
    if (E.subsidyMode === 1) {   // 2026-11-17 V2 결정 13: 6 · 12월 말 반기 지급 = 반기 동안 성공한 외부 의뢰 기본 보상 합 × 50% [임시]
      if ((s.week / WPM) % (E.subsidyEvery || 6) === 0) { /* 2026-11-18 결정 23: 지급 간격(달) — 1 = 4주마다 [임시], 6 = 반기 */ const pay = Math.floor((s.subHalf || 0) * (E.subsidyRate != null ? E.subsidyRate : 0.5) + 1e-9); s.gold += pay; s.month.subsidy += pay; s.month.subsidyBase = s.subHalf || 0; s.subHalf = 0; }
    } else { s.gold += E.subsidy[s.grade]; s.month.subsidy += E.subsidy[s.grade]; }   // 예전: 등급별 매달 고정
    if (s.settled) for (const k in s.settled) if (s.settled[k] < s.week - 12) delete s.settled[k];
    consignMonthly(s);   // 위탁품 판매 정산 (결정 12)
    contractMonthly(s);   // 계약 보수: 이번 달 근무 주만큼 월말 1회 지급 (결정 4 · 7)   // 정산 기록은 12주만 보관 (원정은 길어야 3주)
    const inTown = s.advs.filter(a => a.alive && a.state !== 'quest').length;
    s.month.inTown = inTown;   // 주점 매출은 2026-11-12부터 매주 술 1잔 단위 (departures 끝)
    let up = 0; for (const f of Object.keys(s.built)) up += (FAC_COST[f] != null ? E.buildCost[FAC_COST[f]] : 0) * E.upkeepRate;
    s.gold -= up; s.month.upkeep -= up;
    if (s.req && s.req.popMonthly) s.month.popAdd = (s.month.popAdd || 0) + s.req.popMonthly;   // 리퀘스트 보상: 매달 인구 +N (영구)
    townMonthly(s);   // 2026-11-13: 정수 가산형 인구 + 민가
    for (const a of s.advs) if (a.alive && a.state !== 'quest') a.attach = Math.min(100, a.attach + A.attachPerMonthInTown * 0.5);
    for (const a of s.advs) if (a.alive && a.attach < A.leaveAttach && s.week - a.joined > A.leaveAfterYears * WPY && a.state !== 'quest') { a.alive = false; log(s, `${J(a.name, '이', '가')} 이 마을을 떠났습니다. (애착도 ${Math.round(a.attach)})`, 'leave', { who: [a.name] }); }
    // 새 모험가: 2026-11-17부터 명성 fameStep(5)마다 1명(fameArrivals, 매주). fameStep이 0일 때만 예전 확률 방식 = 기본 × 신뢰도 보정(0.7~1.3) × 명성 보정(1~1.6)
    if (!A.fameStep) { const F = s.cfg.fame, lam = A.arrivalPerMonth * (0.7 + 0.6 * s.trust / 100) * (1 + F.maxBonus * Math.min(1, (s.fame || 0) / F.full));
    let k = Math.floor(lam); if (s.R() < lam - k) k++;
    for (let i = 0; i < k && s.advs.filter(x => x.alive).length < advCap(s); i++) spawnAdv(s, {}); }   // 등급 상한이 차면 새 모험가는 오지 않는다
    // 장비 구매 (2026-11-18 대장간): 한 달에 1칸씩, 다음 칸 값 × (1 + 저축 성향 × 0.5)이 모이면 삼. 손님 기록은 대장간 진열대에 보임
    s.smithLog = (s.smithLog || []).filter(x => x.w > s.week - WPM * 3);
    for (const a of s.advs) {
      if (!a.alive || (GE.needSmith && !(s.townUnlock || {}).smith)) continue;   // 2026-11-19: 대장간(리퀘스트 「떠돌이 대장장이」)이 생기기 전에는 장비를 사지 않음
      const n = eqNext(s, a); if (!n) continue;
      const need = n.price * (1 + GE.reserveMult[a.spend] * 0.5);
      if (a.wallet >= need) { a.wallet -= n.price; if (n.k < 0) { for (let k = 0; k < 3; k++) setEq(a, k, n.g); } else setEq(a, n.k, n.g); s.smithLog.unshift({ w: s.week, id: a.id, k: n.k, g: n.g, price: n.price, t: 'buy' }); log(s, `${J(a.name, '이', '가')} ${GR[n.g]}급 ${n.k < 0 ? '장비' : EQ_NAME[n.k]}를 샀습니다. (${Math.round(n.price)}G)`, 'grow', { who: [a.name] }); }
      else if (a.wallet >= need * 0.6) s.smithLog.unshift({ w: s.week, id: a.id, k: n.k, g: n.g, price: n.price, t: 'look', have: Math.floor(a.wallet), need: Math.ceil(need) });
    }
    if (s.smithLog.length > 30) s.smithLog.length = 30;
    proposeClasses(s);
    const net = s.month.fee + s.month.resale + s.month.meal + s.month.tavern + s.month.subsidy + s.month.upkeep + s.month.other + (s.month.reqIn || 0) + (s.month.scout || 0) + (s.month.prep || 0) + (s.month.cpay || 0) + (s.month.csup || 0) + (s.month.matBuy || 0) + (s.month.consign || 0) + (s.month.order || 0) + (s.month.gift || 0) + (s.month.shop || 0);   // 4단계: 소재 매입(음수) · 위탁 수수료   // 2026-11-17 V2: 계약 보수 · 지원(음수)   // 2026-11-16: 리퀘스트 보상(납품 금화) · 지명 섭외비 포함
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
  // 설비 해금 (2026-11-13 사용자 결정): 처음엔 테이블 2세트만, 테이블 3·4세트와 장식 8종은 서브 퀘스트(리퀘스트) 보상으로 열림 (docs/design/named_sub_quest_v1.md 보상 연동 메모)
  const unlockOf = s => (s.unlock = s.unlock || { table: 2, deco: {} });
  const capOf = (s, id) => { const d = DECO_BY[id]; if (!d) return 0; const u = unlockOf(s); return id === 'table' ? Math.min(d.max, u.table) : (u.deco[id] ? d.max : 0); };
  function unlockReward(s, id) {   // 서브 퀘스트 보상 연결 자리: 'table' = 테이블 1세트 더 (최대 4) / 장식 id = 그 장식 열기
    const u = unlockOf(s), d = DECO_BY[id]; if (!d) return false;
    if (id === 'table') { if (u.table >= d.max) return false; u.table++; log(s, `테이블을 ${u.table}세트까지 놓을 수 있게 되었습니다.`, 'unlock'); return true; }
    if (u.deco[id]) return false; u.deco[id] = true; log(s, `새 장식을 얻었습니다: ${d.name}`, 'unlock'); return true;
  }
  function placeBuy(s, id, p) {
    const d = DECO_BY[id]; if (!d) return false;
    const cap = capOf(s, id); if (!cap) { log(s, `${d.name}은(는) 리퀘스트 보상으로 열립니다.`, 'sys'); return false; }
    if (placedN(s, id) >= cap) { log(s, `${d.name}은(는) 지금 ${cap}개까지 놓을 수 있습니다.`, 'sys'); return false; }
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
    if (!first) autoSell(s);
    const tc = capOf(s, 'table'), want = first ? 2 : (placedN(s, 'table') < tc && s.gold - 200 >= 1000 ? 1 : 0);   // 테이블 상한 = 해금된 세트 수 (처음 2)
    for (let k = 0; k < want; k++) { const spot = OLD_TABLES.find(([gx, gy]) => placeOk(s, 'table', { gx, gy })); if (!spot || s.gold < 200 || placedN(s, 'table') >= tc) break; placeBuy(s, 'table', { gx: spot[0], gy: spot[1] }); }
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


  // ===== 서브 퀘스트 (리퀘스트) · 지명 (2026-11-16, docs/design/sub_quest_F_v1.md · nomination_v1.md 7장) =====
  // 데이터: data/named_quests.csv · quest_lines.csv → GAME_DATA.namedQuests · questLines
  // 규칙: 매주 조건을 채운 퀘스트 중 하나가 50%로 등장(동시에 4개) · 마감 없음 · 계절 퀘스트는 그 계절에만 진행(사라지지 않음) · 실패해도 다시 도전
  // 2026-11-16 결정: 리퀘스트는 거절 없음(화면에서 [거절] 뺌, reqRefuse 규칙 코드는 남김) · 받은 부탁은 사라지지 않고 쌓임(maxOpen = Infinity)
  // 지명: 파티 중 1명만 조건 능력치 충족 · 수락 = 애착 단계 × 위험 · 거절해도 다음 주에 다시 지명 · 보상은 게시판처럼 보수 몫 · 대열은 자동(직업 순)
  const NQ = GD.namedQuests || [], NQ_BY = Object.fromEntries(NQ.map(d => [d.id, d])), QLINES = GD.questLines || {};
  const REQ_CFG = { maxOpen: Infinity, appear: 0.5, refuseCool: 12, base: [0.40, 0.65, 0.90, 1.00], riskMul: [[1.0, 0.8, 0.5], [1.0, 1.0, 0.8], [1.0, 1.1, 1.2]], rowOrder: [0, 4, 1, 3, 2], bossHp: 3, bossAtk: 1.3, autoReserve: 400, autoSend: 0.6 };
  const REQ_QTYPE = { hunt: 0, search: 2 }, REQ_QTYPE_BY = { f_req_bat05: 3, f_req_srch04: 1, f_req_srch01: 3, f_req_srch05: 3, f_req_srch06: 3 };   // 미니 뷰 배경 · 성장 능력치용 의뢰 종류
  const SEASONS = ['spring', 'summer', 'autumn', 'winter'], SEASON_NAME = { spring: '봄', summer: '여름', autumn: '가을', winter: '겨울' };
  const seasonOf = w => { const mo = (2 + Math.floor(Math.max(0, w) / WPM)) % 12 + 1; return mo >= 3 && mo <= 5 ? 'spring' : mo >= 6 && mo <= 8 ? 'summer' : mo >= 9 && mo <= 11 ? 'autumn' : 'winter'; };   // 길드 · 마을 달력과 같음 (3월 시작)
  const reqOf = s => (s.req = s.req || { open: [], done: {}, cool: {}, popMonthly: 0, rng: ((s.seed >>> 0) ^ 0x9E3779B9) >>> 0, next: 1 });
  function reqR(s) { const q = reqOf(s); q.rng = (q.rng + 0x6D2B79F5) >>> 0; let t = q.rng; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }   // 게임 난수와 따로 굴림 (리퀘스트가 게시판 결과를 흔들지 않게)
  const aliveAdvs = s => s.advs.filter(a => a.alive);
  // 2026-11-16: 이번 주에 돌아오는 모험가(until <= 지금 주)는 지명할 수 있음 — 주 진행에서 귀환 → 지명 출발 → 게시판 출발 순서라, 막아 두면 의뢰를 이어 받는 모험가는 영영 지명할 수 없었음
  const reqBusy = (s, a) => a.state === 'quest' && a.until > s.week ? '원정 중' : (a.state === 'injured' && s.week < a.until) ? '부상' : null;
  const OWNER = {
    any: a => true, social40: a => a.social === 2 && a.attach >= 40, calm65: a => a.attach >= 65 && a.risk !== 2 && a.social !== 0, wild8: a => (a.risk === 2 || a.social === 0) && a.lv >= 8 };
  function reqOwnerFor(s, d) { if (!d.owner) return null; const used = new Set(reqOf(s).open.map(r => r.who).filter(Boolean)); return aliveAdvs(s).filter(a => OWNER[d.owner](a) && !used.has(a.id)).sort((x, y) => y.attach - x.attach || x.id - y.id)[0] || null; }
  function condOk(s, c) {
    const [k, op, v, n] = c, cmp = x => op === '=' ? x === v : x >= v;
    if (k === 'done') return !!reqOf(s).done[v];
    if (k === 'pop') return cmp(Math.round(s.pop)); if (k === 'fame') return cmp(Math.floor(s.fame || 0)); if (k === 'trust') return cmp(Math.floor(s.trust)); if (k === 'gold') return cmp(Math.floor(s.gold));
    if (k === 'advs') return cmp(aliveAdvs(s).length); if (k === 'tables') return cmp(placedN(s, 'table')); if (k === 'decos') return cmp(s.place.items.filter(it => it.id !== 'table').length);
    if (k === 'wins') return cmp(s.stats.combatWin || 0); if (k === 'dishes') return cmp(Object.keys(s.dishes || {}).length); if (k === 'social') return cmp(aliveAdvs(s).filter(a => a.social === 2).length);
    if (k === 'lv') return aliveAdvs(s).filter(a => a.lv >= v).length >= n;
    if (k.startsWith('stat.')) { const i = { str: 0, dex: 1, int: 2, wis: 3, tec: 4 }[k.slice(5)]; return aliveAdvs(s).some(a => Math.round(finalStat(s, a, i)) >= v); }
    if (k.startsWith('mat.')) return cmp(s.mats[k.slice(4)] || 0);
    return false;
  }
  const reqYear = w => Math.floor(w / WPY);
  function reqEligible(s, d) {   // 아직 나올 수 있는 퀘스트인가 (이미 열렸거나, 한 번만인데 끝났거나, 매년인데 올해 끝낸 것은 제외)
    const R = reqOf(s); if (R.open.some(r => r.key === d.id)) return false;
    const dn = R.done[d.id]; if (dn && (d.repeat !== 'yearly' || reqYear(dn.week) >= reqYear(s.week))) return false;
    return true;
  }
  function reqProgress(s, d) {   // [채운 조건 수, 전체 조건 수] — 힌트 순서 · 등장 판정
    let met = 0, tot = 0;
    for (const c of d.cond) { tot++; if (condOk(s, c)) met++; }
    if (d.season.length) { tot++; if (d.season.includes(seasonOf(s.week))) met++; }
    if (d.owner) { tot++; if (reqOwnerFor(s, d)) met++; }
    return [met, tot];
  }
  function reqHints(s, n) { return NQ.filter(d => reqEligible(s, d) && !((reqOf(s).cool[d.id] || 0) > s.week)).map(d => { const [m, t] = reqProgress(s, d); return { key: d.id, hint: d.hint, ratio: t ? m / t : 1, ready: m === t }; }).sort((x, y) => y.ratio - x.ratio).slice(0, n || 2); }
  const reqName = (s, r) => { const d = NQ_BY[r.key], a = r.who != null && s.advs.find(x => x.id === r.who); return d.name.replace('{이름}', a ? a.name : '모험가'); };
  const reqGiver = (s, r) => { const d = NQ_BY[r.key], a = r.who != null && s.advs.find(x => x.id === r.who); return d.npc === '{이름}' ? (a ? a.name : '모험가') : d.npc; };
  const reqLog = (s, r, ev, text, extra) => log(s, text, 'req', Object.assign({ rq: { key: r.key, ev, who: r.who != null ? r.who : null, name: reqName(s, r) } }, extra || {}));
  function reqAppear(s) {
    if (s.tut && !s.tut.base) return null;   // 2026-11-18 튜토리얼: 기본 튜토리얼이 끝날 때까지 리퀘스트는 튜토리얼이 직접 엶 (FT0006)
    const R = reqOf(s); if (!NQ.length || R.open.length >= REQ_CFG.maxOpen) return null;
    const cands = NQ.filter(d => reqEligible(s, d) && !((R.cool[d.id] || 0) > s.week) && (() => { const [m, t] = reqProgress(s, d); return m === t; })());
    if (!cands.length || reqR(s) >= REQ_CFG.appear) return null;
    const d = cands[Math.floor(reqR(s) * cands.length)], ow = reqOwnerFor(s, d);
    const r = { id: 'r' + (R.next++), key: d.id, state: 'open', stage: 1, who: ow ? ow.id : null, party: ow && d.party ? [ow.id] : [], refused: {}, at: s.week, isNew: true, fails: 0 };
    R.open.push(r);
    reqLog(s, r, R.done[d.id] && QLINES[d.id] && QLINES[d.id].req_y2 ? 'req_y2' : 'req', `${J(reqGiver(s, r), '이', '가')} 리퀘스트를 맡겼습니다: 「${reqName(s, r)}」`);
    return r;
  }
  const reqNominated = d => d.type === 'hunt' || d.type === 'search';
  function reqLock(s, r) {   // 지금 진행할 수 없는 까닭 (없으면 null)
    const d = NQ_BY[r.key];
    if (d.season.length && !d.season.includes(seasonOf(s.week))) return `${d.season.map(x => SEASON_NAME[x]).join(' · ')}에만 진행할 수 있습니다`;
    if (reqNominated(d) && !s.built['집무실']) return '집무실을 지으면 받을 수 있습니다';
    return null;
  }
  function reqGoalOk(s, d) { const m = /^(\w+)(>=|=)(\d+)$/.exec(d.goal || ''); return !!m && condOk(s, [m[1], m[2], +m[3], 1]); }
  function reqNeed(s, r) {   // 지금 단계에서 내야 하는 것: { gold, mats } (지명 · 설치는 비어 있음)
    const d = NQ_BY[r.key];
    if (d.type === 'donate') return { gold: d.cost.gold, mats: {} };
    if (d.type === 'deliver') return { gold: 0, mats: d.cost.mats };
    if (d.type === 'town') return r.stage === 1 ? { gold: 0, mats: d.cost.mats } : { gold: d.cost.gold2, mats: {} };
    return { gold: 0, mats: {} };
  }
  function reqCanPay(s, r) { const n = reqNeed(s, r); return s.gold >= n.gold && Object.entries(n.mats).every(([m, k]) => (s.mats[m] || 0) >= k); }
  function reqGive(s, rid) {   // 돈 내기 · 납품 (건물 해금은 1단계 납품 → 2단계 돈 내기)
    const R = reqOf(s), r = R.open.find(x => x.id === rid); if (!r || r.state !== 'open') return false;
    const d = NQ_BY[r.key]; if (!['donate', 'deliver', 'town'].includes(d.type) || reqLock(s, r) || !reqCanPay(s, r)) return false;
    const n = reqNeed(s, r);
    if (n.gold) { s.gold -= n.gold; s.month.build = (s.month.build || 0) - n.gold; (s.month.builds = s.month.builds || []).push({ f: '리퀘스트 「' + reqName(s, r) + '」', c: n.gold }); }   // 장부: 건설 · 설비 줄 (운영 순이익에는 넣지 않음)
    for (const [m, k] of Object.entries(n.mats)) s.mats[m] -= k;
    if (d.type === 'town' && r.stage === 1) { r.stage = 2; reqLog(s, r, 'ok', `「${reqName(s, r)}」 첫 부탁을 들어주었습니다. 다음 부탁: ${d.cost.gold2}G`); return true; }
    reqComplete(s, r, null); return true;
  }
  function reqRefuse(s, rid) {   // 마스터가 거절: 목록에서 빠지고 12주 뒤에 다시 올 수 있음
    const R = reqOf(s), k = R.open.findIndex(x => x.id === rid); if (k < 0 || R.open[k].state !== 'open') return false;
    const r = R.open.splice(k, 1)[0]; R.cool[r.key] = s.week + REQ_CFG.refuseCool; reqLog(s, r, 'refuse', `「${reqName(s, r)}」 리퀘스트를 거절했습니다.`); return true;
  }
  function reqComplete(s, r, party) {
    const R = reqOf(s), d = NQ_BY[r.key], rw = d.rw, nom = reqNominated(d), got = [];
    if (!nom) {   // 지명형의 금화 · 명성 · 신뢰도는 귀환 처리(게시판과 같은 길)에서 이미 반영
      if (rw.gold) { s.gold += rw.gold; s.month.reqIn = (s.month.reqIn || 0) + rw.gold; (s.month.reqs = s.month.reqs || []).push({ n: reqName(s, r), g: rw.gold }); got.push(rw.gold + 'G'); }
      if (rw.fame) s.fame = Math.min(s.cfg.fame.cap, (s.fame || 0) + rw.fame);
      if (rw.trust) s.trust = Math.min(100, s.trust + rw.trust);
    }
    if (rw.fame) got.push('명성 +' + rw.fame); if (rw.trust) got.push('신뢰도 +' + rw.trust);
    if (rw.pop) { s.month.popAdd = (s.month.popAdd || 0) + rw.pop; got.push('인구 +' + rw.pop); }
    if (rw.attach) { const [w, n] = rw.attach, list = w === 'all' ? aliveAdvs(s) : w === 'party' ? (party || []) : s.advs.filter(a => a.id === r.who); for (const a of list) if (a && a.alive) a.attach = Math.min(100, a.attach + n); got.push((w === 'all' ? '모든 모험가' : w === 'party' ? '참가자' : reqGiver(s, r)) + ' 애착 +' + n); }
    for (const [m, k] of Object.entries(rw.mats)) { s.mats[m] = (s.mats[m] || 0) + k; s.knownMats[m] = true; got.push((MAT[m] ? MAT[m].name : m) + ' ' + k); }
    const dn = R.done[d.id]; R.done[d.id] = { week: s.week, n: (dn ? dn.n : 0) + 1 };
    const k = R.open.indexOf(r); if (k >= 0) R.open.splice(k, 1);
    const ev = d.type === 'town' ? 'ok2' : dn && QLINES[d.id] && QLINES[d.id].ok_y2 ? 'ok_y2' : 'ok';
    reqLog(s, r, ev, `리퀘스트 「${reqName(s, r)}」 완료!${got.length ? ' (' + got.join(' · ') + ')' : ''}`);
    if (rw.unlock) unlockReward(s, rw.unlock);
    if (rw.town) { (s.townUnlock = s.townUnlock || {})[rw.town] = true; log(s, `마을에 새 건물이 생겼습니다: ${{ smith: '대장간', potion: '물약 상점' }[rw.town] || rw.town}`, 'unlock'); }
    const ex = rw.extra || {}, ow = s.advs.find(a => a.id === r.who);
    if (ex.popMonthly) { R.popMonthly += ex.popMonthly; log(s, `마을 인구가 매달 ${ex.popMonthly}명씩 더 늘어납니다.`, 'town'); }
    if (ex.recipe) { const dd = DISH.find(x => !s.dishes[x.name] && x.g <= s.grade); if (dd) { s.dishes[dd.name] = s.week; syncMeals(s); for (const m of dd.mats) s.knownMats[m] = true; log(s, `새 요리를 배웠습니다: ${dd.name}`, 'unlock'); } }
    if (ex.ownerStat && ow && ow.alive) { ow.stats[ow.core] = Math.min(s.cfg.growth.statCap, ow.stats[ow.core] + ex.ownerStat); log(s, `${ow.name}의 ${STATS[ow.core]}이(가) ${ex.ownerStat} 올랐습니다.`, 'grow', { who: [ow.name] }); }
    if (ex.ownerXp && ow && ow.alive) gainXp(s, ow, ex.ownerXp);
  }
  // ----- 지명 -----
  const scoutFee = (s, r, a) => a.id === r.who || cActive(s, a) ? 0 : ((s.cfg.econ.scoutFee || [])[a.grade] || 0);   // 계약 모험가는 섭외비 0 (결정 1)   // 지명 섭외비: 모험가 등급별, 부탁할 때마다 (거절당해도 나감). 의뢰한 본인은 없음
  function reqChance(s, r, a) { const d = NQ_BY[r.key]; if (a.id === r.who) return 1; if (cActive(s, a) && cCallsLeft(s, a) > 0) return 1; /* 계약 모험가: 4주에 2번까지 거절 없음 (결정 1 · 6) */ return Math.min(1, REQ_CFG.base[attachTier(a)] * REQ_CFG.riskMul[a.risk][d.risk]); }
  const reqStatI = (s, r, a) => { const d = NQ_BY[r.key]; if (!d.req) return null; if (d.req[0] >= 0) return d.req[0]; if (d.req[0] === -2) return a ? a.core : 0; const ow = s.advs.find(x => x.id === r.who); return ow ? ow.core : 0; };   // req[0]: 0~4 능력치 · -1 의뢰한 본인 · -2 주력 능력치(직업 무관)
  function reqMeets(s, r, a) { const d = NQ_BY[r.key]; if (!d.req) return true; if (d.req[0] === -1) return a.id === r.who; return Math.round(finalStat(s, a, d.req[0] === -2 ? a.core : d.req[0])) >= d.req[1]; }
  const reqSorted = party => party.slice().sort((x, y) => REQ_CFG.rowOrder.indexOf(x.core) - REQ_CFG.rowOrder.indexOf(y.core));   // 대열: 항상 자동(직업 순 — 전사 · 도적 · 궁수 · 성직자 · 마법사)
  function reqQuest(s, r, peek) {   // 지명 퀘스트를 게시판 의뢰와 같은 모양으로 만듦 (peek: 예상 성공률 계산용, 번호를 쓰지 않음)
    const d = NQ_BY[r.key], si = reqStatI(s, r);
    const q = { id: peek ? -1 : s.nextId++, g: 0, type: REQ_QTYPE_BY[d.id] != null ? REQ_QTYPE_BY[d.id] : REQ_QTYPE[d.type], req: [si == null ? 0 : si], r: d.r || s.cfg.quest.ref[0], reward: d.rw.gold, posted: s.week,
      name: reqName(s, r), weeks: d.weeks, fameS: d.rw.fame, fameF: 0, trustS: d.rw.trust, trustF: 1, death: d.risk >= 2 ? null : 0, rq: r.id, rqKey: d.id };
    if (q.death == null) delete q.death;
    if (d.type === 'hunt' && COMBAT) {
      q.enemies = []; q.seen = [];
      for (const f of d.foes) { const M = (GD.content.monsters || []).find(m => m.id === f.mon); if (!M) continue;
        for (let k = 0; k < f.count; k++) { const e = { hp: M.hp * (f.boss ? REQ_CFG.bossHp : 1), atk: M.atk * (f.boss ? REQ_CFG.bossAtk : 1), def: M.def || 0, name: f.name, mon: f.mon, boss: !!f.boss }; q.enemies.push(e); q.seen.push({ hp: e.hp, atk: e.atk, def: e.def, name: e.name, boss: e.boss }); } }
    }
    return q;
  }
  function reqPartyOf(s, r) { return r.party.map(id => s.advs.find(a => a.id === id)).filter(a => a && a.alive); }
  function reqPredict(s, rid) { const r = reqOf(s).open.find(x => x.id === rid); if (!r) return null; const party = reqSorted(reqPartyOf(s, r)); return party.length ? questP(s, party, reqQuest(s, r, true)) : null; }
  const reqOtherOf = (s, r, aid) => reqOf(s).open.find(o => o !== r && o.party.includes(aid) && (o.state === 'open' || o.state === 'queued' || o.state === 'active')) || null;   // 이 모험가가 들어가 있는 다른 리퀘스트
  function reqNomList(s, rid) {   // 지명 창 목록: 조건(★) · 상태 · 수락 확률
    const r = reqOf(s).open.find(x => x.id === rid); if (!r) return [];
    const d = NQ_BY[r.key];
    return aliveAdvs(s).map(a => ({ id: a.id, name: a.name, cls: a.cls, core: a.core, lv: a.lv, grade: a.grade, attach: Math.round(a.attach), stat: reqStatI(s, r, a) == null ? null : Math.round(finalStat(s, a, reqStatI(s, r, a))), need: d.req && d.req[0] !== -1 ? d.req[1] : null,
      meets: reqMeets(s, r, a), fee: scoutFee(s, r, a), other: (o => o ? reqName(s, o) : null)(reqOtherOf(s, r, a.id)), busy: reqBusy(s, a), chance: Math.round(reqChance(s, r, a) * 100), inParty: r.party.includes(a.id), refused: r.refused[a.id] === s.week, away: a.state === 'away', back: a.state === 'quest' && a.until <= s.week, owner: a.id === r.who }))
      .sort((x, y) => (y.owner - x.owner) || (y.inParty - x.inParty) || (y.meets - x.meets) || ((y.stat || 0) - (x.stat || 0)) || (x.id - y.id));
  }
  function reqNominate(s, rid, aid) {   // 누르면 그 자리에서 수락 · 거절이 정해짐. 다시 누르면 파티에서 뺌
    const r = reqOf(s).open.find(x => x.id === rid), a = s.advs.find(x => x.id === aid); if (!r || !a || r.state !== 'open') return { ok: false, why: '지금은 바꿀 수 없습니다' };
    const d = NQ_BY[r.key]; if (!reqNominated(d)) return { ok: false, why: '지명이 필요 없는 리퀘스트입니다' };
    const lock = reqLock(s, r); if (lock) return { ok: false, why: lock };
    if (r.party.includes(aid)) { if (aid === r.who) return { ok: false, why: '의뢰한 본인은 꼭 함께 갑니다' }; r.party = r.party.filter(x => x !== aid); return { ok: true, removed: true }; }
    // 2026-11-16 예약 지명: 원정 중 · 부상 중인 모험가도 부탁할 수 있음(수락 판정 · 섭외비는 지금). '마을 밖'은 예전처럼 바로 부탁 가능(그 주 길드에 없을 뿐)
    { const o = reqOtherOf(s, r, aid); if (o) return { ok: false, why: `${a.name}: 다른 리퀘스트 「${reqName(s, o)}」에 가기로 했습니다` }; }   // 2026-11-19: 한 모험가가 두 리퀘스트에 들어가지 않게 (섭외비 두 번도 막음)
    if (r.refused[aid] === s.week) return { ok: false, why: '이번 주에는 거절했습니다 (다음 주에 다시 부탁할 수 있어요)' };
    if (r.party.length >= d.party[1]) return { ok: false, why: '파티가 가득 찼습니다' };
    if (s.gold < 0) return { ok: false, why: '금고 적자 — 금고가 0G 이상이 되면 다시 부탁할 수 있어요' };   // 결정 7: 마이너스인 동안 지명 막힘
    if (cPastEnd(s, a, d.weeks)) return { ok: false, why: `${a.name}: 계약이 곧 끝나서 이번 일은 어렵겠는데요. (계약을 갱신하면 맡을 수 있어요)`, line: '계약이 곧 끝나서 이번 일은 어렵겠는데요.' };   // 결정 9
    const fee = scoutFee(s, r, a); if (s.gold < fee) return { ok: false, why: `섭외비 ${fee}G가 부족합니다` };
    if (fee) { s.gold -= fee; a.wallet += fee; s.month.scout = (s.month.scout || 0) - fee; s.month.scoutN = (s.month.scoutN || 0) + 1; }   // 결정 10: 섭외비는 부탁받은 모험가 지갑으로 (거절해도)   // 섭외비는 부탁하는 순간 나감 (거절당해도 돌려받지 않음)
    const yes = reqR(s) < reqChance(s, r, a) || !!r.tut;   // 튜토리얼 리퀘스트(FT0006)는 지명하면 꼭 수락
    if (yes && cActive(s, a)) a.contract.calls.push(s.week);
    if (yes) r.party.push(aid); else r.refused[aid] = s.week;
    remember(s, a, 'nomin', { yes, giver: reqGiver(s, r), q: reqName(s, r) });   // 기억 (대사용)
    const L = yes ? ['맡겨 주세요!', '좋아요, 가죠.', '마스터 부탁이라면야.'] : ['이번엔 좀…', '죄송해요, 다음에요.', '그건 내키지 않네요.'];
    return { ok: yes, asked: true, fee, line: L[Math.floor(reqR(s) * L.length)] };
  }
  function reqSendWhy(s, r) {   // 보낼 수 없는 까닭 (없으면 null)
    const d = NQ_BY[r.key], party = reqPartyOf(s, r), lock = reqLock(s, r);
    if (lock) return lock;
    if (mainBlocked(s)) return '침공 대비 중에는 출발할 수 없습니다';
    if (party.length < d.party[0]) return `${d.party[0]}명 이상 지명해야 합니다`;
    if (!party.some(a => reqMeets(s, r, a))) return '조건(★)을 채운 모험가가 1명 있어야 합니다';
    { const late = party.find(a => cPastEnd(s, a, d.weeks)); if (late) return `${late.name}의 계약이 끝나기 전에 돌아올 수 없습니다`; }   // 결정 9
    return null;   // 2026-11-16 예약 지명: 원정 중 · 부상 중인 파티원이 있어도 보낼 수 있음 → 모두 돌아온 주에 출발 (reqLaunch)
  }
  const reqWaitOf = (s, r) => reqPartyOf(s, r).filter(a => reqBusy(s, a));   // 예약: 아직 돌아오지 않은 파티원
  const reqReserved = (s, a) => reqOf(s).open.some(r => r.state === 'queued' && r.party.includes(a.id));   // 보내기를 누른 지명 파티의 예약자 = 돌아와도 게시판 의뢰를 받지 않고 기다림
  function reqSend(s, rid) { const r = reqOf(s).open.find(x => x.id === rid); if (!r || r.state !== 'open' || !reqNominated(NQ_BY[r.key]) || reqSendWhy(s, r)) return false; r.state = 'queued'; return true; }
  function reqUnsend(s, rid) { const r = reqOf(s).open.find(x => x.id === rid); if (!r || r.state !== 'queued') return false; r.state = 'open'; return true; }
  function reqLaunch(s) {   // 주 진행: 보내기로 한 지명 파티가 게시판보다 먼저 출발
    for (const r of reqOf(s).open) {
      if (r.state !== 'queued') continue;
      r.party = reqPartyOf(s, r).map(a => a.id);
      if (reqSendWhy(s, r)) { r.state = 'open'; log(s, `「${reqName(s, r)}」 지명 파티가 출발하지 못했습니다. (${reqSendWhy(s, r)})`, 'sys'); continue; }
      const wt = reqWaitOf(s, r);
      if (wt.length && r.auto) { r.state = 'open'; delete r.auto; log(s, `「${reqName(s, r)}」 지명 파티가 출발하지 못했습니다. (${wt[0].name}: ${reqBusy(s, wt[0])})`, 'sys'); continue; }   // 자동 처리(관문 1 · 시뮬레이터와 같은 규칙)는 예약을 쓰지 않음
      if (wt.length) continue;   // 예약: 원정 · 부상에서 모두 돌아올 때까지 기다림
      delete r.auto;
      const party = reqSorted(reqPartyOf(s, r)), q = reqQuest(s, r, false);
      r.state = 'active'; r.qid = q.id; launchParty(s, q, party, questP(s, party, q));
    }
  }
  function reqReturn(s, x, ok, party) {
    const r = reqOf(s).open.find(y => y.id === x.q.rq); if (!r) return;
    if (ok) { reqComplete(s, r, party.filter(Boolean)); return; }
    r.state = 'open'; r.fails = (r.fails || 0) + 1; r.party = r.who != null ? [r.who] : []; delete r.qid;
    reqLog(s, r, 'fail', `리퀘스트 「${reqName(s, r)}」에 실패했습니다. 다시 도전할 수 있습니다.`);
  }
  function reqWeekly(s) {
    const R = reqOf(s);
    for (const r of R.open.slice()) {   // 의뢰한 모험가가 떠났거나 죽으면 그 리퀘스트는 사라짐
      if (r.who != null && r.state !== 'active') { const a = s.advs.find(x => x.id === r.who); if (!a || !a.alive) { R.open.splice(R.open.indexOf(r), 1); log(s, `「${reqName(s, r)}」 리퀘스트가 사라졌습니다. (의뢰한 모험가가 길드에 없음)`, 'sys'); continue; } }
      const d = NQ_BY[r.key]; if (d.type === 'install' && r.state === 'open' && reqGoalOk(s, d)) reqComplete(s, r, null);   // 설치 요청: 놓으면 완료
    }
    reqLaunch(s);
    reqAppear(s);
  }
  function reqCheck(s) { const R = reqOf(s); let n = 0; for (const r of R.open.slice()) { const d = NQ_BY[r.key]; if (d.type === 'install' && r.state === 'open' && reqGoalOk(s, d)) { reqComplete(s, r, null); n++; } } return n; }   // 화면에서 설비를 놓은 직후 확인용
  function reqView(s) {   // 화면용 목록
    return reqOf(s).open.map(r => { const d = NQ_BY[r.key]; return { r, d, name: reqName(s, r), giver: reqGiver(s, r), lock: reqLock(s, r), need: reqNeed(s, r), canPay: reqCanPay(s, r), nominated: reqNominated(d), goalOk: d.type === 'install' ? reqGoalOk(s, d) : null }; });
  }
  // 검증용 자동 처리 (관문 1 · 개발 패널): 시뮬레이터 reqPolicy와 같은 규칙. 돈 내기는 내고도 1,500G가 남을 때, 납품은 소재가 있을 때,
  // 지명은 집무실(없으면 같은 여유 기준으로 지음)에서 조건을 채운 모험가부터 예상 성공률이 60%를 넘을 때까지 불러 보냄
  function autoRequests(s) {
    autoMain(s);
    const R = reqOf(s), keep = REQ_CFG.autoReserve;
    for (const r of R.open.slice()) {
      const d = NQ_BY[r.key]; if (r.state !== 'open') continue;
      if (reqNominated(d) && !s.built['집무실'] && s.gold - facCost(s, '집무실') >= keep) build(s, '집무실');
      if (reqLock(s, r)) continue;
      if (reqNominated(d) && mainBlocked(s)) continue;   // 침공 대비 주에는 지명하지 않음
      if (!reqNominated(d)) { const n = reqNeed(s, r); if ((n.gold || Object.keys(n.mats).length) && reqCanPay(s, r) && s.gold - n.gold >= keep) reqGive(s, r.id); continue; }
      r.party = r.party.filter(id => id === r.who || !reqBusy(s, s.advs.find(x => x.id === id) || {}));   // 그사이 다른 의뢰를 떠난 사람은 파티에서 뺌
      const rows = reqNomList(s, r.id).filter(x => !x.busy && !x.inParty && !x.refused).sort((x, y) => (y.meets - x.meets) || ((y.stat || 0) - (x.stat || 0)));
      for (const x of rows) {
        const party = reqPartyOf(s, r); if (party.length >= d.party[1]) break;
        if (party.length >= d.party[0] && party.some(a => reqMeets(s, r, a)) && reqPredict(s, r.id) >= REQ_CFG.autoSend) break;
        if (!x.meets && !party.some(a => reqMeets(s, r, a))) break;   // 조건(★)을 채울 사람부터 구한다: ★ 없이 다른 사람만 부르면 섭외비만 나감 (2026-11-16)
        if (s.gold - x.fee < keep) break;   // 섭외비를 내고도 여유가 남을 때만
        reqNominate(s, r.id, x.id);
      }
      if (!reqSendWhy(s, r) && !reqWaitOf(s, r).length && reqPredict(s, r.id) >= REQ_CFG.autoSend && reqSend(s, r.id)) r.auto = true;   // 자동 처리는 예약(밖에 있는 사람 기다리기)을 쓰지 않음 = 시뮬레이터 reqPolicy와 같음
    }
  }
  // ---------- F급 메인 퀘스트: 침공 "다리를 지켜라" (2026-11-16, docs/design/raid_invasion_v2.md) ----------
  // 리퀘스트를 need회 들어주면 등장(2026-11-16 15:04 결정: "리퀘스트 X회 + 메인 퀘스트 달성 시 승급") → 마스터가 받으면 lead주 뒤 침공 → 침공 1주 전부터 출발 금지
  // 침공: 차례마다 전투(체력을 다음 차례로 넘김), 차례 사이 정비(서 있는 사람 +rest, 쓰러진 사람 revive로 일어남),
  //       전멸하면 영주의 성이 버티는 동안 castle번 다시 일어나 남은 적과 싸움. 다 막으면 E급 승급, 성이 무너지면 실패(retry주 뒤 재도전)
  const MAIN_CFG = { need: 8, lead: 2, block: 1, retry: 4, rest: 0.3, revive: 0.4, castle: 1, group: 6, deathLoss: 0.01, popLoss: 0.1, trustLoss: 5, gold: 1000, fame: 10, autoAccept: 0.6, autoTrials: 20,
    waves: [{ mon: 'mon_04', n: 6, hp: 1.1, atk: 1.1, name: '늑대' }, { mon: 'mon_04', n: 6, hp: 1.43, atk: 1.32, name: '사나운 늑대' }, { mon: 'mon_04', n: 6, hp: 1.76, atk: 1.54, name: '흉포한 늑대' }, { mon: 'mon_05', n: 1, hp: 5.5, atk: 3.3, boss: true, name: '우두머리 늑대' }] };   // 2026-11-16: 재참전이 남은 적(남은 체력)과 싸우게 바뀌면서 쉬워져 전체 ×1.1 (바로 받을 때 첫 도전 승률 약 46%)
  const mainOf = s => (s.main = s.main || { state: 'none', at: null, tries: 0, cool: 0, offered: null, clear: null });   // state: none → offer → set → (done | cool → offer …)
  function mainFoes(w) { const M = (GD.content.monsters || []).find(m => m.id === w.mon) || { hp: 300, atk: 55, def: 20 }; return Array.from({ length: w.n }, () => ({ hp: M.hp * w.hp, atk: M.atk * w.atk, def: M.def || 0, name: w.name, mon: w.mon, boss: !!w.boss })); }
  const reqDoneN = s => Object.values(reqOf(s).done).reduce((t, x) => t + (x.n || 0), 0);   // 들어준 부탁 횟수
  const mainReady = s => reqDoneN(s) >= MAIN_CFG.need;
  const mainDefenders = (s, all) => aliveAdvs(s).filter(a => all ? !(a.state === 'injured' && a.until > s.week + MAIN_CFG.lead) : (a.state !== 'quest' && !(a.state === 'injured' && s.week < a.until)));
  const mainBlocked = s => { const M = s.main; return !!(M && M.state === 'set' && M.at - s.week <= MAIN_CFG.block); };   // 침공 1주 전: 모든 출발 금지
  // 한 차례 싸움 (2026-11-16 정리): U를 고쳐 씀. 전멸하면 영주의 성이 버티는 동안 st.castle < castle이면 모두 다시 일어나 남은 적(남은 체력 그대로)과 싸움
  //   wantLog면 화면용 구간 segs: fight(다리 앞 · 성 앞) · castle(성으로 밀림) · fall(성이 무너짐)
  function mainWaveFight(s, U, w, R, st, wantLog) {
    const C = MAIN_CFG, segs = []; let foes = mainFoes(C.waves[w]), at = 'bridge';
    for (;;) {
      const live = U.filter(u => !u.down && u.hp > 0);
      const seg = wantLog ? { kind: 'fight', at, wave: w, units: live.map(u => ({ id: u.a.id, hp: u.hp, maxHp: u.maxHp, core: u.core, pots: u.pots || 0 })), foes: foes.map(e => Object.assign({}, e)) } : null;
      const r = CB.fight(live, foes, C.group, R, 2, !!wantLog), by = new Map(r.units.map(u => [u.a, u]));
      for (const u of U) { const x = by.get(u.a); if (x) { u.hp = x.down ? 0 : x.hp; u.down = x.down; u.pots = x.pots; u.usedPots = (u.usedPots || 0) + (x.used || 0); } }
      for (const u of U) if (u.down) st.down.add(u.a.id);
      if (seg) { seg.log = r.log; seg.win = r.win; segs.push(seg); }
      if (r.win) return { win: true, segs };
      if (st.castle >= C.castle) { if (wantLog) segs.push({ kind: 'fall', wave: w }); return { win: false, segs }; }
      st.castle++;   // 전멸(또는 후퇴): 성이 맞는 동안 모두 다시 일어남
      const left = r.foesLeft || foes.map(e => e.hp);
      foes = foes.map((e, i) => Object.assign({}, e, { hp: left[i] })).filter(e => e.hp > 0);
      if (!foes.length) return { win: true, segs };
      if (wantLog) segs.push({ kind: 'castle', wave: w, foes: foes.map(e => Object.assign({}, e)) });
      for (const u of U) { u.hp = Math.max(u.down ? 0 : u.hp, u.maxHp * C.revive); u.down = false; }
      at = 'castle';
    }
  }
  const mainRest = U => { for (const u of U) { if (u.down) { u.hp = u.maxHp * MAIN_CFG.revive; u.down = false; } else u.hp = Math.min(u.maxHp, u.hp + u.maxHp * MAIN_CFG.rest); } };   // 차례 사이 정비
  function mainFight(s, defs, R) {   // 자동 · 예상용 (기록 없음): { win, wave(막은 차례 수), down:Set(쓰러진 적 있는 모험가 id), castle(성이 버틴 횟수) }
    const st = { castle: 0, down: new Set() }, U = reqSorted(defs).map(a => Object.assign(unitOf(s, a, 0), { pots: 0 }));
    if (!U.length) return { win: false, wave: 0, down: st.down, castle: 0 };
    for (let w = 0; w < MAIN_CFG.waves.length; w++) {
      if (!mainWaveFight(s, U, w, R, st, false).win) return { win: false, wave: w, down: st.down, castle: st.castle };
      if (w < MAIN_CFG.waves.length - 1) mainRest(U);
    }
    return { win: true, wave: MAIN_CFG.waves.length, down: st.down, castle: st.castle };
  }
  function mainPredict(s, n) {   // 예상 승률 (0~1): 지금 길드로 n번 모의. 게임 난수(s.R)는 쓰지 않음
    if (!COMBAT) return 0; const defs = mainDefenders(s, true); if (!defs.length) return 0;
    let a = (((s.seed >>> 0) ^ 0x51ED270B) + s.week * 7919) >>> 0, win = 0;
    const R = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let x = Math.imul(a ^ a >>> 15, 1 | a); x = x + Math.imul(x ^ x >>> 7, 61 | x) ^ x; return ((x ^ x >>> 14) >>> 0) / 4294967296; };
    for (let i = 0; i < (n || MAIN_CFG.autoTrials); i++) if (mainFight(s, defs, R).win) win++;
    return win / (n || MAIN_CFG.autoTrials);
  }
  function mainAccept(s) { const M = mainOf(s); if (M.state !== 'offer') return false; M.state = 'set'; M.at = s.week + MAIN_CFG.lead; log(s, `메인 퀘스트 「다리를 지켜라」를 받았습니다. ${MAIN_CFG.lead}주 뒤 몬스터가 다리로 쳐들어옵니다. 침공 ${MAIN_CFG.block}주 전부터는 의뢰 출발이 막힙니다.`, 'main'); return true; }
  function mainRun(s) {   // 자동 처리(검증 · 화면 없음): 한 번에 끝까지
    const defs = mainDefenders(s), r = mainFight(s, defs, s.R);
    mainFinish(s, defs, r.win, r.wave, r.down, r.castle);
  }
  function mainFinish(s, defs, win, wave, down, castle) {
    const M = mainOf(s), C = MAIN_CFG;
    M.tries++; M.last = { week: s.week, win, wave, n: defs.length, down: down.size, castle };
    const clinic = s.built['의무실'] ? CB.C.injuryClinic : 0, fire = hasDeco(s, 'fireplace') ? s.cfg.deco.injury : 0, dead = [];
    for (const a of defs) {
      if (!down.has(a.id) || !a.alive) continue;
      s.stats.injuries++;
      if (!win && s.R() < C.deathLoss) { a.alive = false; a.dead = true; a.state = 'dead'; s.stats.deaths++; dead.push(a.name); log(s, `${J(a.name, '이', '가')} 다리를 지키다 쓰러져 돌아오지 못했습니다.`, 'death', { who: [a.name] }); continue; }
      const wk = Math.max(1, CB.C.injuryWeeks[0] - clinic - fire);
      a.state = 'injured'; a.until = s.week + wk; a.injuredAt = s.week; a.injuredFrom = '메인 퀘스트 「다리를 지켜라」';
    }
    delete M.run;
    if (win) {
      M.state = 'done'; M.clear = s.week;
      const g0 = s.grade; s.grade = Math.max(s.grade, 1); openGrades(s, g0);
      s.gold += C.gold; s.month.reqIn = (s.month.reqIn || 0) + C.gold; (s.month.reqs = s.month.reqs || []).push({ n: '메인 퀘스트 「다리를 지켜라」', g: C.gold });
      s.fame = Math.min(s.cfg.fame.cap, (s.fame || 0) + C.fame);
      log(s, `몬스터를 모두 막아 냈습니다! ${castle ? '영주의 성까지 밀렸지만 다시 일어나 ' : ''}다리를 지켰습니다. (쓰러진 모험가 ${down.size}명)`, 'main');
      log(s, `길드가 E급으로 승급했습니다! 보상 ${C.gold}G · 명성 +${C.fame}. 모험가 관리소를 지을 수 있습니다.`, 'main');
      M.result = { win: true, gold: C.gold, fame: C.fame, down: down.size, castle };
    } else {
      const lost = Math.floor(s.pop * C.popLoss); s.pop -= lost; s.trust = Math.max(0, s.trust - C.trustLoss);
      M.state = 'cool'; M.cool = s.week + C.retry;
      log(s, `${C.waves[Math.min(wave, C.waves.length - 1)].boss ? '보스' : (wave + 1) + '차'} 공격을 막지 못해 영주의 성이 무너졌습니다. 인구 −${lost}명 · 신뢰도 −${C.trustLoss}. ${C.retry}주 뒤 다시 도전할 수 있습니다.`, 'main');
      M.result = { win: false, wave, pop: lost, trust: C.trustLoss, dead, retry: C.retry };
    }
  }
  // ---- 화면에서 보는 침공 (2026-11-16): 차례마다 멈추고 정비 창을 띄움. api.live가 켜져 있을 때만(게임 화면). 검증 · 시뮬레이터는 mainRun으로 한 번에
  function mainStart(s) {
    const M = mainOf(s), defs = reqSorted(mainDefenders(s));
    M.state = 'live'; M.run = { ids: defs.map(a => a.id), wave: 0, castle: 0, down: [], hp: {}, dn: {}, pots: {}, bought: 0, segs: null };
    log(s, `몬스터가 다리로 쳐들어옵니다! 모험가 ${defs.length}명이 다리를 지킵니다.`, 'main');
  }
  function mainUnits(s, run) {
    return run.ids.map(id => s.advs.find(a => a.id === id)).filter(a => a && a.alive).map(a => {
      const u = unitOf(s, a, 0), h = run.hp[a.id];
      u.hp = h == null ? u.maxHp : Math.min(u.maxHp, h); u.down = !!run.dn[a.id]; u.pots = run.pots[a.id] || 0; return u; });
  }
  function mainNextWave(s) {   // 다음 차례 하나: 화면용 구간을 돌려주고, 마지막이면 결과까지 반영
    const M = mainOf(s), run = M.run; if (M.state !== 'live' || !run) return null;
    const U = mainUnits(s, run), st = { castle: run.castle, down: new Set(run.down) }, w = run.wave;
    const r = mainWaveFight(s, U, w, s.R, st, true);
    for (const u of U) s.stats.potions += u.usedPots || 0;
    run.castle = st.castle; run.down = [...st.down];
    const last = w >= MAIN_CFG.waves.length - 1;
    if (r.win && !last) mainRest(U);
    for (const u of U) { run.hp[u.a.id] = u.hp; run.dn[u.a.id] = u.down; run.pots[u.a.id] = u.pots || 0; }
    run.segs = r.segs;
    if (!r.win || last) { const defs = run.ids.map(id => s.advs.find(a => a.id === id)).filter(Boolean); mainFinish(s, defs, r.win, r.win ? MAIN_CFG.waves.length : w, st.down, st.castle); stepWeekTail(s); return { segs: r.segs, wave: w, done: true, win: r.win }; }   // 끝나면 멈춰 둔 이 주의 나머지를 진행
    run.wave++;
    return { segs: r.segs, wave: w, done: false, win: true };
  }
  const mainPotPrice = () => (CB.C.potionPrice || [20])[0];
  function mainBuy(s, id, n) {   // 정비: 물약 사서 쥐여 주기 (금고에서). 한 사람 최대 3개
    const M = mainOf(s), run = M.run; if (!run || M.state !== 'live') return false;
    const price = mainPotPrice(), have = run.pots[id] || 0, k = Math.max(-have, Math.min(n, 3 - have));
    if (!k) return false;
    if (k > 0 && s.gold < price * k) return false;
    s.gold -= price * k; s.month.prep = (s.month.prep || 0) - price * k; s.month.prepN = (s.month.prepN || 0) + k;
    run.pots[id] = have + k; run.bought += k; return true;
  }
  function mainLiveView(s) {   // 정비 창용: 지금 모험가 상태 · 다음 차례 적
    const M = mainOf(s), run = M.run; if (!run) return null;
    const U = mainUnits(s, run), next = MAIN_CFG.waves[run.wave];
    return { wave: run.wave, total: MAIN_CFG.waves.length, castle: run.castle, castleMax: MAIN_CFG.castle, price: mainPotPrice(),
      units: U.map(u => ({ id: u.a.id, name: u.a.name, cls: u.a.cls, core: u.core, lv: u.a.lv, hp: Math.round(u.hp), maxHp: Math.round(u.maxHp), down: u.down, pots: u.pots })),
      next: next ? { name: next.name, n: next.n, boss: !!next.boss } : null };
  }
  function mainWeekly(s) {   // 주 진행: 귀환 뒤, 출발 전
    if (!COMBAT || s.grade > 0) return; const M = mainOf(s);
    if (M.state === 'none' && mainReady(s)) { M.state = 'offer'; M.offered = s.week; log(s, `부탁을 ${MAIN_CFG.need}번 들어준 길드에 영주의 전갈이 왔습니다: 메인 퀘스트 「다리를 지켜라」. 리퀘스트 장에서 받을 수 있습니다.`, 'main'); }
    else if (M.state === 'cool' && s.week >= M.cool) { M.state = 'offer'; log(s, '메인 퀘스트 「다리를 지켜라」에 다시 도전할 수 있습니다.', 'main'); }
    else if (M.state === 'set' && s.week >= M.at) { if (api.live) mainStart(s); else mainRun(s); }
  }
  function mainView(s) {   // 화면용
    const M = mainOf(s), C = MAIN_CFG;
    return { grade: s.grade, need: C.need, doneN: reqDoneN(s), state: M.state, at: M.at, left: M.state === 'set' ? Math.max(0, M.at - s.week) : null, blocked: mainBlocked(s), cool: M.state === 'cool' ? Math.max(0, M.cool - s.week) : null, tries: M.tries, last: M.last || null, clear: M.clear,
      lead: C.lead, block: C.block, gold: C.gold, fame: C.fame, popLoss: Math.round(C.popLoss * 100), trustLoss: C.trustLoss, retry: C.retry,
      waves: C.waves.map(w => ({ name: w.name, n: w.n, boss: !!w.boss })), defenders: mainDefenders(s, true).length, total: aliveAdvs(s).length };
  }
  function autoMain(s) { const M = mainOf(s); if (M.state === 'offer' && mainPredict(s) >= MAIN_CFG.autoAccept) mainAccept(s); }   // 검증용: 예상 승률이 autoAccept 이상이면 받음 (시뮬레이터와 같은 규칙)

  function stepWeek(s) {
    if (s.main && s.main.state === 'live') return;   // 침공을 보는 동안 시간은 멈춤
    expireQuests(s);
    generateQuests(s);   // 2026-11-12: 매주 게시 (예전에는 매달 초에만 = 월 유입의 1/4만 들어왔음)
    returns(s);
    mainWeekly(s);    // 메인 퀘스트(침공): 등장 · 침공 판정
    if (s.main && s.main.state === 'live') return;   // 화면에서 침공을 보는 중: 이 주의 나머지(지명 · 출발 · 주 넘김)는 침공이 끝난 뒤 stepWeekTail로
    stepWeekTail(s);
  }
  // 명성 방문 (2026-11-17 결정: 5마다, progression_v1 2-2 · HUD '다음 모험가까지 명성 N'과 같은 규칙): 명성이 fameStep의 배수(5 · 10 · 15…)에 처음 닿을 때마다 1명.
  //   상한(길드 등급별)이 차 있으면 기다렸다가 자리가 나면(승급 등) 옴. 명성이 깎였다가 다시 올라도 같은 칸은 한 번만. 예전 저장은 지금 명성까지는 이미 온 것으로 봄
  const fameStepOf = s => { const st = (s.cfg.adv || {}).fameStep; return Array.isArray(st) ? (st[Math.min(s.grade, st.length - 1)] || st[st.length - 1]) : st; };   // 지금 등급의 명성 간격
  function fameNextOf(s) { if (s.fameNext == null) { const st = fameStepOf(s) || 5; s.fameNext = (Math.floor((s.fame || 0) / st) + 1) * st; } return s.fameNext; }   // 다음 모험가가 오는 명성 (예전 저장은 지금 명성 다음 칸부터)
  function fameArrivals(s) {
    const st = (s.cfg.adv || {}).fameStep; if (!st) return;
    { const z = (s.cfg.adv || {}).zeroFameVisit || 0; if (z && (s.fame || 0) === 0 && s.week > 0 && s.week % z === 0 && s.advs.filter(x => x.alive).length < advCap(s)) spawnAdv(s, {}); }   // 2026-11-17 대책 ②: 명성 0인 동안 8주마다 1명 방문
    // 2026-11-18 결정 32: 등급별 명성 간격(F 6 · E 10 [임시]) · 상한이 차 있을 때 닿은 칸은 넘김(대기 없음 → 승급 때 몰려오지 않음)
    const nx = fameNextOf(s);
    while ((s.fame || 0) >= s.fameNext) { if (s.advs.filter(x => x.alive).length < advCap(s)) spawnAdv(s, {}); else if ((s.cfg.adv || {}).fameSkip === 0) break; else s.fameSkip = (s.fameSkip || 0) + 1; s.fameNext += fameStepOf(s); }   // adv.fameSkip 0 = 예전처럼 자리가 날 때까지 기다림
  }
  function stepWeekTail(s) {
    fameArrivals(s);
    s.seatUsed = 0;   // 이번 주 식사한 좌석 수
    contractWeekly(s);   // 계약 모험가: 근무 주 세기 · 끝난 계약 정산 (경제 개편 V2 3단계)
    resWeekly(s);     // 2026-11-19 V4 3단계: 사냥터 · 채집지 개체수 회복 · 너무 많으면 피해
    mktWeekly(s);     // 2026-11-19 V4 2단계: 소재 시세 (바깥 공급 · 마을 소비)
    kitchenWeekly(s); // 2026-11-19 V4 1단계: 식당이 이번 주 팔 그릇을 만듦 (재료 소모 · 양념 구매)
    reqWeekly(s);     // 리퀘스트: 등장 판정 · 설치 요청 확인 · 지명 파티 출발(게시판보다 먼저)
    if (!(s.tut && s.tut.noGo)) departures(s);   // 2026-11-18 튜토리얼: 첫 의뢰 ~ 첫 요리 동안은 게시판 출발을 막음 (모험가가 로비에 남아 대사를 받게)
    s.week++;
    if (s.week % WPM === 0) monthly(s);
  }
  function dateLabel(w) { const y = Math.floor(w / WPY) + 1, m = Math.floor((w % WPY) / WPM) + 1, wk = (w % WPM) + 1; return `${y}년차 ${m}월 ${wk}주`; }

  const api = { live: false, MEM, memOf, memSaid, relOf, relTier, relAdd, remember, qlvOf, tutPost, tutLaunch, tutSpawn, tutReq, eqOf, eqNext, EQ_NAME, smithWhy, smithGift, fameStepOf, fameNextOf, orderSources, orderPrice, orderWhy, orderPlace, orderCancel, orderBonus, orderEdit, questEta, resBand, resOf, baseMatOf, matPrice, mktMult, mktTrend, matPol, polRate, setMatPol, sellPreview, mktWeekly, orderLive, orderPriceOf, orderBiasOf, orderMultOpts, autoOrders, feeLock, SPICE, menuOf, setMenu, dishBase, priceK, stockOf, dishCost, shopPrice, kitchenWeekly, consignBuy, econSplit, rateOf, questFee, feeOptions, setGradeFee, setQuestFee, needsMoney, questEff, matSellPrice, matBuyPrice, sellMats, autoSell, contractOpen, contractWhy, contractTermsWhy, contractEval, contractPropose, contractDefault, earnMonthly, cActive, cCallsLeft, cPastEnd, reqWaitOf, reqReserved, mainStart, mainNextWave, mainBuy, mainLiveView, mainPotPrice, MAIN_CFG, mainView, mainAccept, mainPredict, mainBlocked, autoMain, scoutFee, NQ, NQ_BY, QLINES, REQ_CFG, SEASON_NAME, seasonOf, reqOf, reqView, reqHints, reqProgress, reqLock, reqNeed, reqCanPay, reqGive, reqRefuse, reqNomList, reqNominate, reqSendWhy, reqSend, reqUnsend, reqPredict, reqChance, reqMeets, reqCheck, reqName, reqGiver, reqPartyOf, autoRequests, HOUSE_SLOTS, housingCap, autoPlace, hasDeco, seatsOf, DECO, DECO_BY, placeOk, placeBuy, capOf, unlockReward, placeMove, placeDestroy, placedN, cellsOf, tablesOf, lobbyGrid: grid, expireWeeks, upgrade, upg, upgCost, facCost, UPG, advCap, CLASS2, CLASS3, ATTACH_TITLE, attachTier, lvCapOf, growthOf, promoOptions, decidePromotion, finalStat, serialize, deserialize, GR, STATS, CLASS1, QTYPE, RISK, SPEND, SOCIAL, WPM, WPY, FAC_COST, newGame, stepWeek, setFilter, withdrawQuest, build, debugSetGrade, successP, questP, isCombat, boardQuota, FILTER_W, FILTER_NAME, filterLevel, openGrades, cook, autoCook, debugKitchen, DISH, dateLabel, boardCap, feeRate, spawnAdv, log };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.GuildGame = api;
})(this);
