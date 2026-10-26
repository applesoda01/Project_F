/* 리나 클릭 메뉴 (2026-10-26 확정 수치 · docs/art/ui/lina_menu)
   - 리나를 누르면 좌3·우3 명패 6개가 열린다. 명패는 DOM(stage.ui 안)으로 그려 1920×1080 좌표를 그대로 쓴다.
   - 수치는 시뮬레이터(tools/ui/lina_menu_simulator.html)에서 확정한 값. 아래 P 에서 고친다.
   - 그림: assets/ui/lina_menu/btn_{normal,locked,mainquest,hover,selected}.png (680×168 @2x, 화면 340×84)
   - 아이콘은 임시 SVG (최종 아이콘이 나오면 ICON 만 교체). 튜토리얼 단계별 열림은 가장 마지막에 구현 예정 → 지금은 6개 고정. */
(function (root) {
  'use strict';
const SVG={
 talk:'<svg viewBox="0 0 40 40"><path d="M6 8h28a3 3 0 0 1 3 3v14a3 3 0 0 1-3 3H19l-8 7v-7H6a3 3 0 0 1-3-3V11a3 3 0 0 1 3-3z" fill="#f6dcc4" stroke="#5a3a22" stroke-width="2.5" stroke-linejoin="round"/><circle cx="13" cy="18" r="2" fill="#5a3a22"/><circle cx="20" cy="18" r="2" fill="#5a3a22"/><circle cx="27" cy="18" r="2" fill="#5a3a22"/></svg>',
 cook:'<svg viewBox="0 0 40 40"><path d="M7 18h26v8a8 8 0 0 1-8 8H15a8 8 0 0 1-8-8z" fill="#c8995f" stroke="#5a3a22" stroke-width="2.5" stroke-linejoin="round"/><rect x="5" y="14" width="30" height="5" rx="2.5" fill="#e0b878" stroke="#5a3a22" stroke-width="2.5"/><path d="M14 10c-2-2 2-3 0-6M21 10c-2-2 2-3 0-6M28 10c-2-2 2-3 0-6" fill="none" stroke="#8a7258" stroke-width="2.2" stroke-linecap="round"/></svg>',
 menu:'<svg viewBox="0 0 40 40"><rect x="8" y="4" width="24" height="32" rx="3" fill="#fff3d6" stroke="#5a3a22" stroke-width="2.5"/><path d="M13 12h14M13 19h14M13 26h8" stroke="#8a7258" stroke-width="2.4" stroke-linecap="round"/><circle cx="29" cy="28" r="6" fill="#e8b44a" stroke="#5a3a22" stroke-width="2.2"/><path d="M26.5 28l2 2 3.5-4" fill="none" stroke="#5a3a22" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
 promo:'<svg viewBox="0 0 40 40"><path d="M20 3l5 10 11 1.5-8 7.5 2 11L20 28l-10 5 2-11-8-7.5L15 13z" fill="#e8b44a" stroke="#5a3a22" stroke-width="2.5" stroke-linejoin="round"/><path d="M20 12v10M16 16l4-4 4 4" fill="none" stroke="#5a3a22" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
 town:'<svg viewBox="0 0 40 40"><path d="M4 36h32" stroke="#5a3a22" stroke-width="2.5" stroke-linecap="round"/><path d="M8 19h24v17H8z" fill="#f6dcc4" stroke="#5a3a22" stroke-width="2.5" stroke-linejoin="round"/><path d="M4 20L20 6l16 14z" fill="#c0642e" stroke="#5a3a22" stroke-width="2.5" stroke-linejoin="round"/><path d="M16 36V26a4 4 0 0 1 8 0v10z" fill="#c8995f" stroke="#5a3a22" stroke-width="2.3" stroke-linejoin="round"/><rect x="26" y="23" width="4" height="4" fill="#e8b44a" stroke="#5a3a22" stroke-width="1.8"/><path d="M29 11V6h4v8" fill="#c8995f" stroke="#5a3a22" stroke-width="2.2" stroke-linejoin="round"/></svg>',
 quest:'<svg viewBox="0 0 40 40"><path d="M9 6h20a3 3 0 0 1 3 3v22a3 3 0 0 0 3 3H12a3 3 0 0 1-3-3z" fill="#fff3d6" stroke="#5a3a22" stroke-width="2.5" stroke-linejoin="round"/><path d="M32 31v3H12a3 3 0 0 1-3-3" fill="#e0b878" stroke="#5a3a22" stroke-width="2.2" stroke-linejoin="round"/><path d="M15 13h11M15 19h11" stroke="#8a7258" stroke-width="2.4" stroke-linecap="round"/><path d="M26 22v9" stroke="#5a3a22" stroke-width="2.4" stroke-linecap="round"/><path d="M26 22l7 2.5-7 2.5z" fill="#c0392b" stroke="#5a3a22" stroke-width="2" stroke-linejoin="round"/></svg>'
};

  const P = {
    scale: 80, gap: 190, pitch: 109, top0: 125, arc: 50, iconSize: 48, fontSize: 24,       // 크기 · 배치
    hoverScale: 115, otherScale: 88, hoverMs: 160, hoverEase: 'ease', glow: 15,           // 마우스 오버
    inMs: 320, inEase: 'cubic-bezier(.34,1.56,.64,1)', inStep: 70, inFrom: 0.25,           // 등장: 리나에게서 나옴, 왼쪽부터 순차
    outMs: 220, outEase: 'ease-in', outStep: 50, outTo: 0.6,                                // 사라짐: 줌인(작아지며), 왼쪽부터 순차 · 역순
    cx: 960, cy: 290, W: 340, Hh: 84
  };
  const IMG = { n: 'assets/ui/lina_menu/btn_normal.png', l: 'assets/ui/lina_menu/btn_locked.png', m: 'assets/ui/lina_menu/btn_mainquest.png', h: 'assets/ui/lina_menu/btn_hover.png', s: 'assets/ui/lina_menu/btn_selected.png' };
  const ITEMS = {
    talk: { ico: 'talk', t: '이야기하기', s: '리나와 대화' },
    cook: { ico: 'cook', t: '요리하기', s: '소재로 새 요리 개발' },
    menu: { ico: 'menu', t: '음식 설정하기', s: '판매할 음식 선택' },
    promo: { ico: 'promo', t: '전직 제안', s: '전직 가능 모험가' },
    quest: { ico: 'quest', t: '메인 퀘스트', s: '지명할 모험가 선택', main: 1 },
    town: { ico: 'town', t: '마을로 가기', s: '마을로 나가기' }
  };
  const LEFT = ['talk', 'cook', 'menu'], RIGHT = ['promo', 'quest', 'town'];
  const LM = { open: false, slots: [], hovered: null, anims: [], busy: 0 };
  let host, wrap, getS, UIr;

  const css = `
#linaHit{position:absolute;left:${P.cx - 80}px;top:164px;width:160px;height:250px;cursor:pointer;z-index:2}
#lmenu{position:absolute;left:0;top:0;width:1920px;height:1080px;z-index:3;pointer-events:none!important;transform-origin:${P.cx}px ${P.cy}px;transform:scale(${P.scale / 100})}
#lmenu .lm-slot{position:absolute;width:${P.W}px;height:${P.Hh}px;pointer-events:auto!important;visibility:hidden}
#lmenu .lm-slot *{pointer-events:none!important}
#lmenu .lm-pill{position:absolute;inset:0;transform:scale(var(--sc,1));transition:transform ${P.hoverMs}ms ${P.hoverEase}}
#lmenu .lm-bg{position:absolute;inset:0;background-size:100% 100%;transition:filter ${P.hoverMs}ms ease}
#lmenu .lm-it{position:absolute;left:0;top:0;width:${P.W}px;height:78px;display:flex;align-items:center;gap:10px;padding:0 16px 0 22px;color:#3b2a1e;font-weight:700;text-align:left;cursor:pointer;user-select:none}
#lmenu .lm-ico{flex:none;width:52px;height:52px;display:grid;place-items:center}
#lmenu .lm-ico svg{width:${P.iconSize}px;height:${P.iconSize}px;filter:drop-shadow(0 2px 1px rgba(90,58,34,.35))}
#lmenu .lm-tx{flex:1;line-height:1.1;font-size:${P.fontSize}px}
#lmenu .lm-sub{display:block;font-size:15px;font-weight:600;color:#8a7258;margin-top:2px}
#lmenu .locked .lm-it{color:#6f6a62;cursor:not-allowed}#lmenu .locked .lm-sub{color:#8b857a}#lmenu .locked .lm-ico{filter:grayscale(1);opacity:.55}
#lmenu .lm-pill.hv .lm-it{color:#fff3d6}#lmenu .lm-pill.hv .lm-sub{color:#ead6ae}
#lmenu .lm-pill.hv .lm-ico svg{filter:brightness(1.75) saturate(.9) drop-shadow(0 0 1.5px rgba(255,243,214,.95))}
#lmenu .lm-cnt{position:absolute;right:-6px;top:-8px;min-width:28px;height:28px;border-radius:14px;background:#c0392b;color:#fff;font-size:16px;font-weight:700;display:grid;place-items:center;padding:0 8px;border:3px solid #fff8e8;box-shadow:0 2px 0 rgba(0,0,0,.25)}
`;

  function lockInfo(k) {                                   // 잠김 여부와 이유
    const s = getS(); const np = ((s && s.proposals) || []).length;
    if (k === 'promo') return np ? null : '지금은 전직 제안이 없습니다.';
    if (k === 'quest') return '메인 퀘스트 지명은 아직 준비 중입니다.';
    return null;
  }
  function build() {
    wrap.innerHTML = ''; LM.slots = [];
    const s = getS(); const np = ((s && s.proposals) || []).length;
    const arc = [0, P.arc, 0];
    const mk = (k, i, side) => {
      const m = ITEMS[k], o = arc[i] || 0, el = document.createElement('div');
      const x = side === 'R' ? P.cx + P.gap + o : P.cx - P.gap - P.W - o, y = P.top0 + i * P.pitch;
      el.className = 'lm-slot'; el.style.left = x + 'px'; el.style.top = y + 'px';
      const cnt = k === 'promo' && np ? `<span class="lm-cnt">${np}</span>` : '';
      el.innerHTML = `<div class="lm-pill"><div class="lm-bg"></div><div class="lm-it"><span class="lm-ico">${SVG[m.ico]}</span><span class="lm-tx">${m.t}<span class="lm-sub">${m.s}</span></span></div>${cnt}</div>`;
      el._k = k; el._side = side; el._i = i; el._why = lockInfo(k); el._lock = !!el._why;
      if (el._lock) el.querySelector('.lm-pill').classList.add('locked');
      el.addEventListener('mouseenter', () => { if (!el._lock && LM.open) { LM.hovered = el; paint(); } });
      el.addEventListener('mouseleave', () => { if (LM.hovered === el) { LM.hovered = null; paint(); } });
      el.addEventListener('click', ev => { ev.stopPropagation(); onPick(el); });
      wrap.appendChild(el); LM.slots.push(el);
    };
    LEFT.forEach((k, i) => mk(k, i, 'L')); RIGHT.forEach((k, i) => mk(k, i, 'R'));
    paint();
  }
  function paint() {
    LM.slots.forEach(el => {
      const pill = el.firstChild, bg = pill.querySelector('.lm-bg'), isH = LM.hovered === el;
      const img = isH ? IMG.h : el._lock ? IMG.l : ITEMS[el._k].main ? IMG.m : IMG.n;
      bg.style.backgroundImage = `url(${img})`;
      bg.style.filter = isH && P.glow > 0 ? `drop-shadow(0 0 ${P.glow}px rgba(255,214,120,.8))` : 'none';
      pill.classList.toggle('hv', isH);
      pill.style.setProperty('--sc', LM.hovered ? (isH ? P.hoverScale / 100 : P.otherScale / 100) : 1);
      el.style.zIndex = isH ? 5 : 1;
    });
  }
  function onPick(el) {
    if (!LM.open) return;
    if (el._lock) { UIr.toast(el._why, 'warn'); return; }
    const k = el._k; LM.close(true);
    if (k === 'talk') UIr.say([{ face: 'smile', text: (root.Speech && root.Speech.lina('lina_idle')) || '무엇이든 편하게 말씀해 주세요.' }]);
    else if (k === 'cook') UIr.say([{ face: 'awkward', text: '요리하기는 아직 준비 중이에요. 조금만 기다려 주세요.' }]);
    else if (k === 'menu') UIr.open('meals');
    else if (k === 'promo') UIr.open('promo');
    else if (k === 'town') UIr.toast('마을 화면은 아직 준비 중입니다.', 'warn');
  }

  // ---------- 열기 / 닫기 (등장: 리나에게서 · 사라짐: 줌인, 왼쪽부터 순차) ----------
  const order = () => LM.slots.slice().sort((a, b) => (a._side === 'L' ? 0 : 1) - (b._side === 'L' ? 0 : 1) || a._i - b._i);
  function stop() { LM.anims.forEach(a => { try { a.cancel(); } catch (e) { /* 이미 끝남 */ } }); LM.anims = []; clearTimeout(LM.t); }
  function reduced() { return root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches; }
  LM.openMenu = function () {
    if (LM.open) return; stop(); build(); LM.open = true; LM.hovered = null;
    const list = order();
    list.forEach((el, i) => {
      el.style.visibility = 'visible';
      if (reduced()) return;
      const dx = P.cx - (parseFloat(el.style.left) + P.W / 2), dy = P.cy - (parseFloat(el.style.top) + P.Hh / 2);
      const hid = { opacity: 0, transform: `translate(${dx}px,${dy}px) scale(${P.inFrom})` };
      LM.anims.push(el.animate([hid, { opacity: 1, transform: 'none' }], { duration: P.inMs, delay: i * P.inStep, easing: P.inEase, fill: 'both' }));
    });
  };
  LM.close = function (fast) {
    if (!LM.open) return; stop(); LM.open = false; LM.hovered = null; paint();
    if (fast === true || reduced()) { LM.slots.forEach(el => el.style.visibility = 'hidden'); return; }
    const list = order().reverse();
    list.forEach((el, i) => LM.anims.push(el.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: `scale(${P.outTo})` }], { duration: P.outMs, delay: i * P.outStep, easing: P.outEase, fill: 'both' })));
    LM.t = setTimeout(() => { if (!LM.open) LM.slots.forEach(el => el.style.visibility = 'hidden'); }, P.outMs + list.length * P.outStep + 30);
  };
  LM.toggle = function () { LM.open ? LM.close() : LM.openMenu(); };
  LM.blocked = () => !!(host.querySelector('#popBack.open') || host.querySelector('#dlg.open'));

  LM.init = function (stage, getState, ui) {
    host = stage.ui; getS = getState; UIr = ui;
    const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    const hit = document.createElement('div'); hit.id = 'linaHit'; hit.title = '리나';
    hit.addEventListener('click', ev => { ev.stopPropagation(); if (!LM.blocked()) LM.toggle(); });
    wrap = document.createElement('div'); wrap.id = 'lmenu';
    host.appendChild(hit); host.appendChild(wrap);
    host.addEventListener('click', ev => { if (LM.open && !ev.target.closest('.lm-slot, #linaHit')) LM.close(); });
    root.addEventListener('keydown', ev => { if (ev.key === 'Escape' && LM.open) LM.close(); });
    setInterval(() => { if (LM.open) { const keep = LM.hovered && LM.hovered._k; const np = ((getS() || {}).proposals || []).length; const cur = wrap.querySelector('.lm-cnt'); if ((cur ? +cur.textContent : 0) !== np) { const was = LM.slots.map(e => e.style.visibility); build(); LM.slots.forEach(e => e.style.visibility = 'visible'); } } }, 600);
  };
  root.LinaMenu = LM;
})(this);
