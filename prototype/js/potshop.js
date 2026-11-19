// 물약 상점 창 (2026-11-19, 시안 potion_v2 · 대장간과 같은 형식 · 주인 그레타) — 마을 지도에서 물약 상점(해금 뒤)을 누르면 열림
// 진열대: 물약 4종 (모험가가 전투 의뢰로 출발할 때 소지금으로 삼) + 최근 손님 (s.potLog)
// 달이기: 창고 소재 + 공임 → 물약 창고 (GuildGame.potBrew) · 나눠 주기: 창고 물약 1병을 가방에(최대 3병), 애착은 장비 선물과 같음 (GuildGame.potGive)
(function (root) {
  'use strict';
  const PotShop = {};
  let tab = 'shop', box = null, say = null;
  const GR = ['F', 'E', 'D', 'C', 'B', 'A', 'S'], CLS = ['전사', '궁수', '마법사', '성직자', '도적'];
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const G = () => root.GuildGame, S = () => (PotShop.getS ? PotShop.getS() : null);
  const ITEMS = () => ((root.GAME_DATA || {}).content || {}).items || [];
  const CB = () => (root.GuildCombat && root.GAME_DATA ? root.GuildCombat.make(root.GAME_DATA) : null);
  const itemOf = (type, g) => ITEMS().find(i => i.kind === 'gear' && i.gtype === type && i.grade === GR[g]);
  // 칸별 장비 종류: 명부의 장비 칸과 같은 짝 (무기 · 방어구 = 전투 계산, 장신구 = 명부 표시와 같음)
  const slotType = (core, k) => { const C = CB(); if (!C) return null; return k === 0 ? C.WEAPON[core] : k === 1 ? C.ARMOR[core] : C.ACC[(core + 2) % 5]; };
  const LINES = {
    shop: ['어서 오렴. 약초 냄새가 좀 나지?<br>그게 좋은 물약이란 증거란다.', '천천히 골라 보렴.<br>할미 가게는 도망 안 간단다.'],
    craft: ['약초만 넉넉히 가져오면<br>얼마든지 달여 주마.', '불 조절이 제일 어렵단다.<br>할미한테 맡겨 두렴.'],
    made: ['보글보글… 다 됐다!', '색이 아주 곱게 나왔구나.', '한 솥 더 올려 볼까?'],
    gift: ['떠나기 전에 한 병씩 쥐여 주면<br>애들이 든든해할 게다.'],
    gave: ['몸조심하라고 전해 주렴.'], react: [['…고마워요, 할머니.'], ['고마워요, 마스터!'], ['와, 이걸로 버틸 수 있겠어요!']]
  };
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const CSS = `
#psBack{position:absolute;inset:0;background:rgba(30,18,10,.45);z-index:40;pointer-events:auto}
#psPop{position:absolute;left:50%;top:50%;transform:translate(-50%,-48%);width:1300px;height:800px;box-sizing:border-box;--pb:46px;border:var(--pb) solid transparent;border-image:url(assets/ui/pop/panel_paper.png) 60 fill/var(--pb) stretch;filter:drop-shadow(0 12px 24px rgba(0,0,0,.45));color:#3b2a1e;font-size:21px}
#psHead{position:absolute;left:50%;top:-80px;transform:translateX(-50%);min-width:380px;height:76px;display:flex;align-items:center;justify-content:center;background:url(assets/ui/pop/title.png) center/100% 100% no-repeat;font:700 34px MaruBuri,serif;color:#4a2d18;padding:0 60px}
#psX{position:absolute;right:-18px;top:-22px;width:56px;height:56px;border-radius:50%;background:#7a3b26;color:#fbe9cf;font-size:30px;display:flex;align-items:center;justify-content:center;border:3px solid #e4c48e;box-shadow:0 3px 6px rgba(0,0,0,.4);cursor:pointer}
#psL{position:absolute;left:0;top:0;bottom:0;width:380px;overflow:hidden}
#psL img{position:absolute;left:-30px;bottom:-6px;height:560px}
#psSay{position:absolute;left:14px;top:8px;width:330px;z-index:2;background:#fffaf0;border:2px solid #c9a774;border-radius:14px;padding:12px 16px;font-size:20px;line-height:1.45;box-shadow:0 2px 0 #e3cfa8}
#psSay:after{content:'';position:absolute;left:150px;bottom:-14px;border:12px solid transparent;border-top-color:#c9a774;border-bottom:0}
#psSay b{display:block;font-size:16px;color:#8a7258;margin-bottom:2px}
#psSay .re{display:block;margin-top:8px;padding-top:6px;border-top:1px dashed #dcc59c;color:#5a3a22}
#psR{position:absolute;left:400px;right:0;top:0;bottom:0;display:flex;flex-direction:column}
#psTabs{display:flex;gap:8px;border-bottom:3px solid #c9a774;padding-left:6px}
.smT{padding:8px 28px 10px;border-radius:12px 12px 0 0;background:#e6d3ad;color:#7a5f45;font-weight:700;font-size:22px;border:2px solid #c9a774;border-bottom:0;margin-bottom:-3px;cursor:pointer}
.smT.on{background:#fbf1dc;color:#4a2d18;border-bottom:3px solid #fbf1dc}
.smT.lock{opacity:.55;cursor:default}
#psBody{flex:1;padding:14px 10px 0 14px;overflow:hidden;display:flex;flex-direction:column;min-height:0}
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
.cxBar{display:flex;align-items:center;gap:12px;margin:2px 0 10px}
.seg{display:flex;background:#eadbbd;border-radius:22px;padding:3px}.seg span{padding:5px 18px;border-radius:18px;font-weight:700;font-size:18px;color:#7a5f45;cursor:pointer}.seg span.on{background:#fffaf0;color:#4a2d18;box-shadow:0 1px 2px rgba(0,0,0,.15)}.seg.sm span{padding:5px 12px;font-size:16px}.seg span.lock{opacity:.4;pointer-events:none}
.cxBar .smGold{margin-left:auto}
.cxWrap{flex:1;min-height:0;display:flex;gap:14px}
.cxGrid{flex:1;display:grid;grid-template-columns:repeat(3,1fr);gap:10px;align-content:start}
.cxIt{position:relative;background:#fffaf0;border:2px solid #e3cfa8;border-radius:14px;padding:10px 6px 8px;text-align:center;cursor:pointer}
.cxIt img{width:64px;height:64px;display:block;margin:0 auto 4px}.cxIt b{display:block;font:700 18px MaruBuri,serif;color:#4a2d18}.cxIt i{font-style:normal;font-size:14px;color:#9a8670}
.cxIt.no img{filter:grayscale(.7);opacity:.6}.cxIt.no b{color:#9a8670}
.cxIt.sel{border-color:#c8862f;box-shadow:0 0 0 3px #f3d79a}
.cxIt em{position:absolute;right:8px;top:6px;font-style:normal;font-size:14px;font-weight:700;color:#fff;background:#4f8a5b;border-radius:10px;padding:0 7px}
.cxDet{flex:0 0 300px;background:#fffaf0;border:2px solid #e3cfa8;border-radius:16px;padding:14px;display:flex;flex-direction:column;gap:10px}
.cxHd{display:flex;gap:14px;align-items:center}.cxIc{position:relative;flex:none}.cxIc img{width:80px;height:80px;background:#f6ecd6;border-radius:14px;padding:4px;display:block}.cxIc .gbx{position:absolute;right:-8px;bottom:-6px;width:30px;height:30px;font-size:18px;border-radius:8px;border:2px solid #fffaf0}.cxHd b{display:block;font:700 24px MaruBuri,serif;color:#4a2d18}.cxHd small{font-size:15px;color:#8a7258}
.cxRc{display:flex;flex-direction:column;gap:6px;border-top:1px dashed #dcc59c;padding-top:10px}
.cxM{display:flex;align-items:center;gap:8px;font-size:17px}.cxM img{width:32px;height:32px}.cxM span{flex:1}.cxM b{font-size:18px;color:#4a2d18}.cxM b i{font-style:normal;color:#9a8670;font-weight:400}
.cxM.no b{color:#c0392b}.cxM.fee{border-top:1px dashed #dcc59c;padding-top:6px;color:#7a5f45}
.cxGo{margin-top:auto;font:700 22px MaruBuri,serif;padding:10px;border-radius:12px;border:2px solid #7a4a12;background:linear-gradient(#f3c66b,#d99a32);color:#4a2a08;cursor:pointer}.cxGo:disabled{background:#e2d6bf;border-color:#c9b896;color:#a8977e;cursor:default}
.cxWhy{font-size:14px;color:#9a8670;text-align:center;min-height:20px}
.gxT{font-size:18px;color:#5a3a22}.gxT b{font-size:22px;color:#7a4a12}.gxT.sub{font-size:15px;color:#9a8670;margin-left:auto}
.gxList{flex:1;min-height:0;overflow-y:auto;display:flex;flex-direction:column;gap:8px;padding-right:6px}
.gxRow{display:flex;align-items:center;gap:12px;background:#fffaf0;border:2px solid #e8d7b4;border-radius:14px;padding:8px 12px}
.gxN{flex:0 0 110px}.gxN b{display:block;font-size:20px}.gxN i{font-style:normal;font-size:14px;color:#9a8670}
.gxS{flex:1;min-width:0;display:flex;align-items:center;gap:8px;border-radius:12px;padding:6px 8px;background:#f8f0de}
.gxS .ic{position:relative;flex:none;width:44px;height:44px}.gxS .ic img{width:44px;height:44px}.gxS .ic .gbx{position:absolute;right:-5px;bottom:-4px;width:20px;height:20px;font-size:13px;border-radius:6px}
.gxS .ic.none{display:flex;align-items:center;justify-content:center;border-radius:10px;background:#efe4cf;color:#c4b08e;font-weight:700}
.gxS .tx{min-width:0;flex:1}.gxS small{display:block;font-size:13px;color:#a8977e}.gxS b{display:block;font-size:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#4a2d18}.gxS b.cur{color:#9a8670;font-weight:400}
.gxS.up{background:#fff5d8;box-shadow:inset 0 0 0 2px #e6b34a,0 0 10px rgba(230,179,74,.45);cursor:pointer}.gxS.up small{color:#c8862f}.gxS.up b{color:#8a5a12}
.gxGo{flex:none;font-weight:700;font-size:15px;color:#fff;background:#c8862f;border-radius:10px;padding:3px 10px}
.pIc{position:relative;display:inline-block}.pIc img{width:64px;height:64px;display:block;margin:0 auto 4px}.pIc .gbx{position:absolute;right:-8px;bottom:0;width:24px;height:24px;font-size:15px;border-radius:7px;border:2px solid #fffaf0}
.pBag{flex:0 0 120px;display:flex;align-items:center;gap:4px}.pBag span{width:16px;height:22px;border-radius:5px 5px 7px 7px;background:#eadfca;border:2px solid #d6c3a0}.pBag span.on{background:linear-gradient(#ff9d8a,#d9533e);border-color:#9a3a2a}.pBag small{font-size:14px;color:#8a7258;margin-left:4px}
.smHint{font-size:16px;color:#8a7258;margin:6px 0 4px}
`;
  function ensure() {
    if (box) return true;
    const host = document.getElementById('townUi'); if (!host) return false;
    const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    box = document.createElement('div'); box.id = 'psBack'; box.style.display = 'none'; host.appendChild(box);
    box.addEventListener('click', onClick);
    return true;
  }
  const face = a => `<span class="smF" style="${root.UI && root.UI.faceStyle ? root.UI.faceStyle(a, 42, 190, 28) : ''}"></span>`;
  const POTS = () => ITEMS().filter(i => i.kind === 'potion');
  const MATS = () => ((root.GAME_DATA || {}).content || {}).materials || [], mat = id => MATS().find(m => m.id === id) || { name: id };
  const PRICE = g => { const C = root.GuildCombat && root.GAME_DATA ? root.GuildCombat.make(root.GAME_DATA).C : null; return C ? C.potionPrice[g] : [20, 30][g]; };
  let cGrade = 0, cSel = null;
  function shopHtml(s) {
    let h = `<div class="cxBar"><span class="gxT">진열대</span><span class="gxT sub">모험가가 출발할 때 소지금으로 사 갑니다 (절약 1 · 보통 2 · 낭비 3병까지)</span></div><div class="cxGrid" style="grid-template-columns:repeat(4,1fr)">`;
    for (const it of POTS()) { const g = GR.indexOf(it.grade), lock = g > s.grade; h += `<div class="cxIt ${lock ? 'no' : ''}"><span class="pIc"><img src="assets/${it.icon}" alt=""><span class="gbx ${it.grade}">${it.grade}</span></span><b>${esc(it.name)}</b><i>${lock ? '길드 E급부터' : PRICE(g) + 'G'}</i></div>`; }
    const L = (s.potLog || []).slice(0, 10), who = id => s.advs.find(a => a.id === id);
    h += `</div><div class="smH" style="margin-top:14px">최근 손님</div><div class="smLog">`;
    if (!L.length) h += '<div class="smNone">아직 물약을 사러 온 모험가가 없습니다. 모험가는 전투 의뢰로 출발할 때 삽니다.</div>';
    for (const x of L) { const a = who(x.id); if (!a) continue; const ago = s.week - x.w, when = ago < 1 ? '이번 주' : ago < 4 ? `${ago}주 전` : `${Math.floor(ago / 4)}달 전`;
      h += `<div class="smL">${face(a)}<b>${esc(a.name)}</b> 물약 ${x.n}병을 샀습니다. <em>(출발 전 · ${x.price * x.n}G · ${when})</em></div>`; }
    return h + '</div>';
  }
  function craftHtml(s) {
    const Gm = G(), gMax = Math.min(s.grade, 1); if (cGrade > gMax) cGrade = gMax;
    const L = POTS().filter(it => GR.indexOf(it.grade) === cGrade); if (!cSel || !L.some(x => x.id === cSel)) cSel = (L.find(x => !Gm.potWhy(s, x.id)) || L[0] || {}).id;
    let h = `<div class="cxBar"><div class="seg sm">${GR.slice(0, 2).map((g, i) => `<span class="${i === cGrade ? 'on' : ''} ${i > gMax ? 'lock' : ''}" data-cgr="${i}">${g}급</span>`).join('')}</div><span class="smGold">금고 ${Math.floor(s.gold).toLocaleString()}G</span></div><div class="cxWrap"><div class="cxGrid">`;
    for (const it of L) { const R = Gm.potInfo(s, it.id), ok = !Gm.potWhy(s, it.id); h += `<div class="cxIt ${it.id === cSel ? 'sel' : ''} ${ok ? 'ok' : 'no'}" data-csel="${it.id}"><img src="assets/${it.icon}" alt=""><b>${esc(it.name)}</b><i>${(it.desc || '').includes('마력') ? '마력 회복' : '체력 회복'}</i>${R.own ? `<em>${R.own > 99 ? '99+' : R.own}</em>` : ''}</div>`; }
    h += '</div>';
    const it = L.find(x => x.id === cSel);
    if (it) { const R = Gm.potInfo(s, it.id), w = Gm.potWhy(s, it.id);
      h += `<div class="cxDet"><div class="cxHd"><span class="cxIc"><img src="assets/${it.icon}" alt=""><span class="gbx ${it.grade}">${it.grade}</span></span><div><b>${esc(it.name)}</b><small>물약 · 창고 ${R.own}병</small></div></div><div class="cxRc">`;
      for (const x of R.need) { const m = mat(x.m); h += `<div class="cxM ${x.have < x.n ? 'no' : ''}">${m.icon ? `<img src="assets/${m.icon}" alt="">` : ''}<span>${esc(m.name)}</span><b>${x.have}<i> / ${x.n}</i></b></div>`; }
      h += `<div class="cxM fee"><span>공임</span><b>${R.fee}G</b></div></div><button class="cxGo" data-cf="${it.id}" ${w ? 'disabled' : ''}>달이기</button><div class="cxWhy">${w ? esc(w) : '달인 물약은 물약 창고에 쌓입니다'}</div></div>`; }
    return h + '</div>';
  }
  function giftHtml(s) {
    const Gm = G(), al = s.advs.filter(a => a.alive), I = s.potInv || {}, tot = Object.values(I).reduce((t, n) => t + Math.max(0, n), 0), A = s.cfg.gear.giftAttach || [1, 2];
    const show = POTS().filter(p => GR.indexOf(p.grade) <= Math.min(s.grade, 1));
    let h = `<div class="cxBar"><span class="gxT">물약 창고 <b>${tot}</b>병</span><span class="gxT sub">빛나는 칸을 누르면 한 병 · 한 사람 ${Gm.POT_BAG}병까지 · 애착 F +${A[0]} · E +${A[1]} [임시]</span></div><div class="gxList">`;
    for (const a of al) {
      const n = Math.min(Gm.POT_BAG, a.pots || 0);
      h += `<div class="gxRow">${face(a)}<span class="gxN"><b>${esc(a.name)}</b><i>${CLS[a.core]} · Lv ${a.lv}</i></span><span class="pBag">${[0, 1, 2].map(i => `<span class="${i < n ? 'on' : ''}"></span>`).join('')}<small>${n}/${Gm.POT_BAG}병</small></span>`;
      for (const p of show) { const have = I[p.id] || 0, ok = !Gm.potGiveWhy(s, a, p.id);
        h += `<div class="gxS ${ok ? 'up' : ''}" ${ok ? `data-pg="${a.id}:${p.id}"` : ''}><span class="ic"><img src="assets/${p.icon}" alt=""><span class="gbx ${p.grade}">${p.grade}</span></span><span class="tx"><small>${ok ? '눌러서 한 병 · 창고 ' + have : n >= Gm.POT_BAG ? '가방이 꽉 참' : '창고에 없음'}</small><b class="${ok ? '' : 'cur'}">${esc(p.name)}</b></span></div>`; }
      h += '</div>';
    }
    return h + '</div>';
  }
  function render() {
    const s = S(); if (!s || !box) return;
    const body = tab === 'gift' ? giftHtml(s) : tab === 'craft' ? craftHtml(s) : shopHtml(s);
    const sayHtml = say || (LINES[tab] || LINES.shop)[0];
    const ls = box.querySelector('.gfList'), y = ls ? ls.scrollTop : 0;
    box.innerHTML = `<div id="psPop"><div id="psHead">물약 상점</div><div id="psX" data-sx="1">✕</div>
<div id="psL"><img src="assets/npc/npc_granny_stand.webp" alt=""><div id="psSay"><b>그레타</b>${sayHtml}</div></div>
<div id="psR"><div id="psTabs"><span class="smT ${tab === 'shop' ? 'on' : ''}" data-st="shop">진열대</span><span class="smT ${tab === 'craft' ? 'on' : ''}" data-st="craft">달이기</span><span class="smT ${tab === 'gift' ? 'on' : ''}" data-st="gift">나눠 주기</span></div><div id="psBody">${body}</div></div></div>`;
    const ls2 = box.querySelector('.gfList'); if (ls2) ls2.scrollTop = y;
  }
  function onClick(e) {
    const s = S(); if (!s) return;
    if (e.target === box || e.target.closest('[data-sx]')) { PotShop.close(); return; }
    const t = e.target.closest('[data-st]'); if (t) { tab = t.dataset.st; say = null; render(); return; }
    const ck = e.target.closest('[data-ck]'); if (ck) { cKind = +ck.dataset.ck; cSel = null; render(); return; }
    const cg = e.target.closest('[data-cgr]'); if (cg) { cGrade = +cg.dataset.cgr; cSel = null; render(); return; }
    const cs = e.target.closest('[data-csel]'); if (cs) { cSel = cs.dataset.csel; render(); return; }
    const c = e.target.closest('[data-cf]'); if (c && !c.disabled) { const r = G().potBrew(s, c.dataset.cf); if (r.ok) { say = pick(LINES.made); if (root.UI) { root.UI.toast(`${r.item}을 달였습니다. (공임 ${r.fee}G)`, 'unlock'); root.UI.hud(); } } else if (root.UI) root.UI.toast(r.why, 'warn'); render(); return; }
    const pg = e.target.closest('[data-pg]'); if (pg) { const [aid, pid] = pg.dataset.pg.split(':'), a = s.advs.find(x => x.id === +aid), r = G().potGive(s, +aid, pid); if (r.ok) { say = `${pick(LINES.gave)}<span class="re"><b>${esc(a.name)}</b>${pick(LINES.react[a.social] || LINES.react[1])} <small>(애착 +${r.att})</small></span>`; if (root.UI) { root.UI.toast(`${a.name}에게 ${r.item}을 쥐여 주었습니다.`, 'grow'); root.UI.hud(); } } else if (root.UI) root.UI.toast(r.why, 'warn'); render(); return; }
  }
  PotShop.open = function (t) { if (!ensure()) return; tab = t || 'shop'; say = (LINES[tab] || LINES.shop)[Math.floor(Math.random() * (LINES[tab] || LINES.shop).length)]; box.style.display = 'block'; render(); };
  PotShop.close = function () { if (box) box.style.display = 'none'; };
  PotShop.isOpen = () => !!(box && box.style.display !== 'none');
  root.PotShop = PotShop;
})(typeof window !== 'undefined' ? window : globalThis);
