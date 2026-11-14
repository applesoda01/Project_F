/* 화면 틀과 대화 (2-B)
   M2-9  겹침 UI: 네 모서리(상태 · 배속/메뉴 · 개발 · 기능 버튼) + 알림 + 공통 팝업 틀
   M2-10 팝업: 게시판(칸 배분 · 의뢰 · 나가 있는 파티) · 장부 · 모험가 · 시설 · 식당 · 기록 — 1차 기능을 옮김
   M2-11 리나 대화: 표정 6종 전환, 글자 타이핑, 월간 보고·등급 승급·첫 인사 */
(function (root) {
  'use strict';
  const Gm = root.GuildGame, GR = Gm.GR;
  const fmt = n => Math.round(n).toLocaleString();
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
      if ((e.key === ' ' || e.key === 'Enter') && Dlg.open && !popup) { e.preventDefault(); UI.advance(); }
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
  UI.hud = function () {
    { const sb = q('#mSellBtn'); if (sb) sb.classList.toggle('lock', !s.built['판매창구']); }   // 판매창구를 짓기 전에는 회색
    q('#hDate').textContent = Gm.dateLabel(s.week);
    q('#hGrade').style.backgroundImage = 'url(assets/ui/hud/badge_' + GR[s.grade] + '.png)'; q('#hGrade').title = '길드 등급 ' + GR[s.grade];
    q('#hGold').textContent = fmt(s.gold); q('#hGold').classList.toggle('neg', s.gold < 0);
    q('#hTrust').textContent = Math.round(s.trust);
    { const t = Math.max(0, Math.min(100, s.trust)), st = Math.min(4, Math.floor(t / 20)), bar = q('#hTrustBar'), face = q('#hTrustFace'), box = q('#hTrustBox');   // 신뢰도: 리나 표정(5단계) + 50 기준 양쪽 막대(붉은색 → 초록)
      const NAME = ['화남', '불만', '보통', '만족', '아주 만족'], QN = ['30~50', '45~65', '65~85', '80~100', '100~120'], QR = ['80~90', '85~95', '95~105', '105~115', '110~120'];
      if (face && face.dataset.st !== String(st)) { face.dataset.st = st; face.src = 'assets/ui/hud/trust/trust_' + st + '.png'; }
      if (bar) { const d = (t - 50) / 50; bar.style.left = d >= 0 ? '50%' : (50 + d * 50) + '%'; bar.style.width = Math.abs(d) * 50 + '%'; bar.style.background = `hsl(${Math.round(t * 1.2)},62%,42%)`; }
      if (box) box.title = `신뢰도 ${Math.round(t)} · ${st + 1}단계 ${NAME[st]}\n의뢰 수 ${QN[st]}% · 보상·경험치 ${QR[st]}%`; }
    { const A = s.cfg.adv || {}, step = A.fameStep || 10, f = s.fame || 0, n = s.advs.filter(a => a.alive).length;   // 명성: 다음 모험가까지 막대 · 모험가: 인원 / 등급 상한
      const cap = Gm.advCap(s), GL = 'FEDCBAS'[s.grade] || 'F', full = n >= cap;
      const into = f - Math.floor(f / step) * step, left = Math.ceil((step - into) * 10) / 10;
      q('#hFame').textContent = Math.floor(f);
      const fb = q('#hFameBar'), fw = q('#hFameBarW'), fx = q('#hFameBox');
      if (fb) fb.style.width = (full ? 100 : into / step * 100) + '%';
      if (fw) fw.classList.toggle('cap', full);
      if (fx) fx.title = full ? `명성 ${Math.floor(f)} · 모험가가 등급 상한(${cap}명)이라 새 모험가가 오지 않음\n길드 등급이 오르면 다시 찾아옴` : `명성 ${Math.floor(f)} · 명성 ${step}마다 새 모험가 1명\n다음 모험가까지 명성 ${left}`;
      q('#hAdv').textContent = n;
      const ac = q('#hAdvCap'), ax = q('#hAdvBox');
      if (ac) { ac.textContent = ' / ' + cap; ac.classList.toggle('full', full); }
      if (ax) ax.title = `모험가 ${n}명 · ${GL}급 길드 상한 ${cap}명`; }
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
    const offS = () => { clearTimeout(tm); tm = setTimeout(() => { if (!box.classList.contains('drag')) { box.classList.remove('show'); ll.scrollTop = ll.scrollHeight; } }, 350); };
    box.addEventListener('mouseover', e => { if (e.target.closest('.ln, .lg, .ll')) on(); });
    box.addEventListener('mouseout', e => { if (!e.relatedTarget || !box.contains(e.relatedTarget) || !e.relatedTarget.closest('.ln, .lg, .ll')) offS(); });
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
    ledger: ['결산', 't-gold'], build: ['건설', 't-gray'], unlock: ['발견', 't-gold'], grow: ['성장', 't-ok'], promo: ['전직', 't-new'], expire: ['기한', 't-gray'], withdraw: ['취소', 't-gray'] };
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
  UI.onLogs = function (logs) { // 새 기록들 (오래된 것부터)
    const gups = logs.filter(L => L.gup).map(L => L.gup); if (gups.length) gupShow(gups);   // 2026-11-12 모험가 승급 축하 카드
    for (const L of logs) {
      UI.logLine(L.text, L.kind); // 로그박스로 흘려보냄 (알림은 전직 제안만 따로 띄움)
      if (L.kind === 'promo' && L.text.includes('제안합니다')) toast(L.text, L.kind);
      if (L.kind === 'ledger' && UI.autoReport) UI.open('ledger');   // 월말: 리나 브리핑 대신 장부 창을 보여 준다
      if (L.kind === 'promo' && L.text.includes('제안합니다')) { const nm = L.text.split(/[이가] \d차/)[0]; UI.say(UI.lines('promo_ready', { name: nm })); }
    }
  };

  // ---------- 모험가 승급 축하 카드 (2026-11-12) ----------
  // 같은 주에 승급한 모험가를 카드 하나에 모음. 게임은 멈추지 않고, 확인을 누르거나 바깥을 누르면 닫힘. 여러 주가 쌓이면 차례로 보여 줌
  const gupQ = []; let gupEl = null;
  const STAT_NM = ['힘', '민첩', '지력', '정신', '기교'];
  function gupShow(list) { gupQ.push(list); if (!gupEl || !gupEl.classList.contains('on')) gupNext(); }
  function gupNext() {
    const list = gupQ.shift(); if (!list) { if (gupEl) gupEl.classList.remove('on'); return; }
    if (!gupEl) { gupEl = document.createElement('div'); gupEl.id = 'gupLay'; stage.ui.appendChild(gupEl); gupEl.addEventListener('pointerdown', e => { if (e.target === gupEl || e.target.closest('[data-gup-ok]')) gupNext(); }); }
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
      <button class="ux-btn gup-ok" data-gup-ok>확인</button></div>`;
    gupEl.classList.remove('on'); void gupEl.offsetWidth; gupEl.classList.add('on');
  }
  UI.gupShow = gupShow;   // 시험용

  // ---------- 팝업 틀 ----------
  // ---------- 길드 업무 일지 (책 팝업, 2026-11-13 단계 ①) ----------
  // 왼쪽 큰 책갈피 6장 = 장, 쪽 위 작은 탭 = 장 안의 팝업. 허브 버튼은 그대로 UI.open(이름) → 해당 장이 펼쳐진 채 열림
  const BOOK = [
    { id: 'quest', name: '의뢰', col: '#8e2f3a', pops: ['board'] },
    { id: 'req', name: '리퀘스트', col: '#2f7f7a', pops: ['req'] },
    { id: 'adv', name: '모험가', col: '#b38a26', pops: ['advs', 'promo'] },
    { id: 'fac', name: '시설', col: '#566d84', pops: ['fac'] },
    { id: 'food', name: '음식', col: '#b0612e', pops: ['meals'] },   // 2026-11-13: 경영 장에서 분리 (사용자 결정)
    { id: 'mgmt', name: '경영', col: '#66763a', pops: ['ledger', 'sell', 'codex', 'log'] },
    { id: 'opt', name: '설정', col: '#6a4785', pops: ['opts'] },
  ];
  const SUB_NAME = { board: '게시판', req: '리퀘스트', advs: '명부', 'advs:career': '경력', promo: '전직 제안', fac: '시설', ledger: '장부', meals: '음식 설정', sell: '소재 판매', codex: '도감', log: '기록', opts: '설정' };
  const chapterOf = name => BOOK.find(c => c.pops.includes(name)) || null;
  function bookInit() {
    const mk = q('#bookMarks'); if (!mk || mk.childElementCount) return;
    mk.innerHTML = BOOK.map(c => `<button data-ch="${c.id}" style="--bm:${c.col}"><i>${c.name}</i></button>`).join('');
    mk.onclick = e => { const b = e.target.closest('[data-ch]'); if (!b) return; const c = BOOK.find(x => x.id === b.dataset.ch); if (c && !c.pops.includes(popup)) UI.open(c.pops.find(p => p !== 'sell' || s.built['판매창구']) || c.pops[0]); };
    q('#bookSub').onclick = e => { const b = e.target.closest('[data-sub]'); if (!b) return; const sub = b.dataset.sub;
      if (sub === 'advs' || sub === 'advs:career') { advView = sub === 'advs:career' ? 'career' : 'detail'; if (popup === 'advs') { renderPopup(); bookSync('advs'); } else UI.open('advs'); return; }   // 모험가 장: 명부 ↔ 경력 (같은 팝업, 오른쪽 쪽만 바뀜)
      if (sub !== popup) UI.open(sub); };
    q('#bookRibbon').onclick = () => UI.closeFx();
  }
  function bookSync(name) {
    bookInit(); const c = chapterOf(name);
    q('#bookMarks').querySelectorAll('[data-ch]').forEach(b => b.classList.toggle('on', !!c && b.dataset.ch === c.id));
    q('#bookTitle').textContent = c ? c.name : (TITLES[name] || '');
    { const on = q('#bookMarks [data-ch].on'); q('#bookSub').style.setProperty('--bm', on ? getComputedStyle(on).getPropertyValue('--bm') : '#8a6a46'); }   // 오른쪽 책갈피 색 = 지금 장 색
    const subs = c ? (c.id === 'adv' ? [['advs', name === 'advs' && advView !== 'career'], ['advs:career', name === 'advs' && advView === 'career'], ['promo', name === 'promo']] : c.pops.map(p => [p, p === name])) : [];   // 모험가 장: 명부 · 경력 · 전직 제안
    q('#bookSub').innerHTML = subs.length > 1 ? subs.map(([p, on]) => `<button data-sub="${p}" class="${on ? 'on' : ''}">${(SUB_NAME[p] || TITLES[p]).replace(/ /g, '')}</button>`).join('') : '';
  }
  // ---------- 책: 경영 장 정렬 (2026-11-13) — 기존 화면을 그대로 그린 뒤 왼쪽 / 오른쪽 쪽으로 나눠 담음 (쪽마다 원래 바깥 상자 class를 붙여 스타일 유지) ----------
  function mgBook(b, kind) {
    if (!document.getElementById('pop').classList.contains('book')) return;
    const $ = sel => b.querySelector(sel), mk = (tag, cls, html) => { const e = document.createElement(tag); e.className = cls; if (html) e.innerHTML = html; return e; };
    let inner = '', L = [], Rn = [];
    if (kind === 'ledger') { const lg = $('.lg-book'); if (!lg) return; inner = 'lg-book'; Rn = [lg.querySelector('.lg-chart')]; L = [...lg.children].filter(x => x !== Rn[0]); }
    else if (kind === 'meals') { const k = $('.kitchen'); if (!k) return; inner = 'kitchen'; const p = [...k.children]; L = p.slice(0, 1); Rn = p.slice(1); }   // 왼쪽 = 소재 보관함 / 오른쪽 = 조리대 + 메뉴판 (2026-11-13)
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
  function reqHtml() {   // 리퀘스트 장: 서브 퀘스트 디자인 전 빈 장 (docs/design/named_sub_quest_v1.md)
    return `<div class="bk-empty"><div><b>리퀘스트</b>마을 사람·영주·모험가가 맡기는 부탁이<br>이 장에 모입니다.</div><div><b>준비 중</b>서브 퀘스트(기부·납품·토벌 지명 등)를<br>디자인한 뒤 채워집니다.</div></div>`;
  }
  const TITLES = { req: '리퀘스트', sell: '소재 판매 창구', promo: '전직 제안', board: '의뢰 게시판', ledger: '장부', advs: '모험가', fac: '건설', meals: '식당', log: '길드 기록', codex: '도감', verify: '관문 1 검증', opts: '설정' };
  UI.open = function (name) {
    if (name === 'sell' && !s.built['판매창구']) { toast('판매 창구를 먼저 지어야 합니다. (로비의 판매 창구를 눌러 설치)', 'info'); return; }
    const wasOpen = q('#popBack').classList.contains('open'), prev = popup;
    const go = () => {
      popup = name; q('#popTitle').textContent = TITLES[name];
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
  UI.closeFx = function () { if (root.BookFX && popup) root.BookFX.closeCover(() => UI.close()); else UI.close(); };   // 책끈 · Esc · 바깥 누르기 = 표지 덮으며 닫기
  UI.close = function () { mTipHide(); const kt = document.getElementById('kToast'); if (kt) kt.classList.remove('on'); popup = null; q('#popBack').classList.remove('open'); stage.ui.querySelectorAll('[data-pop]').forEach(b => b.classList.remove('on')); };
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
    else if (popup === 'opts') b.innerHTML = optsHtml();
    else if (popup === 'req') b.innerHTML = reqHtml();
  }

  // 소재 판매 창구 (docs/balance/economy_v1.md 6절, 시설 팝업 '판매하기'로 열기): 보관 소재를 직접 팖. 음식이 아닌 소재 먼저, 음식 소재는 "요리 재료"
  const SELL_P = [6, 9, 12, 30, 36, 48, 90];
  let sellSel = null;
  const sellPrice = m => (m.price || SELL_P[Math.max(0, GR.indexOf(m.grade))]) + (Gm.upg(s, '판매창구') ? (s.cfg.econ.upSell || 3) : 0);   // 판매 창구 업그레이드 +3G (2026-11-12)
  function sellDo(ids, all) { let n = 0, g = 0; for (const id of ids) { const m = MATS[id], k = all ? (s.mats[id] || 0) : Math.min(1, s.mats[id] || 0); if (!m || !k) continue; s.mats[id] -= k; n += k; g += k * sellPrice(m); }
    if (!n) return; s.gold += g; s.month.sell = (s.month.sell || 0) + g; s.month.resale += g;   // 장부: '소재 판매 차익' 줄에 합침
    Gm.log(s, `소재 ${n}개를 팔아 ${g}G를 받았습니다.`, 'guild'); UI.hud && UI.hud(); }
  function sellHtml() {
    const mats = s.mats || {}, known = s.knownMats || {};
    const have = Object.values(MATS).filter(m => known[m.id] && (mats[m.id] || 0) > 0).sort((a, b) => GR.indexOf(a.grade) - GR.indexOf(b.grade));
    const nf = have.filter(m => m.line !== 'food'), fd = have.filter(m => m.line === 'food');
    if (sellSel && !(mats[sellSel] > 0)) sellSel = null; if (!sellSel && have.length) sellSel = (nf[0] || fd[0]).id;
    const cell = m => `<button class="kmat ${sellSel === m.id ? 'sel' : ''}" data-ssel="${m.id}" data-mt="${m.id}"><span class="ux-slot" data-g="${GR.indexOf(m.grade)}">${matImg(m)}${cntBadge(mats[m.id])}</span><em>${esc(m.name)}</em></button>`;
    const sum = ms => ms.reduce((t, m) => t + mats[m.id] * sellPrice(m), 0);
    const m = sellSel && MATS[sellSel];
    const detail = m ? `<div class="sl-d"><div class="sl-top"><span class="ux-slot" data-g="${GR.indexOf(m.grade)}" style="width:96px;height:96px">${matImg(m)}</span><div><div class="sl-nm">${badge(GR.indexOf(m.grade))}<b>${esc(m.name)}</b></div>${m.line === 'food' ? '<span class="ux-tag sl-food">요리 재료</span>' : ''}<div class="ux-muted sl-ds">${esc(m.desc || '')}</div></div></div>
      <div class="sl-kv"><span>보유</span><b>${mats[m.id]}개</b><span>1개 가격</span><b>${sellPrice(m)} G</b><span>전부 팔면</span><b>${mats[m.id] * sellPrice(m)} G</b></div>
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
    const maxGear = Math.max(-1, ...s.advs.map(a => a.gear == null ? -1 : a.gear));
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
    else if (codexTab === 3) byGrade(Gm.DISH.map(d => ({ name: d.name, grade: GR[d.g], icon: d.icon })), d => ({ on: !!s.dishes[d.name], inner: img(d.icon), attr: `data-dt="${esc(d.name)}"` }));
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
  const foeBand = q => q.foe == null ? null : q.foe < 0.95 ? 'down' : q.foe > 1.05 ? 'up' : 'mid';
  // 의뢰 기한 막대 (2026-11-12): 남은 비율 = (기한 − 게시 후 지난 주 − 이번 주 진행률) ÷ 기한. 주 게이지와 같은 진행률로 매 프레임 줄어듦
  let wkFrac = 0;
  const dlLeft = (q, f) => { const W = Gm.expireWeeks(s); return Math.max(0, Math.min(1, (W - (s.week - q.posted) - (f || 0)) / W)); };
  const ageOf = q => { const w = s.week - q.posted; return w >= 4 ? 2 : w >= 2 ? 1 : 0; };
  const cleanName = q => q.name || `${GR[q.g]}급 ${Gm.QTYPE[q.type]} 의뢰`;
  const gradeImg = (g, cls) => `<i class="ux-grade ${cls || ''}" style="background-image:url(assets/ui/hud/badge_${GR[g]}.png)" title="${GR[g]}급"></i>`;
  let qHover = null, qTimer = 0;
  let qSel = null;
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
      cards += `<div class="qcard age${ageOf(q)}${q.x2 ? ' x2' : ''}" data-q="${q.id}"><div class="r1">${gradeImg(q.g, 'sm')}<b>${esc(cleanName(q))}</b>${q.x2 ? '<em class="qx2" title="골드 보상 2배">×2</em>' : ''}</div>
        <div class="r2">${sk}${foe}<span class="gold"><i></i>${fmt(q.reward * (q.x2 ? 2 : 1))}G</span><button class="ux-btn danger sm" data-wd="${q.id}">취소</button></div>
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
    L += `</div><div class="ux-h qb-h">게시된 의뢰 <small>${s.board.length} / ${cap}칸</small></div><div class="bkq-list ${root.BOOK_CARD_STYLE || 'st-d'}">`;
    for (const q of s.board) {
      const T = QT[q.tid], d = danger(T, q.g), fb = foeBand(q), intel = !!s.built['정보실'];
      const sk = d.n ? `<span class="skulls" title="위험도">${[1, 2, 3].map(k => SKULL(k <= d.n)).join('')}</span>` : '<span class="bkq-nc">비전투</span>';
      const foe = d.n ? (intel ? (fb === 'up' ? '<i class="foe up" title="강한 무리">▲</i>' : fb === 'down' ? '<i class="foe down" title="약한 무리">▼</i>' : '') : '<i class="foe unk" title="정보실이 있으면 알 수 있음">?</i>') : '';
      L += `<div class="qcard bk age${ageOf(q)}${q.x2 ? ' x2' : ''}${q.id === qSel ? ' sel' : ''}" data-q="${q.id}"><div class="r1">${gradeImg(q.g, 'sm')}<b>${esc(cleanName(q))}</b>${q.x2 ? '<em class="qx2" title="골드 보상 2배">×2</em>' : ''}</div>
        <div class="r2">${sk}${foe}<span class="gold"><i></i>${fmt(q.reward * (q.x2 ? 2 : 1))}G</span><span class="dlw${Gm.expireWeeks(s) - (s.week - q.posted) <= 1 ? ' low' : ''}">${Gm.expireWeeks(s) - (s.week - q.posted)}주</span></div>
        <div class="qdl" title="남은 기한"><i data-dl="${q.id}" style="width:${(dlLeft(q, wkFrac) * 100).toFixed(1)}%"></i></div></div>`;
    }
    for (let k = s.board.length; k < Math.min(cap, 14); k++) L += '<div class="bkq-slot"></div>';   // 빈 칸 = 점선 자리 (한 쪽에 보이는 14칸까지)
    L += '</div>';
    let R;
    const q = s.board.find(x => x.id === qSel);
    let A = '';   // 의뢰 취소 버튼: 오른쪽 쪽 안이 아니라 책 그림 좌표에 고정 (--bkc-x, --bkc-y)
    if (q) { R = `<div class="bkq-det">${qDetailHtml(q)}</div>`; A = `<div class="bkq-act"><button class="ux-btn danger" data-wd="${q.id}">의뢰 취소</button><small>등록비·위약금 ${fmt(Math.round(q.reward * 0.10))}G · 신뢰도 −2</small></div>`; }
    else R = '<div class="bkq-none"><b>게시된 의뢰가 없습니다</b>의뢰는 매주 게시판에 들어옵니다.</div>';
    b.innerHTML = `<div class="bk2"><section class="bk-l">${L}</section><section class="bk-r">${R}</section>${A}</div>`;
    b.onclick = e => {
      const wd = e.target.closest('[data-wd]'); if (wd) { Gm.withdrawQuest(s, +wd.dataset.wd); hooks.changed(); return; }
      const fb = e.target.closest('[data-fb]'); if (fb) {   // 이미 칠해진 맨 위 막대를 다시 누르면 없음
        const [g, k] = fb.dataset.fb.split(':').map(Number), lv = Gm.filterLevel(s.filter[g]), w = s.filter.slice(); w[g] = Gm.FILTER_W[lv === k ? 0 : k];
        if (!Gm.setFilter(s, w)) { toast('적어도 한 등급은 의뢰를 받아야 합니다.', 'warn'); return; }
        hooks.changed(); return;
      }
      const c = e.target.closest('.qcard'); if (c) { qSel = +c.dataset.q; renderBoardBook(b); }
    };
    b.onmouseover = b.onmouseout = null;
  }
  function qDetailHtml(q) {
    const T = QT[q.tid] || {}, d = danger(T, q.g), fb = foeBand(q), intel = !!s.built['정보실'], wk = T.weeks || 1;
    let h = `<div class="t1">${gradeImg(q.g, 'sm')}<b>${esc(cleanName(q))}</b><span class="ux-tag">${Gm.QTYPE[q.type]}</span><span class="ux-tag">${wk}주</span></div>`;
    if (T.client || T.notice || T.tip) h += `<div class="note">${T.client ? `<b>${esc(T.client)}</b> ` : ''}${esc(T.notice || '')}${T.notice && T.tip ? '<br>' : ''}${esc(T.tip || '')}</div>`;   // 오버 메모(편집기)
    if (d.n) {
      h += '<div class="sec">출현 몬스터</div><div class="mons">' + (T.enemies || []).map(e => { const m = MONS[e.mon] || {}; return `<div class="mon"><span class="pic"${m.img ? ` style="background-image:url(assets/expedition/${m.img})"` : ''}></span><b>${esc(e.name)}</b> ×${e.count}${e.boss ? ' <span class="ux-tag injured">보스</span>' : ''}<small>체력 ${e.hp} · 공격 ${e.atk}</small></div>`; }).join('') + '</div>';
      h += `<div class="sec">위험도</div><div class="row">${[1, 2, 3].map(k => SKULL(k <= d.n)).join('')}<span>${GR[q.g]}급 모험가 <b>${d.n}명${d.more ? ' 이상' : ''}</b> 권장${d.more ? ' (장비가 필요할 수 있음)' : ''}</span></div>`;
      h += `<div class="row">${intel ? (fb === 'up' ? '<i class="foe up">▲</i> 이번 무리는 평소보다 <b>강합니다</b>' : fb === 'down' ? '<i class="foe down">▼</i> 이번 무리는 평소보다 <b>약합니다</b>' : '이번 무리는 평소 수준입니다') : '<i class="foe unk">?</i> 정보실이 있으면 이번 무리의 강약을 알 수 있습니다'}</div>`;
    } else h += `<div class="sec">요구 능력치 <small>비전투 의뢰</small></div><div class="row">${q.req.map(k => `<span class="ux-tag">${Gm.STATS[k]} ${Math.round(q.r)}</span>`).join(' ')}</div>`;
    const rw = (T.rewards || []).filter(r => MATS[r.m]);
    h += `<div class="sec">보상</div><div class="rw"><span class="gold big"><i></i>${fmt(q.reward * (q.x2 ? 2 : 1))}G${q.x2 ? ' <em class="qx2">×2</em>' : ''}</span>${rw.map(r => { const m = MATS[r.m], known = !!(s.knownMats || {})[r.m];   // 모르는 소재: 실루엣 + ? (이름은 ???)
      return `<span class="mat ${r.role === '주' ? 'main' : ''}" title="${known ? esc(m.name) : '???'}"><span class="ux-slot${known ? '' : ' unk'}" data-g="${GR.indexOf(m.grade)}">${known || m.icon ? matImg(m) : ''}</span><em>${r.p}%</em></span>`; }).join('')}</div>`;
    const fs = q.fameS != null ? q.fameS : s.cfg.fame.succ[q.g], ff = q.fameF != null ? q.fameF : s.cfg.fame.fail[q.g], ts = q.trustS != null ? q.trustS : s.cfg.quest.trustSucc, tf = q.trustF != null ? q.trustF : s.cfg.quest.trustFail;
    h += `<div class="foot"><span>성공 명성 <b class="ux-plus">+${fs}</b> · 신뢰 <b class="ux-plus">+${ts}</b></span><span>실패 명성 <b class="ux-minus">−${ff}</b> · 신뢰 <b class="ux-minus">−${tf}</b></span></div>`;
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
  const LG_IN = [['fee', '중계료'], ['resale', '소재 판매 차익'], ['meal', '식사 판매'], ['tavern', '주점 매출'], ['subsidy', '왕국 보조금']];
  const LG_OUT = [['build', '시설 건설비'], ['other', '기타']];
  const LG_EOM = { subsidy: 1 };   // 월말 결산 때 한꺼번에 들어오는 항목 (주점 매출은 2026-11-12부터 매주 술 1잔 단위라 제외)
  const lgIn = m => LG_IN.reduce((t, [k]) => t + (m[k] || 0), 0), lgOut = m => LG_OUT.reduce((t, [k]) => t + (m[k] || 0), 0), lgNet = m => lgIn(m) + lgOut(m);
  const gG = v => `${v < 0 ? '−' : ''}${fmt(Math.abs(Math.round(v)))}G`;
  function lgTip(k, m, cur) {   // 줄 오버 내역
    const E = s.cfg.econ, fr = m.feeRate != null ? m.feeRate : Gm.feeRate(s);
    if (k === 'fee') return `성공한 의뢰 <b>${m.success || 0}건</b> · 보상의 ${Math.round(fr * 100)}%`;
    if (k === 'resale') return `성공한 의뢰 <b>${m.success || 0}건</b> · 보상의 ${Math.round(E.resaleRate * 100)}%` + (m.sell ? ` · 판매 창구 <b>${fmt(m.sell)}G</b>` : '');
    if (k === 'meal') { const d = m.dishes || {}, ks = Object.keys(d); return ks.length ? ks.map(n => `${esc(n)} <b>${d[n]}그릇</b>`).join('<br>') : (m.dishes ? '판매 없음' : '내역 없음 (예전 기록)'); }
    if (k === 'tavern') return `술 <b>${m.drinks || 0}잔</b> 판매 · 1잔 마진 ${GR[s.grade]}급 ${(s.cfg.econ.drinkMargin || [2])[s.grade] || 2}G${Gm.upg(s, '주점') ? ' + 업그레이드 5G' : ''}`;   // 2026-11-12: 매주 술 1잔 단위
    if (k === 'subsidy') { const g = cur ? s.grade : (m.grade != null ? m.grade : s.grade); return `${cur ? '월말 결산 때 들어옵니다 · ' : ''}${GR[g]}급 길드 월 <b>${fmt(E.subsidy[g])}G</b>`; }
    if (k === 'build') { const b = m.builds || []; return b.length ? b.map(x => `${esc(FAC_LABEL[x.f] || x.f)} <b>${gG(-x.c)}</b>`).join('<br>') : '없음'; }
    if (k === 'other') { const w = m.wd || []; return w.length ? w.map(x => `${x.name ? esc(x.name) : `${GR[x.g]}급 ${QTYPE_[x.type]} 의뢰`} 취소 <b>${gG(-x.cost)}</b>`).join('<br>') : '없음'; }
    return '';
  }
  const QTYPE_ = Gm.QTYPE;
  let lgTips = [];
  function ledgerHtml() {
    const cur = s.month, prev = s.lastMonth; lgTips = [];
    const tipId = html => { lgTips.push(html); return lgTips.length - 1; };
    const cell = (k, m, isCur) => {
      if (!m) return '<td class="n muted">—</td>';
      const v = m[k] || 0, eom = isCur && LG_EOM[k] && !v;
      return `<td class="n ${eom ? 'eom' : v < 0 ? 'neg' : ''}" data-lt="${tipId(lgTip(k, m, isCur))}">${eom ? '월말' : v ? gG(v) : '0G'}</td>`;
    };
    let h = `<div class="lg-book"><table class="lg"><colgroup><col><col class="c"><col class="c"></colgroup>
      <tr class="hd"><th></th><th class="n">지난달</th><th class="n">이번 달</th></tr>
      <tr class="sec in"><th colspan="3">수입</th></tr>`;
    for (const [k, n] of LG_IN) h += `<tr><td>${n}</td>${cell(k, prev, false)}${cell(k, cur, true)}</tr>`;
    h += `<tr class="sum in"><td>수입 합계</td><td class="n">${prev ? gG(lgIn(prev)) : '—'}</td><td class="n">${gG(lgIn(cur))}</td></tr>
      <tr class="sec out"><th colspan="3">지출</th></tr>`;
    for (const [k, n] of LG_OUT) h += `<tr><td>${n}</td>${cell(k, prev, false)}${cell(k, cur, true)}</tr>`;
    h += `<tr class="sum out"><td>지출 합계</td><td class="n neg">${prev ? gG(lgOut(prev)) : '—'}</td><td class="n neg">${gG(lgOut(cur))}</td></tr>
      <tr class="tot"><td>순이익</td><td class="n ${prev && lgNet(prev) < 0 ? 'neg' : 'pos'}">${prev ? gG(lgNet(prev)) : '—'}</td><td class="n ${lgNet(cur) < 0 ? 'neg' : 'pos'}">${gG(lgNet(cur))}</td></tr></table>`;
    // 그래프: 최근 12개월 순이익 (건설비 포함). 0 기준선 위 = 이익, 아래 = 손해
    const hist = s.history.slice(-12);
    if (hist.length) {
      const nets = hist.map(lgNet), avg = nets.reduce((a, b) => a + b, 0) / nets.length, succ = hist.reduce((t, m) => t + m.success, 0), qn = hist.reduce((t, m) => t + m.quests, 0);
      const up = Math.max(0, ...nets), dn = Math.max(0, ...nets.map(v => -v)), pad = 18, span = Math.max(1, up + dn), zero = pad + up / span * (100 - pad * 2);   // 위아래 18%는 금액 글자 자리
      h += `<section class="lg-chart"><div class="ux-h">최근 ${hist.length}개월 순이익 <small>평균 ${gG(avg)} · 의뢰 성공률 ${qn ? Math.round(succ / qn * 100) : 0}%</small></div><div class="lg-bars" style="--z:${zero}%">`;
      hist.forEach((m, i) => {
        const v = nets[i], hgt = Math.abs(v) / span * (100 - pad * 2), lbl = Gm.dateLabel(m.week - 1).replace(/ \d+주$/, '').replace(/^\d+년차 /, ''), bld = (m.build || 0) < 0;
        const tip = `<b>${Gm.dateLabel(m.week - 1).replace(/ \d+주$/, '')}</b><br>수입 ${gG(lgIn(m))} · 지출 ${gG(lgOut(m))}<br>순이익 <b>${gG(v)}</b>${bld ? `<br>⚒ ${(m.builds || []).map(x => FAC_LABEL[x.f] || x.f).join(', ')} 건설` : ''}`;
        h += `<div class="lb" data-lt="${tipId(tip)}"><span class="col"><b class="zl" style="top:${zero}%"></b><i class="${v < 0 ? 'neg' : ''}" style="${v < 0 ? `top:${zero}%` : `bottom:${100 - zero}%`};height:${hgt}%"></i><em class="${v < 0 ? 'neg' : ''}" style="${v < 0 ? `top:calc(${zero + hgt}% + 3px)` : `bottom:calc(${100 - zero + hgt}% + 3px)`}">${fmt(Math.round(v))}</em>${bld ? `<b class="bd" style="top:${v < 0 ? zero : zero - hgt}%" title="건설">⚒</b>` : ''}</span><span class="mo">${lbl}</span></div>`;
      });
      h += '</div></section>';
    } else h += '<p class="muted">첫 결산은 다음 달 초에 나옵니다.</p>';
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
  const ST_TXT = { quest: '의뢰 중', town: '길드에 있음', injured: '부상 회복', away: '마을 밖' };
  const stTag = a => { const k = stOf(a), w = Math.max(0, a.until - s.week); return `<span class="ux-tag ${k}">● ${ST_TXT[k]}${k === 'quest' ? (w ? ' ' + w + '주' : ' · 이번 주 귀환') : k === 'injured' ? ' ' + w + '주' : ''}</span>`; };   // 2026-11-12: 남은 0주 → "이번 주 귀환"
  const ITEMS_ = ((root.GAME_DATA || {}).content || {}).items || [];
  const gearItem = (type, g) => ITEMS_.find(i => i.kind === 'gear' && i.gtype === type && i.grade === GR[g]) || null;
  let advView = 'detail';   // 책 모험가 장 오른쪽 쪽: 'detail'(명부) | 'career'(경력 책갈피)
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
  function advsBookHtml() {
    const pty = new Map(); (s.active || []).forEach((x, qi) => x.party.forEach((id, pi) => pty.set(id, { qi, pi, col: root.Director && root.Director.partyColor ? root.Director.partyColor(x.q.id) : null })));
    const list = s.advs.filter(a => a.alive).sort((x, y) => { const px = pty.get(x.id), py = pty.get(y.id);
      if (px && py) return px.qi - py.qi || px.pi - py.pi; if (px || py) return px ? -1 : 1;
      return y.stage - x.stage || y.lv - x.lv || x.id - y.id; });
    if (openAdv == null || !list.some(a => a.id === openAdv)) openAdv = list[0] && list[0].id;
    const promo = new Set((s.proposals || []).map(p => p.id));
    let h = `<div class="bk2 bk-av ${root.BOOK_ATT || 'att-b'}"><section class="bk-l"><div class="ux-h">모험가 명부 <small>${list.length} / ${Gm.advCap(s)}명</small></div><div class="av-list ${root.BOOK_ADV_LIST || 'st-d'}">`;
    for (const a of list) { const pc = pty.get(a.id) && pty.get(a.id).col, on = sampleOn(a), t = ttlName(on);
      h += `<button class="ux-row ${openAdv === a.id ? 'on' : ''} ${stOf(a) === 'injured' || stOf(a) === 'quest' ? stOf(a) : ''} ${pc ? 'pty' : ''} ${promo.has(a.id) ? 'promo' : ''}" data-adv="${a.id}"${pc ? ` style="--pc:${pc}"` : ''}><span class="ux-face" style="${faceStyle(a, 44, 230, 22)}"><i class="dot ${stOf(a)}"></i>${promo.has(a.id) ? '<i class="star" title="전직 제안">★</i>' : ''}</span>
      <span><span class="nm">${t ? `<em class="ttl">${t}</em>` : ''}${a.name}</span><span class="sub">${a.cls} · ${ST_TXT[stOf(a)]}${stOf(a) === 'injured' ? ' ' + Math.max(0, a.until - s.week) + '주' : ''}</span></span>${condIcons(a)}${attMini(a)}<span class="rt"><b>Lv ${a.lv}</b></span></button>`; }
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
    for (const a of list) { const pc = pty.get(a.id) && pty.get(a.id).col; h += `<button class="ux-row ${openAdv === a.id ? 'on' : ''} ${stOf(a) === 'injured' || stOf(a) === 'quest' ? stOf(a) : ''} ${pc ? 'pty' : ''} ${promo.has(a.id) ? 'promo' : ''}" data-adv="${a.id}"${pc ? ` style="--pc:${pc}"` : ''}><span class="ux-face" style="${faceStyle(a, 44, 230, 22)}"><i class="dot ${stOf(a)}"></i>${promo.has(a.id) ? '<i class="star" title="전직 제안">★</i>' : ''}</span>
      <span><span class="nm">${a.name}</span><span class="sub">${a.cls} · ${ST_TXT[stOf(a)]}</span></span><span class="rt"><b>Lv ${a.lv}</b></span></button>`; }
    const a = s.advs.find(x => x.id === openAdv);
    return h + '</div><div class="av-main">' + (a ? advDetail(a) : '<div class="ux-empty">모험가가 없습니다.</div>') + '</div><div class="qtip avtip" id="avTip"></div></div>';
  }
  // 목록 줄 마우스 오버: 지금 이 모험가의 상황 (상태별) + 공통 한 줄
  let avHover = null, avTimer = 0;
  function advTipHtml(a) {
    const k = stOf(a), w = Math.max(0, a.until - s.week), promo = (s.proposals || []).find(p => p.id === a.id);
    let h = `<div class="t1"><span class="ux-face" style="${faceStyle(a, 36, 190, 18)};width:40px;height:40px"></span><b>${a.name}</b><span class="ux-muted">${a.cls} Lv ${a.lv}</span></div>`;
    h += `<div class="st ${k}">● ${ST_TXT[k]}</div>`;
    if (k === 'quest') {
      const x = s.active.find(e => e.party.includes(a.id));
      if (x) {
        const T = QT[x.q.tid], d = danger(T, x.q.g), mates = x.party.filter(id => id !== a.id).map(id => (s.advs.find(b => b.id === id) || {}).name).filter(Boolean);
        h += `<div class="row"><b>${esc(cleanName(x.q))}</b>${d.n ? `<span class="skulls">${[1, 2, 3].map(n => SKULL(n <= d.n)).join('')}</span>` : ''}</div>`;
        h += `<div class="row ux-muted">${mates.length ? '동료: ' + mates.join(', ') : '혼자 떠남'} · 귀환까지 ${Math.max(1, x.back - s.week)}주</div>`;
      }
    } else if (k === 'injured') h += `<div class="row">회복까지 <b>${w}주</b>${a.injuredFrom ? ` · <span class="ux-muted">${esc(a.injuredFrom)}에서 다침</span>` : ''}</div>`;
    else if (k === 'town') {
      const lvReq = [0, 5, 10, 18, 26, 35, 45], achReq = [0, 5, 5, 7, 7, 10, 10], n = a.grade + 1;
      h += `<div class="row">의뢰를 고르는 중</div>`;
      if (n <= 5) h += `<div class="row ux-muted">${GR[n]}급 승급까지: Lv ${Math.min(a.lv, lvReq[n])}/${lvReq[n]} · 업적 ${Math.min(a.ach, achReq[n])}/${achReq[n]}</div>`;
    } else {
      const ago = a.lastSeen != null ? s.week - a.lastSeen : null;
      h += `<div class="row">애착 <b>${ATT_NAME[Gm.attachTier(a)]}</b> <span class="ux-muted">(${Math.round(a.attach)})</span></div>`;
      h += `<div class="row ux-muted">${ago == null ? '아직 길드에 온 기록이 없음' : ago === 0 ? '이번 주에 다녀감' : '마지막 방문 ' + ago + '주 전'}</div>`;
    }
    if (promo) h += `<div class="promo">★ 전직 제안: <b>${promo.opts.join(' / ')}</b></div>`;
    const CB_ = root.GuildCombat ? root.GuildCombat.make(root.GAME_DATA) : null;
    if (CB_ && CB_.ok) { const u = CB_.unit(a, i => Gm.finalStat(s, a, i), a.gear, 0); h += `<div class="foot">${Gm.STATS[a.core]} ${Math.round(Gm.finalStat(s, a, a.core))} · 공격 ${Math.round(u.atk)} · 체력 ${Math.round(u.maxHp)}<span class="gold"><i></i>${fmt(Math.round(a.wallet || 0))}G</span></div>`; }
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
    return `<div class="av-ttl"><button class="av-tbtn" data-tsel="1" title="칭호 바꾸기"><span>${ttlName(on)}</span><i>▾</i></button><div class="av-tdd">`
      + opt(-1, '신입', '기본 칭호 · 효과 없음') + got.map(k => opt(k, TITLE_CAT[k][0], TITLE_CAT[k][2])).join('')
      + `<div class="tdh">아직 못 얻은 칭호</div>` + TITLE_CAT.map((_, k) => k).filter(k => !got.includes(k)).map(k => `<div class="tdo lock"><b>${TITLE_CAT[k][0]}</b><em>${TITLE_CAT[k][1]}</em></div>`).join('') + '</div></div>';
  }
  function advCareerPage(a) {   // 책: 오른쪽 책갈피 "경력" — 선택한 모험가의 경력 전체
    return `<div class="av-career"><div class="av-ch"><div class="ux-portrait xs"><i style="${faceStyle(a, 56, 140, 32)}"></i></div><div><b>${a.name}</b><span>${STAGE[a.stage]} ${a.cls}</span></div><em>의뢰 성공 <b>${a.done}</b>회</em></div><ul class="career">${a.career.slice().reverse().map(c => `<li><span class="w">${Gm.dateLabel(c.week)}</span>${c.text}</li>`).join('') || '<li class="none">아직 기록이 없습니다.</li>'}</ul></div>`;
  }
  function advDetail(a) {
    if (document.getElementById('pop').classList.contains('book') && advView === 'career') return advCareerPage(a);
    const G = s.cfg.growth, cap = Gm.lvCapOf(s, a), need = G.lvA * Math.pow(a.lv, G.lvB), xp = a.lv >= cap ? 100 : Math.min(100, a.xp / need * 100);
    const path = a.cls1 === a.cls ? a.cls : `${a.cls1} → ${a.cls}`;
    const BK = document.getElementById('pop').classList.contains('book');   // 책 펼침판: 애착·다음 장비 빼고 막대 안에 수치
    // 머리
    let h = `${BK ? `<div class="av-sealw" aria-hidden="true"><div class="av-seal"><b>${GR[a.grade]}</b></div></div>` : ''}<div class="av-head">${BK ? '<div class="pcol">' : ''}<div class="ux-portrait sm"><i style="${faceStyle(a, 104, 260, 60)}"></i></div>${BK ? `<b class="plv">Lv ${a.lv}</b></div>` : ''}<div class="who">${document.getElementById('pop').classList.contains('book') ? titleDD(a) : ''}
      <div class="nm"><span class="anm">${a.name}</span> <i class="ux-grade" style="background-image:url(assets/ui/hud/badge_${GR[a.grade]}.png)"></i><span class="cls">${STAGE[a.stage]} ${path}</span><i class="br"></i>${stTag(a)}${BK ? `<i class="br br2"></i><span class="av-trt"><span><em>모험심</em>${Gm.RISK[a.risk]}<i class="tip">${TRAIT_TXT.risk[a.risk]}</i></span><span><em>소비</em>${Gm.SPEND[a.spend]}<i class="tip">${TRAIT_TXT.spend[a.spend]}</i></span><span><em>사교</em>${Gm.SOCIAL[a.social]}<i class="tip">${TRAIT_TXT.social[a.social]}</i></span></span>` : ''}${(() => { const AT = [0, 30, 60, 90, 100], t = Gm.attachTier(a), lo = AT[t], hi = AT[t + 1] || 100, pct = t >= 3 ? 100 : Math.min(100, (a.attach - lo) / (hi - lo) * 100); return `<span class="av-att" title="애착 ${ATT_NAME[t]} (${Math.round(a.attach)})"><span class="att-a">♥ ${Math.round(a.attach)}</span><span class="att-b"><em>${['방랑자', '새내기', '동반자', '토박이'][t]}</em><i class="trk"><i style="width:${pct}%"></i></i></span></span>`; })()}<span class="gold av-wal" title="모험가 소지금 (식사·물약·장비 구매에 씀)"><em class="wl">소지금</em><i></i>${fmt(Math.round(a.wallet || 0))}G</span></div>
      ${(() => { const CBH = root.GuildCombat ? root.GuildCombat.make(root.GAME_DATA) : null; if (!(CBH && CBH.ok)) return ''; const u = CBH.unit(a, i => Gm.finalStat(s, a, i), a.gear, 0); const hp = Math.round(u.maxHp), mp = Math.round(u.maxMp); if (BK) return `<div class="hm"><div class="vb hp"><span class="k">체력</span><i class="trk"><i></i><em class="bv">${fmt(hp)}/${fmt(hp)}</em></i></div><div class="vb mp"><span class="k">마력</span><i class="trk"><i></i><em class="bv">${fmt(mp)}/${fmt(mp)}</em></i></div><div class="vb ex"><span class="k">경험치</span><i class="trk"><i style="width:${xp}%"></i><em class="bv">${a.lv >= cap ? '상한' : fmt(Math.floor(a.xp)) + '/' + fmt(Math.round(need))}</em></i></div></div>`; return `<div class="hm"><div class="vb hp"><span class="k">체력</span><i class="trk"><i></i></i><b>${hp}</b></div><div class="vb mp"><span class="k">마력</span><i class="trk"><i></i></i><b>${mp}</b></div></div>`; })()}
      ${BK ? '' : `<div class="lv"><b>Lv ${a.lv}</b><div class="ux-bar blue"><i style="width:${xp}%"></i></div><span>${a.lv >= cap ? '레벨 상한' : '다음 레벨까지 ' + fmt(need - a.xp)}</span></div>`}</div></div>`;
    // 장비
    const CB_ = root.GuildCombat ? root.GuildCombat.make(root.GAME_DATA) : null, GE = s.cfg.gear;
    const slots = CB_ ? [['무기', CB_.WEAPON[a.core]], ['방어구', CB_.ARMOR[a.core]], ['장신구', CB_.ACC[(a.core + 2) % 5]]] : [];
    // 다음 장비까지: 구매 조건 = 세트 가격 × (1 + 소비 성향 여유분 × 0.5) 이상 모이면 삼 (game_core 장비 구매와 같은 식)
    const ng = Math.min(s.grade, a.gear + 1);
    let nx;
    if (ng <= a.gear) nx = `<span class="av-next max">길드 등급 상한</span>`;
    else { const price = GE.weaponPrice[ng] * GE.setMult, need = Math.round(price * (1 + GE.reserveMult[a.spend] * 0.5)), have = Math.round(a.wallet || 0);
      nx = `<span class="av-next" title="${GR[ng]}급 장비 세트 ${fmt(price)}G · ${Gm.SPEND[a.spend]} 성향이라 ${fmt(need)}G가 모이면 삼"><em>다음 장비(${GR[ng]}급)</em><span class="ux-bar"><i style="width:${Math.min(100, have / need * 100)}%"></i></span><b>${fmt(Math.min(have, need))}/${fmt(need)}G</b></span>`; }
    let eq = '<div class="av-eq"><div class="ux-h">장비' + (BK ? '' : nx) + '</div><div class="eqgrid">';
    for (const [nm, type] of slots) {
      const it = a.gear >= 0 ? gearItem(type, a.gear) : null;
      const tip = it ? `${nm} · ${it.name}\n${[it.atk && '공격 ' + it.atk, it.def && '방어 ' + it.def, it.mdef && '마방 ' + it.mdef, it.hp && '체력 ' + it.hp, it.mp && '마력 ' + it.mp].filter(Boolean).join(' · ')}` : nm + ': 없음';
      eq += it ? `<span class="ux-slot" data-g="${a.gear}" data-gt="${it.id}"><img src="assets/${it.icon}" alt="">${enhBadge(((a.enh || {})[type]) || 0)}</span>` : `<span class="ux-slot empty" data-ph="${nm}" title="${tip}"></span>`;
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
      const u = CB_.unit(a, i => Gm.finalStat(s, a, i), a.gear, 0);
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
    else if (advTab === 'career') h += `<div class="av-tb${advFlip ? ' flip' : ''}"><div class="ux-h">경력 <small>의뢰 성공 ${a.done}회</small></div><ul class="career">${a.career.slice().reverse().map(c => `<li><span class="w">${Gm.dateLabel(c.week)}</span>${c.text}</li>`).join('')}</ul></div>`;
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
    let h = `<div class="pm-top"><div class="pm-head"><div class="ux-portrait sm"><i style="${faceStyle(a, 104, 260, 60)}"></i></div><div class="who">
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
    집무실: '메인·서브 퀘스트에 모험가를 지명합니다. (메인·서브 퀘스트는 아직 게임에 없음)', 훈련장: '힘·민첩·기교를 훈련합니다. D → C 승급 조건.', 창고: '소재를 보관합니다.',
    추모실: '떠난 모험가와 가문의 기록을 남깁니다.', 정보실: '중계료가 오르고, 예상 성공률이 정확해집니다.', 도서관: '지력·정신을 훈련합니다.',
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
    kSel = kSel.filter(m => mats[m] > 0);
    // 소재 보관함: 음식 소재만
    const food = Object.values(MATS).filter(m => m.line === 'food' && GR.indexOf(m.grade) <= top).sort((a, b) => GR.indexOf(a.grade) - GR.indexOf(b.grade));
    const pantry = food.map(m => { const k = !!known[m.id], n = mats[m.id] || 0, used = kSel.filter(x => x === m.id).length;
      return `<button class="kmat ${!k ? 'unk' : n - used <= 0 ? 'zero' : ''}" ${k && n - used > 0 ? `data-kmat="${m.id}"` : 'aria-disabled="true"'} data-mt="${m.id}"><span class="ux-slot${k ? '' : ' unk'}" data-g="${GR.indexOf(m.grade)}">${k || m.icon ? matImg(m) : ''}${k ? cntBadge(n - used) : ''}</span><em>${k ? esc(m.name) : '???'}</em></button>`; }).join('');
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
      const ds = Gm.DISH.filter(d => d.g === g), got = ds.filter(d => s.dishes[d.name] && !hid(d)).length; if (!ds.length) continue;
      const bump = kFlip && ds.some(d => d.name === kFlip);
      menu += `<div class="kgrade">${badge(g)}<b>${GR[g]}급 요리</b><span class="ux-muted">${got} / ${ds.length} 발견</span>${got ? `<span class="ux-tag town ${bump ? 'bump' : ''}">식사 효과 +${Math.round(perDish * got * 10) / 10}%</span>` : ''}</div><div class="kmenu">`;
      for (const d of ds) {
        const on = !!s.dishes[d.name] && !hid(d);
        const back = `<div class="kdish off"><span class="pic unk">${d.icon ? `<img src="assets/${d.icon}" alt="">` : ''}</span><div><b>???</b><div class="rc ux-muted">아직 모르는 요리</div></div></div>`;
        if (on && kFlip === d.name) menu += `<div class="kflip"><div class="kin"><div class="kface">${dishFront(d)}</div><div class="kface bk">${back}</div></div></div>`;   // 뒤집히며 공개
        else menu += on ? dishFront(d) : back;
      }
      menu += '</div>';
    }
    function dishFront(d) { return `<div class="kdish" data-dt="${esc(d.name)}"><span class="pic"><img src="assets/${d.icon}" alt=""></span><div><b>${d.name}</b><div class="rc">${d.mats.map(m => `<span class="ux-slot" data-mt="${m}" data-g="${GR.indexOf((MATS[m] || {}).grade)}">${matImg(MATS[m] || {})}</span>`).join('<span class="plus">+</span>')}<span class="kfx">${esc(d.effect)}</span></div></div></div>`; }
    return `<div class="kitchen"><div class="kpan"><div class="ux-h">소재 보관함 <small>음식 소재</small></div><div class="kpantry">${pantry}</div></div>
      <div class="kpan"><div class="ux-h">조리대</div><div class="kslots">${slots}</div>${pot}<button class="ux-btn kcook" data-kcook="1" ${kSel.length && !kAnim ? '' : 'disabled'}>만들어 보기</button>${msg}</div>
      <div class="kpan wide"><div class="ux-h">메뉴판</div><div class="kmenuwrap">${menu}</div></div></div>`;
  }
  // 길드 기록: 월 단위 카드(머리 = 그 달 결산) · 종류 아이콘 · 필터. 'sys'(버튼 반응)·'debug'는 기록에서 숨김
  const LK = {   // 종류 → [아이콘 글자, 이름, 필터 묶음]
    success: ['✓', '의뢰 성공', 'q'], fail: ['✕', '의뢰 실패', 'q'], withdraw: ['⊘', '의뢰 철회', 'q'], expire: ['⌛', '의뢰 만료', 'q'], depart: ['➜', '출발', 'q'],
    death: ['☠', '사망', 'a'], injury: ['✚', '부상', 'a'], leave: ['↩', '떠남', 'a'], arrive: ['☺', '새 모험가', 'a'], grow: ['▲', '성장', 'a'], promo: ['★', '전직', 'a'],
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
  const lobbyIdle = () => !(PM || popup || (root.Town && root.Town.active) || Dlg.open || (root.LinaMenu && root.LinaMenu.open));
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
    if (root.LinaMenu && root.LinaMenu.open) { root.LinaMenu.close(); return; }   // 리나 메뉴가 떠 있으면 바닥을 눌러 닫기
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
      const t = e.target.closest('[data-psel], [data-lf], [data-build], [data-upg], [data-adv], [data-promo], [data-hold], [data-ctab], [data-atab], [data-kmat], [data-kslot], [data-kcook], [data-opensell], [data-ssel], [data-sone], [data-sall], [data-snf], [data-ftab], [data-place], [data-pmove], [data-tsel], [data-tpick], [data-fbs]'); if (!t) { const o = document.querySelector('.av-ttl.open'); if (o && !e.target.closest('.av-ttl')) o.classList.remove('open'); return; }
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
      for (let i = 0; i < N; i++) { const g = Gm.newGame(Sim.defaults(), 7000 + i); Gm.autoPlace(g, true); for (let w = 0; w < 48; w++) { Gm.stepWeek(g); Gm.autoCook(g); /* 요리: 재료가 모이면 바로 만든다고 가정 (시뮬레이터와 같음) */ if (g.week % Gm.WPM === 0) Gm.autoPlace(g, false); /* 테이블 자동 배치 (tools/gate1_check.js와 같음) */ } op += g.history.reduce((t, m) => t + m.net, 0) / g.history.length; d += g.stats.done; f += g.stats.fail; }
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
  const Dlg = { open: false, lines: [], cur: null, shown: 0, t: 0, hold: 0, wait: 0 };
  // 대화 장면 (data/dialog.csv): 장면 이름과 {변수} 값으로 [{face, text}] 를 만든다
  UI.lines = function (id, vars) {
    const D = (root.GAME_DATA && root.GAME_DATA.dialog) || {};
    return (D[id] || []).map(l => ({ face: l.face, text: l.text.replace(/\{(\w+)\}/g, (m0, k) => vars && vars[k] != null ? vars[k] : m0) }));
  };
  UI.say = function (lines) { // [{face:'smile', text:'…'}, …]
    Dlg.lines.push(...lines);
    if (!Dlg.open) next();
  };
  // 리나 초상: 눈 뜬 상반신 + 얼굴 조각(뜸·반쯤·감김)을 캔버스에 겹쳐 그린다. 그림이 없으면 예전 lina_face_* 한 장으로 대신한다.
  const BLINK = { rows: ['smile', 'serious', 'laugh', 'worried', 'awkward', 'surprised'], x: 117, y: 116, w: 97, h: 93 };
  const BLINK_SEQ = [[1, 0.05], [2, 0.07], [1, 0.05]]; // [칸, 지속초] : 뜸 → 반쯤 → 감김 → 반쯤 → 뜸
  Dlg.expr = 'smile'; Dlg.bs = 0; Dlg.bt = 0; Dlg.bi = -1; Dlg.bnext = 2.5;
  const standOK = () => { const a = root.Assets.items; return a.lina_stand && a.lina_stand.ok && a.lina_blink && a.lina_blink.ok; };
  function drawStand() {
    const a = root.Assets.items, c = q('#dlgStand'), g = c.getContext('2d'), r = Math.max(0, BLINK.rows.indexOf(Dlg.expr));
    g.clearRect(0, 0, c.width, c.height); g.drawImage(a.lina_stand.img, 0, 0);
    g.drawImage(a.lina_blink.img, Dlg.bs * BLINK.w, r * BLINK.h, BLINK.w, BLINK.h, BLINK.x, BLINK.y, BLINK.w, BLINK.h);
  }
  function setFace(face) {
    const a = root.Assets.items, old = a['lina_face_' + face];
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
    const L = Dlg.lines.shift();
    if (!L) { Dlg.open = false; Dlg.cur = null; Dlg.wait = 0; q('#dlg').classList.remove('open'); q('#logBox').classList.remove('hide'); stage.ui.classList.remove('dlgOn'); root.Lina.chatting = false; return; }
    Dlg.open = true; Dlg.cur = L; Dlg.shown = 0; Dlg.t = 0; Dlg.hold = 0;
    const first = !stage.ui.classList.contains('dlgOn');
    if (first) { Dlg.wait = DLG_WAIT; Dlg.t = 0; } else q('#dlg').classList.add('open');
    q('#logBox').classList.add('hide'); stage.ui.classList.add('dlgOn'); UI.chat('리나', L.text, 'lina');
    setFace(L.face);
    q('#dlgText').textContent = ''; q('#dlgNext').hidden = true;
  }
  UI.advance = function () {
    if (!Dlg.cur || Dlg.wait > 0) return;
    if (Dlg.shown < Dlg.cur.text.length) { Dlg.shown = Dlg.cur.text.length; q('#dlgText').textContent = Dlg.cur.text; q('#dlgNext').hidden = false; }
    else next();
  };
  UI.update = function (dt) { // 글자 타이핑: 초당 약 28자. 다 나오면 8초 뒤 자동으로 넘어감 (게임은 멈추지 않음)
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
  UI.gradeUp = g => UI.say(UI.lines('gradeup', { grade: GR[g] }));

  root.UI = UI;
})(this);
