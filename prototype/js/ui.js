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
    // 기능 버튼 → 팝업
    stage.ui.querySelectorAll('[data-pop]').forEach(b => b.onclick = () => UI.open(b.dataset.pop));
    q('#popClose').onclick = UI.close;
    q('#popBack').onclick = e => { if (e.target.id === 'popBack') UI.close(); };
    // 메뉴
    q('#menuBtn').onclick = e => { e.stopPropagation(); q('#menu').classList.toggle('open'); };
    stage.ui.addEventListener('click', e => { if (!e.target.closest('#menu, #menuBtn')) q('#menu').classList.remove('open'); });
    const shut = () => q('#menu').classList.remove('open');
    q('#mSave').onclick = () => { shut(); hooks.save(); toast('게임을 저장했습니다.', 'info'); };
    q('#mLoad').onclick = () => { shut(); hooks.load(); };
    q('#mNew').onclick = () => { shut(); hooks.newGame(); };
    q('#mReport').onclick = e => { UI.autoReport = !UI.autoReport; e.currentTarget.querySelector('i').textContent = UI.autoReport ? '켬' : '끔'; };
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
  UI.setSpeed = v => stage.ui.querySelectorAll('[data-speed]').forEach(x => x.classList.toggle('on', +x.dataset.speed === v));

  // ---------- 상태 표시 ----------
  UI.hud = function () {
    q('#hDate').textContent = Gm.dateLabel(s.week);
    q('#hGrade').className = 'gb big g' + s.grade; q('#hGrade').textContent = GR[s.grade];
    q('#hGold').textContent = fmt(s.gold); q('#hGold').classList.toggle('neg', s.gold < 0);
    q('#hTrust').textContent = Math.round(s.trust);
    q('#hFame').textContent = Math.round(s.fame || 0);
    q('#hAdv').textContent = s.advs.filter(a => a.alive).length;
    q('#bBoard').textContent = s.board.length; q('#bBoard').hidden = !s.board.length;
    const np = (s.proposals || []).length; q('#bParty').textContent = np ? '★' + np : ''; q('#bParty').hidden = !np; q('#bPromo').hidden = !np; q('#bPromo').textContent = `전직 제안 ${np}건`;
    if (popup) renderPopup();
  };
  UI.weekBar = p => { q('#hWeekBar').style.width = (p * 100).toFixed(1) + '%'; };

  // ---------- 알림 (중요한 기록만 짧게) ----------
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
      if (TOAST_KIND[L.kind] || (L.kind === 'grow' && L.text.includes('급 모험가'))) toast(L.text, L.kind);
      if (L.kind === 'ledger' && UI.autoReport) UI.monthlyReport();
      if (L.kind === 'promo' && L.text.includes('제안합니다')) { const nm = L.text.split(/[이가] \d차/)[0]; UI.say([{ face: 'surprised', text: `마스터! ${nm} 씨가 전직 조건을 채웠어요.` }, { face: 'smile', text: '오른쪽 위 "전직 제안"에서 어떤 직업으로 보낼지 정해 주세요.' }]); }
    }
  };

  // ---------- 팝업 틀 ----------
  const TITLES = { promo: '전직 제안', board: '의뢰 게시판', ledger: '장부', advs: '모험가', fac: '시설', meals: '식당 메뉴', log: '길드 기록', verify: '관문 1 검증' };
  UI.open = function (name) {
    popup = name; q('#popTitle').textContent = TITLES[name];
    q('#popBack').classList.add('open'); stage.ui.querySelectorAll('[data-pop]').forEach(b => b.classList.toggle('on', b.dataset.pop === name));
    q('#popBody').innerHTML = ''; q('#popBody').dataset.g = ''; renderPopup(); q('#popBody').scrollTop = 0;
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
    if (r.held) UI.say([{ face: 'serious', text: `알겠어요. ${a.name} 씨 전직은 조금 더 지켜볼게요.` }]);
    else if (r.accepted) { UI.say([{ face: 'surprised', text: `${a.name} 씨가 전직을 받아들였어요!` }, { face: 'laugh', text: `오늘부터 ${a.cls}예요. 레벨 상한도 풀렸어요!` }]); hooks.promoted && hooks.promoted(a); }
    else UI.say([{ face: 'awkward', text: `${a.name} 씨는 아직 생각이 없대요…` }, { face: 'smile', text: '애착이 깊어지면 마음이 바뀔지도 몰라요. 3개월 뒤에 다시 여쭤볼게요.' }]);
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
      const t = e.target.closest('[data-build], [data-adv], [data-promo], [data-hold]'); if (!t) return;
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
  const Dlg = { open: false, lines: [], cur: null, shown: 0, t: 0, hold: 0 };
  UI.say = function (lines) { // [{face:'smile', text:'…'}, …]
    Dlg.lines.push(...lines);
    if (!Dlg.open) next();
  };
  function next() {
    const L = Dlg.lines.shift();
    if (!L) { Dlg.open = false; Dlg.cur = null; q('#dlg').classList.remove('open'); root.Lina.chatting = false; return; }
    Dlg.open = true; Dlg.cur = L; Dlg.shown = 0; Dlg.t = 0; Dlg.hold = 0;
    q('#dlg').classList.add('open');
    root.Assets.items['lina_face_' + L.face] && (q('#dlgFace').src = root.Assets.items['lina_face_' + L.face].img.src || root.Assets.items['lina_face_' + L.face].img.toDataURL());
    q('#dlgText').textContent = ''; q('#dlgNext').hidden = true;
  }
  UI.advance = function () {
    if (!Dlg.cur) return;
    if (Dlg.shown < Dlg.cur.text.length) { Dlg.shown = Dlg.cur.text.length; q('#dlgText').textContent = Dlg.cur.text; q('#dlgNext').hidden = false; }
    else next();
  };
  UI.update = function (dt) { // 글자 타이핑: 초당 약 28자. 다 나오면 8초 뒤 자동으로 넘어감 (게임은 멈추지 않음)
    if (!Dlg.cur) return;
    root.Lina.chatting = Dlg.shown < Dlg.cur.text.length;
    if (Dlg.shown < Dlg.cur.text.length) {
      Dlg.t += dt; const n = Math.min(Dlg.cur.text.length, Math.floor(Dlg.t * 28));
      if (n !== Dlg.shown) { Dlg.shown = n; q('#dlgText').textContent = Dlg.cur.text.slice(0, n); if (n >= Dlg.cur.text.length) q('#dlgNext').hidden = false; }
    } else if ((Dlg.hold += dt) > 8) next();
  };
  UI.monthlyReport = function () { // 1차의 월간 보고 문장을 표정과 함께
    const m = s.lastMonth; if (!m) return;
    const succ = m.quests ? Math.round(m.success / m.quests * 100) : 0, out = [];
    if (m.net < 0) out.push({ face: 'worried', text: `마스터, 지난달은 ${fmt(-m.net)}G 적자였어요. 의뢰 ${m.quests}건 중 ${m.success}건 성공이에요.` }, { face: 'serious', text: '게시판 칸 배분을 한번 봐 주시겠어요?' });
    else if (m.net >= 500 && succ >= 60) out.push({ face: 'laugh', text: `지난달은 순조로웠어요! 순이익 ${fmt(m.net)}G, 의뢰 ${m.quests}건 중 ${m.success}건 성공(${succ}%)이에요.` }, ...(m.meal > 0 ? [{ face: 'smile', text: `식당 매출도 ${fmt(m.meal)}G 나왔어요.` }] : []));
    else if (succ < 60 && m.quests > 0) out.push({ face: 'serious', text: `지난달 의뢰 성공률이 ${succ}%로 낮았어요.` }, { face: 'awkward', text: `모험가분들 실력에 비해 의뢰가 버거운 것 같아요. 순이익은 ${fmt(m.net)}G예요.` });
    else out.push({ face: 'smile', text: `지난달 결산이에요. 순이익 ${fmt(m.net)}G, 의뢰 ${m.quests}건 중 ${m.success}건 성공했어요.` }, { face: 'smile', text: `지금 길드에는 모험가 ${s.advs.filter(a => a.alive).length}분이 계세요.` });
    UI.say(out);
  };
  UI.gradeUp = g => UI.say([{ face: 'surprised', text: `마스터! 길드가 ${GR[g]}급으로 올랐어요!` }, { face: 'laugh', text: '게시판 칸도 늘었고, 새 시설도 지을 수 있어요.' }]);

  root.UI = UI;
})(this);
