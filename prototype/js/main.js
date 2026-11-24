/* 2차 프로토타입 진입점: 리소스를 읽고, 1차 규칙(game_core.js)을 시간에 맞춰 돌리며 로비와 UI를 그린다. */
(function () {
  'use strict';
  const Gm = window.GuildGame, Sim = window.GuildSim;
  const WEEK_MS = 30000; // 1배속: 1주 = 30초 (1개월 = 120초)
  // 저장 슬롯 (2026.11): 유저가 게임을 시작할 때 고른 슬롯이 곧 자동 저장 슬롯이다. 수동 저장·불러오기도 같은 슬롯을 쓴다.
  const SLOTS = 3, SLOT_PTR = 'guildProto2_slot', LEGACY_KEY = 'guildProto2';
  const slotKey = n => LEGACY_KEY + '_s' + n;
  let slot = 1;
  try {
    const v = +localStorage.getItem(SLOT_PTR); if (v >= 1 && v <= SLOTS) slot = v;
    const old = localStorage.getItem(LEGACY_KEY);   // 예전 단일 저장은 1번 슬롯으로 옮긴다
    if (old && !localStorage.getItem(slotKey(1))) localStorage.setItem(slotKey(1), old);
  } catch (e) { /* 저장소 없음 */ }
  const stampKey = n => slotKey(n) + '_t';
  const newest = () => { let b = 0, bt = -1; try { for (let n = 1; n <= SLOTS; n++) { if (!localStorage.getItem(slotKey(n))) continue; const v = +localStorage.getItem(stampKey(n)) || 0; if (v > bt) { bt = v; b = n; } } } catch (e) { /* 무시 */ } return b; };
  const firstEmpty = () => { try { for (let n = 1; n <= SLOTS; n++) if (!localStorage.getItem(slotKey(n))) return n; } catch (e) { /* 무시 */ } return 0; };
  const useSlot = n => { slot = n; try { localStorage.setItem(SLOT_PTR, String(n)); } catch (e) { /* 무시 */ } };
  const SAVE_KEY_NOW = () => slotKey(slot);
  const $ = id => document.getElementById(id);

  const stage = new Stage($('game'));
  let s = Gm.newGame(Sim.defaults(), (Date.now() % 1e9) >>> 0);
  Gm.stepWeek(s); // 화면이 비어 보이지 않도록 첫 주를 미리 진행
  { const e0 = firstEmpty(); if (e0) useSlot(e0); }   // 게임을 켜면 비어 있는 첫 슬롯에서 새로 시작한다 (이어하기는 '불러오기')
  let speed = 1, acc = 0, last = performance.now(), T = 0, debug = false, still = false, started = false;   // started: 타이틀·저장 칸 선택을 마치고 게임이 시작됐는가(플레이 시간 기록용)
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 규칙 한 주 진행 → 전후 상태 비교 → 화면 대본(M2-7) · 알림 · 리나 대화
  function step() {
    const before = Director.snap(s), g0 = s.grade, top = s.log[0], gb = UI.growSnap && UI.growSnap();
    Gm.stepWeek(s);
    if (UI.growShow) UI.growShow(gb);   // 2026-11-23 모험가 개선작업 ②: 원정 뒤 성장 카드
    if (s.subPaid) { UI.toast(`왕국 보조금 +${s.subPaid}G`, 'info'); delete s.subPaid; }   // 2026-11-23 4차 13번
    Director.onWeek(before, s, Lobby.Board);
    const fresh = []; for (const L of s.log) { if (L === top) break; fresh.push(L); }
    UI.onLogs(fresh.reverse());
    Tutorial.onWeek();
    if (s.grade > g0) UI.gradeUp(s.grade);
    if (s.week % Gm.WPM === 0) save(true);
  }
  let lastSp = 1;   // 스페이스로 다시 재생할 때 돌아갈 배속
  function setSpeed(v) { speed = v; if (v > 0) lastSp = v; UI.setSpeed(v); }
  function save(quiet) { try { localStorage.setItem(SAVE_KEY_NOW(), Gm.serialize(s)); localStorage.setItem(stampKey(slot), String(Date.now())); } catch (e) { if (!quiet) UI.toast('이 환경에서는 저장할 수 없습니다.', 'warn'); } }
  function swap(ns, msg) { s = ns; UI.setState(s); Lobby.Board.reset(); Director.reset(s); Expedition.reset(); UI.hud(); UI.close(); UI.logClear(); if (msg) UI.say(msg); }
  function load() {
    const n = newest(); let t = null; try { if (n) t = localStorage.getItem(slotKey(n)); } catch (e) { /* 저장소 없음 */ }
    if (n) useSlot(n);   // 불러온 슬롯이 이어서 자동 저장되는 슬롯이 된다
    if (!t) { UI.toast('저장된 게임이 없습니다.', 'warn'); return; }
    try { const ns = Gm.deserialize(t); ns.cfg = Object.assign(Sim.defaults(), ns.cfg); swap(ns, UI.lines('load', { date: Gm.dateLabel(ns.week) })); tutGo(); }
    catch (e) { UI.toast('저장 데이터를 불러오지 못했습니다.', 'warn'); }
  }
  function saveTo(n) { useSlot(n); save(); }   // 이 칸에 저장 → 이후 자동 저장도 이 칸
  function loadSlot(n) {
    let t = null; try { t = localStorage.getItem(slotKey(n)); } catch (e) { /* 저장소 없음 */ }
    if (!t) { UI.toast('빈 슬롯입니다.', 'warn'); return; }
    try { const ns = Gm.deserialize(t); ns.cfg = Object.assign(Sim.defaults(), ns.cfg); useSlot(n); swap(ns, UI.lines('load', { date: Gm.dateLabel(ns.week) })); tutGo(); }
    catch (e) { UI.toast('저장 데이터를 불러오지 못했습니다.', 'warn'); }
  }
  // 2026-11-18 튜토리얼: 새 게임은 모험가 0명으로 시작하고 튜토리얼이 첫 전사(FT0002) · 두 번째 모험가(FT0005)를 데려옴 (docs/design/튜토리얼.md)
  function freshGame() { const c = Sim.defaults(); c.adv.startCount = 0; const ns = Tutorial.fresh(Gm.newGame(c, (Date.now() % 1e9) >>> 0)); Gm.stepWeek(ns); return ns; }
  function tutGo() { if (!Tutorial.active()) return false; if (s.tut.started) Tutorial.resume(); else { s.tut.started = true; Tutorial.start(); } return true; }
  function newGame() {
    // 새 게임은 비어 있는 첫 슬롯에서 시작한다 (모두 차 있으면 지금 슬롯을 덮어쓴다)
    const e0 = firstEmpty(); if (e0) useSlot(e0);
    swap(freshGame(), null); playPrologue(() => { if (!tutGo()) UI.say(UI.lines('newgame')); });
  }

  stage.canvas.addEventListener('click', e => { if (window.Town && Town.active) return; Director.tap(stage.toGame(e.clientX, e.clientY)); });   // 2026-11-23 로비 모험가 누르기
  stage.canvas.addEventListener('mousemove', e => { if (window.Town && Town.active) return; const h = Director.hitAt(stage.toGame(e.clientX, e.clientY)); Director.hover = h ? h.id : null; stage.canvas.style.cursor = h ? 'pointer' : ''; });
  stage.canvas.addEventListener('mouseleave', () => { Director.hover = null; stage.canvas.style.cursor = ''; });
  UI.init(stage, s, { setSpeed, save, load, newGame, slots: () => ({ cur: slot, list: Array.from({ length: SLOTS }, (_, i) => slotInfo(i + 1)) }), saveTo, loadSlot,   // 책 설정 장 오른쪽: 슬롯 3칸 정보 · 칸 골라 저장 / 불러오기 (2026-11-13)
    changed: () => UI.hud(), promoted: a => Director.celebrate(a.id), town: () => Town.open() });
  Town.init(stage, () => s, {});
  Tutorial.init(() => s, { setSpeed, getSpeed: () => speed });
  if (window.Speech && Speech.bind) Speech.bind(() => s);   // 2026-11-18 기억 대화 · 친밀도
  Gm.live = true;   // 게임 화면: 침공은 마을 화면에서 차례마다 보여 줌 (검증 · 시뮬레이터는 한 번에 처리)
  if (window.Invasion) Invasion.init(stage, () => s, { setSpeed, getSpeed: () => speed, save });
  Expedition.init(stage, () => s); // 원정 현황 패널 + 미니 뷰 (expedition.js)
  const q = sel => stage.ui.querySelector(sel);
  q('#dWeek').onclick = () => { step(); UI.hud(); };
  q('#dMonth').onclick = () => { for (let i = 0; i < 4; i++) step(); UI.hud(); };
  q('#dX2').onclick = () => { const on = !(s.board[0] && s.board[0].x2); s.board.forEach((b, i) => { b.x2 = on && i % 3 === 0; }); };   // [개발] 게시판 의뢰 3장 중 1장을 2배 이벤트 의뢰로 표시(확인용)
  q('#dGrade').onclick = () => { const g0 = s.grade; Gm.debugSetGrade(s, s.grade + 1); if (s.grade > g0) UI.gradeUp(s.grade); UI.hud(); };
  q('#dPromo').onclick = () => { // [개발] 전직 시험: 관리소를 짓고 마을에 있는 모험가 능력치를 올린 뒤 제안을 만든다
    if (s.grade < 1) Gm.debugSetGrade(s, 1); s.built['관리소'] = true;
    const town = s.advs.filter(a => a.alive && a.stage === 1).slice(0, 2);
    town.forEach((a, i) => { a.stats[a.core] = Math.max(a.stats[a.core], 52); a.stats[(a.core + 1 + i) % 5] = Math.max(a.stats[(a.core + 1 + i) % 5], 41); a.attach = Math.max(a.attach, 62); });
    for (let i = 0; i < 4; i++) step(); UI.hud();
  };
  // [개발] 식당 시험: F·E 음식 소재 각 3개 + 발견한 요리 초기화 후 식당 열기. 주소에 ?lab=kitchen 을 붙이면 시작하자마자 이 상태로 열림
  const kitchenLab = () => { if (s.grade < 1) Gm.debugSetGrade(s, 1); Gm.debugKitchen(s, 'reset'); Gm.debugKitchen(s, 'fill'); Gm.log(s, '[디버그] 식당 시험: 음식 소재 각 3개, 요리 초기화', 'debug'); UI.hud(); UI.open('meals'); };
  q('#dKitchen').onclick = kitchenLab;
  q('#dUnlock').onclick = () => { for (const d of Gm.DECO) while (Gm.unlockReward(s, d.id)) {} Gm.log(s, '[디버그] 설비 보상 열기: 테이블 4세트 · 장식 8종', 'debug'); UI.hud(); UI.open('fac'); };   // [개발] 서브 퀘스트 보상 대신 설비를 모두 엶 (2026-11-13)
  if (/[?&]lab=kitchen/.test(location.search)) setTimeout(kitchenLab, 300);
  q('#dWalk').onclick = e => { e.currentTarget.classList.toggle('on', Director.demoWalk()); };
  q('#dGold').onclick = () => { s.gold += 5000; Gm.log(s, '[디버그] 금고에 5,000G를 넣었습니다.', 'debug'); UI.hud(); };
  q('#dLayer').onclick = e => { debug = !debug; e.currentTarget.classList.toggle('on', debug); };
  q('#dStill').onclick = e => { still = !still; e.currentTarget.classList.toggle('on', still); };
  q('#dTemp').onclick = () => { location.search = Assets.forceTemp ? '' : '?temp=1'; };
  q('#dTemp').textContent = Assets.forceTemp ? '실제 리소스 보기' : '임시 그래픽 보기';
  document.addEventListener('keydown', e => {
    // 2026-11-19 사용자: 스페이스 = 대사 넘기기(대사 중, ui.js) · 일시정지/재생(쓰던 배속으로) / 1 · 2 · 3 = 1 · 2 · 4배속. 글 입력 칸에서는 안 먹음
    const tag = document.activeElement ? document.activeElement.tagName : '';
    if (/INPUT|TEXTAREA|SELECT/.test(tag) || e.ctrlKey || e.metaKey || e.altKey) return;
    const block = document.querySelector('#placeLay.on, #popBack.open, #slotPick.on'), talk = UI.dlgBusy && UI.dlgBusy();
    if (e.code === 'Space') { e.preventDefault(); if (e.repeat || talk || block) return; setSpeed(speed ? 0 : lastSp); return; }   // 눌린 단추가 스페이스로 다시 눌리지 않게 막음
    const k = { Digit1: 1, Digit2: 2, Digit3: 4, Numpad1: 1, Numpad2: 2, Numpad3: 4 }[e.code];
    if (k && !block) { e.preventDefault(); setSpeed(k); }
  });

  // ---------- 시작 화면: 저장 슬롯 고르기 (2026.11) ----------
  // 3칸에 날짜·금고·모험가 수를 보여 주고, 빈 칸은 새로 시작, 찬 칸은 이어하기. 고른 칸이 곧 자동 저장 칸이 된다.
  function slotInfo(n) {
    let t = null; try { t = localStorage.getItem(slotKey(n)); } catch (e) { /* 저장소 없음 */ }
    if (!t) return null;
    try { const x = Gm.deserialize(t), ts = +localStorage.getItem(stampKey(n)) || 0; return { raw: t, date: Gm.dateLabel(x.week), gold: Math.round(x.gold), advs: x.advs.filter(a => a.alive).length, grade: ['F', 'E', 'D', 'C', 'B', 'A', 'S'][x.grade] || 'F', playSec: x.playSec || 0, ts }; }
    catch (e) { return { raw: t, bad: true }; }
  }
  // mode: 'new'(새 게임: 빈 칸·덮어쓰기) · 'load'(이어하기: 저장된 칸만) · 없음(예전처럼 둘 다). back: 타이틀로 돌아가는 함수
  function slotPick(done, mode, back, pre) {   // pre(새로 시작?): 고른 뒤 게임으로 넘어가기 전에 할 일 (2026-11-24: 타이틀 위에 띄운 경우 타이틀 닫기)
    const root = $('slotPick'); if (!root) { done(); return; }
    root.classList.toggle('top', !!pre);
    const prevSpeed = speed; setSpeed(0);
    const arm = {};   // 삭제·덮어쓰기는 두 번 눌러야 한다
    const fmtPlay = sec => { const m = Math.floor((sec || 0) / 60), h = Math.floor(m / 60); return h ? `${h}시간 ${m % 60}분` : `${m}분`; };
    const msg = root.querySelector('p');
    if (msg) msg.textContent = mode === 'load' ? '이어서 할 저장 슬롯을 골라 주세요.' : mode === 'new' ? '새로 시작할 슬롯을 골라 주세요. 고른 슬롯에 자동으로 저장됩니다.' : '저장 슬롯을 골라 주세요. 고른 슬롯에 자동으로 저장됩니다.';
    let bk = root.querySelector('.sp-back'); if (bk) bk.remove();
    if (back) { bk = document.createElement('button'); bk.className = 'ux-btn sp-back'; bk.dataset.sp = 'back'; bk.textContent = '← 타이틀로 (Esc)'; root.querySelector('.sp-box').appendChild(bk); }
    const draw = () => {
      const last = newest();
      root.querySelector('.sp-list').innerHTML = [1, 2, 3].map(n => {
        const i = slotInfo(n), d = i && i.ts ? new Date(i.ts) : null, when = d ? `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` : '';
        const newBtn = (label, cls) => `<button class="ux-btn ${cls || ''}" data-sp="new" data-n="${n}">${label}</button>`;
        if (!i) return mode === 'load'
          ? `<div class="sp-card empty"><b class="sp-no">슬롯 ${n}</b><span class="sp-ph">비어 있음</span></div>`
          : `<div class="sp-card empty"><b class="sp-no">슬롯 ${n}</b><span class="sp-ph">비어 있음</span>${newBtn('새로 시작', 'primary')}</div>`;
        if (i.bad) return `<div class="sp-card"><b class="sp-no">슬롯 ${n}</b><span class="sp-ph">읽을 수 없는 저장</span>${mode === 'load' ? '' : newBtn('새로 시작')}<button class="ux-btn sp-del ${arm['d' + n] ? 'arm' : ''}" data-sp="del" data-n="${n}">${arm['d' + n] ? '한 번 더 누르면 삭제' : '삭제'}</button></div>`;
        const info = `<span class="sp-d">${i.date}</span><span class="sp-s">${i.grade}급 · ${i.gold.toLocaleString()}G · 모험가 ${i.advs}명</span><span class="sp-w">플레이 ${fmtPlay(i.playSec)}${when ? ' · ' + when + ' 저장' : ''}</span>`;
        const head = `<b class="sp-no">슬롯 ${n}${last === n ? ' <i>최근</i>' : ''}</b>`;
        if (mode === 'new') return `<div class="sp-card ${last === n ? 'recent' : ''}">${head}${info}<span class="sp-ph">이 칸의 기록이 지워집니다</span><button class="ux-btn ${arm['o' + n] ? 'sp-del arm' : ''}" data-sp="ovw" data-n="${n}">${arm['o' + n] ? '정말 지우고 새로 시작' : '덮어쓰고 새로 시작'}</button></div>`;
        return `<div class="sp-card ${last === n ? 'recent' : ''}">${head}${info}<button class="ux-btn primary" data-sp="load" data-n="${n}">이어하기</button><button class="ux-btn sp-del ${arm['d' + n] ? 'arm' : ''}" data-sp="del" data-n="${n}">${arm['d' + n] ? '한 번 더 누르면 삭제' : '삭제'}</button></div>`;
      }).join('');
    };
    const finish = () => { setSpeed(prevSpeed || 1); done(); };
    const close = async fresh => { root.classList.remove('on'); document.removeEventListener('keydown', onKey); if (pre) await pre(fresh); root.classList.remove('top'); if (fresh) playPrologue(finish); else finish(); };
    const goBack = () => { root.classList.remove('on'); document.removeEventListener('keydown', onKey); setSpeed(prevSpeed); back(); };
    const onKey = e => { if (e.key === 'Escape' && back) { e.preventDefault(); goBack(); } };
    root.onclick = e => {
      const b = e.target.closest('[data-sp]'); if (!b) return; const n = +b.dataset.n, k = b.dataset.sp;
      if (k === 'back') { goBack(); return; }
      if (k === 'del') { if (!arm['d' + n]) { arm['d' + n] = 1; draw(); return; } try { localStorage.removeItem(slotKey(n)); localStorage.removeItem(stampKey(n)); } catch (er) { /* 무시 */ } delete arm['d' + n]; draw(); return; }
      if (k === 'ovw' && !arm['o' + n]) { arm['o' + n] = 1; draw(); return; }   // 덮어쓰기 경고: 두 번 눌러야 시작
      useSlot(n);
      if (k === 'load') { const i = slotInfo(n); try { const ns = Gm.deserialize(i.raw); ns.cfg = Object.assign(Sim.defaults(), ns.cfg); swap(ns, null); } catch (er) { UI.toast('저장 데이터를 불러오지 못했습니다.', 'warn'); return; } close(false); return; }
      if (k === 'ovw') { try { localStorage.removeItem(slotKey(n)); localStorage.removeItem(stampKey(n)); } catch (er) { /* 무시 */ } }
      if (k === 'new' || k === 'ovw') swap(freshGame(), null);   // 2026-11-18 튜토리얼: 새로 시작 = 모험가 0명 + 튜토리얼
      close(k === 'new' || k === 'ovw');   // 새로 시작: 프롤로그 영상 뒤 길드 (영상이 끝나거나 스킵하면 FT0001)
    };
    document.addEventListener('keydown', onKey);
    draw(); root.classList.add('on');
  }

  // ---------- 타이틀 → 저장 칸 → (새 게임이면) 프롤로그 → 길드 (2026.11) ----------
  const fadeEl = () => $('fadeBlack');
  const fadeTo = (on, ms) => new Promise(r => { const f = fadeEl(); if (!f) { r(); return; } f.classList.toggle('on', on); setTimeout(r, ms || 700); });
  function titleThenPick(done) {
    const lay = $('titleLay'), fr = $('titleFrame'); if (!lay || !fr) { slotPick(done); return; }
    setSpeed(0);
    const has = !!newest();
    const skip = $('titleSkip'); let left = false;
    const leave = (mode, ms) => {   // 2026-11-24 사용자 「예전 버전이 더 좋아」 → 「타이틀 위에 슬롯 창」: 검은 전환 없이 타이틀 위에 저장 칸 창을 띄우고, 고른 뒤에 타이틀을 닫음. 「타이틀로」는 창만 닫음
      if (left) return; left = true;
      try { fr.blur(); window.focus(); } catch (er) { /* 무시 */ }   // Esc가 타이틀 iframe에 먹히지 않게
      slotPick(done, mode, () => { left = false; try { fr.contentWindow.focus(); } catch (er) { /* 무시 */ } }, async fresh => {
        window.removeEventListener('message', onMsg); if (skip) skip.onclick = null;
        await fadeTo(true, ms);
        lay.classList.remove('on'); fr.src = 'about:blank';   // 타이틀 애니메이션을 멈춘다
        if (!fresh) await fadeTo(false, ms);   // 새로 시작은 프롤로그가 검은 화면에서 이어 받음
      });
    };
    const onMsg = e => { const d = e.data; if (!d || d.collegium !== 'title') return; if (d.act === 'touch') { if (window.Snd && window.Snd.unlock) window.Snd.unlock(); return; }   // 2026-11-19 타이틀 안을 처음 누르면 소리를 풀어 타이틀 곡이 나오게
      leave(d.act === 'load' ? 'load' : 'new', 600); };
    window.addEventListener('message', onMsg);
    if (skip) skip.onclick = () => leave(has ? 'load' : 'new', 150);   // 개발자 전용 SKIP: 저장 기록이 있으면 바로 이어하기 칸 고르기 (2026-11-16)
    fr.onload = () => { try { fr.contentWindow.focus(); } catch (er) { /* 무시 */ } };
    fr.src = 'title.html?saves=' + (has ? 1 : 0);
    lay.classList.add('on');
    fadeTo(false, 600);
  }
  // 프롤로그 영상: 새 게임 첫 시작에만. 영상이 없거나 못 읽으면 바로 길드로 넘어감. Esc·건너뛰기로 중단
  function playPrologue(next) {
    const box = $('prologue'), v = $('prologueVid'), skip = $('prologueSkip'); if (!box || !v) { next(); return; }
    let over = false;
    const key = e => { if (e.key === 'Escape') end(); };
    const end = async () => {
      if (over) return; over = true; document.removeEventListener('keydown', key);
      await fadeTo(true, 700);
      try { v.pause(); } catch (er) { /* 무시 */ } v.innerHTML = ''; v.removeAttribute('src'); try { v.load(); } catch (er) { /* 무시 */ }
      box.classList.remove('on'); skip.classList.remove('show');
      await fadeTo(false, 700); next();
    };
    v.innerHTML = '<source src="assets/prologue/prologue_FINAL.mp4"><source src="../docs/video/prologue_FINAL.mp4">';
    const srcs = v.querySelectorAll('source'); srcs[srcs.length - 1].onerror = () => { if (!over) { over = true; document.removeEventListener('keydown', key); box.classList.remove('on'); skip.classList.remove('show'); next(); } };
    v.onended = end; v.onerror = end; skip.onclick = end; document.addEventListener('keydown', key);
    fadeTo(true, 700).then(() => { if (over) { box.classList.remove('on'); fadeTo(false, 400); return; }   // 2026-11-23 1차 16: 영상을 못 읽어 이미 게임으로 넘어갔으면 영상 화면을 다시 켜지 않고 밝힘 (전엔 검은 덮개가 남아 게임이 안 보였음)
      box.classList.add('on'); v.load(); const p = v.play(); if (p && p.catch) p.catch(() => end()); fadeTo(false, 700); setTimeout(() => { if (!over) skip.classList.add('show'); }, 1500); });
  }

  // ---------- 루프 ----------
  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000); last = now; T += dt;
    if (started) s.playSec = (s.playSec || 0) + dt;   // 플레이 시간(초): 일시정지 중에도 흐름, 저장에 함께 기록됨
    // 2026-11-19 사용자 결정: 아래 대화창(리퀘스트 · 리나 · 침공 등)이 떠 있는 동안 게임 시계를 멈춤. 배속 버튼은 그대로, 대화가 끝나면 쓰던 배속으로 다시 흐름
    // 2026-11-19 사용자 결정(책 V2 7장 대조): 마을 화면에 들어가 있는 동안도 시계 멈춤 — 침공 중(Invasion.on)에는 흐름
    const run = (UI.dlgBusy && UI.dlgBusy()) || (Town.active && !(window.Invasion && Invasion.on)) ? 0 : speed;
    if (run > 0) { acc += dt * 1000 * run; let n = 0; while (acc >= WEEK_MS) { acc -= WEEK_MS; step(); n++; } if (n) UI.hud(); }
    UI.weekBar(acc / WEEK_MS);
    Expedition.update(dt, acc / WEEK_MS, run);
    // 화면 속 동작 빠르기: 배속이 오르면 함께 빨라지되 최대 3배 (일시정지면 멈춤 — 기본 튜토리얼 동안은 멈춰 있어도 모험가가 걸어 들어오고 나감)
    const as = speed === 0 && !Tutorial.active() ? 0 : Math.min(3, Math.max(1, speed * 0.6)), adt = dt * as;
    if (window.Invasion) Invasion.check(s);
    Lobby.update(s, dt); Lina.update(adt); Director.update(adt); UI.update(dt); Tutorial.update(dt); Town.wf = acc / WEEK_MS; Town.still = still || reduce || !Snd.opt.fx; Town.update(s, dt); Snd.update(s, dt);
    const g = stage.begin();
    if (Town.active) Town.draw(g, s, T); else Lobby.draw(g, s, T, { debug, still: still || reduce || !Snd.opt.fx, weekFrac: acc / WEEK_MS });
    requestAnimationFrame(frame);
  }

  if (/[?&]dev=1/.test(location.search)) document.body.classList.add('dev');   // 개발용 버튼 보이기 (2026-11-16)
  $('loadMsg').textContent = '그림 불러오는 중…';
  Assets.load(window.ASSET_MANIFEST, st => { const n = st.ok + st.temp, p = st.total ? Math.round(n / st.total * 100) : 0; $('loadBar').style.width = p + '%'; $('loadMsg').textContent = `그림 불러오는 중 ${p}%  (${n} / ${st.total})`; }).then(() => {
    const st = Assets.stats;
    q('#dAssets').textContent = `리소스 ${st.ok}개 · 임시 그래픽 ${st.temp}개`;
    q('#dAssets').title = st.missing.length ? '임시: ' + st.missing.join(', ') : '모든 파일을 찾았습니다';
    $('loading').remove();
    Assets.loadLazy(window.ASSET_MANIFEST);   // 마을 주민 걷기 그림 등 큰 그림은 타이틀 뒤에 받음
    Lobby.update(s, 0); Director.init(s); UI.hud();
    requestAnimationFrame(frame);
    const go = () => { started = true; if (!tutGo()) UI.say(UI.lines('start')); };
    if (/[?&](lab|sky|temp|nopick)/.test(location.search)) go(); else titleThenPick(go);
  });
})();
