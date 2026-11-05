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
    q('#popBack').onclick = e => { if (e.target.id === 'popBack') UI.close(); };
    // 메뉴
    // 하단 HUD 묶음(경영·옵션)은 마우스를 올리면 열림. 준비 중인 항목은 안내만
    stage.ui.querySelectorAll('[data-act]').forEach(b => b.onclick = () => b.dataset.act === 'town' && hooks.town ? hooks.town() : toast(b.dataset.act === 'town' ? '마을 화면은 준비 중입니다.' : '요리하기는 준비 중입니다.', 'info'));
    const shut = () => q('#menu').classList.remove('open');
    q('#mSave').onclick = () => { shut(); hooks.save(); toast('게임을 저장했습니다.', 'info'); };
    q('#mLoad').onclick = () => { shut(); hooks.load(); };
    q('#mNew').onclick = () => { shut(); hooks.newGame(); };
    q('#mReport').onclick = e => { UI.autoReport = !UI.autoReport; e.currentTarget.querySelector('i').textContent = UI.autoReport ? '켬' : '끔'; e.currentTarget.classList.toggle('off', !UI.autoReport); }; // 끔이면 아이콘에 붉은 X
    // 개발
    q('#bPromo').onclick = () => UI.open('promo');
    q('#devToggle').onclick = () => q('#dev').classList.toggle('open');
    q('#dVerify').onclick = () => UI.open('verify');
    // 대화창
    q('#dlg').onclick = UI.advance;
    root.addEventListener('keydown', e => {
      if (e.key === 'Escape') { if (popup) UI.close(); }
      if ((e.key === ' ' || e.key === 'Enter') && Dlg.open && !popup) { e.preventDefault(); UI.advance(); }
    });
    UI.autoReport = true;
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
    q('#hDate').textContent = Gm.dateLabel(s.week);
    q('#hGrade').style.backgroundImage = 'url(assets/ui/hud/badge_' + GR[s.grade] + '.png)'; q('#hGrade').title = '길드 등급 ' + GR[s.grade];
    q('#hGold').textContent = fmt(s.gold); q('#hGold').classList.toggle('neg', s.gold < 0);
    q('#hTrust').textContent = Math.round(s.trust);
    q('#hFame').textContent = Math.round(s.fame || 0);
    q('#hAdv').textContent = s.advs.filter(a => a.alive).length;
    q('#bBoard').textContent = s.board.length; q('#bBoard').hidden = !s.board.length;
    const np = (s.proposals || []).length; q('#bParty').textContent = np ? '★' + np : ''; q('#bParty').hidden = !np; q('#bPromo').hidden = !np; q('#bPromo').textContent = `전직 제안 ${np}건`;
    if (popup) renderPopup();
  };
  UI.weekBar = p => { q('#hWeekBar').style.width = (p * 100).toFixed(1) + '%'; };


  // ---------- 로그박스 (채팅처럼 흐르는 기록 + 캐릭터 대화) ----------
  const LOGMAX = 200, FADE_MS = 8000, POS_KEY = 'guildLogBoxPos';
  let lb = null;
  function lbInit() {
    const box = q('#logBox'), ll = box.querySelector('.ll'), grip = box.querySelector('.lg');
    lb = { box, ll, grip, hov: 0, off: null };
    let tm = 0;
    const on = () => { clearTimeout(tm); box.classList.add('show'); };
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
    el._t = performance.now(); lb.ll.appendChild(el);
    while (lb.ll.children.length > LOGMAX) lb.ll.firstChild.remove();
    if (!lb.box.classList.contains('show')) lb.ll.scrollTop = lb.ll.scrollHeight;
  }
  UI.logLine = function (text, kind) { // 시스템 기록
    const el = document.createElement('div'); el.className = 'ln k-' + (kind || 'info'); el.textContent = text; lbAdd(el);
  };
  UI.chat = function (name, text, who) { // 캐릭터 대화 (말풍선·리나 대사)
    if (!text) return;
    const el = document.createElement('div'); el.className = 'ln chat' + (who === 'lina' ? ' lina' : '');
    const b = document.createElement('b'); b.textContent = name || '손님';
    el.append(b, document.createTextNode('“' + text + '”')); lbAdd(el);
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
    for (const L of logs) {
      UI.logLine(L.text, L.kind); // 로그박스로 흘려보냄 (알림은 전직 제안만 따로 띄움)
      if (L.kind === 'promo' && L.text.includes('제안합니다')) toast(L.text, L.kind);
      if (L.kind === 'ledger' && UI.autoReport) UI.monthlyReport();
      if (L.kind === 'promo' && L.text.includes('제안합니다')) { const nm = L.text.split(/[이가] \d차/)[0]; UI.say(UI.lines('promo_ready', { name: nm })); }
    }
  };

  // ---------- 팝업 틀 ----------
  const TITLES = { promo: '전직 제안', board: '의뢰 게시판', ledger: '장부', advs: '모험가', fac: '시설', meals: '식당', log: '길드 기록', codex: '도감', verify: '관문 1 검증' };
  UI.open = function (name) {
    popup = name; q('#popTitle').textContent = TITLES[name];
    q('#popBack').classList.add('open'); stage.ui.querySelectorAll('[data-pop]').forEach(b => b.classList.toggle('on', b.dataset.pop === name));
    q('#popBody').innerHTML = ''; q('#popBody').dataset.g = ''; q('#popBody').dataset.p = name; renderPopup(); q('#popBody').scrollTop = 0;
    if (name === 'verify') verify();
  };
  UI.close = function () { const kt = document.getElementById('kToast'); if (kt) kt.classList.remove('on'); popup = null; q('#popBack').classList.remove('open'); stage.ui.querySelectorAll('[data-pop]').forEach(b => b.classList.remove('on')); };
  function renderPopup() {
    const b = q('#popBody');
    if (popup === 'board') renderBoard(b);
    else if (popup === 'ledger') { b.innerHTML = ledgerHtml(); ledgerTipBind(b); }
    else if (popup === 'advs') { const keep = sel => { const el = b.querySelector(sel); return el ? el.scrollTop : 0; }, t1 = keep('.av-list'), t2 = keep('.av-main'); b.innerHTML = advsHtml(); const d1 = b.querySelector('.av-list'), d2 = b.querySelector('.av-main'); if (d1) d1.scrollTop = t1; if (d2) d2.scrollTop = t2; advTipBind(b); }
    else if (popup === 'promo') b.innerHTML = promoHtml();
    else if (popup === 'fac') b.innerHTML = facHtml();
    else if (popup === 'meals') { const m0 = b.querySelector('.kmenuwrap'), y = m0 ? m0.scrollTop : 0; b.innerHTML = mealsHtml(); const m1 = b.querySelector('.kmenuwrap'); if (m1) m1.scrollTop = y; }   // 메뉴판만 스크롤 (위쪽 보관함·조리대는 고정)
    else if (popup === 'log') b.innerHTML = logHtml();
    else if (popup === 'codex') b.innerHTML = codexHtml();
  }

  // 도감: 탭만 먼저 만든 빈 틀 (내용은 이후에 채움)
  const CODEX_TABS = ['몬스터', '소재·아이템', '모험가', '요리', '장비'];
  let codexTab = 0;
  function codexHtml() {
    return '<div class="cdx-tabs">' + CODEX_TABS.map((t, i) => '<button data-ctab="' + i + '"' + (i === codexTab ? ' class="on"' : '') + '>' + t + '</button>').join('') + '</div>'
      + '<h3>' + CODEX_TABS[codexTab] + ' 도감 <small>0 / 0</small></h3><div class="cdx-empty">아직 등록된 항목이 없습니다.</div>';
  }

  // ---------- 의뢰 게시판 (docs/design/popup_board.md) ----------
  // 위: 의뢰 배분 버튼(없음·적게·보통·우선) / 아래: 작은 의뢰 카드 격자 + 마우스 오버 창
  const GD_ = root.GAME_DATA || {}, QT = {}, MATS = {}, MONS = {};
  for (const t of ((GD_.content || {}).quests || [])) QT[t.id] = t;
  for (const m of ((GD_.content || {}).materials || [])) MATS[m.id] = m;
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
    const en = []; for (const e of T.enemies) for (let k = 0; k < e.count; k++) en.push({ hp: e.hp, atk: e.atk, name: e.name });
    let need = 3, rate = 0;
    for (let n = 1; n <= 3; n++) {
      let sum = 0; for (let c = 0; c < 5; c++) { const party = []; for (let k = 0; k < n; k++) party.push(stdUnit((c + k) % 5, g)); sum += CBq.predict(party, en, g, 1); }
      rate = sum / 5; if (rate >= 0.7) { need = n; break; }
    }
    return (dangerCache[T.id] = { n: need, rate, more: rate < 0.7 });
  }
  const foeBand = q => q.foe == null ? null : q.foe < 0.95 ? 'down' : q.foe > 1.05 ? 'up' : 'mid';
  const ageOf = q => { const w = s.week - q.posted; return w >= 4 ? 2 : w >= 2 ? 1 : 0; };
  const cleanName = q => q.name || `${GR[q.g]}급 ${Gm.QTYPE[q.type]} 의뢰`;
  const gradeImg = (g, cls) => `<i class="ux-grade ${cls || ''}" style="background-image:url(assets/ui/hud/badge_${GR[g]}.png)" title="${GR[g]}급"></i>`;
  let qHover = null, qTimer = 0;
  function renderBoard(b) {
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
      cards += `<div class="qcard age${ageOf(q)}" data-q="${q.id}"><div class="r1">${gradeImg(q.g, 'sm')}<b>${esc(cleanName(q))}</b></div>
        <div class="r2">${sk}${foe}<span class="gold"><i></i>${fmt(q.reward)}G</span><button class="ux-btn danger sm" data-wd="${q.id}">떼기</button></div></div>`;
    }
    if (!s.board.length) cards = '<div class="ux-empty qb-none">게시된 의뢰가 없습니다. 의뢰는 매달 초에 들어옵니다.</div>';
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
  function showTip(b) {
    const q = s.board.find(x => x.id === qHover), c = b.querySelector(`.qcard[data-q="${qHover}"]`), tip = b.querySelector('#qTip');
    if (!q || !c) { tip.classList.remove('on'); return; }
    const T = QT[q.tid] || {}, d = danger(T, q.g), fb = foeBand(q), intel = !!s.built['정보실'], wk = T.weeks || 1;
    let h = `<div class="t1">${gradeImg(q.g, 'sm')}<b>${esc(cleanName(q))}</b><span class="ux-tag">${Gm.QTYPE[q.type]}</span><span class="ux-tag">${wk}주</span></div>`;
    if (T.client || T.notice) h += `<div class="note">${T.client ? `<b>${esc(T.client)}</b> ` : ''}${esc(T.notice || '')}</div>`;
    if (d.n) {
      h += '<div class="sec">출현 몬스터</div><div class="mons">' + (T.enemies || []).map(e => { const m = MONS[e.mon] || {}; return `<div class="mon"><span class="pic"${m.img ? ` style="background-image:url(assets/expedition/${m.img})"` : ''}></span><b>${esc(e.name)}</b> ×${e.count}${e.boss ? ' <span class="ux-tag injured">보스</span>' : ''}<small>체력 ${e.hp} · 공격 ${e.atk}</small></div>`; }).join('') + '</div>';
      h += `<div class="sec">위험도</div><div class="row">${[1, 2, 3].map(k => SKULL(k <= d.n)).join('')}<span>${GR[q.g]}급 모험가 <b>${d.n}명${d.more ? ' 이상' : ''}</b> 권장${d.more ? ' (장비가 필요할 수 있음)' : ''}</span></div>`;
      h += `<div class="row">${intel ? (fb === 'up' ? '<i class="foe up">▲</i> 이번 무리는 평소보다 <b>강합니다</b>' : fb === 'down' ? '<i class="foe down">▼</i> 이번 무리는 평소보다 <b>약합니다</b>' : '이번 무리는 평소 수준입니다') : '<i class="foe unk">?</i> 정보실이 있으면 이번 무리의 강약을 알 수 있습니다'}</div>`;
    } else h += `<div class="sec">요구 능력치 <small>비전투 의뢰</small></div><div class="row">${q.req.map(k => `<span class="ux-tag">${Gm.STATS[k]} ${Math.round(q.r)}</span>`).join(' ')}</div>`;
    const rw = (T.rewards || []).filter(r => MATS[r.m]);
    h += `<div class="sec">보상</div><div class="rw"><span class="gold big"><i></i>${fmt(q.reward)}G</span>${rw.map(r => { const m = MATS[r.m], known = !!(s.knownMats || {})[r.m];   // 모르는 소재: 실루엣 + ? (이름은 ???)
      return `<span class="mat ${r.role === '주' ? 'main' : ''}" title="${known ? esc(m.name) : '???'}"><span class="ux-slot${known ? '' : ' unk'}" data-g="${GR.indexOf(m.grade)}">${known || m.icon ? matImg(m) : ''}</span><em>${r.p}%</em></span>`; }).join('')}</div>`;
    const fs = q.fameS != null ? q.fameS : s.cfg.fame.succ[q.g], ff = q.fameF != null ? q.fameF : s.cfg.fame.fail[q.g], ts = q.trustS != null ? q.trustS : 0.3, tf = q.trustF != null ? q.trustF : 0.6;
    h += `<div class="foot"><span>성공 명성 <b class="ux-plus">+${fs}</b> · 신뢰 <b class="ux-plus">+${ts}</b></span><span>실패 명성 <b class="ux-minus">−${ff}</b> · 신뢰 <b class="ux-minus">−${tf}</b></span></div>`;
    h += `<div class="foot muted">${s.week - q.posted ? (s.week - q.posted) + '주째 게시' : '이번 주 게시'} · 떼면 ${fmt(Math.round(q.reward * 0.10))}G, 신뢰도 −2</div>`;
    tip.innerHTML = h; tip.classList.add('on');
    // 카드 오른쪽, 공간이 없으면 왼쪽
    const bw = b.clientWidth, x = c.offsetLeft + c.offsetWidth + 10, tw = tip.offsetWidth;
    tip.style.left = (x + tw > bw ? c.offsetLeft - tw - 10 : x) + 'px';
    tip.style.top = Math.max(0, Math.min(c.offsetTop - 6, b.scrollHeight - tip.offsetHeight - 6)) + 'px';
  }
  // ---------- 장부: 수입 · 지출 (지난달 | 이번 달) + 12개월 순이익 그래프 (docs/design/popup_ledger.md) ----------
  // 순이익 = 수입 − 지출(시설 건설비·기타). 관문 1의 "운영 순이익(m.net)"은 건설비를 빼고 계산하므로 따로 둠
  const LG_IN = [['fee', '중계료'], ['resale', '소재 판매 차익'], ['meal', '식사 판매'], ['tavern', '주점 매출'], ['subsidy', '왕국 보조금']];
  const LG_OUT = [['build', '시설 건설비'], ['other', '기타']];
  const LG_EOM = { tavern: 1, subsidy: 1 };   // 월말 결산 때 한꺼번에 들어오는 항목
  const lgIn = m => LG_IN.reduce((t, [k]) => t + (m[k] || 0), 0), lgOut = m => LG_OUT.reduce((t, [k]) => t + (m[k] || 0), 0), lgNet = m => lgIn(m) + lgOut(m);
  const gG = v => `${v < 0 ? '−' : ''}${fmt(Math.abs(Math.round(v)))}G`;
  function lgTip(k, m, cur) {   // 줄 오버 내역
    const E = s.cfg.econ, fr = m.feeRate != null ? m.feeRate : Gm.feeRate(s);
    if (k === 'fee') return `성공한 의뢰 <b>${m.success || 0}건</b> · 보상의 ${Math.round(fr * 100)}%`;
    if (k === 'resale') return `성공한 의뢰 <b>${m.success || 0}건</b> · 보상의 ${Math.round(E.resaleRate * 100)}%`;
    if (k === 'meal') { const d = m.dishes || {}, ks = Object.keys(d); return ks.length ? ks.map(n => `${esc(n)} <b>${d[n]}그릇</b>`).join('<br>') : (m.dishes ? '판매 없음' : '내역 없음 (예전 기록)'); }
    if (k === 'tavern') return cur ? `월말 결산 때 들어옵니다${s.lastMonth ? ` (지난달 ${gG(s.lastMonth.tavern)})` : ''}` : (m.inTown != null ? `길드에 머문 모험가 <b>${m.inTown}명</b> 기준` : '내역 없음 (예전 기록)');
    if (k === 'subsidy') { const g = cur ? s.grade : (m.grade != null ? m.grade : s.grade); return `${cur ? '월말 결산 때 들어옵니다 · ' : ''}${GR[g]}급 길드 월 <b>${fmt(E.subsidy[g])}G</b>`; }
    if (k === 'build') { const b = m.builds || []; return b.length ? b.map(x => `${esc(FAC_LABEL[x.f] || x.f)} <b>${gG(-x.c)}</b>`).join('<br>') : '없음'; }
    if (k === 'other') { const w = m.wd || []; return w.length ? w.map(x => `${x.name ? esc(x.name) : `${GR[x.g]}급 ${QTYPE_[x.type]} 의뢰`} 떼기 <b>${gG(-x.cost)}</b>`).join('<br>') : '없음'; }
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
  function advStateHtml(a) { return a.state === 'quest' ? `<span class="st quest">의뢰 중 ${Math.max(0, a.until - s.week)}주</span>` : a.state === 'town' ? '<span class="st town">길드에 있음</span>' : a.state === 'injured' ? `<span class="st away">부상 회복 ${Math.max(0, a.until - s.week)}주</span>` : '<span class="st away">마을 밖</span>'; }
  // ---------- 모험가 팝업 (시안: 머리 / 장비 · 능력치 · 전투 수치 / 아래 탭) ----------
  const CLS_KEY = ['warrior', 'archer', 'mage', 'cleric', 'rogue'];
  const FACE_AT = { warrior_m: [126, 154], warrior_f: [116, 123], archer_m: [128, 145], archer_f: [110, 124], mage_m: [144, 196], mage_f: [144, 173], cleric_m: [100, 145], cleric_f: [103, 131], rogue_m: [132, 159], rogue_f: [112, 133] };
  function faceStyle(a, box, h, cy) {   // 로비 SD 정면 그림(높이 470)에서 얼굴 부분을 잘라 보여 줌
    const k = CLS_KEY[a.core] + '_' + (a.id % 2 ? 'm' : 'f'), f = FACE_AT[k] || [128, 150], z = h / 470;
    return `background-image:url(assets/chr/chr_${k}_front.png);background-size:auto ${h}px;background-position:${Math.round(box / 2 - f[0] * z)}px ${Math.round(cy - f[1] * z)}px`;
  }
  const stOf = a => a.state === 'quest' ? 'quest' : a.state === 'town' ? 'town' : a.state === 'injured' ? 'injured' : 'away';
  const ST_TXT = { quest: '의뢰 중', town: '길드에 있음', injured: '부상 회복', away: '마을 밖' };
  const stTag = a => { const k = stOf(a), w = Math.max(0, a.until - s.week); return `<span class="ux-tag ${k}">● ${ST_TXT[k]}${k === 'quest' || k === 'injured' ? ' ' + w + '주' : ''}</span>`; };
  const ITEMS_ = ((root.GAME_DATA || {}).content || {}).items || [];
  const gearItem = (type, g) => ITEMS_.find(i => i.kind === 'gear' && i.gtype === type && i.grade === GR[g]) || null;
  let advTab = 'skill';   // 아래 탭: 'skill'(기본) | 'path' | 'trait' | 'career' — 항상 하나가 펼쳐져 있음
  let advAnimFor = null;   // 능력치 칸이 차오르는 움직임: 다른 모험가를 고르거나 팝업을 처음 열 때만
  function advsHtml() {
    const list = s.advs.filter(a => a.alive).sort((x, y) => y.stage - x.stage || y.lv - x.lv || x.id - y.id);
    if (openAdv == null || !list.some(a => a.id === openAdv)) openAdv = list[0] && list[0].id;
    const promo = new Set((s.proposals || []).map(p => p.id));
    let h = '<div class="av"><div class="av-list">';
    for (const a of list) h += `<button class="ux-row ${openAdv === a.id ? 'on' : ''} ${stOf(a) === 'injured' || stOf(a) === 'quest' ? stOf(a) : ''} ${promo.has(a.id) ? 'promo' : ''}" data-adv="${a.id}"><span class="ux-face" style="${faceStyle(a, 44, 230, 24)}"><i class="dot ${stOf(a)}"></i>${promo.has(a.id) ? '<i class="star" title="전직 제안">★</i>' : ''}</span>
      <span><span class="nm">${a.name}</span><span class="sub">${a.cls} · ${ST_TXT[stOf(a)]}</span></span><span class="rt"><b>Lv ${a.lv}</b></span></button>`;
    const a = s.advs.find(x => x.id === openAdv);
    return h + '</div><div class="av-main">' + (a ? advDetail(a) : '<div class="ux-empty">모험가가 없습니다.</div>') + '</div><div class="qtip avtip" id="avTip"></div></div>';
  }
  // 목록 줄 마우스 오버: 지금 이 모험가의 상황 (상태별) + 공통 한 줄
  let avHover = null, avTimer = 0;
  function advTipHtml(a) {
    const k = stOf(a), w = Math.max(0, a.until - s.week), promo = (s.proposals || []).find(p => p.id === a.id);
    let h = `<div class="t1"><span class="ux-face" style="${faceStyle(a, 36, 190, 20)};width:40px;height:40px"></span><b>${a.name}</b><span class="ux-muted">${a.cls} Lv ${a.lv}</span></div>`;
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
      h += `<div class="row">애착 <b>${Gm.ATTACH_TITLE[Gm.attachTier(a)]}</b> <span class="ux-muted">(${Math.round(a.attach)})</span></div>`;
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
  function advDetail(a) {
    const G = s.cfg.growth, cap = Gm.lvCapOf(s, a), need = G.lvA * Math.pow(a.lv, G.lvB), xp = a.lv >= cap ? 100 : Math.min(100, a.xp / need * 100);
    const path = a.cls1 === a.cls ? a.cls : `${a.cls1} → ${a.cls}`;
    // 머리
    let h = `<div class="av-head"><div class="ux-portrait sm"><i style="${faceStyle(a, 104, 260, 58)}"></i></div><div class="who">
      <div class="nm">${a.name} <i class="ux-grade" style="background-image:url(assets/ui/hud/badge_${GR[a.grade]}.png)"></i><span class="cls">${STAGE[a.stage]} ${path}</span>${stTag(a)}<span class="gold av-wal" title="모험가 소지금 (식사·물약·장비 구매에 씀)"><i></i>${fmt(Math.round(a.wallet || 0))}G</span></div>
      <div class="lv"><b>Lv ${a.lv}</b><div class="ux-bar blue"><i style="width:${xp}%"></i></div><span>${a.lv >= cap ? '레벨 상한' : '다음 레벨까지 ' + fmt(need - a.xp)}</span></div></div></div>`;
    // 장비
    const CB_ = root.GuildCombat ? root.GuildCombat.make(root.GAME_DATA) : null, GE = s.cfg.gear;
    const slots = CB_ ? [['무기', CB_.WEAPON[a.core]], ['방어구', CB_.ARMOR[a.core]], ['장신구', CB_.ACC[(a.core + 2) % 5]]] : [];
    // 다음 장비까지: 구매 조건 = 세트 가격 × (1 + 소비 성향 여유분 × 0.5) 이상 모이면 삼 (game_core 장비 구매와 같은 식)
    const ng = Math.min(s.grade, a.gear + 1);
    let nx;
    if (ng <= a.gear) nx = `<span class="av-next max">길드 등급 상한</span>`;
    else { const price = GE.weaponPrice[ng] * GE.setMult, need = Math.round(price * (1 + GE.reserveMult[a.spend] * 0.5)), have = Math.round(a.wallet || 0);
      nx = `<span class="av-next" title="${GR[ng]}급 장비 세트 ${fmt(price)}G · ${Gm.SPEND[a.spend]} 성향이라 ${fmt(need)}G가 모이면 삼"><em>다음 장비(${GR[ng]}급)</em><span class="ux-bar"><i style="width:${Math.min(100, have / need * 100)}%"></i></span><b>${fmt(Math.min(have, need))}/${fmt(need)}G</b></span>`; }
    let eq = '<div class="av-eq"><div class="ux-h">장비' + nx + '</div><div class="eqgrid">';
    for (const [nm, type] of slots) {
      const it = a.gear >= 0 ? gearItem(type, a.gear) : null;
      const tip = it ? `${nm} · ${it.name}\n${[it.atk && '공격 ' + it.atk, it.def && '방어 ' + it.def, it.mdef && '마방 ' + it.mdef, it.hp && '체력 ' + it.hp, it.mp && '마력 ' + it.mp].filter(Boolean).join(' · ')}` : nm + ': 없음';
      eq += it ? `<span class="ux-slot" data-g="${a.gear}" title="${tip}"><img src="assets/${it.icon}" alt=""></span>` : `<span class="ux-slot empty" data-ph="${nm}" title="${tip}"></span>`;
    }
    // 물약 3칸: 가진 수만큼 채움, 소비 성향으로 못 드는 칸은 잠금 (절약 1 · 보통 2 · 낭비 3)
    const carry = (CB_ && CB_.C.potionCarry[a.spend]) || 3, pg = Math.min(1, s.grade), pot = ITEMS_.find(i => i.id === (pg ? 'pot_03' : 'pot_01'));
    eq += '</div><div class="ux-h" style="margin-top:12px">물약 <small>최대 ' + carry + '개 (' + Gm.SPEND[a.spend] + ')</small></div><div class="potgrid">';
    for (let k = 0; k < 3; k++) eq += k < (a.pots || 0) ? `<span class="ux-slot pot" data-g="${pg}" title="${pot ? pot.name : '회복 물약'}"><img src="assets/${pot ? pot.icon : ''}" alt=""></span>` : k < carry ? '<span class="ux-slot pot empty" data-ph=""></span>' : '<span class="ux-slot pot locked" title="소비 성향 때문에 들고 다니지 않음"></span>';
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
      st += `<div class="srow ${core ? 'core' : ''}"><span class="k">${Gm.STATS[i]}</span><span class="cells">${cells}</span><span class="v">${Math.round(base)}${plus > 0 ? `<span class="ux-plus"> +${Math.round(plus)}</span>` : ''}</span></div>`;
    }
    // 전투 수치 4개 (세부는 마우스 오버)
    if (CB_ && CB_.ok) {
      const u = CB_.unit(a, i => Gm.finalStat(s, a, i), a.gear, 0);
      const more = `회피 ${Math.round(u.evade * 100)}% · 치명타 ${Math.round(u.crit * 100)}% · 마법방어 ${Math.round(u.mdef)} · ${['앞줄', '가운데', '뒷줄'][u.row]}`;
      st += `<div class="cbs" title="${more}"><span>공격 <b>${Math.round(u.atk)}</b></span><span>방어 <b>${Math.round(u.def)}</b></span><span>체력 <b>${Math.round(u.maxHp)}</b></span><span>마력 <b>${Math.round(u.maxMp)}</b></span></div>`;
    }
    st += '</div>';
    h += `<div class="av-body">${eq}${st}</div>`;
    // 아래 탭: 스킬(기본) · 전직 · 성향 · 경력. 항상 하나가 펼쳐져 있음
    const TABS = [['skill', '스킬'], ['path', '전직'], ['trait', '성향'], ['career', '경력']];
    h += `<div class="av-tabs"><div class="ux-tabs">${TABS.map(([k, n]) => `<button data-atab="${k}" class="${advTab === k ? 'on' : ''}">${n}</button>`).join('')}</div>`;
    if (advTab === 'skill') {
      let sl = '';
      for (let i = 0; i < 5; i++) {
        const k = a.skills[i];
        if (!k) { sl += '<span class="sk empty"><span class="ux-slot skslot empty" data-ph=""></span><em>빈 칸</em></span>'; continue; }
        const n = skillName(k);
        sl += `<span class="sk" data-sk="${i}"><span class="ux-slot skslot" data-line="${k.line}"><img src="assets/icons/${skillIcon(k)}" alt=""></span><em>${n.name}</em></span>`;
      }
      h += `<div class="av-tb"><div class="ux-h">장착 스킬 <small>${a.skills.length} / 5</small></div><div class="skrow">${sl}</div></div>`;
    }
    else if (advTab === 'path') h += `<div class="av-tb"><div class="ux-h">전직의 길</div>${pathHtml(a)}</div>`;
    else if (advTab === 'trait') {
      const C = (CB_ && CB_.C) || {}, AT = [0, 30, 60, 90, 100], tier = Gm.attachTier(a), lo = AT[tier], hi = AT[tier + 1];
      // 수치는 내부 규칙에만 두고 화면에는 행동 문장으로 보여 줌 (위험 → '모험심'으로 표시). 말투는 모험심·사교에서 정해지므로 뺌
      const TXT = {
        risk: ['승산이 확실한 의뢰만 고르고, 조금만 다쳐도 물약을 꺼냅니다.', '자기 실력에 맞는 의뢰를 고르고, 위험하면 물러설 줄 압니다.', '실력보다 높은 의뢰에도 겁 없이 뛰어들고, 쓰러지기 직전까지 버팁니다.'],
        spend: ['돈을 아껴 식사는 자주 거르고, 장비는 넉넉히 모인 뒤에야 삽니다.', '먹을 땐 먹고, 필요한 만큼만 씁니다.', '번 돈은 바로 쓰는 편이라 식당 단골이고, 물약도 가득 챙깁니다.'],
        social: ['웬만해선 혼자 떠나고, 정말 어려운 의뢰에만 동료를 찾습니다.', '버거운 의뢰라 싶으면 동료를 모읍니다.', '쉬운 의뢰에도 함께 갈 동료부터 찾습니다.']
      };
      const ATT_TXT = ['아직 길드에 마음을 두지 않았습니다. 언제든 떠날 수 있습니다.', '길드에 정이 들기 시작했습니다.', '길드를 믿고 오래 머무르려 합니다.', '이 마을과 길드를 자기 집처럼 여깁니다.'];
      const row = (k, v, txt) => `<div class="trow"><span class="tk">${k}</span><span class="ux-tag">${v}</span><span class="fx">${txt}</span></div>`;
      h += `<div class="av-tb av-trait">
        <div class="tatt"><span class="tk">애착</span><span class="ux-tag gold">${Gm.ATTACH_TITLE[tier]}</span>${tier < 3 ? `<span class="ux-bar att"><i style="width:${Math.min(100, (a.attach - lo) / (hi - lo) * 100)}%"></i></span><span class="num">${Math.round(a.attach)} / ${hi}</span><span class="ux-muted">다음 단계 ${Gm.ATTACH_TITLE[tier + 1]}</span>` : `<span class="num">${Math.round(a.attach)}</span>`}</div>
        <div class="tatt-txt">${ATT_TXT[tier]}</div>
        ${row('모험심', Gm.RISK[a.risk], TXT.risk[a.risk])}${row('소비', Gm.SPEND[a.spend], TXT.spend[a.spend])}${row('사교', Gm.SOCIAL[a.social], TXT.social[a.social])}</div>`;
    }
    else if (advTab === 'career') h += `<div class="av-tb"><div class="ux-h">경력 <small>의뢰 성공 ${a.done}회</small></div><ul class="career">${a.career.slice().reverse().map(c => `<li><span class="w">${Gm.dateLabel(c.week)}</span>${c.text}</li>`).join('')}</ul></div>`;
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
  function promoHtml() {
    const ps = s.proposals || [];
    if (!ps.length) return '<p class="muted">지금은 전직 제안이 없습니다. 모험가가 조건을 채우면 리나가 매달 초에 알려 드려요.</p>';
    return ps.map(p => {
      const a = s.advs.find(x => x.id === p.id); if (!a) return '';
      const tier = Gm.attachTier(a), chance = Math.min(1, [0.40, 0.65, 0.90, 1.00][tier] * (p.to === 2 ? 1.2 : 0.9));
      const opts = p.opts.map(n => {
        const c = Gm.CLASS2.find(x => x.name === n) || Gm.CLASS3.find(x => x.name === n);
        const fake = Object.assign({}, a, { stage: p.to, line: c.line, fin: !!c.fin });
        const g0 = Gm.growthOf(a), g1 = Gm.growthOf(fake);
        const evo = a.skills.filter(k => c.line.includes(k.line)).map(k => `${skillName(k).name} → ${skillName({ line: k.line, form: n }).name}`);
        return `<div class="opt"><div class="ot"><b>${n}</b>${c.fin ? '<span class="tagx">2차 종결 · 레벨 상한 50</span>' : '<span class="tagx">3차로 이어짐 · 레벨 상한 40</span>'}</div>
          <div class="muted">조건 ${Object.keys(c.req).map(k => `${Gm.STATS[k]} ${c.req[k]} (현재 ${Math.floor(a.stats[k])})`).join(' · ')}</div>
          <div>레벨업 성장 ${[0, 1, 2, 3, 4].map(i => `${Gm.STATS[i]} ${g0[i].toFixed(1)}→<b class="${g1[i] > g0[i] ? 'pos' : g1[i] < g0[i] ? 'neg' : ''}">${g1[i].toFixed(1)}</b>`).join(' · ')}</div>
          <div>스킬 진화 ${evo.length ? evo.join(', ') : '<span class="muted">없음 (바탕 능력치가 이 직업 조건에 없음)</span>'}</div>
          <button class="sbtn big" data-promo="${a.id}" data-cls="${n}">${n}(으)로 전직 승인</button></div>`;
      }).join('');
      return `<section class="prop"><div class="ph">${radar(a, 200)}<div><h3>${a.name} ${badge(a.grade)} <small class="muted">${a.cls} · Lv ${a.lv}</small></h3>
        <p>애착 ${Math.round(a.attach)} <b>${Gm.ATTACH_TITLE[tier]}</b> → 수락 확률 약 <b>${Math.round(chance * 100)}%</b> <span class="muted">(거절해도 벌칙 없이 3개월 뒤 다시 제안)</span></p>
        <button class="sbtn" data-hold="${a.id}">보류</button></div></div><div class="opts">${opts}</div></section>`;
    }).join('');
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
    게시판: '의뢰가 붙는 곳. 길드 등급이 오를수록 칸이 늘어납니다.', 접수대: '모험가가 의뢰를 받아 가고 결과를 보고합니다.',
    주점: '출발 전 식사로 능력치가 오르고, 식사 수입이 들어옵니다.', 판매창구: '의뢰에서 얻은 소재를 되팔아 수입을 얻습니다.',
    관리소: '2차 전직을 할 수 있게 됩니다.', 의무실: '부상 회복이 빨라지고, 사망 확률이 줄어듭니다.',
    집무실: '스토리·귀빈 의뢰를 받고 길드 운영을 설정합니다.', 훈련장: '힘·민첩·기교를 훈련합니다. D → C 승급 조건.', 창고: '소재를 보관합니다.',
    추모실: '떠난 모험가와 가문의 기록을 남깁니다.', 정보실: '중계료가 오르고, 예상 성공률이 정확해집니다.', 도서관: '지력·정신을 훈련합니다.',
    해체장: '원재료를 가공해 상위 레시피를 엽니다. B → A 승급 조건.', 휴게실: '모험가의 애착이 더 빨리 오릅니다.', '명예의 전당': '명성이 오르고 3차 직업 모험가를 기록합니다. A → S 승급 조건.'
  };
  const FAC_READY = { 게시판: 1, 접수대: 1, 주점: 1, 판매창구: 1, 관리소: 1, 의무실: 1 };   // 지금 게임에 실제 효과가 있는 시설
  const FAC_LABEL = { 게시판: '의뢰 게시판', 주점: '주점·식당', 판매창구: '소재 판매 창구', 관리소: '모험가 관리소', 집무실: '길드 마스터 집무실' };
  function facHtml() {
    const all = ['게시판', '접수대', '주점', '판매창구'].concat(FACS), run = [], can = [], lock = [];
    for (const f of all) {
      const g = Gm.FAC_COST[f] == null ? 0 : Gm.FAC_COST[f], cost = s.cfg.econ.buildCost[g], ready = !!FAC_READY[f];
      let st, grp;
      if (s.built[f]) { st = '<span class="ux-tag town">● 운영 중</span>'; grp = run; }
      else if (!ready) { st = '<span class="ux-tag fx-soon">준비 중</span>'; grp = lock; }
      else if (g > s.grade) { st = `<span class="fx-lock">${GR[g]}급부터</span>`; grp = lock; }
      else { st = `<button class="ux-btn sm" data-build="${f}" ${s.gold < cost ? 'disabled' : ''}>짓기 <b>${fmt(cost)}G</b></button>`; grp = can; }
      grp.push(`<div class="fx-row ${s.built[f] ? 'on' : ''} ${grp === lock ? 'off' : ''} ${grp === can && s.gold >= cost ? 'glow' : ''}">${badge(g)}<b class="nm">${FAC_LABEL[f] || f}</b><span class="fx ${ready ? '' : 'soon'}">${FAC_FX[f] || ''}</span><span class="st">${st}</span></div>`);
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
      return `<button class="kmat ${!k ? 'unk' : n - used <= 0 ? 'zero' : ''}" ${k && n - used > 0 ? `data-kmat="${m.id}"` : 'disabled'} title="${k ? esc(m.name) : '???'}"><span class="ux-slot${k ? '' : ' unk'}" data-g="${GR.indexOf(m.grade)}">${k || m.icon ? matImg(m) : ''}</span><em>${k ? esc(m.name) : '???'}</em>${k ? `<i>×${n - used}</i>` : ''}</button>`; }).join('');
    // 조리대
    let slots = '';
    const shown = kAnim ? kAnim.sel : kSel;
    for (let i = 0; i < 3; i++) { const m = MATS[shown[i]]; slots += (i ? `<span class="plus ${kAnim ? 'gone' : ''}">+</span>` : '') + (m ? `<button class="kslot ${kAnim ? 'drop' : ''}" style="--d:${i * 90}ms" ${kAnim ? '' : `data-kslot="${i}"`} title="빼기"><span class="ux-slot" data-g="${GR.indexOf(m.grade)}">${matImg(m)}</span><em>${esc(m.name)}</em></button>` : `<span class="kslot ${kAnim ? 'drop' : ''}" style="--d:${i * 90}ms"><span class="ux-slot empty" data-ph=""></span><em>&nbsp;</em></span>`); }   // 조리 중에는 빈 칸까지 3칸 모두 사라짐
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
    function dishFront(d) { return `<div class="kdish"><span class="pic"><img src="assets/${d.icon}" alt=""></span><div><b>${d.name}</b><div class="rc">${d.mats.map(m => `<span class="ux-slot" data-g="${GR.indexOf((MATS[m] || {}).grade)}">${matImg(MATS[m] || {})}</span>`).join('<span class="plus">+</span>')}<span class="kfx">${esc(d.effect)}</span></div></div></div>`; }
    return `<div class="kitchen"><div class="kpan"><div class="ux-h">소재 보관함 <small>음식 소재</small></div><div class="kpantry">${pantry}</div></div>
      <div class="kpan"><div class="ux-h">조리대</div><div class="kslots">${slots}</div>${pot}<button class="ux-btn kcook" data-kcook="1" ${kSel.length && !kAnim ? '' : 'disabled'}>만들어 보기</button>${msg}</div>
      <div class="kpan wide"><div class="ux-h">메뉴판</div><div class="kmenuwrap">${menu}</div></div></div>`;
  }
  function logHtml() {
    return '<div class="log">' + s.log.slice(0, 120).map(e => `<div class="k-${e.kind}"><span class="w">${Gm.dateLabel(e.week).replace('년차 ', '/').replace('월 ', '/').replace('주', '')}</span>${e.text}</div>`).join('') + '</div>';
  }
  stagePopClicks();
  function stagePopClicks() {
    document.addEventListener('click', e => {
      if (!popup) return;
      const t = e.target.closest('[data-build], [data-adv], [data-promo], [data-hold], [data-ctab], [data-atab], [data-kmat], [data-kslot], [data-kcook]'); if (!t) return;
      if (t.dataset.kmat) { if (kSel.length < 3 && !kSel.includes(t.dataset.kmat)) kSel.push(t.dataset.kmat); kMsg = null; renderPopup(); return; }
      if (t.dataset.kslot) { kSel.splice(+t.dataset.kslot, 1); kMsg = null; renderPopup(); return; }
      if (t.dataset.kcook) {   // 큰 솥 연출(약 1.6초) 뒤 결과. 연출 중 식당 아무 곳이나 누르면 바로 결과
        if (kAnim) return;
        const r = Gm.cook(s, kSel);
        if (r.kind === 'known' || r.kind === 'invalid') { kMsg = cookMsg(r); renderPopup(); kToast(kMsg); return; }
        kAnim = { sel: kSel.slice(), r }; kSel = []; kMsg = null; kFx = ''; hooks.changed(); renderPopup();
        kTimer = setTimeout(kitchenDone, 1600); return;
      }
      if (t.dataset.atab) { advTab = t.dataset.atab; renderPopup(); return; }
      if (t.dataset.ctab) { codexTab = +t.dataset.ctab; renderPopup(); return; }
      if (t.dataset.build) { Gm.build(s, t.dataset.build); hooks.changed(); }
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
      for (let i = 0; i < N; i++) { const g = Gm.newGame(Sim.defaults(), 7000 + i); for (let w = 0; w < 48; w++) { Gm.stepWeek(g); Gm.autoCook(g); /* 요리: 재료가 모이면 바로 만든다고 가정 (시뮬레이터와 같음) */ } op += g.history.reduce((t, m) => t + m.net, 0) / g.history.length; d += g.stats.done; f += g.stats.fail; }
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
