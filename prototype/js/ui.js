/* 화면 틀과 대화 (2-B)
   M2-9  겹침 UI: 네 모서리(상태 · 배속/메뉴 · 개발 · 기능 버튼) + 알림 + 공통 팝업 틀
   M2-10 팝업: 게시판(칸 배분 · 의뢰 · 나가 있는 파티) · 장부 · 모험가 · 시설 · 식당 · 기록 — 1차 기능을 옮김
   M2-11 리나 대화: 표정 6종 전환, 글자 타이핑, 월간 보고·등급 승급·첫 인사 */
(function (root) {
  'use strict';
  const Gm = root.GuildGame, GR = Gm.GR;
  const fmt = n => Math.round(n).toLocaleString();
  const badge = g => `<span class="gb g${g}">${GR[g]}</span>`;
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
  const TITLES = { promo: '전직 제안', board: '의뢰 게시판', ledger: '장부', advs: '모험가', fac: '시설', meals: '음식 설정', log: '길드 기록', codex: '도감', verify: '관문 1 검증' };
  UI.open = function (name) {
    popup = name; q('#popTitle').textContent = TITLES[name];
    q('#popBack').classList.add('open'); stage.ui.querySelectorAll('[data-pop]').forEach(b => b.classList.toggle('on', b.dataset.pop === name));
    q('#popBody').innerHTML = ''; q('#popBody').dataset.g = ''; q('#popBody').dataset.p = name; renderPopup(); q('#popBody').scrollTop = 0;
    if (name === 'verify') verify();
  };
  UI.close = function () { popup = null; q('#popBack').classList.remove('open'); stage.ui.querySelectorAll('[data-pop]').forEach(b => b.classList.remove('on')); };
  function renderPopup() {
    const b = q('#popBody');
    if (popup === 'board') renderBoard(b);
    else if (popup === 'ledger') b.innerHTML = ledgerHtml();
    else if (popup === 'advs') { const sc = b.querySelector('.advdet') ? b.querySelector('.advdet').scrollTop : 0; b.innerHTML = advsHtml(); const d = b.querySelector('.advdet'); if (d) d.scrollTop = sc; }
    else if (popup === 'promo') b.innerHTML = promoHtml();
    else if (popup === 'fac') b.innerHTML = facHtml();
    else if (popup === 'meals') b.innerHTML = mealsHtml();
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

  // 게시판: 칸 배분(슬라이더)은 등급이 바뀔 때만 다시 그려 드래그가 끊기지 않게 한다
  function renderBoard(b) {
    if (b.dataset.g !== String(s.grade) || !b.querySelector('#flt')) {
      b.dataset.g = s.grade;
      b.innerHTML = `<section><h3>게시판 칸 배분 <small>등급별 비중을 정하면 매달 그 비율대로 의뢰를 게시합니다</small></h3><div id="flt" class="flt"></div></section>
        <section><h3>게시된 의뢰 <small id="bInfo"></small></h3><div id="bList" class="cards"></div></section>
        <section><h3>나가 있는 파티 <small id="aInfo"></small></h3><div id="aList"></div></section>`;
      let h = '';
      for (let g = 0; g <= s.grade; g++) h += `${badge(g)}<input type="range" min="0" max="10" step="1" value="${s.filter[g]}" data-f="${g}" aria-label="${GR[g]}급 비중"><span class="n" data-fn="${g}"></span>`;
      b.querySelector('#flt').innerHTML = h;
      b.querySelector('#flt').oninput = e => { const g = +e.target.dataset.f; const w = s.filter.slice(); w[g] = +e.target.value; Gm.setFilter(s, w); fillFilter(b); };
      b.querySelector('#bList').onclick = e => { const t = e.target.closest('[data-wd]'); if (t) { Gm.withdrawQuest(s, +t.dataset.wd); hooks.changed(); } };
    }
    fillFilter(b);
    const cap = Gm.boardCap(s);
    b.querySelector('#bInfo').textContent = `${s.board.length} / ${cap}칸`;
    b.querySelector('#bList').innerHTML = s.board.length ? s.board.map(x => `
      <div class="card"><div class="t">${badge(x.g)}<b>${Gm.QTYPE[x.type]}</b><span class="n">${fmt(x.reward)}G</span></div>
      <div class="req">필요 ${x.req.map(k => `${Gm.STATS[k]} ${Math.round(x.r)}`).join(' · ')}</div>
      <div class="row"><span class="muted">${s.week - x.posted}주째 게시</span><button class="sbtn" data-wd="${x.id}" title="등록비·위약금이 들고 신뢰도가 2 내려갑니다">떼기</button></div></div>`).join('')
      : '<p class="muted">게시된 의뢰가 없습니다. 의뢰는 매달 초에 들어옵니다.</p>';
    b.querySelector('#aInfo').textContent = `${s.active.length}건`;
    b.querySelector('#aList').innerHTML = s.active.length ? `<table><tr><th>의뢰</th><th>파티</th><th class="n">성공 확률</th><th class="n">귀환</th></tr>${s.active.map(x =>
      `<tr><td>${badge(x.q.g)} ${Gm.QTYPE[x.q.type]}</td><td>${x.party.map(id => (s.advs.find(a => a.id === id) || {}).name).join('·')}</td><td class="n">${Math.round(x.p * 100)}%</td><td class="n">${Math.max(0, x.back - s.week)}주 뒤</td></tr>`).join('')}</table>` : '<p class="muted">지금 나가 있는 파티가 없습니다.</p>';
  }
  function fillFilter(b) {
    const cap = Gm.boardCap(s), tot = s.filter.slice(0, s.grade + 1).reduce((a, c) => a + c, 0) || 1;
    b.querySelectorAll('[data-fn]').forEach(el => { const g = +el.dataset.fn; el.textContent = Math.round(cap * s.filter[g] / tot) + '칸'; });
  }

  function ledgerRows(m) { return m && [['중계료', m.fee], ['소재 판매 차익', m.resale], ['식사 판매', m.meal], ['주점 매출', m.tavern], ['왕국 보조금', m.subsidy], ['시설 유지비', m.upkeep], ['기타 (의뢰서 떼기 등)', m.other]]; }
  function ledgerHtml() {
    const cur = ledgerRows(s.month), prev = ledgerRows(s.lastMonth);
    const curNet = cur.reduce((t, r) => t + r[1], 0);
    let h = `<table class="ledger"><tr><th>항목</th><th class="n">이번 달 (진행 중)</th><th class="n">지난달</th></tr>`;
    cur.forEach((r, i) => { h += `<tr><td>${r[0]}</td><td class="n">${fmt(r[1])}</td><td class="n">${prev ? fmt(prev[i][1]) : '—'}</td></tr>`; });
    h += `<tr class="tot"><td>운영 순이익</td><td class="n ${curNet < 0 ? 'neg' : 'pos'}">${fmt(curNet)}</td><td class="n ${s.lastMonth && s.lastMonth.net < 0 ? 'neg' : 'pos'}">${s.lastMonth ? fmt(s.lastMonth.net) : '—'}</td></tr></table>`;
    const hist = s.history.slice(-12);
    if (hist.length) {
      const avg = hist.reduce((t, m) => t + m.net, 0) / hist.length, succ = hist.reduce((t, m) => t + m.success, 0), qn = hist.reduce((t, m) => t + m.quests, 0);
      const mx = Math.max(1, ...hist.map(m => Math.abs(m.net)));
      h += `<section><h3>최근 ${hist.length}개월 운영 순이익 <small>평균 ${fmt(avg)}G · 의뢰 성공률 ${qn ? Math.round(succ / qn * 100) : 0}%</small></h3><div class="bars">${hist.map(m =>
        `<div class="bar" title="${fmt(m.net)}G"><i class="${m.net < 0 ? 'neg' : ''}" style="height:${Math.round(Math.abs(m.net) / mx * 100)}%"></i><span>${fmt(m.net)}</span></div>`).join('')}</div></section>`;
    } else h += '<p class="muted">첫 결산은 다음 달 초에 나옵니다.</p>';
    return h;
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
  function advStateHtml(a) { return a.state === 'quest' ? `<span class="st quest">의뢰 중 ${Math.max(0, a.until - s.week)}주</span>` : a.state === 'town' ? '<span class="st town">길드에 있음</span>' : '<span class="st away">마을 밖</span>'; }
  function advsHtml() {
    const list = s.advs.filter(a => a.alive).sort((x, y) => y.stage - x.stage || y.lv - x.lv || x.id - y.id);
    if (openAdv == null || !list.some(a => a.id === openAdv)) openAdv = list[0] && list[0].id;
    const promo = new Set((s.proposals || []).map(p => p.id));
    let h = '<div class="advwrap"><div class="advlist">';
    for (const a of list) h += `<button class="advrow ${openAdv === a.id ? 'on' : ''}" data-adv="${a.id}">${badge(a.grade)}<span class="nm">${a.name}${promo.has(a.id) ? ' <i class="star" title="전직 제안 대기">★</i>' : ''}</span><span class="cl">${a.cls}</span><span class="n">Lv ${a.lv}</span></button>`;
    h += '</div><div class="advdet">' + (openAdv != null ? advDetail(s.advs.find(a => a.id === openAdv)) : '<p class="muted">모험가가 없습니다.</p>') + '</div></div>';
    return h;
  }
  function advDetail(a) {
    const G = s.cfg.growth, cap = Gm.lvCapOf(s, a), need = G.lvA * Math.pow(a.lv, G.lvB);
    const tier = Gm.attachTier(a), gr = Gm.growthOf(a);
    const path = a.cls1 === a.cls ? a.cls : `${a.cls1} → ${a.cls}`;
    const gear = a.gear >= 0 ? GR[a.gear] + '급' : null, GE = s.cfg.gear;
    let h = `<div class="dhead"><div><h3 class="dn">${a.name} ${badge(a.grade)}</h3><div class="muted">${STAGE[a.stage]} ${path}${a.fin ? ' (종결)' : ''} · ${advStateHtml(a)}</div></div>
      <div class="lvbox"><b>Lv ${a.lv}</b><span class="muted"> / ${cap}</span><div class="xp"><i style="width:${a.lv >= cap ? 100 : Math.min(100, a.xp / need * 100)}%"></i></div><span class="muted">${a.lv >= cap ? `상한 도달 · 쌓인 경험치 ${fmt(a.bank)}` : `다음 레벨까지 ${fmt(need - a.xp)}`}</span></div></div>
      <div class="dgrid"><div>${radar(a)}<p class="muted small">파란 면 = 바탕 능력치, 점선 = 장비 포함 최종치<br>레벨업 성장치 ${gr.map((v, i) => `${Gm.STATS[i]} ${v.toFixed(1)}`).join(' · ')}</p></div><div>
      <h4>성향</h4><p>위험 ${Gm.RISK[a.risk]} · 소비 ${Gm.SPEND[a.spend]} · 사교 ${Gm.SOCIAL[a.social]} <span class="muted">(말투 ${root.Speech.TONE_NAME[root.Speech.tone(a)]})</span><br>애착 ${Math.round(a.attach)} <b>${Gm.ATTACH_TITLE[tier]}</b> · 소지금 ${fmt(a.wallet)}G · 의뢰 성공 ${a.done}회</p>
      <h4>장비 <small class="muted">3칸 분리는 3-B(M3-5)</small></h4><div class="slots">
        <div class="slot"><span>무기</span><b>${gear ? gear + ` (${Gm.STATS[a.core]} +${GE.weaponStat[a.gear]})` : '없음'}</b></div>
        <div class="slot"><span>방어구</span><b class="muted">—</b></div>
        <div class="slot"><span>장신구</span><b>${gear ? gear + ` (${Gm.STATS[(a.core + 2) % 5]} +${GE.accStat[a.gear]})` : '없음'}</b></div></div>
      <h4>스킬</h4><div class="skills">${a.skills.map(k => { const n = skillName(k); return `<div class="skill"><b>${n.name}</b><span class="muted">${Gm.STATS[k.line]} 계열 · ${n.form}형 — ${n.eff}</span></div>`; }).join('')}</div>
      </div></div>
      <h4>전직의 길 <small class="muted">발견한 직업만 보입니다</small></h4>${pathHtml(a)}
      <h4>경력</h4><ul class="career">${a.career.slice().reverse().map(c => `<li><span class="w">${Gm.dateLabel(c.week)}</span>${c.text}</li>`).join('')}</ul>`;
    return h;
  }
  function pathHtml(a) { // 발견한 직업에 대해 이 모험가의 조건 달성도
    const disc = s.discovered || {}, rows = [];
    const list = a.stage === 1 ? Gm.CLASS2 : a.stage === 2 && !a.fin ? Gm.CLASS3.filter(c => c.from === a.cls) : [];
    for (const c of list) {
      if (!disc[c.name]) continue;
      const parts = Object.keys(c.req).map(k => { const v = a.stats[k], r = c.req[k]; return `<span class="${v >= r ? 'ok' : ''}">${Gm.STATS[k]} ${Math.floor(v)}/${r}</span>`; });
      const pct = Math.min(100, Object.keys(c.req).reduce((t, k) => t + Math.min(1, a.stats[k] / c.req[k]), 0) / Object.keys(c.req).length * 100);
      rows.push(`<div class="path"><b>${c.name}</b><span class="pbar"><i style="width:${pct}%"></i></span><span>${parts.join(' · ')}${c.town ? ` · ${c.town}` : ''}</span></div>`);
    }
    const hidden = list.filter(c => !disc[c.name]).length;
    return (rows.join('') || '<p class="muted">아직 발견한 직업이 없습니다. 모험가가 조건을 채우면 길이 드러납니다.</p>') + (hidden ? `<p class="muted small">아직 모르는 직업 ${hidden}개</p>` : '') + (a.stage === 1 && !s.built['관리소'] ? '<p class="muted small">2차 전직을 하려면 모험가 관리소(E급 시설)가 필요합니다.</p>' : '');
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
  function facHtml() {
    let h = '<div class="facs">';
    for (const f of ['게시판', '접수대', '주점', '판매창구']) h += `${badge(0)}<span>${{ 게시판: '의뢰 게시판', 접수대: '접수대', 주점: '주점·식당', 판매창구: '소재 판매 창구' }[f]}</span><span class="ok">운영 중</span>`;
    for (const f of FACS) {
      const g = Gm.FAC_COST[f], cost = s.cfg.econ.buildCost[g];
      const right = s.built[f] ? '<span class="ok">운영 중</span>' : g > s.grade ? `<span class="muted">${GR[g]}급부터</span>` : `<button class="sbtn" data-build="${f}" ${s.gold < cost ? 'disabled' : ''}>짓기 ${fmt(cost)}G</button>`;
      h += `${badge(g)}<span>${FACNAME[f] || f}</span>${right}`;
    }
    return h + '</div><p class="muted">지하·2층 시설은 화면 전환(3차)에서 보이게 됩니다.</p>';
  }
  function mealsHtml() {
    return '<div class="meals">' + root.GAME_DATA.meals.map((m, i) => {
      const g = GR.indexOf(m.grade), open = s.meals[g] > i % 2;
      return `<div class="meal ${open ? '' : 'lock'}">${badge(g)}<b>${open ? m.name : '???'}</b><span class="muted">${open ? m.ingredient + ' → ' + m.effect : '재료를 구하면 메뉴에 오릅니다'}</span></div>`;
    }).join('') + '</div>';
  }
  function logHtml() {
    return '<div class="log">' + s.log.slice(0, 120).map(e => `<div class="k-${e.kind}"><span class="w">${Gm.dateLabel(e.week).replace('년차 ', '/').replace('월 ', '/').replace('주', '')}</span>${e.text}</div>`).join('') + '</div>';
  }
  stagePopClicks();
  function stagePopClicks() {
    document.addEventListener('click', e => {
      if (!popup) return;
      const t = e.target.closest('[data-build], [data-adv], [data-promo], [data-hold], [data-ctab]'); if (!t) return;
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
      for (let i = 0; i < N; i++) { const g = Gm.newGame(Sim.defaults(), 7000 + i); for (let w = 0; w < 48; w++) Gm.stepWeek(g); op += g.history.reduce((t, m) => t + m.net, 0) / g.history.length; d += g.stats.done; f += g.stats.fail; }
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
