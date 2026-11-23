// 소재 거래 화면 시안 (2026-11-20, 사용자 요청: 소재 판매 + 매입을 한 책갈피로) — 게임에는 들어가지 않는 확인용 코드.
// 게임에서 책 → 경영 → 매입을 연 뒤 이 파일을 실행하고 MOCK.trade(state, 소재id) 를 부르면 시안이 덧씌워진다.
//   왼쪽 쪽: 소재 목록 (아이콘 밑 보유 수 · 시세 · 추세 · 매입가 · 지난 4주 길드/시장) + 걸러보기 + 모두 팔기
//   오른쪽 쪽: 고른 소재 — 시세 그래프(기간) · [팔기] 상자 · [사들이기] 상자(매입가 · 모험가 판단 미리보기) · 최근 매입
(function () {
  const CSS = `
  .mt-tag{position:absolute;left:180px;bottom:70px;z-index:50;background:#b5462f;color:#fff;font:700 13px/1 sans-serif;padding:6px 10px;border-radius:4px}
  .mt{color:#4a321c;display:flex;flex-direction:column;height:100%;min-height:0}
  .mt .ux-h{display:flex;align-items:center;gap:6px}
  .mt-q{display:inline-flex;width:20px;height:20px;border-radius:50%;background:#2f6a52;color:#fff;font:700 13px/20px sans-serif;justify-content:center}
  .mt-flt{display:flex;gap:6px;margin:6px 0}
  .mt-flt span{padding:2px 10px;border-radius:999px;border:1.5px solid #c9a76a;font-size:13px;background:#fffaf0}
  .mt-flt span.on{background:#7a4a28;border-color:#7a4a28;color:#fff3dc}
  .mt-list{flex:1;min-height:0;overflow:auto;display:flex;flex-direction:column;gap:5px;padding-right:4px}
  .mt-row{display:grid;grid-template-columns:44px 1fr 86px 76px;align-items:center;gap:8px;padding:4px 8px;background:#fffaf0;border:1.5px solid #e0cba4;border-radius:9px}
  .mt-row.on{border-color:#7a4a28;box-shadow:inset 4px 0 0 #7a4a28;background:#fbefd6}
  .mt-ic{display:flex;flex-direction:column;align-items:center}
  .mt-ic img{width:34px;height:34px}
  .mt-ic b{font-size:12px;line-height:1.1}
  .mt-ic.zero b{color:#b0998a}
  .mt-nm b{font-size:15px}.mt-nm small{display:block;font-size:12px;color:#7a6650}
  .mt-bp{text-align:center;font-size:12px;color:#7a6650;line-height:1.25}
  .mt-bp b{display:block;font-size:16px;color:#b5462f}
  .mt-bp.auto b{color:#7a5a3a}
  .mt-h4{font-size:11.5px;color:#7a6650;line-height:1.35;text-align:right}
  .mt-h4 b{color:#2f6a52}
  .mt-spk{vertical-align:middle;margin-left:2px}.mt-spk path{fill:none;stroke:#00897b;stroke-width:1.5}
  .mt-bar{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:8px;padding-top:8px;border-top:1px dashed rgba(122,74,40,.35);font-size:13px}
  .mt-r{color:#4a321c;display:flex;flex-direction:column;gap:9px;height:100%;min-height:0}
  .mt-top{display:flex;gap:12px;align-items:center}
  .mt-top .big{width:72px;height:72px;border-radius:10px;background:#fffaf0;border:1.5px solid #e0cba4;display:flex;align-items:center;justify-content:center}
  .mt-top .big img{width:60px;height:60px}
  .mt-top h3{margin:0;font-size:22px}
  .mt-top .tg{display:inline-block;margin-left:6px;padding:0 7px;border-radius:999px;font-size:12px;background:#e9d6b0;color:#5a3a22;vertical-align:middle}
  .mt-top .tg.rare{background:#7e4aa0;color:#fff}.mt-top .tg.st{background:#2f6a52;color:#fff}
  .mt-top p{margin:2px 0 0;font-size:12.5px;color:#7a6650}
  .mt-ch{background:#fffaf0;border:1.5px solid #e0cba4;border-radius:9px;padding:6px 8px}
  .mt-per{display:flex;gap:4px;align-items:center;font-size:12px}
  .mt-per span{padding:1px 8px;border-radius:6px;border:1px solid #c9a76a;background:#fff}
  .mt-per span.on{background:#2f6a52;color:#fff;border-color:#2f6a52}
  .mt-per em{margin-left:auto;font-style:normal;color:#7a6650}
  .mt-ch svg{display:block;width:100%;height:118px}
  .mt-ch .ln{fill:none;stroke:#00897b;stroke-width:2.2}.mt-ch .bs{stroke:#a08a6a;stroke-dasharray:4 4}.mt-ch text{font:11px sans-serif;fill:#7a6650}
  .mt-two{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  .mt-box{background:#fffaf0;border:1.5px solid #e0cba4;border-radius:9px;padding:8px 10px;display:flex;flex-direction:column;gap:6px}
  .mt-box h4{margin:0;font-size:15px;display:flex;justify-content:space-between;align-items:center}
  .mt-box h4 small{font-weight:400;color:#7a6650;font-size:12px}
  .mt-kv{display:grid;grid-template-columns:auto 1fr;gap:2px 10px;font-size:13px}.mt-kv b{text-align:right}
  .mt-btns{display:flex;gap:6px}.mt-btns span{flex:1;text-align:center;padding:5px 0;border-radius:7px;border:1.5px solid #7a4a28;font-weight:700;font-size:13px;background:#fbf4e6}
  .mt-btns span.p{background:#7a4a28;color:#fff3dc}
  .mt-step{display:flex;align-items:center;justify-content:center;gap:4px}
  .mt-step span{min-width:28px;text-align:center;padding:2px 4px;border-radius:6px;border:1px solid #c9a76a;background:#fff;font-size:12px}
  .mt-step b{min-width:54px;text-align:center;font-size:20px;color:#b5462f}
  .mt-auto{text-align:center;font-size:12px;color:#7a6650}.mt-auto span{padding:0 6px;border:1px solid #c9a76a;border-radius:5px;background:#fff}
  .mt-who{display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;font-size:12px;text-align:center}
  .mt-who span{padding:3px 0;border-radius:6px;background:#efe2c8;color:#7a5a3a}
  .mt-who span.y{background:#c6e2cf;color:#1f5a3a;font-weight:700}
  .mt-log{font-size:12.5px;color:#5a3c22;border-top:1px dashed rgba(122,74,40,.35);padding-top:6px}
  .mt-log div{display:flex;justify-content:space-between;padding:1px 0}
  .mt-note{font-size:11.5px;color:#9a5a3a}
  `;
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function spark(L, W, H) { if (L.length < 2) return ''; const ps = L.map(x => x[1]), lo = Math.min(...ps), hi = Math.max(...ps); const X = i => 1 + (W - 2) * i / (L.length - 1), Y = v => H - 2 - (H - 4) * (hi === lo ? .5 : (v - lo) / (hi - lo));
    return `<svg class="mt-spk" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><path d="${L.map((x, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ',' + Y(x[1]).toFixed(1)).join('')}"/></svg>`; }
  function chart(L, base) { const W = 480, H = 118, ml = 34, mr = 52, mt = 8, mb = 18; if (L.length < 2) return '<div class="mt-note">시세 기록이 2주 이상 쌓이면 보입니다</div>';
    const ps = L.map(x => x[1]), lo = Math.floor(Math.min(base, ...ps) - 1), hi = Math.ceil(Math.max(base, ...ps) + 1), X = i => ml + (W - ml - mr) * i / (L.length - 1), Y = v => mt + (H - mt - mb) * (1 - (v - lo) / (hi - lo || 1));
    const last = L[L.length - 1];
    return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><line class="bs" x1="${ml}" x2="${W - mr}" y1="${Y(base)}" y2="${Y(base)}"/><text x="${W - mr + 4}" y="${Y(base) + 4}">기준 ${base}G</text><text x="${ml - 4}" y="${mt + 8}" text-anchor="end">${hi}G</text><text x="${ml - 4}" y="${H - mb}" text-anchor="end">${lo}G</text><text x="${ml}" y="${H - 3}">${L.length}주 전</text><text x="${W - mr}" y="${H - 3}" text-anchor="end">이번 주</text>`
      + `<path class="ln" d="${L.map((x, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ',' + Y(x[1]).toFixed(1)).join('')}"/><circle cx="${X(L.length - 1)}" cy="${Y(last[1])}" r="4" fill="#00897b"/><text x="${X(L.length - 1) + 6}" y="${Y(last[1]) - 6}" style="font-weight:700;fill:#00695c">${Math.round(last[1])}G</text></svg>`; }

  function trade(s, sel, opt) {
    opt = opt || {}; const Gm = window.GuildGame, G = window.GAME_DATA.content, MATS = {}; for (const m of G.materials) MATS[m.id] = m;
    const GR = ['F', 'E', 'D', 'C', 'B', 'A', 'S'], E = s.cfg.econ, TH = E.sellTh || [0.9, 0.85, 0.75], cap = E.storeCap || 30;
    const img = m => m.icon ? `<img src="assets/${m.icon}" alt="">` : `<b>${esc(m.name).slice(0, 2)}</b>`;
    const known = Object.keys(s.knownMats || {}).filter(id => MATS[id] && GR.indexOf(MATS[id].grade) <= s.grade).sort((a, b) => GR.indexOf(MATS[a].grade) - GR.indexOf(MATS[b].grade) || (MATS[b].line === 'food') - (MATS[a].line === 'food'));
    const flt = opt.filter || 'all', list = known.filter(id => flt === 'all' || (flt === 'food') === (MATS[id].line === 'food'));
    sel = sel && MATS[sel] ? sel : list[0];
    const h4 = (id, k) => ((s.sellHist || {})[id] || []).filter(x => x.w > s.week - 4).reduce((t, x) => t + (x[k] || 0), 0);
    const tr = id => { const t = Gm.mktTrend(s, id); return t > 0 ? '<span style="color:#b42332">▲</span>' : t < 0 ? '<span style="color:#1a6b30">▼</span>' : ''; };
    let L = `<div class="mt"><div class="ux-h">소재 거래 <small>팔기 · 사들이기를 한곳에서</small><span class="mt-q" title="도움말">?</span></div>
      <div class="mt-flt"><span class="${flt === 'all' ? 'on' : ''}">전체 ${known.length}</span><span class="${flt === 'food' ? 'on' : ''}">음식 소재</span><span class="${flt === 'etc' ? 'on' : ''}">그 밖의 소재</span></div><div class="mt-list">`;
    for (const id of list) { const m = MATS[id], n = (s.mats || {})[id] || 0, fixed = Gm.buyGoldOf(s, id) != null, bp = Gm.matBuyPrice(s, id);
      L += `<div class="mt-row${id === sel ? ' on' : ''}"><span class="mt-ic${n ? '' : ' zero'}">${img(m)}<b>${n}</b></span><span class="mt-nm"><b>${esc(m.name)}</b><small>시세 ${Gm.matPrice(s, id)}G ${tr(id)}${spark(Gm.mktLogOf(s, id).slice(-12), 48, 16)}</small></span><span class="mt-bp${fixed ? '' : ' auto'}">매입가<b>${bp}G</b>${fixed ? '직접 정함' : '자동'}</span><span class="mt-h4">지난 4주<br>길드 <b>${h4(id, 'g')}</b> · 시장 ${h4(id, 'm')}</span></div>`; }
    const nf = known.filter(id => MATS[id].line !== 'food' && (s.mats || {})[id] > 0), sum = nf.reduce((t, id) => t + Gm.sellPreview(s, id, s.mats[id]), 0), M = s.month || {};
    L += `</div><div class="mt-bar"><span>이번 달 판매 <b>${Math.round(M.sell || 0)}G</b> · 매입 <b>${M.matBuyN || 0}개 ${Math.round(-(M.matBuy || 0))}G</b></span><span class="ux-btn primary" style="padding:4px 10px">음식이 아닌 소재 모두 팔기 (${sum}G)</span></div></div>`;

    const m = MATS[sel], n = (s.mats || {})[sel] || 0, mp = Gm.matPrice(s, sel), bp = Gm.matBuyPrice(s, sel), fixed = Gm.buyGoldOf(s, sel) != null, per = opt.weeks || 12;
    const staple = Gm.isStaple && Gm.isStaple(s, sel), food = m.line === 'food';
    const who = ['절약', '보통', '낭비'].map((nm, i) => `<span class="${bp >= mp * TH[i] - 1e-9 ? 'y' : ''}">${nm} ${bp >= mp * TH[i] - 1e-9 ? '길드에' : '시장에'}</span>`).join('');
    const logs = (s.buyLog || []).filter(b => b.m === sel).slice(0, 3);
    const R = `<div class="mt-r"><div class="mt-top"><span class="big">${img(m)}</span><div><h3>${esc(m.name)} <small style="font-size:13px;color:#7a6650">${m.grade}급</small>${food ? `<span class="tg ${staple ? 'st' : 'rare'}">${staple ? '상시 재료' : '희귀 재료'}</span>` : ''}</h3><p>${esc(m.desc || '')}</p></div></div>
      <div class="mt-ch"><div class="mt-per">${[4, 12, 24, 48].map(w => `<span class="${w === per ? 'on' : ''}">${w}주</span>`).join('')}<em>지금 ${mp}G ${tr(sel)} · 기준 ${Gm.matBase(sel)}G</em></div>${chart(Gm.mktLogOf(s, sel).slice(-per), Gm.matBase(sel))}</div>
      <div class="mt-two">
        <div class="mt-box"><h4>팔기 <small>창고 ${n} / ${cap}개</small></h4><div class="mt-kv"><span>1개 값</span><b>${Gm.matSellPrice ? Gm.matSellPrice(s, sel) : mp}G</b><span>전부 팔면</span><b>${n ? Gm.sellPreview(s, sel, n) : 0}G</b></div><div class="mt-btns"><span>1개 팔기</span><span class="p">전부 팔기</span></div><div class="mt-note">많이 팔수록 마을에 흔해져 값이 내려갑니다${food ? ' · 팔면 요리를 못 만들 수 있음' : ''}</div></div>
        <div class="mt-box"><h4>사들이기 <small>모험가에게서</small></h4><div class="mt-step"><span>−5</span><span>−</span><b>${bp}G</b><span>+</span><span>+5</span></div><div class="mt-auto">${fixed ? '직접 정함 · <span>자동으로</span>' : '자동 (시세를 따라감)'}</div><div class="mt-who">${who}</div><div class="mt-note">이 값이면 위 성향의 모험가가 길드에 팝니다 (애착이 높으면 조금 더 싸게도)</div></div>
      </div>
      <div class="mt-log"><b>최근 매입</b>${logs.length ? logs.map(b => `<div><span>×${b.n} · ${b.w === s.week ? '이번 주' : (s.week - b.w) + '주 전'}</span><span>${b.g}G</span></div>`).join('') : '<div><span>아직 없음</span></div>'}</div></div>`;

    let st = document.getElementById('mt-css'); if (!st) { st = document.createElement('style'); st.id = 'mt-css'; st.textContent = CSS; document.head.appendChild(st); }
    document.getElementById('popBody').innerHTML = `<div class="bk2 bk-tr"><section class="bk-l">${L}</section><section class="bk-r">${R}</section></div>`;
    for (const b of document.querySelectorAll('#bookSub button')) { const t = b.textContent; if (t === '소재판매') b.style.display = 'none'; if (t === '매입') { b.textContent = '소재거래'; b.classList.add('on'); } }
    const tt = document.getElementById('bookTitle'); if (tt && !tt.dataset.mk) { tt.dataset.mk = 1; }
    if (!document.querySelector('.mt-tag')) { const t = document.createElement('div'); t.className = 'mt-tag'; t.textContent = '시안 — 소재 거래 (판매 + 매입)'; document.getElementById('pop').appendChild(t); }
  }
  window.MOCK = Object.assign(window.MOCK || {}, { trade });
})();
