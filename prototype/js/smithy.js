// 대장간 창 (2026-11-18, 시안 smith2 사용자 확인) — 마을 지도에서 대장간(해금 뒤)을 누르면 열림
// 진열대: 길드 등급까지 무기 · 방어구 · 장신구를 1개씩 따로 판매 (모험가가 매달 소지금으로 1칸씩 삼) + 최근 손님
// 만들기 (2026-11-19 사용자 A안 · 시안 smith_craft_v3): 창고 소재 + 공임 → 길드 장비 창고 (GuildGame.smithCraft)
// 선물: 장비 창고에서 모험가 칸에 맞는 장비를 줌 (GuildGame.smithGift) — 금화로 사서 주기는 없앰 · 강화: 잠김 (2단계)
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
    craft: ['소재만 가져오게.<br>내가 두드려서 쓸 만하게 만들어 주지.', '창고에 굴러다니는 뼛조각도<br>내 손을 거치면 물건이 돼.'],
    made: ['다 됐네. 창고에 넣어 두지.', '좋은 쇠맛이 나는군. 하나 더?'],
    gift: ['마스터가 직접 준다면<br>녀석들도 기운이 나겠지.'],
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
.smHint{font-size:16px;color:#8a7258;margin:6px 0 4px}
.cxSet{grid-column:1/-1;display:flex;align-items:center;gap:8px;padding:6px 10px;border-radius:8px;background:#f1e2c6;font:700 17px MaruBuri,serif;color:#5a3412}
.cxSet small{font:400 14px inherit;font-family:inherit;color:#7a5a3a}
.cxIt .dgS{position:absolute;left:6px;top:6px;font-style:normal;font:700 12px/1 inherit;font-family:inherit;color:#fff;background:#6b4a9a;border-radius:4px;padding:3px 5px}
.cxSetFx{padding:8px 10px;border-radius:8px;background:#efe6f6;border:1.5px solid #b59ad0;font-size:14px;line-height:1.45;color:#4a2e66}.cxSetFx b{color:#3a1e5a}
.gxRare{display:flex;align-items:center;gap:12px;margin:0 0 10px;padding:10px 12px;border-radius:12px;background:linear-gradient(90deg,#fff3cf,#f7e1a6);border:2px solid #d0a03a}
.gxRare.set{background:linear-gradient(90deg,#f3ecfa,#e6dbf3);border-color:#a98bd0}
.gxRare img{width:60px;height:60px;flex:none}.gxRare .tx{flex:1;min-width:0}
.gxRare .tx>b{display:block;font:800 19px/1.2 MaruBuri,serif;color:#5a3a08}.gxRare .tx>b small{font:700 13px inherit;font-family:inherit;color:#a0461c;margin-left:4px}
.gxRare .tx em{font-style:normal;font-size:14px;line-height:1.35;color:#7a5a20}.gxRare .tx em u{text-decoration:none;color:#a33b22;font-weight:700}
.gxRare select{font:600 15px inherit;font-family:inherit;padding:4px 6px;border-radius:8px;border:2px solid #c9a774;background:#fffaf0;max-width:230px}
.gxRare .go{flex:none;padding:7px 14px;border-radius:10px;background:#c48a2a;color:#fff;font:800 16px/1 inherit;font-family:inherit;cursor:pointer}
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
  // 2026-11-19 만들기 · 선물 (깔끔한 판): 왼쪽 목록 · 오른쪽 자세히
  const MATS = () => ((root.GAME_DATA || {}).content || {}).materials || [], mat = id => MATS().find(m => m.id === id) || { name: id };
  const KN = ['무기', '방어구', '장신구'], KT = [[0, 1, 2, 3, 4].map(c => [c]), [['heavy', [0]], ['light', [1, 4]], ['robe', [2, 3]]], [0, 1, 2, 3, 4].map(c => [c])];
  let cKind = 0, cGrade = 0, cSel = null, gSel = null;
  function craftList(s, k, g) {   // [{it, who}]
    if (k === 1) return [['heavy', '전사'], ['light', '궁수 · 도적'], ['robe', '마법사 · 성직자']].map(([t, w]) => ({ it: itemOf(t, g), who: w })).filter(x => x.it);
    return [0, 1, 2, 3, 4].map(c => ({ it: itemOf(slotType(c, k), g), who: CLS[c] })).filter(x => x.it);
  }
  // 2026-11-21 던전 세트 (시안 dg_smith_set): 만들기에 「던전」 칸 · 조합법은 정복 50%에 · 선물 탭 맨 위에 던전 장비(레어 · 세트) 주기 띠 (시안 dg_rare_gift)
  const dgSet = s => { const Gm = G(); return Gm.dgItems ? Gm.dgItems(s).filter(i => !i.rare) : []; };
  const stTxt = it => [it.atk ? `공격 +${it.atk}` : '', it.hp ? `체력 +${it.hp}` : '', it.def ? `방어 +${it.def}` : ''].filter(Boolean).join(' · ');
  function dgCraftHtml(s) {
    const Gm = G(), C = s.cfg.dungeon, L = dgSet(s); if (!cSel || !L.some(i => i.key === cSel)) cSel = (L[0] || {}).key;
    let h = '<div class="cxWrap"><div class="cxGrid">';
    h += `<div class="cxSet">굴 사냥꾼 세트 <small>${esc((Gm.dgDef(s) || {}).name || '던전')} · 정복 ${C.setAt}%에 조합법${s.dg && s.dg.setRecipe ? ' ✔' : ` (지금 ${s.dg ? s.dg.prog : 0}%)`}</small></div>`;
    for (const it of L) { const own = (s.gearInv || {})[it.key] || 0, ok = !Gm.dgCraftWhy(s, it.key);
      h += `<div class="cxIt ${it.key === cSel ? 'sel' : ''} ${ok ? 'ok' : 'no'}" data-csel="${it.key}"><i class="dgS">세트</i><img src="assets/${it.icon}" alt=""><b>${esc(it.name)}</b><i>${KN[it.slot]} · 아무 직업</i>${own ? `<em>${own}</em>` : ''}</div>`; }
    h += '</div>';
    const it = L.find(i => i.key === cSel);
    if (it) { const why = Gm.dgCraftWhy(s, it.key), own = (s.gearInv || {})[it.key] || 0;
      h += `<div class="cxDet"><div class="cxHd"><span class="cxIc"><img src="assets/${it.icon}" alt=""><span class="gbx ${GR[it.g]}">${GR[it.g]}</span></span><div><b>${esc(it.name)}</b><small>${KN[it.slot]} · ${stTxt(it)} · 창고 ${own}개</small></div></div><div class="cxRc">`;
      for (const r of it.recipe) { const m = mat(r.m), have = (s.mats || {})[r.m] || 0; h += `<div class="cxM ${have < r.n ? 'no' : ''}">${m.icon ? `<img src="assets/${m.icon}" alt="">` : ''}<span>${esc(m.name)}</span><b>${have}<i> / ${r.n}</i></b></div>`; }
      h += `<div class="cxM fee"><span>공임</span><b>${C.craftFee}G</b></div></div>`;
      h += `<div class="cxSetFx"><b>세트 효과</b> (같은 사람이 입었을 때)<br>2벌: 체력 +${C.setHp} · 공격 +${C.setAtk}<br>3벌: 이 던전 적에게 피해 +${Math.round(C.set3Vs * 100)}% · 공격 +${Math.round(C.set3Atk * 100)}%</div>`;
      h += `<button class="cxGo" data-dgcf="${it.key}" ${why ? 'disabled' : ''}>만들기</button><div class="cxWhy">${why ? esc(why) : '만든 장비는 선물 탭에서 모험가에게 줍니다'}</div></div>`; }
    return h + '</div>';
  }
  function craftHtml(s) {
    const Gm = G(), gMax = Math.min(s.grade, 1); if (cGrade > gMax) cGrade = gMax;
    const dgK = dgSet(s).length > 0 && s.dg; if (cKind === 3 && !dgK) cKind = 0;
    if (cKind === 3) return `<div class="cxBar"><div class="seg">${KN.map((n, i) => `<span data-ck="${i}">${n}</span>`).join('')}<span class="on" data-ck="3">던전</span></div><span class="smGold">금고 ${Math.floor(s.gold).toLocaleString()}G</span></div>` + dgCraftHtml(s);
    const L = craftList(s, cKind, cGrade); if (!cSel || !L.some(x => x.it.id === cSel)) cSel = (L.find(x => !Gm.craftWhy(s, x.it.id)) || L[0] || {}).it?.id;
    let h = `<div class="cxBar"><div class="seg">${KN.map((n, i) => `<span class="${i === cKind ? 'on' : ''}" data-ck="${i}">${n}</span>`).join('')}${dgK ? '<span data-ck="3">던전</span>' : ''}</div><div class="seg sm">${GR.slice(0, 2).map((g, i) => `<span class="${i === cGrade ? 'on' : ''} ${i > gMax ? 'lock' : ''}" data-cgr="${i}">${g}급</span>`).join('')}</div><span class="smGold">금고 ${Math.floor(s.gold).toLocaleString()}G</span></div>`;
    h += '<div class="cxWrap"><div class="cxGrid">';
    for (const x of L) { const R = Gm.craftInfo(s, x.it.id), ok = !Gm.craftWhy(s, x.it.id);
      h += `<div class="cxIt ${x.it.id === cSel ? 'sel' : ''} ${ok ? 'ok' : 'no'}" data-csel="${x.it.id}"><img src="assets/${x.it.icon}" alt=""><b>${esc(x.it.name)}</b><i>${x.who}</i>${R.own ? `<em>${R.own > 99 ? '99+' : R.own}</em>` : ''}</div>`; }
    h += '</div>';
    const R = cSel ? Gm.craftInfo(s, cSel) : null, why = cSel ? Gm.craftWhy(s, cSel) : '';
    if (R) {
      h += `<div class="cxDet"><div class="cxHd"><span class="cxIc"><img src="assets/${R.item.icon}" alt=""><span class="gbx ${GR[R.g]}">${GR[R.g]}</span></span><div><b>${esc(R.item.name)}</b><small>${KN[R.k]} · 창고 ${R.own}개</small></div></div><div class="cxRc">`;
      for (const x of R.need) { const m = mat(x.m), short = x.have < x.n; h += `<div class="cxM ${short ? 'no' : ''}">${m.icon ? `<img src="assets/${m.icon}" alt="">` : ''}<span>${esc(m.name)}</span><b>${x.have}<i> / ${x.n}</i></b></div>`; }
      h += `<div class="cxM fee"><span>공임</span><b>${R.fee}G</b></div></div><button class="cxGo" data-cf="${R.item.id}" ${why ? 'disabled' : ''}>만들기</button><div class="cxWhy">${why ? esc(why) : '만든 장비는 장비 창고에 쌓입니다'}</div></div>`;
    }
    return h + '</div>';
  }
  function giftHtml(s) {
    const Gm = G(), al = s.advs.filter(a => a.alive), inv = Object.values(s.gearInv || {}).reduce((t, n) => t + Math.max(0, n), 0);
    let h = `<div class="cxBar"><span class="gxT">장비 창고 <b>${inv}</b>개</span><span class="gxT sub">빛나는 칸을 누르면 선물 · 애착 F +${(s.cfg.gear.giftAttach || [1, 2])[0]} · E +${(s.cfg.gear.giftAttach || [1, 2])[1]} [임시]</span></div>`;
    // 던전 장비 띠: 창고에 있는 레어 · 세트 장비 → 고른 모험가에게 (레어는 주인이 죽거나 떠나면 사라짐)
    const DI = Gm.dgItems ? Gm.dgItems(s) : [], R0 = s.dg && s.dg.rare;
    for (const it of DI) { const n = (s.gearInv || {})[it.key] || 0, holder = it.rare && R0 && R0.holder != null ? s.advs.find(a => a.id === R0.holder && a.alive) : null; if (!n && !holder) continue;
      const opts = al.map(a => `<option value="${a.id}" ${gSel === a.id ? 'selected' : ''}>${esc(a.name)} · ${CLS[a.core]} Lv ${a.lv}${a.sp && a.sp[it.slot] === it.key ? ' (착용 중)' : ''}</option>`).join('');
      h += `<div class="gxRare ${it.rare ? '' : 'set'}"><img src="assets/${it.icon}" alt=""><div class="tx"><b>${esc(it.name)} <small>${it.rare ? '길드에 하나뿐' : '굴 사냥꾼 세트'}</small></b><em>${KN[it.slot]} · ${stTxt(it)}${it.rare ? ` · 함께 간 파티 공격 +${Math.round(s.cfg.dungeon.rareParty * 100)}%<br><u>주인이 죽거나 길드를 떠나면 사라집니다</u>` : ''}${holder ? `<br>지금 주인: <b>${esc(holder.name)}</b>` : ''}</em></div>`
        + (n ? `<select data-dgsel="${it.key}">${opts}</select><span class="go" data-dgg="${it.key}">주기</span>` : '') + '</div>'; }
    h += '<div class="gxList">';
    for (const a of al) {
      const e = Gm.eqOf(a);
      h += `<div class="gxRow">${face(a)}<span class="gxN"><b>${esc(a.name)}</b><i>${CLS[a.core]} · Lv ${a.lv}</i></span>`;
      for (let k = 0; k < 3; k++) {
        const spk = a.sp && a.sp[k] ? DI.find(i => i.key === a.sp[k]) : null;   // 던전 장비를 낀 칸은 그 이름 · 그림으로
        const g = e[k], cur = spk ? { name: spk.name, icon: spk.icon } : g >= 0 ? itemOf(slotType(a.core, k), g) : null, x = spk ? null : Gm.giftItems(s, a, k)[0];
        const show = x ? x.item : cur, gg = x ? x.g : g;
        h += `<div class="gxS ${x ? 'up' : ''}" ${x ? `data-sg="${a.id}:${k}"` : ''} title="${KN[k]}${cur ? ' · 지금 ' + esc(cur.name) : ' · 없음'}">`
          + (show ? `<span class="ic"><img src="assets/${show.icon}" alt="">${gg >= 0 ? `<span class="gbx ${GR[gg]}">${GR[gg]}</span>` : ''}</span>` : `<span class="ic none">${KN[k][0]}</span>`)
          + `<span class="tx"><small>${x ? KN[k] + ' · 눌러서 선물' : KN[k]}</small>${x ? `<b>▲ ${esc(x.item.name)}</b>` : `<b class="cur">${cur ? esc(cur.name) : '없음'}</b>`}</span></div>`;
      }
      h += '</div>';
    }
    return h + '</div>';
  }
  function render() {
    const s = S(); if (!s || !box) return;
    const body = tab === 'gift' ? giftHtml(s) : tab === 'craft' ? craftHtml(s) : shopHtml(s);
    const sayHtml = say || (LINES[tab] || LINES.shop)[0];
    const ls = box.querySelector('.gfList'), y = ls ? ls.scrollTop : 0;
    box.innerHTML = `<div id="smPop"><div id="smHead">대장간</div><div id="smX" data-sx="1">✕</div>
<div id="smL"><img src="assets/npc/npc_smith_stand.webp" alt=""><div id="smSay"><b>대장장이</b>${sayHtml}</div></div>
<div id="smR"><div id="smTabs"><span class="smT ${tab === 'shop' ? 'on' : ''}" data-st="shop">진열대</span><span class="smT ${tab === 'craft' ? 'on' : ''}" data-st="craft">만들기</span><span class="smT ${tab === 'gift' ? 'on' : ''}" data-st="gift">선물</span><span class="smT lock" title="강화는 2단계에서 만듭니다">🔒 강화 (준비 중)</span></div><div id="smBody">${body}</div></div></div>`;
    const ls2 = box.querySelector('.gfList'); if (ls2) ls2.scrollTop = y;
  }
  function onClick(e) {
    const s = S(); if (!s) return;
    if (e.target === box || e.target.closest('[data-sx]')) { Smithy.close(); return; }
    const t = e.target.closest('[data-st]'); if (t) { tab = t.dataset.st; say = null; render(); return; }
    const ck = e.target.closest('[data-ck]'); if (ck) { cKind = +ck.dataset.ck; cSel = null; render(); return; }
    const cg = e.target.closest('[data-cgr]'); if (cg) { cGrade = +cg.dataset.cgr; cSel = null; render(); return; }
    const cs = e.target.closest('[data-csel]'); if (cs) { cSel = cs.dataset.csel; render(); return; }
    const dc = e.target.closest('[data-dgcf]'); if (dc && !dc.disabled) { const r = G().dgCraft(s, dc.dataset.dgcf); if (r.ok) { say = pick(LINES.made); if (root.UI) root.UI.hud(); } else if (root.UI) root.UI.toast(r.why, 'warn'); render(); return; }
    const dg = e.target.closest('[data-dgg]'); if (dg) { const sel_ = box.querySelector(`[data-dgsel="${dg.dataset.dgg}"]`), aid = sel_ ? +sel_.value : null, a = s.advs.find(x => x.id === aid), r = G().dgGive(s, aid, dg.dataset.dgg);
      if (r.ok) { say = `${pick(LINES.gave)}<span class="re"><b>${esc(a.name)}</b>${pick(LINES.react[a.social] || LINES.react[1])}</span>`; if (root.UI) root.UI.hud(); } else if (root.UI) root.UI.toast(r.why, 'warn'); render(); return; }
    if (e.target.closest('select')) return;
    const c = e.target.closest('[data-cf]'); if (c && !c.disabled) { const r = G().smithCraft(s, c.dataset.cf); if (r.ok) { say = pick(LINES.made); if (root.UI) { root.UI.toast(`${r.item}을 만들었습니다. (공임 ${r.fee}G)`, 'unlock'); root.UI.hud(); } } else if (root.UI) root.UI.toast(r.why, 'warn'); render(); return; }
    const b = e.target.closest('[data-sg]'); if (b && !b.disabled) {
      const [aid, k] = b.dataset.sg.split(':').map(Number), a = s.advs.find(x => x.id === aid), r = G().smithGift(s, aid, k);
      if (r.ok) { say = `${pick(LINES.gave)}<span class="re"><b>${esc(a.name)}</b>${pick(LINES.react[a.social] || LINES.react[1])} <small>(애착 +${r.att})</small></span>`; if (root.UI) { root.UI.toast(`${a.name}에게 ${r.item}을 선물했습니다.`, 'grow'); root.UI.hud(); } }
      else if (root.UI) root.UI.toast(r.why, 'warn');
      render();
    }
  }
  Smithy.open = function (t) { if (!ensure()) return; tab = t || 'shop'; say = (LINES[tab] || LINES.shop)[Math.floor(Math.random() * (LINES[tab] || LINES.shop).length)]; box.style.display = 'block'; render(); };
  Smithy.close = function () { if (box) box.style.display = 'none'; };
  Smithy.isOpen = () => !!(box && box.style.display !== 'none');
  root.Smithy = Smithy;
})(typeof window !== 'undefined' ? window : globalThis);
