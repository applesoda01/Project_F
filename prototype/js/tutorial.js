/* 튜토리얼 (2026-11-18, docs/design/튜토리얼.md)
   - 대사: data/tutorial.csv → GAME_DATA.tutorial = { FT0001: [[구간1 줄들], [구간2 줄들]] }. 대사만 고칠 때는 csv만 고치고 tools/data_build.py
   - 상태: s.tut = { on, base(기본 튜토리얼 끝?), step(지금 번호), ph(그 안의 단계), seen{번호:주}, wid(첫 전사), aid(두 번째 모험가), qid, rid, noGo(게시판 출발 막음), pause }
   - 기본 튜토리얼: FT0001 → FT0002 → FT0003 → FT0004 → FT0005 → FT0008 → FT0009 → FT0006. 대화 · 안내 동안 시간 멈춤, 첫 원정 동안은 흐름
   - 상황별 안내: 기본이 끝난 뒤 매주 하나만 (조건은 SIT 표). 플레이를 막지 않고 버튼만 잠깐 빛남
   - 자동 플레이 · 시뮬레이터 · 관문 1은 s.tut이 없으므로 영향 없음 */
(function (root) {
  'use strict';
  const Gm = root.GuildGame;
  const T = { on: false };
  let getS = () => null, H = {}, timers = [], glowSel = null, glowUntil = 0, clock = 0, clickHook = null;

  // ---------- 화면: 빛나는 버튼 ----------
  const st = document.createElement('style');
  st.textContent = `@keyframes tutGlow{0%,100%{box-shadow:0 0 0 3px #ffd75e,0 0 14px 4px #ffcf3faa}50%{box-shadow:0 0 0 5px #fff1b0,0 0 26px 10px #ffcf3fdd}}
.tutGlow{animation:tutGlow 1.1s ease-in-out infinite!important;position:relative;z-index:12;border-radius:10px}
.tutHint{position:absolute;left:50%;top:138px;transform:translateX(-50%);z-index:36;background:#3b2a1ee6;color:#fff6dc;font:700 22px/1.4 inherit;font-family:inherit;padding:10px 26px;border-radius:14px;border:2px solid #ffd75e;pointer-events:none;opacity:0;transition:opacity .3s;white-space:nowrap}
.tutHint.on{opacity:1}.tutHint.shake{animation:tutShake .4s}@keyframes tutShake{25%{transform:translateX(-52%)}75%{transform:translateX(-48%)}}
#goalBox.tut{z-index:37;pointer-events:none;cursor:default;border:2px solid #d9a441;box-shadow:0 0 0 3px rgba(255,215,94,.35),0 3px 8px rgba(60,36,16,.22)}
#tutDim{position:absolute;left:0;top:0;width:1920px;height:1080px;z-index:35;pointer-events:none;display:none}#tutDim path{pointer-events:visiblePainted;cursor:not-allowed}`;
  document.head.appendChild(st);
  let hintEl = null;
  // 2026-11-19: 덮개 · 안내 글은 게임 화면 층(.stage-ui, 1920×1080을 창 크기에 맞춰 줄임) 안에 붙임. 전에는 #ui(없음) → body 에 붙어 창이 1920보다 작으면 구멍 자리가 어긋났음
  const layer = () => document.querySelector('.stage-ui') || document.body;
  function hint(text) {
    if (!hintEl) { hintEl = document.createElement('div'); hintEl.className = 'tutHint'; }
    if (!hintEl.isConnected) layer().appendChild(hintEl);   // 새 게임 · 불러오기로 화면이 다시 그려지면 다시 붙임
    if (text) { hintEl.textContent = text; hintEl.classList.add('on'); } else hintEl.classList.remove('on');
  }
  // 2026-11-19 사용자 결정(테스트 의견 1 · 6): 기본 튜토리얼 안내 중에는 누를 곳만 밝게, 나머지는 어둡게 덮고 눌러도 막음 (어두운 곳을 누르면 안내가 흔들림)
  //   어두운 정도 30% (11-19 시안 2: 80% → "너무 어둡다" → 30 · 45 · 60% 비교 뒤 사용자 결정 30%)
  //   화면 전체를 덮는 SVG 한 장에 빛나는 칸마다 구멍을 뚫음 (책 · 창 안의 칸도 됨). 배치 모드(테이블 놓기) · 대화 중 · 상황별 안내에서는 덮지 않음
  let dimEl = null, dimOn = false;
  function dimPaint(els) {
    const ui = layer();
    if (!dimEl) { dimEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); dimEl.id = 'tutDim'; dimEl.setAttribute('viewBox', '0 0 1920 1080');
      const pth = document.createElementNS('http://www.w3.org/2000/svg', 'path'); pth.setAttribute('fill', 'rgba(18,10,4,.3)'); pth.setAttribute('fill-rule', 'evenodd'); dimEl.appendChild(pth);
      pth.addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); if (hintEl) { hintEl.classList.remove('shake'); void hintEl.offsetWidth; hintEl.classList.add('shake'); } paintGlow(); });
    }
    if (!dimEl.isConnected) ui.appendChild(dimEl);
    if (!els || !els.length) { if (dimOn) { dimEl.style.display = 'none'; dimOn = false; } return; }
    const ur = ui.getBoundingClientRect(), k = ur.width / 1920 || 1;
    // 2026-11-19 안전장치: 밝힌 칸이 실제로 눌리는지(가운데를 찍어 그 요소가 맞는지) 보고, 하나도 안 눌리면 덮지 않음
    { const pe = dimEl.style.pointerEvents; dimEl.style.pointerEvents = 'none';
      const ok = els.some(el => { const r = el.getBoundingClientRect(); if (!r.width || !r.height) return false; const h = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!h && (h === el || el.contains(h)); });
      dimEl.style.pointerEvents = pe;
      if (!ok) { if (dimOn) { dimEl.style.display = 'none'; dimOn = false; } return; } }
    let d = 'M0 0H1920V1080H0Z';
    for (const el of els) { const r = el.getBoundingClientRect(); if (!r.width) continue; const x = (r.left - ur.left) / k - 6, y = (r.top - ur.top) / k - 6, w = r.width / k + 12, h = r.height / k + 12;
      d += `M${x.toFixed(1)} ${y.toFixed(1)}h${w.toFixed(1)}v${h.toFixed(1)}h${(-w).toFixed(1)}Z`; }
    dimEl.firstChild.setAttribute('d', d); if (!dimOn) { dimEl.style.display = 'block'; dimOn = true; }
  }
  function glow(sel, sec) { glowSel = sel; glowUntil = sec ? clock + sec : 0; paintGlow(); }
  function unglow() { glowSel = null; paintGlow(); }
  // 2026-11-19 암전 버그: 책이 열려 있으면 아래 메뉴 단추는 책 뒤에 가려짐 → 같은 장의 책갈피를 밝힘
  function bookSel(sel) {
    if (!root.UI.popupName || !root.UI.popupName() || !root.UI.chapterOf) return sel;
    return sel.replace(/\[data-pop="([\w:-]+)"\]/g, (m, p) => { const ch = root.UI.chapterOf(p); return ch ? `#bookMarks [data-ch="${ch}"]` : m; });
  }
  function paintGlow() {
    const want = new Set(glowSel ? document.querySelectorAll(bookSel(glowSel)) : []);
    for (const el of document.querySelectorAll('.tutGlow')) if (!want.has(el)) el.classList.remove('tutGlow');
    for (const el of want) el.classList.add('tutGlow');
    const s = getS(), t = s && s.tut, W = t && !t.base && WAIT[t.ph];
    dimPaint(want.size && W && W.dim !== false && !glowUntil && !document.querySelector('#placeLay.on') && !(root.UI.dlgBusy && root.UI.dlgBusy()) ? [...want] : null);
  }

  // ---------- 대사 ----------
  const advOf = id => { const s = getS(); return id == null ? null : (s && s.advs.find(x => x.id === id)) || null; };
  const advName = id => { const s = getS(), a = s && s.advs.find(x => x.id === id); return a ? a.name : ''; };
  function lines(id, part) {
    const s = getS(), D = (root.GAME_DATA && root.GAME_DATA.tutorial) || {}, P = D[id] || [], L = P[(part || 1) - 1] || [];
    const t = s.tut, v = { 전사: advName(t.wid), 모험가: advName(t.cur || t.aid) };
    const sub = x => String(x).replace(/\{(전사|모험가)\}/g, (m, k) => v[k] || m);
    return L.map(l => ({ name: sub(l.name), face: l.face || 'smile', text: sub(l.text), adv: advOf(l.name === '{전사}' ? t.wid : l.name === '{모험가}' ? (t.cur || t.aid) : null) }));   // 11-19: 기록 칸 이름표가 「undefined Lvundefined」로 나와 번호 대신 모험가를 넘김
  }
  function say(id, part, then) { root.UI.say(lines(id, part).concat(then ? [{ fn: then }] : [])); }
  const after = (sec, fn) => timers.push({ at: clock + sec, fn });

  // ---------- 시간 ----------
  // 2026-11-19: 멈추기 전 배속(t.sp)을 기억했다가 풀 때 그 배속으로. 책 · 창이 열려 있으면 닫히는 순간 다시 흐름(t.resume) — 책이 닫히며 0배속으로 되돌리는 것까지 덮음
  const wantSp = t => t.sp > 0 ? t.sp : 1;
  function hold(on) { const t = getS().tut; t.pause = !!on;
    if (on) { const v = H.getSpeed ? H.getSpeed() : 0; if (v > 0) t.sp = v; H.setSpeed(0); t.resume = false; }
    else { t.resume = true; if (!root.UI.popupName()) { H.setSpeed(wantSp(t)); t.resume = false; } } }

  // ---------- 로비 연출: 한 주 진행 밖에서 생긴 일도 도착 · 출발 장면으로 ----------
  function act(fn) { const s = getS(), D = root.Director, B = root.Lobby && root.Lobby.Board; const before = D && D.snap(s); const r = fn(); if (D && before && B) D.onWeek(before, s, B); root.UI.hud(); return r; }

  // ---------- 기본 튜토리얼 ----------
  function go(step, ph) { const t = getS().tut; t.step = step; t.ph = ph || 'talk'; t.seen[step] = getS().week; RUN[step](); }
  const RUN = {
    FT0001() { hold(true); say('FT0001', 1, () => {
      const s = getS(), t = s.tut;
      if (t.wid == null || !s.advs.some(a => a.id === t.wid)) t.wid = act(() => Gm.tutSpawn(s, { core: 0, male: true })).id;
      after(2.5, () => go('FT0002'));
    }); },
    FT0002() { hold(true); say('FT0002', 1, () => {
      const s = getS(), t = s.tut; t.noGo = true;
      if (t.qid == null || !s.board.some(q => q.id === t.qid)) t.qid = Gm.tutPost(s, 'q_hunt_F_2').id;
      t.ph = 'board';
    }); },
    FT0003() { hold(true); say('FT0003', 1, () => { getS().tut.ph = 'mini'; hold(false); }); },   // 2026-11-19: 대화가 끝나면 바로 시간이 흐름 (원정 목록 누르기는 안내만)
    FT0004() { hold(true); say('FT0004', 1, () => { getS().tut.ph = 'table'; }); },
    FT0005() {
      hold(true); const s = getS(), t = s.tut;
      if (t.aid == null || !s.advs.some(a => a.id === t.aid)) t.aid = act(() => Gm.tutSpawn(s, { core: 1 + Math.floor(s.R() * 4) })).id;
      t.cur = t.aid;
      after(2, () => say('FT0005', 1, () => { t.cur = null; t.ph = 'wait'; after(1, () => go('FT0008')); }));   // 2026-11-19 사용자: 한 주 기다림 없이 바로 요리 단계로 (전엔 다음 주까지 최대 30초 기다림)
    },
    FT0008() { hold(true); say('FT0008', 1, () => { getS().tut.ph = 'meals'; }); },
    FT0009() { hold(true); say('FT0009', 1, () => { getS().tut.ph = 'wait'; after(1, () => go('FT0006')); }); },   // 2026-11-19 사용자: 한 주 기다림 없이 바로 집무실 단계로
    FT0006() {
      hold(true); const s = getS(), t = s.tut;
      if (t.rid == null || !(s.req && s.req.open.some(r => r.id === t.rid))) { const r = Gm.tutReq(s, 'f_req_bat01'); t.rid = r ? r.id : null; root.UI.reqBadge && root.UI.reqBadge(); }
      say('FT0006', 1, () => {
        if (!t.gave1000) { t.gave1000 = true; s.gold += 1000; s.month.other = (s.month.other || 0) + 1000; Gm.log(s, '리나가 청소하다 찾은 금화 1,000G를 금고에 넣었습니다.', 'sys'); root.UI.hud(); }
        t.ph = 'office';
      });
    }
  };
  // 2026-11-22 야간 작업 1 (사용자 C안): 첫 원정을 기다리는 동안 리나 말풍선 2줄 (FT0003 구간 2). 대화창이 아니라 말풍선이라 시계는 그대로 흐름
  function awayTalk() {
    const L = lines('FT0003', 2); if (!L.length || !root.Lina || !root.Lina.say) return;
    const still = () => { const t = getS().tut; return t && !t.base && t.step === 'FT0003' && t.ph === 'away'; };
    L.forEach((l, i) => after(1.5 + i * 10.5, () => { if (still()) root.Lina.say(l.text, 6); }));
  }
  // 단계별 기다림: 조건(test)을 매 프레임 확인, 그동안 빛낼 곳(glow) · 안내 문구(hint)
  const WAIT = {
    board: { glow: () => root.UI.popupName() === 'board' ? `.qcard[data-q="${getS().tut.qid}"]` : '[data-pop="board"]', hint: () => root.UI.popupName() === 'board' ? '「오늘 저녁 삼겹살」을 눌러 보내 주세요' : '아래 「의뢰」를 눌러 게시판을 여세요' },
    mini: { dim: false, glow: () => '#hudExp', hint: () => '오른쪽 원정 목록의 줄을 눌러 보세요', test: () => !!document.querySelector('#expView.on') || WAIT.away.test(), done() { getS().tut.ph = 'away'; awayTalk(); } },
    away: { test: () => { const s = getS(), t = s.tut, a = s.advs.find(x => x.id === t.wid); return !a || (a.state !== 'quest' && !s.active.some(x => x.party.includes(t.wid))); }, done() { getS().tut.ph = 'wait'; after(3.5, () => go('FT0004')); } },
    table: { glow: () => root.UI.popupName() === 'fac' ? '[data-place="table"]' : '[data-pop="fac"]', hint: () => '「시설」에서 테이블 세트를 놓아 주세요', test: () => getS().place.items.some(i => i.id === 'table'), done() { getS().tut.ph = 'wait'; after(1.5, () => go('FT0005')); } },
    meals: { glow: () => '[data-pop="meals"]', hint: () => '아래 「음식」을 눌러 보세요', test: () => root.UI.popupName() === 'meals',
      done() { const s = getS(), t = s.tut; t.ph = 'wait'; say('FT0008', 2, () => { give(s); root.UI.repop(); t.ph = 'cook'; }); } },
    // 테스트 의견 4 (11-19 시안 2 확인): 고기 → 향신료 → 「만들어 보기」 차례로 한 칸씩만 밝힘. 다른 재료는 어두운 덮개에 막혀 못 누르므로 멧돼지 스테이크 정식만 나옴
    cook: { glow: () => { const k = COOK_ST(); return k === -2 ? '[data-pop="meals"]' : k < 0 ? null : ['[data-kmat="mat_x003"]', '[data-kmat="mat_x019"]', '[data-kcook]:not([disabled])'][k]; },
      hint: () => ({ 0: '① 멧돼지 고기를 눌러 조리대에 올려 주세요', 1: '② 이번엔 향신료를 올려 주세요', 2: '③ 「만들어 보기」를 눌러 주세요', '-2': '아래 「음식」을 눌러 요리를 이어서 해 주세요' })[COOK_ST()] || null, test: () => Object.keys(getS().dishes || {}).length > 0, tick() { give(getS(), true); }, done() { getS().tut.ph = 'wait'; after(1, () => go('FT0009')); } },
    office: { glow: () => root.UI.popupName() === 'fac' ? '[data-build="집무실"]' : '[data-pop="fac"]', hint: () => '「시설」에서 집무실을 지어 주세요', test: () => !!getS().built['집무실'], done() { const t = getS().tut; t.ph = 'wait'; say('FT0006', 2, () => { t.ph = 'nom'; }); } },
    nom: { glow: () => { if (root.UI.popupName() !== 'req') return '[data-pop="req"]';   // 리퀘스트 장 → 들개 떼 부탁 → 모험가 줄 → 보내기
        const s = getS(), r = s.req && s.req.open.find(x => x.id === s.tut.rid), card = `[data-rq="${s.tut.rid}"]`; if (!r) return null;
        if (!document.querySelector(card + '.on')) return card;
        if (r.party.length && document.querySelector('[data-rqact="send"]:not([disabled]):not(.soft-off)')) return '[data-rqact="send"]';   // 2026-11-19: 조건을 못 채운 보내기(soft-off)는 밝히지 않고 모험가 줄을 밝힘 (암전 버그)
        return '[data-rqnom]:not(.no)'; }, hint: () => '리퀘스트 장에서 들개 떼 리퀘스트에 모험가를 지명해 보내 주세요',
      test: () => { const s = getS(), r = s.req && s.req.open.find(x => x.id === s.tut.rid); return !r || r.state === 'queued' || r.state === 'active'; },
      done() { const t = getS().tut; t.ph = 'wait'; t.nomGo = true; say('FT0006', 3, () => { t.base = true; t.noGo = false; t.step = null; t.ph = null; hold(false); }); } }
  };
  // 테스트 의견 (11-19 시안 8 → A안): 기본 튜토리얼 동안 왼쪽 위 목표 칸 = 「튜토리얼 n / 6」 · 지금 목표 · 막대 · 지금 할 일(가운데 안내와 같은 글)
  const GOALS = ['첫 의뢰 보내기', '첫 원정 지켜보기', '테이블 놓기', '첫 요리 만들기', '집무실 짓기', '리퀘스트 보내기'];
  let goalKey = '';
  function goalIdx(t) {
    const m = { FT0001: 0, FT0002: 0, FT0003: 1, FT0004: 2, FT0005: 3, FT0008: 3, FT0009: 4 };
    if (t.step === 'FT0006') return t.ph === 'nom' || (t.ph === 'wait' && t.nomGo) ? 5 : 4;
    return m[t.step] != null ? m[t.step] : 0;
  }
  function goalPaint(t, W) {
    const box = document.querySelector('#goalBox'); if (!box) return;
    if (!t || !t.on || t.base) { if (box.classList.contains('tut')) { box.classList.remove('tut'); goalKey = ''; if (root.UI.goalShow) root.UI.goalShow(); } return; }
    const i = goalIdx(t), busy = root.UI.dlgBusy && root.UI.dlgBusy();
    const d = (!busy && W && W.hint && W.hint()) || (t.ph === 'week' ? '한 주가 지나면 이어서 진행돼요' : t.ph === 'away' ? '원정에서 돌아올 때까지 지켜봐 주세요' : '리나의 이야기를 들어 주세요');
    const key = i + '|' + d; if (key === goalKey && box.classList.contains('tut')) return; goalKey = key;
    box.classList.add('tut');
    box.innerHTML = `<div class="goal-k">튜토리얼 ${i + 1} / ${GOALS.length}</div><div class="goal-t">${GOALS[i]}</div><div class="goal-b"><i style="width:${Math.round(i / GOALS.length * 100)}%"></i></div><div class="goal-d new">${d}</div>`;
  }
  T.goalPaint = () => { const s = getS(), t = s && s.tut; goalPaint(t, t && WAIT[t.ph]); };
  function COOK_ST() {   // 요리 단계: 0 고기 · 1 향신료 · 2 만들기 · -1 조리 중 · -2 음식 장이 닫힘
    if (root.UI.popupName() !== 'meals') return -2;
    const on = id => !!document.querySelector(`.kslots [data-kslot][data-mt="${id}"]`);
    if (!on('mat_x003')) return 0; if (!on('mat_x019')) return 1; return document.querySelector('[data-kcook]:not([disabled])') ? 2 : -1;
  }
  function give(s, quiet) {   // FT0008: 리나 지원 — 향신료 1개, 창고에 멧돼지 고기가 없으면 고기도 1개 (요리를 만들 때까지 모자라면 다시 채움)
    s.mats = s.mats || {}; s.knownMats = s.knownMats || {}; s.knownMats.mat_x019 = s.knownMats.mat_x003 = true; let n = 0;
    if (!(s.mats.mat_x019 > 0)) { s.mats.mat_x019 = 1; n++; }
    if (!(s.mats.mat_x003 > 0)) { s.mats.mat_x003 = 1; n++; }
    if (n && quiet) root.UI.repop();
    if (!quiet) Gm.log(s, '리나가 비상식량 주머니에서 향신료를 꺼내 주었습니다.', 'sys');
  }

  // ---------- 상황별 안내 (기본 튜토리얼 뒤, 한 주에 하나) ----------
  const alive = s => s.advs.filter(a => a.alive);
  const SIT = [
    ['FT0021', s => s.gold < 0, s => { s.gold += 500; s.month.other = (s.month.other || 0) + 500; Gm.log(s, '리나가 비상금 500G를 금고에 넣었습니다. (한 번만)', 'sys'); }, '#mgBtn'],
    ['FT0010', s => (s.history || []).length >= 1, null, '#mgBtn'],
    ['FT0013', s => !!s.built['집무실'], null, '[data-pop="board"]'],
    ['FT0017', s => s.advs.some(a => a.alive && a.state === 'injured'), null, '[data-pop="advs"]', s => (s.advs.find(a => a.alive && a.state === 'injured') || {}).id],
    ['FT0007', s => alive(s).length >= 5 && s.active.filter(x => x.start === s.week - 1).length >= 2 && !Gm.upg(s, '접수대'), null, '[data-pop="fac"]'],
    ['FT0015', s => Object.values(s.mats || {}).some(n => n > 10) || (s.consign || []).length > 0, null, '#mgBtn'],
    ['FT0016', s => (s.req ? s.req.open : []).some(r => { const n = Gm.reqNeed(s, r); return Object.keys(n.mats || {}).length && !Gm.reqCanPay(s, r); }), null, '[data-pop="req"]'],
    ['FT0014', s => !!s.built['집무실'] && Gm.contractOpen(s) && alive(s).some(a => !a.contract && !Gm.contractWhy(s, a)), null, '[data-pop="advs"]', s => (alive(s).find(a => !a.contract && !Gm.contractWhy(s, a)) || {}).id],
    ['FT0011', s => alive(s).length >= Gm.advCap(s), null, null],
    ['FT0012', s => !!(s.main && s.main.state === 'offer'), null, '[data-pop="req"]'],
    ['FT0019', s => s.grade >= 1, null, null],
    ['FT0018', s => !!(s.townUnlock && s.townUnlock.smith), null, '[data-act="town"]'],
    ['FT0020', s => (s.proposals || []).length > 0, null, '[data-pop="advs"]', s => (s.proposals[0] || {}).id]
  ];
  function situational() {
    const s = getS(), t = s.tut;
    for (const [id, test, fx, sel, who] of SIT) {
      if (t.seen[id] != null) continue;
      let ok = false; try { ok = test(s); } catch (e) { ok = false; }
      if (!ok) continue;
      t.seen[id] = s.week; t.cur = who ? who(s) : null;
      if (fx) { fx(s); root.UI.hud(); }
      say(id, 1, () => { t.cur = null; if (sel) glow(sel, 10); if (id === 'FT0007') t.ph = 'upg'; });
      return true;
    }
    return false;
  }

  // ---------- 바깥에서 부르는 것 ----------
  T.init = function (get, hooks) {
    getS = get; H = hooks || {};
    // 게시판에서 튜토리얼 의뢰를 누르면 전사가 바로 출발 (FT0002 → FT0003)
    clickHook = e => {
      const s = getS(), t = s && s.tut; if (!t || t.base || t.ph !== 'board') return;
      const c = e.target.closest && e.target.closest('.qcard[data-q]'); if (!c || +c.dataset.q !== t.qid) return;
      e.stopPropagation(); e.preventDefault();
      root.UI.close(); t.ph = 'wait';
      act(() => Gm.tutLaunch(s, t.wid, t.qid));
      after(1.2, () => go('FT0003'));
    };
    document.addEventListener('click', clickHook, true);
  };
  // 새 게임용 설정: 시작 인원 0명 + 튜토리얼 상태
  T.fresh = function (ns) { ns.tut = { on: true, base: false, step: 'FT0001', ph: 'talk', seen: {}, wid: null, aid: null, noGo: false, pause: true }; return ns; };
  T.start = function () { const s = getS(); if (!s || !s.tut || !s.tut.on) return false; timers = []; unglow(); hint(null); if (!s.tut.base) go(s.tut.step || 'FT0001', 'talk'); return true; };
  T.resume = function () {   // 불러오기: 기본 튜토리얼 도중이면 그 단계를 처음부터 다시 (만들어 둔 모험가 · 의뢰는 다시 만들지 않음)
    timers = []; unglow(); hint(null);
    const s = getS(); if (!s || !s.tut || !s.tut.on || s.tut.base) return;
    const back = { board: 'FT0002', mini: 'FT0003', away: null, table: 'FT0004', week: null, meals: 'FT0008', cook: 'FT0008', office: 'FT0006', nom: 'FT0006', wait: s.tut.step, talk: s.tut.step };
    const step = back[s.tut.ph]; if (step) go(step); else hold(false);
  };
  T.active = () => { const s = getS(); return !!(s && s.tut && s.tut.on && !s.tut.base); };
  T.onWeek = function () {   // main.js step() 뒤
    const s = getS(), t = s && s.tut; if (!t || !t.on) return;
    if (!t.base) {
      if (t.ph === 'week' && s.week > t.at) { t.ph = 'wait'; go(t.step === 'FT0005' ? 'FT0008' : 'FT0006'); }
      return;
    }
    if (root.UI.dlgBusy()) return;
    situational();
  };
  T.update = function (dt) {
    clock += dt;
    for (let i = timers.length - 1; i >= 0; i--) if (clock >= timers[i].at) { const f = timers[i].fn; timers.splice(i, 1); f(); }
    const s = getS(), t = s && s.tut; goalPaint(t, t && WAIT[t.ph]); if (!t || !t.on) { if (glowSel) unglow(); return; }
    if (glowSel && glowUntil && clock > glowUntil) unglow();
    if (t.base && t.resume && !root.UI.popupName() && H.getSpeed) { if (H.getSpeed() === 0) H.setSpeed(wantSp(t)); t.resume = false; }   // 튜토리얼 끝(FT0006) 뒤 책을 닫으면 저절로 시작
    if (t.base) {
      if (t.ph === 'upg' && Gm.upg(s, '접수대') && !root.UI.dlgBusy()) { t.ph = null; say('FT0007', 2); }
      hint(null); if (glowSel && !glowUntil) unglow(); else if (glowSel) paintGlow();
      return;
    }
    if (t.pause && H.getSpeed && H.getSpeed() > 0 && !root.UI.popupName()) { t.sp = H.getSpeed(); H.setSpeed(0); }   // 기본 튜토리얼 안내 중에는 시간 멈춤 (그동안 누른 배속은 기억)
    if (!t.pause && t.resume && !root.UI.popupName() && H.getSpeed) { if (H.getSpeed() === 0) H.setSpeed(wantSp(t)); t.resume = false; }
    const W = WAIT[t.ph];
    if (!W || root.UI.dlgBusy()) { hint(null); if (glowSel) unglow(); return; }
    if (W.tick) W.tick();
    const sel = W.glow ? W.glow() : null; if (sel !== glowSel) glow(sel); else paintGlow();
    hint(W.hint ? W.hint() : null);
    if (W.test && W.test()) { unglow(); hint(null); W.done(); }
  };
  root.Tutorial = T;
})(this);
