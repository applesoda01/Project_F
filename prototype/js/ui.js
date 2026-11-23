/* 화면 틀과 대화 (2-B)
   M2-9  겹침 UI: 네 모서리(상태 · 배속/메뉴 · 개발 · 기능 버튼) + 알림 + 공통 팝업 틀
   M2-10 팝업: 게시판(칸 배분 · 의뢰 · 나가 있는 파티) · 장부 · 모험가 · 시설 · 식당 · 기록 — 1차 기능을 옮김
   M2-11 리나 대화: 표정 6종 전환, 글자 타이핑, 월간 보고·등급 승급·첫 인사 */
(function (root) {
  'use strict';
  const Gm = root.GuildGame, GR = Gm.GR;
  const fmt = n => Math.round(n).toLocaleString();
  // 2026-11-16 상단 HUD 오버 설명: 브라우저 기본 풍선(title) 대신 모험가 성향 쪽지와 같은 크림색 카드
  // 길드 승급 조건 (design_v0.1.md 승급 표). F → E만 게임에 있음(리퀘스트 10번 + 침공, 2026-11-16 결정 · 11-19 8 → 10번) — 나머지는 아직이라 문구 끝에 밝힘 (working_rules 7: 구현 전 효과는 표시)
  const GUILD_UP = ['리퀘스트를 10번 들어주면 영주의 부탁(침공)이 와요.\n침공을 막으면 E급으로 올라가요.', '보스급 의뢰 3건을 해내고 모험가 관리소를 지은 뒤,\n침공을 막으면 D급으로 올라가요.', '보스급 의뢰 3건을 해내고 훈련장을 지은 뒤,\n침공을 막으면 C급으로 올라가요.', '보스급 의뢰 4건을 해내고 의무실을 지은 뒤,\n침공을 막으면 B급으로 올라가요.',
    '보스급 의뢰 4건을 해내고 해체장을 지은 뒤,\n침공을 막으면 A급으로 올라가요.', '보스급 의뢰 5건, 명예의 전당, S급 후보 2명을 갖추고\n침공을 막으면 S급으로 올라가요.'].map((t, i) => i === 0 ? t : t + '\n(이 승급은 아직 게임에 적용되지 않았어요)').concat(['가장 높은 등급이에요.']);
  const TRUST_TXT = ['들어오는 의뢰가 크게 줄고, 보상과 경험치도 줄어요.', '들어오는 의뢰가 줄고, 보상과 경험치가 조금 줄어요.', '들어오는 의뢰와 보상·경험치 모두 평소와 같아요.', '들어오는 의뢰가 늘고, 보상과 경험치가 조금 늘어요.', '들어오는 의뢰가 크게 늘고, 보상과 경험치도 늘어요.'];   // 2026-11-16 14:06 존댓말로
  function hudTip(el, txt) { if (!el) return; el.removeAttribute('title'); el.classList.add('has-htip'); let t = el.querySelector(':scope > .htip'); if (!t) { t = document.createElement('i'); t.className = 'htip'; el.appendChild(t); } if (t.textContent !== txt) t.textContent = txt; }
  const badge = g => `<i class="ux-grade" style="background-image:url(assets/ui/hud/badge_${GR[g]}.png)" title="${GR[g]}급"></i>`;   // HUD 등급 배지 (시설·음식·전직 제안 공통)
  const UI = {};
  let s, stage, q, popup = null, openAdv = null, hooks = {};

  UI.init = function (st, state, h) {
    stage = st; s = state; hooks = h || {};
    stage.ui.innerHTML = document.getElementById('uiTpl').innerHTML;
    q = sel => stage.ui.querySelector(sel);
    // 배속
    stage.ui.querySelectorAll('[data-speed]').forEach(b => b.onclick = () => hooks.setSpeed(+b.dataset.speed));
    q('#ppBtn').onclick = () => hooks.setSpeed(curSp > 0 ? 0 : lastSp);
    // 기능 버튼 → 팝업
    stage.ui.querySelectorAll('[data-pop]').forEach(b => b.onclick = () => UI.open(b.dataset.pop));
    { const gb = q('#goalBox'); if (gb) gb.onclick = () => { if (root.Tutorial && root.Tutorial.active && root.Tutorial.active()) return; UI.open('req'); }; }   // 목표 안내판 → 리퀘스트 장
    lbInit();
    q('#popClose').onclick = UI.close;
    q('#popBack').onclick = e => { if (e.target.id === 'popBack') UI.closeFx(); };
    // 메뉴
    // 하단 HUD 묶음(경영·옵션)은 마우스를 올리면 열림. 준비 중인 항목은 안내만
    stage.ui.querySelectorAll('[data-act]').forEach(b => b.onclick = () => b.dataset.act === 'town' && hooks.town ? (root.Town && root.Town.active ? root.Town.close() : hooks.town()) : toast(b.dataset.act === 'town' ? '마을 화면은 준비 중입니다.' : '요리하기는 준비 중입니다.', 'info'));
    const shut = () => q('#menu').classList.remove('open');
    q('#mSave').onclick = () => { shut(); hooks.save(); toast('게임을 저장했습니다.', 'info'); };
    q('#mLoad').onclick = () => { shut(); hooks.load(); };
    q('#mReport').onclick = e => { UI.autoReport = !UI.autoReport; if (root.Snd) root.Snd.set('report', UI.autoReport); e.currentTarget.querySelector('i').textContent = UI.autoReport ? '켬' : '끔'; e.currentTarget.classList.toggle('off', !UI.autoReport); }; // 끔이면 아이콘에 붉은 X
    // 개발
    q('#bPromo').onclick = () => UI.open('promo');
    q('#devToggle').onclick = () => q('#dev').classList.toggle('open');
    q('#dVerify').onclick = () => UI.open('verify');
    // 대화창
    q('#dlg').onclick = UI.advance;
    root.addEventListener('keydown', e => {
      if (e.key === 'Escape') { if (popup) UI.closeFx(); }
      if ((e.key === ' ' || e.key === 'Enter') && Dlg.open && !popup) { e.preventDefault(); if (!e.repeat) UI.advance(); }   // 꾹 누르고 있어도 한 줄씩
    });
    UI.autoReport = root.Snd ? !!root.Snd.opt.report : true;
    pmEls();   // 로비 롤오버·물건 메뉴·배치 모드 요소를 처음부터 붙임 (2026-11-12)
  };
  UI.setState = st => { s = st; openAdv = null; };
  const PAUSE_SVG = '<svg viewBox="0 0 24 24"><rect x="5" y="4" width="5" height="16" rx="1.5" fill="currentColor"/><rect x="14" y="4" width="5" height="16" rx="1.5" fill="currentColor"/></svg>', PLAY_SVG = '<svg viewBox="0 0 24 24"><path d="M7 4.5v15a1 1 0 0 0 1.5.9l12-7.5a1 1 0 0 0 0-1.8l-12-7.5A1 1 0 0 0 7 4.5z" fill="currentColor"/></svg>';
  let curSp = 1, lastSp = 1; // 일시정지 버튼: 멈추면 직전 배속을 기억했다가 재생 때 되돌림
  UI.setSpeed = v => {
    curSp = v; if (v > 0) lastSp = v;
    stage.ui.querySelectorAll('[data-speed]').forEach(x => x.classList.toggle('on', +x.dataset.speed === v));
    const pp = q('#ppBtn'); if (pp) { pp.innerHTML = v === 0 ? PLAY_SVG : PAUSE_SVG; pp.classList.toggle('paused', v === 0); pp.title = v === 0 ? '재생 (스페이스)' : '일시정지 (스페이스)'; }
  };

  // ---------- 상태 표시 ----------
  function carBadge() {   // 하단 경영 메뉴: 상단이 머무는 동안 '상단' 항목, 아직 안 열어 봤으면 빨간 점
    const b = document.getElementById('mCarBtn'), mg = document.getElementById('mgBtn'); if (!b || !s) return; const here = Gm.carOn(s) ? Gm.carHere(s) : [], key = here.map(c => c.id + ':' + s.car[c.id].until).join(',');
    b.hidden = !here.length; const red = !!key && key !== carSeen; b.classList.toggle('rdot', red); if (mg) mg.classList.toggle('rdot', red); }
  UI.hud = function () {
    carBadge();
    { const sb = q('#mSellBtn'); if (sb) sb.classList.toggle('lock', !s.built['판매창구']); }   // 판매창구를 짓기 전에는 회색
    q('#hDate').textContent = Gm.dateLabel(s.week);
    q('#hGrade').style.backgroundImage = 'url(assets/ui/hud/badge_' + GR[s.grade] + '.png)'; hudTip(q('#hGrade'), '지금 길드는 ' + GR[s.grade] + '급이에요.\n' + (s.grade < 6 ? '길드의 등급이 상승하면, 최대로 활동할 수 있는 모험가가 늘어나요.\n' : '') + GUILD_UP[s.grade]);
    goldShow(); UI.reqBadge();
    q('#hTrust').textContent = Math.round(s.trust);
    { const t = Math.max(0, Math.min(100, s.trust)), st = Math.min(4, Math.floor(t / 20)), bar = q('#hTrustBar'), face = q('#hTrustFace'), box = q('#hTrustBox');   // 신뢰도: 리나 표정(5단계) + 50 기준 양쪽 막대(붉은색 → 초록)
      const NAME = ['화남', '불만', '보통', '만족', '아주 만족'], QN = ['30~50', '45~65', '65~85', '80~100', '100~120'], QR = ['80~90', '85~95', '95~105', '105~115', '110~120'];
      if (face && face.dataset.st !== String(st)) { face.dataset.st = st; face.src = 'assets/ui/hud/trust/trust_' + st + '.png'; }
      if (bar) { const d = (t - 50) / 50; bar.style.left = d >= 0 ? '50%' : (50 + d * 50) + '%'; bar.style.width = Math.abs(d) * 50 + '%'; bar.style.background = `hsl(${Math.round(t * 1.2)},62%,42%)`; }
      if (box) hudTip(box, `${NAME[st]}\n${TRUST_TXT[st]}`); }   // 2026-11-16: 숫자 대신 말로
    { const step = Gm.fameStepOf(s) || 10, f = s.fame || 0, n = s.advs.filter(a => a.alive).length, nx = Gm.fameNextOf(s);   // 명성: 다음 모험가까지 막대 · 모험가: 인원 / 등급 상한 (2026-11-18 결정 32: 등급별 간격, 다음 칸 = s.fameNext)
      const cap = Gm.advCap(s), GL = 'FEDCBAS'[s.grade] || 'F', full = n >= cap;
      const left = Math.max(0, Math.ceil((nx - f) * 10) / 10), into = Math.max(0, Math.min(step, step - left));
      q('#hFame').textContent = Math.floor(f);
      const fb = q('#hFameBar'), fw = q('#hFameBarW'), fx = q('#hFameBox');
      if (fb) fb.style.width = (full ? 100 : into / step * 100) + '%';
      if (fw) fw.classList.toggle('cap', full);
      if (fx) hudTip(fx, full ? `모험가가 상한(${cap}명)이라 새 모험가가 오지 않아요.\n이때 쌓인 명성 칸은 넘어가고, 길드 등급이 오르면 다음 칸부터 다시 찾아와요.` : `명성이 ${left} 더 쌓이면 새 모험가가 찾아와요.\n(${GL}급: 명성 ${step}마다 1명)`);
      q('#hAdv').textContent = n;
      const ac = q('#hAdvCap'), ax = q('#hAdvBox');
      if (ac) { ac.textContent = ' / ' + cap; ac.classList.toggle('full', full); }
      if (ax) hudTip(ax, `모험가는 ${cap}명까지 받을 수 있어요.`); }
    q('#bBoard').textContent = s.board.length; q('#bBoard').hidden = !s.board.length;
    const np = (s.proposals || []).length; q('#bParty').textContent = np ? '★' + np : ''; q('#bParty').hidden = !np; q('#bPromo').hidden = !np; q('#bPromo').textContent = `전직 제안 ${np}건`;
    if (popup) renderPopup();
  };
  // 주 게이지 끝에 시간대 아이콘이 붙어 함께 움직임: 1·2주(아침·낮)·3주(노을)는 태양, 4주(저녁)는 달. 배경 시간대(lobby_sky.js)와 같은 4주 주기
  UI.weekBar = p => {
    q('#hWeekBar').style.width = (p * 100).toFixed(1) + '%';
    wkFrac = p;
    if (popup === 'board') for (const el of document.querySelectorAll('#popBody .qdl i[data-dl]')) { const bq = s.board.find(x => x.id === +el.dataset.dl); if (bq) { const v = dlLeft(bq, p); el.style.width = (v * 100).toFixed(1) + '%'; el.classList.toggle('low', v <= 0.25); } }
    const ic = q('#hTime'); if (!ic) return;
    const ph = ((s && s.week) || 0) % 4, key = ph === 3 ? 'moon' : 'sun';
    if (ic.dataset.k !== key) { ic.dataset.k = key; ic.src = `assets/ui/hud/time_${key}.png`; }
    ic.classList.toggle('dusk', ph === 2); ic.style.left = (p * 100).toFixed(1) + '%';
  };


  // ---------- 로그박스 (채팅처럼 흐르는 기록 + 캐릭터 대화) ----------
  const LOGMAX = 200, FADE_MS = 8000, POS_KEY = 'guildLogBoxPos';
  let lb = null;
  function lbInit() {
    const box = q('#logBox'), ll = box.querySelector('.ll'), grip = box.querySelector('.lg');
    lb = { box, ll, grip, hov: 0, off: null };
    let tm = 0;
    const on = () => { clearTimeout(tm); if (!box.classList.contains('show')) { box.classList.add('show'); ll.scrollTop = ll.scrollHeight; } };   // 마우스를 올려 펼칠 때는 가장 최근 대사가 보이는 맨 아래부터 (예전에는 맨 위 = 가장 오래된 줄이 보였음)
    const offS = () => { clearTimeout(tm); tm = setTimeout(() => { if (!box.classList.contains('drag') && !box.classList.contains('size')) { box.classList.remove('show'); ll.scrollTop = ll.scrollHeight; } }, 350); };
    box.addEventListener('mouseover', e => { if (e.target.closest('.ln, .lg, .ll, .lr')) on(); });
    box.addEventListener('mouseout', e => { if (!e.relatedTarget || !box.contains(e.relatedTarget) || !e.relatedTarget.closest('.ln, .lg, .ll, .lr')) offS(); });
    // 높이 조절 (2026-11-16 동료 피드백 "채팅창 길이 조절"): 펼치면 위에 손잡이, 3~14줄(줄 44px = 132~616px), 저장 guildLogBoxH, 더블클릭 = 기본 6줄
    const LH = 44, ROWS = [3, 14], DEF_ROWS = 6, H_KEY = 'guildLogBoxH', rsz = box.querySelector('.lr');
    const setRows = n => { n = Math.max(ROWS[0], Math.min(ROWS[1], Math.round(n))); box.style.setProperty('--rows', n); lb.rows = n; return n; };
    try { const h = parseFloat(localStorage.getItem(H_KEY)); setRows(isFinite(h) ? h / LH : DEF_ROWS); } catch (e) { setRows(DEF_ROWS); }
    if (rsz) {
      let rs = null;
      rsz.addEventListener('pointerdown', e => { e.preventDefault(); rsz.setPointerCapture(e.pointerId); box.classList.add('size'); rs = { py: e.clientY, n: lb.rows }; });
      rsz.addEventListener('pointermove', e => { if (!rs) return; const k = stage.scale || 1; setRows(rs.n - (e.clientY - rs.py) / k / LH); ll.scrollTop = ll.scrollHeight; });
      const rEnd = () => { if (!rs) return; rs = null; box.classList.remove('size'); try { localStorage.setItem(H_KEY, String(lb.rows * LH)); } catch (er) {} if (!box.matches(':hover')) offS(); };
      rsz.addEventListener('pointerup', rEnd); rsz.addEventListener('pointercancel', rEnd);
      rsz.addEventListener('dblclick', () => { setRows(DEF_ROWS); try { localStorage.removeItem(H_KEY); } catch (er) {} ll.scrollTop = ll.scrollHeight; });
    }
    // 위치: 왼쪽 아래 기본, 끌어서 이동 (왼쪽·아래 여백을 저장)
    const clampPos = (x, b) => ({ x: Math.max(0, Math.min(1920 - 440, x)), b: Math.max(0, Math.min(1080 - 60, b)) });
    const apply = p => { const c = clampPos(p.x, p.b); box.style.left = c.x + 'px'; box.style.bottom = c.b + 'px'; return c; };
    try { const sv = JSON.parse(localStorage.getItem(POS_KEY) || 'null'); if (sv && isFinite(sv.x) && isFinite(sv.b)) apply(sv); } catch (e) {}
    let drag = null;
    grip.addEventListener('pointerdown', e => {
      e.preventDefault(); grip.setPointerCapture(e.pointerId); box.classList.add('drag');
      drag = { px: e.clientX, py: e.clientY, x: parseFloat(box.style.left) || 18, b: parseFloat(box.style.bottom) || 96 };
    });
    grip.addEventListener('pointermove', e => {
      if (!drag) return; const k = stage.scale || 1;
      apply({ x: drag.x + (e.clientX - drag.px) / k, b: drag.b - (e.clientY - drag.py) / k });
    });
    const end = e => {
      if (!drag) return; drag = null; box.classList.remove('drag');
      try { localStorage.setItem(POS_KEY, JSON.stringify({ x: parseFloat(box.style.left), b: parseFloat(box.style.bottom) })); } catch (er) {}
      if (!box.matches(':hover')) offS();
    };
    grip.addEventListener('pointerup', end); grip.addEventListener('pointercancel', end);
    grip.addEventListener('dblclick', () => { box.style.left = '18px'; box.style.bottom = '96px'; try { localStorage.removeItem(POS_KEY); } catch (e) {} });
    setInterval(() => { // 오래된 줄은 서서히 사라짐
      const now = performance.now();
      for (const el of ll.children) if (!el.classList.contains('dim') && now - el._t > FADE_MS) el.classList.add('dim');
    }, 500);
  }
  function lbAdd(el) {
    if (!lb) return;
    const ll = lb.ll, atBottom = ll.scrollHeight - ll.scrollTop - ll.clientHeight < 12;   // 펼쳐서 위로 올려 읽는 중이면 그 자리를 지켜 줌
    el._t = performance.now(); ll.appendChild(el);
    while (ll.children.length > LOGMAX) ll.firstChild.remove();
    if (!lb.box.classList.contains('show') || atBottom) ll.scrollTop = ll.scrollHeight;   // 아래에 있었다면 새 대사가 들어올 때마다 따라 올라감
  }
  // 2026-11-12 채팅 로그 개선: 시스템 기록 앞에 종류 꼬리표, 대화 줄에 얼굴 · 이름 · 직업 Lv (이름·얼굴을 누르면 모험가 정보)
  const LOG_TAG = { depart: ['출발', 't-go'], success: ['성공', 't-ok'], fail: ['실패', 't-bad'], injury: ['부상', 't-bad'], death: ['사망', 't-bad'], arrive: ['도착', 't-new'], leave: ['떠남', 't-gray'],
    req: ['부탁', 't-new'], main: ['메인', 't-gold'], ledger: ['결산', 't-gold'], build: ['건설', 't-gray'], unlock: ['발견', 't-gold'], grow: ['성장', 't-ok'], promo: ['전직', 't-new'], expire: ['기한', 't-gray'], withdraw: ['취소', 't-gray'], quirk: ['버릇', 't-new'] };
  UI.logLine = function (text, kind) { // 시스템 기록
    const el = document.createElement('div'); el.className = 'ln k-' + (kind || 'info');
    const tg = LOG_TAG[kind]; if (tg) { const i = document.createElement('i'); i.className = 'tag ' + tg[1]; i.textContent = tg[0]; el.append(i); }
    const sp = document.createElement('span'); sp.textContent = text; el.append(sp); lbAdd(el);
  };
  UI.chat = function (name, text, who, a, grp) { // 캐릭터 대화 (말풍선·리나 대사). a: 말한 모험가 (얼굴·직업 표시)
    if (!text) return;
    const el = document.createElement('div'); el.className = 'ln chat' + (who === 'lina' ? ' lina' : '') + (grp === 'talk' ? ' talk' : '');   // talk: 두 사람 대화 줄 (왼쪽 옅은 세로줄로 묶음)
    const hd = document.createElement('div'); hd.className = 'hd';
    const fc = document.createElement('span'); fc.className = 'cf';
    if (a) fc.setAttribute('style', faceStyle(a, 30, 156, 15));
    else if (who === 'lina') fc.setAttribute('style', 'background-image:url(assets/npc/lina_face_smile.png);background-size:auto 200px;background-position:-36px -35px');
    else fc.classList.add('none');
    const b = document.createElement('b'); b.textContent = name || '손님';
    const sub = document.createElement('em'); sub.textContent = a ? `${a.cls} Lv${a.lv}` : who === 'lina' ? '접수원' : '';
    hd.append(fc, b); if (sub.textContent) hd.append(sub);
    if (a) { hd.classList.add('link'); hd.title = `${name} 정보 보기`; hd.addEventListener('click', () => { if (!s.advs.some(x => x.id === a.id && x.alive)) return; openAdv = a.id; UI.open('advs'); }); }
    const bt = document.createElement('span'); bt.className = 'bt'; bt.textContent = text;   // 따옴표 없음 (말풍선 모양이 대사임을 보여 줌)
    el.append(hd, bt); lbAdd(el);
  };
  UI.logClear = function () { if (lb) lb.ll.innerHTML = ''; };

  // ---------- 알림 (전직 제안 등 꼭 알려야 할 것만) ----------
  const TOAST_KIND = { promo: 1, depart: 1, success: 1, fail: 1, unlock: 1, build: 1, warn: 1, arrive: 1 };
  function toast(text, kind) {
    const box = q('#toasts'), el = document.createElement('div');
    el.className = 'toast k-' + (kind || 'info'); el.textContent = text; box.prepend(el);
    while (box.children.length > 3) box.lastChild.remove();
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 400); }, 3800);
  }
  UI.toast = toast;
  UI.faceStyle = (...a) => faceStyle(...a);   // 대장간 창 등 다른 창에서 얼굴 그림을 씀
  UI.onLogs = function (logs) { // 새 기록들 (오래된 것부터)
    ctWatch();   // 2026-11-19 계약 갱신 알림 · 결산 카드 (테스트 의견 10 ⑤ ⑥)
    const gups = logs.filter(L => L.gup).map(L => L.gup); if (gups.length) gupShow(gups);   // 2026-11-12 모험가 승급 축하 카드
    for (const L of logs) if (L.kind === 'arrive' && L.who && L.who[0]) { const a = s.advs.find(b => b.name === L.who[0] && b.alive); if (a) arrShow(a); }   // 2026-11-20 새 모험가 소개 카드 (버릇은 영입할 때 공개, 사용자 결정)
    for (const L of logs) {
      if (L.car && L.car.ev === 'notice') { const c = Gm.CARS.find(x => x.id === L.car.id); if (c) UI.say([{ name: '리나', face: 'smile', text: `마스터, ${c.name}이 ${L.car.n || 2}주 뒤에 들른대요! 좋아하는 물건(${CAR_LIKE[c.id] || '여러 가지'})을 창고에 모아 두면 비싸게 팔 수 있어요.` }]); }
      else if (L.car) { const c = Gm.CARS.find(x => x.id === L.car.id); if (c && L.car.ev === 'hi') carOpenQ = true; if (c) UI.say(L.car.ev === 'hi' ? [{ name: '리나', face: 'smile', text: `마스터, ${c.name}이 왔어요! 경영 → 상단에서 사고팔 수 있어요.` }, { name: `${c.boss} (${c.name})`, face: 'smile', text: Gm.carTalk(c, 'hi', L.car.lv) }].concat(L.car.esc ? [{ name: `${c.boss} (${c.name})`, face: 'smile', text: Gm.carTalk(c, 'esc') }] : []) : L.car.ev === 'escOk' || L.car.ev === 'escNg' ? [] : [{ name: `${c.boss} (${c.name})`, face: 'smile', text: Gm.carTalk(c, 'bye') }]); }   // 2026-11-20 사용자: 상단 방문 대화
      if (L.rq) {   // 리퀘스트: 의뢰 · 완료 · 실패 · 거절 대사 (data/quest_lines.csv). 외지인이 처음 오면 리나 한마디가 앞에 붙음
        const R0 = Gm.reqOf(s), fr = (Gm.QLINES[L.rq.key] || {}).first; let ls = [];
        if (L.rq.ev === 'req' && fr && !(R0.first = R0.first || {})[L.rq.key]) { R0.first[L.rq.key] = 1; ls = ls.concat(rqLinesOf(L.rq.key, 'first', L.rq.who)); }
        ls = ls.concat(rqLinesOf(L.rq.key, L.rq.ev, L.rq.who));
        if (L.rq.ev === 'ok' && Gm.NQ_BY[L.rq.key].type === 'town') ls = ls.concat(rqLinesOf(L.rq.key, 'req2', L.rq.who));
        if (ls.length) UI.say(ls);
        if (L.rq.ev === 'ok2' || L.rq.ev === 'ok_y2' || (L.rq.ev === 'ok' && Gm.NQ_BY[L.rq.key] && Gm.NQ_BY[L.rq.key].type !== 'town')) rqdShow(L);   // 완료 카드 (대사가 끝나면 뜸)
        if (popup === 'req') renderPopup(); else UI.reqBadge();
      }
      UI.logLine(L.text, L.kind); // 로그박스로 흘려보냄 (알림은 전직 제안만 따로 띄움)
      if (L.kind === 'promo' && L.text.includes('제안합니다')) toast(L.text, L.kind);
      if (L.kind === 'ledger' && UI.autoReport && !(root.Tutorial && root.Tutorial.active())) UI.open('ledger');   // 2026-11-18: 기본 튜토리얼 중에는 열지 않음 (FT0010에서 장부 안내)   // 월말: 리나 브리핑 대신 장부 창을 보여 준다
      if (L.kind === 'promo' && L.text.includes('제안합니다')) { const nm = L.text.split(/[이가] \d차/)[0]; UI.say(UI.lines('promo_ready', { name: nm })); }
    }
  };

  // ---------- 모험가 승급 축하 카드 (2026-11-12) ----------
  // 같은 주에 승급한 모험가를 카드 하나에 모음. 게임은 멈추지 않고, 확인을 누르거나 바깥을 누르면 닫힘. 여러 주가 쌓이면 차례로 보여 줌
  const gupQ = []; let gupEl = null, gupTimer = 0;
  const GUP_MS = 3500;   // 2026-11-16: 승급 카드는 [확인] 없이 3.5초 뒤 저절로 닫힘 (누르면 바로 다음으로)
  const STAT_NM = ['힘', '민첩', '지력', '정신', '기교'];
  // 새 모험가 소개 카드 (2026-11-20 사용자 시안 확정 mk_quirk_arrive): 위쪽 가운데, 6초 뒤 또는 누르면 닫힘 · 시계는 멈추지 않음 · 여럿이면 차례로
  let arrEl = null, arrTimer = 0; const arrQ = [], ARR_MS = 6000;
  function arrShow(a) { if (arrQ.includes(a)) return; arrQ.push(a); if (!arrEl || !arrEl.classList.contains('on')) arrNext(); }
  function arrNext() {
    clearTimeout(arrTimer); const a = arrQ.shift(); if (!a) { if (arrEl) arrEl.classList.remove('on'); return; }
    if (!arrEl) { arrEl = document.createElement('div'); arrEl.id = 'arrCard'; stage.ui.appendChild(arrEl); arrEl.addEventListener('pointerdown', () => arrNext()); }
    const q = qkOf(a), RS = Gm.RISK || ['신중', '보통', '무모'], SP = Gm.SPEND || ['절약', '보통', '낭비'], SO = Gm.SOCIAL || ['독불장군', '보통', '사교적'];
    arrEl.innerHTML = `<span class="arr-face" style="${faceStyle(a, 80, 300, 40)}"></span><h4>새 모험가가 찾아왔어요 <small>${esc(a.cls)} ${esc(a.name)} · Lv ${a.lv}</small></h4>`
      + `<div class="arr-tr">모험심 ${RS[a.risk]} · 소비 ${SP[a.spend]} · 사교 ${SO[a.social]}</div>`
      + (q ? `<div class="arr-qk"><em>버릇 「${esc(q.name)}」</em>${esc(q.desc || '')}</div>` : '') + `<i class="arr-bar" style="animation-duration:${ARR_MS}ms"></i>`;
    arrEl.classList.remove('on'); void arrEl.offsetWidth; arrEl.classList.add('on'); arrTimer = setTimeout(arrNext, ARR_MS);
  }
  function gupShow(list) { gupQ.push(list); if (!gupEl || !gupEl.classList.contains('on')) gupNext(); }
  function gupNext() {
    clearTimeout(gupTimer); const list = gupQ.shift(); if (!list) { if (gupEl) gupEl.classList.remove('on'); return; }
    if (!gupEl) { gupEl = document.createElement('div'); gupEl.id = 'gupLay'; stage.ui.appendChild(gupEl); gupEl.addEventListener('pointerdown', e => { if (e.target === gupEl || e.target.closest('.gup-box')) gupNext(); }); }
    const advs = list.map(x => Object.assign({ a: s.advs.find(b => b.id === x.id) }, x)).filter(x => x.a);
    if (!advs.length) { gupNext(); return; }
    const g = Math.max(...advs.map(x => x.g)), L = GR[g], bonus = advs[0].bonus, one = advs.length === 1 ? advs[0].a : null;
    const people = advs.map(x => `<div class="gup-p"><span class="gup-face" style="${faceStyle(x.a, 72, 376, 36)}"></span><b>${esc(x.a.name)}</b><em>${esc(x.a.cls)} Lv ${x.a.lv}</em></div>`).join('');
    const stats = STAT_NM.map((n, i) => `<span class="gup-st" style="animation-delay:${.55 + i * .09}s">${n}${one ? ` <i>${Math.round(one.stats[i] - bonus)}</i>→<b>${Math.round(one.stats[i])}</b>` : ''} <u>+${bonus}</u></span>`).join('');
    const who = one ? `${esc(one.name)} 씨` : '여러분';
    gupEl.innerHTML = `<div class="gup-box"><img class="gup-badge" src="assets/ui/hud/badge_${L}.png" alt="${L}">
      <h2>${L}급 승급!</h2><div class="gup-ps">${people}</div>
      <div class="gup-sub">능력치 5개에 각각 +${bonus}</div><div class="gup-sts">${stats}</div>
      <p class="gup-lina"><span class="gup-lf"></span>축하해요, ${who}! 이제 ${L}급 모험가예요.</p>
      <i class="gup-bar" style="animation-duration:${GUP_MS}ms"></i></div>`;
    gupEl.classList.remove('on'); void gupEl.offsetWidth; gupEl.classList.add('on'); gupTimer = setTimeout(gupNext, GUP_MS);
  }
  UI.gupShow = gupShow;   // 시험용


  // ---------- 리퀘스트 수락 도장 · 완료 카드 (2026-11-16 todo "리퀘스트 수락 · 완료 연출") ----------
  // 도장: 들어주기 · 보내기를 누르면 책 오른쪽 쪽에 붉은 도장(부탁 이름 함께). 완료 카드: 부탁을 끝내면 의뢰인 초상 · 마을의 변화 · 받은 보상 · 승급까지 N/8
  //   대사(리나 · 의뢰인)가 끝난 뒤에 뜨고 4.5초 뒤 저절로 닫힘(누르면 바로 닫힘). 게임은 멈추지 않음
  function rqStamp(word, name) {
    const pop = q('#pop'); if (!pop) return;
    const el = document.createElement('div'); el.className = 'rq-stamp';
    el.innerHTML = `<div class="rs-in"><b>${esc(word)}</b><span>${esc(name || '')}</span></div>`;
    pop.appendChild(el); setTimeout(() => el.classList.add('out'), 1250); setTimeout(() => el.remove(), 1700);
  }
  UI.rqStamp = rqStamp;   // 시험용
  let carOpenQ = false, carSeen = '';   // 2026-11-20 사용자: 상단 도착 대화가 끝나면 상단 화면을 한 번 열고, 하단 경영 메뉴에 '상단' + 빨간 점
  const RQD_MS = 4500, rqdQ = []; let rqdEl = null, rqdTimer = 0, rqdOn = false;
  function rqdFace(key, who) {   // 의뢰인 얼굴: NPC 초상(눈 위치 기준으로 잘라 냄) 또는 모험가 SD 얼굴
    const d = Gm.NQ_BY[key]; if (!d) return '';
    const a = who != null ? s.advs.find(x => x.id === who) : null;
    if (d.npc === '{이름}') return a ? `<span class="rqd-face" style="${faceStyle(a, 104, 260, 60)}"></span>` : '';
    const P = root.NPC_PORTRAITS && root.NPC_PORTRAITS[d.npc]; if (!P) return '';
    const [x, y, w, h] = P.eye, k = 104 / (w * 1.9), cx = (x + w / 2) * k, cy = (y + h / 2) * k;
    return `<span class="rqd-face" style="background-image:url(assets/npc/${P.key}_stand.webp);background-size:${Math.round(P.w * k)}px auto;background-position:${Math.round(52 - cx)}px ${Math.round(56 - cy)}px"></span>`;
  }
  function rqdShow(L) { rqdQ.push(L); }
  function rqdNext() {
    clearTimeout(rqdTimer); const L = rqdQ.shift();
    if (!L) { rqdOn = false; if (rqdEl) rqdEl.classList.remove('on'); return; }
    const d = Gm.NQ_BY[L.rq.key]; if (!d) { rqdNext(); return; }
    if (!rqdEl) { rqdEl = document.createElement('div'); rqdEl.id = 'rqdLay'; stage.ui.appendChild(rqdEl); rqdEl.addEventListener('pointerdown', () => rqdNext()); }
    rqdOn = true;
    const rw = d.rw, ex = rw.extra || {}, a = L.rq.who != null ? s.advs.find(x => x.id === L.rq.who) : null, giver = d.npc === '{이름}' ? (a ? a.name : '모험가') : d.npc;
    const town = [];   // 마을의 변화
    if (rw.pop) town.push(`<div class="rqd-pop"><span>마을 인구</span><b data-from="${Math.round(s.pop)}" data-to="${Math.round(s.pop + rw.pop)}">${Math.round(s.pop)}</b><i>+${rw.pop}</i><small>이번 달 말에 반영</small></div>`);
    if (rw.unlock) town.push(`<div class="rqd-li">${rw.unlock === 'table' ? '테이블을 1세트 더 놓을 수 있어요' : (() => { const nm = (Gm.DECO_BY[rw.unlock] || {}).name || rw.unlock, w = josa(nm, '을', '를'); return `새 장식 <b>${esc(nm)}</b>${w.slice(nm.length)} 얻었어요`; })()} <small>시설 장 → 설비</small></div>`);
    if (rw.town) { const nm = { smith: '대장간', potion: '물약 상점' }[rw.town] || rw.town; town.push(`<div class="rqd-li">마을에 <b>${nm}</b>${josa(nm, '이', '가').slice(nm.length)} 생겼어요</div>`); }
    if (ex.popMonthly) town.push(`<div class="rqd-li">앞으로 마을 인구가 <b>매달 +${ex.popMonthly}</b>명씩 더 늘어요</div>`);
    if (ex.recipe) town.push('<div class="rqd-li">새 요리 레시피를 배웠어요 <small>음식 장</small></div>');
    if (ex.ownerStat && a) town.push(`<div class="rqd-li">${esc(a.name)}의 ${josa(STAT_NM[a.core], '이', '가')} <b>+${ex.ownerStat}</b> 올랐어요</div>`);
    if (ex.ownerXp && a) town.push(`<div class="rqd-li">${esc(josa(a.name, '이', '가'))} 경험치 <b>+${ex.ownerXp}</b>를 얻었어요</div>`);
    const got = [];   // 받은 보상
    if (rw.gold) got.push(`<span class="rq-chip gold">${fmt(rw.gold)}G</span>`);
    if (rw.fame) got.push(`<span class="rq-chip">명성 +${rw.fame}</span>`); if (rw.trust) got.push(`<span class="rq-chip">신뢰도 +${rw.trust}</span>`);
    if (rw.attach) got.push(`<span class="rq-chip">${rw.attach[0] === 'all' ? '모든 모험가' : rw.attach[0] === 'party' ? '참가자' : esc(giver)} 애착 +${rw.attach[1]}</span>`);
    for (const [m, k] of Object.entries(rw.mats || {})) got.push(rqMat(m, k));
    const m = Gm.mainView ? Gm.mainView(s) : null, prog = m && m.state === 'none' && s.grade === 0 ? `<div class="rqd-prog"><span>메인 퀘스트까지 리퀘스트 <b>${m.doneN} / ${m.need}</b></span><i><u style="width:${Math.round(Math.min(1, m.doneN / m.need) * 100)}%"></u></i></div>` : m && m.state === 'offer' ? '<div class="rqd-prog"><span><b>메인 퀘스트가 도착했어요!</b> 리퀘스트 장 맨 위를 보세요</span></div>' : '';
    rqdEl.innerHTML = `<div class="rqd-box">${rqdFace(L.rq.key, L.rq.who)}<div class="rqd-k">리퀘스트 완료</div><h2>「${esc(L.rq.name || d.name)}」</h2><div class="rqd-g">${esc(giver)}의 부탁을 들어주었어요</div>
      ${town.length ? `<div class="rqd-sec"><i>마을의 변화</i><div class="rqd-town">${town.join('')}</div></div>` : ''}
      ${got.length ? `<div class="rqd-sec"><i>받은 보상</i><div class="bk-rq rqd-got">${got.join('')}</div></div>` : ''}
      ${prog}<i class="gup-bar" style="animation-duration:${RQD_MS}ms"></i></div>`;
    rqdEl.classList.remove('on'); void rqdEl.offsetWidth; rqdEl.classList.add('on');
    const pb = rqdEl.querySelector('.rqd-pop b');   // 인구 숫자가 올라감
    if (pb) { const f = +pb.dataset.from, t = +pb.dataset.to, t0 = performance.now() + 450; const tick = now => { const k = Math.max(0, Math.min(1, (now - t0) / 1100)); pb.textContent = fmt(Math.round(f + (t - f) * (1 - Math.pow(1 - k, 3)))); if (k < 1 && rqdEl.classList.contains('on')) requestAnimationFrame(tick); }; requestAnimationFrame(tick); }
    rqdTimer = setTimeout(rqdNext, RQD_MS);
  }
  UI.rqdShow = L => { rqdShow(L); };   // 시험용

  // ---------- 팝업 틀 ----------
  // ---------- 길드 업무 일지 (책 팝업, 2026-11-13 단계 ①) ----------
  // 왼쪽 큰 책갈피 6장 = 장, 쪽 위 작은 탭 = 장 안의 팝업. 허브 버튼은 그대로 UI.open(이름) → 해당 장이 펼쳐진 채 열림
  const BOOK = [
    { id: 'quest', name: '의뢰', col: '#8e2f3a', pops: ['board'] },
    { id: 'req', name: '리퀘스트', col: '#2f7f7a', pops: ['req', 'order'] },   // order: 길드 발주 (2026-11-18 V2 6단계, 시안 사용자 확인)
    { id: 'adv', name: '모험가', col: '#b38a26', pops: ['advs', 'promo'] },
    { id: 'fac', name: '시설', col: '#566d84', pops: ['fac'] },
    { id: 'food', name: '음식', col: '#b0612e', pops: ['meals'] },   // 2026-11-13: 경영 장에서 분리 (사용자 결정)
    { id: 'mgmt', name: '경영', col: '#66763a', pops: ['ledger', 'sell', 'trade', 'car', 'codex', 'log'] },   // car: 떠돌이 상단 (2026-11-20 결정 57~62, carOn일 때만 책갈피)   // trade: 매입 · 위탁 (2026-11-18 V2 E4-4)
    { id: 'opt', name: '설정', col: '#6a4785', pops: ['opts'] },
  ];
  const SUB_NAME = { board: '게시판', req: '리퀘스트', advs: '명부', 'advs:career': '경력', 'advs:contract': '계약 제안', promo: '전직 제안', fac: '시설', ledger: '장부', meals: '음식 설정', sell: '소재 판매', trade: '매입 위탁', car: '상단', order: '길드 발주', codex: '도감', log: '기록', opts: '설정' };
  const GQ_NAME = { order: '길드 의뢰', trade: '소재 관리' };   // 2026-11-20: 소재 판매 + 매입 = 소재 관리   // 2026-11-20 길드 의뢰 · 매입 개편이 켜지면 책갈피 이름
  const subName = p => (Gm.gqOn(s) && GQ_NAME[p]) || SUB_NAME[p] || TITLES[p];
  const popTitle = p => (Gm.gqOn(s) && GQ_NAME[p]) || TITLES[p] || '';
  const chapterOf = name => BOOK.find(c => c.pops.includes(name)) || null;
  function bookInit() {
    const mk = q('#bookMarks'); if (!mk || mk.childElementCount) return;
    mk.innerHTML = BOOK.map(c => `<button data-ch="${c.id}" style="--bm:${c.col}"><i>${c.name}</i></button>`).join('');
    mk.onclick = e => { const b = e.target.closest('[data-ch]'); if (!b) return; const c = BOOK.find(x => x.id === b.dataset.ch); if (c && !c.pops.includes(popup)) UI.open(c.pops.find(p => p !== 'sell' || s.built['판매창구']) || c.pops[0]); };
    q('#bookSub').onclick = e => { const b = e.target.closest('[data-sub]'); if (!b) return; const sub = b.dataset.sub;
      if (sub === 'advs' || sub === 'advs:career' || sub === 'advs:contract') { advView = sub === 'advs:career' ? 'career' : sub === 'advs:contract' ? 'contract' : 'detail'; if (popup === 'advs') { renderPopup(); bookSync('advs'); } else UI.open('advs'); return; }   // 모험가 장: 명부 ↔ 경력 (같은 팝업, 오른쪽 쪽만 바뀜)
      if (sub !== popup) UI.open(sub); };
    q('#bookRibbon').onclick = () => UI.closeFx();
  }
  function bookSync(name) {
    bookInit(); const c = chapterOf(name);
    q('#bookMarks').querySelectorAll('[data-ch]').forEach(b => b.classList.toggle('on', !!c && b.dataset.ch === c.id));
    q('#bookTitle').textContent = c ? c.name : popTitle(name);
    { const on = q('#bookMarks [data-ch].on'); q('#bookSub').style.setProperty('--bm', on ? getComputedStyle(on).getPropertyValue('--bm') : '#8a6a46'); }   // 오른쪽 책갈피 색 = 지금 장 색
    const subs = c ? (c.id === 'adv' ? [['advs', name === 'advs' && advView === 'detail'], ['advs:career', name === 'advs' && advView === 'career'], ['promo', name === 'promo']].concat(Gm.contractOpen(s) ? [['advs:contract', name === 'advs' && advView === 'contract']] : []) : c.pops.filter(p => (p !== 'car' || Gm.carOn(s)) && (p !== 'sell' || !Gm.gqOn(s))).map(p => [p, p === name])) : [];   // 모험가 장: 명부 · 경력 · 전직 제안
    q('#bookSub').innerHTML = subs.length > 1 ? subs.map(([p, on]) => `<button data-sub="${p}" class="${on ? 'on' : ''}">${subName(p).replace(/ /g, '')}</button>`).join('') : '';
  }
  // ---------- 책: 경영 장 정렬 (2026-11-13) — 기존 화면을 그대로 그린 뒤 왼쪽 / 오른쪽 쪽으로 나눠 담음 (쪽마다 원래 바깥 상자 class를 붙여 스타일 유지) ----------
  function mgBook(b, kind) {
    if (!document.getElementById('pop').classList.contains('book')) return;
    const $ = sel => b.querySelector(sel), mk = (tag, cls, html) => { const e = document.createElement(tag); e.className = cls; if (html) e.innerHTML = html; return e; };
    let inner = '', L = [], Rn = [];
    if (kind === 'ledger') { const lg = $('.lg-book'); if (!lg) return; inner = 'lg-book'; Rn = [lg.querySelector('.lg-chart')]; L = [...lg.children].filter(x => x !== Rn[0]); }
    else if (kind === 'meals') { const k = $('.kitchen'); if (!k) return; inner = 'kitchen'; const p = [...k.children]; L = p.slice(2); Rn = p.slice(0, 2); }   // 2026-11-16 동료 피드백 '레시피(메뉴판)가 메인': 왼쪽 쪽 전체 = 메뉴판 / 오른쪽 = 소재 보관함 + 조리대 (예전 11-13: 왼쪽 보관함 · 오른쪽 조리대 + 메뉴판)
    else if (kind === 'sell') { const k = $('.sell'); if (!k) return; inner = 'sell'; L = [$('.sl-left'), $('.sl-bar')]; Rn = [$('.sl-right')]; }
    else if (kind === 'codex') { const k = $('.cdx'); if (!k) return; inner = 'cdx'; L = [...k.children];
      const t0 = codexTab, rows = CODEX_TABS.map((t, i) => { codexTab = i; const m = codexHtml().match(/(\d+) \/ (\d+) 발견/); return [i, t, m ? +m[1] : 0, m ? +m[2] : 0]; }); codexTab = t0;   // 도감별 발견 수 (각 도감 화면의 "n / N 발견"과 같은 값)
      const tot = rows.reduce((a, r) => [a[0] + r[2], a[1] + r[3]], [0, 0]);
      Rn = [mk('div', 'cdx-sum', `<div class="ux-h">도감 진행 <small>전체 ${tot[0]} / ${tot[1]}</small></div>` + rows.map(([i, t, g, n]) => `<button class="cs-row ${i === codexTab ? 'on' : ''}" data-ctab="${i}"><b>${t}</b><span class="ibar"><i class="f" style="width:${n ? g / n * 100 : 0}%;--w:${Math.max(1, n ? g / n * 100 : 0)}"></i></span><em>${g} / ${n}</em></button>`).join('') + '<p class="cs-note">의뢰에서 만난 몬스터 · 얻은 소재 · 찾은 직업 · 만든 요리 · 산 장비가 채워집니다.</p>')]; }
    else if (kind === 'log') { const g = $('.glog'); if (!g) return; inner = 'glog'; const list = $('.gl-list'), ms = [...list.children];
      const l1 = mk('div', 'gl-list'), l2 = mk('div', 'gl-list'); if (ms[0]) l1.appendChild(ms[0]); ms.slice(1).forEach(x => l2.appendChild(x));
      L = [$('.gl-top'), l1]; Rn = [mk('div', 'ux-h gl-rh', '지난 기록'), l2]; }
    const w = mk('div', `bk2 bk-mg mg-${kind}`), l = mk('section', `bk-l ${inner}`), r = mk('section', `bk-r ${inner}`);
    L.forEach(x => x && l.appendChild(x)); Rn.forEach(x => x && r.appendChild(x)); w.append(l, r);
    const rest = [...b.children]; b.innerHTML = ''; b.appendChild(w); rest.forEach(x => { if (x.id || x.className.includes('tip')) w.appendChild(x); });   // 툴팁 등은 함께 옮김
  }
  // ---------- 책: 리퀘스트 장 (2026-11-16, docs/design/sub_quest_F_v1.md · nomination_v1.md) ----------
  // 왼쪽 = 받은 리퀘스트 목록 + 소문(힌트) / 오른쪽 = 고른 리퀘스트: 사연 · 요구 · 보상 · 돈 내기/납품 또는 지명 창
  let rqSel = null, rqMsg = '';
  const RQ_TYPE = { hunt: '전투', search: '탐색', deliver: '납품', donate: '돈 내기', install: '설치 요청', town: '마을 건물' }, RQ_GIVER = { adventurer: '모험가', resident: '마을 사람', outsider: '외지인' };
  const RQ_STATE = { queued: '다음 주 출발', active: '원정 중' };   // queued인데 예약자가 아직 밖이면 '모이면 출발' (stTxt)
  const rqMat = (id, n, have) => { const m = MATS[id] || { name: id }; return `<span class="rq-chip ${have != null ? (have < n ? 'need no' : 'need ok') : ''}">${m.icon ? `<img src="assets/${m.icon}" alt="">` : ''}${esc(m.name)} ${have != null ? `<b>${Math.min(have, 999)}</b>/` : '×'}${n}</span>`; };
  function rqRewards(v) {
    const d = v.d, rw = d.rw, o = [];
    if (rw.gold) o.push(`<span class="rq-chip gold">${v.nominated ? '보수 ' : ''}${fmt(rw.gold)}G</span>`);
    if (rw.fame) o.push(`<span class="rq-chip">명성 +${rw.fame}</span>`); if (rw.trust) o.push(`<span class="rq-chip">신뢰도 +${rw.trust}</span>`); if (rw.pop) o.push(`<span class="rq-chip">인구 +${rw.pop}</span>`);
    if (rw.attach) o.push(`<span class="rq-chip">${rw.attach[0] === 'all' ? '모든 모험가' : rw.attach[0] === 'party' ? '참가자' : esc(v.giver)} 애착 +${rw.attach[1]}</span>`);
    for (const [m, k] of Object.entries(rw.mats)) o.push(rqMat(m, k));
    if (rw.unlock) o.push(`<span class="rq-chip key">${rw.unlock === 'table' ? '테이블 1세트 더 놓기' : '새 장식: ' + esc((Gm.DECO_BY[rw.unlock] || {}).name || rw.unlock)}</span>`);
    if (rw.town) o.push(`<span class="rq-chip key">마을 건물: ${{ smith: '대장간', potion: '물약 상점' }[rw.town] || rw.town}</span>`);
    const ex = rw.extra || {}; if (ex.popMonthly) o.push(`<span class="rq-chip key">매달 인구 +${ex.popMonthly}</span>`); if (ex.recipe) o.push('<span class="rq-chip key">새 요리 1개</span>'); if (ex.ownerStat) o.push(`<span class="rq-chip">${esc(v.giver)} 주 능력치 +${ex.ownerStat}</span>`); if (ex.ownerXp) o.push(`<span class="rq-chip">${esc(v.giver)} 경험치 +${ex.ownerXp}</span>`);
    return o.join('');
  }
  function rqLinesOf(key, ev, who) {   // 대사 묶음 → [{name, face, text, adv}] ({이름} = 의뢰한 모험가)
    const Lq = (Gm.QLINES[key] || {})[ev] || [], a = who != null ? s.advs.find(x => x.id === who) : null, nm = a ? a.name : '모험가';
    return Lq.map(([sp, face, text]) => ({ name: sp === '{이름}' ? nm : sp, face: sp === '리나' ? (face === 'default' ? 'smile' : face) : 'smile', text: text.replace(/\{이름\}/g, nm), adv: sp === '{이름}' ? a : null }));
  }
  // 금고 증감 연출 (2026-11-16): 숫자가 굴러서 바뀌고, 옆에 +N / −N이 잠깐 떠오름. 새 게임 · 불러오기 직후에는 연출 없이 바로 표시
  let goldOf = null, goldTo = 0, goldNow = 0, goldRaf = 0, goldFx = 0;
  // 목표 안내판 (2026-11-16 동료 피드백 "초반에 뭘 해야 할지 모르겠음" → 가안: 늘 보이는 작은 판). 누르면 리퀘스트 장
  function goalShow() {
    const box = q('#goalBox'); if (!box || !Gm.mainView) return;
    if (root.Tutorial && root.Tutorial.active && root.Tutorial.active()) { if (root.Tutorial.goalPaint) root.Tutorial.goalPaint(); return; }   // 기본 튜토리얼 동안은 튜토리얼 목표 (tutorial.js goalPaint)
    const m = Gm.mainView(s), R = s.req ? s.req.open : [], cnt = st => R.filter(r => r.state === st).length;
    const nNew = R.filter(r => r.isNew).length, nOpen = cnt('open'), nGo = R.length - nOpen;
    let k = '다음 목표', t = '', bar = null, d = '', dc = '', main = false;
    if (m.state === 'done' || s.grade > 0) { k = '목표 달성'; t = `길드가 <b>${GR[s.grade]}급</b>이 되었어요`; d = '모험가 관리소를 지으면 2차 전직을 제안할 수 있어요.'; }
    else if (m.state === 'none') {
      t = `리퀘스트 들어주기 <b>${m.doneN} / ${m.need}</b>`; bar = m.doneN / m.need;
      if (nNew) { d = `새 부탁 ${nNew}건이 왔어요. 눌러서 확인해 보세요.`; dc = 'new'; }
      else if (nOpen) d = `고를 수 있는 부탁 ${nOpen}건${nGo ? ` · 진행 중 ${nGo}건` : ''}`;
      else if (nGo) d = `부탁 ${nGo}건을 들어주는 중이에요.`;
      else d = '새 부탁을 기다리는 중이에요. 마을이 커지면 찾아와요.';
    } else {
      main = true; k = '메인 퀘스트'; t = '「다리를 지켜라」';
      if (m.state === 'offer') { d = '영주의 전갈이 왔어요. 받으면 2주 뒤 침공이 시작돼요.'; dc = 'new'; }
      else if (m.state === 'set') { t = `「다리를 지켜라」 침공까지 <b>${m.left}주</b>`; if (m.blocked) { d = '침공 대비: 모든 의뢰 출발 금지'; dc = 'warn'; } else d = '식사와 물약을 준비하고 모험가를 마을에 남겨 두세요.'; }
      else if (m.state === 'live') { t = '「다리를 지켜라」 침공 중'; d = '마을 다리를 지키는 중이에요.'; dc = 'warn'; }
      else if (m.state === 'cool') { d = `재도전까지 ${m.cool}주 · 리퀘스트 장에서 다시 받을 수 있어요.`; }
    }
    box.classList.toggle('main', main);
    box.innerHTML = `<div class="goal-k">${k}</div><div class="goal-t">${t}</div>${bar != null ? `<div class="goal-b"><i style="width:${Math.round(Math.min(1, bar) * 100)}%"></i></div>` : ''}${d ? `<div class="goal-d ${dc}">${d}</div>` : ''}`;
  }
  UI.goalShow = goalShow;
  function goldShow() {
    const el = q('#hGold'), to = Math.round(s.gold); el.classList.toggle('neg', s.gold < 0); { const lb = el.closest('.stat') && el.closest('.stat').querySelector('.lb'); if (lb) { lb.textContent = s.gold < 0 ? '금고 적자' : '금고'; lb.classList.toggle('neg', s.gold < 0); } }   // 2026-11-17 경제 개편 V2 결정 7: 마이너스인 동안 지출 행동이 막혔음을 알림
    if (goldOf !== s) { goldOf = s; goldTo = goldNow = to; cancelAnimationFrame(goldRaf); el.textContent = fmt(to); return; }
    if (to === goldTo) return;
    const d = to - goldTo, box = el.closest('.stat') || el.parentNode, f = document.createElement('i');
    f.className = 'gfx ' + (d > 0 ? 'up' : 'down'); f.textContent = (d > 0 ? '+' : '−') + fmt(Math.abs(d)) + 'G'; f.style.setProperty('--gy', (goldFx++ % 3) * 16 + 'px');
    box.appendChild(f); setTimeout(() => f.remove(), 1300);
    // 로비의 접수대 위에도 같은 숫자를 띄움 (2026-11-16 15:28 사용자: "상단 HUD와 함께 보여지게"). 마을 화면 · 책이 펼쳐진 동안에는 띄우지 않음
    if (root.Iso && !(root.Town && root.Town.active) && !popup) { const c = document.createElement('i'), at = root.Iso.COUNTER_AT; c.className = 'gfx-desk ' + (d > 0 ? 'up' : 'down'); c.textContent = f.textContent; c.style.left = (at[0] + 105 + ((goldFx % 3) - 1) * 26) + 'px'; c.style.top = (at[1] - 8) + 'px'; stage.ui.appendChild(c); setTimeout(() => c.remove(), 1500); }
    el.classList.remove('gup', 'gdown'); void el.offsetWidth; el.classList.add(d > 0 ? 'gup' : 'gdown');
    goldTo = to; const from = goldNow, t0 = performance.now(), dur = 450;
    cancelAnimationFrame(goldRaf);
    const tick = t => { const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3); goldNow = Math.round(from + (to - from) * e); el.textContent = fmt(goldNow); if (k < 1) goldRaf = requestAnimationFrame(tick); else { goldNow = to; el.textContent = fmt(to); } };
    goldRaf = requestAnimationFrame(tick);
  }
  function mainCardHtml() {   // 메인 퀘스트(침공) 카드: 리퀘스트 장 맨 위 (2026-11-16)
    if (!Gm.mainView) return ''; const m = Gm.mainView(s); if (m.state === 'none' || m.state === 'done') return '';
    const waves = m.waves.map(w => `${esc(w.name)} ${w.boss ? '(보스)' : '×' + w.n}`).join(' → ');
    let body = '';
    if (m.state === 'offer') { const p = Math.round(Gm.mainPredict(s, 20) * 100);
      body = `<p>몬스터가 마을 왼쪽 다리로 쳐들어옵니다. 모두 막아 내면 <b>E급으로 승급</b>합니다.</p><p class="mw">${waves}</p><p>받으면 <b>${m.lead}주 뒤</b> 침공 · 침공 ${m.block}주 전부터 의뢰 출발 금지 · 지금 전력 <b>${m.defenders}명</b> · ${powTag(p / 100)}</p><p class="ms">성공: ${fmt(m.gold)}G · 명성 +${m.fame} · 모험가 관리소 해금 / 실패: 인구 −${m.popLoss}% · 신뢰도 −${m.trustLoss}, ${m.retry}주 뒤 재도전</p><button class="ux-btn ux-btn-primary" data-rqact="main">받기</button>${m.last && !m.last.win ? `<span class="ms">지난 도전: ${m.last.wave + 1 > m.waves.length - 1 ? '보스' : (m.last.wave + 1) + '차'}에서 패배 (${m.tries}번째)</span>` : ''}`; }
    else if (m.state === 'set') body = `<p><b>침공까지 ${m.left}주</b>${m.blocked ? ' · <b class="bad">의뢰 출발 금지</b> (모험가가 마을에서 대비합니다)' : ` · 침공 ${m.block}주 전부터 의뢰 출발이 막힙니다`}</p><p class="mw">${waves}</p>`;
    else body = `<p>영주의 성이 무너졌습니다. <b>${m.cool}주 뒤</b> 다시 도전할 수 있습니다.</p>`;
    return `<div class="rq-main"><i class="gv">메인</i><b>다리를 지켜라</b>${body}</div>`;
  }
  function reqHtml() {
    const V = Gm.reqView(s), R = Gm.reqOf(s), hints = Gm.reqHints(s, 2);
    if (!V.some(v => v.r.id === rqSel)) { rqSel = V[0] ? V[0].r.id : null; rqMsg = ''; }
    for (const v of V) if (v.r.id === rqSel) v.r.isNew = false;
    const stTxt = v => v.lock ? `<i class="st lock">${v.d.season.length && !v.d.season.includes(Gm.seasonOf(s.week)) ? v.d.season.map(x => Gm.SEASON_NAME[x]).join(' · ') + '에 진행' : '집무실 필요'}</i>` : RQ_STATE[v.r.state] ? `<i class="st go">${v.r.state === 'queued' && Gm.reqWaitOf(s, v.r).length ? '모이면 출발' : RQ_STATE[v.r.state]}</i>` : v.r.isNew ? '<i class="st new">새 부탁</i>' : (v.nominated ? `<i class="st">${v.r.party.length ? '지명 중' : '지명 기다림'}</i>` : v.d.type === 'install' ? '<i class="st">설치 기다림</i>' : `<i class="st ${v.canPay ? 'ok' : ''}">${v.canPay ? '낼 수 있음' : '준비 부족'}</i>`);
    let L = mainCardHtml() + `<div class="ux-h">받은 부탁 <small>${V.length}건 · 들어준 부탁 ${Object.values(R.done).reduce((t, x) => t + x.n, 0)}건</small></div><div class="rq-list">`;
    for (const v of V) L += `<button class="rq-card ${v.r.id === rqSel ? 'on' : ''} ${v.lock ? 'lock' : ''} gv-${v.d.giver}" data-rq="${v.r.id}"><i class="gv">${RQ_GIVER[v.d.giver]}</i><span class="tx"><b>${esc(v.name)}</b><em>${esc(v.giver)} · ${RQ_TYPE[v.d.type]}${v.d.type === 'town' ? ` ${v.r.stage}/2` : ''}</em></span>${stTxt(v)}</button>`;
    if (!V.length) L += '<div class="rq-none">지금은 받은 부탁이 없습니다.<br>마을과 길드가 자라면 사람들이 찾아옵니다.</div>';
    L += `</div><div class="ux-h rq-hh">소문 <small>아직 오지 않은 부탁</small></div><div class="rq-hints">${hints.length ? hints.map(h => `<div class="rq-hint"><b>???</b>${esc(h.hint)}</div>`).join('') : '<div class="rq-hint">들려오는 소문이 없습니다.</div>'}</div>`;
    const v = V.find(x => x.r.id === rqSel);
    if (!v) return `<div class="bk2 bk-rq"><section class="bk-l">${L}</section><section class="bk-r"><div class="rq-none big">부탁을 고르면 여기에 사연과 보상이 보입니다.</div></section></div>`;
    const d = v.d, r = v.r, ev = d.type === 'town' && r.stage === 2 ? 'req2' : 'req', lines = rqLinesOf(d.id, ev, r.who);
    let Rr = `<div class="rq-head gv-${d.giver}"><i class="gv">${RQ_GIVER[d.giver]}</i><div><b>${esc(v.name)}</b><span>${esc(v.giver)} · ${RQ_TYPE[d.type]}${d.type === 'town' ? ` (${r.stage} / 2단계)` : ''}${d.season.length ? ' · ' + d.season.map(x => Gm.SEASON_NAME[x]).join(' · ') + '에만' : ''}${d.repeat === 'yearly' ? ' · 매년' : ''}</span></div></div>`;
    Rr += `<div class="rq-say">${lines.map(l => `<p><b>${esc(l.name)}</b>${esc(l.text)}</p>`).join('')}</div>`;
    if (v.lock) Rr += `<div class="rq-lock">${esc(v.lock)}${/집무실/.test(v.lock) ? ` <button class="ux-btn sm" data-rqact="office" ${s.gold < Gm.facCost(s, '집무실') ? 'disabled' : ''}>집무실 짓기 <b>${fmt(Gm.facCost(s, '집무실'))}G</b></button>` : ''}</div>`;
    // 요구
    let need = '';
    // 2026-11-19 사용자: 요구 칩은 처음부터 붉은 글씨(need) → 채우면 파란 글씨(ok) · 못 채운 채 보내기 · 내기를 누르면 못 채운 칩이 좌우로 흔들림
    const nq = ok => `need ${ok ? 'ok' : 'no'}`;
    if (v.need.gold) need += `<span class="rq-chip gold ${nq(s.gold >= v.need.gold)}">${fmt(v.need.gold)}G <small>(금고 ${fmt(s.gold)}G)</small></span>`;
    for (const [m, k] of Object.entries(v.need.mats)) need += rqMat(m, k, s.mats[m] || 0);
    if (d.type === 'install') need += `<span class="rq-chip ${nq(v.goalOk)}">테이블 1세트 놓기 (시설 장 → 설비)</span>`;
    if (v.nominated) { const PR = Gm.reqPartyRange(s, r.id) || d.party, pt = PR[0] === PR[1] ? PR[0] + '명' : PR[0] + '~' + PR[1] + '명';
      const pp = Gm.reqPartyOf(s, r);
      need += `<span class="rq-chip ${nq(pp.length >= PR[0])}">지명 ${pt} · ${d.weeks}주</span>` + (d.req ? `<span class="rq-chip star ${nq(pp.some(a => Gm.reqMeets(s, r, a)))}">★ ${d.req[0] === -1 ? esc(v.giver) + ' 본인' : (d.req[0] === -2 ? '주력 능력치' : Gm.STATS[d.req[0]]) + ' ' + d.req[1] + ' 이상'} 1명</span>` : '') + d.foes.map(f => `<span class="rq-chip enemy">${esc(f.name)}${f.count > 1 ? ' ×' + f.count : ''}${f.boss ? ' (우두머리)' : ''}</span>`).join(''); }
    Rr += `<div class="rq-sec"><i>요구</i><div>${need}</div></div><div class="rq-sec"><i>보상</i><div>${rqRewards(v)}</div></div>`;
    // 행동
    if (!v.nominated) {
      const lab = d.type === 'install' ? '' : v.need.gold ? `돈 내기 <b>${fmt(v.need.gold)}G</b>` : '납품하기';
      Rr += `<div class="rq-act">${lab ? `<button class="ux-btn primary ${v.lock || !v.canPay ? 'soft-off' : ''}" data-rqact="give" ${v.lock ? 'disabled' : ''}>${lab}</button>` : '<span class="rq-note">설비를 놓으면 바로 완료됩니다.</span>'}<span class="rq-msg">${esc(rqMsg)}</span></div>`;
    } else {
      const party = Gm.reqPartyOf(s, r), P = Gm.reqPredict(s, r.id), why = r.state === 'open' ? Gm.reqSendWhy(s, r) : null, rows = Gm.reqNomList(s, r.id);
      const pTxt = P == null ? '' : Gm.reqIsCombat(s, r.id) ? powTag(P) : `<span class="rq-p ${P >= 0.7 ? 'ok' : P >= 0.4 ? 'mid' : 'bad'}">예상 성공률 <b>${Math.round(P * 100)}%</b></span>`;   // 전투 = 승산 칩, 비전투 = 확률
      Rr += `<div class="rq-party"><span class="pl">파티 ${party.length} / ${(Gm.reqPartyRange(s, r.id) || d.party)[1]}</span>${party.map(a => `<span class="pm" style="${faceStyle(a, 34, 178, 17)}" title="${esc(a.name)}"></span>`).join('') || '<em>아래에서 모험가를 눌러 부탁하세요 (부탁할 때마다 섭외비가 나갑니다)</em>'}${pTxt}</div>`;
      Rr += `<div class="rq-act">${r.state === 'open' ? `<button class="ux-btn primary ${why ? 'soft-off' : ''}" data-rqact="send">보내기 <small>(${Gm.reqWaitOf(s, r).length ? '모두 돌아오면 출발' : '다음 주 출발'})</small></button>` : r.state === 'queued' ? `<button class="ux-btn" data-rqact="unsend">출발 취소</button>${Gm.reqWaitOf(s, r).length ? `<span class="rq-note">예약: ${esc(josa(Gm.reqWaitOf(s, r).map(a => a.name).join(' · '), '이', '가'))} 돌아오는 주에 바로 출발해요. 그동안 파티원은 게시판 의뢰를 받지 않아요.</span>` : ''}` : '<span class="rq-note">원정 중입니다. 돌아오면 결과가 나옵니다.</span>'}<span class="rq-msg">${esc(rqMsg || (r.state === 'open' && party.length ? why || '' : ''))}</span></div>`;
      if (r.state !== 'active') {
        Rr += `<div class="rq-nom ${r.state !== 'open' || v.lock ? 'off' : ''}"><div class="nh"><span>모험가</span><span>${d.req && d.req[0] >= 0 ? Gm.STATS[d.req[0]] : rows[0] && rows[0].stat != null ? '주력' : ''}</span><span>애착</span><span>수락</span><span>섭외비</span><span>상태</span></div>`;
        for (const x of rows) { const a = s.advs.find(z => z.id === x.id);
          const st = x.inParty ? (x.busy ? `<b class="ok">✔ 예약 (${x.busy})</b>` : '<b class="ok">✔ 함께 감</b>') : x.other ? `<b class="ng" title="「${esc(x.other)}」에 가기로 함">다른 리퀘스트</b>` : x.busy ? `${x.busy} · 예약 가능` : x.refused ? '<b class="ng">✖ 이번 주 거절</b>' : x.back ? '이번 주 귀환' : x.away ? '마을 밖' : '길드에 있음';
          Rr += `<button class="nr ${x.inParty ? 'in' : ''} ${x.refused || (x.other && !x.inParty) ? 'no' : ''}" data-rqnom="${x.id}"><span class="who"><span class="ux-face" style="${faceStyle(a, 34, 178, 17)}"></span><span><b>${esc(x.name)}</b><em>${esc(x.cls)} Lv ${x.lv}${ctTag(a)}</em></span></span><span class="sv">${d.req ? (x.meets ? '<i class="star">★</i>' : '') : ''}${x.stat != null ? x.stat : ''}</span><span>${x.attach}</span><span class="ch ${!x.owner && Gm.cActive(s, a) && Gm.cCallsLeft(s, a) > 0 ? 'ct' : ''}">${x.owner ? '본인' : x.chance + '%'}</span><span class="fee ${!x.inParty && x.fee > s.gold ? 'lack' : ''}">${x.inParty || !x.fee ? '—' : x.fee + 'G'}</span><span class="stx">${st}</span></button>`; }
        Rr += '</div>';
      }
    }
    return `<div class="bk2 bk-rq"><section class="bk-l">${L}</section><section class="bk-r">${Rr}</section></div>`;
  }
  // 2026-11-19 계약 표시 (사용자: 디자인은 Claude 에게 · 칸 크기가 바뀌지 않게) — 직업 · Lv 줄 끝에 작은 남색 꼬리표, 점 = 남은 '거절 없는 지명' (4주 2번)
  function powTag(P) {   // 2026-11-19 사용자 확정: 전투는 확률이 아니라 실제 전투로 결과가 남 → % 대신 승산 칩 (모의 전투 30번 이긴 비율, 경계 70 · 40% [임시])
    const k = P >= 0.7 ? 0 : P >= 0.4 ? 1 : 2, nm = ['여유', '팽팽', '위험'][k], cl = ['ok', 'mid', 'bad'][k], d = ['●●●', '●●○', '●○○'][k];
    return `<span class="rq-pow ${cl}" title="모의 전투 30번 중 약 ${Math.round(P * 30)}번 이김">승산 <b>${nm}</b><i>${d}</i></span>`;
  }
  function buffIco(a, pt) {   // 2026-11-19 요리 버프 아이콘 (이번 원정 동안)
    const b = Gm.mealBuffOf && Gm.mealBuffOf(s, a); if (!b) return '';
    return `<img class="buff-ico${pt === 2 ? ' ptd' : pt ? ' pt' : ''}" src="assets/${b.icon}" alt="" title="${esc(b.name)} — ${esc(b.effect)} (이번 의뢰 동안)">`;
  }
  function ctTag(a) {
    if (!Gm.cActive(s, a)) return ''; const left = Math.max(0, Gm.cCallsLeft(s, a)), max = (s.cfg.contract && s.cfg.contract.callMax) || 2;
    return `<span class="ct-tag ${left ? '' : 'used'}" title="계약 모험가 · 거절 없는 지명 ${left}/${max}번 남음 (4주마다 다시 참)">계약${Array.from({ length: max }, (_, i) => `<i class="${i < left ? 'on' : ''}"></i>`).join('')}</span>`;
  }
  function rqShake(why) {   // 못 채운 요구 칩이 좌우로 흔들림 + 이유 (2026-11-19)
    const box = document.querySelector('.bk-rq .bk-r'); if (!box) return;
    const m = box.querySelector('.rq-msg'); if (m) { m.textContent = why; m.classList.remove('warn'); void m.offsetWidth; m.classList.add('warn'); }
    box.querySelectorAll('.rq-chip.need.no').forEach(c => { c.classList.remove('shake'); void c.offsetWidth; c.classList.add('shake'); });
    if (root.Audio && root.Audio.sfx) try { root.Audio.sfx('warn'); } catch (e) {}
  }
  function rqAct(act) {
    if (act === 'main') { Gm.mainAccept(s); hooks.changed && hooks.changed(); renderPopup(); return; }
    const v = Gm.reqView(s).find(x => x.r.id === rqSel); if (!v) return;
    const top = s.log[0]; rqMsg = '';
    if (act === 'give' && !v.canPay) { rqShake('아직 준비가 부족합니다.'); return; }
    if (act === 'send' && v.r.state === 'open' && Gm.reqSendWhy(s, v.r)) { rqShake(Gm.reqSendWhy(s, v.r)); return; }
    if (act === 'give') { if (!Gm.reqGive(s, v.r.id)) rqMsg = '아직 준비가 부족합니다.'; else rqStamp('수락', `「${v.name}」`); }   // 2026-11-17 사용자: 도장은 밤 원본(초록 '수락' + 「이름」)으로
    else if (act === 'refuse') Gm.reqRefuse(s, v.r.id);
    else if (act === 'send') { if (Gm.reqSend(s, v.r.id)) { rqMsg = Gm.reqWaitOf(s, v.r).length ? '' : '다음 주가 되면 게시판 의뢰보다 먼저 출발합니다.'; rqStamp('수락', `「${v.name}」 · ${Gm.reqWaitOf(s, v.r).length ? '모이면 출발' : '다음 주 출발'}`); } }
    else if (act === 'unsend') Gm.reqUnsend(s, v.r.id);
    else if (act === 'office') Gm.build(s, '집무실');
    rqFlush(top); hooks.changed(); renderPopup();
  }
  function rqNom(aid) {
    const a = s.advs.find(x => x.id === aid), res = Gm.reqNominate(s, rqSel, aid); if (!a) return;
    rqMsg = res.removed ? `${a.name}: 파티에서 뺐습니다.` : res.why ? `${a.name}: ${res.why}` : `${a.name}: ${res.ok ? '✔' : '✖'} "${res.line}"${res.fee ? ` (섭외비 −${res.fee}G)` : ''}`;
    hooks.changed(); renderPopup();
  }
  // 화면에서 바로 일어난 리퀘스트 기록(완료 · 거절 등)을 로그 · 대사로 흘려보냄 (주 진행 때는 main.js 가 UI.onLogs 로 보냄)
  function rqFlush(top) { const f = []; for (const L of s.log) { if (L === top) break; f.push(L); } if (f.length && f.length < 20) UI.onLogs(f.reverse()); }
  UI.reqBadge = function () { goalShow(); const n = (s.req ? s.req.open : []).filter(r => r.isNew).length + (s.main && s.main.state === 'offer' ? 1 : 0), b = q('#bookMarks [data-ch="req"]'); if (b) b.classList.toggle('alert', n > 0); const c = q('#bReq'); if (c) { c.textContent = n; c.hidden = !n; } return n; };
  const TITLES = { req: '리퀘스트', order: '길드 발주', trade: '매입 · 위탁', car: '떠돌이 상단', sell: '소재 판매 창구', promo: '전직 제안', board: '의뢰 게시판', ledger: '장부', advs: '모험가', fac: '건설', meals: '식당', log: '길드 기록', codex: '도감', verify: '관문 1 검증', opts: '설정' };
  UI.open = function (name) {
    if (name === 'sell' && Gm.gqOn(s)) name = 'trade';   // 2026-11-20: 소재 판매는 소재 관리에 합침
    if (name === 'sell' && !s.built['판매창구']) { toast('판매 창구를 먼저 지어야 합니다. (로비의 판매 창구를 눌러 설치)', 'info'); return; }
    if (name === 'car' && s && Gm.carOn(s)) { carSeen = Gm.carHere(s).map(c => c.id + ':' + s.car[c.id].until).join(','); setTimeout(carBadge, 0); }
    const wasOpen = q('#popBack').classList.contains('open'), prev = popup;
    if (!bookHold) { bookHold = true; bookSp = curSp; hooks.setSpeed && hooks.setSpeed(0); document.body.classList.add('bookOn'); }   // 책을 펼치면 일시정지 + HUD 숨김 (2026-11-16)
    const go = () => {
      popup = name; q('#popTitle').textContent = popTitle(name);
      q('#popBack').classList.add('open'); stage.ui.querySelectorAll('[data-pop]').forEach(b => b.classList.toggle('on', b.dataset.pop === name));
      q('#popBody').innerHTML = ''; q('#popBody').dataset.g = ''; q('#popBody').dataset.p = name; renderPopup(); q('#popBody').scrollTop = 0;
      bookSync(name);
      if (name === 'verify') verify();
    };
    // 책 연출 (2026-11-14, js/book_fx.js): 다른 장으로 가면 쪽 넘기기(여러 장이면 촤르륵), 처음 열면 표지 펼치기
    const ci = n => BOOK.findIndex(c => c.pops.includes(n));
    if (root.BookFX && wasOpen && prev && ci(prev) >= 0 && ci(name) >= 0 && ci(prev) !== ci(name)) { root.BookFX.flip(ci(prev), ci(name), go); return; }
    go();
    if (root.BookFX && !wasOpen) root.BookFX.openCover();
  };
  UI.chapterOf = name => (chapterOf(name) || {}).id || null;   // 2026-11-19 튜토리얼: 책이 열려 있을 때 메뉴 단추 대신 밝힐 책갈피
  UI.popupName = () => popup;   // 2026-11-18 튜토리얼: 지금 펼친 장
  UI.repop = () => { if (popup) renderPopup(); };   // 지금 장을 다시 그림 (튜토리얼이 재료를 준 뒤 등)
  UI.dlgBusy = () => !!(Dlg.cur || Dlg.lines.length || Dlg.gap > 0);
  UI.closeFx = function () { if (root.BookFX && popup) root.BookFX.closeCover(() => UI.close()); else UI.close(); };   // 책끈 · Esc · 바깥 누르기 = 표지 덮으며 닫기
  let bookHold = false, bookSp = 1;   // 책이 펼쳐진 동안 시간 정지: 닫으면 펼치기 전 속도로
  UI.close = function () { if (bookHold) { bookHold = false; document.body.classList.remove('bookOn'); hooks.setSpeed && hooks.setSpeed(bookSp); } mTipHide(); const kt = document.getElementById('kToast'); if (kt) kt.classList.remove('on'); popup = null; q('#popBack').classList.remove('open'); stage.ui.querySelectorAll('[data-pop]').forEach(b => b.classList.remove('on')); };
  function renderPopup() {
    const b = q('#popBody');
    if (popup === 'board') renderBoard(b);
    else if (popup === 'ledger') { b.innerHTML = ledgerHtml(); mgBook(b, 'ledger'); ledgerTipBind(b); }
    else if (popup === 'advs') { const keep = sel => { const el = b.querySelector(sel); return el ? el.scrollTop : 0; }, t1 = keep('.av-list'), t2 = keep('.av-main'); b.innerHTML = document.getElementById('pop').classList.contains('book') ? advsBookHtml() : advsHtml(); const d1 = b.querySelector('.av-list'), d2 = b.querySelector('.av-main'); if (d1) d1.scrollTop = t1; if (d2) d2.scrollTop = t2; advTipBind(b); }
    else if (popup === 'promo') { const l0 = b.querySelector('.pm-list'), m0 = b.querySelector('.pm-main'), y = l0 ? l0.scrollTop : 0, sel0 = b.dataset.psel, my = m0 ? m0.scrollTop : 0; b.innerHTML = document.getElementById('pop').classList.contains('book') ? promoBookHtml() : promoHtml(); const l1 = b.querySelector('.pm-list'), m1 = b.querySelector('.pm-main'); if (l1) l1.scrollTop = y; if (m1 && sel0 === String(promoSel)) m1.scrollTop = my; b.dataset.psel = promoSel; const on = l1 && l1.querySelector('.ux-row.on'); if (on && (on.offsetTop < l1.scrollTop || on.offsetTop + on.offsetHeight > l1.scrollTop + l1.clientHeight)) on.scrollIntoView({ block: 'nearest' }); }   // 목록이 길어도 스크롤 위치 유지, 고른 모험가는 보이게
    else if (popup === 'fac') b.innerHTML = document.getElementById('pop').classList.contains('book') ? facBookHtml() : facHtml();
    else if (popup === 'meals') { const m0 = b.querySelector('.kmenuwrap'), y = m0 ? m0.scrollTop : 0; b.innerHTML = mealsHtml(); mgBook(b, 'meals'); const m1 = b.querySelector('.kmenuwrap'); if (m1) m1.scrollTop = y; }   // 메뉴판만 스크롤 (위쪽 보관함·조리대는 고정)
    else if (popup === 'log') { const l0 = b.querySelector('.gl-list'), y = l0 ? l0.scrollTop : 0; b.innerHTML = logHtml(); mgBook(b, 'log'); const l1 = b.querySelector('.gl-list'); if (l1) l1.scrollTop = y; }   // 필터 줄은 고정, 목록만 스크롤 (다시 그려도 위치 유지)
    else if (popup === 'codex') { b.innerHTML = codexHtml(); mgBook(b, 'codex'); }
    else if (popup === 'sell') { b.innerHTML = sellHtml(); mgBook(b, 'sell'); }
    else if (popup === 'trade') { const k = b.querySelector('.gq-mp'), y = k ? k.scrollTop : 0; b.innerHTML = Gm.gqOn(s) ? matHtml() : tradeHtml(); const k1 = b.querySelector('.gq-mp'); if (k1) k1.scrollTop = y; }   // 2026-11-20 매입 개편: 목록 스크롤 유지
    else if (popup === 'car') { const keep = sel => { const el = b.querySelector(sel); return el ? el.scrollTop : 0; }, y1 = keep('.bk-car .bk-l'), y2 = keep('.bk-car .bk-r'); b.innerHTML = carHtml(); const l1 = b.querySelector('.bk-car .bk-l'), r1 = b.querySelector('.bk-car .bk-r'); if (l1) l1.scrollTop = y1; if (r1) r1.scrollTop = y2; }   // 2026-11-20 떠돌이 상단
    else if (popup === 'order') { const keep = sel => { const el = b.querySelector(sel); return el ? el.scrollTop : 0; }, y1 = keep('.bk-gq .bk-l'), y2 = keep('.bk-gq .bk-r'); b.innerHTML = Gm.gqOn(s) ? gqHtml() : orderHtml(); const l1 = b.querySelector('.bk-gq .bk-l'), r1 = b.querySelector('.bk-gq .bk-r'); if (l1) l1.scrollTop = y1; if (r1) r1.scrollTop = y2; }   // 2026-11-20 길드 의뢰
    else if (popup === 'opts') b.innerHTML = optsHtml();
    else if (popup === 'req') { const keep = sel => { const el = b.querySelector(sel); return el ? el.scrollTop : 0; }, y1 = keep('.bk-rq .bk-r'), y2 = keep('.rq-list'), sel0 = b.dataset.rsel; b.innerHTML = reqHtml(); const r1 = b.querySelector('.bk-rq .bk-r'), l1 = b.querySelector('.rq-list'); if (r1 && sel0 === String(rqSel)) r1.scrollTop = y1; if (l1) l1.scrollTop = y2; b.dataset.rsel = rqSel; UI.reqBadge(); }
  }

  // 소재 판매 창구 (docs/balance/economy_v1.md 6절, 시설 팝업 '판매하기'로 열기): 보관 소재를 직접 팖. 음식이 아닌 소재 먼저, 음식 소재는 "요리 재료"
  const SELL_P = [6, 9, 12, 30, 36, 48, 90];
  let sellSel = null;
  const sellPrice = m => Gm.matSellPrice(s, m.id);   // 판매 창구 업그레이드 +3G (2026-11-12) · 2026-11-17 규칙은 game_core.matSellPrice · 2026-11-19 시세
  const trendTag = id => { const t = Gm.mktTrend(s, id), x = Gm.mktMult(s, id); return `<span class="mk-tr ${t > 0 ? 'up' : t < 0 ? 'dn' : ''}" title="시세 · 기준가의 ${Math.round(x * 100)}% (4주 전과 비교)">${t > 0 ? '▲ ' : t < 0 ? '▼ ' : ''}기준 ${Math.round(x * 100)}%</span>`; };   // V4 2단계
  function sellDo(ids, all) { const { n, g } = Gm.sellMats(s, ids.map(id => [id, all ? (s.mats[id] || 0) : 1]));
    if (!n) return;   // 장부: '소재 판매' 줄 (game_core.sellMats)
    Gm.log(s, `소재 ${n}개를 팔아 ${g}G를 받았습니다.`, 'guild'); UI.hud && UI.hud(); }
  // 2026-11-19 시세 그래프 (V4 2단계): 한 소재의 최근 시세(G) 선 하나 + 기준가 점선. 주마다 마우스를 올리면 값. 색은 선 #00897b (검사 통과: 채도 · 대비), 글자는 잉크색
  function priceChart(id, W, H, weeks, noBase) {   // noBase: 기준가 선 · 글자 없이 (2026-11-20 사용자: 기준가는 기획서에만)
    const L = weeks ? Gm.mktLogOf(s, id).slice(-weeks) : Gm.mktLogOf(s, id), base = Gm.matBase(id), wk = w => { const d = s.week - w; return d <= 1 ? '이번 주' : (d - 1) + '주 전'; };
    if (L.length < 2) return '<div class="pc-none">시세 기록이 2주 이상 쌓이면 그래프가 보입니다.</div>';
    const ps = L.map(x => x[1]), lo = Math.min(base, ...ps), hi = Math.max(base, ...ps), y0 = Math.max(0, Math.floor(lo - Math.max(0.5, (hi - lo) * 0.15))), y1 = Math.ceil(hi + Math.max(0.5, (hi - lo) * 0.15));
    const ml = 34, mr = 46, mt = 10, mb = 22, iw = W - ml - mr, ih = H - mt - mb;
    const X = i => ml + (L.length === 1 ? iw : iw * i / (L.length - 1)), Y = v => mt + ih * (1 - (v - y0) / (y1 - y0 || 1));
    const line = L.map((x, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(x[1]).toFixed(1)}`).join(''), last = L[L.length - 1], lx = X(L.length - 1), ly = Y(last[1]);
    const step = iw / Math.max(1, L.length - 1);
    const hits = L.map((x, i) => `<rect class="pc-hit" x="${(X(i) - step / 2).toFixed(1)}" y="${mt}" width="${step.toFixed(1)}" height="${ih}"><title>${wk(x[0])} · ${Math.round(x[1])}G${noBase ? '' : ` (기준의 ${Math.round(x[1] / base * 100)}%)`}</title></rect><circle class="pc-dot" cx="${X(i).toFixed(1)}" cy="${Y(x[1]).toFixed(1)}" r="4"></circle>`).join('');
    return `<svg class="pc" viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="${esc((MATS[id] || {}).name || id)} 시세 기록: ${L.length}주, 지금 ${Math.round(last[1])}G, 기준 ${base}G">`
      + `<line class="pc-ax" x1="${ml}" y1="${mt + ih}" x2="${ml + iw}" y2="${mt + ih}"/>`
      + (noBase ? '' : `<line class="pc-base" x1="${ml}" y1="${Y(base).toFixed(1)}" x2="${ml + iw}" y2="${Y(base).toFixed(1)}"/><text class="pc-t" x="${ml + iw + 4}" y="${(Y(base) + 4).toFixed(1)}">기준 ${base}G</text>`)
      + `<text class="pc-t" x="${ml - 4}" y="${mt + 4}" text-anchor="end">${y1}G</text><text class="pc-t" x="${ml - 4}" y="${mt + ih}" text-anchor="end">${y0}G</text>`
      + `<text class="pc-t" x="${ml}" y="${H - 4}">${wk(L[0][0])}</text><text class="pc-t" x="${ml + iw}" y="${H - 4}" text-anchor="end">이번 주</text>`
      + `<path class="pc-line" d="${line}"/><circle class="pc-end" cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="4"/><text class="pc-v" x="${(lx + 7).toFixed(1)}" y="${(ly - 6).toFixed(1)}">${Math.round(last[1])}G</text>${hits}</svg>`;
  }
  function priceSpark(id) {   // 매입 · 위탁 줄에 붙는 작은 선 (최근 12주)
    const L = Gm.mktLogOf(s, id).slice(-12); if (L.length < 2) return '';
    const ps = L.map(x => x[1]), lo = Math.min(...ps), hi = Math.max(...ps), W = 56, H = 18, X = i => 1 + (W - 2) * i / (L.length - 1), Y = v => H - 2 - (H - 4) * (hi === lo ? 0.5 : (v - lo) / (hi - lo));
    return `<svg class="pc-spark" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true"><path d="${L.map((x, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(x[1]).toFixed(1)}`).join('')}"/></svg>`;
  }
  function sellHtml() {
    const mats = s.mats || {}, known = s.knownMats || {};
    const have = Object.values(MATS).filter(m => known[m.id] && (mats[m.id] || 0) > 0).sort((a, b) => GR.indexOf(a.grade) - GR.indexOf(b.grade));
    const nf = have.filter(m => m.line !== 'food'), fd = have.filter(m => m.line === 'food');
    if (sellSel && !(mats[sellSel] > 0)) sellSel = null; if (!sellSel && have.length) sellSel = (nf[0] || fd[0]).id;
    const cell = m => `<button class="kmat ${sellSel === m.id ? 'sel' : ''}" data-ssel="${m.id}" data-mt="${m.id}"><span class="ux-slot" data-g="${GR.indexOf(m.grade)}">${matImg(m)}${cntBadge(mats[m.id])}</span><em>${esc(m.name)}</em></button>`;
    const sum = ms => ms.reduce((t, m) => t + Gm.sellPreview(s, m.id, mats[m.id]), 0);   // 2026-11-19: 한 개 팔 때마다 시세가 내려감
    const m = sellSel && MATS[sellSel];
    const detail = m ? `<div class="sl-d"><div class="sl-top"><span class="ux-slot" data-g="${GR.indexOf(m.grade)}" style="width:96px;height:96px">${matImg(m)}</span><div><div class="sl-nm">${badge(GR.indexOf(m.grade))}<b>${esc(m.name)}</b></div>${m.line === 'food' ? '<span class="ux-tag sl-food">요리 재료</span>' : ''}<div class="ux-muted sl-ds">${esc(m.desc || '')}</div></div></div>
      <div class="sl-kv"><span>보유</span><b>${mats[m.id]}개</b><span>1개 가격</span><b>${sellPrice(m)} G ${trendTag(m.id)}</b><span>전부 팔면</span><b>${Gm.sellPreview(s, m.id, mats[m.id])} G</b><span>팔면</span><b class="sl-hint">많이 팔수록 마을에 흔해져 값이 내려갑니다</b></div>
      <div class="sl-chart"><div class="sl-ch">시세 기록 <small>최근 ${Gm.mktLogOf(s, m.id).length}주 · 마우스를 올리면 그 주 값</small></div>${priceChart(m.id, 420, 140)}</div>
      <div class="sl-btns"><button class="ux-btn" data-sone="${m.id}">1개 팔기</button><button class="ux-btn primary" data-sall="${m.id}">전부 팔기</button></div></div>` : '<div class="ux-muted">팔 소재가 없습니다.</div>';
    return `<div class="sell"><div class="kpan sl-left"><div class="ux-h">음식이 아닌 소재 <small>${nf.length}종 · ${sum(nf)} G</small></div><div class="kpantry">${nf.map(cell).join('') || '<span class="ux-muted">없음</span>'}</div>
      <div class="ux-h" style="margin-top:16px">음식 소재 <small>요리 재료 · 팔면 요리를 못 만들 수 있음</small></div><div class="kpantry">${fd.map(cell).join('') || '<span class="ux-muted">없음</span>'}</div></div>
      <div class="kpan sl-right">${detail}</div>
      <div class="sl-bar"><span>이번 달 판매액 <b>${Math.round(s.month.sell || 0)} G</b></span><button class="ux-btn primary" data-snf="1" ${nf.length ? '' : 'disabled'}>음식이 아닌 소재 모두 팔기 (${sum(nf)} G)</button></div></div>`;
  }

  // 도감: 탭만 먼저 만든 빈 틀 (내용은 이후에 채움)
  const CODEX_TABS = ['몬스터', '소재·아이템', '직업', '요리', '장비'];
  let codexTab = 0;
  // 도감 (docs/design/popup_codex.md): 모든 항목을 등급 줄마다 아이콘 칸으로. 모르는 것은 실루엣 + ?, 아는 것은 마우스를 올리면 오버 창
  function codexHtml() {
    const C = GD_.content || {}, top = s.grade, known = s.knownMats || {}, seen = s.seenMons || {}, disc = s.discovered || {};
    const maxGear = Math.max(-1, ...s.advs.map(a => Math.max(...Gm.eqOf(a))));
    const img = src => src ? `<img src="assets/${src}" alt="">` : '';
    let rows = [];   // [등급, [칸 html]]
    const tabs = '<div class="cdx-tabs">' + CODEX_TABS.map((t, i) => `<button data-ctab="${i}"${i === codexTab ? ' class="on"' : ''}>${t}</button>`).join('') + '</div>';
    const cell = (g, on, inner, attr, name) => `<div class="cdx-c ${on ? '' : 'off'}"><span class="ux-slot ${on ? '' : 'unk'}" data-g="${g}" ${on ? attr : ''}>${on || /<img|cdx-mon/.test(inner) ? inner : ''}</span><em>${on ? esc(name) : '???'}</em></div>`;
    let n = 0, got = 0;
    const byGrade = (list, fn) => { for (let g = 0; g < 7; g++) { const xs = list.filter(x => GR.indexOf(x.grade) === g); if (!xs.length) continue; rows.push([g, xs.map(x => { const r = fn(x, g); n++; if (r.on) got++; return cell(g, r.on, r.inner, r.attr, x.name); })]); } };
    if (codexTab === 0) byGrade(C.monsters || [], m => ({ on: !!seen[m.id], inner: `<i class="cdx-mon" style="background-image:url(assets/expedition/${m.img || 'mon/' + m.id + '.png'})"></i>`, attr: `data-nt="${m.id}"` }));
    else if (codexTab === 1) {
      byGrade((C.materials || []).slice().sort((a, b) => (a.line === 'food') - (b.line === 'food')), m => ({ on: !!known[m.id], inner: matImg(m), attr: `data-mt="${m.id}"` }));
      const mats = rows; rows = []; const pots = (C.items || []).filter(i => i.kind === 'potion');
      byGrade(pots, p => ({ on: GR.indexOf(p.grade) <= top, inner: img(p.icon), attr: `data-pt="${p.id}"` }));
      const potRows = rows; rows = mats;
      var extra = potRows.length ? `<div class="cdx-sub">물약</div>` + potRows.map(([g, cs]) => `<div class="cdx-row">${badge(g)}<div class="cdx-grid">${cs.join('')}</div></div>`).join('') : '';
      var subTitle = '<div class="cdx-sub">소재</div>';
    }
    else if (codexTab === 2) {   // 직업: 1차는 처음부터, 2·3차는 길을 찾으면(discovered) 공개
      const C1 = Gm.CLASS1.map((name, i) => ({ name, st: 1, icon: `chr/chr_${['warrior', 'archer', 'mage', 'cleric', 'rogue'][i]}_m_front.png`, line: [i] }));
      const groups = [['1차 직업', C1], ['2차 직업', Gm.CLASS2.map(c => ({ name: c.name, st: 2, line: c.line, req: c.req }))], ['3차 직업', Gm.CLASS3.map(c => ({ name: c.name, st: 3, line: c.line, req: c.req, from: c.from, town: c.town }))]];
      var jobHtml = groups.map(([t, list]) => { const cs = list.map(c => { const on = c.st === 1 || !!disc[c.name] || s.advs.some(a => a.cls === c.name); n++; if (on) got++;
        return `<div class="cdx-c ${on ? '' : 'off'}"><span class="ux-slot ${on ? '' : 'unk'} job" data-g="${c.st - 1}" ${on ? `data-jt="${esc(c.name)}"` : ''}>${c.icon ? `<i class="jface" style="${faceStyle({ core: c.line[0], id: 1 }, 70, 320, 36)}"></i>` : `<b class="jl">${on ? esc(c.name.slice(0, 1)) : ''}</b>`}</span><em>${on ? esc(c.name) : '???'}</em></div>`; }).join('');
        return `<div class="cdx-sub">${t}</div><div class="cdx-grid">${cs}</div>`; }).join('');
    }
    else if (codexTab === 3) byGrade(Gm.DISH.filter(d => !d.dungeon || s.dishes[d.name]).map(d => ({ name: d.name, grade: GR[d.g], icon: d.icon })), d => ({ on: !!s.dishes[d.name], inner: img(d.icon), attr: `data-dt="${esc(d.name)}"` }));
    else byGrade((C.items || []).filter(i => i.kind === 'gear'), it => ({ on: GR.indexOf(it.grade) <= maxGear, inner: img(it.icon), attr: `data-gt="${it.id}"` }));
    const body = codexTab === 2 ? jobHtml : (subTitle || '') + rows.map(([g, cs]) => `<div class="cdx-row">${badge(g)}<div class="cdx-grid">${cs.join('')}</div></div>`).join('') + (extra || '');
    return `<div class="cdx">${tabs}<div class="cdx-head"><b>${CODEX_TABS[codexTab]} 도감</b><span class="ux-muted">${got} / ${n} 발견</span><span class="ux-bar"><i style="width:${n ? got / n * 100 : 0}%"></i></span></div><div class="cdx-list">${body}</div></div>`;
  }

  // ---------- 의뢰 게시판 (docs/design/popup_board.md) ----------
  // 위: 의뢰 배분 버튼(없음·적게·보통·우선) / 아래: 작은 의뢰 카드 격자 + 마우스 오버 창
  const GD_ = root.GAME_DATA || {}, QT = {}, MATS = {}, MONS = {};
  for (const t of ((GD_.content || {}).quests || [])) QT[t.id] = t;
  for (const m of ((GD_.content || {}).materials || [])) MATS[m.id] = m;
  // 아이템 칸 숫자: 개수 = 오른쪽 아래, 강화 = 오른쪽 위 (+n, 단계별 색)
  const cntBadge = n => n > 0 ? `<b class="ux-cnt">${n}</b>` : '';
  const enhBadge = n => n > 0 ? `<b class="ux-enh t${n >= 10 ? 3 : n >= 5 ? 2 : 1}">+${n}</b>` : '';
  const matImg = m => m.icon ? `<img src="assets/${m.icon}" alt="">` : `<b class="noimg">${esc(m.name).slice(0, 2)}</b>`;   // 아이콘이 아직 없는 소재는 이름 앞 두 글자
  for (const m of ((GD_.content || {}).monsters || [])) MONS[m.id] = m;
  const CBq = root.GuildCombat ? root.GuildCombat.make(GD_) : null;
  const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const SKULL = on => `<svg class="sk${on ? '' : ' off'}" viewBox="0 0 20 20" aria-hidden="true"><path d="M10 1.5c-4.4 0-7.5 3-7.5 7 0 2.3 1 3.9 2.4 4.9v2.4c0 .7.6 1.2 1.2 1.2h1.3v1.5h1.6V17h2v1.5h1.6V17h1.3c.7 0 1.2-.5 1.2-1.2v-2.4c1.4-1 2.4-2.6 2.4-4.9 0-4-3.1-7-7.5-7z"/><circle cx="6.9" cy="9.3" r="2" fill="#fff6e4"/><circle cx="13.1" cy="9.3" r="2" fill="#fff6e4"/><path d="M10 11.6l-1.2 2h2.4z" fill="#fff6e4"/></svg>`;
  // 위험도: 그 등급 표준 모험가(장비 없음) 몇 명이면 예측 승률 70% 이상인가 (1~3, 비전투 0). 의뢰 종류마다 한 번만 계산
  const dangerCache = {};
  function stdUnit(core, g) {
    const lv = [2, 6, 10, 18, 26, 35, 45][g], A = s.cfg.adv;
    const st = [0, 1, 2, 3, 4].map(i => (i === core ? A.startCore + 2 + (lv - 1) * 1.2 : A.startOther + 1.5 + (lv - 1) * 0.5));
    return CBq.unit({ id: 900 + core, core, lv, risk: 1, spend: 1, pots: 1 }, i => st[i], -1, 0);
  }
  function danger(T, g) {
    if (!T || !T.enemies || !T.enemies.length || !CBq || !CBq.ok) return { n: 0 };
    if (dangerCache[T.id]) return dangerCache[T.id];
    const en = []; for (const e of T.enemies) for (let k = 0; k < e.count; k++) en.push({ hp: e.hp, atk: e.atk, def: e.def || 0, name: e.name, boss: !!e.boss });
    let need = 3, rate = 0;
    for (let n = 1; n <= 3; n++) {
      let sum = 0; for (let c = 0; c < 5; c++) { const party = []; for (let k = 0; k < n; k++) party.push(stdUnit((c + k) % 5, g)); sum += CBq.predict(party, en, g, 1); }
      rate = sum / 5; if (rate >= 0.7) { need = n; break; }
    }
    return (dangerCache[T.id] = { n: need, rate, more: rate < 0.7 });
  }
  // 의뢰 레벨 배지 (2026-11-18 결정 35, 시안 quest_level 확인): Lv1 · Lv2(구리) · Lv3(은), 막 오른 의뢰는 보라 '?'(정보 흐림)
  const qlvBadge = (q, big) => q.lv ? `<span class="ql-b l${q.lv}" title="의뢰 레벨">Lv${q.lv}</span>${q.fz ? `<span class="ql-fog" title="레벨이 막 올라 적 정보가 부정확">${big ? '정보 흐림' : '?'}</span>` : ''}` : '';
  const foeBand = q => q.foe == null ? null : q.foe < 0.95 ? 'down' : q.foe > 1.05 ? 'up' : 'mid';
  // 의뢰 기한 막대 (2026-11-12): 남은 비율 = (기한 − 게시 후 지난 주 − 이번 주 진행률) ÷ 기한. 주 게이지와 같은 진행률로 매 프레임 줄어듦
  let wkFrac = 0;
  const gqOf = q => q && q.gq != null ? (s.gq || []).find(o => o.id === q.gq) || null : null;   // 2026-11-20 게시판 카드 → 길드 의뢰
  const qWkLeft = q => { const G = gqOf(q); return G ? G.end - s.week : Gm.expireWeeks(s) - (s.week - q.posted); };   // 길드 의뢰 카드는 길드 의뢰 기한
  const dlLeft = (q, f) => { const G = gqOf(q), W = G ? Math.max(1, G.end - (G.w != null ? G.w : q.posted)) : Gm.expireWeeks(s); return Math.max(0, Math.min(1, (qWkLeft(q) - (f || 0)) / W)); };
  const ageOf = q => { const w = s.week - q.posted; return w >= 4 ? 2 : w >= 2 ? 1 : 0; };
  const cleanName = q => q.name || `${GR[q.g]}급 ${Gm.QTYPE[q.type]} 의뢰`;
  const gradeImg = (g, cls) => `<i class="ux-grade ${cls || ''}" style="background-image:url(assets/ui/hud/badge_${GR[g]}.png)" title="${GR[g]}급"></i>`;
  let qHover = null, qTimer = 0;
  let qSel = null, feeOpen = false;   // feeOpen: 오른쪽 쪽 '이 의뢰 수수료' 칸 펼침 (2026-11-18: 평소 접어 둠 — 전투 의뢰 상세가 쪽을 넘쳐 의뢰 취소 버튼과 겹치던 문제)
  function renderBoard(b) {
    if (document.getElementById('pop').classList.contains('book')) return renderBoardBook(b);
    const cap = Gm.boardCap(s);
    // 의뢰 배분: 제목 + 아랫줄에 등급별 버튼 (한 줄 3등급, 등급이 늘면 아래 게시판이 밀림)
    let top = '<div class="ux-h">의뢰 배분 <small>등급별로 받을 의뢰의 비율을 정합니다</small></div><div class="qb-alloc">';
    for (let g = 0; g <= s.grade; g++) {
      const lv = Gm.filterLevel(s.filter[g]);
      top += `<div class="qb-g">${gradeImg(g, 'sm')}<div class="seg">${Gm.FILTER_NAME.map((n, k) => `<button data-flv="${g}:${k}" class="${lv === k ? 'on' : ''}${k === 0 ? ' none' : ''}">${n}</button>`).join('')}</div></div>`;
    }
    top += '</div>';
    let cards = '';
    for (const q of s.board) {
      const T = QT[q.tid], d = danger(T, q.g), fb = foeBand(q), intel = !!s.built['정보실'];
      const sk = d.n ? `<span class="skulls" title="위험도">${[1, 2, 3].map(k => SKULL(k <= d.n)).join('')}</span>` : '';
      const foe = d.n ? (intel ? (fb === 'up' ? '<i class="foe up" title="강한 무리">▲</i>' : fb === 'down' ? '<i class="foe down" title="약한 무리">▼</i>' : '') : '<i class="foe unk" title="정보실이 있으면 알 수 있음">?</i>') : '';
      cards += `<div class="qcard age${ageOf(q)}${q.x2 ? ' x2' : ''}" data-q="${q.id}"><div class="r1">${gradeImg(q.g, 'sm')}<b>${esc(cleanName(q))}</b>${qlvBadge(q)}${q.x2 ? '<em class="qx2" title="골드 보상 2배">×2</em>' : ''}${q.gq != null ? '<span class="gq-tag">길드 의뢰</span>' : ''}</div>
        <div class="r2">${sk}${foe}${q.party ? `<em class="qparty" title="파티 의뢰 — 적이 많아 ${q.party}명 이상이 함께 가야 이길 만해요">파티 ${q.party}+</em>` : ''}<span class="gold"><i></i>${fmt(q.reward * (q.x2 ? 2 : 1))}G</span><button class="ux-btn danger sm" data-wd="${q.id}">${q.gq != null ? '거두기' : '취소'}</button></div>
        <div class="qdl" title="남은 기한"><i data-dl="${q.id}" style="width:${(dlLeft(q, wkFrac) * 100).toFixed(1)}%"></i></div></div>`;
    }
    if (!s.board.length) cards = '<div class="ux-empty qb-none">게시된 의뢰가 없습니다. 의뢰는 매주 들어옵니다.</div>';
    b.innerHTML = top + `<div class="ux-h qb-h">게시된 의뢰 <small>${s.board.length} / ${cap}칸 · 카드에 마우스를 올리면 자세히 보입니다</small></div><div class="qb-grid">${cards}</div><div class="qtip" id="qTip"></div>`;
    b.onclick = e => {
      const wd = e.target.closest('[data-wd]'); if (wd) { Gm.withdrawQuest(s, +wd.dataset.wd); qHover = null; hooks.changed(); return; }
      const fl = e.target.closest('[data-flv]'); if (fl) {
        const [g, k] = fl.dataset.flv.split(':').map(Number), w = s.filter.slice(); w[g] = Gm.FILTER_W[k];
        if (!Gm.setFilter(s, w)) { toast('적어도 한 등급은 의뢰를 받아야 합니다.', 'warn'); return; }
        hooks.changed();
      }
    };
    b.onmouseover = e => { const c = e.target.closest('.qcard'); if (!c) return; const id = +c.dataset.q; if (id === qHover) return; clearTimeout(qTimer); qTimer = setTimeout(() => { qHover = id; showTip(b); }, 200); };
    b.onmouseout = e => { const c = e.target.closest('.qcard'); if (!c || c.contains(e.relatedTarget)) return; clearTimeout(qTimer); qHover = null; b.querySelector('#qTip').classList.remove('on'); };
    if (qHover != null) showTip(b);   // 다시 그린 뒤에도 보고 있던 카드면 유지
  }
  // 책 펼침 (2026-11-13 단계 ③): 왼쪽 쪽 = 의뢰 배분 + 게시된 의뢰 목록 / 오른쪽 쪽 = 고른 의뢰 상세 (마우스 오버 창 대신)
  function renderBoardBook(b) {
    const cap = Gm.boardCap(s);
    if (!s.board.some(x => x.id === qSel)) qSel = s.board.length ? s.board[0].id : null;
    // 의뢰 배분 = 등급마다 막대 3개 (없음 0 · 적게 1 · 보통 2 · 우선 3), 7등급 한 줄. 아직 안 열린 등급은 자물쇠 (2026-11-13 결정)
    let L = '<div class="ux-h">의뢰 배분 <small>막대가 많을수록 그 등급 의뢰를 많이 받습니다</small></div><div class="qb-bars">';
    for (let g = 0; g < GR.length; g++) {
      if (g > s.grade) { L += `<div class="qbb lock" title="${GR[g]}급 · 아직 열리지 않음">${gradeImg(g, 'sm')}<span class="bars"><i></i><i></i><i></i></span></div>`; continue; }
      const lv = Gm.filterLevel(s.filter[g]);
      L += `<div class="qbb${lv ? '' : ' off'}" title="${GR[g]}급 · ${Gm.FILTER_NAME[lv]}">${gradeImg(g, 'sm')}<span class="bars">${[1, 2, 3].map(k => `<button data-fb="${g}:${k}" class="${k <= lv ? 'on' : ''}" title="${GR[g]}급 · ${Gm.FILTER_NAME[k]}"></button>`).join('')}</span></div>`;
    }
    L += '</div>';
    { // 2026-11-17 V2 E5-4 (결정 11 · 22, 시안 사용자 확인): 등급 기본 수수료 — 따로 정하지 않은 그 등급 의뢰에 붙음, 출발한 의뢰는 출발 때 수수료 그대로
      const O = s.cfg.econ.feeOpt || [0.1, 0.15, 0.2], open = Gm.feeOptions(s), fb0 = s.cfg.econ.feeBase != null ? s.cfg.econ.feeBase : 0.1;   // 2026-11-19 결정 42: 5% 추가 (잠금 사유는 Gm.feeLock)
      for (let g = 0; g <= s.grade && g < GR.length; g++) { const cur = Gm.questFee(s, { g });
        L += `<div class="mk5-fee"><b>${GR[g]}급 기본 수수료</b><span class="ct-seg">${O.map((r, i) => { const ok = open.some(x => Math.abs(x - r) < 1e-9); return `<button data-gfee="${g}:${r}" class="${Math.abs(cur - r) < 1e-9 ? 'on' : ''} ${Math.abs(r - fb0) < 1e-9 ? 'df' : ''} ${r < fb0 - 1e-9 ? 'fast' : ''} ${ok ? '' : 'lk'}" ${ok ? '' : `disabled title="${Gm.feeLock(s, r)}"`} title="${r < fb0 - 1e-9 ? '모험가가 먼저 맡아 빨리 처리됩니다 · 길드 몫이 줄어듭니다' : ''}">${ok ? '' : '🔒'}${Math.round(r * 100)}%</button>`; }).join('')}</span>${g === 0 ? '<small>따로 정한 의뢰는 빼고 그 등급 의뢰에 붙습니다</small>' : ''}</div>`; } }
    L += `<div class="ux-h qb-h">게시된 의뢰 <small>${s.board.length} / ${cap}칸</small></div>`;
    if (false && (s.gq || []).length) L += `<div class="od-strip gq-strip"><b>길드 의뢰</b>${s.gq.map(o => `<span>${o.kind === 'mat' ? `${esc((MATS[o.m] || { name: o.m }).name)} ${o.got}/${o.n}` : `${GQ_NUM[o.kind] || ''} ${esc(((Gm.GQ_KIND || {})[o.kind] || { name: '' }).name)}`}</span>`).join('')}<small>리퀘스트 장에서 관리</small></div>`;   // 2026-11-20 길드 의뢰: 모은 수 / 약속한 수
    if ((s.orders || []).length) L += `<div class="od-strip"><b>상시 발주</b>${s.orders.map(o => `<span class="${Gm.orderLive(s, o) ? '' : 'off'}">${esc((MATS[o.m] || { name: o.m }).name)} ${(s.mats || {})[o.m] || 0}/${o.target}</span>`).join('')}<small>리퀘스트 장에서 관리</small></div>`;   // 2026-11-19 결정 41: 창고 / 목표 (흐린 것 = 멈춤)
    L += `<div class="bkq-list ${root.BOOK_CARD_STYLE || 'st-d'}">`;
    for (const q of s.board) {
      const T = QT[q.tid], d = danger(T, q.g), fb = foeBand(q), intel = !!s.built['정보실'];
      const sk = d.n ? `<span class="skulls" title="위험도">${[1, 2, 3].map(k => SKULL(k <= d.n)).join('')}</span>` : '<span class="bkq-nc">비전투</span>';
      const foe = d.n ? (intel ? (fb === 'up' ? '<i class="foe up" title="강한 무리">▲</i>' : fb === 'down' ? '<i class="foe down" title="약한 무리">▼</i>' : '') : '<i class="foe unk" title="정보실이 있으면 알 수 있음">?</i>') : '';
      const om = T && (s.orders || []).length ? (T.rewards || []).find(r => r.p >= 30 && s.orders.some(o => o.m === r.m && Gm.orderLive(s, o))) : null;   // 2026-11-18 V2 6단계: 발주 소재가 나오는 의뢰 (2026-11-19: 켜진 상시 발주만)
      const G = gqOf(q);   // 2026-11-20 길드 의뢰 카드: 수수료 대신 '길드 의뢰' 띠, 기한 = 길드 의뢰 기한
      L += `<div class="qcard bk age${ageOf(q)}${q.x2 ? ' x2' : ''}${q.id === qSel ? ' sel' : ''}${om ? ' od-hit' : ''}${G ? ' gqb' : ''}" data-q="${q.id}"><div class="r1">${gradeImg(q.g, 'sm')}<b>${esc(cleanName(q))}</b>${qlvBadge(q)}${q.x2 ? '<em class="qx2" title="골드 보상 2배">×2</em>' : ''}${q.esc ? '<span class="gq-tag es" title="떠돌이 상단이 낸 호위 의뢰 · 보상은 상단이 냄">상단 호위</span>' : ''}${G ? `<span class="gq-tag" title="길드가 낸 의뢰 · ${esc(Gm.gqLabel(G))}${G.kind === 'mat' ? ` ${G.got}/${G.n}개` : ''}${G.hot ? ' · 바로 맡겨짐' : ''}">길드 의뢰</span>` : (() => { const f = Math.round(Gm.questFee(s, q) * 100); return `<span class="mk5-chip ${f >= 20 ? 'hi' : f >= 15 ? 'mid' : f < 10 ? 'lo' : ''}" title="길드가 떼는 수수료${q.fee != null ? ' (이 의뢰만 따로 정함)' : ''}">수수료 ${f}%</span>`; })()}${om ? `<span class="od-chip" title="발주 · ${esc((MATS[om.m] || { name: '' }).name)}">발주</span>` : ''}</div>
        <div class="r2">${sk}${foe}${q.party ? `<em class="qparty" title="파티 의뢰 — 적이 많아 ${q.party}명 이상이 함께 가야 이길 만해요">파티 ${q.party}+</em>` : ''}<span class="gold"><i></i>${fmt(q.reward * (q.x2 ? 2 : 1))}G</span>${(() => { const n = Gm.questEta(s, q); return `<span class="mk5-eta" title="지금 게시판 · 마을 모험가 수로 본 예상 처리 (어림)">처리 ~${n >= 4 ? '4주+' : n + '주'}</span>`; })()}<span class="dlw${qWkLeft(q) <= 1 ? ' low' : ''}">${qWkLeft(q)}주</span></div>
        <div class="qdl" title="남은 기한"><i data-dl="${q.id}" style="width:${(dlLeft(q, wkFrac) * 100).toFixed(1)}%"></i></div></div>`;
    }
    for (let k = s.board.length; k < Math.min(cap, 14); k++) L += '<div class="bkq-slot"></div>';   // 빈 칸 = 점선 자리 (한 쪽에 보이는 14칸까지)
    L += '</div>';
    let R;
    const q = s.board.find(x => x.id === qSel);
    let A = '';   // 의뢰 취소 버튼: 오른쪽 쪽 안이 아니라 책 그림 좌표에 고정 (--bkc-x, --bkc-y)
    if (q) { const G = gqOf(q); R = `<div class="bkq-det">${qDetailHtml(q, !G)}</div>`; A = G ? `<div class="bkq-act"><button class="ux-btn danger" data-wd="${q.id}">길드 의뢰 거두기</button><small>위약금 없음 · 남은 ${fmt(G.hold)}G는 금고로</small></div>` : `${feeOpen ? qFeeHtml(q) : ''}<div class="bkq-act"><button class="ux-btn danger" data-wd="${q.id}">의뢰 취소</button><small>등록비·위약금 ${fmt(Math.round(q.reward * 0.10))}G · 신뢰도 −2</small></div>`; }   // 2026-11-20 길드 의뢰 카드: 수수료 칸 없음 · 거두면 남은 돈을 돌려받음
    else R = '<div class="bkq-none"><b>게시된 의뢰가 없습니다</b>의뢰는 매주 게시판에 들어옵니다.</div>';
    b.innerHTML = `<div class="bk2"><section class="bk-l">${L}</section><section class="bk-r">${R}</section>${A}</div>`;
    b.onclick = e => {
      const wd = e.target.closest('[data-wd]'); if (wd) { const G = gqOf(s.board.find(x => x.id === +wd.dataset.wd)), back = G ? G.hold : 0; if (Gm.withdrawQuest(s, +wd.dataset.wd) && G) toast(`길드 의뢰를 거뒀습니다. ${fmt(back)}G를 돌려받았습니다.`, 'grow'); hooks.changed(); return; }
      const gf = e.target.closest('[data-gfee]'); if (gf) { if (gf.disabled) return; const [g, r] = gf.dataset.gfee.split(':').map(Number); if (Gm.setGradeFee(s, g, r)) hooks.changed(); return; }   // E5-4 등급 기본 수수료
      const fo = e.target.closest('[data-qfeeopen]'); if (fo && !e.target.closest('[data-qfee]')) { feeOpen = !feeOpen; renderBoardBook(b); return; }
      const qf = e.target.closest('[data-qfee]'); if (qf) { if (qf.disabled) return; const [id, r] = qf.dataset.qfee.split(':'), q = s.board.find(x => x.id === +id); if (q) { if (r === 'base') { delete q.fee; hooks.changed(); } else if (Gm.setQuestFee(s, +id, +r)) hooks.changed(); } return; }   // E5-4 이 의뢰 수수료
      const fb = e.target.closest('[data-fb]'); if (fb) {   // 이미 칠해진 맨 위 막대를 다시 누르면 없음
        const [g, k] = fb.dataset.fb.split(':').map(Number), lv = Gm.filterLevel(s.filter[g]), w = s.filter.slice(); w[g] = Gm.FILTER_W[lv === k ? 0 : k];
        if (!Gm.setFilter(s, w)) { toast('적어도 한 등급은 의뢰를 받아야 합니다.', 'warn'); return; }
        hooks.changed(); return;
      }
      const c = e.target.closest('.qcard'); if (c) { if (+c.dataset.q !== qSel) feeOpen = false; qSel = +c.dataset.q; renderBoardBook(b); }
    };
    b.onmouseover = b.onmouseout = null;
  }
  // 길드 발주 (2026-11-19 결정 41 · V4 1단계): 상시 발주 — 왼쪽 = 걸어 둔 발주 · 들어온 소재 / 오른쪽 = 새 상시 발주 (목표 재고 · 1개 값 배수)
  let odSel = null, odN = 6, odM = null, odAsk = null;
  function orderHtml() {
    const E = s.cfg.econ, O = s.orders || [], max = E.orderMax != null ? E.orderMax : 3, MO = Gm.orderMultOpts(s);
    if (odM == null || !MO.some(x => Math.abs(x - odM) < 1e-9)) odM = E.orderMult != null ? E.orderMult : MO[1];
    const who = ids => ids.map(id => s.advs.find(a => a.id === id)).filter(Boolean);
    let L = `<div class="od-h">상시 발주 <small>${O.length} / ${max}건</small></div>`;
    for (const o of O) { const m = MATS[o.m] || { name: o.m }, have = (s.mats || {})[o.m] || 0, live = Gm.orderLive(s, o), p = Gm.orderPriceOf(s, o);
      const st = live ? '<em class="od-on">켜짐 · 모으는 중</em>' : have >= o.target ? '<em class="od-off">쉬는 중 · 창고 가득</em>' : '<em class="od-off">멈춤 · 금고 부족</em>';
      L += `<div class="od-card"><span class="ic">${matImg(m)}</span><div class="n"><b>${esc(m.name)} <em>창고 ${have} / ${o.target}</em></b><div class="od-bar"><i style="width:${Math.min(100, have / o.target * 100).toFixed(1)}%"></i></div><div class="sub">1개 ${fmt(p)}G (×${o.mult}) · 게시판 쏠림 ${Math.round(Gm.orderBiasOf(s, o) * 100)}% · 지금까지 ${o.got || 0}개 · ${st}</div>`
        + `<div class="od-ed"><span class="od-step"><button data-oet="${o.id}:-1" ${o.target <= 1 ? 'disabled' : ''}>−</button><b>${o.target}</b><button data-oet="${o.id}:1" ${o.target >= 30 ? 'disabled' : ''}>+</button></span>${MO.map(x => `<button class="od-mx${Math.abs(x - o.mult) < 1e-9 ? ' on' : ''}" data-oem="${o.id}:${x}">×${x}</button>`).join('')}</div></div>`
        + (odAsk === o.id ? `<div class="od-ask"><small>이 상시 발주를 내릴까요?</small><span><button class="ux-btn sm danger" data-oyes="${o.id}">내리기</button><button class="ux-btn sm" data-ono="1">아니요</button></span></div>` : `<button class="od-btn" data-ocancel="${o.id}">내리기</button>`) + '</div>'; }
    for (let k = O.length; k < max; k++) L += '<div class="od-empty">빈 자리 · 오른쪽에서 소재를 골라 상시 발주를 거세요</div>';
    L += '<div class="od-note">창고가 목표 아래로 떨어지면 저절로 켜져, 그 소재가 나오는 의뢰가 게시판에 자주 올라옵니다. 소재가 들어올 때마다 금고에서 1개 값을 가져온 모험가에게 줍니다(미리 내는 돈 없음). 창고가 목표만큼 차거나 금고가 1개 값보다 적으면 쉽니다.</div>';
    const logs = (s.buyLog || []).filter(x => x.ord).slice(0, 6);
    L += '<div class="od-h od-h2">들어온 소재 <small>최근 순</small></div>';
    L += logs.length ? logs.map(x => { const m = MATS[x.m] || { name: x.m }, ps = who(x.ids), ago = s.week - x.w; return `<div class="od-log">${ago ? ago + '주 전' : '이번 주'} · <b>${ps.map(a => esc(a.name)).join(' · ') || '떠난 모험가'}</b> ${esc(m.name)} ${x.n}개 <em>(${fmt(x.g)}G 지급)</em></div>`; }).join('') : '<div class="od-log none">아직 발주로 들어온 소재가 없습니다.</div>';
    const ing = new Set(O.map(o => o.m)), known = Object.keys(s.knownMats || {}).filter(id => MATS[id] && GR.indexOf(MATS[id].grade) <= s.grade);
    const can = id => !ing.has(id) && Gm.orderSources(s, id).length > 0;
    if (!odSel || !known.includes(odSel) || !can(odSel)) odSel = known.find(can) || null;
    let R = '<div class="od-h">새 상시 발주 <small>아는 소재 중 길드 등급까지</small></div>';
    if (!known.length) R += '<div class="od-empty">아직 아는 소재가 없습니다. 의뢰에서 소재를 주워 오면 발주할 수 있습니다.</div>';
    else R += `<div class="od-pick">${known.map(id => { const m = MATS[id], ok = can(id); return `<button class="od-m${id === odSel ? ' on' : ''}${ing.has(id) ? ' ing' : ''}" data-om="${id}" ${ok ? '' : 'disabled'} title="${ing.has(id) ? '발주 중' : ok ? esc(m.name) : '지금 길드 등급 의뢰에서는 나오지 않습니다'}">${matImg(m)}<span>${esc(m.name)}</span></button>`; }).join('')}</div>`;
    if (odSel) {
      const m = MATS[odSel], p = Gm.orderPrice(s, odSel, odM), why = Gm.orderWhy(s, odSel, odN, odM), src = Gm.orderSources(s, odSel), bi = MO.findIndex(x => Math.abs(x - odM) < 1e-9);
      R += `<div class="od-row"><b>소재</b><span class="ic sm">${matImg(m)}</span>${esc(m.name)} <small>· 지금 창고 ${(s.mats || {})[odSel] || 0}개</small></div>`;
      R += `<div class="od-row"><b>목표 재고</b><span class="od-step"><button data-on="-1" ${odN <= 1 ? 'disabled' : ''}>−</button><b>${odN}</b><button data-on="1" ${odN >= 30 ? 'disabled' : ''}>+</button></span><small>창고에 이만큼 유지 · 1~30개</small></div>`;
      R += `<div class="od-row"><b>1개 값</b><span>${MO.map(x => `<button class="od-mx${Math.abs(x - odM) < 1e-9 ? ' on' : ''}" data-omx="${x}">×${x}</button>`).join('')}</span><small>비쌀수록 게시판 쏠림이 셉니다</small></div>`;
      R += `<div class="od-row"><b>나오는 의뢰</b><span class="od-q">${src.slice(0, 6).map(t => `<span>${t.grade} · ${esc(t.name)}</span>`).join('')}${src.length > 6 ? `<span>외 ${src.length - 6}개</span>` : ''}</span></div>`;
      R += `<div class="od-tot">1개 값 <b>${fmt(p)}G</b> <small>(판매가 ${fmt(Gm.matSellPrice(s, odSel))}G × ${odM})</small> · 게시판 쏠림 <b>${Math.round(((E.orderBiasOpt || [])[bi] != null ? E.orderBiasOpt[bi] : (E.orderBias || 0)) * 100)}%</b><br><small>미리 내는 돈 없음 · 들어올 때마다 금고에서 지급 · 금고 ${fmt(Math.floor(s.gold))}G</small></div>`;
      R += `<div class="od-go"><button class="od-btn go" data-oplace="1" ${why ? 'disabled' : ''}>상시 발주 걸기</button>${why ? `<small class="od-why">${esc(why)}</small>` : ''}</div>`;
    }
    R += `<div class="od-note">식당이 요리를 만들 때 재료를 쓰므로, 메뉴에 올린 요리의 재료를 걸어 두면 의뢰가 끊이지 않고 올라옵니다.${s.cfg.econ.shopRate ? ' 양념(소금 · 향신료 · 신선한 물 · 밀가루)은 모자라면 잡화 상인에게서 삽니다.' : ' 양념(소금 · 향신료 · 신선한 물 · 밀가루)은 의뢰에서 드물게(15%) 나오지만, 발주를 걸면 의뢰마다 양념이 나올 확률이 쏠림 비율(30 · 50 · 70%)까지 오릅니다.'}</div>`;
    return `<div class="bk2 bk-od"><section class="bk-l">${L}</section><section class="bk-r">${R}</section></div>`;
  }
  function orderClick(e) {
    const t = e.target.closest('[data-om], [data-on], [data-omx], [data-oplace], [data-ocancel], [data-oyes], [data-ono], [data-oet], [data-oem]'); if (!t || t.disabled) return false;
    const d = t.dataset;
    if (d.om) { odSel = d.om; odAsk = null; }
    else if (d.on) odN = Math.max(1, Math.min(30, odN + +d.on));
    else if (d.omx) odM = +d.omx;
    else if (d.oplace) { const m = MATS[odSel], r = Gm.orderPlace(s, odSel, odN, odM); toast(r.ok ? `${m.name} 상시 발주를 걸었습니다. (창고 ${odN}개 유지 · 1개 ${fmt(r.price)}G)` : r.why, r.ok ? 'grow' : 'warn'); hooks.changed(); }
    else if (d.oet) { const [id, k] = d.oet.split(':').map(Number), o = (s.orders || []).find(x => x.id === id); if (o) { const r = Gm.orderEdit(s, id, o.target + k, o.mult); if (!r.ok) toast(r.why, 'warn'); hooks.changed(); } }
    else if (d.oem) { const [id, x] = d.oem.split(':').map(Number), o = (s.orders || []).find(y => y.id === id); if (o) { const r = Gm.orderEdit(s, id, o.target, x); if (!r.ok) toast(r.why, 'warn'); hooks.changed(); } }
    else if (d.ocancel) odAsk = +d.ocancel;
    else if (d.oyes) { const r = Gm.orderCancel(s, +d.oyes); odAsk = null; toast(r.ok ? '상시 발주를 내렸습니다.' : r.why, r.ok ? 'grow' : 'warn'); hooks.changed(); }
    else if (d.ono) odAsk = null;
    renderPopup(); return true;
  }
  // 2026-11-20 길드 의뢰 (V4 결정 49~56): 길드가 금고로 게시판에 의뢰를 냄 — 왼쪽 = 걸어 둔 의뢰 · 끝난 의뢰 · 들어온 소재 / 오른쪽 = 새 길드 의뢰
  // 2026-11-20 (결정 57~62 라운드): 여섯 종류 모두 — ① 납품 ② 토벌 ③ 정찰 ④ 순찰 · 경비 ⑤ 마을 일손 ⑥ 훈련 원정
  const GQ_ORDER = ['hunt', 'scout', 'patrol', 'help', 'train'], GQ_NUM = { mat: '·', hunt: '①', scout: '②', patrol: '③', help: '④', train: '⑤' };   // 2026-11-20 결정 63: 소재 납품은 매입가로 합침
  const GQ_SUB = { mat: '소재를 모아 오게 합니다', hunt: '사냥터 짐승을 줄입니다', scout: '자원지를 살펴봅니다', patrol: '침공에 대비합니다', help: '마을 일을 돕습니다', train: '신입을 키웁니다' };
  const GQ_FX = {   // 효과 설명 (오른쪽 미리 보기 · 게시판 상세)
    mat: '가져온 만큼 나눠 지급하고, 덜 채우면 남은 개수로 다시 게시합니다.',
    hunt: '사냥터에서 싸웁니다. 이기면 개체수가 처치 수 × 5만큼 줄고, 보상은 성공하면 한 번에 줍니다.',
    scout: '1주 비전투 의뢰(민첩 · 지력)입니다. 성공하면 4주 동안 그 자원지 개체수를 숫자로 보고, 그곳 의뢰의 적 정보 오차가 없어집니다.',
    patrol: '1주 비전투 의뢰(힘 · 민첩)입니다. 성공하면 8주 안에 침공이 올 때 첫 차례 적이 10% 약해집니다.',
    help: '1주 비전투 의뢰(힘 · 기교)입니다. 성공하면 마을 인구 +5 · 신뢰 +1.',
    train: '지명한 모험가만 맡을 수 있습니다. 성공하면 그 모험가가 경험치를 더 얻고 애착 +3.',
  };
  const GQ_WHY = { done: '완료', end: '기한 끝', cancel: '거둠' };
  let gqKind = 'hunt', gqSel = {}, gqN = 6, gqPct = 1, gqWk = null, gqAsk = null;
  const gqNOf = k => k === 'mat' ? gqN : 1;
  const gqReward = (k, t, n) => { const R = Gm.gqRangeK(s, k, t, n), b = Gm.gqBaseK(s, k, t, n); return Math.min(R[1], Math.max(R[0], Math.round(b * gqPct / 10) * 10)); };   // 기준 × 고른 % (10G 단위, 범위 안)
  const resTxt = m => { if (Gm.scoutOn(s, m)) { const v = Gm.resOf(s, m); if (v != null) return `<b class="res-b r${Gm.resBand(s, m)} sc" title="정찰한 곳 · 개체수">${Math.round(v)}</b>`; } const b = Gm.resBand(s, m); return b == null ? '' : `<b class="res-b r${b}">${['적음', '보통', '많음'][b]}</b>`; };   // 정찰하면 숫자
  const gqIcon = o => (o.kind === 'mat' || o.kind === 'hunt' || o.kind === 'scout') && MATS[o.m] ? matImg(MATS[o.m]) : `<b class="gq-ki">${GQ_NUM[o.kind] || ''}</b>`;
  const gqMonImg = (k, id) => { const S = Gm.gqSrcK(s, k, id), e = S && ((QT[S.T.id] || S.T).enemies || [])[0], m = e && MONS[e.mon]; return m && m.img ? `<i class="gq-mpic" style="background-image:url(assets/expedition/${m.img})" title="${esc(e.name)}"></i>` : ''; };   // 2026-11-20 사용자: 사냥터 버튼은 대표 출몰 몬스터
  function gqTargets(k) {   // 종류마다 고를 대상: [{id, name, img, ok, why, extra}]
    const live = id => (s.gq || []).some(o => o.kind === k && o.m === id);
    const mats = Object.keys(MATS).filter(id => GR.indexOf(MATS[id].grade) <= s.grade).sort((a, b) => GR.indexOf(MATS[a].grade) - GR.indexOf(MATS[b].grade));
    if (k === 'mat') return mats.filter(id => (s.knownMats || {})[id]).map(id => { const ok = !live(id) && !!Gm.gqSrc(s, id); return { id, name: MATS[id].name, img: matImg(MATS[id]), ok, ing: live(id), why: live(id) ? '이미 의뢰 중' : ok ? '' : '지금 길드 등급 의뢰에서는 나오지 않습니다' }; });
    if (k === 'hunt' || k === 'scout') return mats.filter(id => Gm.resOf(s, id) != null && Gm.resBand(s, id) != null && Gm.gqSrcK(s, k, id)).map(id => ({ id, name: Gm.gqPlaceName(s, k, id), img: gqMonImg(k, id) || matImg(MATS[id]), ok: !live(id), ing: live(id), why: live(id) ? '이미 의뢰 중' : '', extra: `<small>${esc(MATS[id].name)} 나옴</small> ${resTxt(id)}` }));   // 2026-11-20: 자원지 이름으로
    if (k === 'train') return s.advs.filter(a => a.alive).map(a => ({ id: a.id, name: a.name, img: `<span class="tr-f gq-face" style="${faceStyle(a, 38, 180, 19)}"></span>`, ok: !live(a.id), ing: live(a.id), why: live(a.id) ? '이미 의뢰 중' : '', extra: `<small>${GR[a.grade]}급 Lv${a.lv || 1}</small>` }));
    return null;   // 순찰 · 일손: 대상 없음
  }
  // 2026-11-20 사용자: 토벌 · 정찰 화면에도 일반 의뢰처럼 사냥터 정보 — 출현 몬스터 · 위험도 · 얻는 소재(확률)
  function gqSiteHtml(S, t) {
    const T = QT[S.T.id] || S.T, d = danger(T, S.g), sc = Gm.scoutOn(s, t), E = T.enemies || [];
    let h = `<div class="gq-site"><div class="gs-r"><b>개체수</b>${resTxt(t)}${sc ? '<small class="sc">정찰함</small>' : ''}</div>`;
    if (E.length) {
      h += `<div class="gs-r"><b>몬스터</b><span class="gs-mons">${E.map(e => { const m = MONS[e.mon] || {}; return `<span class="gs-mon" title="${esc(e.name)}${sc ? ` · 체력 ${e.hp} · 공격 ${e.atk}` : ''}"><i class="pic"${m.img ? ` style="background-image:url(assets/expedition/${m.img})"` : ''}></i>${esc(e.name)} ×${e.count}${e.boss ? ' <em class="ux-tag injured">보스</em>' : ''}${sc ? `<small>체력 ${e.hp} · 공격 ${e.atk}</small>` : ''}</span>`; }).join('')}</span>${d.n ? `<span class="gs-sk" title="위험도 · ${GR[S.g]}급 모험가 ${d.n}명${d.more ? ' 이상' : ''} 권장">${[1, 2, 3].map(k => SKULL(k <= d.n)).join('')}<small>${d.n}명${d.more ? '+' : ''} 권장</small></span>` : ''}</div>`;
    }
    const rw = (T.rewards || []).filter(r => MATS[r.m]).sort((a, b) => b.p - a.p), n = E.reduce((a, e) => a + (e.count || 1), 0);
    h += `<div class="gs-r"><b title="${n ? `성공하면 몬스터 1마리마다 주 소재(진한 %) 1개 — 이 사냥터 약 ${n}마리. ` : ''}드문 소재(옅은 %)는 의뢰마다 한 번 굴림. 실패하면 소재 없음 · 개체수가 적으면 절반">소재 <i class="gs-q">?</i></b><span class="gs-mats">${rw.map(r => { const m = MATS[r.m], kn = !!(s.knownMats || {})[r.m]; return `<span class="gs-mat${r.p >= 30 ? ' main' : ''}" title="${kn ? esc(m.name) : '???'} · ${r.p >= 30 ? '몬스터마다 뽑는 주 소재' : '의뢰마다 한 번 굴리는 드문 소재'}"><span class="ux-slot${kn ? '' : ' unk'}" data-g="${GR.indexOf(m.grade)}">${kn || m.icon ? matImg(m) : ''}</span><em>${r.p}%</em></span>`; }).join('')}</span></div>`;
    return h + '</div>';
  }
  function gqHtml() {
    const O = s.gq || [], max = Gm.gqMax(s), open = Gm.gqOpen(s), WK = Gm.gqWeekOpts(s), KD = Gm.GQ_KIND;
    if (gqWk == null || !WK.includes(gqWk)) gqWk = WK[Math.min(1, WK.length - 1)];
    if (!Gm.gqKindOpen(s, gqKind)) gqKind = 'hunt';
    const who = ids => ids.map(id => s.advs.find(a => a.id === id)).filter(Boolean), mn = id => (MATS[id] || { name: id }).name;
    let L = `<div class="od-h">길드 의뢰 <small>${O.length} / ${max}건</small></div>`;
    for (const o of O) { const left = o.end - s.week, onB = s.board.some(q => q.gq === o.id), mat = o.kind === 'mat';
      const st = onB ? '<em class="od-on">게시 중</em>' : '<em class="od-off">모험가가 맡아 떠남</em>';
      L += `<div class="od-card"><span class="ic">${gqIcon(o)}</span><div class="n"><b>${esc(Gm.gqLabel(o))}${mat ? ` <em>${o.got} / ${o.n}개</em>` : ''}</b>${mat ? `<div class="od-bar"><i style="width:${Math.min(100, o.got / o.n * 100).toFixed(1)}%"></i></div>` : ''}<div class="sub">보상 ${fmt(o.reward)}G${mat ? ` · 맡아 둔 돈 ${fmt(o.hold)}G 남음` : ''}${o.hot ? ' · <em class="gq-hot">바로 맡겨짐</em>' : ''} · ${left > 0 ? left + '주 남음' : '이번 주 끝'} · ${st}</div></div>`
        + (gqAsk === o.id ? `<div class="od-ask"><small>남은 ${fmt(o.hold)}G를 돌려받습니다</small><span><button class="ux-btn sm danger" data-gqyes="${o.id}">거두기</button><button class="ux-btn sm" data-gqno="1">아니요</button></span></div>` : `<button class="od-btn" data-gqcancel="${o.id}" ${onB ? '' : 'disabled title="모험가가 돌아오면 거둘 수 있습니다"'}>거두기</button>`) + '</div>'; }
    for (let k = O.length; k < max; k++) L += `<div class="od-empty">빈 자리 · ${open ? '오른쪽에서 새 길드 의뢰를 내세요' : '집무실을 지으면 쓸 수 있습니다'}</div>`;
    const D = (s.gqDone || []).slice(0, 5);
    L += '<div class="od-h od-h2">끝난 의뢰 <small>최근 순</small></div>';
    L += D.length ? D.map(x => { const ago = s.week - x.w; return `<div class="od-log">${ago ? ago + '주 전' : '이번 주'} · <b>${esc(x.label || `${mn(x.m)} ${x.n}개 납품`)}</b>${!x.kind || x.kind === 'mat' ? ` ${x.got} / ${x.n}개` : ''} <span class="gq-why ${x.why}">${GQ_WHY[x.why] || x.why}</span> <em>(지급 ${fmt(x.paid)}G${x.back ? ` · 돌려받음 ${fmt(x.back)}G` : ''})</em></div>`; }).join('') : '<div class="od-log none">아직 끝난 길드 의뢰가 없습니다.</div>';
    const logs = (s.buyLog || []).filter(x => x.ord).slice(0, 6);
    L += '<div class="od-h od-h2">들어온 소재 <small>최근 순</small></div>';
    L += logs.length ? logs.map(x => { const ps = who(x.ids), ago = s.week - x.w; return `<div class="od-log">${ago ? ago + '주 전' : '이번 주'} · <b>${ps.map(a => esc(a.name)).join(' · ') || '떠난 모험가'}</b> ${esc(mn(x.m))} ${x.n}개 <em>(${fmt(x.g)}G 지급)</em></div>`; }).join('') : '<div class="od-log none">아직 길드 의뢰로 들어온 소재가 없습니다.</div>';
    // 오른쪽: 새 길드 의뢰
    const k = gqKind, TG = gqTargets(k);
    if (TG) { const cur = TG.find(x => x.id === gqSel[k]); if (!cur || !cur.ok) gqSel[k] = (TG.find(x => x.ok) || {}).id; if (gqSel[k] == null) gqSel[k] = null; }
    const t = TG ? gqSel[k] : null, n = gqNOf(k);
    let R = '<div class="od-h">새 길드 의뢰 <small>보상은 금고에서 맡아 둡니다</small></div>';
    if (!open) R += '<div class="gq-lock"><b>집무실이 필요합니다</b>집무실을 지으면 길드가 직접 게시판에 의뢰를 낼 수 있습니다. 시설 장에서 지으세요.</div>';
    R += `<div class="gq-kinds">${GQ_ORDER.map(id => { const K = KD[id] || { name: id }, ok = Gm.gqKindOpen(s, id); return ok ? `<button class="gq-k${id === k ? ' on' : ''}" data-gqk="${id}"><b>${GQ_NUM[id]} ${esc(K.name)}</b><small>${GQ_SUB[id]}</small></button>` : `<button class="gq-k lk" disabled><b>🔒 ${GQ_NUM[id]} ${esc(K.name)}</b><small>${esc(K.lock || '아직 열리지 않음')}</small></button>`; }).join('')}</div>`;
    if (TG) {
      if (!TG.length) R += `<div class="od-empty">${k === 'mat' ? '아직 아는 소재가 없습니다. 의뢰에서 소재를 주워 오면 낼 수 있습니다.' : k === 'train' ? '마을에 모험가가 없습니다.' : '지금 길드 등급으로 갈 수 있는 곳이 없습니다.'}</div>`;
      else R += `<div class="od-pick gq-pick${k === 'mat' ? '' : ' wide'}">${TG.map(x => `<button class="od-m${x.id === t ? ' on' : ''}${x.ing ? ' gq-ing' : ''}" data-gqm="${x.id}" ${x.ok ? '' : 'disabled'} title="${esc(x.why || x.name)}">${x.img}<span>${esc(x.name)}</span>${x.extra ? `<span class="gq-x">${x.extra}</span>` : ''}</button>`).join('')}</div>`;
    }
    const ready = !TG || t != null, S = ready ? Gm.gqSrcK(s, k, t) : null;
    if (ready && S) {
      const Rg = Gm.gqRangeK(s, k, t, n), base = Gm.gqBaseK(s, k, t, n), rw = gqReward(k, t, n), why = Gm.gqWhy(s, k, t, n, rw, gqWk), hot = rw >= base;
      if (k === 'mat') {
        R += `<div class="od-row"><b>소재</b><span class="ic sm">${matImg(MATS[t])}</span>${esc(MATS[t].name)} <small>· 지금 창고 ${(s.mats || {})[t] || 0}개</small></div>`;
        R += `<div class="od-row"><b>개수</b><span class="od-step"><button data-gqn="-1" ${gqN <= 1 ? 'disabled' : ''}>−</button><b>${gqN}</b><button data-gqn="1" ${gqN >= 20 ? 'disabled' : ''}>+</button></span><small>1~20개</small></div>`;
      } else if (k === 'hunt' || k === 'scout') R += gqSiteHtml(S, t);   // 2026-11-20 사용자: 사냥터 이름 줄은 빼고 개체수는 정보 상자에
      else if (k === 'train') { const a = s.advs.find(x => x.id === t); R += `<div class="od-row"><b>모험가</b>${a ? esc(a.name) : ''} <small>· 이 모험가만 맡을 수 있음</small></div>`; }
      R += `<div class="od-row"><b>보상</b><span class="od-step gq-rw"><button data-gqr="-1" ${rw <= Rg[0] ? 'disabled' : ''}>−</button><b>${fmt(rw)}G</b><button data-gqr="1" ${rw >= Rg[1] ? 'disabled' : ''}>+</button></span><small>기준 ${fmt(base)}G의 ${base ? Math.round(rw / base * 100) : 0}% · ${fmt(Rg[0])}~${fmt(Rg[1])}G<br><em class="${hot ? 'gq-hot' : 'gq-cold'}">${hot ? '기준 이상 · 바로 맡겨짐' : '기준 아래 · 다른 의뢰 다음'}</em></small></div>`;
      R += `<div class="od-row"><b>기한</b><span>${WK.map(w => `<button class="od-mx${w === gqWk ? ' on' : ''}" data-gqw="${w}">${w}주</button>`).join(' ')}</span></div>`;
      if (k === 'mat') R += `<div class="od-tot">${k === 'mat' ? `1개당 약 <b>${fmt(Math.round(rw / n))}G</b> <small>· 시세 ${fmt(Gm.matPrice(s, t))}G</small><br>` : ''}<small>${esc(GQ_FX[k])}<br>게시판에 <b class="gq-t">${GR[S.g]}급 · ${esc(S.T.name)}</b> 틀로 올라갑니다<br>금고에서 ${fmt(rw)}G를 맡아 둡니다 · 남으면 돌려받음 · 금고 ${fmt(Math.floor(s.gold))}G</small></div>`;
      R += `<div class="od-go"><button class="od-btn go" data-gqplace="1" ${why ? 'disabled' : ''}>길드 의뢰 내기</button>${why ? `<small class="od-why">${esc(why)}</small>` : ''}</div>`;
    } else if (ready) R += `<div class="od-empty">${esc(Gm.gqWhy(s, k, t, n, 10, gqWk) || '지금은 낼 수 없습니다')}</div>`;
    if (!(k === 'hunt' || k === 'scout')) R += '<div class="od-note">수수료가 없어 모험가가 보상을 그대로 받습니다. 기한이 지나면 남은 돈을 돌려받습니다.</div>';   // 토벌 · 정찰은 사냥터 정보 자리 (2026-11-20)
    return `<div class="bk2 bk-od bk-gq"><section class="bk-l">${L}</section><section class="bk-r">${R}</section></div>`;
  }
  function gqClick(e) {
    const el = e.target.closest('[data-gqm], [data-gqn], [data-gqr], [data-gqw], [data-gqplace], [data-gqcancel], [data-gqyes], [data-gqno], [data-gqk]'); if (!el || el.disabled) return false;
    const d = el.dataset, k = gqKind, t = gqSel[k] != null ? gqSel[k] : null;
    if (d.gqk) { gqKind = d.gqk; gqAsk = null; }
    else if (d.gqm) { gqSel[k] = k === 'train' ? +d.gqm : d.gqm; gqAsk = null; }
    else if (d.gqn) gqN = Math.max(1, Math.min(20, gqN + +d.gqn));   // 보상은 기준 대비 % 유지
    else if (d.gqr) { const n = gqNOf(k), R = Gm.gqRangeK(s, k, t, n), b = Gm.gqBaseK(s, k, t, n), rw = Math.max(R[0], Math.min(R[1], gqReward(k, t, n) + 10 * +d.gqr)); if (b) gqPct = rw / b; }
    else if (d.gqw) gqWk = +d.gqw;
    else if (d.gqplace) { const n = gqNOf(k), rw = gqReward(k, t, n), r = Gm.gqPlace(s, k, t, n, rw, gqWk); toast(r.ok ? `길드 의뢰를 냈습니다: ${Gm.gqLabel(r.o)} · ${fmt(rw)}G · ${gqWk}주` : r.why, r.ok ? 'grow' : 'warn'); hooks.changed(); }
    else if (d.gqcancel) gqAsk = +d.gqcancel;
    else if (d.gqyes) { const r = Gm.gqCancel(s, +d.gqyes); gqAsk = null; toast(r.ok ? `길드 의뢰를 거뒀습니다. ${fmt(r.back)}G를 돌려받았습니다.` : r.why, r.ok ? 'grow' : 'warn'); hooks.changed(); }
    else if (d.gqno) gqAsk = null;
    renderPopup(); return true;
  }
  // 2026-11-20 떠돌이 상단 (결정 57~62): 왼쪽 = 상단 목록 (관계 · 오는 시기 · 지난 주문) / 오른쪽 = 머무는 상단 주문서 · 위탁 보관함
  const CAR_LIKE = { farm: '요리 재료', smith: '광석 · 짐승 · 쇠붙이', herb: '약초 · 약재' };
  function carHtml() {
    const E = s.cfg.econ, T = E.carRel || [200, 600], cf = E.consignFee != null ? E.consignFee : 0.1, keepW = E.consWeeks || 8, nt = E.carNotice != null ? E.carNotice : 2;
    const open = Gm.carOpenList(s), here = [];
    let L = `<div class="od-h">떠돌이 상단 <small>${open.length} / ${Gm.CARS.length}곳</small></div>`;
    for (const c of Gm.CARS) {
      if (c.g > s.grade) { L += `<div class="od-card car-card lk"><span class="ic"><b class="gq-ki">🔒</b></span><div class="n"><b>${esc(c.name)}</b><div class="sub">${GR[c.g]}급 길드가 되면 들르기 시작합니다 · ${CAR_LIKE[c.id] || ''}</div></div></div>`; continue; }
      const st = Gm.carState(s, c), lv = Gm.carRelLv(s, st), lo = lv === 1 ? 0 : T[lv - 2], hi = T[lv - 1], left = st.next - s.week;
      if (st.here) here.push([c, st]);
      const stt = st.here ? `<em class="od-on">마을에 머무는 중${st.until != null ? ` · ${Math.max(0, st.until - s.week)}주 뒤 떠남` : ''}</em>` : left <= nt ? `<em class="gq-hot">곧 옴 (${nt}주 안)</em>` : '<em class="od-off">언제 올지 모름</em>';
      const last = Object.keys(st.last || {}).filter(m => MATS[m]);
      L += `<div class="od-card car-card${st.here ? ' here' : ''}"><span class="ic"><b class="gq-ki">${esc(c.name.slice(0, 1))}</b></span><div class="n"><b>${esc(c.name)} <em>관계 ${lv}단계</em></b><div class="sub">좋아하는 물건 · ${CAR_LIKE[c.id] || '여러 가지'} · ${stt}</div>`
        + `<div class="od-bar"><i style="width:${hi != null ? Math.min(100, (st.rel - lo) / (hi - lo) * 100).toFixed(1) : 100}%"></i></div><div class="sub">거래 ${fmt(st.rel)}G${hi != null ? ` · 다음 단계까지 ${fmt(hi - st.rel)}G` : ' · 최고 단계'}</div>`
        + (last.length ? `<div class="car-last">지난 주문 ${last.map(m => `<span>${esc(MATS[m].name)} ×${st.last[m]}</span>`).join('')}</div>` : '') + '</div></div>';
    }
    L += `<div class="od-note">상단에 판 소재는 마을 밖으로 나가 우리 시세를 내리지 않습니다. 오는 시기는 ${nt}주 전에만 알 수 있고, 주문서는 와서 공개합니다. 관계 단계(거래 ${fmt(T[0])} · ${fmt(T[1])}G)마다 주문 종류 +1 · 개수 +5.</div>`;
    let R = '';
    if (!here.length) R += '<div class="od-h">주문서</div><div class="od-empty">지금 마을에 머무는 상단이 없습니다.</div>';
    for (const [c, st] of here) {
      R += `<div class="car-say"><b>${esc(c.boss)}</b> “${esc(Gm.carTalk(c, 'hi', Gm.carRelLv(s, st)))}”</div>`;   // 2026-11-20 사용자: 상단 주인 대화
      { const o = st.escort; if (o) { const fee = Math.round(Gm.questFee(s, { g: o.g }) * 100), onB = o.qid != null && s.board.some(q => q.id === o.qid);   // 2026-11-20 상단 호위 의뢰
        R += o.state === 'offer' ? `<div class="es-box"><div class="es-h">🛡 ${esc(c.boss)}의 부탁 — 상단 호위<span class="lv">떠나기 전까지</span></div><div class="es-kv"><span>보상</span><b>${fmt(o.reward)}G (상단이 냄)</b><span>수수료</span><b>${fee}% · 길드 몫 ${fmt(Math.round(o.reward * fee / 100))}G</b><span>기간</span><b>${s.cfg.econ.escWeeks || 2}주 · 전투</b><span>인원</span><b>2~3명 권장</b></div><div class="es-two"><div class="ok"><b>성공</b> · 관계 +${s.cfg.econ.escRel || 100} · 다음 방문 1~2주 빨라짐 · 다음 주문서 값 +${s.cfg.econ.escBonus || 0.1}배</div><div class="ng"><b>실패</b> · 관계 −${s.cfg.econ.escRelFail || 50} · 다음 방문 늦어짐<br><b>거절</b> · 변화 없음</div></div><div class="es-btns"><button class="ux-btn primary" data-ces="${c.id}:post">게시판에 올리기</button><button class="ux-btn" data-ces="${c.id}:no">이번엔 거절</button></div></div>`
          : o.state === 'posted' ? `<div class="es-box st">🛡 ${esc(c.name)} 호위 — ${onB ? '게시판에서 맡을 모험가를 기다리는 중 (상단은 떠난 뒤에도 1주 더 기다려 줌, 그래도 없으면 거둠)' : '모험가가 호위하며 떠났습니다'}</div>` : o.state === 'refused' ? `<div class="es-box st off">이번 호위 부탁은 거절했습니다.</div>` : ''; } }
      R += `<div class="od-h">${esc(c.name)}에게서 사기 <small>우리 마을 시장에 없는 물건 · 한정</small></div>`;
      for (const w of (st.wares || [])) { const m = MATS[w.m] || { name: w.m }, p = Gm.carWarePrice(s, w), rest = w.max - w.sold, can = Math.min(rest, Math.floor(s.gold / p), (s.cfg.econ.storeCap || 30) - ((s.mats || {})[w.m] || 0));
        R += `<div class="car-row buy${w.rare ? ' rare' : ''}"><span class="ic sm">${matImg(m)}</span><span class="mp-n"><b>${esc(m.name)}${w.rare ? ' <em class="car-rare">희귀</em>' : ''} <em class="car-x">${GR[GR.indexOf(m.grade)] || ''}급</em></b><small>1개 <b>${fmt(p)}G</b> · 시세 ${fmt(Gm.matPrice(s, w.m))}G · 남은 수 ${rest} / ${w.max} · 창고 ${(s.mats || {})[w.m] || 0}</small></span><span class="car-btn"><button class="ux-btn sm" data-cb="${c.id}:${w.m}:1" ${can > 0 ? '' : 'disabled'}>1개</button><button class="ux-btn sm" data-cb="${c.id}:${w.m}:${Math.max(1, can)}" ${can > 0 ? '' : 'disabled'} title="${fmt(p * Math.max(0, can))}G">다 사기${can > 0 ? ` ${can}` : ''}</button></span></div>`; }
      if (!(st.wares || []).length) R += '<div class="od-empty">이번에는 팔 물건이 없답니다.</div>';
      R += `<div class="od-h">${esc(c.name)}에게 팔기 <small>주문서 · 머무는 동안만</small></div>`;
      for (const o of st.order) { const m = MATS[o.m] || { name: o.m }, p = Gm.carPrice(s, o), have = (s.mats || {})[o.m] || 0, rest = o.max - o.sold, can = Math.min(rest, have);
        R += `<div class="car-row"><span class="ic sm">${matImg(m)}</span><span class="mp-n"><b>${esc(m.name)} <em class="car-x">×${o.mult}</em></b><small>1개 <b>${fmt(p)}G</b> · 시세 ${fmt(Gm.matPrice(s, o.m))}G · 산 수 ${o.sold} / ${o.max} · 창고 ${have}</small></span><span class="car-btn"><button class="ux-btn sm" data-cs="${c.id}:${o.m}:1" ${can ? '' : 'disabled'}>1개</button><button class="ux-btn sm" data-cs="${c.id}:${o.m}:${can}" ${can ? '' : 'disabled'} title="주문 수량까지 · ${fmt(p * can)}G">다 팔기${can ? ` ${can}` : ''}</button></span></div>`; }
      if (!st.order.length) R += '<div class="od-empty">이번에는 살 물건이 없답니다.</div>';
    }
    const cons = s.cons || [], who = ids => ids.map(id => s.advs.find(a => a.id === id)).filter(Boolean), face = a => `<span class="tr-f" style="${faceStyle(a, 34, 180, 17)}"></span>`;
    L += `<div class="od-h od-h2">위탁 보관함 <small>모험가가 맡긴 소재 · 수수료 ${Math.round(cf * 100)}%</small></div>`;
    if (!cons.length) L += '<div class="od-log none">맡아 둔 소재가 없습니다. 지난 상단 값이 길드 매입 · 시장보다 훨씬 높으면 모험가가 소재를 맡깁니다.</div>';
    for (const e of cons) { const m = MATS[e.m]; if (!m) continue; const ps = who(e.ids), wl = keepW - (s.week - e.w), lm = Gm.carLastMult(s, e.m), sale = lm ? Math.max(1, Math.round(Gm.matPrice(s, e.m) * lm)) * e.n : 0, fee = sale ? Gm.consignFeeOf(s, sale) : 0;
      L += `<div class="tr-row c car-cons"><span class="ic">${matImg(m)}</span><span class="fs">${ps.slice(0, 2).map(face).join('')}</span><span><b>${esc(m.name)}</b> ×${e.n}<br><small>${ps.map(a => esc(a.name)).join(' · ') || '떠난 모험가'} 것 · ${wl > 0 ? `${wl}주 뒤 찾아감` : '곧 찾아감'}</small></span><span class="g car-pay">${sale ? `모험가 ${fmt(sale - fee)}G<br><small>길드 ${fmt(fee)}G</small>` : '<small>값 모름</small>'}</span></div>`; }
    if (false) L += `<div class="tr-note">상단이 오면 주문서대로 위탁 소재를 먼저 팝니다. 값은 지난 상단 값으로 어림한 것입니다. ${keepW}주 안에 팔리지 않으면 모험가가 찾아가 시장에 팝니다.</div>`;
    return `<div class="bk2 bk-od bk-gq bk-car"><section class="bk-l">${L}</section><section class="bk-r">${R}</section></div>`;
  }
  function carClick(e) {
    { const b = e.target.closest('[data-ces]'); if (b) { const [cid, act] = b.dataset.ces.split(':'), r = Gm.carEscort(s, cid, act); toast(r.ok ? (act === 'no' ? '호위 부탁을 거절했습니다.' : '호위 의뢰를 게시판에 올렸습니다.') : r.why, r.ok ? 'grow' : 'warn'); hooks.changed(); renderPopup(); return true; } }   // 2026-11-20 상단 호위
    { const b = e.target.closest('[data-cb]'); if (b) { if (b.disabled) return true; const [cid, m, n] = b.dataset.cb.split(':'), r = Gm.carBuy(s, cid, m, +n); toast(r.ok ? `${(MATS[m] || { name: m }).name} ${r.n}개를 ${fmt(r.g)}G에 샀습니다.` : r.why, r.ok ? 'grow' : 'warn'); hooks.changed(); renderPopup(); return true; } }   // 2026-11-20 상단에게서 사기
    const el = e.target.closest('[data-cs]'); if (!el || el.disabled) return false;
    const [cid, m, n] = el.dataset.cs.split(':'), r = Gm.carSell(s, cid, m, +n);
    toast(r.ok ? `${(MATS[m] || { name: m }).name} ${r.n}개를 ${fmt(r.g)}G에 팔았습니다.` : r.why, r.ok ? 'grow' : 'warn'); hooks.changed(); renderPopup(); return true;
  }
  // 2026-11-20 매입 개편 (결정 52 · 53): 소재마다 매입가 하나 — 모험가가 매입가와 시장을 비교해 고름 (위탁은 나중에 떠돌이 상단으로)
  // 2026-11-20 사용자: 소재 판매 + 매입을 한 화면 '소재 관리'로 (시안 docs/design/mockups/market_trade). 마을 시장 재고도 함께
  let mtSel = null, mtFlt = 'all';
  function matHtml() {
    const E = s.cfg.econ, cap = E.storeCap || 30, TH = E.sellTh || [0.9, 0.85, 0.75], mats = s.mats || {}, shop = !!s.built['판매창구'];
    const known = Object.keys(s.knownMats || {}).filter(id => MATS[id] && GR.indexOf(MATS[id].grade) <= s.grade).sort((a, b) => GR.indexOf(MATS[a].grade) - GR.indexOf(MATS[b].grade) || (MATS[b].line === 'food') - (MATS[a].line === 'food'));
    const list = known.filter(id => mtFlt === 'all' || (mtFlt === 'food') === (MATS[id].line === 'food'));
    if (!mtSel || !list.includes(mtSel)) mtSel = list[0] || null;
    const h4 = (id, k) => ((s.sellHist || {})[id] || []).filter(x => x.w > s.week - 4).reduce((t, x) => t + (x[k] || 0), 0);
    const mT = id => Gm.SPICE.has(id) ? (E.mktTargetSpice || 15) : (E.mktTarget || 20), mM = id => Math.max(0, Math.round(((s.mkt || {})[id] != null ? s.mkt[id] : mT(id))));
    const help = `<b>소재 매입:</b> 모험가가 주워 온 소재는 모험가 것입니다. 매입가가 시세의 기준 이상이면 길드에, 아니면 시장에 직접 팝니다 (기준 절약 ${Math.round(TH[0] * 100)} · 보통 ${Math.round(TH[1] * 100)} · 낭비 ${Math.round(TH[2] * 100)}%, 애착이 높으면 조금 싸게도 넘김). 금고가 모자라거나 창고가 가득(${cap}개)이면 시장으로 갑니다.${Gm.carOn(s) ? ' 지난 떠돌이 상단 값이 훨씬 높으면 길드에 맡겨(위탁) 상단에 팝니다.' : ''}<br><b>마을 시장 재고:</b> 마을 상점들이 가진 양입니다. 의뢰에서 나온 소재 · 길드가 판 소재가 들어오고, 마을 사람들이 매주 사 가며(인구가 많을수록 많이), 식당이 모자란 상시 재료를 사 가도 줄어듭니다. 재고가 적으면 시세가 오르고 많으면 내립니다.`;
    let L = `<div class="mt"><div class="ux-h">소재 관리 <small>판매 · 매입 · 시세</small><details class="tr-help"><summary title="도움말" aria-label="도움말">?</summary><div class="tr-help-b">${help}</div></details></div>
      <div class="mt-flt">${[['all', `전체 ${known.length}`], ['food', '음식 소재'], ['etc', '그 밖의 소재']].map(([k, t]) => `<button class="${mtFlt === k ? 'on' : ''}" data-mtf="${k}">${t}</button>`).join('')}</div><div class="mt-list gq-mp">`;
    for (const id of list) { const m = MATS[id], n = mats[id] || 0, fixed = Gm.buyGoldOf(s, id) != null, bp = Gm.matBuyPrice(s, id), t = Gm.mktTrend(s, id);
      L += `<button class="mt-row${id === mtSel ? ' on' : ''}" data-mtsel="${id}"><span class="mt-ic${n ? '' : ' zero'}" title="창고 ${n}/${cap}개">${matImg(m)}<b>${n}</b></span><span class="mt-nm"><b>${esc(m.name)}</b><small>시세 ${Gm.matPrice(s, id)}G ${t > 0 ? '<i class="up">▲</i>' : t < 0 ? '<i class="dn">▼</i>' : ''}${priceSpark(id)} · 시장 ${mM(id)}</small></span><span class="mt-bp${fixed ? '' : ' auto'}">매입가<b>${bp}G</b></span></button>`; }   // 2026-11-20 사용자: '자동' · 지난 4주 길드 / 시장 문구 없앰
    if (!list.length) L += '<div class="tr-none">아직 아는 소재가 없습니다.</div>';
    const nf = known.filter(id => MATS[id].line !== 'food' && mats[id] > 0), sum = nf.reduce((t, id) => t + Gm.sellPreview(s, id, mats[id]), 0), M = s.month || {};
    L += `</div><div class="mt-bar"><span>이번 달 판매 <b>${fmt(Math.round(M.sell || 0))}G</b> · 매입 <b>${M.matBuyN || 0}개 ${fmt(Math.round(-(M.matBuy || 0)))}G</b></span><button class="ux-btn primary" data-snf="1" ${nf.length && shop ? '' : 'disabled'}>음식이 아닌 소재 모두 팔기 (${fmt(sum)}G)</button></div></div>`;
    let R = '<div class="mt-r">';
    if (mtSel) { const id = mtSel, m = MATS[id], n = mats[id] || 0, mp = Gm.matPrice(s, id), bp = Gm.matBuyPrice(s, id), mx = Gm.buyGoldMax(s, id), fixed = Gm.buyGoldOf(s, id) != null, food = m.line === 'food', st = Gm.isStaple(s, id), mm = mM(id), tg = mT(id);
      const nm = ids => ids.map(x => (s.advs.find(a => a.id === x) || {}).name).filter(Boolean), CN = k => (Gm.CARS.find(c => 'car:' + c.id === k) || {}).name || '떠돌이 상단';   // 2026-11-23 사용자: 누구에게서 · 개당 얼마에 샀는지
      const logs = (s.buyLog || []).filter(b => b.m === id).map(b => ({ w: b.w, n: b.n, g: b.g, who: b.ord ? '발주' : '모험가', sub: nm(b.ids || []).join(' · ') }))
        .concat((s.mkBuyLog || []).filter(b => b.m === id).map(b => ({ w: b.w, n: b.n, g: b.g, who: b.src === 'mk' ? '시장' : '상단', sub: b.src === 'mk' ? '식당 재료' : CN(b.src) }))).sort((a, b) => b.w - a.w).slice(0, 5);
      R += `<div class="mt-top"><span class="big ux-slot" data-g="${GR.indexOf(m.grade)}">${matImg(m)}</span><div><div class="mt-tn">${badge(GR.indexOf(m.grade))}<b>${esc(m.name)}</b>${food ? `<span class="tg ${st ? 'st' : 'rare'}" title="${st ? '창고에 없으면 식당이 시장에서 삼' : '시장에 없음 — 모험가 매입으로만'}">${st ? '상시 재료' : '희귀 재료'}</span>` : ''}</div><p>${esc(m.desc || '')}</p></div></div>
        <div class="mt-ch"><div class="mt-per">${[4, 12, 24, 48].map(w => `<button class="${buyChartW === w ? 'on' : ''}" data-bper="${w}">${w}주</button>`).join('')}<em>지금 ${mp}G ${(t => t > 0 ? '<i class="mk-tr up">▲</i>' : t < 0 ? '<i class="mk-tr dn">▼</i>' : '')(Gm.mktTrend(s, id))}</em></div>${priceChart(id, 480, 128, buyChartW, true)}
          <div class="mt-stock" title="마을 상점들이 가진 양 — 적으면 시세가 오름">마을 시장 재고 <span class="bar"><i style="width:${Math.min(100, Math.round(mm / (tg * 1.5) * 100))}%"></i><u style="left:${Math.round(100 / 1.5)}%"></u></span><b>${mm}개</b><small>보통 ${tg}개${mm < tg * 0.5 ? ' · 모자람' : mm > tg * 1.2 ? ' · 넉넉함' : ''}</small></div></div>
        <div class="mt-two">
          <div class="mt-box"><h4>소재 판매 <details class="tr-help mt-q"><summary aria-label="도움말">?</summary><div class="tr-help-b">${shop ? `판매 창구에서 길드 창고의 소재를 마을 시장에 팝니다. 많이 팔수록 마을 재고가 늘어 값이 내려갑니다.${food ? ' 음식 소재는 팔면 요리를 못 만들 수 있습니다.' : ''}` : '판매 창구를 지으면 팔 수 있습니다.'}</div></details><small>창고 ${n} / ${cap}개</small></h4><div class="mt-kv"><span>1개 값</span><b>${Gm.matSellPrice(s, id)}G</b><span>전부 팔면</span><b>${n ? Gm.sellPreview(s, id, n) : 0}G</b></div><div class="mt-btns"><button class="ux-btn" data-sone="${id}" ${n && shop ? '' : 'disabled'}>1개 팔기</button><button class="ux-btn primary" data-sall="${id}" ${n && shop ? '' : 'disabled'}>전부 팔기</button></div></div>
          <div class="mt-box"><h4>소재 매입 <details class="tr-help mt-q"><summary aria-label="도움말">?</summary><div class="tr-help-b">모험가가 주워 온 소재를 이 값에 사들입니다. 모험가는 이 매입가가 시세의 성향 기준(절약 ${Math.round(TH[0] * 100)} · 보통 ${Math.round(TH[1] * 100)} · 낭비 ${Math.round(TH[2] * 100)}%) 이상이면 길드에, 아니면 시장에 팝니다. 애착이 높으면 조금 더 싸게도 넘깁니다. 정하지 않으면 시세를 따라갑니다.</div></details><small>모험가에게서</small></h4><div class="mt-step"><button data-bgold="${id}:-5" ${bp <= 1 ? 'disabled' : ''}>−5</button><button data-bgold="${id}:-1" ${bp <= 1 ? 'disabled' : ''}>−</button><b>${bp}G</b><button data-bgold="${id}:1" ${bp >= mx ? 'disabled' : ''}>+</button><button data-bgold="${id}:5" ${bp >= mx ? 'disabled' : ''}>+5</button></div>${fixed ? `<div class="mt-auto"><button class="gq-auto" data-bgold="${id}:auto" title="정한 값을 지우고 시세를 따라가게">자동으로</button></div>` : ''}</div>
        </div>
        <div class="mt-log"><b>최근 매입</b>${logs.length ? logs.map(b => `<div><span><em class="mt-src ${b.who === '시장' ? 'mk' : b.who === '상단' ? 'car' : 'adv'}">${b.who}</em>${b.sub ? `<small>${esc(b.sub)}</small>` : ''}</span><span class="mt-lq">${b.n}개 · 개당 ${Math.round(b.g / b.n * 10) / 10}G</span><span class="mt-lw">${b.w === s.week ? '이번 주' : (s.week - b.w) + '주 전'}</span><span>${fmt(b.g)}G</span></div>`).join('') : '<div><span>아직 없음</span></div>'}</div>`; }
    else R += '<div class="tr-none">소재를 고르세요.</div>';
    return `<div class="bk2 bk-tr bk-mt"><section class="bk-l">${L}</section><section class="bk-r">${R}</div></section></div>`;
  }
  let buyChart = null, buyChartW = 12;
  function buyHtml() {
    const E = s.cfg.econ, cap = E.storeCap || 30, lo = E.buyRateMin != null ? E.buyRateMin : 0.5, hi = E.buyRateMax != null ? E.buyRateMax : 1.2, TH = E.sellTh || [0.9, 0.85, 0.75];
    const who = ids => ids.map(id => s.advs.find(a => a.id === id)).filter(Boolean), face = a => `<span class="tr-f" style="${faceStyle(a, 34, 180, 17)}"></span>`;
    const known = Object.keys(s.knownMats || {}).filter(id => MATS[id] && GR.indexOf(MATS[id].grade) <= s.grade).sort((a, b) => GR.indexOf(MATS[a].grade) - GR.indexOf(MATS[b].grade));
    const sumH = (id, k) => ((s.sellHist || {})[id] || []).filter(x => x.w > s.week - 4).reduce((t, x) => t + (x[k] || 0), 0);
    const help = `모험가가 매입가와 시장을 비교해 고릅니다. 매입가가 시세의 기준 이상이면 길드에, 아니면 시장에 직접 팝니다 (기준 절약 ${Math.round(TH[0] * 100)} · 보통 ${Math.round(TH[1] * 100)} · 낭비 ${Math.round(TH[2] * 100)}%, 애착이 높으면 조금 싸게도 넘김). 금고가 모자라거나 창고가 가득(${cap}개)이면 시장으로 갑니다.${Gm.carOn(s) ? ' 지난 떠돌이 상단 값이 훨씬 높으면 길드에 맡겨(위탁) 상단에 팝니다.' : ''}`;
    let L = `<div class="tr"><div class="ux-h">소재 매입가 <small>골드로 정함</small><details class="tr-help"><summary title="모험가는 어디에 파나" aria-label="도움말">?</summary><div class="tr-help-b">${help}</div></details></div><div class="mp-list gq-mp">`;   // 2026-11-20 사용자: 설명은 물음표를 누르면
    for (const id of known) { const m = MATS[id], r = Gm.polRate(s, id), g = sumH(id, 'g'), k = sumH(id, 'm');
      L += `<div class="mp-row"><span class="mp-ic" title="창고 ${(s.mats || {})[id] || 0}/${cap}개"><span class="ic sm">${matImg(m)}</span><b>${(s.mats || {})[id] || 0}</b></span><span class="mp-n"><b>${esc(m.name)}</b><small>시세 ${Gm.matPrice(s, id)}G ${trendTag(id)} ${Gm.mktLogOf(s, id).length >= 2 ? `<button class="mp-spk${buyChart === id ? ' on' : ''}" data-bchart="${id}" title="시세 그래프 보기">${priceSpark(id)}</button>` : ''}</small><small class="gq-h">지난 4주 · <b>길드 ${g}</b> · 시장 ${k}${sumH(id, 'c') ? ` · <em class="gq-c">위탁 ${sumH(id, 'c')}</em>` : ''}</small></span><span class="gq-rate">${(() => { const bp = Gm.matBuyPrice(s, id), mx = Gm.buyGoldMax(s, id); return `<button data-bgold="${id}:-5" ${bp <= 1 ? 'disabled' : ''}>−5</button><button data-bgold="${id}:-1" ${bp <= 1 ? 'disabled' : ''}>−</button><b>${fmt(bp)}G</b><button data-bgold="${id}:1" ${bp >= mx ? 'disabled' : ''}>+</button><button data-bgold="${id}:5" ${bp >= mx ? 'disabled' : ''}>+5</button>`; })()}</span><span class="gq-bp">${Gm.buyGoldOf(s, id) != null ? `<button class="gq-auto" data-bgold="${id}:auto" title="정한 값을 지우고 시세를 따라가게">자동으로</button>` : '<small class="gq-am">자동</small>'}</span></div>`;
      if (buyChart === id) L += `<div class="mp-chart"><div class="mp-per">${[4, 12, 24, 48].map(w => `<button class="${buyChartW === w ? 'on' : ''}" data-bper="${w}">${w}주</button>`).join('')}<small>마우스를 올리면 그 주 값</small></div>${priceChart(id, 460, 150, buyChartW)}</div>`; }   // 2026-11-20 사용자: 그래프를 누르면 기간별 시세   /* 2026-11-20 사용자: 매입가를 골드로 */
    if (!known.length) L += '<div class="tr-none">아직 아는 소재가 없습니다.</div>';
    L += `</div></div>`;
    const logs = (s.buyLog || []).slice(0, 8), M = s.month;
    let R = `<div class="tr"><h3>이번 달 매입</h3><div class="sub">모험가가 주워 온 소재는 모험가 것입니다 · 길드는 매입가로 삽니다</div>
      <div class="tr-sum"><div>길드 매입<b class="m">${M.matBuyN || 0}개 · ${fmt(-(M.matBuy || 0))}G</b>돈은 주워 온 모험가에게</div><div>시장으로<b>${M.mktSellN || 0}개</b>모험가가 직접 팖 · 길드 몫 없음</div></div>
      <div class="ux-h">매입 기록 <small>최근 순</small></div>`;
    if (!logs.length) R += '<div class="tr-none">아직 매입한 소재가 없습니다.</div>';
    for (const b of logs) { const m = MATS[b.m], ps = who(b.ids); if (!m) continue;
      R += `<div class="tr-row"><span class="ic">${matImg(m)}</span><span class="fs">${ps.slice(0, 2).map(face).join('')}</span><span><b>${esc(m.name)}</b> ×${b.n}${b.ord ? ' <em class="gq-tag sm">길드 의뢰</em>' : ''}<br><small>${ps.length ? esc(ps[0].name) + (ps.length > 1 ? ' 파티' : '') + '가 주워 옴' : '떠난 모험가'}</small></span><span class="g">${fmt(b.g)}G</span><span class="wk">${b.w === s.week ? '이번 주' : (s.week - b.w) + '주 전'}</span></div>`; }
    R += '<div class="tr-note">산 소재는 길드 창고로 들어가 요리 · 리퀘스트 납품에 쓰고, <b>소재 판매</b> 책갈피에서 팔 수도 있습니다.</div></div>';
    return `<div class="bk2 bk-tr bk-buy"><section class="bk-l">${L}</section><section class="bk-r">${R}</section></div>`;
  }
  function tradeHtml() {   // 2026-11-18 V2 E4-4 (시안 사용자 확인): 매입 기록 + 위탁 보관함 · 위탁품 지금 사들이기
    const E = s.cfg.econ, br = Math.round((E.matBuyRate != null ? E.matBuyRate : 0.7) * 100), cf = E.consignFee != null ? E.consignFee : 0.1;
    const who = ids => ids.map(id => s.advs.find(a => a.id === id)).filter(Boolean), face = a => `<span class="tr-f" style="${faceStyle(a, 34, 180, 17)}"></span>`;
    const cons = s.consign || [], logs = (s.buyLog || []).slice(0, 7), cn = cons.reduce((t, c) => t + c.n, 0), left = (Gm.WPM - s.week % Gm.WPM) % Gm.WPM || Gm.WPM;
    const feeOf = c => Gm.consignFeeOf(s, Gm.matSellPrice(s, c.m) * c.n);   // 2026-11-19: 반올림 · 최소 1G
    // 2026-11-19 V4 2단계 (결정 43): 소재마다 매입(시세 × 50 · 70 · 90%) / 위탁 / 안 받음
    const RO = E.buyRateOpt || [0.5, 0.7, 0.9], cap = E.storeCap || 30, known = Object.keys(s.knownMats || {}).filter(id => MATS[id] && GR.indexOf(MATS[id].grade) <= s.grade).sort((a, b) => GR.indexOf(MATS[a].grade) - GR.indexOf(MATS[b].grade));
    let P = '<div class="tr"><div class="ux-h">소재 처리 <small>귀환 때 소재마다 · 시세는 마을 시장 재고에 따라 움직입니다</small></div><div class="mp-list">';
    for (const id of known) { const m = MATS[id], p = Gm.matPol(s, id), r = Gm.polRate(s, id);
      P += `<div class="mp-row"><span class="ic sm">${matImg(m)}</span><span class="mp-n"><b>${esc(m.name)}</b><small>시세 ${Gm.matPrice(s, id)}G ${trendTag(id)} ${priceSpark(id)} · 창고 ${(s.mats || {})[id] || 0}/${cap}</small></span><span class="mp-seg">${[['buy', '매입'], ['consign', '위탁'], ['none', '안 받음']].map(([k, t]) => `<button class="${p.mode === k ? 'on' : ''}" data-mpol="${id}:${k}">${t}</button>`).join('')}</span><span class="mp-seg r">${p.mode === 'buy' ? RO.map(x => `<button class="${Math.abs(x - r) < 1e-9 ? 'on' : ''}" data-mrate="${id}:${x}" title="매입가 ${Math.floor(Gm.matPrice(s, id) * x + 1e-9)}G">${Math.round(x * 100)}%</button>`).join('') : '<small>' + (p.mode === 'consign' ? `팔리면 수수료 ${Math.round(cf * 100)}%` : '모험가가 직접 팖 · 길드 몫 없음') + '</small>'}</span></div>`; }
    if (!known.length) P += '<div class="tr-none">아직 아는 소재가 없습니다.</div>';
    P += `</div><div class="tr-note"><b>매입</b> = 길드 창고로(요리 · 납품 · 발주) · 매입가를 낮추면 돈이 필요한 모험가가 그 의뢰를 덜 맡습니다(50%면 25% 거름). <b>위탁</b> = 길드가 월말에 시세로 대신 팔고 수수료. <b>안 받음</b> = 모험가가 직접 팔아 길드 몫이 없습니다. 창고가 ${cap}개 차면 위탁으로 돌립니다.</div></div>`;
    let L = P + `<div class="tr"><div class="sub">모험가가 주워 온 소재는 모험가 것입니다 · 매입은 소재마다 정한 비율(기본 ${br}%)로 삽니다</div>
      <div class="tr-sum"><div>이번 달 매입<b class="m">${s.month.matBuyN || 0}개 · ${fmt(-(s.month.matBuy || 0))}G</b>돈은 주워 온 모험가에게</div><div>위탁 보관 중<b>${cn}개</b>${cn ? `월말에 팔리면 수수료 +${fmt(cons.reduce((t, c) => t + feeOf(c), 0))}G` : '위탁을 고른 소재 · 창고가 찼거나 금고가 모자랄 때 생깁니다'}</div></div>
      <div class="ux-h">매입 기록 <small>최근 순</small></div>`;
    if (!logs.length) L += '<div class="tr-none">아직 매입한 소재가 없습니다.</div>';
    for (const b of logs) { const m = MATS[b.m], ps = who(b.ids); if (!m) continue;
      L += `<div class="tr-row"><span class="ic">${matImg(m)}</span><span class="fs">${ps.slice(0, 2).map(face).join('')}</span><span><b>${esc(m.name)}</b> ×${b.n}<br><small>${ps.length ? esc(ps[0].name) + (ps.length > 1 ? ' 파티' : '') + '가 주워 옴' : '떠난 모험가'}</small></span><span class="g">${fmt(b.g)}G</span><span class="wk">${b.w === s.week ? '이번 주' : (s.week - b.w) + '주 전'}</span></div>`; }
    L += `<div class="tr-note">산 소재는 길드 창고로 들어가 요리 · 리퀘스트 납품에 쓰고, <b>소재 판매</b> 책갈피에서 판매가 그대로 팔 수 있습니다.</div></div>`;
    let R = `<div class="tr"><h3>위탁 보관함</h3><div class="sub">위탁을 고른 소재 · 창고가 찼거나 금고가 모자라 사지 못한 소재 · 모험가 것으로 맡아 둡니다</div>`;
    if (!cons.length) R += '<div class="tr-none">맡아 둔 소재가 없습니다.<br><small>귀환 때 금고가 매입가보다 적으면 여기에 쌓입니다.</small></div>';
    cons.forEach((c, i) => { const m = MATS[c.m], ps = who(c.ids); if (!m) return; const sale = Gm.matSellPrice(s, c.m) * c.n, fee = feeOf(c), cost = Gm.matBuyPrice(s, c.m) * c.n;
      R += `<div class="tr-row c"><span class="ic">${matImg(m)}</span><span class="fs">${ps.slice(0, 2).map(face).join('')}</span><span><b>${esc(m.name)}</b> ×${c.n}<br><small>${ps.map(a => esc(a.name)).join(' · ') || '떠난 모험가'} 것 · 월말(${left}주 뒤) 판매 시 모험가 ${fmt(sale - fee)}G · 길드 ${fmt(fee)}G</small></span><button class="ux-btn sm" data-cbuy="${i}" ${s.gold < cost ? 'disabled title="금고가 모자랍니다"' : ''}>${fmt(cost)}G에 사들이기</button></div>`; });
    R += `<div class="tr-warn">위탁 소재는 길드 것이 아니라서 요리 · 리퀘스트 납품에 쓸 수 없습니다. 사들이면 창고로 들어옵니다.</div><div class="tr-note">위탁 수수료는 시세의 <b>${Math.round(cf * 100)}%</b>입니다. 매입으로 둔 소재는 금고가 넉넉하면 다음 귀환부터 다시 자동으로 매입합니다.</div></div>`;
    return `<div class="bk2 bk-tr"><section class="bk-l">${L}</section><section class="bk-r">${R}</section></div>`;
  }
  function qFeeHtml(q) {   // 2026-11-17 V2 E5-4: 이 의뢰 수수료 + 실수령 미리 보기 (책 오른쪽 쪽)
    const O = s.cfg.econ.feeOpt || [0.1, 0.15, 0.2], open = Gm.feeOptions(s), base = Gm.questFee(s, { g: q.g }), cur = Gm.questFee(s, q), R = q.reward * (q.x2 ? 2 : 1);
    const one = Gm.econSplit(R, [cur]), three = Gm.econSplit(R, [cur, cur, cur]), K = s.cfg.econ.restK || 0;
    const fb0 = s.cfg.econ.feeBase != null ? s.cfg.econ.feeBase : 0.1, skip = r => Math.min(100, Math.round(Math.max(0, r - fb0) / fb0 * K * 100));   // 2026-11-19: 기본 = feeBase (5%가 첫 칸)
    return `<div class="mk5-q pop"><h4 data-qfeeopen="1" class="fd-h">이 의뢰 수수료<i class="fd-ar">접기 ▾</i></h4><span class="ct-seg"><button data-qfee="${q.id}:base" class="${q.fee == null ? 'on' : ''} df">${GR[q.g]}급 기본 ${Math.round(base * 100)}%</button>${O.map(r => { const ok = open.some(x => Math.abs(x - r) < 1e-9); return `<button data-qfee="${q.id}:${r}" class="${q.fee != null && Math.abs(q.fee - r) < 1e-9 ? 'on' : ''} ${ok ? '' : 'lk'}" ${ok ? '' : 'disabled'}>${ok ? '' : '🔒'}${Math.round(r * 100)}%</button>`; }).join('')}</span>
      <div class="pv">혼자 가면 <b>모험가 실수령 ${fmt(one.net[0])}G</b> · 길드 <em>${fmt(one.guild)}G</em> &nbsp;|&nbsp; 3명이면 1인 실수령 ${three.net[2] === three.net[0] ? fmt(three.net[0]) : fmt(three.net[2]) + '~' + fmt(three.net[0])}G</div>
      <div class="nt">${cur > fb0 + 1e-9 ? `돈이 필요한 모험가는 이 의뢰를 ${skip(cur)}% 확률로 거릅니다. 남아서 기한이 지나면 사라지고 신뢰도 −1.` : cur < fb0 - 1e-9 ? '기본보다 싼 수수료라 모든 모험가가 이 의뢰를 먼저 맡습니다 — 빨리 처리되는 대신 길드 몫이 줄어듭니다.' : `수수료를 낮추면 빨리 처리되고, 올리면 돈이 필요한 모험가가 덜 고릅니다 (${O.filter(r => r > fb0 + 1e-9).map(r => `${Math.round(r * 100)}% → ${skip(r)}% 거름`).join(' · ')}).`} 이미 출발한 의뢰는 출발 때 수수료 그대로입니다.</div></div>`;
  }
  function qDetailHtml(q, fee) {   // fee: 게시판 책 오른쪽 쪽이면 성공 · 실패 줄 끝에 '수수료 ○% 바꾸기' (누르면 수수료 칸이 의뢰 취소 위에 펼쳐짐)
    const T = QT[q.tid] || {}, d = danger(T, q.g), fb = foeBand(q), intel = !!s.built['정보실'], wk = T.weeks || 1;
    let h = `<div class="t1">${gradeImg(q.g, 'sm')}<b>${esc(cleanName(q))}</b>${qlvBadge(q, true)}<span class="ux-tag">${Gm.QTYPE[q.type]}</span><span class="ux-tag">${wk}주</span></div>`;
    if (T.client || T.notice || T.tip) h += `<div class="note">${T.client ? `<b>${esc(T.client)}</b> ` : ''}${esc(T.notice || '')}${T.notice && T.tip ? '<br>' : ''}${esc(T.tip || '')}</div>`;   // 오버 메모(편집기)
    const QL = s.cfg.qlv, LV = q.lv && QL && QL.on && s.qlv ? s.qlv[q.tid] : null, lvM = q.lv && QL ? 1 + QL.foe * (q.lv - 1) : 1;
    if (LV) h += `<div class="ql-box">의뢰 레벨 <b>Lv${q.lv}</b> · ${LV.lv < QL.max ? `성공 <b>${LV.wins} / ${QL.need}</b> → Lv${LV.lv + 1}` : '<b>최고 레벨</b>'}${q.lv > 1 ? ` <small>· Lv1보다 적 +${Math.round(QL.foe * (q.lv - 1) * 100)}% · 보상 +${Math.round(QL.pay * (q.lv - 1) * 100)}% [임시]</small>` : ''}</div>`;
    if (d.n) {
      h += '<div class="sec">출현 몬스터</div><div class="mons">' + (T.enemies || []).map(e => { const m = MONS[e.mon] || {}; return `<div class="mon"><span class="pic"${m.img ? ` style="background-image:url(assets/expedition/${m.img})"` : ''}></span><b>${esc(e.name)}</b> ×${e.count}${e.boss ? ' <span class="ux-tag injured">보스</span>' : ''}<small>${q.fz ? '약 ' : ''}체력 ${Math.round(e.hp * lvM)} · 공격 ${Math.round(e.atk * lvM)}${q.fz ? ' ?' : ''}</small></div>`; }).join('') + '</div>';
      h += `<div class="sec">위험도</div><div class="row">${[1, 2, 3].map(k => SKULL(k <= d.n)).join('')}<span>${GR[q.g]}급 모험가 <b>${d.n}명${d.more ? ' 이상' : ''}</b> 권장${d.more ? ' (장비가 필요할 수 있음)' : ''}</span></div>`;
      h += q.fz && LV ? `<div class="ql-warn">레벨이 막 올라 <b>적 정보가 부정확</b>해요 — 실제는 훨씬 강하거나 약할 수 있음 <small>(앞으로 ${LV.fresh}번)</small></div>` : `<div class="row">${intel ? (fb === 'up' ? '<i class="foe up">▲</i> 이번 무리는 평소보다 <b>강합니다</b>' : fb === 'down' ? '<i class="foe down">▼</i> 이번 무리는 평소보다 <b>약합니다</b>' : '이번 무리는 평소 수준입니다') : '<i class="foe unk">?</i> 정보실이 있으면 이번 무리의 강약을 알 수 있습니다'}</div>`;
    } else h += `<div class="sec">요구 능력치 <small>비전투 의뢰</small></div><div class="row">${q.req.map(k => `<span class="ux-tag">${Gm.STATS[k]} ${Math.round(q.r)}</span>`).join(' ')}</div>`;
    { const bm = Gm.baseMatOf(T), b = bm ? Gm.resBand(s, bm) : null; if (b != null) h += `<div class="row res-row">사냥터 · 채집지 ${resTxt(bm)}${Gm.scoutOn(s, bm) ? '<small class="sc">정찰함</small>' : ''}<small>${b === 0 ? '흔적을 찾기 어렵고 얻는 소재가 절반 · 의뢰 레벨이 오르지 않음' : b === 2 ? (QT[q.tid] && (QT[q.tid].enemies || []).length ? '너무 많아 마을에 피해 · 잡을수록 좋음' : '넉넉함') : '알맞음'}</small></div>`; }   // 2026-11-19 V4 3단계 (결정 44, 숫자 숨김)
    const rw = (T.rewards || []).filter(r => MATS[r.m]);
    h += `<div class="sec">보상</div><div class="rw"><span class="gold big"><i></i>${fmt(q.reward * (q.x2 ? 2 : 1))}G${q.x2 ? ' <em class="qx2">×2</em>' : ''}</span>${rw.map(r => { const m = MATS[r.m], known = !!(s.knownMats || {})[r.m];   // 모르는 소재: 실루엣 + ? (이름은 ???)
      return `<span class="mat ${r.role === '주' ? 'main' : ''}" title="${known ? esc(m.name) : '???'}"><span class="ux-slot${known ? '' : ' unk'}" data-g="${GR.indexOf(m.grade)}">${known || m.icon ? matImg(m) : ''}</span><em>${r.p}%</em></span>`; }).join('')}</div>`;
    const fs = q.fameS != null ? q.fameS : s.cfg.fame.succ[q.g], ff = q.fameF != null ? q.fameF : s.cfg.fame.fail[q.g], ts = q.trustS != null ? q.trustS : s.cfg.quest.trustSucc, tf = q.trustF != null ? q.trustF : s.cfg.quest.trustFail;
    { const G = gqOf(q); if (G) { const left = G.end - s.week;   // 2026-11-20 길드 의뢰 카드: 명성 · 신뢰 · 수수료 · 위약금 없음
      h += `<div class="gq-det"><span class="gq-tag">길드 의뢰 ${GQ_NUM[G.kind] || ''}</span> <b>${esc(Gm.gqLabel(G))}</b>${G.kind === 'mat' ? ` · <b>${G.got} / ${G.n}개</b> 모음` : ''}${G.hot ? ' · <em class="gq-hot">바로 맡겨짐</em>' : ''} · 기한 ${left > 0 ? left + '주 남음' : '이번 주 끝'}<br>${esc(GQ_FX[G.kind] || '')} 수수료 · 명성 · 신뢰 변화 없이 보상을 그대로 받습니다.</div>`; return h; } }   // 거두기 안내는 아래 버튼 줄에
    h += `<div class="foot"><span>성공 명성 <b class="ux-plus">+${fs}</b> · 신뢰 <b class="ux-plus">+${ts}</b></span><span>실패 명성 <b class="ux-minus">−${ff}</b> · 신뢰 <b class="ux-minus">−${tf}</b></span>${fee ? `<span class="fd-chip${feeOpen ? ' on' : ''}" data-qfeeopen="1" title="이 의뢰만 수수료 바꾸기">수수료 <b>${Math.round(Gm.questFee(s, q) * 100)}%</b>${q.fee == null ? ' 기본' : ''} ${feeOpen ? '▾' : '▸'}</span>` : ''}</div>`;
    { const left = Gm.expireWeeks(s) - (s.week - q.posted);
      h += `<div class="foot muted">기한 ${left}주 남음 (지나면 사라지고 신뢰도 −${s.cfg.quest.trustExpire != null ? s.cfg.quest.trustExpire : 1}) · 취소하면 ${fmt(Math.round(q.reward * 0.10))}G, 신뢰도 −2</div>`; }
    return h;
  }
  function showTip(b) {
    const q = s.board.find(x => x.id === qHover), c = b.querySelector(`.qcard[data-q="${qHover}"]`), tip = b.querySelector('#qTip');
    if (!q || !c) { tip.classList.remove('on'); return; }
    const h = qDetailHtml(q);
    tip.innerHTML = h; tip.classList.add('on');
    // 카드 오른쪽, 공간이 없으면 왼쪽
    const bw = b.clientWidth, x = c.offsetLeft + c.offsetWidth + 10, tw = tip.offsetWidth;
    tip.style.left = (x + tw > bw ? c.offsetLeft - tw - 10 : x) + 'px';
    tip.style.top = Math.max(b.scrollTop, Math.min(c.offsetTop - 6, b.scrollTop + b.clientHeight - tip.offsetHeight - 6)) + 'px';   // 보이는 영역 안에 (창이 길어도 아래가 잘리지 않게)
  }
  // ---------- 장부: 수입 · 지출 (지난달 | 이번 달) + 12개월 순이익 그래프 (docs/design/popup_ledger.md) ----------
  // 순이익 = 수입 − 지출(시설 건설비·기타). 관문 1의 "운영 순이익(m.net)"은 건설비를 빼고 계산하므로 따로 둠
  const LG_IN = [['fee', '의뢰 수수료'], ['resale', '소재 판매'], ['consign', '위탁 수수료'], ['car', '상단 판매'], ['meal', '식사 판매'], ['tavern', '주점 매출'], ['reqIn', '리퀘스트 보상'], ['subsidy', '왕국 보조금'], ['royal', '왕국 포상금']];
  const LG_OUT = [['build', '시설 건설비'], ['matBuy', '소재 매입'], ['scout', '지명 섭외비'], ['cpay', '계약 보수'], ['csup', '계약 지원'], ['order', '길드 발주'], ['gq', '길드 의뢰'], ['carBuy', '상단 구매'], ['shop', '식당 재료 (시장 구매)'], ['gift', '장비 선물'], ['prep', '침공 대비 물약'], ['other', '기타']];   // 2026-11-17 V2: 계약 보수 · 지원
  const LG_OPT = { royal: 1, carBuy: 1, car: 1, consign: 1, cpay: 1, csup: 1, order: 1, gq: 1, gift: 1, prep: 1 };   // shop: 식당이 잡화 상인에게서 산 양념 (2026-11-19 결정 38)   // order: 길드 발주 선지급 − 거둔 돈 (2026-11-18 E8-4)
  const LG_EOM = { subsidy: 1 };   // 월말 결산 때 한꺼번에 들어오는 항목 (주점 매출은 2026-11-12부터 매주 술 1잔 단위라 제외)
  const lgIn = m => LG_IN.reduce((t, [k]) => t + (m[k] || 0), 0), lgOut = m => LG_OUT.reduce((t, [k]) => t + (m[k] || 0), 0), lgNet = m => lgIn(m) + lgOut(m);
  const gG = v => `${v < 0 ? '−' : ''}${fmt(Math.abs(Math.round(v)))}G`;
  function lgTip(k, m, cur) {   // 줄 오버 내역
    const E = s.cfg.econ, fr = m.feeRate != null ? m.feeRate : Gm.feeRate(s);
    if (k === 'fee') return `성공한 의뢰 <b>${m.success || 0}건</b> · 보상의 ${Math.round(fr * 100)}%`;
    if (k === 'resale') return (E.resaleRate ? `성공한 의뢰 <b>${m.success || 0}건</b> · 보상의 ${Math.round(E.resaleRate * 100)}% · ` : '') + (m.sell ? `판매 창구 <b>${fmt(m.sell)}G</b>` : '판매 없음');
    if (k === 'matBuy' && Gm.gqOn(s)) return m.matBuyN ? `모험가가 주워 온 소재 <b>${m.matBuyN}개</b>를 소재마다 정한 매입가로 매입${m.mktSellN ? ` · 시장으로 ${m.mktSellN}개` : ''}` : '없음';   // 2026-11-20 매입 개편
    if (k === 'matBuy') return m.matBuyN ? `모험가가 주워 온 소재 <b>${m.matBuyN}개</b>를 판매가의 ${Math.round((E.matBuyRate || 0.7) * 100)}%로 매입` : '없음';
    if (k === 'consign') return m.consignN ? `위탁 소재 <b>${m.consignN}개</b> 판매 · 수수료 ${Math.round((E.consignFee || 0.1) * 100)}%` : '없음';
    if (k === 'meal') { const d = m.dishes || {}, sa = m.dishSale || {}, fr = m.dishFree || {}, wa = m.dishWaste || {}, ks = [...new Set([...Object.keys(d), ...Object.keys(fr), ...Object.keys(wa)])];   // 2026-11-20 사용자: 마감 할인 · 무료 식사 · 버린 그릇도
      if (!ks.length) return m.dishes ? '판매 없음' : '내역 없음 (예전 기록)';
      const one = n => `${esc(n)} 판매 <b>${d[n] || 0}그릇</b>${sa[n] ? ` (마감 할인 ${sa[n]})` : ''}${fr[n] ? ` · 무료 식사 ${fr[n]}` : ''}${wa[n] ? ` · 버림 ${wa[n]}` : ''}`;
      return ks.map(one).join('<br>') + `<br><small>합계 판매 ${Object.values(d).reduce((a, b) => a + b, 0)}그릇 · 마감 할인 ${m.saleN || 0} · 무료 식사 ${m.freeMeal || 0} · 버림 ${m.waste || 0}</small>`; }
    if (k === 'tavern') return `술 <b>${m.drinks || 0}잔</b> 판매 · 1잔 마진 ${GR[s.grade]}급 ${(s.cfg.econ.drinkMargin || [2])[s.grade] || 2}G${Gm.upg(s, '주점') ? ' + 업그레이드 5G' : ''}`;   // 2026-11-12: 매주 술 1잔 단위
    if (k === 'subsidy' && E.subsidyMode === 1) { const pc = Math.round((E.subsidyRate != null ? E.subsidyRate : 0.5) * 100), ev = E.subsidyEvery || 6, base = cur ? (s.subHalf || 0) : (m.subsidyBase || 0);   // 2026-11-18 결정 23: 성과 보조금 (4주마다 [임시])
      return cur ? `${ev === 1 ? '월말 결산' : '6 · 12월 말'} 때 들어옵니다 · 지금까지 성공한 의뢰 보상 <b>${fmt(base)}G</b>의 ${pc}%` : (m.subsidy ? `성공한 의뢰 보상 <b>${fmt(base)}G</b>의 ${pc}%` : '지급 달이 아님'); }
    if (k === 'subsidy') { const g = cur ? s.grade : (m.grade != null ? m.grade : s.grade); return `${cur ? '월말 결산 때 들어옵니다 · ' : ''}${GR[g]}급 길드 월 <b>${fmt(E.subsidy[g])}G</b>`; }
    if (k === 'reqIn') { const b = m.reqs || []; return b.length ? b.map(x => `${esc(x.n)} <b>${gG(x.g)}</b>`).join('<br>') : '없음'; }
    if (k === 'gift') return m.gift ? '대장간에서 모험가에게 장비를 선물한 값' : '없음';
    if (k === 'order') return m.order ? '상시 발주로 들어온 소재 값 (가져온 모험가에게 지급 · 리퀘스트 장 → 길드 발주)' : '없음';
    if (k === 'carBuy') return m.carBuy ? `떠돌이 상단에게서 <b>${m.carBuyN || 0}개</b> 삼 (경영 장 → 상단)` : '없음';   // 2026-11-20
    if (k === 'car') return m.car ? `창고 소재 <b>${m.carN || 0}개</b>를 떠돌이 상단에 판매 (경영 장 → 상단)` : '없음';   // 2026-11-20
    if (k === 'gq') return m.gq ? `길드 의뢰로 들어온 소재 <b>${m.gqN || 0}개</b> 값 (맡아 둔 돈에서 가져온 모험가에게 지급 · 리퀘스트 장 → 길드 의뢰)` : '없음';   // 2026-11-20
    if (k === 'shop') return m.shop ? '식당이 요리를 만들 때 창고에 없는 상시 재료를 시장에서 산 값' : '없음';
    if (k === 'cpay') return m.cpay ? '계약 모험가 월 보수 (근무한 주만큼, 월말 지급)' : '없음';
    if (k === 'csup') return m.csup ? '계약 모험가 식사 · 물약 지원 (약정 한도 안 실제 사용액)' : '없음';
    if (k === 'prep') return m.prepN ? `정비 때 물약 <b>${m.prepN}개</b>` : '없음';
    if (k === 'scout') return m.scoutN ? `모험가 <b>${m.scoutN}번</b> 부탁 (거절당해도 나갑니다)` : '없음';
    if (k === 'build') { const b = m.builds || []; return b.length ? b.map(x => `${esc(FAC_LABEL[x.f] || x.f)} <b>${gG(-x.c)}</b>`).join('<br>') : '없음'; }
    if (k === 'other') { const w = m.wd || []; return w.length ? w.map(x => `${x.name ? esc(x.name) : `${GR[x.g]}급 ${QTYPE_[x.type]} 의뢰`} 취소 <b>${gG(-x.cost)}</b>`).join('<br>') : '없음'; }
    return '';
  }
  const QTYPE_ = Gm.QTYPE;
  let lgTips = [];
  function gradeBoxHtml() {   // 경영 장 오른쪽 아래: 길드 승급 조건 (2026-11-16)
    if (!Gm.mainView) return ''; const m = Gm.mainView(s);
    if (m.grade > 0) return `<div class="lg-grade"><div class="ux-h">길드 승급 <small>${GR[m.grade]}급</small></div><p class="gd-none">다음 승급 조건은 준비 중입니다.</p></div>`;
    const ok1 = m.doneN >= m.need, ok2 = m.state === 'done';
    const st2 = m.state === 'none' ? '부탁을 다 들어주면 영주의 전갈이 옵니다' : m.state === 'offer' ? '<b class="go">리퀘스트 장에서 받을 수 있습니다</b>' : m.state === 'set' ? `<b class="go">침공까지 ${m.left}주</b>` : m.state === 'cool' ? `${m.cool}주 뒤 다시 도전` : '달성';
    return `<div class="lg-grade"><div class="ux-h">길드 승급 <small>${GR[m.grade]}급 → ${GR[m.grade + 1]}급</small></div>
      <div class="gd-row ${ok1 ? 'ok' : ''}"><i>${ok1 ? '✔' : '1'}</i><span>리퀘스트 ${m.need}번 들어주기</span><b>${Math.min(m.doneN, m.need)} / ${m.need}</b><em class="gd-bar"><u style="width:${Math.min(100, Math.round(m.doneN / m.need * 100))}%"></u></em></div>
      <div class="gd-row ${ok2 ? 'ok' : ''} ${ok1 ? '' : 'wait'}"><i>${ok2 ? '✔' : '2'}</i><span>메인 퀘스트 「다리를 지켜라」 달성</span><b></b><em class="gd-st">${st2}</em></div>
      <p class="gd-rw">승급하면: ${fmt(m.gold)}G · 명성 +${m.fame} · 모험가 관리소 해금 · ${GR[m.grade + 1]}급 의뢰</p></div>`;
  }
  let lgSel = null;   // 2026-11-20 사용자: 왼쪽 항목을 누르면 오른쪽에 상세, 요약(12개월 그래프 · 승급)은 버튼으로
  function ledgerHtml() {
    const cur = s.month, prev = s.lastMonth; lgTips = [];
    const tipId = html => { lgTips.push(html); return lgTips.length - 1; };
    const cell = (k, m, isCur) => {
      if (!m) return '<td class="n muted">—</td>';
      const v = m[k] || 0, eom = isCur && LG_EOM[k] && !v;
      return `<td class="n ${eom ? 'eom' : v < 0 ? 'neg' : ''}" data-lt="${tipId(lgTip(k, m, isCur))}">${eom ? '월말' : v ? gG(v) : '0G'}</td>`;
    };
    let h = `<div class="lg-book"><table class="lg"><colgroup><col><col class="c"><col class="c"></colgroup>
      <tr class="hd"><th><button class="lg-sum-btn${lgSel ? '' : ' on'}" data-lgk="">요약 보기</button></th><th class="n">지난달</th><th class="n">이번 달</th></tr>
      <tr class="sec in"><th colspan="3">수입</th></tr>`;
    const lgShow = k => !LG_OPT[k] || (prev && prev[k]) || cur[k];   // 2026-11-17: 쓸 때만 보이는 줄 (위탁 · 계약 · 침공 물약) — 장부가 책 한 쪽을 넘지 않게
    for (const [k, n] of LG_IN) if (lgShow(k)) h += `<tr class="lg-k${lgSel === k ? ' on' : ''}" data-lgk="${k}"><td>${n}</td>${cell(k, prev, false)}${cell(k, cur, true)}</tr>`;
    h += `<tr class="sum in"><td>수입 합계</td><td class="n">${prev ? gG(lgIn(prev)) : '—'}</td><td class="n">${gG(lgIn(cur))}</td></tr>
      <tr class="sec out"><th colspan="3">지출</th></tr>`;
    for (const [k, n] of LG_OUT) if (lgShow(k)) h += `<tr class="lg-k${lgSel === k ? ' on' : ''}" data-lgk="${k}"><td>${n}</td>${cell(k, prev, false)}${cell(k, cur, true)}</tr>`;
    h += `<tr class="sum out"><td>지출 합계</td><td class="n neg">${prev ? gG(lgOut(prev)) : '—'}</td><td class="n neg">${gG(lgOut(cur))}</td></tr>
      <tr class="tot"><td>순이익</td><td class="n ${prev && lgNet(prev) < 0 ? 'neg' : 'pos'}">${prev ? gG(lgNet(prev)) : '—'}</td><td class="n ${lgNet(cur) < 0 ? 'neg' : 'pos'}">${gG(lgNet(cur))}</td></tr></table>`;
    // 그래프: 최근 12개월 순이익 (건설비 포함). 0 기준선 위 = 이익, 아래 = 손해
    const hist = s.history.slice(-12);
    if (lgSel) {   // 항목 상세 (오른쪽 쪽)
      const nm = ([...LG_IN, ...LG_OUT].find(x => x[0] === lgSel) || [, lgSel])[1], isIn = LG_IN.some(x => x[0] === lgSel), rows = hist.map(m => [m, m[lgSel] || 0]), mx = Math.max(1, ...rows.map(r => Math.abs(r[1])), Math.abs(cur[lgSel] || 0));
      h += `<section class="lg-chart lg-det"><div class="ux-h">${esc(nm)} <small>${isIn ? '수입' : '지출'}</small></div>`
        + `<div class="ld-two"><div class="ld-box"><b>이번 달</b><em class="${(cur[lgSel] || 0) < 0 ? 'neg' : ''}">${gG(cur[lgSel] || 0)}</em><div class="ld-tx">${lgTip(lgSel, cur, true)}</div></div>`
        + `<div class="ld-box"><b>지난달</b><em class="${prev && (prev[lgSel] || 0) < 0 ? 'neg' : ''}">${prev ? gG(prev[lgSel] || 0) : '—'}</em><div class="ld-tx">${prev ? lgTip(lgSel, prev, false) : '아직 지난달 기록이 없습니다'}</div></div></div>`
        + (rows.length ? `<div class="ux-h" style="margin-top:10px">최근 ${rows.length}개월</div><div class="ld-hist">${rows.map(([m, v]) => `<div class="ld-r"><span>${Gm.dateLabel(m.week - 1).replace(/ \d+주$/, '').replace(/^\d+년차 /, '')}</span><i><u class="${v < 0 ? 'neg' : ''}" style="width:${Math.round(Math.abs(v) / mx * 100)}%"></u></i><b>${gG(v)}</b></div>`).join('')}</div>` : '')
        + '</section>';
    } else if (hist.length) {
      const nets = hist.map(lgNet), avg = nets.reduce((a, b) => a + b, 0) / nets.length, succ = hist.reduce((t, m) => t + m.success, 0), qn = hist.reduce((t, m) => t + m.quests, 0);
      const up = Math.max(0, ...nets), dn = Math.max(0, ...nets.map(v => -v)), pad = 18, span = Math.max(1, up + dn), zero = pad + up / span * (100 - pad * 2);   // 위아래 18%는 금액 글자 자리
      h += `<section class="lg-chart"><div class="ux-h">최근 ${hist.length}개월 순이익 <small>평균 ${gG(avg)} · 의뢰 성공률 ${qn ? Math.round(succ / qn * 100) : 0}%</small></div><div class="lg-bars" style="--z:${zero}%">`;
      hist.forEach((m, i) => {
        const v = nets[i], hgt = Math.abs(v) / span * (100 - pad * 2), lbl = Gm.dateLabel(m.week - 1).replace(/ \d+주$/, '').replace(/^\d+년차 /, ''), bld = (m.build || 0) < 0;
        const tip = `<b>${Gm.dateLabel(m.week - 1).replace(/ \d+주$/, '')}</b><br>수입 ${gG(lgIn(m))} · 지출 ${gG(lgOut(m))}<br>순이익 <b>${gG(v)}</b>${bld ? `<br>⚒ ${(m.builds || []).map(x => FAC_LABEL[x.f] || x.f).join(', ')} 건설` : ''}`;
        h += `<div class="lb" data-lt="${tipId(tip)}"><span class="col"><b class="zl" style="top:${zero}%"></b><i class="${v < 0 ? 'neg' : ''}" style="${v < 0 ? `top:${zero}%` : `bottom:${100 - zero}%`};height:${hgt}%"></i><em class="${v < 0 ? 'neg' : ''}" style="${v < 0 ? `top:calc(${zero + hgt}% + 3px)` : `bottom:calc(${100 - zero + hgt}% + 3px)`}">${fmt(Math.round(v))}</em>${bld ? `<b class="bd" style="top:${v < 0 ? zero : zero - hgt}%" title="건설">⚒</b>` : ''}</span><span class="mo">${lbl}</span></div>`;
      });
      h += '</div>' + gradeBoxHtml() + '</section>';
    } else h += '<section class="lg-chart"><p class="muted">첫 결산은 다음 달 초에 나옵니다.</p>' + gradeBoxHtml() + '</section>';
    return h + '</div><div class="qtip lgtip" id="lgTip"></div>';
  }
  function ledgerTipBind(b) {
    b.onmouseover = e => { const c = e.target.closest('[data-lt]'), tip = b.querySelector('#lgTip'); if (!c || !tip) return; const html = lgTips[+c.dataset.lt]; if (!html) return;
      tip.innerHTML = html; tip.classList.add('on'); const br = b.getBoundingClientRect(), r = c.getBoundingClientRect(), k = br.width / b.offsetWidth || 1;
      let x = (r.left - br.left) / k + b.scrollLeft, y = (r.bottom - br.top) / k + b.scrollTop + 6; if (x + tip.offsetWidth > b.clientWidth - 8) x = b.clientWidth - tip.offsetWidth - 8;
      if (y + tip.offsetHeight > b.scrollTop + b.clientHeight - 8) y = (r.top - br.top) / k + b.scrollTop - tip.offsetHeight - 6; tip.style.left = x + 'px'; tip.style.top = y + 'px'; };
    b.onmouseout = e => { const c = e.target.closest('[data-lt]'); if (!c || c.contains(e.relatedTarget)) return; const t = b.querySelector('#lgTip'); if (t) t.classList.remove('on'); };
  }
  // ---------- 모험가 목록·상세창 (M3-4) ----------
  const STAGE = ['', '1차', '2차', '3차'];
  function radar(a, size) { // 능력치 오각형: 바탕(진한 색)과 장비 포함 최종치(옅은 테두리)
    const S = size || 260, c = S / 2, R = S * 0.38, ang = i => -Math.PI / 2 + i * 2 * Math.PI / 5;
    const pt = (i, v) => `${(c + Math.cos(ang(i)) * R * Math.min(1, v / 100)).toFixed(1)},${(c + Math.sin(ang(i)) * R * Math.min(1, v / 100)).toFixed(1)}`;
    let g = '';
    for (const lv of [25, 50, 75, 100]) g += `<polygon points="${[0, 1, 2, 3, 4].map(i => pt(i, lv)).join(' ')}" fill="none" stroke="rgba(90,58,34,${lv === 100 ? .45 : .15})"/>`;
    for (let i = 0; i < 5; i++) g += `<line x1="${c}" y1="${c}" x2="${pt(i, 100).split(',')[0]}" y2="${pt(i, 100).split(',')[1]}" stroke="rgba(90,58,34,.15)"/>`;
    g += `<polygon points="${[0, 1, 2, 3, 4].map(i => pt(i, Gm.finalStat(s, a, i))).join(' ')}" fill="rgba(232,180,74,.18)" stroke="#e8b44a" stroke-width="2" stroke-dasharray="5 4"/>`;
    g += `<polygon points="${[0, 1, 2, 3, 4].map(i => pt(i, a.stats[i])).join(' ')}" fill="rgba(90,120,184,.35)" stroke="#3f5f9a" stroke-width="2.5"/>`;
    for (let i = 0; i < 5; i++) { const [x, y] = pt(i, 122).split(','); g += `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle" font-size="17" font-weight="700" fill="${(a.line || [a.core]).includes(i) ? '#8a4b10' : '#3b2a1e'}">${Gm.STATS[i]} ${Math.round(a.stats[i])}</text>`; }
    return `<svg viewBox="0 0 ${S} ${S}" width="${S}" height="${S}" role="img" aria-label="능력치 오각형">${g}</svg>`;
  }
  function skillName(k) {
    const sk = root.GAME_DATA.skills || [];
    const hit = sk.find(x => x.line === Gm.STATS[k.line] && x.class.replace(/ \(.*\)$/, '') === k.form);
    return hit ? { name: hit.name, eff: hit.effect, form: k.form } : { name: '?', eff: '', form: k.form };
  }
  // 스킬 아이콘: 1차·2차 30종은 계열별 순서대로 skill_<계열>_<n>.png. 3차는 아직 없어 그 계열 1차 아이콘을 씀
  const SK_LINE = ['str', 'agi', 'int', 'spi', 'dex'], SK_ICON = {};
  (function () { const sk = (root.GAME_DATA || {}).skills || [], cnt = [0, 0, 0, 0, 0];
    for (const x of sk) { const li = Gm.STATS.indexOf(x.line); if (li < 0 || !/^[12]차/.test(x.stage)) continue; SK_ICON[x.name] = `skill_${SK_LINE[li]}_${cnt[li]++}.png`; } })();
  function skillIcon(k) { return SK_ICON[skillName(k).name] || `skill_${SK_LINE[k.line]}_0.png`; }
  function skillTipHtml(a, k) {   // 장착 스킬 오버 창: 이름 · 계열·직업 · 효과 · 전직하면 바뀌는 모습
    const n = skillName(k), evo = [];
    const list = a.stage === 1 ? Gm.CLASS2 : a.stage === 2 && !a.fin ? Gm.CLASS3.filter(c => c.from === a.cls) : [];
    const disc = s.discovered || {}; let hid = 0;   // 아직 모르는 직업은 이름을 숨김 (전직 탭과 같은 규칙)
    for (const c of list) if (c.line.includes(k.line)) { if (!disc[c.name]) { hid++; continue; } const m = skillName({ line: k.line, form: c.name }); if (m.name !== '?') evo.push(`<span class="ev"><img src="assets/icons/${skillIcon({ line: k.line, form: c.name })}" alt="">${c.name} → <b>${m.name}</b></span>`); }
    if (hid) evo.push(`<span class="ev unk"><i>?</i>아직 모르는 직업</span>`);
    return `<div class="t1"><span class="ux-slot skslot" data-line="${k.line}" style="width:44px;height:44px"><img src="assets/icons/${skillIcon(k)}" alt=""></span><div><b>${n.name}</b><div class="ux-muted" style="font-size:13px">${Gm.STATS[k.line]} 계열 · ${n.form}</div></div></div>
      <div class="row" style="margin-top:8px">${n.eff}</div>
      <div class="row ux-muted">${Gm.STATS[k.line]} ${Math.round(Gm.finalStat(s, a, k.line))}</div>
      ${evo.length ? `<div class="sec">진화</div><div class="evs">${evo.join('')}</div>` : a.stage >= 3 || a.fin ? '<div class="row ux-muted">최종 형태</div>' : ''}`;
  }
  function advStateHtml(a) { return a.state === 'quest' ? `<span class="st quest">의뢰 중 ${a.until - s.week > 0 ? (a.until - s.week) + "주" : "· 이번 주 귀환"}</span>` : a.state === 'town' ? '<span class="st town">길드에 있음</span>' : a.state === 'injured' ? `<span class="st away">부상 회복 ${Math.max(0, a.until - s.week)}주</span>` : '<span class="st away">마을 밖</span>'; }
  // ---------- 모험가 팝업 (시안: 머리 / 장비 · 능력치 · 전투 수치 / 아래 탭) ----------
  const CLS_KEY = ['warrior', 'archer', 'mage', 'cleric', 'rogue'];
  const FACE_AT = { warrior_m: [132, 118], warrior_f: [161, 121], archer_m: [148, 110], archer_f: [152, 119], mage_m: [145, 137], mage_f: [158, 142], cleric_m: [128, 116], cleric_f: [143, 125], rogue_m: [132, 122], rogue_f: [147, 128] };   // 상세 창(104×120) 얼굴 위치 [x, y, 확대]
  const FACE_LIST = { warrior_m: [141, 132, 0.5], warrior_f: [166, 128, 0.5], archer_m: [148, 102, 0.5], archer_f: [155, 129, 0.5], mage_m: [147, 152, 0.5], mage_f: [158, 140, 0.5], cleric_m: [128, 116, 0.5], cleric_f: [145, 115, 0.5], rogue_m: [132, 130, 0.5], rogue_f: [147, 125, 0.5] };   // 목록 원형(44px)
  const FACE_SMALL = { warrior_m: [138, 129, 0.5], warrior_f: [164, 130, 0.5], archer_m: [150, 104, 0.5], archer_f: [152, 119, 0.5], mage_m: [147, 144, 0.5], mage_f: [158, 141, 0.5], cleric_m: [124, 119, 0.5], cleric_f: [144, 121, 0.5], rogue_m: [136, 128, 0.5], rogue_f: [147, 127, 0.5] };   // 작은 목록 원형(40px)
  function faceStyle(a, box, h, cy) {   // 로비 SD 정면 그림(높이 470)에서 얼굴 부분을 잘라 보여 줌
    const k = CLS_KEY[a.core] + '_' + (a.id % 2 ? 'm' : 'f'), TB = box >= 100 ? FACE_AT : box >= 40 ? FACE_LIST : FACE_SMALL, f = TB[k] || FACE_AT[k] || [128, 150], z = h / 470 * (f[2] || 1);   // f = [얼굴 x, 얼굴 y, 확대(생략하면 1)]
    return `background-image:url(assets/chr/chr_${k}_front.png);background-size:auto ${Math.round(h * (f[2] || 1))}px;background-position:${Math.round(box / 2 - f[0] * z)}px ${Math.round(cy - f[1] * z)}px`;
  }
  // ---------- 설정 창: 소리 · 월말 장부 · 화면 효과 · 저장 ----------
  let optArm = null;   // 책 설정 장: 덮어쓰기 확인 중인 칸 ('s2' 등)
  function optsHtml() {
    const o = root.Snd ? root.Snd.opt : { bgm: .6, mute: false, fx: true }, sw = (k, on, tx) => `<button class="ux-btn op-sw ${on ? 'on' : ''}" data-ocmd="${k}">${tx[on ? 0 : 1]}</button>`;
    if (document.getElementById('pop').classList.contains('book')) {   // 책: 왼쪽 = 소리 · 화면 / 오른쪽 = 게임(지금 슬롯 · 저장 · 불러오기) (2026-11-13)
      const SL = hooks.slots ? hooks.slots() : { cur: 1, list: [] }, stamp = ts => { const d = new Date(ts); return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
      const L = `<div class="ux-h">소리</div><div class="op-sec">
          ${[['master', '전체 음량', ''], ['bgm', '배경음악', ''], ['sfx', '효과음', '효과음은 준비 중']].map(([k, n, sm]) => { const v = Math.round((o[k] == null ? (k === 'sfx' ? 0.8 : 1) : o[k]) * 100); return `<div class="op-row"><span class="op-nm">${n}${sm ? ` <small>${sm}</small>` : ''}</span><input type="range" class="op-rg" data-ovol="${k}" min="0" max="100" value="${v}" style="--v:${v}%"><b data-ovv="${k}">${v}%</b></div>`; }).join('')}
          <div class="op-row"><span class="op-nm">음소거</span>${sw('mute', o.mute, ['켜짐', '꺼짐'])}</div></div>
        <div class="ux-h">화면</div><div class="op-sec">
          <div class="op-row"><span class="op-nm">화면 효과 <small>별가루 · 낙엽 · 쪽지 흔들림</small></span>${sw('fx', o.fx, ['켜짐', '꺼짐'])}</div>
          <div class="op-row"><span class="op-nm">월말 장부 자동 표시</span>${sw('report', UI.autoReport, ['켜짐', '꺼짐'])}</div></div>`;
      const card = (i, k) => { const n = k + 1, cur = n === SL.cur, arm = optArm === 's' + n;
        const info = !i ? '<div class="op-empty">빈 칸</div>' : i.bad ? '<div class="op-empty">읽을 수 없는 저장</div>'
          : `<div class="op-i1"><b>${i.date}</b><span>${i.grade}급 · ${fmt(i.gold)}G · 모험가 ${i.advs}명</span></div><div class="op-i2">저장 ${i.ts ? stamp(i.ts) : '—'}</div>`;
        return `<div class="op-slot ${cur ? 'cur' : ''} ${i ? '' : 'empty'}"><div class="op-sh"><b>${n}번 슬롯</b>${cur ? '<em>지금 쓰는 칸</em>' : ''}</div>${info}
          <div class="op-sb"><button class="ux-btn sm ${cur ? 'primary' : ''} ${arm ? 'danger' : ''}" data-ocmd="saveto" data-n="${n}">${arm ? '한 번 더 누르면 덮어씀' : '여기에 저장'}</button>${i && !i.bad ? `<button class="ux-btn sm" data-ocmd="loadn" data-n="${n}">불러오기</button>` : ''}</div></div>`; };
      const R = `<div class="ux-h">저장 슬롯 <small>${SL.list.filter(Boolean).length} / ${SL.list.length}칸</small></div><div class="op-slots">${SL.list.map(card).join('')}</div>
        <p class="op-note">게임은 매달 초에 "지금 쓰는 칸"에 자동 저장됩니다. 다른 칸에 저장하거나 불러오면 그 칸이 지금 쓰는 칸이 됩니다.</p>`;
      return `<div class="bk2 bk-opt"><section class="bk-l">${L}</section><section class="bk-r">${R}</section></div>`;
    }
    return `<div class="op-wrap">
      <div class="op-sec"><h3>소리</h3>
        <div class="op-row"><span class="op-nm">배경음악 음량</span><input type="range" class="op-rg" id="opBgm" min="0" max="100" value="${Math.round(o.bgm * 100)}"><b id="opBgmV">${Math.round(o.bgm * 100)}%</b></div>
        <div class="op-row"><span class="op-nm">음소거</span>${sw('mute', o.mute, ['켜짐', '꺼짐'])}</div>
      </div>
      <div class="op-sec"><h3>화면</h3>
        <div class="op-row"><span class="op-nm">화면 효과 (별가루 · 낙엽 · 쪽지 흔들림)</span>${sw('fx', o.fx, ['켜짐', '꺼짐'])}</div>
        <div class="op-row"><span class="op-nm">월말 장부 자동 표시</span>${sw('report', UI.autoReport, ['켜짐', '꺼짐'])}</div>
      </div>
      <div class="op-sec"><h3>게임</h3>
        <div class="op-row op-btns"><button class="ux-btn" data-ocmd="save">저장하기</button><button class="ux-btn" data-ocmd="load">불러오기</button></div>
      </div></div>`;
  }
  document.addEventListener('input', e => { const k = popup === 'opts' && e.target.dataset && e.target.dataset.ovol; if (k) { const v = +e.target.value; if (root.Snd) root.Snd.set(k, v / 100); e.target.style.setProperty('--v', v + '%'); const o = q(`[data-ovv="${k}"]`); if (o) o.textContent = v + '%'; return; }   // 책: 전체 · 배경음악 · 효과음
    if (popup !== 'opts' || e.target.id !== 'opBgm') return; const v = +e.target.value; if (root.Snd) root.Snd.set('bgm', v / 100); q('#opBgmV').textContent = v + '%'; e.target.style.setProperty('--v', v + '%'); });
  document.addEventListener('click', e => {
    if (popup !== 'opts') return; const t = e.target.closest('[data-ocmd]'); if (!t) return; const c = t.dataset.ocmd, S = root.Snd;
    if (c === 'mute' || c === 'fx') S.set(c, !S.opt[c]);
    else if (c === 'report') { UI.autoReport = !UI.autoReport; S.set('report', UI.autoReport); const r = q('#mReport'); if (r) { r.querySelector('i').textContent = UI.autoReport ? '켬' : '끔'; r.classList.toggle('off', !UI.autoReport); } }
    else if (c === 'save') { hooks.save(); toast('게임을 저장했습니다.', 'info'); }
    else if (c === 'saveto') { const n = +t.dataset.n, SL = hooks.slots(), i = SL.list[n - 1];
      if (i && n !== SL.cur && optArm !== 's' + n) { optArm = 's' + n; renderPopup(); return; }   // 다른 칸 덮어쓰기는 두 번 눌러 확인
      optArm = null; hooks.saveTo(n); toast(`${n}번 슬롯에 저장했습니다.`, 'info'); }
    else if (c === 'loadn') { optArm = null; UI.close(); hooks.loadSlot(+t.dataset.n); return; }
    else if (c === 'load') { UI.close(); hooks.load(); }
    renderPopup();
  });
  const stOf = a => a.state === 'quest' ? 'quest' : a.state === 'town' ? 'town' : a.state === 'injured' ? 'injured' : 'away';
  const ST_SHORT = { quest: '의뢰 중', town: '길드', injured: '부상', away: '마을 밖' };   // 2026-11-16 명부 줄은 짧게 (한 줄에 들어가게)
  const ST_TXT = { quest: '의뢰 중', town: '길드에 있음', injured: '부상 회복', away: '마을 밖' };
  const stTag = a => { const k = stOf(a), w = Math.max(0, a.until - s.week); return `<span class="ux-tag ${k}">● ${ST_TXT[k]}${k === 'quest' ? (w ? ' ' + w + '주' : ' · 이번 주 귀환') : k === 'injured' ? ' ' + w + '주' : ''}</span>`; };   // 2026-11-12: 남은 0주 → "이번 주 귀환"
  const ITEMS_ = ((root.GAME_DATA || {}).content || {}).items || [];
  const gearItem = (type, g) => ITEMS_.find(i => i.kind === 'gear' && i.gtype === type && i.grade === GR[g]) || null;
  let advView = 'detail';   // 책 모험가 장 오른쪽 쪽: 'detail'(명부) | 'career'(경력 책갈피) | 'contract'(계약 제안 책갈피, 2026-11-17 V2)
  let ctDraft = null;   // 계약 제안 양식 { aid, weeks, rate, pay, sup } — 다른 모험가를 고르면 기본값으로
  let advTab = 'skill';   // 아래 탭: 'skill'(기본) | 'path' | 'trait' | 'career' — 항상 하나가 펼쳐져 있음
  let advAnimFor = null;   // 능력치 칸이 차오르는 움직임: 다른 모험가를 고르거나 팝업을 처음 열 때만
  let advFlip = false;     // 책: 붙인 쪽지를 바꾸면 새 쪽지가 위에서 넘어오는 움직임 (0.25초)
  // 책 펼침 (2026-11-13 시안): 왼쪽 쪽 = 모험가 명부 / 오른쪽 쪽 = 고른 모험가 상세 (아래 스킬·전직·성향·경력 = 붙인 쪽지 묶음)
  // ---- 칭호 · 배고픔 · 피로 (2026-11-13 화면 반영): 규칙은 아직 없음 (docs/design/titles_v1.md, adv_condition_v1.md 결정 대기)
  //      → 지금은 모두 기본값: 칭호 = 기본 칭호 "신입" · 배고픔 = 배부름 · 피로 = 활기. 규칙이 들어오면 a.titles / a.title / a.hunger / a.fatigue 를 채우면 됨 ----
  const TITLE_CAT = [   // [이름(4자 이하), 얻는 조건, 효과 문구] — docs/design/titles_v1.md 4장 견본
    ['첫걸음', '첫 의뢰 성공', '주 능력치 +1'], ['괴력', '토벌 의뢰 5회 성공', '힘 +3'], ['신속', '사냥·채집 의뢰 5회 성공', '민첩 +3'],
    ['박식', '조사 의뢰 5회 성공', '지력 +3'], ['수호', '호위·구호 의뢰 5회 성공', '정신 +3'], ['손재주', '탐사 의뢰 5회 성공', '기교 +3'],
    ['불굴', '부상에서 1번 회복', '정신 +2 · 힘 +1'], ['개근', '의뢰 성공 30회', '모든 능력치 +1'], ['단골', '애착 "동반자"', '주 능력치 +2'],
    ['터줏대감', '애착 "마을의 수호자"', '모든 능력치 +2'], ['각성', '2차 전직', '주 능력치 +2'], ['우승자', '대회 우승', '주 능력치 +2 · 모두 +1']];
  const sampleTitles = a => (a.titles || []).slice();   // 달성한 칭호 번호 목록 (규칙 구현 전에는 비어 있음)
  const sampleOn = a => (a.title != null ? a.title : -1);   // 붙인 칭호 (-1 = 안 붙임 → 기본 칭호 "신입")
  const ttlName = on => on >= 0 ? TITLE_CAT[on][0] : '신입';
  const ATT_NAME = ['방랑자', '새내기', '동반자', '토박이'];   // 2026-11-13 결정: 화면(ui.js)은 새 이름. game_core ATTACH_TITLE(기록 문장 등)은 칭호 구현 때 변경
  const TRAIT_TXT = {   // 성향 행동 문장 (책: 머리 성향 칸에 마우스를 올리면 보임 / 기존 팝업: 성향 쪽지)
    risk: ['승산이 확실한 의뢰만 고르고, 조금만 다쳐도 물약을 꺼냅니다.', '자기 실력에 맞는 의뢰를 고르고, 위험하면 물러설 줄 압니다.', '실력보다 높은 의뢰에도 겁 없이 뛰어들고, 쓰러지기 직전까지 버팁니다.'],
    spend: ['돈을 아껴 식사는 자주 거르고, 장비는 넉넉히 모인 뒤에야 삽니다.', '먹을 땐 먹고, 필요한 만큼만 씁니다.', '번 돈은 바로 쓰는 편이라 식당 단골이고, 물약도 가득 챙깁니다.'],
    social: ['웬만해선 혼자 떠나고, 정말 어려운 의뢰에만 동료를 찾습니다.', '버거운 의뢰라 싶으면 동료를 모읍니다.', '쉬운 의뢰에도 함께 갈 동료부터 찾습니다.']
  };
  const condLv = v => (v >= 70 ? 2 : v >= 40 ? 1 : 0);
  const sampleCond = a => ({ food: condLv(a.hunger || 0), tired: condLv(a.fatigue || 0) });   // 배고픔 0 배부름 · 1 출출 · 2 굶주림 / 피로 0 활기 · 1 피곤 · 2 지침 (0~100, 규칙 구현 전에는 0)
  const ICON = {
    ok: '<svg viewBox="0 0 20 20"><path d="M4 16 C4 8 9 3 17 3 C17 11 12 16 4 16 Z" fill="#6e9f44" stroke="#4a6f2a" stroke-width="1.2"/><path d="M5 15 L13 7" stroke="#4a6f2a" stroke-width="1.2"/></svg>',
    hurt: '<svg viewBox="0 0 20 20"><g transform="rotate(-35 10 10)"><rect x="2" y="6.5" width="16" height="7" rx="3" fill="#e9b9a4" stroke="#a8321f" stroke-width="1.2"/><rect x="7.5" y="7.5" width="5" height="5" fill="#fff4ea" stroke="#a8321f" stroke-width=".8"/></g></svg>',
    food: ['<svg viewBox="0 0 20 20"><path d="M3 12 C3 7 7 5 10 5 C13 5 17 7 17 12 L17 14 L3 14 Z" fill="#d9a35a" stroke="#7a4a1e" stroke-width="1.2"/><path d="M7 8 L8 11 M10 7.5 L10.5 11 M13 8 L12.5 11" stroke="#7a4a1e" stroke-width="1"/></svg>',
      '<svg viewBox="0 0 20 20"><path d="M3 12 C3 7 7 5 10 5 L10 14 L3 14 Z" fill="#d9a35a" stroke="#7a4a1e" stroke-width="1.2"/><path d="M10 5 L9 7 L10.5 9 L9 11 L10.5 13 L10 14" fill="none" stroke="#7a4a1e" stroke-width="1"/></svg>',
      '<svg viewBox="0 0 20 20"><circle cx="6" cy="13" r="1.8" fill="#c48a44"/><circle cx="10.5" cy="14" r="1.3" fill="#c48a44"/><circle cx="14" cy="12.5" r="1.6" fill="#c48a44"/><circle cx="9" cy="10.5" r="1" fill="#c48a44"/></svg>'],
    tired: ['<svg viewBox="0 0 20 20"><circle cx="10" cy="10" r="4" fill="#f0b43a" stroke="#a8721a" stroke-width="1"/><g stroke="#a8721a" stroke-width="1.4" stroke-linecap="round"><path d="M10 2.5v2M10 15.5v2M2.5 10h2M15.5 10h2M4.7 4.7l1.4 1.4M13.9 13.9l1.4 1.4M4.7 15.3l1.4-1.4M13.9 6.1l1.4-1.4"/></g></svg>',
      '<svg viewBox="0 0 20 20"><path d="M13 3.5 A7 7 0 1 0 16.5 13 A5.5 5.5 0 0 1 13 3.5 Z" fill="#c9b37a" stroke="#7a6a3a" stroke-width="1.1"/></svg>',
      '<svg viewBox="0 0 20 20"><path d="M11 4.5 A6.5 6.5 0 1 0 14.5 13.5 A5 5 0 0 1 11 4.5 Z" fill="#8a7aa8" stroke="#4e4270" stroke-width="1.1"/><text x="13" y="8" font-size="7" font-weight="700" fill="#4e4270">z</text><text x="16" y="5" font-size="5" font-weight="700" fill="#4e4270">z</text></svg>'] };
  const FOOD_N = ['배부름', '출출함', '굶주림'], TIRED_N = ['활기', '피곤함', '지침'];
  ICON.meat = '<svg viewBox="0 0 20 20"><path d="M12.5 3.5 C16.5 3.5 17.5 8 15 10.5 L10 15.5 C8 17.5 4.5 15.5 5.5 12.5 L9 6.5 C10 4.5 11 3.5 12.5 3.5 Z" fill="#c0603a" stroke="#6e2e16" stroke-width="1.2"/><path d="M6 14 L3 17 M3 15.5 a1.3 1.3 0 1 0 1.5 1.5" stroke="#eadfc8" stroke-width="2" stroke-linecap="round" fill="none"/></svg>';
  ICON.moon = ICON.tired[2];
  // 2026-11-13: Gemini로 만든 상태 아이콘 4개 (assets/ui/status/, 게임 아이콘 화풍)
  const stImg = (f, t) => `<img src="assets/ui/status/st_${f}.png" alt="${t}">`;
  ICON.ok = stImg('health_ok', '건강'); ICON.hurt = stImg('health_hurt', '부상'); ICON.meat = stImg('hunger', '배고픔'); ICON.moon = stImg('fatigue', '피로');
  const condIcons = a => { const c = sampleCond(a), hurt = stOf(a) === 'injured';
    return `<span class="cond"><i class="ci" title="${hurt ? '부상' : '건강'}">${hurt ? ICON.hurt : ICON.ok}</i><span class="cs lv${c.food}" title="배고픔"><i class="ci">${ICON.meat}</i>${FOOD_N[c.food]}</span><span class="cs lv${c.tired}" title="피로"><i class="ci">${ICON.moon}</i>${TIRED_N[c.tired]}</span></span>`; };
  const attMini = a => { const AT = [0, 30, 60, 90, 100], t = Gm.attachTier(a), lo = AT[t], hi = AT[t + 1] || 100, pct = t >= 3 ? 100 : Math.min(100, (a.attach - lo) / (hi - lo) * 100);
    return `<span class="attm" title="애착 ${Math.round(a.attach)}"><em>${ATT_NAME[t]}</em><i class="trk"><i style="width:${pct}%"></i></i></span>`; };
  // 책 펼침 (2026-11-13 시안): 왼쪽 쪽 = 모험가 명부 / 오른쪽 쪽 = 고른 모험가 상세 (아래 스킬·전직·성향·경력·칭호 = 붙인 쪽지 묶음)

  // ---------- 계약 모험가 화면 (경제 개편 V2 E2-3 · E2-5, 시안 docs/design/mockups/economy_v2/ · 결정 14 · 16 · 17) ----------
  const relIcons = a => (a.attach >= 65 ? '<i class="ri ct" title="지역 기여 (애착 65 이상 · 마을 인구 +2)">기</i>' : '') + (a.home || a.attach >= 100 ? '<i class="ri hm" title="상주 (애착 100 또는 창립 멤버 · 늘 마을에 있음)">⌂</i>' : '');   // 이름 옆 작은 표 (쓸 때만)
  function contractBox(a) {
    const c = a.contract; if (!c) return '';
    const left = Math.max(0, c.end - s.week + 1), used = Gm.cCallsLeft ? (s.cfg.contract.callMax - Gm.cCallsLeft(s, a)) : 0;
    return `<div class="ct-box"><b>계약 모험가</b> · ${c.start + 1}주 ~ ${c.end + 1}주 (남은 ${left}주) · 계약 수수료 ${Math.round(c.rate * 100)}% · 월 보수 ${c.pay}G · 지원 한도 ${c.sup}G · 지명 4주에 ${s.cfg.contract.callMax}번 중 ${used}번 사용${c.next ? ` · <b>다음 계약 ${c.next.weeks}주 정해짐</b>` : ''}</div>`;
  }
  function contractPage(a) {
    const C = s.cfg.contract, D = Gm.contractDefault(s);
    if (!ctDraft || ctDraft.aid !== a.id) ctDraft = Object.assign({ aid: a.id }, D, { pay: Math.max(D.pay, Gm.contractMinPay(s, a)) });   // 결정 48: 기본 보수가 최소 보수보다 적으면 최소 보수로
    const T = ctDraft, why = Gm.contractWhy(s, a), tw = Gm.contractTermsWhy(s, T), e = Gm.contractEval(s, a, T), r = { no: 0, maybe: 1, yes: 2 }[e.mood];
    const names = ['거절할 것 같다', '고민 중', '받아들일 것 같다'], say = [e.lowPay ? `"계약에 묶이는 만큼 월 보수는 적어도 ${e.minPay}G는 받아야겠어요."` : '"이 조건이면 혼자 일하는 게 낫겠어요."', '"음… 조금만 더 생각해 볼게요. 조건이 살짝 아쉬워요."', '"좋아요, 마스터. 잘 부탁드려요."'][r];
    const seg = (k, vals, unit, show) => `<span class="ct-seg">${vals.map(v => `<button data-ct="${k}:${v}" class="${Math.abs(v - T[k]) < 1e-9 ? 'on' : ''} ${Math.abs(v - D[k]) < 1e-9 ? 'df' : ''}">${show ? show(v) : v}${unit}</button>`).join('')}</span>`;
    const step = (k, max, unit) => `<span class="ct-step"><button data-ct="${k}:-" ${T[k] <= 0 ? 'disabled' : ''}>−</button><b>${T[k]}${unit}</b><button data-ct="${k}:+" ${T[k] >= max ? 'disabled' : ''}>+</button>${T[k] !== D[k] ? `<span class="chg">기본 ${D[k]}${unit}</span>` : ''}</span>`;
    const changed = ['weeks', 'rate', 'pay', 'sup'].some(k => Math.abs(T[k] - D[k]) > 1e-9);
    const att = Gm.attachTier(a);
    let h = `<div class="ct-of"><h3>계약 제안</h3><div class="sub">${GR[s.grade]}급 기본값 양식 · 바꾼 칸만 표시됩니다</div>
      <div class="ct-who"><span class="face" style="${faceStyle(a, 64, 335, 32)}"></span><span><b>${a.name}</b> ${STAGE[a.stage]} ${a.cls} · ${GR[a.grade]}급<br>애착 ${Math.round(a.attach)} <b class="st">${ATT_NAME[att]}</b> · 의뢰 성공 ${a.done || 0}회</span></div>
      <div class="ct-row"><span class="lb">기간</span>${seg('weeks', C.weeksOpt, '주')}<span class="rg">${C.weeksOpt.join(' · ')}주<br>기본 ${D.weeks}주</span></div>
      <div class="ct-row"><span class="lb">계약 수수료</span>${seg('rate', C.rateOpt, '%', v => Math.round(v * 100))}<span class="rg">${Math.round(C.rateOpt[0] * 100)}~${Math.round(C.rateOpt[C.rateOpt.length - 1] * 100)}% (5%)<br>기본 ${Math.round(D.rate * 100)}%</span></div>
      <div class="ct-row"><span class="lb">월 보수</span>${step('pay', C.payMax, 'G')}<span class="rg">0~${C.payMax}G (${C.step}G)<br>기본 ${D.pay}G · <b>최소 ${Gm.contractMinPay(s, a)}G</b></span></div>
      <div class="ct-row"><span class="lb">지원 한도</span>${step('sup', C.supMax, 'G')}<span class="rg">월 0~${C.supMax}G (${C.step}G)<br>기본 ${D.sup}G</span></div>
      <div class="ct-fix">고정: <em>지명 4주에 ${C.callMax}번까지 · 섭외비 0 · 범위 안 거절 없음 · 리퀘스트 우선</em></div>`;
    if (why) h += `<div class="ct-why">${why}</div>`;
    else h += `<div class="ct-react">${a.name}의 반응</div><div class="ct-meter">${names.map((n, i) => `<span class="r${i} ${i === r ? 'on' : ''}">${n}</span>`).join('')}</div><div class="ct-say">${say}</div>`;
    h += `<div class="ct-btns"><button class="rs ${changed ? '' : 'dim'}" data-ct="reset">기본값 복원</button><button class="go" data-ct="go" ${why || tw ? 'disabled' : ''}>${a.contract ? '갱신 제안하기' : '제안하기'}</button></div></div>`;
    return h;
  }
  function contractClick(cmd) {
    const a = s.advs.find(x => x.id === openAdv); if (!a || !ctDraft) return;
    const C = s.cfg.contract, D = Gm.contractDefault(s);
    if (cmd === 'reset') { ctDraft = Object.assign({ aid: a.id }, D); renderPopup(); return; }
    if (cmd === 'go') { const r = Gm.contractPropose(s, a.id, { weeks: ctDraft.weeks, rate: ctDraft.rate, pay: ctDraft.pay, sup: ctDraft.sup });
      if (r.ok) { UI.say([{ name: a.name, face: 'smile', text: r.line, adv: a }, { name: '리나', face: 'smile', text: `${a.name} 씨와 ${a.contract && a.contract.next ? '계약을 갱신했어요' : '계약을 맺었어요'}!` }]); advView = 'detail'; hooks.changed(); bookSync('advs'); }   // 2026-11-20 사용자: 알림 대신 대화
      else if (r.line) UI.say([{ name: a.name, face: 'smile', text: r.line, adv: a }]); else toast(r.why, 'warn');
      renderPopup(); return; }
    const [k, v] = cmd.split(':'), max = { pay: C.payMax, sup: C.supMax }[k];
    if (v === '+' || v === '-') ctDraft[k] = Math.max(0, Math.min(max, ctDraft[k] + (v === '+' ? C.step : -C.step)));
    else ctDraft[k] = +v;
    renderPopup();
  }
  function advsBookHtml() {
    const pty = new Map(); (s.active || []).forEach((x, qi) => x.party.forEach((id, pi) => pty.set(id, { qi, pi, col: root.Director && root.Director.partyColor ? root.Director.partyColor(x.q.id) : null })));
    const list = s.advs.filter(a => a.alive).sort((x, y) => { const px = pty.get(x.id), py = pty.get(y.id);
      if (px && py) return px.qi - py.qi || px.pi - py.pi; if (px || py) return px ? -1 : 1;
      return y.stage - x.stage || y.lv - x.lv || x.id - y.id; });
    if (openAdv == null || !list.some(a => a.id === openAdv)) openAdv = list[0] && list[0].id;
    const promo = new Set((s.proposals || []).map(p => p.id));
    let h = `<div class="bk2 bk-av ${root.BOOK_ATT || 'att-b'}"><section class="bk-l"><div class="ux-h">모험가 명부 <small>${list.length} / ${Gm.advCap(s)}명</small></div><div class="av-list ${root.BOOK_ADV_LIST || 'st-d'}">`;
    for (const a of list) { const pc = pty.get(a.id) && pty.get(a.id).col, on = sampleOn(a), t = ttlName(on);
      h += `<button class="ux-row ${openAdv === a.id ? 'on' : ''} ${stOf(a) === 'injured' || stOf(a) === 'quest' ? stOf(a) : ''} ${pc ? 'pty' : ''} ${promo.has(a.id) ? 'promo' : ''}" data-adv="${a.id}"${pc ? ` style="--pc:${pc}"` : ''}><span class="ux-face" style="${faceStyle(a, 44, 230, 22)}"><i class="dot ${stOf(a)}"></i>${promo.has(a.id) ? '<i class="star" title="전직 제안">★</i>' : ''}${buffIco(a, 1)}</span>
      <span><span class="nm">${t ? `<em class="ttl">${t}</em>` : ''}${a.name}${qkOf(a) ? `<i class="qk1">${esc(qkOf(a).name[0])}</i>` : ''}${a.contract ? `<em class="ct-tag" title="계약 모험가 · ${a.contract.end + 1}주까지 (체결 주 ~ 체결 주 + 기간 − 1)">계약</em>` : ''}</span><span class="sub">${a.contract ? `계약 ${Math.max(0, Math.min(a.contract.weeks, s.week - a.contract.start + 1))}/${a.contract.weeks}주<i class="ct-bar ${a.contract.end - s.week <= 1 ? 'end' : ''}" title="${a.contract.end - s.week <= 1 ? '곧 끝남 — 계약 제안에서 갱신할 수 있어요' : '계약 진행'}"><i style="width:${Math.round(Math.max(0, Math.min(1, (s.week - a.contract.start + 1) / a.contract.weeks)) * 100)}%"></i></i>` : `${a.cls} · ${ST_SHORT[stOf(a)]}${stOf(a) === 'injured' ? ' ' + Math.max(0, a.until - s.week) + '주' : ''}`}${relIcons(a)}</span></span><i class="ux-grade av-gr" style="background-image:url(assets/ui/hud/badge_${GR[a.grade]}.png)" title="${GR[a.grade]}급"></i>${condIcons(a)}${attMini(a)}<span class="rt"><b>Lv ${a.lv}</b></span></button>`; }
    const a = s.advs.find(x => x.id === openAdv);
    return h + `</div></section><section class="bk-r av-main">${a ? advDetail(a) : '<div class="ux-empty">모험가가 없습니다.</div>'}</section><div class="qtip avtip" id="avTip"></div></div>`;
  }
  function advsHtml() {
    // 2026-11-12 파티 색: 의뢰 중인 파티를 의뢰 순서대로 위에 묶고, 로비 발밑 원과 같은 색으로 카드를 물들임 (1인 의뢰 포함)
    const pty = new Map(); (s.active || []).forEach((x, qi) => x.party.forEach((id, pi) => pty.set(id, { qi, pi, col: root.Director && root.Director.partyColor ? root.Director.partyColor(x.q.id) : null })));
    const list = s.advs.filter(a => a.alive).sort((x, y) => { const px = pty.get(x.id), py = pty.get(y.id);
      if (px && py) return px.qi - py.qi || px.pi - py.pi; if (px || py) return px ? -1 : 1;
      return y.stage - x.stage || y.lv - x.lv || x.id - y.id; });
    if (openAdv == null || !list.some(a => a.id === openAdv)) openAdv = list[0] && list[0].id;
    const promo = new Set((s.proposals || []).map(p => p.id));
    let h = '<div class="av"><div class="av-list">';
    for (const a of list) { const pc = pty.get(a.id) && pty.get(a.id).col; h += `<button class="ux-row ${openAdv === a.id ? 'on' : ''} ${stOf(a) === 'injured' || stOf(a) === 'quest' ? stOf(a) : ''} ${pc ? 'pty' : ''} ${promo.has(a.id) ? 'promo' : ''}" data-adv="${a.id}"${pc ? ` style="--pc:${pc}"` : ''}><span class="ux-face" style="${faceStyle(a, 44, 230, 22)}"><i class="dot ${stOf(a)}"></i>${promo.has(a.id) ? '<i class="star" title="전직 제안">★</i>' : ''}${buffIco(a, 1)}</span>
      <span><span class="nm">${a.name}</span><span class="sub">${a.cls} · ${ST_TXT[stOf(a)]}</span></span><span class="rt"><b>Lv ${a.lv}</b></span></button>`; }
    const a = s.advs.find(x => x.id === openAdv);
    return h + '</div><div class="av-main">' + (a ? advDetail(a) : '<div class="ux-empty">모험가가 없습니다.</div>') + '</div><div class="qtip avtip" id="avTip"></div></div>';
  }
  // 목록 줄 마우스 오버: 지금 이 모험가의 상황 (상태별) + 공통 한 줄
  let avHover = null, avTimer = 0;
  // 2026-11-20 버릇 화면 (사용자 확정: 명부 줄 = 이름 옆 한 글자 · 상세 = 칭호 옆 배지 · 마우스 설명 = 뭉뚱그린 한 줄 · data/quirks.csv 설명 칸)
  const qkOf = a => a && a.quirk ? ((window.GAME_DATA && window.GAME_DATA.quirks) || []).find(q => q.key === a.quirk) || null : null;
  const qkTip = q => `<b class="qk-h">버릇 · ${esc(q.name)}</b>${esc(q.desc || '')}`;
  function advTipHtml(a) {
    const k = stOf(a), w = Math.max(0, a.until - s.week), promo = (s.proposals || []).find(p => p.id === a.id);
    let h = `<div class="t1"><span class="ux-face" style="${faceStyle(a, 36, 190, 18)};width:40px;height:40px"></span><b>${a.name}</b><span class="ux-muted">${a.cls} Lv ${a.lv}</span></div>`;
    h += `<div class="st ${k}">● ${ST_TXT[k]}</div>`;
    { const q = qkOf(a); if (q) h += `<div class="row qk-row">${qkTip(q)}</div>`; }
    if (k === 'quest') {
      const x = s.active.find(e => e.party.includes(a.id));
      if (x) {
        const T = QT[x.q.tid], d = danger(T, x.q.g), mates = x.party.filter(id => id !== a.id).map(id => (s.advs.find(b => b.id === id) || {}).name).filter(Boolean);
        h += `<div class="row"><b>${esc(cleanName(x.q))}</b>${d.n ? `<span class="skulls">${[1, 2, 3].map(n => SKULL(n <= d.n)).join('')}</span>` : ''}</div>`;
        h += `<div class="row ux-muted">${mates.length ? '동료: ' + mates.join(', ') : '혼자 떠남'} · 귀환까지 ${Math.max(1, x.back - s.week)}주</div>`;
      }
    } else if (k === 'injured') h += `<div class="row">회복까지 <b>${w}주</b>${a.injuredFrom ? ` · <span class="ux-muted">${esc(a.injuredFrom)}에서 다침</span>` : ''}</div>`;
    else if (k === 'town') {
      const GW = (s.cfg && s.cfg.growth) || {}, lvReq = GW.gradeLv || [0, 4, 10, 18, 26, 35, 45], achReq = GW.gradeAch || [0, 4, 5, 7, 7, 10, 10], n = a.grade + 1;   // 2026-11-20 balance.csv 승급 조건 (게임 규칙과 같은 값)
      h += `<div class="row">의뢰를 고르는 중</div>`;
      if (n <= 5) h += `<div class="row ux-muted">${GR[n]}급 승급까지: Lv ${Math.min(a.lv, lvReq[n])}/${lvReq[n]} · 업적 ${Math.min(a.ach, achReq[n])}/${achReq[n]}</div>`;
    } else {
      const ago = a.lastSeen != null ? s.week - a.lastSeen : null;
      h += `<div class="row">애착 <b>${ATT_NAME[Gm.attachTier(a)]}</b> <span class="ux-muted">(${Math.round(a.attach)})</span></div>`;
      h += `<div class="row ux-muted">${ago == null ? '아직 길드에 온 기록이 없음' : ago === 0 ? '이번 주에 다녀감' : '마지막 방문 ' + ago + '주 전'}</div>`;
    }
    if (promo) h += `<div class="promo">★ 전직 제안: <b>${promo.opts.join(' / ')}</b></div>`;
    const CB_ = root.GuildCombat ? root.GuildCombat.make(root.GAME_DATA) : null;
    if (CB_ && CB_.ok) { const u = CB_.unit(a, i => Gm.finalStat(s, a, i), Gm.eqOf(a), 0); h += `<div class="foot">${Gm.STATS[a.core]} ${Math.round(Gm.finalStat(s, a, a.core))} · 공격 ${Math.round(u.atk)} · 체력 ${Math.round(u.maxHp)}<span class="gold"><i></i>${fmt(Math.round(a.wallet || 0))}G</span></div>`; }
    return h;
  }
  function advTipBind(b) {
    const show = () => {
      const r = b.querySelector(`.ux-row[data-adv="${avHover}"]`), tip = b.querySelector('#avTip'), a = s.advs.find(x => x.id === avHover);
      if (!r || !tip || !a) { if (tip) tip.classList.remove('on'); return; }
      tip.innerHTML = advTipHtml(a); tip.classList.remove('sktip'); tip.classList.add('on');
      const list = b.querySelector('.av-list'), top = r.offsetTop - list.scrollTop + list.offsetTop;
      tip.style.left = (list.offsetLeft + list.offsetWidth + 4) + 'px';
      tip.style.top = Math.max(0, Math.min(top - 4, b.clientHeight - tip.offsetHeight - 8)) + 'px';
    };
    b.onmouseover = e => {
      const sk = e.target.closest('.sk[data-sk]');   // 장착 스킬 오버: 칸 바로 아래(공간 없으면 위)에 뜸
      if (sk) { clearTimeout(avTimer); avTimer = setTimeout(() => { const a = s.advs.find(x => x.id === openAdv), k = a && a.skills[+sk.dataset.sk], tip = b.querySelector('#avTip'); if (!k || !tip) return;
        avHover = null; tip.innerHTML = skillTipHtml(a, k); tip.classList.add('on', 'sktip'); const br = b.getBoundingClientRect(), r = sk.getBoundingClientRect();
        let top = r.bottom - br.top + 6; if (top + tip.offsetHeight > b.clientHeight - 8) top = r.top - br.top - tip.offsetHeight - 6;
        tip.style.left = Math.min(r.left - br.left, b.clientWidth - tip.offsetWidth - 8) + 'px'; tip.style.top = top + 'px'; }, 200); return; }
      const r = e.target.closest('.ux-row[data-adv]'); if (!r) return; const id = +r.dataset.adv; if (id === avHover) return; clearTimeout(avTimer); avTimer = setTimeout(() => { avHover = id; show(); }, 200); };
    b.onmouseout = e => {
      const sk = e.target.closest('.sk[data-sk]'); if (sk) { if (sk.contains(e.relatedTarget)) return; clearTimeout(avTimer); const t = b.querySelector('#avTip'); if (t) t.classList.remove('on', 'sktip'); return; }
      const r = e.target.closest('.ux-row[data-adv]'); if (!r || r.contains(e.relatedTarget)) return; clearTimeout(avTimer); avHover = null; const t = b.querySelector('#avTip'); if (t) t.classList.remove('on'); };
    if (avHover != null) show();
  }
  // 책: 칭호 버튼 → 누르면 드롭다운 (신입 + 달성한 칭호는 고를 수 있음 · 못 얻은 칭호는 흐리게 조건 표시). 고르면 a.title 저장 (2026-11-13)
  function titleDD(a) {
    const got = sampleTitles(a), on = sampleOn(a);
    const opt = (k, nm, fx) => `<button class="tdo${k === on ? ' on' : ''}" data-tpick="${k}"><b>${nm}</b><em>${fx}</em></button>`;
    const q = qkOf(a);
    return `<div class="av-ttl"><button class="av-tbtn" data-tsel="1" title="칭호 바꾸기"><span>${ttlName(on)}</span><i>▾</i></button>${q ? `<span class="qkb">${esc(q.name)}<i class="tip">${qkTip(q)}</i></span>` : ''}<div class="av-tdd">`
      + opt(-1, '신입', '기본 칭호 · 효과 없음') + got.map(k => opt(k, TITLE_CAT[k][0], TITLE_CAT[k][2])).join('')
      + `<div class="tdh">아직 못 얻은 칭호</div>` + TITLE_CAT.map((_, k) => k).filter(k => !got.includes(k)).map(k => `<div class="tdo lock"><b>${TITLE_CAT[k][0]}</b><em>${TITLE_CAT[k][1]}</em></div>`).join('') + '</div></div>';
  }
  function advCareerPage(a) {   // 책: 오른쪽 책갈피 "경력" — 선택한 모험가의 경력 전체
    return `<div class="av-career"><div class="av-ch"><div class="ux-portrait xs"><i style="${faceStyle(a, 56, 140, 32)}"></i></div><div><b>${a.name}</b><span>${STAGE[a.stage]} ${a.cls}</span></div><em>의뢰 성공 <b>${a.done}</b>회</em></div><ul class="career">${a.career.slice().reverse().map(c => `<li${c.pal ? ' class="pal"' : ''}><span class="w">${Gm.dateLabel(c.week)}</span>${c.pal ? '<span>' + c.text.replace('♥', '<b class="ht">♥</b>') + '</span>' : c.text}</li>`).join('') || '<li class="none">아직 기록이 없습니다.</li>'}</ul></div>`;
  }
  function advDetail(a) {
    if (document.getElementById('pop').classList.contains('book') && advView === 'career') return advCareerPage(a);
    if (document.getElementById('pop').classList.contains('book') && advView === 'contract') return contractPage(a);
    const G = s.cfg.growth, cap = Gm.lvCapOf(s, a), need = G.lvA * Math.pow(a.lv, G.lvB), xp = a.lv >= cap ? 100 : Math.min(100, a.xp / need * 100);
    const path = a.cls1 === a.cls ? a.cls : `${a.cls1} → ${a.cls}`;
    const BK = document.getElementById('pop').classList.contains('book');   // 책 펼침판: 애착·다음 장비 빼고 막대 안에 수치
    // 머리
    let h = `${BK ? `<div class="av-sealw" aria-hidden="true"><div class="av-seal"><b>${GR[a.grade]}</b></div></div>` : ''}<div class="av-head">${BK ? '<div class="pcol">' : ''}<div class="ux-portrait sm"><i style="${faceStyle(a, 104, 260, 60)}"></i>${buffIco(a, 2)}</div>${BK ? `<b class="plv">Lv ${a.lv}</b></div>` : ''}<div class="who">${document.getElementById('pop').classList.contains('book') ? titleDD(a) : ''}
      <div class="nm"><span class="anm">${a.name}</span> <i class="ux-grade" style="background-image:url(assets/ui/hud/badge_${GR[a.grade]}.png)"></i><span class="cls">${STAGE[a.stage]} ${path}</span><i class="br"></i>${stTag(a)}${BK ? `<i class="br br2"></i><span class="av-trt"><span><em>모험심</em>${Gm.RISK[a.risk]}<i class="tip">${TRAIT_TXT.risk[a.risk]}</i></span><span><em>소비</em>${Gm.SPEND[a.spend]}<i class="tip">${TRAIT_TXT.spend[a.spend]}</i></span><span><em>사교</em>${Gm.SOCIAL[a.social]}<i class="tip">${TRAIT_TXT.social[a.social]}</i></span></span>` : ''}${(() => { const AT = [0, 30, 60, 90, 100], t = Gm.attachTier(a), lo = AT[t], hi = AT[t + 1] || 100, pct = t >= 3 ? 100 : Math.min(100, (a.attach - lo) / (hi - lo) * 100); return `<span class="av-att" title="애착 ${ATT_NAME[t]} (${Math.round(a.attach)})"><span class="att-a">♥ ${Math.round(a.attach)}</span><span class="att-b"><em>${['방랑자', '새내기', '동반자', '토박이'][t]}</em><i class="trk"><i style="width:${pct}%"></i></i></span></span>`; })()}<span class="gold av-wal" title="모험가 소지금 (식사·물약·장비 구매에 씀)"><em class="wl">소지금</em><i></i>${fmt(Math.round(a.wallet || 0))}G</span></div>
      ${(() => { const CBH = root.GuildCombat ? root.GuildCombat.make(root.GAME_DATA) : null; if (!(CBH && CBH.ok)) return ''; const u = CBH.unit(a, i => Gm.finalStat(s, a, i), Gm.eqOf(a), 0); const hp = Math.round(u.maxHp), mp = Math.round(u.maxMp); const iw = a.state === 'injured' ? Math.max(0, a.until - s.week) : 0, itot = Math.max(iw, a.injuredAt != null ? a.until - a.injuredAt : iw + 1), ipc = iw ? Math.max(8, Math.round((itot - iw) / Math.max(1, itot) * 100)) : 100;   // 부상 표시 (2026-11-16 결정 · 11-17 구현): 부상이면 체력 막대를 회복한 만큼만 채우고 '부상 N주'
      if (BK) return `<div class="hm"><div class="vb hp${iw ? ' inj' : ''}"><span class="k">체력</span><i class="trk"><i${iw ? ` style="width:${ipc}%"` : ''}></i><em class="bv">${iw ? `부상 ${iw}주` : `${fmt(hp)}/${fmt(hp)}`}</em></i></div><div class="vb mp"><span class="k">마력</span><i class="trk"><i></i><em class="bv">${fmt(mp)}/${fmt(mp)}</em></i></div><div class="vb ex"><span class="k">경험치</span><i class="trk"><i style="width:${xp}%"></i><em class="bv">${a.lv >= cap ? '상한' : fmt(Math.floor(a.xp)) + '/' + fmt(Math.round(need))}</em></i></div></div>`; return `<div class="hm"><div class="vb hp"><span class="k">체력</span><i class="trk"><i></i></i><b>${hp}</b></div><div class="vb mp"><span class="k">마력</span><i class="trk"><i></i></i><b>${mp}</b></div></div>`; })()}
      ${BK ? '' : `<div class="lv"><b>Lv ${a.lv}</b><div class="ux-bar blue"><i style="width:${xp}%"></i></div><span>${a.lv >= cap ? '레벨 상한' : '다음 레벨까지 ' + fmt(need - a.xp)}</span></div>`}</div></div>`;
    h += contractBox(a);   // 2026-11-17 V2: 계약 모험가면 조건 상자
    // 장비
    const CB_ = root.GuildCombat ? root.GuildCombat.make(root.GAME_DATA) : null, GE = s.cfg.gear;
    const slots = CB_ ? [['무기', CB_.WEAPON[a.core]], ['방어구', CB_.ARMOR[a.core]], ['장신구', CB_.ACC[(a.core + 2) % 5]]] : [];
    // 다음 장비까지: 구매 조건 = 세트 가격 × (1 + 소비 성향 여유분 × 0.5) 이상 모이면 삼 (game_core 장비 구매와 같은 식)
    const nxq = Gm.eqNext(s, a), ng = nxq ? nxq.g : -1, EQ = Gm.eqOf(a);   // 2026-11-18 대장간: 장비 3칸, 다음 1칸
    let nx;
    if (!nxq) nx = `<span class="av-next max">길드 등급 상한</span>`;
    else { const price = nxq.price, need = Math.round(price * (1 + GE.reserveMult[a.spend] * 0.5)), have = Math.round(a.wallet || 0), nm0 = nxq.k < 0 ? '장비 세트' : Gm.EQ_NAME[nxq.k];
      nx = `<span class="av-next" title="${GR[ng]}급 ${nm0} ${fmt(price)}G · ${Gm.SPEND[a.spend]} 성향이라 ${fmt(need)}G가 모이면 삼"><em>다음 ${nm0}(${GR[ng]}급)</em><span class="ux-bar"><i style="width:${Math.min(100, have / need * 100)}%"></i></span><b>${fmt(Math.min(have, need))}/${fmt(need)}G</b></span>`; }
    let eq = '<div class="av-eq"><div class="ux-h">장비' + (BK ? '' : nx) + '</div><div class="eqgrid">';
    for (const [si, [nm, type]] of slots.entries()) {
      const gg = EQ[si], it = gg >= 0 ? gearItem(type, gg) : null;
      const tip = it ? `${nm} · ${it.name}\n${[it.atk && '공격 ' + it.atk, it.def && '방어 ' + it.def, it.mdef && '마방 ' + it.mdef, it.hp && '체력 ' + it.hp, it.mp && '마력 ' + it.mp].filter(Boolean).join(' · ')}` : nm + ': 없음';
      eq += it ? `<span class="ux-slot" data-g="${gg}" data-gt="${it.id}"><img src="assets/${it.icon}" alt="">${enhBadge(((a.enh || {})[type]) || 0)}</span>` : `<span class="ux-slot empty" data-ph="${nm}" title="${tip}"></span>`;
    }
    // 물약 3칸: 가진 수만큼 채움, 소비 성향으로 못 드는 칸은 잠금 (절약 1 · 보통 2 · 낭비 3)
    const carry = (CB_ && CB_.C.potionCarry[a.spend]) || 3, pg = Math.min(1, s.grade), pot = ITEMS_.find(i => i.id === (pg ? 'pot_03' : 'pot_01'));
    eq += '</div><div class="ux-h" style="margin-top:12px">물약' + (BK ? '' : ' <small>최대 ' + carry + '개 (' + Gm.SPEND[a.spend] + ')</small>') + '</div><div class="potgrid">';
    for (let k = 0; k < 3; k++) eq += k < (a.pots || 0) ? `<span class="ux-slot pot" data-g="${pg}"${pot ? ` data-pt="${pot.id}"` : ''}><img src="assets/${pot ? pot.icon : ''}" alt=""></span>` : k < carry ? '<span class="ux-slot pot empty" data-ph=""></span>' : '<span class="ux-slot pot locked" title="소비 성향 때문에 들고 다니지 않음"></span>';
    eq += '</div></div>';
    // 능력치: 10칸 × 10점 (상한 100). 칸 안은 아래에서부터 차오름. 주 능력치 = 주황, 장비 보너스 = 초록
    const anim = advAnimFor !== a.id; advAnimFor = a.id;
    let st = `<div class="av-st${anim ? ' anim' : ''}"><div class="ux-h">능력치</div>`;
    for (let i = 0; i < 5; i++) {
      const base = Math.min(s.cfg.growth.statCap, a.stats[i]), fin = Math.min(100, Gm.finalStat(s, a, i)), plus = fin - base, core = (a.line || [a.core]).includes(i);
      let cells = '';
      for (let c = 0; c < 10; c++) {
        const lo = c * 10, fb = Math.max(0, Math.min(10, base - lo)) * 10, ft = Math.max(0, Math.min(10, fin - lo)) * 10;   // 이 칸의 바탕·장비 포함 채움(%)
        cells += `<span class="cell" style="--i:${c};--r:${i}">${ft > fb ? `<i class="bn" style="--t:${100 - ft}%;--b:${fb}%"></i>` : ''}${fb > 0 ? `<i class="${core ? 'cr' : 'gd'}" style="--t:${100 - fb}%"></i>` : ''}</span>`;
      }
      if (BK) cells = `<span class="ibar"><i class="f" style="width:${base}%;--w:${Math.max(1, base)}"></i>${plus > 0 ? `<i class="p" style="left:${base}%;width:${plus}%"></i>` : ''}</span>`;   // 책: 물감 번짐 막대 (색은 능력치 100 기준으로 진해짐)
      st += `<div class="srow ${core ? 'core' : ''}"><span class="k">${Gm.STATS[i]}</span><span class="cells">${cells}</span><span class="v">${Math.round(base)}${plus > 0 ? `<span class="ux-plus"> +${Math.round(plus)}</span>` : ''}</span></div>`;
    }
    // 전투 수치 4개 (세부는 마우스 오버)
    if (CB_ && CB_.ok) {
      const u = CB_.unit(a, i => Gm.finalStat(s, a, i), Gm.eqOf(a), 0);
      const more = `치명타 ${Math.round(u.crit * 1000) / 10}% · 공격 속도 +${Math.round((u.speed - 1) * 1000) / 10}% · 방어 ${Math.round(u.def)} · ${['앞줄', '가운데', '뒷줄'][u.row]}`;
      st += `<div class="cbs" title="${more}"><span>공격 <b>${Math.round(u.atk)}</b></span><span>방어 <b>${Math.round(u.def)}</b></span></div>`;
    }
    st += '</div>';
    h += `<div class="av-body">${eq}${st}</div>`;
    if (BK) {   // 책: 탭·쪽지 없이 장비처럼 "스킬" 칸 한 줄 (성향 = 머리 칸, 전직·경력 = 오른쪽 책갈피, 칭호 = 머리 버튼)
      let sl = '';
      for (let i = 0; i < 5; i++) { const k = a.skills[i];
        if (!k) { sl += '<span class="sk empty"><span class="ux-slot skslot empty" data-ph=""></span><em>빈 칸</em></span>'; continue; }
        sl += `<span class="sk" data-sk="${i}"><span class="ux-slot skslot" data-line="${k.line}"><img src="assets/icons/${skillIcon(k)}" alt=""></span><em>${skillName(k).name}</em></span>`; }
      advFlip = false;
      return h + `<div class="av-sk"><div class="ux-h">스킬 <small>${a.skills.length} / 5</small></div><div class="skrow">${sl}</div></div>`;
    }
    // 아래 탭: 스킬(기본) · 전직 · 성향 · 경력. 항상 하나가 펼쳐져 있음
    const BOOKP = document.getElementById('pop').classList.contains('book');
    const TABS = BOOKP ? [['skill', '스킬'], ['career', '경력']] : [['skill', '스킬'], ['path', '전직'], ['trait', '성향'], ['career', '경력']];   // 책: 성향은 머리 성향 칸(마우스 올리면 설명)으로 옮겨 쪽지에서 뺌
    if ((advTab === 'title' && !BOOKP) || (BOOKP && ['trait', 'path', 'title'].includes(advTab))) advTab = 'skill';   // 책: 성향 = 머리 칸, 전직 = 오른쪽 책갈피, 칭호 = 머리 버튼
    h += `<div class="av-tabs"><div class="ux-tabs">${TABS.map(([k, n]) => `<button data-atab="${k}" class="${advTab === k ? 'on' : ''}">${n}</button>`).join('')}</div>`;
    if (advTab === 'skill') {
      let sl = '';
      for (let i = 0; i < 5; i++) {
        const k = a.skills[i];
        if (!k) { sl += '<span class="sk empty"><span class="ux-slot skslot empty" data-ph=""></span><em>빈 칸</em></span>'; continue; }
        const n = skillName(k);
        sl += `<span class="sk" data-sk="${i}"><span class="ux-slot skslot" data-line="${k.line}"><img src="assets/icons/${skillIcon(k)}" alt=""></span><em>${n.name}</em></span>`;
      }
      h += `<div class="av-tb${advFlip ? ' flip' : ''}"><div class="ux-h">장착 스킬 <small>${a.skills.length} / 5</small></div><div class="skrow">${sl}</div></div>`;
    }
    else if (advTab === 'path') h += `<div class="av-tb${advFlip ? ' flip' : ''}"><div class="ux-h">전직의 길</div>${pathHtml(a)}</div>`;
    else if (advTab === 'trait') {
      const C = (CB_ && CB_.C) || {}, AT = [0, 30, 60, 90, 100], tier = Gm.attachTier(a), lo = AT[tier], hi = AT[tier + 1];
      // 수치는 내부 규칙에만 두고 화면에는 행동 문장으로 보여 줌 (위험 → '모험심'으로 표시). 말투는 모험심·사교에서 정해지므로 뺌
      const TXT = TRAIT_TXT;
      const ATT_TXT = ['아직 길드에 마음을 두지 않았습니다. 언제든 떠날 수 있습니다.', '길드에 정이 들기 시작했습니다.', '길드를 믿고 오래 머무르려 합니다.', '이 마을과 길드를 자기 집처럼 여깁니다.'];
      const row = (k, v, txt) => `<div class="trow"><span class="tk">${k}</span><span class="ux-tag">${v}</span><span class="fx">${txt}</span></div>`;
      h += `<div class="av-tb av-trait${advFlip ? ' flip' : ''}">
        <div class="tatt"><span class="tk">애착</span><span class="ux-tag gold">${ATT_NAME[tier]}</span>${tier < 3 ? `<span class="ux-bar att"><i style="width:${Math.min(100, (a.attach - lo) / (hi - lo) * 100)}%"></i></span><span class="num">${Math.round(a.attach)} / ${hi}</span><span class="ux-muted">다음 단계 ${ATT_NAME[tier + 1]}</span>` : `<span class="num">${Math.round(a.attach)}</span>`}</div>
        <div class="tatt-txt">${ATT_TXT[tier]}</div>
        ${BOOKP ? (() => { const c = sampleCond(a), FP = [a.hunger || 0, a.hunger || 0, a.hunger || 0], TP = [a.fatigue || 0, a.fatigue || 0, a.fatigue || 0]; return `<div class="tcond"><span class="tk">배고픔</span><i class="ci">${ICON.meat}</i><span class="ux-tag">${FOOD_N[c.food]}</span><span class="ux-bar food"><i style="width:${FP[c.food]}%"></i></span><span class="tk">피로</span><i class="ci">${ICON.moon}</i><span class="ux-tag">${TIRED_N[c.tired]}</span><span class="ux-bar tired"><i style="width:${TP[c.tired]}%"></i></span></div>`; })() : ''}
        ${row('모험심', Gm.RISK[a.risk], TXT.risk[a.risk])}${row('소비', Gm.SPEND[a.spend], TXT.spend[a.spend])}${row('사교', Gm.SOCIAL[a.social], TXT.social[a.social])}</div>`;
    }
    else if (advTab === 'title') {
      const got = sampleTitles(a), on = sampleOn(a);
      const chip = (k, have) => `<span class="tchip${k === on ? ' on' : ''}${have ? '' : ' lock'}" title="${TITLE_CAT[k][1]}"><b>${TITLE_CAT[k][0]}</b><em>${TITLE_CAT[k][2]}</em></span>`;
      h += `<div class="av-tb av-title${advFlip ? ' flip' : ''}"><div class="tnow"><span class="tk">지금 칭호</span>${on >= 0 ? `<b>「${TITLE_CAT[on][0]}」</b><span class="ux-plus">${TITLE_CAT[on][2]}</span><span class="ux-muted">${TITLE_CAT[on][1]}</span>` : '<b>「신입」</b><span class="ux-muted">기본 칭호 · 효과 없음</span>'}</div>
        <div class="ux-h">달성한 칭호 <small>칭호 규칙은 준비 중</small></div><div class="tchips"><span class="tchip${on < 0 ? ' on' : ''}" title="처음부터 (기본 칭호)"><b>신입</b><em>효과 없음</em></span>${got.map(k => chip(k, true)).join('')}</div>
        <div class="ux-h">아직 못 얻은 칭호</div><div class="tchips">${TITLE_CAT.map((_, k) => k).filter(k => !got.includes(k)).map(k => chip(k, false)).join('')}</div></div>`;
    }
    else if (advTab === 'career') h += `<div class="av-tb${advFlip ? ' flip' : ''}"><div class="ux-h">경력 <small>의뢰 성공 ${a.done}회</small></div><ul class="career">${a.career.slice().reverse().map(c => `<li${c.pal ? ' class="pal"' : ''}><span class="w">${Gm.dateLabel(c.week)}</span>${c.pal ? '<span>' + c.text.replace('♥', '<b class="ht">♥</b>') + '</span>' : c.text}</li>`).join('')}</ul></div>`;
    advFlip = false;
    return h + '</div>';
  }
  function pathHtml(a) { // 발견한 직업에 대해 이 모험가의 조건 달성도 (능력치 막대와 같은 10칸 칸으로)
    const disc = s.discovered || {}, rows = [];
    const list = a.stage === 1 ? Gm.CLASS2 : a.stage === 2 && !a.fin ? Gm.CLASS3.filter(c => c.from === a.cls) : [];
    for (const c of list) {
      if (!disc[c.name]) continue;
      const ks = Object.keys(c.req), ok = ks.every(k => a.stats[k] >= c.req[k]);
      const bars = ks.map(k => {
        const v = Math.min(100, a.stats[k]), r = c.req[k]; let cells = '';
        for (let i = 0; i < 10; i++) { const f = Math.max(0, Math.min(10, v - i * 10)) * 10; cells += `<span class="cell">${f > 0 ? `<i class="${+k === a.core ? 'cr' : 'gd'}" style="--t:${100 - f}%"></i>` : ''}</span>`; }
        return `<div class="srow"><span class="k">${Gm.STATS[k]}</span><span class="cells">${cells}<i class="goal" style="left:${r / 10 * 13 - 1}px" title="필요 ${r}"></i></span><span class="v ${v >= r ? 'ok' : ''}">${Math.floor(a.stats[k])} / ${r}</span></div>`;
      }).join('');
      rows.push(`<div class="pcls"><div class="pn"><b>${c.name}</b>${ok ? '<span class="ux-tag town">조건 충족</span>' : ''}${c.town ? `<span class="ux-muted">${c.town}</span>` : ''}</div>${bars}</div>`);
    }
    return `<div class="av-path">${rows.join('') || '<p class="muted">아직 발견한 직업이 없습니다. 모험가가 조건을 채우면 길이 드러납니다.</p>'}</div>` + (a.stage === 1 && !s.built['관리소'] ? '<p class="muted small">2차 전직을 하려면 모험가 관리소(E급 시설)가 필요합니다.</p>' : '');
  }

  // ---------- 전직 제안 (M3-3) ----------
  // 전직 제안 (docs/design/popup_promo.md): 왼쪽 = 제안 받은 모험가 목록 / 오른쪽 = 머리(초상화·애착·수락 확률) · 능력치 10칸 · 선택지 카드 · 보류
  let promoSel = null;
  const ro = n => { const c = n.charCodeAt(n.length - 1) - 0xAC00, j = c % 28; return n + (c >= 0 && c <= 11171 && j && j !== 8 ? '으로' : '로'); };   // ㄹ 받침·받침 없음 → 로
  const cells10 = (v, cls, extra) => { let h = ''; for (let i = 0; i < 10; i++) { const f = Math.max(0, Math.min(10, v - i * 10)) * 10; h += `<span class="cell">${f > 0 ? `<i class="${cls}" style="--t:${100 - f}%"></i>` : ''}</span>`; } return `<span class="cells">${h}${extra || ''}</span>`; };
  function promoHtml() {
    const ps = (s.proposals || []).filter(p => s.advs.some(a => a.id === p.id));
    if (!ps.length) return '<div class="ux-empty pm-none">지금은 전직 제안이 없습니다. 모험가가 조건을 채우면 리나가 매달 초에 알려 드려요.</div>';
    if (!ps.some(p => p.id === promoSel)) promoSel = ps[0].id;
    const list = ps.map(p => { const a = s.advs.find(x => x.id === p.id);
      return `<button class="ux-row promo ${p.id === promoSel ? 'on' : ''}" data-psel="${a.id}"><span class="ux-face" style="${faceStyle(a, 44, 230, 22)}"><i class="star">★</i></span><span><span class="nm">${a.name}</span><span class="sub">${a.cls} · ${p.to}차 제안</span></span><span class="rt"><b>Lv ${a.lv}</b></span></button>`; }).join('');
    const p = ps.find(x => x.id === promoSel), a = s.advs.find(x => x.id === p.id);
    const tier = Gm.attachTier(a), chance = Math.min(1, [0.40, 0.65, 0.90, 1.00][tier] * (p.to === 2 ? 1.2 : 0.9) + (Gm.upg(s, '관리소') ? (s.cfg.promo.upAccept || 0.1) : 0));   // game_core decidePromotion 과 같은 식
    // 머리
    let h = `<div class="pm-top"><div class="pm-head"><div class="ux-portrait sm"><i style="${faceStyle(a, 104, 260, 60)}"></i>${buffIco(a, 2)}</div><div class="who">
      <div class="nm">${a.name} ${badge(a.grade)}<span class="cls">${STAGE[a.stage]} ${a.cls} · Lv ${a.lv}</span><span class="ux-tag town">${p.to}차 전직 제안</span></div>
      <div class="pm-bar"><em>애착</em><div class="ux-bar"><i style="width:${Math.min(100, a.attach)}%"></i></div><span><b>${Math.round(a.attach)}</b> ${ATT_NAME[tier]}</span></div>
      <div class="pm-bar"><em>수락 확률</em><div class="ux-bar blue"><i style="width:${chance * 100}%"></i></div><span><b>약 ${Math.round(chance * 100)}%</b></span></div></div></div>`;
    // 능력치 10칸 (모험가 팝업과 같은 칸)
    h += `<div class="pm-st"><div class="ux-h">능력치</div>` + [0, 1, 2, 3, 4].map(i => { const core = (a.line || [a.core]).includes(i), v = Math.min(100, a.stats[i]);
      return `<div class="srow ${core ? 'core' : ''}"><span class="k">${Gm.STATS[i]}</span>${cells10(v, core ? 'cr' : 'gd')}<span class="v">${Math.floor(a.stats[i])}</span></div>`; }).join('') + '</div></div>';
    // 선택지 카드
    const g0 = Gm.growthOf(a);
    const cards = p.opts.map(n => {
      const c = Gm.CLASS2.find(x => x.name === n) || Gm.CLASS3.find(x => x.name === n); if (!c) return '';
      const g1 = Gm.growthOf(Object.assign({}, a, { stage: p.to, line: c.line, fin: !!c.fin })), can = Object.keys(c.req).every(k => a.stats[k] >= c.req[k]);   // 정상 제안은 늘 조건 충족. 예전 저장·디버그 대비
      const req = Object.keys(c.req).map(k => { const r = c.req[k], v = a.stats[k], ok = v >= r;
        return `<div class="srow"><span class="k">${Gm.STATS[k]}</span>${cells10(Math.min(100, v), +k === a.core ? 'cr' : 'gd', `<i class="goal" style="left:${r / 10 * 12 - 1}px" title="필요 ${r}"></i>`)}<span class="v ${ok ? 'ok' : 'no'}">${ok ? '✓' : '✕'} ${Math.floor(v)}/${r}</span></div>`; }).join('');
      const grow = [0, 1, 2, 3, 4].map(i => { const d = g1[i] - g0[i], cl = d > 0.001 ? 'up' : d < -0.001 ? 'dn' : '';
        return `<div class="gr ${cl}"><span class="k">${Gm.STATS[i]}</span><span class="b0">${g0[i].toFixed(1)}</span><span class="ar">${cl === 'up' ? '▲' : cl === 'dn' ? '▼' : '→'}</span><b>${g1[i].toFixed(1)}</b></div>`; }).join('');
      const evo = a.skills.filter(k => c.line.includes(k.line)).map(k => { const k1 = { line: k.line, form: n };
        return `<div class="evo"><img src="assets/icons/${skillIcon(k)}" alt=""><span>${skillName(k).name}</span><i>→</i><img src="assets/icons/${skillIcon(k1)}" alt=""><b>${skillName(k1).name}</b></div>`; }).join('') || '<div class="ux-muted evo none">없음 (바탕 능력치가 이 직업 조건에 없음)</div>';
      return `<div class="pm-card ${can ? '' : 'off'}"><div class="ct"><b>${n}</b><span class="ux-tag">${c.fin ? '2차 종결 · Lv 상한 50' : p.to === 2 ? '3차로 이어짐 · Lv 상한 40' : '3차'}</span></div>
        <div class="sec">조건</div><div class="reqs">${req}</div>
        <div class="sec">레벨업 성장 <small>(레벨마다 오르는 양)</small></div><div class="grs">${grow}</div>
        <div class="sec">스킬 진화</div>${evo}
        ${can ? `<button class="ux-btn primary pm-go" data-promo="${a.id}" data-cls="${n}">${ro(n)} 전직 승인</button>` : '<button class="ux-btn pm-go off" disabled>조건 부족 · 전직 불가</button>'}</div>`; }).join('');
    h += `<div class="pm-cards">${cards}</div><div class="pm-foot"><button class="ux-btn" data-hold="${a.id}">보류</button><span class="ux-muted">보류하거나 모험가가 거절해도 벌칙은 없고, 3개월 뒤 다시 제안합니다.</span></div>`;
    return `<div class="pm"><div class="pm-side"><div class="ux-h">제안 <small>${ps.length}명</small></div><div class="pm-list">${list}</div></div><div class="pm-main">${h}</div></div>`;
  }
  // ---------- 책: 전직 제안 장 (2026-11-13) ----------
  // 제안이 있으면 왼쪽 위 = 제안 목록, 오른쪽 = 직업 선택 카드 / 고른 모험가에게 제안이 없으면 오른쪽 = 전직의 길 (직업별 조건 달성도)
  // 달성도 = 직업 조건 능력치마다 min(1, 지금 / 필요)의 평균. 아직 발견하지 못한 직업은 이름을 ??? 로 가림 (조건 막대는 보임)
  const bpCands = a => a.stage === 1 ? Gm.CLASS2 : a.stage === 2 && !a.fin ? Gm.CLASS3.filter(c => c.from === a.cls) : [];
  const bpProg = (a, c) => { const ks = Object.keys(c.req); return ks.reduce((t, k) => t + Math.min(1, a.stats[k] / c.req[k]), 0) / ks.length; };
  const bpBar = (a, k, r) => { const v = Math.min(100, a.stats[k]), ok = a.stats[k] >= r;
    return `<div class="pq"><span class="k">${Gm.STATS[k]}</span><span class="ibar"><i class="f${+k === a.core ? ' cr' : ''}" style="width:${v}%;--w:${Math.max(1, v)}"></i><i class="goal" style="left:${r}%"></i></span><span class="v ${ok ? 'ok' : ''}">${Math.floor(a.stats[k])}<small>/${r}</small></span></div>`; };
  function promoBookHtml() {
    const disc = s.discovered || {}, ps = (s.proposals || []).filter(p => s.advs.some(a => a.id === p.id && a.alive));
    const alive = s.advs.filter(a => a.alive);
    if (promoSel == null || !alive.some(a => a.id === promoSel)) promoSel = ps.length ? ps[0].id : (alive[0] && alive[0].id);
    const best = a => { let b = null; for (const c of bpCands(a)) { const g = bpProg(a, c); if (!b || g > b.g) b = { c, g }; } return b; };
    const row = (a, sub, extra, cls) => `<button class="ux-row ${cls || ''} ${a.id === promoSel ? 'on' : ''}" data-psel="${a.id}"><span class="ux-face" style="${faceStyle(a, 44, 230, 22)}">${cls === 'promo' ? '<i class="star">★</i>' : ''}</span><span><span class="nm">${a.name}</span><span class="sub">${sub}</span></span>${extra || ''}<span class="rt"><b>Lv ${a.lv}</b></span></button>`;
    let L = '';
    if (ps.length) L += `<div class="ux-h">전직 제안 <small>${ps.length}명</small></div><div class="av-list st-d pm-l">` + ps.map(p => { const a = s.advs.find(x => x.id === p.id); return row(a, `${a.cls} · ${p.to}차 제안 (${p.opts.join(' · ')})`, '', 'promo'); }).join('') + '</div>';
    const rest = alive.filter(a => !ps.some(p => p.id === a.id)).map(a => ({ a, b: best(a) })).sort((x, y) => (y.b ? y.b.g : -1) - (x.b ? x.b.g : -1));
    L += `<div class="ux-h">전직의 길 <small>가장 가까운 직업</small></div><div class="av-list st-d pm-l">` + rest.map(({ a, b }) => {
      if (!b) return row(a, `${a.cls} · 전직 완료`, '<span class="pg done">완료</span>');
      const nm = disc[b.c.name] ? b.c.name : '???', pc = Math.round(b.g * 100);
      return row(a, `${a.cls} → ${nm}`, `<span class="pg"><span class="ibar"><i class="f" style="width:${pc}%;--w:${Math.max(1, pc)}"></i></span><b>${pc}%</b></span>`); }).join('') + '</div>';
    const a = s.advs.find(x => x.id === promoSel); if (!a) return `<div class="bk2 bk-av bk-pm"><section class="bk-l">${L}</section><section class="bk-r"></section></div>`;
    const p = ps.find(x => x.id === a.id), tier = Gm.attachTier(a);
    let Rr = `<div class="pm-hd"><div class="ux-portrait xs"><i style="${faceStyle(a, 56, 140, 32)}"></i></div><div><b>${a.name}</b><span>${STAGE[a.stage]} ${a.cls} · Lv ${a.lv}</span></div>`;
    if (p) {
      const chance = Math.min(1, [0.40, 0.65, 0.90, 1.00][tier] * (p.to === 2 ? 1.2 : 0.9) + (Gm.upg(s, '관리소') ? (s.cfg.promo.upAccept || 0.1) : 0));   // game_core decidePromotion 과 같은 식
      Rr += `<div class="pm-ch"><em>수락 확률</em><b>${Math.round(chance * 100)}%</b><small>애착 ${ATT_NAME[tier]}</small></div></div><div class="ux-h">${p.to}차 전직 · 직업 고르기</div><div class="pm-cards">`;
      const g0 = Gm.growthOf(a);
      for (const n of p.opts) { const c = Gm.CLASS2.find(x => x.name === n) || Gm.CLASS3.find(x => x.name === n); if (!c) continue;
        const g1 = Gm.growthOf(Object.assign({}, a, { stage: p.to, line: c.line, fin: !!c.fin }));
        const grow = [0, 1, 2, 3, 4].filter(i => Math.abs(g1[i] - g0[i]) > 0.001).map(i => `<span class="${g1[i] > g0[i] ? 'up' : 'dn'}">${Gm.STATS[i]} ${g1[i] > g0[i] ? '▲' : '▼'}${g1[i].toFixed(1)}</span>`).join('');
        const evo = a.skills.filter(k => c.line.includes(k.line)).map(k => `<span class="ev"><img src="assets/icons/${skillIcon(k)}" alt=""><i>→</i><img src="assets/icons/${skillIcon({ line: k.line, form: n })}" alt="">${skillName({ line: k.line, form: n }).name}</span>`).join('') || '<span class="ux-muted">진화하는 스킬 없음</span>';
        Rr += `<div class="pm-cd"><div class="ct"><b>${n}</b><small>${c.fin ? '2차 종결 · Lv 상한 50' : p.to === 2 ? '3차로 이어짐 · Lv 상한 40' : '3차'}</small></div>
          <div class="rq">${Object.keys(c.req).map(k => bpBar(a, k, c.req[k])).join('')}</div>
          <div class="gw"><em>레벨업 성장</em>${grow || '<span class="ux-muted">변화 없음</span>'}</div><div class="sv"><em>스킬 진화</em>${evo}</div>
          <button class="ux-btn primary pm-go" data-promo="${a.id}" data-cls="${n}">${ro(n)} 전직 승인</button></div>`; }
      Rr += `</div><div class="pm-ft"><button class="ux-btn" data-hold="${a.id}">보류</button><span>보류하거나 거절해도 벌칙은 없고, 3개월 뒤 다시 제안합니다.</span></div>`;
    } else {
      const cs = bpCands(a).map(c => ({ c, g: bpProg(a, c) })).sort((x, y) => y.g - x.g);
      Rr += `<div class="pm-ch"><em>${cs.length ? '가장 가까운 직업' : ''}</em><b>${cs.length ? (disc[cs[0].c.name] ? cs[0].c.name : '???') : '전직 완료'}</b>${cs.length ? `<small>${Math.round(cs[0].g * 100)}%</small>` : ''}</div></div>`;
      Rr += `<div class="ux-h">전직의 길 <small>${a.stage === 1 ? '2차 직업 ' + cs.length + '가지' : a.stage === 2 && !a.fin ? '3차 심화' : ''}</small></div>`;
      Rr += cs.length ? '<div class="pm-path">' + cs.map(({ c, g }) => { const ok = g >= 0.999, kn = disc[c.name];
        return `<div class="pp ${ok ? 'ok' : ''} ${kn ? '' : 'unk'}"><div class="pn"><b>${kn ? c.name : '???'}</b>${ok ? '<span class="ux-tag town">조건 충족</span>' : `<small>${Math.round(g * 100)}%</small>`}${c.town ? `<small class="tw">${c.town}</small>` : c.fin ? '<small class="tw">2차 종결</small>' : ''}</div>${Object.keys(c.req).map(k => bpBar(a, k, c.req[k])).join('')}</div>`; }).join('') + '</div>'
        : '<div class="ux-empty">더 이상 오를 전직이 없습니다.</div>';
    }
    return `<div class="bk2 bk-av bk-pm"><section class="bk-l">${L}</section><section class="bk-r pm-r">${Rr}</section></div>`;
  }
  function decide(id, cls) {
    const a = s.advs.find(x => x.id === id), r = Gm.decidePromotion(s, id, cls);
    if (!r || !a) return;
    if (r.held) UI.say(UI.lines('promo_held', { name: a.name }));
    else if (r.accepted) { UI.say(UI.lines('promo_accepted', { name: a.name, cls: a.cls })); hooks.promoted && hooks.promoted(a); }
    else UI.say(UI.lines('promo_declined', { name: a.name }));
    hooks.changed();
  }

  const FACS = ['관리소', '집무실', '훈련장', '창고', '추모실', '정보실', '의무실', '도서관', '해체장', '휴게실', '명예의 전당'];
  const FACNAME = { 관리소: '모험가 관리소', 집무실: '길드 마스터 집무실' };
  // 시설 팝업: [등급] | [이름] | [효과] | [운영 또는 금액]. 유지비 없음(2026-11-05). 효과가 아직 없는 시설은 예정 효과를 흐리게 + "준비 중"(짓기 막음)
  const FAC_FX = {
    게시판: '의뢰가 붙는 곳. 18칸, 붙은 의뢰는 4주가 지나면 사라집니다.',   // 2026-11-12: 칸 고정 18·기한 4주로 문구 수정 접수대: '모험가가 의뢰를 받아 가고 결과를 보고합니다.',
    주점: '출발 전 식사로 능력치가 오르고, 식사 수입이 들어옵니다.', 판매창구: '의뢰에서 얻은 소재를 되팔아 수입을 얻습니다.',
    관리소: '2차 전직을 할 수 있게 됩니다.', 의무실: '부상 회복이 빨라지고, 사망 확률이 줄어듭니다.',
    집무실: '리퀘스트에 모험가를 지명해 보내고, 계약 모험가와 계약합니다.',   // 2026-11-19 옛 문구("메인·서브 퀘스트는 아직 게임에 없음") 바로잡음 훈련장: '힘·민첩·기교를 훈련합니다. D → C 승급 조건.', 창고: '소재를 보관합니다.',
    추모실: '떠난 모험가와 가문의 기록을 남깁니다.', 정보실: '예상 성공률 · 승산이 정확해집니다.', 도서관: '지력·정신을 훈련합니다.',
    해체장: '원재료를 가공해 상위 레시피를 엽니다. B → A 승급 조건.', 휴게실: '모험가의 애착이 더 빨리 오릅니다.', '명예의 전당': '명성이 오르고 3차 직업 모험가를 기록합니다. A → S 승급 조건.'
  };
  const FAC_READY = { 게시판: 1, 접수대: 1, 주점: 1, 판매창구: 1, 관리소: 1, 의무실: 1, 집무실: 1 };   // 집무실: 2026-11-12 F급으로 지을 수 있게 (지명 기능은 퀘스트 구현 때)
  // 업그레이드 1단계 효과 (2026-11-12, docs/design/popup_fac.md 6장)
  const FAC_UP = { 게시판: '의뢰 기한 +1주', 접수대: '리나 응대 −0.5초', 주점: '음식·술 1개당 +5G', 판매창구: '소재 1개당 +3G', 관리소: '전직 수락 확률 +10%p' };   // 지금 게임에 실제 효과가 있는 시설
  const FAC_LABEL = { 게시판: '의뢰 게시판', 주점: '주점·식당', 판매창구: '소재 판매 창구', 관리소: '모험가 관리소', 집무실: '길드 마스터 집무실' };
  // 건설 메뉴 (2026-11-12 C단계, docs/design/guild_interior.md 10-4): 시설 / 장식 / 테이블 탭. 장식·테이블은 고르면 로비 배치 모드
  let facTab = 'deco';   // 2026-11-12: 시설 탭 없앰 → 시설 짓기·업그레이드는 로비의 시설 카드에서 (guild_interior.md 10-10)
  function facHtml() {
    const DE = Gm.DECO, nT = Gm.placedN(s, 'table'), tT = (DE.find(d => d.id === 'table') || {}).max || 4;
    const nD = DE.filter(d => d.id !== 'table' && Gm.placedN(s, d.id)).length, tD = DE.filter(d => d.id !== 'table').length;
    const tabs = [['deco', '장식', `${nD}/${tD}`], ['table', '테이블', `${nT}/${tT}`]];
    return `<div class="ux-tabs bm-tabs">${tabs.map(([k, n, c]) => `<button data-ftab="${k}" class="${facTab === k ? 'on' : ''}">${n}${c ? `<span class="cnt">${c}</span>` : ''}</button>`).join('')}</div>` + decoListHtml(facTab === 'table' ? 'table' : 'deco');
  }
  const DECO_ICON = id => id === 'table' ? 'assets/lobby_iso/table.png' : `assets/deco/${(Gm.DECO_BY[id] || {}).img}.png`;
  const DECO_WHERE = { floor: '바닥', wall: '벽', fire: '벽 (벽난로 자리만)', table: '바닥 3칸' };
  function decoListHtml(tab) {
    const rows = Gm.DECO.filter(d => (tab === 'table') === (d.id === 'table')).map(d => {
      const n = Gm.placedN(s, d.id), cap = Gm.capOf(s, d.id), full = n >= cap, poor = s.gold < d.price;
      if (!cap) return `<div class="fx-row bm-row off"><i class="bm-ic" style="background-image:url(${DECO_ICON(d.id)})"></i><b class="nm">${d.name}</b><span class="fx">${d.fx || d.desc || ''}</span><span class="st"><span class="fx-lock">리퀘스트 보상</span></span></div>`;
      const placed = s.place.items.filter(it => it.id === d.id);
      const st = full ? (d.max === 1 ? `<button class="ux-btn sm" data-pmove="${placed[0].uid}">옮기기</button>` : `<span class="ux-tag town">${n}/${cap} 모두 놓음</span>`)
        : `<button class="ux-btn sm" data-place="${d.id}" ${poor ? 'disabled' : ''}>놓기 <b>${fmt(d.price)}G</b></button>`;
      return `<div class="fx-row bm-row ${n ? 'on' : ''} ${!full && !poor ? 'glow' : ''}"><i class="bm-ic" style="background-image:url(${DECO_ICON(d.id)})"></i><b class="nm">${d.name}${d.max > 1 ? ` <small>${n}/${cap}</small>` : ''}</b><span class="fx">${d.fx || d.desc || ''} <em class="fx-up${n && d.id !== 'table' ? ' on' : ''}">${n && d.id !== 'table' ? '적용 중 · ' : ''}${DECO_WHERE[d.kind] || ''}</em></span><span class="st">${st}</span></div>`;
    });
    const note = tab === 'table' ? `테이블 1세트에 2명이 앉고, 앉은 모험가만 출발 전 식사를 주문합니다 (지금 ${Gm.seatsOf(s)}석 · 한 주에 ${Gm.seatsOf(s)}명까지). 놓은 테이블을 로비에서 누르면 옮기거나 치울 수 있습니다.` : '종류마다 1개씩 놓을 수 있고, 놓아 두는 동안 효과가 적용됩니다. 놓은 장식은 로비에서 눌러 옮기거나 치울 수 있습니다.';
    return `<div class="fx-list"><p class="muted small bm-note">${note} 옮기기는 무료, 치우면 돈은 돌려받지 못합니다.</p>${rows.join('')}</div>`;
  }
  // ---------- 책: 시설 장 (2026-11-13) — 왼쪽 = 설비: 카이로소프트식 아이콘 카드 격자 + 아래 정보 상자(놓기 · 옮기기) / 오른쪽 = 시설: 장부 줄 목록(짓기 · 업그레이드) ----------
  let fbSel = 'table';
  const FAC_IMG = { 게시판: 'assets/lobby_iso/hot/fac_board.png', 주점: 'assets/lobby_iso/hot/fac_bar.png', 판매창구: 'assets/lobby_iso/hot/fac_sale.png' };   // 시설 아이콘이 있는 것만 (나머지는 등급 배지로 대신, Gemini 생성 예정)
  function facBookHtml() {
    const DE = Gm.DECO, items = [DE.find(d => d.id === 'table')].concat(DE.filter(d => d.id !== 'table')).filter(Boolean);
    if (!items.some(d => d.id === fbSel)) fbSel = items[0].id;
    const dcard = d => { const n = Gm.placedN(s, d.id), cap = Gm.capOf(s, d.id), poor = s.gold < d.price, full = cap > 0 && n >= cap;
      if (!cap) return `<button class="fc lockd ${d.id === fbSel ? 'sel' : ''}" data-fbs="${d.id}"><i class="mk">잠김</i><span class="ux-slot fb-ic empty"><img src="${DECO_ICON(d.id)}" alt=""><i class="lk"></i></span><b>${d.name}</b><small>리퀘스트 보상</small></button>`;   // 서브 퀘스트 보상으로 열림
      return `<button class="fc ${n ? 'on' : ''} ${d.id === fbSel ? 'sel' : ''}" data-fbs="${d.id}"><span class="ux-slot fb-ic ${n ? '' : 'empty'}"><img src="${DECO_ICON(d.id)}" alt=""></span><b>${d.id === 'table' ? '테이블' : d.name}</b><small class="${poor && !full ? 'poor' : ''}">${full ? '모두 놓음' : fmt(d.price) + 'G'}</small><i class="mk ${n ? 'on' : ''} ${full ? 'full' : ''}">${n}/${cap}</i></button>`; };   // 위 = 놓은 수 / 놓을 수 있는 수
    const d = items.find(x => x.id === fbSel), dn = Gm.placedN(s, d.id), dcap = Gm.capOf(s, d.id), dfull = dcap > 0 && dn >= dcap, placed = s.place.items.filter(it => it.id === d.id);
    const dbtn = !dcap ? '<span class="fb-soon">리퀘스트 보상으로 열림</span>' : dfull ? (dcap === 1 && placed[0] ? `<button class="ux-btn" data-pmove="${placed[0].uid}">옮기기</button>` : '<span class="fb-done">모두 놓음</span>') : `<button class="ux-btn primary" data-place="${d.id}" ${s.gold < d.price ? 'disabled' : ''}>놓기 <b>${fmt(d.price)}G</b></button>`;
    const dinfo = `<div class="fi"><span class="ux-slot fb-ic big"><img src="${DECO_ICON(d.id)}" alt=""></span><div class="tx"><b>${d.name}${dcap ? ` <small>${dn}/${dcap}</small>` : ''}</b><em>${d.id === 'table' ? `1세트 = 2석 · 지금 ${Gm.seatsOf(s)}석 (한 주 식사 ${Gm.seatsOf(s)}명까지)` : (d.fx || d.desc || '')}</em><i>${DECO_WHERE[d.kind] || ''}${dn && d.id !== 'table' ? ' · 적용 중' : ''}${d.id === 'table' && dcap < d.max ? ` · ${dcap + 1}~${d.max}세트는 리퀘스트 보상` : ''}${!dcap ? ' · 리퀘스트 보상' : ''}</i></div><div class="bt">${dbtn}</div></div>`;
    const L = `<div class="ux-h">설비 <small>테이블 ${Gm.placedN(s, 'table')}/${Gm.capOf(s, 'table')}세트 · 장식 얻음 ${items.slice(1).filter(x => Gm.capOf(s, x.id)).length}/${items.length - 1}종</small></div><div class="fgrid">${items.map(dcard).join('')}</div>${dinfo}`;
    // 오른쪽 = 시설 장부 줄 목록 (2026-11-13 사용자 선택): 지을 수 있음 → 운영 중 → 잠김 · 준비 중(한 줄)
    const G = { run: [], can: [], lock: [] };
    for (const f of ['게시판', '접수대', '주점', '판매창구'].concat(FACS)) {
      const g = Gm.FAC_COST[f] == null ? 0 : Gm.FAC_COST[f], cost = Gm.facCost(s, f), ready = !!FAC_READY[f];
      let st, k, up = '';
      if (s.built[f]) { k = 'run'; st = '<span class="fb-done">● 운영 중</span>';
        if (FAC_UP[f]) { const uc = Gm.upgCost(s, f); st = Gm.upg(s, f) ? '<span class="fb-done gold">★ 업그레이드 완료</span>' : `<button class="ux-btn sm" data-upg="${f}" ${s.gold < uc ? 'disabled' : ''}>업그레이드 <b>${fmt(uc)}G</b></button>`; up = `<i class="up ${Gm.upg(s, f) ? 'on' : ''}">${Gm.upg(s, f) ? '적용 중' : '업그레이드'}: ${FAC_UP[f]}</i>`; } }
      else if (!ready) { k = 'lock'; st = '<span class="fb-soon">준비 중</span>'; }
      else if (g > s.grade) { k = 'lock'; st = `<span class="fb-soon">${GR[g]}급부터</span>`; }
      else { k = 'can'; st = `<button class="ux-btn sm primary" data-build="${f}" ${s.gold < cost ? 'disabled' : ''}>짓기 <b>${fmt(cost)}G</b></button>`; }
      G[k].push(k === 'lock' ? `<div class="fb-row lock" title="${FAC_FX[f] || ''}">${badge(g)}<span class="tx"><b>${FAC_LABEL[f] || f}</b></span><span class="st">${st}</span></div>`   // 잠김 = 한 줄 (효과는 마우스 오버)
        : `<div class="fb-row ${k}">${badge(g)}<span class="tx"><b>${FAC_LABEL[f] || f}</b><em>${FAC_FX[f] || ''}</em>${up}</span><span class="st">${st}</span></div>`);
    }
    const sec = (t, a) => a.length ? `<div class="ux-h">${t} <small>${a.length}</small></div><div class="fb-list">${a.join('')}</div>` : '';
    const R_ = `<div class="ux-h fb-top">시설 <small>운영 ${G.run.length} · 지을 수 있음 ${G.can.length} · 잠김 ${G.lock.length}</small></div>` + sec('지을 수 있음', G.can) + sec('운영 중', G.run) + (G.lock.length ? `<div class="ux-h">잠김 · 준비 중 <small>${G.lock.length}</small></div><div class="fb-list fb-lock2">${G.lock.join('')}</div>` : '');   // 지을 수 있는 시설을 맨 위에, 잠김은 한 줄짜리 2열
    return `<div class="bk2 bk-fac"><section class="bk-l">${L}</section><section class="bk-r">${R_}</section></div>`;
  }
  function facListHtml() {
    const all = ['게시판', '접수대', '주점', '판매창구'].concat(FACS), run = [], can = [], lock = [];
    for (const f of all) {
      const g = Gm.FAC_COST[f] == null ? 0 : Gm.FAC_COST[f], cost = Gm.facCost(s, f), ready = !!FAC_READY[f];
      let st, grp;
      if (s.built[f]) {
        grp = run; st = '<span class="ux-tag town">● 운영 중</span>';
        if (FAC_UP[f]) { const uc = Gm.upgCost(s, f); st = Gm.upg(s, f) ? `<span class="ux-tag town" title="${FAC_UP[f]}">★ 업그레이드 완료</span>` : `<button class="ux-btn sm" data-upg="${f}" title="${FAC_UP[f]}" ${s.gold < uc ? 'disabled' : ''}>업그레이드 <b>${fmt(uc)}G</b></button>`; }
      }
      else if (!ready) { st = '<span class="ux-tag fx-soon">준비 중</span>'; grp = lock; }
      else if (g > s.grade) { st = `<span class="fx-lock">${GR[g]}급부터</span>`; grp = lock; }
      else { st = `<button class="ux-btn sm" data-build="${f}" ${s.gold < cost ? 'disabled' : ''}>짓기 <b>${fmt(cost)}G</b></button>`; grp = can; }
      grp.push(`<div class="fx-row ${s.built[f] ? 'on' : ''} ${grp === lock ? 'off' : ''} ${grp === can && s.gold >= cost ? 'glow' : ''}">${badge(g)}<b class="nm">${FAC_LABEL[f] || f}</b><span class="fx ${ready ? '' : 'soon'}">${FAC_FX[f] || ''}${FAC_UP[f] && s.built[f] ? ` <em class="fx-up${Gm.upg(s, f) ? ' on' : ''}">${Gm.upg(s, f) ? '적용 중' : '업그레이드'}: ${FAC_UP[f]}</em>` : ''}</span><span class="st">${st}</span></div>`);
    }
    const sec = (t, rows) => rows.length ? `<div class="ux-h">${t} <small>${rows.length}</small></div>${rows.join('')}` : '';
    return `<div class="fx-list">${sec('운영 중', run)}${sec('지을 수 있음', can)}${sec('잠김 · 준비 중', lock)}</div>`;
  }
  // ---------- 식당: 소재 보관함 · 조리대(3칸) · 리나 힌트 · 메뉴판 (docs/design/cooking.md) ----------
  let kSel = [], kMsg = null, kAnim = null, kFx = '', kFxAt = 0, kTimer = 0, kDish = null, kHide = null, kFlip = null, kSeq = [];   // kHide: 아직 메뉴판에 숨길 새 요리, kFlip: 지금 뒤집히는 카드   // kAnim: 조리 연출 중 {sel, r} (끝나면 결과 표시), kFx: 결과 효과 'ok'|'bad'
  const josa = (w, a, b) => { const c = w.charCodeAt(w.length - 1); return w + (c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 ? a : b); };
  function cookMsg(r) {
    const nm = id => (MATS[id] || {}).name || '?';
    if (r.kind === 'ok') return { ok: true, text: `새 요리를 발견했어요! <b>${r.dish.name}</b>, 바로 메뉴에 올릴게요.` };
    if (r.kind === 'known') return { text: '이미 아는 요리예요. 재료는 그대로 두었어요.' };
    if (r.kind === 'none') return { bad: true, text: '이건… 아무도 먹지 않을 거예요.' };
    if (r.kind === 'extra') return { bad: true, text: `${josa(nm(r.mat), '은', '는')} 빼 보면 어떨까요?` };
    if (r.kind === 'missing') return { bad: true, text: '뭔가 하나 더 넣으면 좋겠는데요…' };
    if (r.kind === 'wrong') return { bad: true, text: `${nm(r.mat)} 대신에 다른 걸 넣어 보면 어떨까요?` };
    return null;
  }
  // 소재 오버 창: data-mt="소재 id"인 칸에 마우스를 올리면 이름·등급·설명(소재 편집기 '설명')을 보여 줌. 팝업(#pop) 위에 떠서 다시 그려도 유지
  // 장비 오버 창: 이름·종류·등급 / 공격력(무기) 또는 방어(방어구) / 능력치 / 전투 수치 / 고유 효과 / 오버 메모(편집기, 비면 '설명')
  const GT_NAME = { sword: '검', bow: '활', staff: '지팡이', mace: '성구', dagger: '단검', heavy: '중갑', light: '경갑', robe: '로브', ring: '반지', anklet: '발찌', necklace: '목걸이', rosary: '묵주', gloves: '장갑' };
  const SLOT_NAME = { weapon: '무기', armor: '방어구', acc: '장신구' }, ST5 = ['힘', '민첩', '지력', '정신', '기교'];
  function gTipHtml(id) {
    const it = ITEMS_.find(i => i.id === id); if (!it) return '';
    const g = GR.indexOf(it.grade), kind = [SLOT_NAME[it.slot], GT_NAME[it.gtype]].filter(Boolean).join(' · ');
    const big = it.slot === 'weapon' ? [['공격력', it.atk]] : it.slot === 'armor' ? [['방어', it.def]] : [];
    const stats = Object.entries(it.stats || {}).filter(([, v]) => v).map(([k, v]) => `<span class="ux-tag">${ST5[+k]} +${v}</span>`).join('');
    const cb = [['공격력', 'atk'], ['방어', 'def'], ['마법 방어', 'mdef'], ['체력', 'hp'], ['마력', 'mp'], ['행운', 'luck']].filter(([n, k]) => it[k] && !big.some(b => b[0] === n)).map(([n, k]) => `<span>${n} <b>+${it[k]}</b></span>`).join('');
    const txt = it.tip || it.desc || '';   // 오버 메모가 원본, 비면 '설명'
    return `<div class="t1"><span class="ux-slot" data-g="${g}">${it.icon ? `<img src="assets/${it.icon}" alt="">` : ''}</span><div class="nm"><b>${esc(it.name)}</b><small>${kind}</small></div>${badge(g)}</div>
      ${big.filter(b => b[1]).map(b => `<div class="big"><em>${b[0]}</em><b>${b[1]}</b></div>`).join('')}
      ${stats ? `<div class="sec">능력치</div><div class="tags">${stats}</div>` : ''}${cb ? `<div class="cb">${cb}</div>` : ''}
      ${it.effect ? `<div class="fx">✦ ${esc(it.effect)}</div>` : ''}${txt ? `<p>${esc(txt)}</p>` : ''}`;
  }
  // 물약 오버 창: 이름·등급 / 효과(편집기 '효과') / 오버 메모
  function pTipHtml(id) {
    const it = ITEMS_.find(i => i.id === id); if (!it) return ''; const g = GR.indexOf(it.grade);
    return `<div class="t1"><span class="ux-slot" data-g="${g}">${it.icon ? `<img src="assets/${it.icon}" alt="">` : ''}</span><div class="nm"><b>${esc(it.name)}</b><small>물약</small></div>${badge(g)}</div>${it.desc ? `<div class="fx">✦ ${esc(it.desc)}</div>` : ''}${it.tip ? `<p>${esc(it.tip)}</p>` : ''}`;
  }
  // 요리 오버 창 (메뉴판의 발견한 요리): 이름·등급 / 식사 효과 / 오버 메모
  function dTipHtml(name) {
    const d = Gm.DISH.find(x => x.name === name), it = ITEMS_.find(i => i.kind === 'food' && i.name === name); if (!d) return '';
    return `<div class="t1"><span class="ux-slot" data-g="${d.g}">${d.icon ? `<img src="assets/${d.icon}" alt="">` : ''}</span><div class="nm"><b>${esc(name)}</b><small>${GR[d.g]}급 요리</small></div>${badge(d.g)}</div>${d.effect ? `<div class="fx">✦ 먹은 모험가 ${esc(d.effect)}</div>` : ''}${it && it.tip ? `<p>${esc(it.tip)}</p>` : ''}`;
  }
  // 몬스터 오버 창 (도감): 그림·이름·등급·종류 / 체력·공격력 / 처음 만난 날 / 오버 메모
  function nTipHtml(id) {
    const m = MONS[id]; if (!m) return ''; const g = GR.indexOf(m.grade), w = (s.seenMons || {})[id];
    return `<div class="t1"><span class="ux-slot" data-g="${g}"><i class="cdx-mon" style="background-image:url(assets/expedition/${m.img || 'mon/' + id + '.png'})"></i></span><div class="nm"><b>${esc(m.name)}</b><small>${esc(m.kind || '')}</small></div>${badge(g)}</div>
      <div class="cb"><span>체력 <b>${m.hp}</b></span><span>공격력 <b>${m.atk}</b></span></div>${m.tip ? `<p>${esc(m.tip)}</p>` : ''}${w != null ? `<div class="ft">처음 만난 날 ${Gm.dateLabel(w)}</div>` : ''}`;
  }
  // 직업 오버 창 (도감): 이름·차수 / 조건 능력치 / (3차) 이전 직업·필요한 마을 건물 / 지금 이 직업인 모험가
  function jTipHtml(name) {
    const c1 = Gm.CLASS1.indexOf(name), c2 = Gm.CLASS2.find(c => c.name === name), c3 = Gm.CLASS3.find(c => c.name === name), c = c2 || c3, st = c1 >= 0 ? 1 : c2 ? 2 : 3;
    const req = c ? Object.entries(c.req).map(([k, v]) => `<span class="ux-tag">${Gm.STATS[+k]} ${v} 이상</span>`).join('') : `<span class="ux-tag">주 능력치 ${Gm.STATS[c1]}</span>`;
    const who = s.advs.filter(a => a.alive && a.cls === name).map(a => a.name);
    return `<div class="t1"><div class="nm"><b>${esc(name)}</b><small>${st}차 직업${c2 && c2.fin ? ' · 종결' : ''}</small></div></div><div class="sec">${c ? '전직 조건' : '바탕'}</div><div class="tags">${req}</div>
      ${c3 ? `<div class="cb"><span>이전 직업 <b>${esc(c3.from)}</b></span><span>마을 건물 <b>${esc(c3.town)}</b></span></div>` : ''}<div class="ft">${who.length ? '지금 ' + who.map(esc).join('·') : '지금 이 직업인 모험가 없음'}</div>`;
  }
  function mTipHtml(id) {
    const m = MATS[id] || {}, k = !!(s.knownMats || {})[id], n = (s.mats || {})[id] || 0, g = GR.indexOf(m.grade);
    if (!k) return `<div class="t1"><span class="ux-slot unk" data-g="${g}">${m.icon ? matImg(m) : ''}</span><b>???</b></div><p class="ux-muted">아직 얻지 못한 소재입니다. 의뢰를 다녀오면 알 수 있어요.</p>`;
    return `<div class="t1"><span class="ux-slot" data-g="${g}">${matImg(m)}</span><b>${esc(m.name)}</b>${badge(g)}</div>${m.desc ? `<p>${esc(m.desc)}</p>` : ''}<div class="ft">보유 ${n}개</div>`;
  }
  let mTipEl = null, mTipFor = null;
  function mTipHide() { if (mTipEl) mTipEl.classList.remove('on'); mTipFor = null; }
  document.addEventListener('mouseover', e => {
    const c = e.target.closest && e.target.closest('#popBody [data-mt], #popBody [data-gt], #popBody [data-pt], #popBody [data-dt], #popBody [data-nt], #popBody [data-jt]');
    if (!c) { if (mTipFor && !(e.target.closest && e.target.closest('#mTip'))) mTipHide(); return; }
    if (mTipFor === c) return; mTipFor = c;
    const pop = q('#pop'); if (!mTipEl || !pop.contains(mTipEl)) { mTipEl = document.createElement('div'); mTipEl.id = 'mTip'; pop.appendChild(mTipEl); }
    const D = c.dataset; mTipEl.innerHTML = D.gt ? gTipHtml(D.gt) : D.pt ? pTipHtml(D.pt) : D.dt ? dTipHtml(D.dt) : D.nt ? nTipHtml(D.nt) : D.jt ? jTipHtml(D.jt) : mTipHtml(D.mt); mTipEl.classList.add('on');
    const pr = pop.getBoundingClientRect(), k = pr.width / pop.offsetWidth, r = c.getBoundingClientRect();   // 화면 배율·팝업 테두리 보정
    const x0 = (r.left - pr.left) / k - pop.clientLeft, y0 = (r.top - pr.top) / k - pop.clientTop, w = r.width / k, h = r.height / k;
    const tw = mTipEl.offsetWidth, th = mTipEl.offsetHeight, W = pop.clientWidth, H = pop.clientHeight;
    let top = y0 + h + 8; if (top + th > H - 4) top = y0 - th - 8;
    mTipEl.style.left = Math.max(4, Math.min(x0 + w / 2 - tw / 2, W - tw - 4)) + 'px'; mTipEl.style.top = Math.max(4, top) + 'px';
  });
  document.addEventListener('pointerdown', mTipHide, true);
  function kToast(m) {   // 리나의 결과·힌트: 팝업 위 토스트 (식당 화면 공간 절약)
    if (!m) return; const pop = q('#pop'); let el = pop.querySelector('#kToast');
    if (!el) { el = document.createElement('div'); el.id = 'kToast'; pop.appendChild(el); }
    el.className = 'ktoast ' + (m.ok ? 'ok' : m.bad ? 'bad' : ''); el.innerHTML = `<b class="who">리나</b> ${m.text}`;
    void el.offsetWidth; el.classList.add('on'); clearTimeout(kToast.t); kToast.t = setTimeout(() => el.classList.remove('on'), 3200);
  }
  // 성공 연출 순서: 솥 결과(요리 떠오름 0.7초) → 메뉴판 카드 플립 + 파티클 + 등급 태그 반짝임(0.65초) → 리나 토스트. 누르면 바로 끝
  function kitchenDone() {
    if (!kAnim) return; clearTimeout(kTimer);
    const r = kAnim.r; kAnim = null; kMsg = cookMsg(r); kFx = r.kind === 'ok' ? 'ok' : 'bad'; kFxAt = Date.now(); kDish = r.dish || null;
    kTimer = setTimeout(() => { kFx = ''; const p = document.querySelector('#popBody .kpot'); if (p) { p.classList.remove('ok', 'bad'); const d = p.querySelector('.dishup'); if (d) d.remove(); } }, 1600);
    if (r.kind !== 'ok') { if (popup === 'meals') { renderPopup(); kToast(kMsg); } return; }
    kHide = r.dish.name; if (popup === 'meals') renderPopup();
    kSeq.push(setTimeout(() => {
      kHide = null; kFlip = r.dish.name; if (popup !== 'meals') return; renderPopup();
      const card = document.querySelector('#popBody .kflip'); if (card) { card.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); kBurst(card); }
      kSeq.push(setTimeout(kitchenFinish, 650));
    }, 700));
  }
  function kitchenFinish() { kSeq.forEach(clearTimeout); kSeq = []; const was = kHide || kFlip; kHide = null; kFlip = null; if (popup === 'meals') { renderPopup(); if (was) kToast(kMsg); } }
  function kBurst(card) {   // 금빛 점·별 파티클: 카드 중심에서 사방으로 퍼짐
    // 화면이 창 크기에 맞춰 축소·확대돼 있어도 카드 중심에서 나오도록: 화면 좌표 → 팝업 안 좌표(배율·테두리 보정)
    const pop = q('#pop'), box = pop.getBoundingClientRect(), r = card.getBoundingClientRect(), k = box.width / pop.offsetWidth || 1;
    const cx = (r.left + r.width / 2 - box.left) / k - pop.clientLeft, cy = (r.top + r.height / 2 - box.top) / k - pop.clientTop;
    for (let i = 0; i < 26; i++) {
      const p = document.createElement('i'), a = Math.random() * Math.PI * 2, d = 90 + Math.random() * 120, star = i % 3 === 0;
      p.className = 'kpart' + (star ? ' star' : ''); if (star) p.textContent = '★';
      p.style.cssText = `left:${cx}px;top:${cy}px;--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d * 0.7}px;--s:${0.6 + Math.random() * 0.8};animation-delay:${Math.random() * 120}ms`;
      q('#pop').appendChild(p); setTimeout(() => p.remove(), 1100);
    }
  }
  document.addEventListener('pointerdown', e => {
    const kt = document.getElementById('kToast'); if (kt && kt.classList.contains('on')) { kt.classList.remove('on'); clearTimeout(kToast.t); }   // 토스트: 화면 아무 곳이나 누르면 바로 닫힘
    if (popup === 'meals' && e.target.closest('#popBody .kitchen')) { if (kAnim) { kitchenDone(); kitchenFinish(); } else if (kHide || kFlip) kitchenFinish(); }   // 연출 중 누르면 바로 결과
  });
  function mealsHtml() {
    const top = Math.max(1, s.grade), mats = s.mats || {}, known = s.knownMats || {};
    kSel = kSel.filter(m => mats[m] > 0 || Gm.canMarket(s, m));
    // 소재 보관함: 음식 소재만
    const food = Object.values(MATS).filter(m => m.line === 'food' && GR.indexOf(m.grade) <= top).sort((a, b) => GR.indexOf(a.grade) - GR.indexOf(b.grade));
    const pantry = food.map(m => { const k = !!known[m.id], n = mats[m.id] || 0, used = kSel.filter(x => x === m.id).length, mk = k && n <= 0 && Gm.canMarket(s, m.id), ok = k && (n - used > 0 || (mk && !used));   // 2026-11-20 결정 65: 창고에 없는 상시 재료는 시장에서 삼
      return `<button class="kmat ${!k ? 'unk' : !ok && n - used <= 0 ? 'zero' : ''}" ${ok ? `data-kmat="${m.id}"` : 'aria-disabled="true"'} data-mt="${m.id}"${mk ? ` title="창고에 없음 — 요리하면 시장에서 ${Gm.shopPrice(s, m.id)}G에 삼"` : ''}><span class="ux-slot${k ? '' : ' unk'}" data-g="${GR.indexOf(m.grade)}">${k || m.icon ? matImg(m) : ''}${k && !mk ? cntBadge(n - used) : ''}</span><em>${k ? esc(m.name) : '???'}${mk ? `<small class="kmk">시장 ${Gm.shopPrice(s, m.id)}G</small>` : ''}</em></button>`; }).join('');
    // 조리대
    let slots = '';
    const shown = kAnim ? kAnim.sel : kSel;
    for (let i = 0; i < 3; i++) { const m = MATS[shown[i]]; slots += (i ? `<span class="plus ${kAnim ? 'gone' : ''}">+</span>` : '') + (m ? `<button class="kslot ${kAnim ? 'drop' : ''}" style="--d:${i * 90}ms" ${kAnim ? '' : `data-kslot="${i}"`} data-mt="${m.id}"><span class="ux-slot" data-g="${GR.indexOf(m.grade)}">${matImg(m)}</span><em>${esc(m.name)}</em></button>` : `<span class="kslot ${kAnim ? 'drop' : ''}" style="--d:${i * 90}ms"><span class="ux-slot empty" data-ph=""></span><em>&nbsp;</em></span>`); }   // 조리 중에는 빈 칸까지 3칸 모두 사라짐
    const pot = `<div class="kpot ${kAnim ? 'stir' : kFx} ${kFx && Date.now() - kFxAt > 100 ? 'held' : ''}"><i class="steam s1"></i><i class="steam s2"></i><i class="steam s3"></i><img class="cauldron" src="assets/ui/kitchen/cauldron.png" alt=""><span class="ladlewrap"><img class="ladle" src="assets/ui/kitchen/ladle.png" alt=""></span><i class="burst"></i><i class="puff p1"></i><i class="puff p2"></i><i class="puff p3"></i>${kFx === 'ok' && kDish && kDish.icon ? `<img class="dishup" src="assets/${kDish.icon}" alt="">` : ''}</div>`;
    const msg = '';   // 결과·힌트는 팝업 가운데 토스트로 (kToast)
    // 메뉴판: 등급 줄 태그 = 그 등급에서 발견한 요리 × 2% (식사 효과, 모든 등급 합이 실제 효과). 카드 = 요리별 능력치 효과
    const perDish = Math.round(s.cfg.econ.mealPerDish * 1000) / 10;   // 등급 줄 태그 = 그 등급에서 발견한 수 × 2% (모든 등급 합이 실제 식사 효과)
    let menu = '';
    for (let g = 0; g <= top; g++) {
      const hid = d => (kAnim && kAnim.r.dish && kAnim.r.dish.name === d.name) || kHide === d.name;   // 연출 중에는 새 요리를 아직 숨김
      const ds = Gm.DISH.filter(d => d.g === g && (!d.dungeon || s.dishes[d.name])), got = ds.filter(d => s.dishes[d.name] && !hid(d)).length; if (!ds.length) continue;
      const bump = kFlip && ds.some(d => d.name === kFlip);
      menu += `<div class="kgrade">${badge(g)}<b>${GR[g]}급 요리</b><span class="ux-muted">${got} / ${ds.length} 발견</span>${got && !s.cfg.econ.mealMode ? `<span class="ux-tag town ${bump ? 'bump' : ''}">식사 효과 +${Math.round(perDish * got * 10) / 10}%</span>` : ''}</div><div class="kmenu">`;
      for (const d of ds) {
        const on = !!s.dishes[d.name] && !hid(d);
        const hs = (s.hints || {})[d.name] || 0, hl = hs ? (s.hintLog || []).find(h => h.dish === d.name && h.stage === hs) : null;   // 2026-11-20 식당 A안: 들은 소문 + 단계 점
        const back = `<div class="kdish off"><span class="pic unk">${d.icon ? `<img src="assets/${d.icon}" alt="">` : ''}</span><div><b>???</b>${hl ? `<div class="rc rum" title="모험가들이 수다 중에 흘린 소문 (${hs}/3)"><em>소문</em>${esc(hl.text)} <u>${'●'.repeat(hs)}${'○'.repeat(3 - hs)}</u></div>` : `<div class="rc ux-muted">아직 모르는 요리</div>`}</div></div>`;
        if (on && kFlip === d.name) menu += `<div class="kflip"><div class="kin"><div class="kface">${dishFront(d)}</div><div class="kface bk">${back}</div></div></div>`;   // 뒤집히며 공개
        else menu += on ? dishFront(d) : back;
      }
      menu += '</div>';
    }
    function dishFront(d) { return `<div class="kdish" data-dt="${esc(d.name)}"><span class="pic"><img src="assets/${d.icon}" alt=""></span><div><b>${d.name}</b><div class="rc">${d.mats.map(m => `<span class="ux-slot" data-mt="${m}" data-g="${GR.indexOf((MATS[m] || {}).grade)}">${matImg(MATS[m] || {})}</span>`).join('<span class="plus">+</span>')}<span class="kfx">${esc(d.effect)}</span></div>${s.cfg.econ.mealCook && s.dishes[d.name] ? kMenuRow(d) : ''}</div></div>`; }
    // 2026-11-19 V4 1단계 (결정 37 · 39): 재고 그릇 · 1그릇 원가 · 가격(1G 단위) · 마진 · 한 주 준비량
    function kMenuRow(d) { const mu = Gm.menuOf(s, d), b = Gm.dishBase(s, d), cost = Gm.dishCost(s, d), st = Gm.stockOf(s, d), k = Gm.priceK(s, d, mu.price), mg = mu.price - cost;
      const shop = !!s.cfg.econ.shopRate, RS = Gm.reqReserve(s), kp = m => (RS[m] || 0) + (s.cfg.econ.mealKeep || 0), free = m => ((s.mats || {})[m] || 0) - kp(m), spice = shop ? d.mats.filter(m => Gm.isStaple(s, m) && free(m) < 1) : [], lack = d.mats.filter(m => (!shop || !Gm.isStaple(s, m)) && free(m) < 1), none = lack.filter(m => !((s.mats || {})[m] > 0)), held = lack.filter(m => (s.mats || {})[m] > 0);   // 2026-11-19: 정말 없음 / 납품용으로 남겨 둠 구분   // 결정 46: 잡화 상인이 없으면 양념도 '재료 없음' (상시 발주로)
      return `<div class="kmr"><span class="kst${st ? '' : ' out'}">${st ? `재고 <b>${st}</b>그릇` : '품절'}</span><span>재료 1세트 = <b>${d.serv}</b>그릇 · 1그릇 원가 <b>${(Math.round(cost * 10) / 10)}G</b></span>${lack.length ? `${none.length ? `<span class="kwarn">재료 없음: ${none.map(m => esc((MATS[m] || {}).name || m)).join(' · ')} <small>(희귀 재료 — 매입가를 올리거나 토벌 의뢰로 모으기)</small></span>` : ''}${held.length ? `<span class="kwarn">${held.map(m => `${esc((MATS[m] || {}).name || m)} ${(s.mats || {})[m]}개 있지만 리퀘스트 납품용으로 남겨 둠`).join(' · ')}</span>` : ''}` : spice.length ? `<span class="kshop">창고에 없어 시장에서 삼: ${spice.map(m => `${esc((MATS[m] || {}).name || m)} ${Gm.shopPrice(s, m)}G`).join(' · ')}</span>` : ''}</div>`
        + `<div class="kmr"><span class="kpr">가격 <button data-kpr="${esc(d.name)}:-5">−5</button><button data-kpr="${esc(d.name)}:-1">−1</button><b>${mu.price}G</b><button data-kpr="${esc(d.name)}:1">+1</button><button data-kpr="${esc(d.name)}:5">+5</button>${mu.price !== b ? `<button class="rs" data-kpr="${esc(d.name)}:base" title="기준가로">기준 ${b}G</button>` : ''}</span><span>마진 <b class="${mg < 0 ? 'ux-minus' : 'ux-plus'}">${Math.round(mg * 10) / 10}G</b> · 손님 ×${(Math.round(k * 100) / 100)}</span><span class="kpp">한 주 준비 <button data-kpp="${esc(d.name)}:-1" ${mu.prep <= 0 ? 'disabled' : ''}>−</button><b>${mu.prep}</b><button data-kpp="${esc(d.name)}:1" ${mu.prep >= 10 ? 'disabled' : ''}>+</button>그릇</span></div>`
        + `<div class="kmr"><span class="kleft">남은 그릇 <button class="${mu.left === 'sale' ? 'on' : ''}" data-kleft="${esc(d.name)}:sale" title="지난주에 만든 그릇이 남았으면 반값으로 팝니다">마감 할인</button><button class="${mu.left === 'free' ? 'on' : ''}" data-kleft="${esc(d.name)}:free" title="버릴 그릇을 마을에 남은 모험가에게 무료로 대접합니다 (애착 +${s.cfg.econ.freeAttach != null ? s.cfg.econ.freeAttach : 1})">무료 식사</button></span>${Gm.oldBowl(s, d) && mu.left === 'sale' ? `<span class="ksale">지금 마감 할인 ${Gm.salePrice(s, d)}G</span>` : ''}</div>`; }   // 결정 47
    return `<div class="kitchen"><div class="kpan"><div class="ux-h">소재 보관함 <small>음식 소재</small></div><div class="kpantry">${pantry}</div></div>
      <div class="kpan"><div class="ux-h">조리대</div><div class="kslots">${slots}</div>${pot}<button class="ux-btn kcook" data-kcook="1" ${kSel.length && !kAnim ? '' : 'disabled'}>만들어 보기</button>${msg}</div>
      <div class="kpan wide"><div class="ux-h">메뉴판</div>${s.cfg.econ.mealCook ? '<div class="kmnote">팔 때마다 재료를 씁니다 · 매주 준비량만큼 만들고 남은 그릇은 다음 주까지 팝니다 · 받아 둔 납품 리퀘스트에 필요한 재료는 남겨 둡니다</div>' : ''}<div class="kmenuwrap">${menu}</div></div></div>`;
  }
  // 길드 기록: 월 단위 카드(머리 = 그 달 결산) · 종류 아이콘 · 필터. 'sys'(버튼 반응)·'debug'는 기록에서 숨김
  const LK = {   // 종류 → [아이콘 글자, 이름, 필터 묶음]
    success: ['✓', '의뢰 성공', 'q'], fail: ['✕', '의뢰 실패', 'q'], withdraw: ['⊘', '의뢰 철회', 'q'], expire: ['⌛', '의뢰 만료', 'q'], depart: ['➜', '출발', 'q'],
    death: ['☠', '사망', 'a'], injury: ['✚', '부상', 'a'], leave: ['↩', '떠남', 'a'], arrive: ['☺', '새 모험가', 'a'], grow: ['▲', '성장', 'a'], promo: ['★', '전직', 'a'], quirk: ['♣', '버릇', 'a'],
    unlock: ['◆', '발견', 'g'], build: ['⌂', '건설', 'g'], guild: ['⚑', '길드', 'g'], info: ['•', '기록', 'g'], warn: ['!', '알림', 'g']
  };
  const LF = [['all', '전체'], ['q', '의뢰'], ['a', '모험가'], ['g', '길드'], ['imp', '중요']], LIMP = { death: 1, injury: 1, leave: 1 }, isImp = e => LIMP[e.kind] || (e.kind === 'promo' && (e.done || /전직했습니다/.test(e.text)));   // 중요 = 사망·부상·떠남·실제 전직 (제안·거절·보류 제외)
  let logFilter = 'all';
  // 기록 글 꾸미기: 모험가 이름(e.who) 굵게, 퀘스트 이름(「」) 색
  function logText(e) {
    let t = esc(e.text).replace(/「(.+?)」/g, '<span class="gl-q">$1</span>');
    for (const n of [...new Set(e.who || [])].sort((a, b) => b.length - a.length)) { const N = esc(n).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      t = t.replace(new RegExp(`(^|[\\s·(])${N}(?=[이가은는의을를과와·\\s)]|$)`, 'g'), `$1<b class="gl-n">${esc(n)}</b>`); }
    return t;
  }
  function logHtml() {
    const W = Gm.WPM, mk = w => Math.floor(w / W), show = e => !(e.kind === 'sys' || e.kind === 'debug' || e.kind === 'ledger');
    const pass = e => logFilter === 'all' || (logFilter === 'imp' ? isImp(e) : (LK[e.kind] || LK.info)[2] === logFilter);
    const sum = {}, months = [], by = {};
    for (const e of s.log) {
      if (e.kind === 'ledger') { sum[mk(e.week - 1)] = e; continue; }   // 결산은 지난달 것 → 그 달 머리로
      if (!show(e)) continue; const k = mk(e.week); if (!by[k]) { by[k] = []; months.push(k); } by[k].push(e);
    }
    for (const k in sum) if (!by[k]) { by[k] = []; months.push(+k); }
    months.sort((a, b) => b - a);
    const cnt = f => s.log.filter(e => show(e) && (f === 'all' || (f === 'imp' ? isImp(e) : (LK[e.kind] || LK.info)[2] === f))).length;
    let h = `<div class="glog"><div class="gl-top">${LF.map(([k, n]) => `<button class="gl-chip ${logFilter === k ? 'on' : ''}" data-lf="${k}">${n}<small>${cnt(k)}</small></button>`).join('')}</div><div class="gl-list">`;
    let any = false;
    for (const k of months) {
      const rows = by[k].filter(pass), S = sum[k]; if (!rows.length && logFilter !== 'all') continue; any = true;
      const ml = Gm.dateLabel(k * W).replace(/ \d+주$/, '');
      const head = S ? `<span class="gl-net ${S.net < 0 ? 'neg' : ''}">순이익 ${S.net >= 0 ? '+' : '−'}${fmt(Math.abs(S.net))}G</span><span class="ux-muted">의뢰 ${S.nq}건 · 성공 ${S.nok}건</span>` : `<span class="ux-tag town">진행 중</span>`;
      h += `<section class="gl-month"><header><b>${ml}</b>${head}</header>`;
      h += rows.length ? rows.map(e => { const L = LK[e.kind] || LK.info, wk = (e.week % W) + 1;
        return `<div class="gl-row k-${e.kind}"><i class="gl-ic" title="${L[1]}">${L[0]}</i><span class="gl-w">${wk}주</span><span class="gl-t">${logText(e)}</span></div>`; }).join('') : '<div class="gl-empty ux-muted">기록 없음</div>';
      h += '</section>';
    }
    if (!any) h += '<p class="ux-muted gl-none">해당하는 기록이 없습니다.</p>';
    return h + '</div></div>';
  }
  // ---------- 로비 배치 모드 (2026-11-12 C단계) ----------
  // 고르면 게임을 멈추고 로비에 칸 표시(초록 = 놓을 수 있음, 빨강 = 막힘). 클릭 = 놓기, 우클릭·Esc·취소 = 그만두기
  // 배치 모드가 아닐 때 놓인 물건을 누르면 작은 메뉴(옮기기 · 치우기)
  let PM = null, pmSp = 1, pmLay = null, pmBar = null, pmMenu = null, pmTip = null;
  const pmPt = e => { const p = stage.toGame(e.clientX, e.clientY); return [p.x, p.y]; };
  function pmEls() {
    if (pmLay) return;
    pmLay = document.createElement('div'); pmLay.id = 'placeLay'; stage.ui.appendChild(pmLay);
    pmBar = document.createElement('div'); pmBar.id = 'placeBar'; stage.ui.appendChild(pmBar);
    pmMenu = document.createElement('div'); pmMenu.id = 'placeMenu'; stage.ui.appendChild(pmMenu);
    pmLay.addEventListener('pointermove', e => pmHover(pmPt(e)));
    pmLay.addEventListener('click', e => { pmHover(pmPt(e)); pmDrop(); });
    pmLay.addEventListener('contextmenu', e => { e.preventDefault(); UI.placeEnd(true); });
    pmBar.addEventListener('click', e => { if (e.target.closest('[data-pmx]')) UI.placeEnd(true); });
    root.addEventListener('keydown', e => { if (e.key === 'Escape') { if (PM) { e.stopPropagation(); UI.placeEnd(true); } else if (pmMenu.classList.contains('on')) pmMenuClose(); } }, true);
    stage.canvas.addEventListener('click', e => pmItemClick(pmPt(e)));
    pmTip = document.createElement('div'); pmTip.id = 'hoverTip'; stage.ui.appendChild(pmTip);
    stage.canvas.addEventListener('mousemove', e => hoverAt(pmPt(e)));
    stage.canvas.addEventListener('mouseleave', () => hoverAt(null));
    pmMenu.addEventListener('click', e => {
      const b = e.target.closest('[data-pm]'); if (!b || b.classList.contains('lock')) return;
      if (pmMenu.dataset.fac) { facCardAct(pmMenu.dataset.fac, b.dataset.pm); return; }   // 시설 카드
      const it = s.place.items.find(x => x.uid === +pmMenu.dataset.uid); if (!it) { pmMenuClose(); return; }
      if (b.dataset.pm === 'move') { pmMenuClose(); UI.placeStart(it.id, it.uid); }
      else if (b.dataset.pm === 'del') {
        if (!b.classList.contains('sure')) { b.classList.add('sure'); pmMenu.querySelector('.pm-tip').textContent = '한 번 더 누르면 치웁니다 (환불 없음)'; pmMenu.classList.add('warn'); return; }
        Gm.placeDestroy(s, it.uid); pmMenuClose(); hooks.changed(); toast(`${(Gm.DECO_BY[it.id] || {}).name}을(를) 치웠습니다. 다시 놓으려면 새로 사야 합니다.`, 'info');
      }
    });
    pmMenu.addEventListener('mouseover', e => { const b = e.target.closest('[data-pm]'); if (b && !pmMenu.classList.contains('warn')) pmMenu.querySelector('.pm-tip').textContent = b.dataset.tip; });
    pmMenu.addEventListener('mouseleave', () => { if (pmMenu.dataset.fac && !pmMenu.classList.contains('warn')) pmMenu.querySelector('.pm-tip').textContent = ''; });
    pmMenu.addEventListener('mouseleave', () => { if (!pmMenu.classList.contains('warn')) pmMenu.querySelector('.pm-tip').textContent = ''; });
    document.addEventListener('pointerdown', e => { if (pmMenu.classList.contains('on') && !e.target.closest('#placeMenu') && e.target !== stage.canvas) pmMenuClose(); }, true);   // 닫기 버튼 대신 다른 곳을 누르면 닫힘
    // A작업 (2026-11-12): 놓인 물건을 0.4초 누르고 있으면 옮기기 모드. 누르는 동안 금빛 원이 차오름. 누른 채 끌어서 놓기
    stage.canvas.addEventListener('pointerdown', e => { if (e.button === 0) pressStart(pmPt(e)); });
    stage.canvas.addEventListener('pointermove', e => { if (PRESS) { const h = root.Lobby.hitAt(s, ...pmPt(e)); if (!h || h.kind !== 'item' || h.uid !== PRESS.uid) pressCancel(); } });
    stage.canvas.addEventListener('pointerup', () => pressCancel());
    stage.canvas.addEventListener('pointerleave', () => pressCancel());
    pmLay.addEventListener('pointerup', e => { if (PM && PM.drag) { pmHover(pmPt(e)); if (PM.ok) pmDrop(); else UI.placeEnd(true); } });
  }
  const pmCanBuy = d => Gm.placedN(s, d.id) < d.max && s.gold >= d.price;
  UI.placeStart = function (id, uid, drag) {
    const d = Gm.DECO_BY[id]; if (!d) return;
    pmEls(); pmMenuClose();
    if (uid == null && !pmCanBuy(d)) { toast(Gm.placedN(s, id) >= d.max ? `${d.name}은(는) ${d.max}개까지 놓을 수 있습니다.` : `금고가 부족합니다. (${fmt(d.price)}G)`, 'warn'); return; }
    if (popup) UI.close();
    if (!PM) pmSp = curSp;
    PM = { id, uid: uid == null ? null : uid, at: null, ok: false, drag: !!drag };   // drag: 길게 눌러 들어와 아직 버튼을 누르고 있음 → 손을 떼면 놓기
    hooks.setSpeed && hooks.setSpeed(0);
    root.Lobby.ghostUid = PM.uid; root.Lobby.overlay = (g, list) => { if (PM) root.Lobby.drawPlace(g, s, list, PM); };
    pmLay.classList.add('on'); pmBar.classList.add('on');
    pmBar.innerHTML = `<b>${d.name}</b> ${PM.uid != null ? '옮기기 · 무료' : `놓기 · ${fmt(d.price)}G`}<span class="pb-hint">${PM.drag ? '끌어서 초록 칸에 놓으세요 · 빨간 칸이면 제자리로' : '초록 칸을 누르세요 · 우클릭/Esc 취소'}</span><button class="ux-btn sm" data-pmx>취소</button>`;
  };
  UI.placeEnd = function (cancel) {
    if (!PM) return;
    PM = null; root.Lobby.ghostUid = null; root.Lobby.overlay = null;
    pmLay.classList.remove('on'); pmBar.classList.remove('on');
    hooks.setSpeed && hooks.setSpeed(pmSp);
  };
  function poofAt(uid) {   // 놓은 자리에 작은 먼지 "뿅" (2026-11-12)
    const it = s.place.items.find(x => x.uid === uid), L = root.Lobby; if (!it || !L.fxPoof) return;
    const bs = L.placedDrawables(null, it).map(o => o.box).filter(Boolean); if (!bs.length) return;
    const x0 = Math.min(...bs.map(b => b[0])), x1 = Math.max(...bs.map(b => b[0] + b[2])), y1 = Math.max(...bs.map(b => b[1] + b[3]));
    L.fxPoof((x0 + x1) / 2, y1 - 6);
  }
  function pmHover(pt) {
    if (!PM) return;
    const at = root.Lobby.pick(PM.id, pt[0], pt[1]);
    PM.at = at; PM.ok = !!at && Gm.placeOk(s, PM.id, at, PM.uid == null ? undefined : PM.uid);
    pmLay.style.cursor = at ? (PM.ok ? 'pointer' : 'not-allowed') : 'default';
  }
  function pmDrop() {
    if (!PM || !PM.at) return;
    const d = Gm.DECO_BY[PM.id];
    if (!PM.ok) { toast('여기에는 놓을 수 없습니다.', 'warn'); return; }
    if (PM.uid != null) { const uid = PM.uid; Gm.placeMove(s, uid, PM.at); UI.placeEnd(false); hooks.changed(); poofAt(uid); return; }
    const it = Gm.placeBuy(s, PM.id, PM.at); if (!it) { toast('놓지 못했습니다.', 'warn'); return; }
    hooks.changed(); poofAt(it.uid);
    if (d.max > 1 && pmCanBuy(d)) { PM.at = null; PM.ok = false; UI.placeStart(PM.id, null); return; }   // 테이블은 이어서 더 놓을 수 있게
    UI.placeEnd(false);
  }
  // 롤오버 (2026-11-12): 놓인 물건·시설 위에서 금빛 테두리 + 손가락 커서, 시설은 이름 툴팁 (짓지 않은 시설은 짓기 비용)
  const FAC_NAME = { 게시판: '의뢰 게시판', 접수대: '접수대', 주점: '주점', 판매창구: '판매 창구', 집무실: '집무실', 관리소: '모험가 관리소' };
  const lobbyIdle = () => !(PM || popup || (root.Town && root.Town.active) || Dlg.open);   // 2026-11-17 리나 메뉴(lina_menu.js) 걷어냄
  function hoverAt(pt) {
    const L = root.Lobby; if (!L) return;
    let h = pt && lobbyIdle() ? L.hitAt(s, pt[0], pt[1]) : null;
    if (pmMenu && pmMenu.classList.contains('on')) h = pmMenu.dataset.fac ? { kind: 'fac', id: pmMenu.dataset.fac } : { kind: 'item', uid: +pmMenu.dataset.uid };   // 메뉴·카드가 떠 있는 동안은 그 물건·시설만
    L.hover = h; stage.canvas.style.cursor = h && pt ? 'pointer' : '';
    if (!pmTip) return;
    if (h && h.kind === 'fac' && pt) {
      const f = h.id, built = !!s.built[f];
      pmTip.innerHTML = `<b>${FAC_NAME[f] || f}</b>${built ? '' : ` · 짓기 ${fmt(Gm.facCost(s, f))}G`}`;
      pmTip.style.left = Math.round(pt[0] + 18) + 'px'; pmTip.style.top = Math.round(pt[1] + 22) + 'px'; pmTip.classList.add('on');
    } else pmTip.classList.remove('on');
  }
  // ---------- 시설 정보 카드 (2026-11-12, guild_interior.md 10-10) ----------
  // 클릭 = 카드. 왼쪽 = 업그레이드(짓지 않았으면 그 자리에 설치), 가운데 = 열기(느낌표). 장식 팝업과 같은 틀(#placeMenu)
  const FAC_OPEN = { 게시판: ['board', '의뢰 게시판 열기'], 접수대: ['advs', '모험가 목록 열기'], 주점: ['meals', '식당 열기'], 판매창구: ['sell', '판매 창구 열기'], 관리소: ['promo', '전직 제안 열기'] };   // 접수대 → 모험가 목록 (사용자 요청)
  function facInfo(f) {   // [지금 효과 한 줄, 운영 숫자]
    const up = Gm.upg(s, f);
    if (f === '게시판') { const W = Gm.expireWeeks(s), soon = s.board.filter(q => W - (s.week - q.posted) <= 1).length; return [`의뢰가 붙는 곳 · 붙은 의뢰는 ${W}주 뒤 사라집니다`, `붙은 의뢰 ${s.board.length}/${Gm.boardCap(s)} · 기한 1주 남은 의뢰 ${soon}`]; }
    if (f === '접수대') { const W = root.Director ? root.Director.winUse : null, n = W ? [W.meal, W.quest, W.sale].reduce((a, u) => a + u.filter(x => x != null).length, 0) : 0; return [`리나가 접수·보고를 받습니다 · 응대 ${up ? '1.0' : '1.5'}초`, `지금 줄 선 모험가 ${n}명`]; }
    if (f === '주점') { const M = s.month || {}, meals = Object.values(M.dishes || {}).reduce((a, b) => a + b, 0); return ['출발 전 식사와 술을 팝니다' + (up ? ' · 1개당 +5G 적용 중' : ''), `이번 달 식사 ${meals} · 술 ${M.drinks || 0} · 수입 ${fmt(Math.round((M.meal || 0) + (M.tavern || 0)))}G · 좌석 ${Gm.seatsOf(s)}석`]; }
    if (f === '판매창구') { const n = Object.values(s.mats || {}).reduce((a, b) => a + (b || 0), 0); return ['소재를 팔아 수입을 얻습니다' + (up ? ' · 1개당 +3G 적용 중' : ''), `보관 중인 소재 ${n}개`]; }
    if (f === '관리소') return ['2차 전직을 할 수 있게 됩니다' + (up ? ' · 수락 확률 +10% 적용 중' : ''), `전직 제안 ${(s.proposals || []).length}건`];
    if (f === '집무실') return ['메인·서브 퀘스트에 모험가를 지명합니다', '지명 기능은 준비 중입니다'];
    return ['', ''];
  }
  function facCard(f, pt) {
    const L = root.Lobby, F = (L.FAC_HOT || []).find(x => x.id === f), built = !!s.built[f], g = Gm.FAC_COST[f] == null ? 0 : Gm.FAC_COST[f];
    let bx;
    if (f === '접수대') { const it = root.Assets.items.iso_counter; bx = [1020, 410, (it && it.w) || 320, (it && it.h) || 220]; }
    else if (F) { const P = F.open && built ? F.open.poly : F.poly, xs = P.map(p => p[0]), ys = P.map(p => p[1]); bx = [Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)]; }
    else bx = [pt[0], pt[1], 0, 0];
    const IC = n => `<i style="background-image:url(assets/ui/deco_menu/${n}.png)"></i>`;
    const [fx, stat] = built ? facInfo(f) : [FAC_UP[f] ? '' : '', ''];
    let left, state;
    if (!built) {
      const cost = Gm.facCost(s, f), lockG = g > s.grade, poor = s.gold < cost;
      state = '<span class="fc-st off">미설치</span>';
      left = `<button class="pm-ic${lockG || poor ? ' lock' : ''}" data-pm="install" data-tip="${lockG ? `${GR[g]}급부터 지을 수 있습니다` : poor ? `설치 ${fmt(cost)}G · ${fmt(cost - s.gold)}G 부족` : `설치 ${fmt(cost)}G`}">${IC('deco_install')}<b class="pm-cost">${fmt(cost)}G</b></button>`;
    } else if (FAC_UP[f] && !Gm.upg(s, f)) {
      const cost = Gm.upgCost(s, f), poor = s.gold < cost;
      state = '<span class="fc-st on">운영 중</span>';
      left = `<button class="pm-ic${poor ? ' lock' : ''}" data-pm="upgrade" data-tip="업그레이드 ${fmt(cost)}G · ${FAC_UP[f]}${poor ? ` · ${fmt(cost - s.gold)}G 부족` : ''}">${IC('deco_up')}<b class="pm-cost">${fmt(cost)}G</b></button>`;
    } else if (FAC_UP[f]) {
      state = '<span class="fc-st done">★ 업그레이드 완료</span>';
      left = `<button class="pm-ic lock done" data-pm="upgrade" data-tip="업그레이드 완료 · ${FAC_UP[f]} 적용 중">${IC('deco_up')}<b class="pm-cost">★</b></button>`;
    } else {
      state = '<span class="fc-st on">운영 중</span>';
      left = `<button class="pm-ic lock" data-pm="upgrade" data-tip="업그레이드 · 준비 중">${IC('deco_up')}</button>`;
    }
    const op = FAC_OPEN[f];
    const mid = !built ? '' : op ? `<button class="pm-ic" data-pm="open" data-tip="${op[1]}">${IC('fac_open')}</button>` : `<button class="pm-ic lock" data-pm="open" data-tip="준비 중">${IC('fac_open')}</button>`;
    const pre = !built ? (f === '집무실' ? '지으면: 메인·서브 퀘스트에 모험가를 지명 (준비 중) · 왼쪽 문이 열립니다' : f === '관리소' ? '지으면: 2차 전직을 할 수 있게 됩니다 · 오른쪽 문이 열립니다' : '') : '';
    pmMenu.dataset.uid = ''; pmMenu.dataset.fac = f; pmMenu.classList.remove('warn'); pmMenu.classList.add('fac');
    pmMenu.innerHTML = `<div class="fc-hd">${badge(g)}<b class="pm-nm">${FAC_NAME[f] || f}</b>${state}</div>`
      + (built ? `<div class="fc-fx">${fx}</div><div class="fc-stat">${stat}</div>` : `<div class="fc-fx">${pre}</div>`)
      + `<div class="pm-ics">${left}${mid}</div><div class="pm-tip"></div>`;
    const above = bx[1] - 8 >= 300;
    pmMenu.style.left = Math.round(Math.max(260, Math.min(1660, bx[0] + bx[2] / 2))) + 'px';
    pmMenu.style.top = Math.round(above ? bx[1] - 8 : bx[1] + bx[3] + 8) + 'px'; pmMenu.classList.toggle('below', !above);
    pmMenu.classList.add('on');
  }
  function facCardAct(f, act) {
    if (act === 'install') { if (Gm.build(s, f)) { hooks.changed(); root.Lobby.fxBuild && root.Lobby.fxBuild(f); toast(`${FAC_NAME[f] || f}을(를) 지었습니다.`, 'info'); facCard(f, [0, 0]); } return; }
    if (act === 'upgrade') { if (Gm.upgrade(s, f)) { hooks.changed(); root.Lobby.fxUpgrade && root.Lobby.fxUpgrade(f); toast(`${FAC_NAME[f] || f} 업그레이드: ${FAC_UP[f]}`, 'info'); facCard(f, [0, 0]); } return; }
    if (act === 'open') { const op = FAC_OPEN[f]; if (!op) return; pmMenuClose(); UI.open(op[0]); }
  }
  function facClick(f, pt) { facCard(f, pt || [960, 540]); }
  const PRESS_MS = 400; let PRESS = null;
  function pressStart(pt) {
    pressCancel(); if (!lobbyIdle()) return;
    const h = root.Lobby.hitAt(s, pt[0], pt[1]); if (!h || h.kind !== 'item') return;
    const o = root.Lobby.placedDrawables(null, h.it).reduce((a, b) => (b.box && (!a || b.box[1] < a.box[1]) ? b : a), null), bx = o ? o.box : [pt[0], pt[1], 0, 0];
    PRESS = { uid: h.uid, id: h.it.id, t0: performance.now() };
    root.Lobby.press = { x: bx[0] + bx[2] / 2, y: bx[1] + bx[3] / 2, p: 0 };
    const tick = () => {
      if (!PRESS) return;
      const p = (performance.now() - PRESS.t0) / PRESS_MS; root.Lobby.press.p = Math.min(1, p);
      if (p >= 1) { const P0 = PRESS; pressCancel(); pmMenuClose(); UI.placeStart(P0.id, P0.uid, true); return; }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  function pressCancel() { PRESS = null; if (root.Lobby) root.Lobby.press = null; }
  function pmItemClick(pt) {
    if (PM || popup || (root.Town && root.Town.active) || Dlg.open) return;
    const h = root.Lobby.hitAt(s, pt[0], pt[1]);
    if (h && h.kind === 'fac') { pmMenuClose(); facClick(h.id, pt); return; }
    const it = h && h.it; if (!it) { pmMenuClose(); return; }
    const d = Gm.DECO_BY[it.id], o = root.Lobby.placedDrawables(null, it).reduce((a, b) => (b.box && (!a || b.box[1] < a.box[1]) ? b : a), null);
    const bx = o ? o.box : [pt[0], pt[1], 0, 0];
    pmMenu.dataset.uid = it.uid; pmMenu.dataset.fac = ''; pmMenu.classList.remove('fac');
    // B작업 (2026-11-12): 장식 이름 + 아이콘 3개(업그레이드 잠김 · 옮기기 · 치우기). 테이블은 업그레이드 없음. 닫기 버튼 없음
    const IC = n => `<i style="background-image:url(assets/ui/deco_menu/deco_${n}.png)"></i>`;
    pmMenu.classList.remove('warn');
    pmMenu.innerHTML = `<b class="pm-nm">${d.name}</b><div class="pm-ics">`
      + (d.kind !== 'table' ? `<button class="pm-ic lock" data-pm="up" data-tip="업그레이드 · 준비 중">${IC('up')}</button>` : '')
      + `<button class="pm-ic" data-pm="move" data-tip="옮기기 · 무료 (길게 눌러도 됩니다)">${IC('move')}</button><button class="pm-ic del" data-pm="del" data-tip="치우기 · 돈은 돌려받지 못합니다">${IC('del')}</button></div><div class="pm-tip"></div>`;
    const above = bx[1] - 8 >= 260;   // 위쪽 HUD와 겹치면 물건 아래에 띄움
    pmMenu.style.left = Math.round(Math.max(230, Math.min(1690, bx[0] + bx[2] / 2))) + 'px';
    pmMenu.style.top = Math.round(above ? bx[1] - 8 : bx[1] + bx[3] + 8) + 'px'; pmMenu.classList.toggle('below', !above);
    pmMenu.classList.add('on');
  }
  function pmMenuClose() { if (pmMenu) { pmMenu.classList.remove('on', 'fac'); pmMenu.dataset.uid = ''; pmMenu.dataset.fac = ''; } if (root.Lobby && root.Lobby.hover) root.Lobby.hover = null; }

  stagePopClicks();
  function stagePopClicks() {
    document.addEventListener('click', e => {
      if (!popup) return;
      { const mt = e.target.closest('[data-mtsel], [data-mtf]'); if (mt && popup === 'trade') { if (mt.dataset.mtsel) mtSel = mt.dataset.mtsel; else mtFlt = mt.dataset.mtf; renderPopup(); return; } }
      { const bc = e.target.closest('[data-bchart], [data-bper]'); if (bc && popup === 'trade') { if (bc.dataset.bchart) buyChart = buyChart === bc.dataset.bchart ? null : bc.dataset.bchart; else buyChartW = +bc.dataset.bper; renderPopup(); return; } }
      { const lk = e.target.closest('[data-lgk]'); if (lk && popup === 'ledger') { lgSel = lk.dataset.lgk || null; renderPopup(); return; } }   // 2026-11-20 장부 항목 → 오른쪽 상세
      { const bg = e.target.closest('[data-bgold]'); if (bg && popup === 'trade' && Gm.gqOn(s)) { if (bg.disabled) return; const [id, k] = bg.dataset.bgold.split(':'), r = Gm.setBuyGold(s, id, k === 'auto' ? null : Math.max(1, Math.min(Gm.buyGoldMax(s, id), Gm.matBuyPrice(s, id) + +k))); if (!r.ok) toast(r.why, 'warn'); hooks.changed(); renderPopup(); return; } }
      { const br = e.target.closest('[data-brate]'); if (br && popup === 'trade' && Gm.gqOn(s)) { if (br.disabled) return; const [id, k] = br.dataset.brate.split(':'), st = s.cfg.econ.buyRateStep || 0.05, r = Gm.setBuyRate(s, id, Gm.polRate(s, id) + +k * st); if (!r.ok) toast(r.why, 'warn'); hooks.changed(); renderPopup(); return; } }   // 2026-11-20 결정 52: 소재별 매입가 ±5%
      { const mp = !Gm.gqOn(s) && e.target.closest('[data-mpol], [data-mrate]'); if (mp && popup === 'trade') { const [id, v] = (mp.dataset.mpol || mp.dataset.mrate).split(':'), p = Gm.matPol(s, id), r = mp.dataset.mpol ? Gm.setMatPol(s, id, v, null) : Gm.setMatPol(s, id, 'buy', +v); if (!r.ok) toast(r.why, 'warn'); hooks.changed(); renderPopup(); return; } }   // 2026-11-19 결정 43
      { const cb = e.target.closest('[data-cbuy]'); if (cb && popup === 'trade') { if (cb.disabled) return; const r = Gm.consignBuy(s, +cb.dataset.cbuy); toast(r.ok ? `위탁 소재 ${r.n}개를 ${fmt(r.cost)}G에 사들였습니다.` : r.why, r.ok ? 'grow' : 'warn'); hooks.changed(); renderPopup(); return; } }
      if (popup === 'order' && (Gm.gqOn(s) ? gqClick(e) : orderClick(e))) return;
      if (popup === 'car' && carClick(e)) return;   // 2026-11-20 떠돌이 상단
      if (popup === 'meals') { const kl = e.target.closest('[data-kleft]'); if (kl) { const [n, v] = kl.dataset.kleft.split(':'), r = Gm.setMenuLeft(s, n, v); if (!r.ok) toast(r.why, 'warn'); hooks.changed(); renderPopup(); return; }   // 결정 47
      const kb = e.target.closest('[data-kpr], [data-kpp]'); if (kb) { if (kb.disabled) return; const [n, v] = (kb.dataset.kpr || kb.dataset.kpp).split(':'), d = Gm.DISH.find(x => x.name === n); if (d) { const mu = Gm.menuOf(s, d), r = kb.dataset.kpr ? Gm.setMenu(s, n, v === 'base' ? Gm.dishBase(s, d) : Math.max(1, Math.min(Gm.dishBase(s, d) * 3, mu.price + +v)), null) : Gm.setMenu(s, n, null, mu.prep + +v); if (!r.ok) toast(r.why, 'warn'); hooks.changed(); renderPopup(); } return; } }   // 2026-11-19 결정 37 · 39: 메뉴 가격 · 준비량
      { const c = e.target.closest('[data-ct]'); if (c && popup === 'advs') { if (!c.disabled) contractClick(c.dataset.ct); return; } }
      const t = e.target.closest('[data-psel], [data-lf], [data-build], [data-upg], [data-adv], [data-promo], [data-hold], [data-ctab], [data-atab], [data-kmat], [data-kslot], [data-kcook], [data-opensell], [data-ssel], [data-sone], [data-sall], [data-snf], [data-ftab], [data-place], [data-pmove], [data-tsel], [data-tpick], [data-fbs], [data-rq], [data-rqact], [data-rqnom]'); if (!t) { const o = document.querySelector('.av-ttl.open'); if (o && !e.target.closest('.av-ttl')) o.classList.remove('open'); return; }
      if (t.dataset.rq) { rqSel = t.dataset.rq; rqMsg = ''; renderPopup(); return; }
      if (t.dataset.rqact) { rqAct(t.dataset.rqact); return; }
      if (t.dataset.rqnom) { rqNom(+t.dataset.rqnom); return; }
      if (t.dataset.fbs) { fbSel = t.dataset.fbs; renderPopup(); return; }
      if (t.dataset.tsel) { t.closest('.av-ttl').classList.toggle('open'); return; }
      if (t.dataset.tpick != null) { const a = s.advs.find(x => x.id === openAdv); if (a) { const k = +t.dataset.tpick; if (k < 0) delete a.title; else a.title = k; } renderPopup(); return; }
      if (t.dataset.ftab) { facTab = t.dataset.ftab; renderPopup(); return; }
      if (t.dataset.place) { UI.placeStart(t.dataset.place, null); return; }
      if (t.dataset.pmove) { const it = s.place.items.find(x => x.uid === +t.dataset.pmove); if (it) UI.placeStart(it.id, it.uid); return; }
      if (t.dataset.opensell) { UI.open('sell'); return; }
      if (t.dataset.ssel) { sellSel = t.dataset.ssel; renderPopup(); return; }
      if (t.dataset.sone) { sellDo([t.dataset.sone], false); renderPopup(); return; }
      if (t.dataset.sall) { sellDo([t.dataset.sall], true); renderPopup(); return; }
      if (t.dataset.snf) { sellDo(Object.values(MATS).filter(m => m.line !== 'food').map(m => m.id), true); renderPopup(); return; }
      if (t.dataset.psel) { promoSel = +t.dataset.psel; renderPopup(); return; }
      if (t.dataset.lf) { logFilter = t.dataset.lf; renderPopup(); const l = q('#popBody .gl-list'); if (l) l.scrollTop = 0; return; }
      if (t.dataset.kmat) { if (kSel.length < 3 && !kSel.includes(t.dataset.kmat)) kSel.push(t.dataset.kmat); kMsg = null; renderPopup(); return; }
      if (t.dataset.kslot) { kSel.splice(+t.dataset.kslot, 1); kMsg = null; renderPopup(); return; }
      if (t.dataset.kcook) {   // 큰 솥 연출(약 1.6초) 뒤 결과. 연출 중 식당 아무 곳이나 누르면 바로 결과
        if (kAnim) return;
        const r = Gm.cook(s, kSel);
        if (r.kind === 'known' || r.kind === 'invalid') { kMsg = cookMsg(r); renderPopup(); kToast(kMsg); return; }
        kAnim = { sel: kSel.slice(), r }; kSel = []; kMsg = null; kFx = ''; hooks.changed(); renderPopup();
        kTimer = setTimeout(kitchenDone, 1600); return;
      }
      if (t.dataset.atab) { if (advTab !== t.dataset.atab) advFlip = true; advTab = t.dataset.atab; renderPopup(); return; }
      if (t.dataset.ctab) { codexTab = +t.dataset.ctab; renderPopup(); return; }
      if (t.dataset.build) { Gm.build(s, t.dataset.build); hooks.changed(); }
      if (t.dataset.upg) { Gm.upgrade(s, t.dataset.upg); hooks.changed(); }
      else if (t.dataset.promo) decide(+t.dataset.promo, t.dataset.cls);
      else if (t.dataset.hold) decide(+t.dataset.hold, null);
      else if (t.dataset.adv) { openAdv = +t.dataset.adv; renderPopup(); }
    });
  }

  // 관문 1 검증 (1차와 같은 기준)
  function verify() {
    const b = q('#popBody'); b.innerHTML = '<p class="muted">100판을 돌려 계산하는 중…</p>';
    setTimeout(() => {
      const Sim = root.GuildSim, N = 100; let op = 0, d = 0, f = 0;
      for (let i = 0; i < N; i++) { const g = Gm.newGame(Sim.defaults(), 7000 + i); Gm.autoPlace(g, true); for (let w = 0; w < 48; w++) { Gm.autoRequests(g); /* 리퀘스트 자동 처리 (2026-11-16, 시뮬레이터 reqStep과 같은 규칙) */ Gm.stepWeek(g); Gm.autoCook(g); /* 요리: 재료가 모이면 바로 만든다고 가정 (시뮬레이터와 같음) */ if (g.week % Gm.WPM === 0) Gm.autoPlace(g, false); /* 테이블 자동 배치 (tools/gate1_check.js와 같음) */ } op += g.history.reduce((t, m) => t + m.net, 0) / g.history.length; d += g.stats.done; f += g.stats.fail; }
      const cfg = Sim.defaults(); cfg.run.maxYears = 1; let o2 = 0, d2 = 0, f2 = 0;
      for (let i = 0; i < N; i++) { const r = Sim.simulate(cfg, 'balanced', 7000 + i); o2 += r.firstNetF.reduce((a, c) => a + c, 0) / r.firstNetF.length; d2 += r.qDone; f2 += r.qFail; }
      const gOp = op / N, sOp = o2 / N, gS = d / (d + f), sS = d2 / (d2 + f2);
      const okOp = gOp >= 300 && gOp <= 600 && Math.abs(gOp - sOp) / sOp < 0.1, okS = gS >= 0.65 && gS <= 0.85 && Math.abs(gS - sS) < 0.05;
      const pill = (ok, t) => `<span class="pill2 ${ok ? 'ok' : 'bad'}">${t}</span>`;
      b.innerHTML = `<table><tr><th>지표</th><th class="n">게임</th><th class="n">시뮬레이터</th><th>판정</th></tr>
        <tr><td>첫해 월 운영 순이익</td><td class="n">${fmt(gOp)}G</td><td class="n">${fmt(sOp)}G</td><td>${pill(okOp, okOp ? '통과' : '확인 필요')}</td></tr>
        <tr><td>의뢰 성공률</td><td class="n">${(gS * 100).toFixed(1)}%</td><td class="n">${(sS * 100).toFixed(1)}%</td><td>${pill(okS, okS ? '통과' : '확인 필요')}</td></tr></table>
        <p class="muted">전직 규칙(3-A)과 명성이 더해졌지만 첫해에는 영향이 작아 1차와 비슷한 결과가 나와야 합니다. 시뮬레이터에도 같은 명성 규칙을 넣었습니다.</p>`;
    }, 30);
  }

  // ---------- 리나 대화 (M2-11) ----------
  const DLG_WAIT = 1.0; // 하단 HUD가 다 내려간 뒤(초) 대사창이 나타난다
  const Dlg = { open: false, lines: [], cur: null, shown: 0, t: 0, hold: 0, wait: 0, gap: 0 };
  // 2026-11-19 사용자: 리퀘스트 대사가 이어서 오면 한 대화처럼 보임 → UI.say 한 번 = 한 장면. 앞 장면이 끝나면 대화창을 닫고 HUD가 돌아온 뒤(DLG_GAP초)
  //   다음 장면을 다시 「HUD 빠짐 → 대화 → 대화 끝 → HUD 원위치」 순서로 시작. 장면 사이는 {brk} 줄로 표시
  const DLG_GAP = 2.2;   // HUD가 원위치로 돌아오는 시간(지연 0.3 + 0.9초) + 약 1초 쉼
  // 대화 장면 (data/dialog.csv): 장면 이름과 {변수} 값으로 [{face, text}] 를 만든다
  UI.lines = function (id, vars) {
    const D = (root.GAME_DATA && root.GAME_DATA.dialog) || {};
    const josaFill = (k, sfx, v) => { if (!sfx) return v; const [a, b] = sfx.split('/'); const c = String(v).charCodeAt(String(v).length - 1); const bat = c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0; return v + (bat ? a : b); };   // {cls:이에요/예요} → 받침이면 앞, 없으면 뒤 (2026-11-16 대사 검수 D12 · T175)
    return (D[id] || []).map(l => ({ face: l.face, text: l.text.replace(/\{(\w+)(?::([^}]+))?\}/g, (m0, k, sfx) => vars && vars[k] != null ? josaFill(k, sfx, vars[k]) : m0) }));
  };
  // ---------- 계약 흐름 (2026-11-19 사용자 결정 10 ② ⑤ ⑥ · 시안 docs/design/mockups/test_1119/4 · 5) ----------
  //   ⑤ 끝나기 2주 전(갱신할 수 있게 되는 주) 리나가 기록창에 알림 · ⑥ 계약이 끝나거나 갱신되면 결산 카드 (게임 game_core.js 의 s.ctDone)
  function ctWatch() {
    if (!s) return;
    for (const a of s.advs) { const c = a.contract; if (!a.alive || !c || c.next || s.week !== c.end - 1 || c.warned === c.end) continue;
      c.warned = c.end; UI.chat('리나', `마스터, ${a.name} 씨 계약이 2주 뒤에 끝나요. 갱신하시려면 모험가 장 「계약 제안」에서 조건을 정해 주세요.`, 'lina'); }
    const q_ = s.ctDone || []; if (!q_.length || document.querySelector('.ctEnd, .gupG') || UI.dlgBusy() || popup) return;   // 대화 · 창이 끝난 뒤 다음 주에 띄움
    const r = q_.shift(), guild = r.fee - r.pay - r.sup, rec = r.done + r.fail;
    const sp0 = curSp; hooks.setSpeed && hooks.setSpeed(0);
    const m = document.createElement('div'); m.className = 'ctEnd gupG';
    m.innerHTML = `<div class="gupG-card"><div class="sub">${r.weeks}주 계약이 ${r.how === 'renew' ? '끝나고 새 계약으로 이어져요' : '끝났어요'} (${r.start}주 ~ ${r.end}주)</div><h2 style="font-size:30px">${esc(r.name)} · 계약 결산</h2>
      <div class="ctR"><span>함께 한 의뢰</span><span>성공 ${r.done} · 실패 ${r.fail} · 지명 ${r.nom}번</span><b>${rec}건</b></div>
      <div class="ctR"><span>${esc(r.name)} 수입</span><span>의뢰 실수령 ${fmt(r.net)}G + 월 보수 ${fmt(r.pay)}G + 지원 ${fmt(r.sup)}G</span><b>${fmt(r.net + r.pay + r.sup)}G</b></div>
      <div class="ctR"><span>길드 몫</span><span>계약 수수료 ${fmt(r.fee)}G − 보수 ${fmt(r.pay)}G − 지원 ${fmt(r.sup)}G</span><b class="${guild < 0 ? 'neg' : ''}">${guild >= 0 ? '+' : ''}${fmt(guild)}G</b></div>
      ${r.att0 != null ? `<div class="ctR"><span>애착</span><span>${attStage(r.att0)} → ${attStage(r.att1)}</span><b>${r.att0} → ${r.att1}</b></div>` : ''}
      <div class="lina"><i class="f"></i><span><b>리나</b> “${r.how === 'renew' ? `${esc(r.name)} 씨, 다음 계약도 잘 부탁해요!` : guild >= 0 ? `${esc(r.name)} 씨, 이번 계약 동안 정말 든든했어요.` : `${esc(r.name)} 씨 덕분에 의뢰는 잘 됐지만, 보수가 수수료보다 많았어요.`}”</span></div>
      <button class="ux-btn primary" data-ct="ok">확인</button>${r.how === 'end' && s.advs.some(a => a.id === r.id && a.alive) ? ' <button class="ux-btn" data-ct="re">다시 계약 제안</button>' : ''}</div>`;
    stage.ui.appendChild(m); requestAnimationFrame(() => m.classList.add('on'));
    const close = () => { m.classList.remove('on'); setTimeout(() => m.remove(), 300); hooks.setSpeed && hooks.setSpeed(sp0 || 1); };
    m.querySelector('[data-ct="ok"]').onclick = close;
    const re = m.querySelector('[data-ct="re"]'); if (re) re.onclick = () => { close(); openAdv = r.id; UI.open('advs'); setTimeout(() => { openAdv = r.id; const t = document.querySelector('[data-sub="advs:contract"]'); if (t) t.click(); }, 50); };
  }
  const attStage = v => v >= 90 ? '토박이' : v >= 60 ? '동반자' : v >= 30 ? '새내기' : '방랑자';
  { const st_ = document.createElement('style'); st_.textContent = `.ctEnd .ctR{display:grid;grid-template-columns:120px 1fr 92px;gap:8px;text-align:left;font-size:16px;padding:6px 4px;border-bottom:1px dashed rgba(122,74,40,.25)}.ctEnd .ctR b{text-align:right}.ctEnd .ctR b.neg{color:#b5302a}.ctEnd .ctR span:nth-child(2){color:#6b4a2e;font-size:14.5px}
.bk-av .ct-bar{display:block;width:120px;height:5px;margin-top:3px;border-radius:3px;background:rgba(110,72,36,.2);overflow:hidden}.bk-av .ct-bar i{display:block;height:100%;background:#2f6a52}.bk-av .ct-bar.end i{background:#c9963e}`; document.head.appendChild(st_); }
  // ---------- 길드 승급 카드 (2026-11-19 사용자 결정 17 · 시안 docs/design/mockups/test_1119/6_grade.png) ----------
  //   침공 결과 창 「확인」 뒤 invasion.js가 부름. 배지 바뀜 · 리나 한마디 · 새로 열린 것 · 보상 → 「확인」을 누르면 배지가 왼쪽 위 등급 자리로 날아감. 그동안 시간 멈춤
  //   팡파르: 게임에 효과음 파일이 아직 없어 넣지 않음 (효과음이 생기면 여기서 재생)
  const GUP_LINA = ['', '해냈어요, 마스터! 이제 우리 길드도 어엿한 E급이에요!', '마스터, D급이래요! 마을 사람들이 우리 얘기만 해요!', 'C급… 이제 왕국에서도 우리 길드를 알아요!', 'B급이에요! 꿈만 같아요, 마스터.', 'A급… 마스터, 우리 정말 대단해요!', 'S급! 세상에서 제일 이름난 길드가 됐어요!'];
  UI.gradeUp = function (g) {
    if (!s || g < 1 || (s.gupShown || 0) >= g) return; s.gupShown = g; const old = g - 1, cap0 = Gm.advCap(Object.assign({}, s, { grade: old })), cap1 = Gm.advCap(s), R = (s.main && s.main.result) || {};
    const facs = Object.keys(Gm.FAC_COST).filter(f => Gm.FAC_COST[f] === g).map(f => FAC_LABEL[f] || FACNAME[f] || f);
    const list = [...facs.map(f => `<li><b>새로 열림</b> · ${esc(f)} 건설</li>`), cap1 > cap0 ? `<li><b>늘어남</b> · 모험가 정원 ${cap0} → ${cap1}명</li>` : '', `<li><b>새로 열림</b> · ${GR[g]}급 의뢰 · ${GR[g]}급 장비</li>`,
      R.gold || R.fame ? `<li><b>보상</b> · ${R.gold ? fmt(R.gold) + 'G' : ''}${R.gold && R.fame ? ' · ' : ''}${R.fame ? '명성 +' + R.fame : ''}</li>` : ''].join('');
    const sp0 = curSp; hooks.setSpeed && hooks.setSpeed(0);
    const m = document.createElement('div'); m.className = 'gupG';
    m.innerHTML = `<div class="gupG-card"><div class="sub">영주님이 길드를 인정했습니다</div><h2>${GR[g]}급 길드 승급!</h2>
      <div class="bds"><i class="bd old" style="background-image:url(assets/ui/hud/badge_${GR[old]}.png)"></i><span class="ar">➜</span><i class="bd new" style="background-image:url(assets/ui/hud/badge_${GR[g]}.png)"></i></div>
      <div class="lina"><i class="f"></i><span><b>리나</b> “${esc(GUP_LINA[g] || GUP_LINA[1])}”</span></div><ul>${list}</ul><button class="ux-btn primary" data-gup="ok">확인</button></div>`;
    stage.ui.appendChild(m); requestAnimationFrame(() => m.classList.add('on'));
    m.querySelector('[data-gup]').onclick = () => {
      const bd = m.querySelector('.bd.new'), to = q('#hGrade'), ur = stage.ui.getBoundingClientRect(), k = ur.width / 1920 || 1;
      if (bd && to) { const a = bd.getBoundingClientRect(), b = to.getBoundingClientRect(), fly = bd.cloneNode(); fly.className = 'gupG-fly'; fly.style.cssText += `;left:${(a.left - ur.left) / k}px;top:${(a.top - ur.top) / k}px;width:${a.width / k}px;height:${a.height / k}px`;
        stage.ui.appendChild(fly); requestAnimationFrame(() => { fly.style.left = (b.left - ur.left) / k + 'px'; fly.style.top = (b.top - ur.top) / k + 'px'; fly.style.width = b.width / k + 'px'; fly.style.height = b.height / k + 'px'; });
        setTimeout(() => { fly.remove(); to.classList.add('gupG-pop'); setTimeout(() => to.classList.remove('gupG-pop'), 700); UI.hud(); }, 750); }
      m.classList.remove('on'); setTimeout(() => m.remove(), 300); hooks.setSpeed && hooks.setSpeed(sp0 || 1);
    };
  };
  { const st_ = document.createElement('style'); st_.textContent = `.gupG{position:absolute;inset:0;z-index:45;background:rgba(18,10,4,.6);display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .3s}.gupG.on{opacity:1}
.gupG-card{width:640px;background:#fbf3e2;border:3px solid #b8862e;border-radius:18px;padding:26px 34px;color:#3b2a1e;box-shadow:0 12px 40px rgba(0,0,0,.4);text-align:center;transform:scale(.9);transition:transform .35s cubic-bezier(.3,1.6,.5,1)}.gupG.on .gupG-card{transform:none}
.gupG-card h2{margin:6px 0 4px;font-size:36px;letter-spacing:2px}.gupG-card .sub{color:#8a6a4a;font-size:15px}
.gupG-card .bds{display:flex;align-items:center;justify-content:center;gap:24px;margin:14px 0 6px}.gupG-card .bd{width:100px;height:100px;background:center/contain no-repeat}.gupG-card .bd.old{opacity:.4;transform:scale(.8)}
.gupG-card .bd.new{filter:drop-shadow(0 0 14px #ffd75e);animation:gupGin .9s .3s both}.gupG-card .ar{font-size:30px;color:#b8862e}
@keyframes gupGin{0%{transform:scale(0) rotate(-180deg);opacity:0}70%{transform:scale(1.2)}100%{transform:none;opacity:1}}
.gupG-card .lina{display:flex;gap:12px;align-items:center;text-align:left;background:#fff;border-radius:12px;padding:10px 14px;margin:12px 0;font-size:16px}
.gupG-card .lina .f{width:60px;height:60px;border-radius:50%;flex:none;border:2px solid #d9a066;background:url(assets/npc/lina_face_smile.png) -38px -34px/auto 256px no-repeat #f1d9c0}
.gupG-card ul{text-align:left;margin:10px 0 14px;padding:0;list-style:none}.gupG-card li{padding:6px 10px;border-bottom:1px dashed rgba(122,74,40,.3);font-size:17px}.gupG-card li b{color:#2f6a52}
.gupG-fly{position:absolute;z-index:46;background:center/contain no-repeat;transition:all .7s cubic-bezier(.5,0,.3,1)}.gupG-pop{animation:gupGpop .7s}@keyframes gupGpop{40%{transform:scale(1.5);filter:drop-shadow(0 0 10px #ffd75e)}}`; document.head.appendChild(st_); }
  UI.say = function (lines) { // [{face:'smile', text:'…'}, …]
    if (!lines || !lines.length) return;
    if (Dlg.cur || Dlg.lines.length || Dlg.gap > 0) Dlg.lines.push({ brk: true });   // 앞 장면이 아직 있으면 장면 나눔
    Dlg.lines.push(...lines);
    if (!Dlg.open && !(Dlg.gap > 0)) next();
  };
  // 리나 초상: 눈 뜬 상반신 + 얼굴 조각(뜸·반쯤·감김)을 캔버스에 겹쳐 그린다. 그림이 없으면 예전 lina_face_* 한 장으로 대신한다.
  const BLINK = { rows: ['smile', 'serious', 'laugh', 'worried', 'awkward', 'surprised'], x: 117, y: 116, w: 97, h: 93 };
  const BLINK_SEQ = [[1, 0.05], [2, 0.07], [1, 0.05]]; // [칸, 지속초] : 뜸 → 반쯤 → 감김 → 반쯤 → 뜸
  Dlg.expr = 'smile'; Dlg.bs = 0; Dlg.bt = 0; Dlg.bi = -1; Dlg.bnext = 2.5;
  // 2026-11-16: 의뢰인 NPC 8명도 같은 방식 (root.NPC_PORTRAITS). Dlg.who = 'lina' 또는 NPC 이름
  const okImg = k => { const a = root.Assets.items; return !!(a[k] && a[k].ok); };
  const npcOf = name => { const P = root.NPC_PORTRAITS && root.NPC_PORTRAITS[name]; return P && okImg(P.key + '_stand') && okImg(P.key + '_blink') ? P : null; };
  const standOK = () => Dlg.who && String(Dlg.who).startsWith('adv:') ? false : Dlg.who && Dlg.who !== 'lina' ? !!npcOf(Dlg.who) : okImg('lina_stand') && okImg('lina_blink');
  function drawStand() {
    const a = root.Assets.items, c = q('#dlgStand'), g = c.getContext('2d');
    if (Dlg.who && String(Dlg.who).startsWith('adv:')) return;   // 모험가 상반신은 setAdv 가 그림
    if (Dlg.who && Dlg.who !== 'lina') {   // 의뢰인: 표정 1가지(눈 조각 1줄)
      const P = npcOf(Dlg.who); if (!P) return; const [x, y, w, h] = P.eye;
      if (c.width !== P.w || c.height !== P.h) { c.width = P.w; c.height = P.h; }
      g.clearRect(0, 0, c.width, c.height); g.drawImage(a[P.key + '_stand'].img, 0, 0);
      g.drawImage(a[P.key + '_blink'].img, Dlg.bs * w, 0, w, h, x, y, w, h); return;
    }
    if (c.width !== 341 || c.height !== 640) { c.width = 341; c.height = 640; }
    const r = Math.max(0, BLINK.rows.indexOf(Dlg.expr));
    g.clearRect(0, 0, c.width, c.height); g.drawImage(a.lina_stand.img, 0, 0);
    g.drawImage(a.lina_blink.img, Dlg.bs * BLINK.w, r * BLINK.h, BLINK.w, BLINK.h, BLINK.x, BLINK.y, BLINK.w, BLINK.h);
  }
  // 2026-11-19 모험가 대사 일러스트 (사용자: C 상반신) — assets/chr/bust/{직업}_{f|m}.webp (높이 640, 원본 archive/art_source/illustrations, 배경 지움). 눈 깜빡임 없음
  const BUST = {}, bustKey = a => ['warrior', 'archer', 'mage', 'cleric', 'rogue'][a.core] + '_' + (a.id % 2 ? 'm' : 'f');   // 성별 = 얼굴 그림(faceStyle)과 같은 규칙
  const bustImg = a => { const k = bustKey(a); if (!BUST[k]) { const im = new Image(); im.src = 'assets/chr/bust/' + k + '.webp'; BUST[k] = im; } return BUST[k]; };
  function setAdv(a) {
    if (!a || a.core == null) return false; const im = bustImg(a);
    const draw = () => { if (Dlg.who !== 'adv:' + a.id) return; const c = q('#dlgStand'), g = c.getContext('2d'); if (c.width !== im.naturalWidth || c.height !== im.naturalHeight) { c.width = im.naturalWidth; c.height = im.naturalHeight; } g.clearRect(0, 0, c.width, c.height); g.drawImage(im, 0, 0); };
    Dlg.who = 'adv:' + a.id; Dlg.expr = 'adv'; q('#dlgStand').hidden = false; q('#dlgFace').hidden = true;
    if (im.complete && im.naturalWidth) draw(); else { q('#dlgStand').getContext('2d').clearRect(0, 0, 9999, 9999); im.onload = draw; }
    return true;
  }
  function setNpc(name) {   // 의뢰인 초상으로 바꿈 (그림이 없으면 false)
    if (!npcOf(name)) return false;
    Dlg.who = name; Dlg.expr = 'npc'; Dlg.bs = 0; Dlg.bi = -1; Dlg.bnext = 1.5 + Math.random() * 2;
    q('#dlgStand').hidden = false; q('#dlgFace').hidden = true; drawStand(); return true;
  }
  function setFace(face) {
    const a = root.Assets.items, old = a['lina_face_' + face];
    Dlg.who = 'lina';
    if (standOK()) {
      Dlg.expr = face; Dlg.bs = 0; Dlg.bi = -1; Dlg.bnext = 2 + Math.random() * 2;
      q('#dlgStand').hidden = false; q('#dlgFace').hidden = true; drawStand(); return;
    }
    q('#dlgStand').hidden = true; q('#dlgFace').hidden = false;
    old && (q('#dlgFace').src = old.img.src || old.img.toDataURL());
  }
  function blinkTick(dt) { // 2.5~5.5초마다 한 번, 가끔(15%) 연달아 두 번. 웃는 눈(laugh)은 깜빡이지 않는다
    if (!standOK() || Dlg.expr === 'laugh') return;
    if (Dlg.bi < 0) { if ((Dlg.bnext -= dt) > 0) return; Dlg.bi = 0; Dlg.bt = 0; }
    Dlg.bt += dt; const st = BLINK_SEQ[Dlg.bi];
    if (Dlg.bt >= st[1]) { Dlg.bt -= st[1]; Dlg.bi++; }
    const bs = Dlg.bi >= BLINK_SEQ.length ? 0 : BLINK_SEQ[Dlg.bi][0];
    if (Dlg.bi >= BLINK_SEQ.length) { Dlg.bi = -1; Dlg.bnext = Math.random() < 0.15 ? 0.15 : 2.5 + Math.random() * 3; }
    if (bs !== Dlg.bs) { Dlg.bs = bs; drawStand(); }
  }
  function next() {
    let L = Dlg.lines.shift();
    while (L && (L.fn || (L.brk && !Dlg.cur))) { if (L.fn) { try { L.fn(); } catch (e) { console.error(e); } } L = Dlg.lines.shift(); }   // 2026-11-18 튜토리얼: {fn} 줄 = 대사 사이에서 실행할 일 (대사창에는 안 나옴) · 장면 첫머리의 {brk}는 건너뜀
    if (L && L.brk) { Dlg.gap = DLG_GAP; L = null; }   // 장면 끝: 대화창을 닫고 HUD가 돌아올 때까지 쉼 (남은 줄은 그대로)
    if (!L) { Dlg.open = false; Dlg.cur = null; Dlg.wait = 0; q('#dlg').classList.remove('open'); q('#logBox').classList.remove('hide'); stage.ui.classList.remove('dlgOn'); root.Lina.chatting = false; return; }
    Dlg.open = true; Dlg.cur = L; Dlg.shown = 0; Dlg.t = 0; Dlg.hold = 0;
    const first = !stage.ui.classList.contains('dlgOn');
    if (first) { Dlg.wait = DLG_WAIT; Dlg.t = 0; } else q('#dlg').classList.add('open');
    q('#logBox').classList.add('hide'); stage.ui.classList.add('dlgOn');
    const spk = L.name || '리나'; q('#dlgName').textContent = spk; UI.chat(spk, L.text, spk === '리나' ? 'lina' : null, L.adv || null);   // 2026-11-16: 리나가 아닌 화자(의뢰인 · 모험가)는 이름표만 (NPC 초상은 그림이 들어오면 연결)
    const npc = spk !== '리나' && (setNpc(spk) || setAdv(L.adv));   // 의뢰인 8명은 초상 + 눈 깜빡임 (2026-11-16) · 모험가는 상반신 일러스트 (2026-11-19)
    if (spk === '리나') setFace(L.face); else if (!npc) { Dlg.who = null; q('#dlgStand').hidden = true; q('#dlgFace').hidden = true; }
    q('#dlg').classList.toggle('noface', spk !== '리나' && !npc);
    q('#dlgText').textContent = ''; q('#dlgNext').hidden = true;
  }
  UI.advance = function () {
    if (!Dlg.cur || Dlg.wait > 0) return;
    if (Dlg.shown < Dlg.cur.text.length) { Dlg.shown = Dlg.cur.text.length; q('#dlgText').textContent = Dlg.cur.text; q('#dlgNext').hidden = false; }
    else next();
  };
  UI.update = function (dt) { // 글자 타이핑: 초당 약 28자. 다 나오면 8초 뒤 자동으로 넘어감 (게임은 멈추지 않음)
    if (!Dlg.cur && Dlg.gap > 0) { if ((Dlg.gap -= dt) <= 0) { Dlg.gap = 0; if (Dlg.lines.length) next(); } return; }   // 장면 사이 쉼
    if (rqdQ.length && !rqdOn && !Dlg.cur) rqdNext();   // 리퀘스트 완료 카드: 대사가 다 끝난 뒤
    if (carOpenQ && !Dlg.cur && !Dlg.lines.length && !(Dlg.gap > 0) && !popup && !rqdOn) { carOpenQ = false; if (Gm.carHere(s).length) UI.open('car'); }   // 상단 도착 대화 뒤 상단 화면
    if (!Dlg.cur) return;
    blinkTick(dt);
    if (Dlg.wait > 0) { Dlg.wait -= dt; if (Dlg.wait <= 0) q('#dlg').classList.add('open'); root.Lina.chatting = true; return; }
    root.Lina.chatting = Dlg.shown < Dlg.cur.text.length;
    if (Dlg.shown < Dlg.cur.text.length) {
      Dlg.t += dt; const n = Math.min(Dlg.cur.text.length, Math.floor(Dlg.t * 28));
      if (n !== Dlg.shown) { Dlg.shown = n; q('#dlgText').textContent = Dlg.cur.text.slice(0, n); if (n >= Dlg.cur.text.length) q('#dlgNext').hidden = false; }
    } else if ((Dlg.hold += dt) > 8) next();
  };
  UI.monthlyReport = function () { // 1차의 월간 보고 문장을 표정과 함께
    const m = s.lastMonth; if (!m) return;
    const succ = m.quests ? Math.round(m.success / m.quests * 100) : 0, out = [];
    const v = { net: fmt(m.net), loss: fmt(-m.net), quests: m.quests, success: m.success, rate: succ, meal: fmt(m.meal), advs: s.advs.filter(a => a.alive).length };
    if (m.net < 0) out.push(...UI.lines('monthly_deficit', v));
    else if (m.net >= 500 && succ >= 60) out.push(...UI.lines('monthly_good', v), ...(m.meal > 0 ? UI.lines('monthly_meal', v) : []));
    else if (succ < 60 && m.quests > 0) out.push(...UI.lines('monthly_low', v));
    else out.push(...UI.lines('monthly_normal', v));
    UI.say(out);
  };
  // 2026-11-19: 길드 승급은 위의 승급 카드(UI.gradeUp)로 바뀜. 예전 리나 대화(dialog.csv gradeup)는 카드 안 리나 한마디로 대신함
  // UI.gradeUp = g => UI.say(UI.lines('gradeup', { grade: GR[g] }));

  root.UI = UI;
})(this);
