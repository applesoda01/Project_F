// 대장간 창 (2026-11-18, 시안 smith2 사용자 확인) — 마을 지도에서 대장간(해금 뒤)을 누르면 열림
// 진열대: 길드 등급까지 무기 · 방어구 · 장신구를 1개씩 따로 판매 (모험가가 매달 소지금으로 1칸씩 삼) + 최근 손님
// 선물: 길드 금으로 모험가에게 장비 1칸씩 (GuildGame.smithGift) · 강화: 잠김 (2단계)
(function (root) {
  'use strict';
  const Smithy = {};
  let tab = 'shop', box = null, say = null;
  const GR = ['F', 'E', 'D', 'C', 'B', 'A', 'S'], CLS = ['전사', '궁수', '마법사', '성직자', '도적'];
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const G = () => root.GuildGame, S = () => (Smithy.getS ? Smithy.getS() : null);
  const ITEMS = () => ((root.GAME_DATA || {}).content || {}).items || [];
  const CB = () => (root.GuildCombat && root.GAME_DATA ? root.GuildCombat.make(root.GAME_DATA) : null);
  const itemOf = (type, g) => ITEMS().find(i => i.kind === 'gear' && i.gtype === type && i.grade === GR[g]);
  // 칸별 장비 종류: 명부의 장비 칸과 같은 짝 (무기 · 방어구 = 전투 계산, 장신구 = 명부 표시와 같음)
  const slotType = (core, k) => { const C = CB(); if (!C) return null; return k === 0 ? C.WEAPON[core] : k === 1 ? C.ARMOR[core] : C.ACC[(core + 2) % 5]; };
  const LINES = {
    shop: ['쇠는 거짓말을 안 하지.<br>뭘 보러 왔나, 길드 양반?', '오늘도 불은 잘 붙었어.<br>천천히 둘러보게.'],
    gift: ['마스터가 직접 골라 준다면<br>녀석들도 기운이 나겠지.'],
    gave: ['좋은 물건이야. 잘 쓰라고 전해 주게.', '이건 내가 직접 두드린 거라네.', '손에 맞을 거야. 장담하지.'],
    react: [['…고마워요. 아껴 쓸게요.', '이걸 저한테요? 감사합니다.'], ['우와, 마스터! 고마워요!', '이거 진짜 제 거예요?'], ['와아! 다들 이것 좀 봐요! 마스터가 줬어요!', '최고예요, 마스터!']]
  };
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const CSS = `
#smBack{position:absolute;inset:0;background:rgba(30,18,10,.45);z-index:40;pointer-events:auto}
#smPop{position:absolute;left:50%;top:50%;transform:translate(-50%,-48%);width:1300px;height:800px;box-sizing:border-box;--pb:46px;border:var(--pb) solid transparent;border-image:url(assets/ui/pop/panel_paper.png) 60 fill/var(--pb) stretch;filter:drop-shadow(0 12px 24px rgba(0,0,0,.45));color:#3b2a1e;font-size:21px}
#smHead{position:absolute;left:50%;top:-80px;transform:translateX(-50%);min-width:380px;height:76px;display:flex;align-items:center;justify-content:center;background:url(assets/ui/pop/title.png) center/100% 100% no-repeat;font:700 34px MaruBuri,serif;color:#4a2d18;padding:0 60px}
#smX{position:absolute;right:-18px;top:-22px;width:56px;height:56px;border-radius:50%;background:#7a3b26;color:#fbe9cf;font-size:30px;display:flex;align-items:center;justify-content:center;border:3px solid #e4c48e;box-shadow:0 3px 6px rgba(0,0,0,.4);cursor:pointer}
#smL{position:absolute;left:0;top:0;bottom:0;width:380px;overflow:hidden}
#smL img{position:absolute;left:-80px;bottom:-6px;height:580px}
#smSay{position:absolute;left:14px;top:8px;width:330px;z-index:2;background:#fffaf0;border:2px solid #c9a774;border-radius:14px;padding:12px 16px;font-size:20px;line-height:1.45;box-shadow:0 2px 0 #e3cfa8}
#smSay:after{content:'';position:absolute;left:150px;bottom:-14px;border:12px solid transparent;border-top-color:#c9a774;border-bottom:0}
#smSay b{display:block;font-size:16px;color:#8a7258;margin-bottom:2px}
#smSay .re{display:block;margin-top:8px;padding-top:6px;border-top:1px dashed #dcc59c;color:#5a3a22}
#smR{position:absolute;left:400px;right:0;top:0;bottom:0;display:flex;flex-direction:column}
#smTabs{display:flex;gap:8px;border-bottom:3px solid #c9a774;padding-left:6px}
.smT{padding:8px 28px 10px;border-radius:12px 12px 0 0;background:#e6d3ad;color:#7a5f45;font-weight:700;font-size:22px;border:2px solid #c9a774;border-bottom:0;margin-bottom:-3px;cursor:pointer}
.smT.on{background:#fbf1dc;color:#4a2d18;border-bottom:3px solid #fbf1dc}
.smT.lock{opacity:.55;cursor:default}
#smBody{flex:1;padding:14px 10px 0 14px;overflow:hidden;display:flex;flex-direction:column;min-height:0}
.smH{font:700 22px MaruBuri,serif;color:#5a3a22;margin:2px 0 8px;display:flex;align-items:baseline;gap:10px}
.smH small{font-size:17px;font-weight:400;color:#8a7258;font-family:inherit}
.smGold{margin-left:auto;font:700 20px inherit;font-family:inherit;color:#7a4a12;background:#fff3d6;border:2px solid #e2c27a;border-radius:20px;padding:3px 16px}
.shHead,.shGrid{display:grid;grid-template-columns:110px repeat(5,1fr);gap:6px}
.shHead{font-size:15px;color:#8a7258;text-align:center;margin-bottom:4px}
.shGrid{margin-bottom:6px}
.shCat{display:flex;flex-direction:column;justify-content:center;font:700 19px MaruBuri,serif;color:#5a3a22}
.shCat small{font-size:15px;font-weight:400;color:#8a7258;font-family:inherit}
.shIt{background:#fffaf0;border:2px solid #dcc59c;border-radius:10px;padding:3px 4px;text-align:center;font-size:15px;color:#4a3626}
.shIt img{width:38px;height:38px;display:block;margin:0 auto 2px}
.shIt b{display:block;font:700 16px MaruBuri,serif;color:#7a4a12}
.shIt i{font-style:normal;font-size:12px;color:#8a7258}
.shIt.dup{visibility:hidden}
.smLock{display:flex;align-items:center;gap:14px;background:#efe4cf;border:2px dashed #cdb48a;border-radius:12px;padding:6px 16px;color:#9a8670;margin:2px 0 8px}
.gbx{display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:9px;font:800 20px MaruBuri,serif;color:#fff;background:#8a6a48;box-shadow:inset 0 -3px 0 rgba(0,0,0,.2);flex:none}
.gbx.F{background:#8d7a63}.gbx.E{background:#4f8a5b}.gbx.no{background:#cbb796;color:#fff8}
.smLog{flex:1;min-height:0;overflow-y:auto;display:flex;flex-direction:column;gap:4px;padding-right:6px}
.smL{display:flex;align-items:center;gap:12px;font-size:19px;padding:3px 6px;border-bottom:1px dashed #dcc59c}
.smL em{font-style:normal;color:#8a7258;font-size:16px}
.smF{width:42px;height:42px;border-radius:50%;background-color:#efe2c6;border:2px solid #c9a774;flex:none}
.smNone{color:#9a8670;font-size:18px;padding:8px}
.gfList{flex:1;min-height:0;overflow-y:auto;padding-right:6px}
.gfRow{display:flex;align-items:center;gap:10px;background:#fffaf0;border:2px solid #dcc59c;border-radius:12px;padding:6px 10px;margin-bottom:7px}
.gfN{flex:0 0 120px;min-width:0}.gfN b{font-size:20px;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.gfN div{font-size:15px;color:#8a7258}
.gfSlot{flex:1;min-width:0;display:flex;align-items:center;gap:6px;background:#f6ecd6;border:1px solid #dcc59c;border-radius:10px;padding:4px 8px}
.gfSlot img{flex:none;width:40px;height:40px}
.gfSlot .e{flex:none;width:40px;height:40px;border:2px dashed #cdb48a;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#b9a385;font-size:12px;white-space:nowrap}
.gfSlot .gbx{width:28px;height:28px;font-size:16px;border-radius:7px}
.gfSlot button{font:700 15px inherit;font-family:inherit;padding:4px 10px;border-radius:8px;border:2px solid #7a4a12;background:linear-gradient(#f3c66b,#d99a32);color:#4a2a08;white-space:nowrap;cursor:pointer}
.gfSlot button:disabled{background:#d9cbb2;border-color:#b9a385;color:#9a8670;cursor:default}
.gfSlot small{font-size:13px;color:#8a7258;white-space:nowrap}
.smHint{font-size:16px;color:#8a7258;margin:6px 0 4px}
`;
  function ensure() {
    if (box) return true;
    const host = document.getElementById('townUi'); if (!host) return false;
    const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    box = document.createElement('div'); box.id = 'smBack'; box.style.display = 'none'; host.appendChild(box);
    box.addEventListener('click', onClick);
    return true;
  }
  const face = a => `<span class="smF" style="${root.UI && root.UI.faceStyle ? root.UI.faceStyle(a, 42, 190, 28) : ''}"></span>`;
  function shopHtml(s) {
    const Gm = G(), cols = [0, 1, 2, 3, 4];
    const cell = (type, g, who) => { const it = itemOf(type, g), price = s.cfg.gear.weaponPrice[g]; return it ? `<div class="shIt"><img src="assets/${it.icon}" alt="">${esc(it.name)}<b>${price}G</b><i>${who}</i></div>` : '<div class="shIt dup"></div>'; };
    let h = `<div class="smH">진열대 <small>길드 등급까지 · 하나씩 따로 팝니다 · 모험가가 매달 소지금으로 한 칸씩 사 갑니다</small></div>
<div class="shHead"><span></span>${cols.map(c => `<span>${CLS[c]}</span>`).join('')}</div>`;
    const g = Math.min(s.grade, 1);   // F · E만 (D 이상은 프로토타입 뒤)
    for (let gg = 0; gg <= g; gg++) {
      if (g > 0) h += `<div class="smH" style="font-size:18px;margin:4px 0 4px"><span class="gbx ${GR[gg]}">${GR[gg]}</span><small>${GR[gg]}급</small></div>`;
      h += `<div class="shGrid"><div class="shCat">무기<small>공격력</small></div>${cols.map(c => cell(slotType(c, 0), gg, CLS[c])).join('')}</div>`;
      const ar = [['heavy', '전사'], ['light', '궁수 · 도적'], ['robe', '마법사 · 성직자']];
      h += `<div class="shGrid"><div class="shCat">방어구<small>방어 · 체력</small></div>${ar.map(([t, w]) => cell(t, gg, w)).join('')}<div class="shIt dup"></div><div class="shIt dup"></div></div>`;
      h += `<div class="shGrid"><div class="shCat">장신구<small>주력 능력치 +${s.cfg.gear.accStat[gg]}</small></div>${cols.map(c => cell(slotType(c, 2), gg, CLS[c])).join('')}</div>`;
    }
    if (s.grade < 1) h += `<div class="smLock"><span class="gbx no">E</span><span><b>E급 장비 (무기 · 방어구 · 장신구 각 ${s.cfg.gear.weaponPrice[1]}G)</b><br><small>길드가 E급이 되면 진열</small></span></div>`;
    const L = (s.smithLog || []).slice(0, 12), who = id => s.advs.find(a => a.id === id);
    h += `<div class="smH" style="margin-top:4px">최근 손님 <small>${Gm.dateLabel ? Gm.dateLabel(s.week) : ''}</small></div><div class="smLog">`;
    if (!L.length) h += '<div class="smNone">아직 장비를 사러 온 모험가가 없습니다. 모험가는 월말에 소지금을 보고 한 칸씩 삽니다.</div>';
    for (const x of L) { const a = who(x.id); if (!a) continue; const nm = Gm.EQ_NAME[x.k] || '장비', ago = s.week - x.w;
      const when = ago < 1 ? '이번 주' : ago < 4 ? `${ago}주 전` : `${Math.floor(ago / 4)}달 전`;
      if (x.t === 'buy') h += `<div class="smL">${face(a)}<b>${esc(a.name)}</b> ${GR[x.g]}급 ${nm}를 샀습니다. <em>(${x.price}G · ${when})</em></div>`;
      else if (x.t === 'gift') h += `<div class="smL">${face(a)}<b>${esc(a.name)}</b> 마스터의 선물로 ${GR[x.g]}급 ${nm}를 받았습니다. <em>(${x.price}G · ${when})</em></div>`;
      else h += `<div class="smL">${face(a)}<b>${esc(a.name)}</b> "${x.have >= x.need * 0.85 ? '조금만 더 모으면 살 수 있겠어.' : '아직은 무리야…'}" <em>구경만 함 · ${GR[x.g]}급 ${nm} ${x.have}/${x.need}G · ${when}</em></div>`; }
    return h + '</div>';
  }
  function giftHtml(s) {
    const Gm = G(), al = s.advs.filter(a => a.alive);
    let h = `<div class="smH">선물 <small>길드 금으로 한 칸씩 사서 줍니다 · 1개당 애착 ${GR.slice(0, 2).map((g, i) => `${g} +${(s.cfg.gear.giftAttach || [1, 2])[i]}`).join(' · ')} [임시]</small><span class="smGold">길드 금 ${Math.floor(s.gold).toLocaleString()}G</span></div><div class="gfList">`;
    for (const a of al) {
      const e = Gm.eqOf(a);
      h += `<div class="gfRow">${face(a)}<span class="gfN"><b>${esc(a.name)}</b><div>${CLS[a.core]} · Lv ${a.lv}</div></span>`;
      for (let k = 0; k < 3; k++) {
        const g = e[k], it = g >= 0 ? itemOf(slotType(a.core, k), g) : null, ng = g + 1, why = Gm.smithWhy(s, a, k), price = s.cfg.gear.weaponPrice[ng];
        h += `<div class="gfSlot" title="${esc(Gm.EQ_NAME[k])}${it ? ' · ' + esc(it.name) : ' · 없음'}">${it ? `<img src="assets/${it.icon}" alt="">` : `<span class="e">${Gm.EQ_NAME[k].slice(0, 2)}</span>`}<span class="gbx ${g < 0 ? 'no' : GR[g]}">${g < 0 ? '－' : GR[g]}</span>`
          + (ng <= s.grade ? `<button data-sg="${a.id}:${k}" ${why ? `disabled title="${esc(why)}"` : ''}>${GR[ng]}급 ${price}G</button>` : '<small>길드 등급까지</small>') + '</div>';
      }
      h += '</div>';
    }
    return h + '</div><div class="smHint">칸마다 따로 선물합니다. 같은 등급은 선물할 수 없고, 길드 등급까지만 올릴 수 있습니다.</div>';
  }
  function render() {
    const s = S(); if (!s || !box) return;
    const body = tab === 'gift' ? giftHtml(s) : shopHtml(s);
    const sayHtml = say || (LINES[tab] || LINES.shop)[0];
    const ls = box.querySelector('.gfList'), y = ls ? ls.scrollTop : 0;
    box.innerHTML = `<div id="smPop"><div id="smHead">대장간</div><div id="smX" data-sx="1">✕</div>
<div id="smL"><img src="assets/npc/npc_smith_stand.webp" alt=""><div id="smSay"><b>대장장이</b>${sayHtml}</div></div>
<div id="smR"><div id="smTabs"><span class="smT ${tab === 'shop' ? 'on' : ''}" data-st="shop">진열대</span><span class="smT ${tab === 'gift' ? 'on' : ''}" data-st="gift">선물</span><span class="smT lock" title="강화는 2단계에서 만듭니다">🔒 강화 (준비 중)</span></div><div id="smBody">${body}</div></div></div>`;
    const ls2 = box.querySelector('.gfList'); if (ls2) ls2.scrollTop = y;
  }
  function onClick(e) {
    const s = S(); if (!s) return;
    if (e.target === box || e.target.closest('[data-sx]')) { Smithy.close(); return; }
    const t = e.target.closest('[data-st]'); if (t) { tab = t.dataset.st; say = null; render(); return; }
    const b = e.target.closest('[data-sg]'); if (b && !b.disabled) {
      const [aid, k] = b.dataset.sg.split(':').map(Number), a = s.advs.find(x => x.id === aid), r = G().smithGift(s, aid, k);
      if (r.ok) { say = `${pick(LINES.gave)}<span class="re"><b>${esc(a.name)}</b>${pick(LINES.react[a.social] || LINES.react[1])} <small>(애착 +${r.att})</small></span>`; if (root.UI) { root.UI.toast(`${a.name}에게 ${GR[r.g]}급 ${G().EQ_NAME[k]}를 선물했습니다. (${r.price}G)`, 'grow'); root.UI.hud(); } }
      else if (root.UI) root.UI.toast(r.why, 'warn');
      render();
    }
  }
  Smithy.open = function (t) { if (!ensure()) return; tab = t || 'shop'; say = (LINES[tab] || LINES.shop)[Math.floor(Math.random() * (LINES[tab] || LINES.shop).length)]; box.style.display = 'block'; render(); };
  Smithy.close = function () { if (box) box.style.display = 'none'; };
  Smithy.isOpen = () => !!(box && box.style.display !== 'none');
  root.Smithy = Smithy;
})(typeof window !== 'undefined' ? window : globalThis);
