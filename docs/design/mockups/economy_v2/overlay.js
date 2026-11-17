// 경제 V2 화면 시안 덧씌우기 (E2-5, 2026-11-17 B 세션) — 게임에는 들어가지 않는 확인용 코드.
// 실제 게임 화면(책 → 모험가 → 명부)을 연 뒤 브라우저에서 이 파일을 실행하면 시안이 덧씌워진다.
//   MOCK.roster()          명부: 애착 단계 이름 + 막대 · 지역 기여 · 상주 아이콘 · 계약 기간
//   MOCK.offer(조정값)      계약제안 탭: 기본값 양식 → 4가지 조정 → 모험가 반응 3단계 → 제안 / 기본값 복원
// 수치: 결정표 7장 4번(F급 기본 계약 수수료 20% · 보수 25G · 지원 10G, [임시]) · 5번(수락 복합식, 2-7a) · 16번(선택 4가지)
(function () {
  const CSS = `
  .mk-tag{position:absolute;left:300px;top:96px;z-index:50;background:#b5462f;color:#fff;font:700 13px/1 sans-serif;padding:6px 10px;border-radius:4px;letter-spacing:.5px}
  .mk-ic{display:inline-flex;align-items:center;justify-content:center;height:18px;padding:0 5px;border-radius:9px;font-size:11px;font-weight:700;margin-left:3px;white-space:nowrap}
  .mk-ic.hm{background:#7a4a28;color:#fbefd9}.mk-ic.ct{background:#2f6a52;color:#eaf6ef}
  .mk-ic.off{background:transparent;color:transparent}
  .mk-ct{display:inline-block;margin-left:6px;padding:1px 6px;border:1.5px solid #b8862e;border-radius:3px;color:#8a5a12;font-size:12px;font-weight:700;font-style:normal;background:#fbf1d6}
  .mk-legend{margin:18px 8px 0;padding:10px 12px;border:1px dashed rgba(122,74,40,.45);border-radius:6px;font-size:13px;color:#6b4a2e;line-height:1.7}
  .mk-legend b{color:#7a4a28}
  .mk-box{grid-column:1/-1;align-self:start;height:auto;min-height:0;margin:10px 0 4px;padding:10px 12px;border:1.5px solid #b8862e;border-radius:6px;background:rgba(251,241,214,.7);font-size:14px;color:#5a3c22;line-height:1.6}
  .mk-box .h{font-weight:700;color:#8a5a12}
  .mk-of{padding:0 24px 0 34px;color:#4a321c}
  .mk-of h3{margin:0 0 2px;font-size:28px;text-align:center;letter-spacing:2px}
  .mk-of .sub{text-align:center;font-size:14px;color:#8a6a4a;margin-bottom:10px}
  .mk-who{display:flex;align-items:center;gap:14px;padding:10px 14px;border-radius:8px;background:rgba(122,74,40,.07);margin-bottom:8px;font-size:14px}
  .mk-who .face{width:64px;height:64px;border-radius:50%;background-size:auto 115px;background-position:-14px -15px;border:2px solid #b8862e;flex:none}
  .mk-who b{font-size:20px}
  .mk-row{display:grid;grid-template-columns:100px 1fr 132px;align-items:center;gap:10px;padding:8px 4px;border-bottom:1px solid rgba(122,74,40,.18);font-size:16px}
  .mk-row .lb{font-weight:700}.mk-row .rg{font-size:12px;line-height:1.3;color:#8a6a4a;text-align:right}
  .mk-seg{display:flex;gap:6px}
  .mk-seg span{min-width:54px;text-align:center;padding:6px 8px;border-radius:5px;border:1.5px solid rgba(122,74,40,.35);font-weight:700;color:#7a5a3a;background:#fbf4e6}
  .mk-seg span.on{background:#7a4a28;border-color:#7a4a28;color:#fff3dc}
  .mk-seg span.df{box-shadow:inset 0 -3px 0 #d0a24a}
  .mk-step{display:flex;align-items:center;gap:10px}
  .mk-step i{width:30px;height:30px;border-radius:50%;border:1.5px solid rgba(122,74,40,.45);display:flex;align-items:center;justify-content:center;font-style:normal;font-weight:700;background:#fbf4e6}
  .mk-step b{min-width:64px;text-align:center;font-size:19px}
  .mk-step .chg{font-size:12px;color:#b5462f;font-weight:700}
  .mk-fix{margin:12px 4px 0;font-size:13.5px;color:#6b4a2e}
  .mk-fix em{font-style:normal;font-weight:700;color:#2f6a52}
  .mk-react{margin:12px 0 6px;font-weight:700;font-size:16px}
  .mk-meter{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}
  .mk-meter span{padding:10px 6px;text-align:center;border-radius:6px;font-weight:700;font-size:15px;opacity:.35;border:2px solid transparent}
  .mk-meter .r0{background:#e3c0b5;color:#7c2a1a}.mk-meter .r1{background:#efdcae;color:#7a5410}.mk-meter .r2{background:#c6e2cf;color:#1f5a3a}
  .mk-meter span.on{opacity:1;border-color:currentColor;transform:scale(1.04)}
  .mk-say{margin:8px 0 0;padding:8px 14px;border-radius:8px;background:#fffaf0;border:1px solid rgba(122,74,40,.25);font-size:15px}
  .mk-btns{display:flex;justify-content:space-between;margin-top:14px}
  .mk-btns span{padding:11px 26px;border-radius:7px;font-weight:700;font-size:17px}
  .mk-btns .rs{border:1.5px solid rgba(122,74,40,.5);color:#7a4a28;background:#fbf4e6}
  .mk-btns .go{background:#2f6a52;color:#fff;box-shadow:0 2px 0 #1d4a37}
  .mk-btns .rs.dim{opacity:.4}
  `;
  const STAGE = a => a >= 90 ? '토박이' : a >= 60 ? '동반자' : a >= 30 ? '새내기' : '방랑자';
  const STAGE_W = a => a >= 90 ? (a - 90) / 10 : a >= 60 ? (a - 60) / 30 : a >= 30 ? (a - 30) / 30 : a / 30;
  const DEF = { weeks: 12, rate: 20, pay: 25, sup: 10 };
  // 수락 복합식(2-7a): 요구비율 = 1 − 0.15 × (애착 − 30) / 70 + 성향 보정. 계약 쪽 = 기준액 × (1 − 요율) + 보수 + 지원 × 0.5, 자유 쪽 = 기준액 × (1 − 0.15)
  function react(t, attach, trait) {
    const baseG = 300, contract = baseG * (1 - t.rate / 100) + t.pay + t.sup * 0.5, free = baseG * 0.85;
    const need = 1 - 0.15 * (attach - 30) / 70 + trait, ratio = contract / free;
    return ratio >= need ? 2 : ratio >= need - 0.08 ? 1 : 0;
  }
  function style() { if (!document.getElementById('mk-css')) { const s = document.createElement('style'); s.id = 'mk-css'; s.textContent = CSS; document.head.appendChild(s); } }
  function tag(text) { let t = document.querySelector('.mk-tag'); if (!t) { t = document.createElement('div'); t.className = 'mk-tag'; document.body.appendChild(t); } t.textContent = text; }
  const ROWS = [   // 시안용 명부 (앞 2명은 실제 창립 멤버 줄을 바꿔 씀, 나머지는 복제)
    { attach: 72, home: true, contract: { from: 4, to: 15, now: 8 } },
    { attach: 35, home: true },
    { attach: 95, name: '브람', cls: '전사 · 길드', face: 'chr_warrior_m_front.png' },
    { attach: 66, name: '루나', cls: '마법사 · 길드', face: 'chr_mage_f_front.png' },
    { attach: 12, name: '테오', cls: '궁수 · 마을 밖', face: 'chr_archer_m_front.png' }
  ];
  function roster() {
    style(); tag('시안 · 명부 (E2-5)');
    const list = document.querySelector('.av-list'), rows = [...list.querySelectorAll('.ux-row')];
    while (list.querySelectorAll('.ux-row').length < ROWS.length) list.appendChild(rows[rows.length - 1].cloneNode(true));
    [...list.querySelectorAll('.ux-row')].forEach((el, i) => {
      const d = ROWS[i]; if (!d) return;
      if (d.name) { el.querySelector('.nm').lastChild.textContent = d.name; el.querySelector('.sub').textContent = d.cls; el.querySelector('.ux-face').style.backgroundImage = `url(assets/chr/${d.face})`; el.classList.remove('on'); }
      const at = el.querySelector('.attm'); at.title = '애착 ' + d.attach;
      at.querySelector('em').textContent = STAGE(d.attach); at.querySelector('.trk i').style.width = (STAGE_W(d.attach) * 100) + '%';
      const ic = document.createElement('span'); ic.style.cssText = 'display:inline-flex;flex:none;width:86px';
      ic.innerHTML = `<i class="mk-ic ct ${d.attach >= 65 ? '' : 'off'}" title="지역 기여 (애착 65 이상)">기여</i><i class="mk-ic hm ${d.home || d.attach >= 100 ? '' : 'off'}" title="상주 (애착 100 또는 창립)">⌂ 상주</i>`;
      at.after(ic);
      el.querySelector('.cond').style.display = 'none';
      if (d.contract) { const c = document.createElement('em'); c.className = 'mk-ct'; c.textContent = `계약 ${d.contract.to}주까지`; el.querySelector('.nm').appendChild(c);
        el.querySelector('.sub').textContent = `계약 모험가 · ${d.contract.now - d.contract.from + 1} / 12주`; }
    });
    const lg = document.createElement('div'); lg.className = 'mk-legend';
    lg.innerHTML = '<b>애착 단계</b> 방랑자 0~29 · 새내기 30~59 · 동반자 60~89 · 토박이 90~100 (막대 = 단계 안 진행)<br>' +
      '<b>기여</b> 지역 기여(애착 65 이상) · <b>⌂ 상주</b> 애착 100 또는 창립 멤버<br><b>계약 N주까지</b> 계약 끝 주 (체결 주 ~ 체결 주 + 기간 − 1) · 상태 줄은 이 시안에서 숨김';
    list.after(lg);
    const r = document.querySelector('.bk-r'); const head = r && r.querySelector('.av-st, .ux-tags, .tags');
    const box = document.createElement('div'); box.className = 'mk-box';
    box.innerHTML = '<span class="h">계약 모험가</span> · 4주 ~ 15주 (남은 8주) · 계약 수수료 20% · 월 보수 25G · 지원 한도 10G · 지명 4주에 2번 중 1번 사용';
    const anchor = r && (r.querySelector('.av-eq') || r.firstElementChild); if (anchor) anchor.before(box);
  }
  function offer(t, opt) {
    t = Object.assign({}, DEF, t || {}); opt = opt || {}; style();
    const sel = document.querySelector('.av-list .ux-row.on');
    if (sel && !opt.name) { opt.name = sel.querySelector('.nm').lastChild.textContent; opt.faceUrl = sel.querySelector('.ux-face').style.backgroundImage.replace(/"/g, "'"); opt.job = sel.querySelector('.sub').textContent.split(' · ')[0]; }
    // 게임에 계약 규칙이 있으면(72998d8~) 실제 수락 판단(contractEval)으로 반응을 고르고, 없으면 시안용 단순식(react)을 쓴다
    const G = window.GuildGame, S = window.__s && window.__s(), adv = S && sel && S.advs.find(a => String(a.id) === sel.dataset.adv);
    let r;
    if (G && G.contractEval && adv) { const e = G.contractEval(S, adv, { weeks: t.weeks, rate: t.rate / 100, pay: t.pay, sup: t.sup }); r = { no: 0, maybe: 1, yes: 2 }[e.mood];
      opt.attach = Math.round(adv.attach); opt.done = adv.done || 0; opt.job = adv.cls; opt.real = true; }
    else r = react(t, opt.attach || 45, opt.trait || 0);
    const names = ['거절할 것 같다', '고민 중', '받아들일 것 같다'];
    const say = ['"이 조건이면 혼자 일하는 게 낫겠어요."', '"음… 조금만 더 생각해 볼게요. 조건이 살짝 아쉬워요."', '"좋아요, 마스터. 잘 부탁드려요."'][r];   // 게임 contractPropose 대사와 같음
    const seg = (vals, cur, def, unit) => `<span class="mk-seg">${vals.map(v => `<span class="${v === cur ? 'on' : ''} ${v === def ? 'df' : ''}">${v}${unit}</span>`).join('')}</span>`;
    const step = (v, def, unit) => `<span class="mk-step"><i>−</i><b>${v}${unit}</b><i>+</i>${v !== def ? `<span class="chg">기본 ${def}${unit}</span>` : ''}</span>`;
    const changed = ['weeks', 'rate', 'pay', 'sup'].some(k => t[k] !== DEF[k]);
    document.querySelectorAll('.av-list .cond').forEach(e => e.style.display = 'none');
    const R = document.querySelector('.bk-r');
    R.innerHTML = `<div class="mk-of"><h3>계약 제안</h3><div class="sub">F급 기본값 양식 · 바꾼 칸만 표시됩니다</div>
      <div class="mk-who"><span class="face" style="background-image:${opt.faceUrl || 'url(assets/chr/' + (opt.face || 'chr_rogue_m_front.png') + ')'}"></span><span><b>${opt.name || '카스'}</b> 1차 ${opt.job || '도적'} · F급<br>애착 ${opt.attach || 45} <b style="font-size:15px;color:#7a4a28">${STAGE(opt.attach || 45)}</b> <br>의뢰 성공 ${opt.done != null ? opt.done : 5}회 · 반응은 ${opt.real ? '게임 수락 판단(결정 5)' : '시안용 단순식'}</span></div>
      <div class="mk-row"><span class="lb">기간</span>${seg([8, 12], t.weeks, 12, '주')}<span class="rg">8 · 12주<br>기본 12주</span></div>
      <div class="mk-row"><span class="lb">계약 수수료</span>${seg([15, 20, 25, 30], t.rate, 20, '%')}<span class="rg">15~30% (5%)<br>기본 20%</span></div>
      <div class="mk-row"><span class="lb">월 보수</span>${step(t.pay, 25, 'G')}<span class="rg">0~60G (5G)<br>기본 25G</span></div>
      <div class="mk-row"><span class="lb">지원 한도</span>${step(t.sup, 10, 'G')}<span class="rg">월 0~30G (5G)<br>기본 10G</span></div>
      <div class="mk-fix">고정: <em>지명 4주에 2번까지 · 섭외비 0 · 범위 안 거절 없음 · 리퀘스트 우선</em></div>
      <div class="mk-react">${opt.name || '카스'}의 반응</div>
      <div class="mk-meter">${names.map((n, i) => `<span class="r${i} ${i === r ? 'on' : ''}">${n}</span>`).join('')}</div>
      <div class="mk-say">${say}</div>
      <div class="mk-btns"><span class="rs ${changed ? '' : 'dim'}">기본값 복원</span><span class="go">제안하기</span></div></div>`;
    const promo = document.querySelector('[data-sub="promo"]');
    if (promo && !document.querySelector('[data-sub="mk-offer"]')) { const b = promo.cloneNode(true); b.dataset.sub = 'mk-offer'; b.textContent = '계약제안'; promo.after(b); }
    document.querySelectorAll('[data-sub]').forEach(b => b.classList.toggle('on', b.dataset.sub === 'mk-offer'));
    tag('시안 · 계약제안 탭 (E2-5)');
    return names[r];
  }
  window.MOCK = { roster, offer, react };
})();
