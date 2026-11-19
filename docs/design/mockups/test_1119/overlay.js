// 11-19 테스트 의견 시안 덧씌우기 (Claude, 2026-11-19) — 게임에 들어가지 않는 확인용 코드.
// 시험 사본에서 해당 창을 연 뒤 이 파일을 실행하고 MK.xxx()를 부름. 그림은 docs/design/mockups/test_1119/*.png
(function () {
  const CSS = `
  .mk-tag{position:fixed;left:20px;top:132px;z-index:100000;background:#b5462f;color:#fff;font:700 15px/1 sans-serif;padding:7px 12px;border-radius:5px}
  .mk-spot{position:relative;z-index:9000!important;border-radius:12px;box-shadow:0 0 0 5px #ffd75e,0 0 0 4000px rgba(18,10,4,.66)!important;animation:mkP 1.1s ease-in-out infinite}
  @keyframes mkP{50%{box-shadow:0 0 0 8px #fff1b0,0 0 0 4000px rgba(18,10,4,.66)}}
  .mk-hint{position:fixed;z-index:9100;background:#3b2a1ef2;color:#fff6dc;font:700 21px/1.45 "Malgun Gothic",sans-serif;padding:12px 22px;border-radius:14px;border:2px solid #ffd75e;max-width:520px}
  .mk-hint small{display:block;font-size:14px;font-weight:500;color:#e8d3a8;margin-top:4px}
  .mk-steps{display:flex;gap:6px;margin-top:8px}.mk-steps i{font-style:normal;font-size:13px;padding:3px 9px;border-radius:10px;background:#6b4f33;color:#e8d3a8}.mk-steps i.on{background:#ffd75e;color:#3b2a1e}.mk-steps i.ok{background:#2f6a52;color:#eaf6ef}
  .mk-why{display:block;margin-top:6px;color:#b5302a;font-weight:700;font-size:15px}
  .mk-bad{border-color:#c0392b!important;color:#b5302a!important;background:#fde8e4!important}
  .mk-chip{display:inline-block;margin-left:6px;padding:0 6px;border-radius:4px;background:#2f6a52;color:#eaf6ef;font:700 11.5px/18px sans-serif;vertical-align:2px}
  .mk-chip b{letter-spacing:-1px;color:#bff0d3}
  .mk-modal{position:fixed;inset:0;z-index:9500;background:rgba(18,10,4,.6);display:flex;align-items:center;justify-content:center}
  .mk-card{width:620px;background:#fbf3e2;border:3px solid #b8862e;border-radius:18px;padding:26px 34px;color:#3b2a1e;font-family:"Malgun Gothic",sans-serif;box-shadow:0 12px 40px rgba(0,0,0,.4);text-align:center}
  .mk-card h2{margin:6px 0 4px;font-size:34px;letter-spacing:2px}.mk-card .sub{color:#8a6a4a;font-size:15px}
  .mk-badges{display:flex;align-items:center;justify-content:center;gap:22px;margin:14px 0 6px}
  .mk-badges .bd{width:96px;height:96px;background-size:contain;background-repeat:no-repeat;background-position:center}.mk-badges .bd.old{opacity:.4;transform:scale(.8)}.mk-badges .ar{font-size:30px;color:#b8862e}
  .mk-badges .bd.new{filter:drop-shadow(0 0 14px #ffd75e)}
  .mk-lina{display:flex;gap:12px;align-items:center;text-align:left;background:#fff;border-radius:12px;padding:10px 14px;margin:12px 0}
  .mk-lina .f{width:58px;height:58px;border-radius:50%;background:#f1d9c0 center/cover;flex:none;border:2px solid #d9a066}
  .mk-list{text-align:left;margin:10px 0 4px;padding:0;list-style:none}.mk-list li{padding:6px 10px;border-bottom:1px dashed rgba(122,74,40,.3);font-size:16px}.mk-list li b{color:#2f6a52}
  .mk-btn{display:inline-block;margin-top:14px;padding:10px 34px;border-radius:9px;background:#2f6a52;color:#fff;font-weight:700;font-size:18px}
  .mk-row{display:grid;grid-template-columns:120px 1fr 90px;gap:8px;text-align:left;font-size:16px;padding:5px 4px;border-bottom:1px dashed rgba(122,74,40,.25)}.mk-row b{text-align:right}
  .mk-bar{height:8px;border-radius:4px;background:rgba(110,72,36,.2);overflow:hidden;margin-top:3px}.mk-bar i{display:block;height:100%;background:#2f6a52}.mk-bar.end i{background:#c9963e}
  .mk-bf{display:inline-flex;align-items:center;gap:3px;margin-left:8px;padding:0 6px 0 2px;border-radius:9px;background:#e4f1e8;color:#2f6a52;font:700 12px/20px sans-serif;white-space:nowrap}.mk-bf img{width:20px;height:20px}
  .mk-buff{display:flex;align-items:center;gap:6px;margin-top:4px;font:700 12.5px sans-serif;color:#2f6a52}.mk-buff img{width:22px;height:22px}
  `;
  function style() { if (!document.getElementById('mk-css')) { const s = document.createElement('style'); s.id = 'mk-css'; s.textContent = CSS; document.head.appendChild(s); } }
  function tag(t) { style(); let e = document.querySelector('.mk-tag'); if (!e) { e = document.createElement('div'); e.className = 'mk-tag'; document.body.appendChild(e); } e.textContent = t; }
  function spot(el, html, where) {   // 누를 곳만 밝게 · 나머지 어둡게 (실제 구현 후보: box-shadow 한 겹)
    style(); document.querySelectorAll('.mk-spot').forEach(x => x.classList.remove('mk-spot')); document.querySelectorAll('.mk-hint').forEach(x => x.remove());
    if (!el) return; el.classList.add('mk-spot'); const r = el.getBoundingClientRect(), h = document.createElement('div'); h.className = 'mk-hint'; h.innerHTML = html; document.body.appendChild(h);
    const hr = h.getBoundingClientRect(); let x = r.left + r.width / 2 - hr.width / 2, y = where === 'up' ? r.top - hr.height - 22 : r.bottom + 22;
    h.style.left = Math.max(16, Math.min(1904 - hr.width, x)) + 'px'; h.style.top = Math.max(16, y) + 'px';
  }
  const MK = {};
  MK.office = function () {   // 6: 시설 창 안 집무실 줄만 밝게
    tag('시안 1 · 튜토리얼 어둡게 (집무실 짓기)');
    const row = [...document.querySelectorAll('.fb-row')].find(e => /집무실/.test(e.textContent));
    spot(row, '「짓기」를 눌러 집무실을 지어 주세요<small>밝은 칸만 누를 수 있어요 · 어두운 곳을 누르면 안내가 다시 반짝여요</small>');
  };
  MK.cook = function (stepI) {   // 4: 요리 재료를 차례로 짚기
    tag('시안 2 · 요리 튜토리얼 (재료 순서 안내)');
    const steps = ['① 멧돼지 고기', '② 향신료', '③ 만들어 보기'], sel = ['[data-kmat="mat_x003"]', '[data-kmat="mat_x019"]', '[data-kcook]'][stepI || 0];
    const txt = ['멧돼지 고기를 눌러 조리대에 올려요', '이번엔 향신료를 올려요', '「만들어 보기」를 눌러요'][stepI || 0];
    spot(document.querySelector(sel), txt + `<div class="mk-steps">${steps.map((s, i) => `<i class="${i < (stepI || 0) ? 'ok' : i === (stepI || 0) ? 'on' : ''}">${s}</i>`).join('')}</div><small>다른 재료는 이 단계에서 눌러지지 않아요 · 멧돼지 스테이크 정식이 아니면 통과하지 않아요</small>`, 'up');
  };
  MK.req = function (contractId, why) {   // 15 + 9: 못 보내는 이유 늘 보이기 · ★ 칩 빨갛게 · 계약 칩
    tag('시안 3 · 리퀘스트 (못 보내는 이유 · 계약 표시)');
    const btn = document.querySelector('[data-rqact="send"]'), msg = document.querySelector('.rq-msg');
    if (msg) msg.textContent = '';
    if (btn) { const w = document.createElement('span'); w.className = 'mk-why'; w.textContent = '✕ 보낼 수 없어요 · ' + (why || ''); btn.parentElement.appendChild(w); }
    const star = [...document.querySelectorAll('.rq-need span, .ux-tag, .tag, span')].find(e => /★/.test(e.textContent) && e.children.length <= 2 && e.textContent.length < 30);
    if (star && /★|조건/.test(why || '')) star.classList.add('mk-bad');
    document.querySelectorAll('[data-rqnom]').forEach(r => { if (+r.dataset.rqnom === contractId) { const b = r.querySelector('.who b'); if (b) b.insertAdjacentHTML('beforeend', '<span class="mk-chip" style="white-space:nowrap" title="계약 모험가 · 4주에 2번까지 거절 없음 · 섭외비 0">계약 <b>●●</b></span>'); } });
  };
  MK.contract = function (name) {   // 10: 계약 결산 카드
    tag('시안 4 · 계약 흐름 (끝날 때 결산 카드)'); style();
    const m = document.createElement('div'); m.className = 'mk-modal';
    m.innerHTML = `<div class="mk-card"><div class="sub">12주 계약이 끝났어요 (4주 ~ 15주)</div><h2>${name} · 계약 결산</h2>
      <div class="mk-row"><span>계약 진행</span><span><div class="mk-bar end"><i style="width:100%"></i></div></span><b>12 / 12주</b></div>
      <div class="mk-row"><span>함께 한 의뢰</span><span>성공 9 · 실패 1 · 지명 5번(거절 0)</span><b>10건</b></div>
      <div class="mk-row"><span>${name} 수입</span><span>의뢰 실수령 + 월 보수 75G + 지원 22G</span><b>812G</b></div>
      <div class="mk-row"><span>길드 몫</span><span>계약 수수료 20% − 보수 · 지원</span><b>+109G</b></div>
      <div class="mk-row"><span>애착</span><span>새내기 → 동반자</span><b>48 → 66</b></div>
      <div class="mk-lina"><span class="f"></span><span><b>리나</b> "${name} 씨, 이번 계약 동안 정말 든든했어요. 다시 계약할까요?"</span></div>
      <span class="mk-btn">다시 계약 제안</span> <span class="mk-btn" style="background:#8a735a">자유 모험가로</span></div>`;
    document.body.appendChild(m);
  };
  MK.renew = function () {   // 10: 명부 줄 진행 막대 · 끝 2주 전 색
    tag('시안 5 · 계약 흐름 (명부 진행 막대 · 갱신 알림)'); style();
    const rows = [...document.querySelectorAll('.av-list .ux-row')];
    rows.slice(0, 2).forEach((r, i) => { const nm = r.querySelector('.nm'); if (!nm) return; const w = i === 0 ? 92 : 42;
      nm.insertAdjacentHTML('beforeend', `<span class="mk-chip" style="${i === 0 ? 'background:#c9963e' : ''}">계약 ${i === 0 ? '11' : '5'}/12주</span>`);
      r.querySelector('.sub').insertAdjacentHTML('afterend', `<div class="mk-bar ${i === 0 ? 'end' : ''}" style="width:150px"><i style="width:${w}%"></i></div>`); });
    const h = document.createElement('div'); h.className = 'mk-hint'; h.style.left = '1060px'; h.style.top = '820px';
    h.innerHTML = '리나: "마스터, 첫 번째 계약이 2주 뒤에 끝나요. 갱신하실 거예요?"<small>끝나기 2주 전 · 오른쪽 「계약제안」 책갈피가 반짝임</small>'; document.body.appendChild(h);
  };
  MK.grade = function (badgeOld, badgeNew) {   // 17: 길드 승급 연출
    tag('시안 6 · 길드 승급 연출'); style();
    const m = document.createElement('div'); m.className = 'mk-modal';
    m.innerHTML = `<div class="mk-card"><div class="sub">다리를 지켜 냈습니다 · 영주님의 인정</div><h2>E급 길드 승급!</h2>
      <div class="mk-badges"><span class="bd old" style="background-image:url(${badgeOld})"></span><span class="ar">➜</span><span class="bd new" style="background-image:url(${badgeNew})"></span></div>
      <div class="mk-lina"><span class="f"></span><span><b>리나</b> "해냈어요, 마스터! 이제 우리 길드도 어엿한 E급이에요!"</span></div>
      <ul class="mk-list"><li><b>새로 열림</b> · 모험가 관리소 건설</li><li><b>늘어남</b> · 모험가 정원 8 → 12명</li><li><b>새로 열림</b> · E급 의뢰 · E급 장비</li><li><b>보상</b> · 1,000G · 명성 +10</li></ul>
      <span class="mk-btn">확인</span><div class="sub" style="margin-top:8px">배지가 HUD 왼쪽 위 등급 자리로 날아가 꽂힘 · 팡파르</div></div>`;
    document.body.appendChild(m);
  };
  MK.buff = function (icons) {
    tag('시안 7 · 요리 버프 표시 (원정 목록)'); style();
    const hud = document.getElementById('hudExp'); if (hud) hud.style.opacity = '1';
    const txt = ['힘·기교 +3', '지력·정신 +3'], nm = ['멧돼지 스테이크 정식', '들버섯 수프'];
    document.querySelectorAll('#hudExp .row').forEach((r, i) => { if (i > 1) return; const l1 = r.querySelector('.l1') || r.firstElementChild;
      l1.insertAdjacentHTML('beforeend', `<span class="mk-bf" title="${nm[i]} — 이번 의뢰 동안 ${txt[i]}"><img src="${(icons || [])[i] || ''}" onerror="this.style.display='none'">${txt[i]}</span>`); });
  };
  window.MK = MK;
})();
