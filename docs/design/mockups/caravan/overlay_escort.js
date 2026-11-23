// 떠돌이 상단 호위 의뢰 · 주인 초상 시안 (2026-11-20, 사용자 요청) — 게임에는 들어가지 않는 확인용 코드.
// 게임에서 상단이 머무는 판을 만들고 책 → 경영 → 상단을 연 뒤 실행:
//   MOCK.escort(state)    상단 책갈피 오른쪽 맨 위에 '호위 부탁' 상자 덧씌움
//   MOCK.portraitTalk()   대화창에 주인 초상(임시: 기존 의뢰인 그림 재사용)으로 인사 · 호위 부탁 대사
(function () {
  const CSS = `
  .mk-tag{position:absolute;left:180px;bottom:70px;z-index:50;background:#b5462f;color:#fff;font:700 13px/1 sans-serif;padding:6px 10px;border-radius:4px}
  .es-box{margin:0 0 8px;padding:10px 12px;border-radius:10px;background:linear-gradient(#fff6e2,#fbeccc);border:2px solid #b8862e;box-shadow:0 2px 6px rgba(90,58,34,.18);color:#4a321c}
  .es-h{display:flex;align-items:center;gap:8px;font-size:16px;font-weight:700}
  .es-h .tag{font-size:11px;padding:1px 8px;border-radius:999px;background:#b5462f;color:#fff}
  .es-h .lv{margin-left:auto;font-size:12px;font-weight:400;color:#7a6650}
  .es-q{margin:6px 0;font-size:14px;line-height:1.5}
  .es-kv{display:grid;grid-template-columns:auto 1fr auto 1fr;gap:3px 10px;font-size:13px;margin:6px 0}
  .es-kv b{color:#5a3a22}
  .es-two{display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:12.5px;line-height:1.4}
  .es-two div{padding:5px 8px;border-radius:7px}
  .es-two .ok{background:#e3f1e5;color:#1f5a3a}.es-two .ng{background:#f6e0da;color:#7c2a1a}
  .es-btns{display:flex;gap:6px;margin-top:8px}.es-btns span{flex:1;text-align:center;padding:6px 0;border-radius:7px;font-weight:700;font-size:14px;border:1.5px solid #7a4a28;background:#fbf4e6}
  .es-btns span.p{background:#2f6a52;border-color:#2f6a52;color:#fff}
  `;
  function css() { if (!document.getElementById('es-css')) { const st = document.createElement('style'); st.id = 'es-css'; st.textContent = CSS; document.head.appendChild(st); } }
  function tag(t) { if (!document.querySelector('.mk-tag')) { const d = document.createElement('div'); d.className = 'mk-tag'; d.textContent = t; document.getElementById('pop').appendChild(d); } }
  function escort(s) {
    css(); const Gm = window.GuildGame, here = Gm.carHere(s)[0]; if (!here) return 'no caravan';
    const st = s.car[here.id], lv = Gm.carRelLv(s, st), g = Math.min(s.grade, here.g + 0), base = s.cfg.quest.reward[g], rw = Math.round(base * 1.2 / 10) * 10, fee = Math.round(Gm.questFee(s, { g }) * 100);
    const box = document.createElement('div'); box.className = 'es-box';
    box.innerHTML = `<div class="es-h">🛡 ${here.boss}의 부탁 — 상단 호위 <span class="tag">관계 2단계부터</span><span class="lv">관계 ${lv}단계 · 떠나기 전까지</span></div>
      <div class="es-q">“다음 마을까지 가는 길에 들개 떼가 나온다더군요. 길드 모험가 몇 분이 같이 가 주시면 좋겠어요.”</div>
      <div class="es-kv"><span>보상</span><b>${rw}G (상단이 냄)</b><span>수수료</span><b>${fee}% · 길드 몫 ${Math.round(rw * fee / 100)}G</b><span>기간</span><b>2주 · 전투</b><span>인원</span><b>2~3명 권장</b></div>
      <div class="es-two"><div class="ok"><b>성공</b> · 관계 +100 · 다음 방문 1~2주 빨라짐 · 다음 주문서 값 +0.1배</div><div class="ng"><b>실패</b> · 관계 −50 · 다음 방문 늦어짐<br><b>거절</b> · 변화 없음</div></div>
      <div class="es-btns"><span class="p">게시판에 올리기</span><span>이번엔 거절</span></div>`;
    const r = document.querySelector('.bk-car > .bk-r'), say = r.querySelector('.car-say'); (say ? say.nextSibling : r.firstChild) ? r.insertBefore(box, say ? say.nextSibling : r.firstChild) : r.appendChild(box);
    tag('시안 — 상단 호위 의뢰');
    return 'ok';
  }
  function portraitTalk() {
    const P = window.NPC_PORTRAITS; P['마르타 (농산 상단)'] = P['굼바']; P['브론 (대장장이 상단)'] = P['대장장이']; P['세라 (약재 상단)'] = P['세실리아'];   // 임시: 기존 의뢰인 그림 재사용
    window.UI.say([{ name: '브론 (대장장이 상단)', face: 'smile', text: '…자네 길드 물건이면 믿고 산다. 그런데 부탁이 하나 있네.' }, { name: '브론 (대장장이 상단)', face: 'smile', text: '다음 마을 가는 길에 들개 떼가 나온다더군. 모험가 몇 명 붙여 주면 값은 넉넉히 치르지.' }]);
    return 'ok';
  }
  window.MOCK = Object.assign(window.MOCK || {}, { escort, portraitTalk });
})();
