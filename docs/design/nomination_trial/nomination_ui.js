/* 지명 퀘스트 시험판 화면 (2026-11-16, 작업 공간 전용). 책 UI 리퀘스트 장이 생기기 전에 결정 4가지를 눌러 보기 위한 임시 창.
   왼쪽: 지명 의뢰 카드 3건 / 오른쪽: 모험가 목록(조건 · 애착 · 수락 확률 · 상태). 이름을 누르면 바로 수락 · 거절, [보내기]는 다음 주 게시판보다 먼저 출발 */
(function (root) {
  const G = root.GuildGame; let getS = null, el = null, cur = null, msg = '';
  const CLS = ['전사', '궁수', '마법사', '성직자', '도적'], GR = ['F', 'E', 'D', 'C', 'B', 'A', 'S'];
  const css = `#nomBtn{position:fixed;left:12px;top:120px;z-index:900;padding:8px 12px;border-radius:8px;border:2px solid #7a5032;background:#fff2c9;font:700 14px "Noto Sans KR",sans-serif;cursor:pointer}
#nomWin{position:fixed;inset:60px 80px;z-index:901;background:#fffaf0;border:3px solid #5a3a22;border-radius:12px;display:grid;grid-template-columns:340px 1fr;font:14px "Noto Sans KR",sans-serif;color:#3b2a1e;box-shadow:0 10px 40px rgba(0,0,0,.4)}
#nomWin .l{border-right:2px solid #e3cfa6;padding:14px;overflow:auto}#nomWin .r{padding:14px;overflow:auto}
#nomWin h2{margin:0 0 8px;font-size:17px}#nomWin .card{border:1px solid #c9ab7a;border-radius:8px;padding:10px;margin-bottom:8px;cursor:pointer;background:#fff}
#nomWin .card.on{border:2px solid #b5452f;background:#fff2c9}#nomWin .card small{color:#8a735a}
#nomWin table{border-collapse:collapse;width:100%}#nomWin td,#nomWin th{border-bottom:1px solid #eadcc0;padding:6px 8px;text-align:left}
#nomWin tr.no td{color:#b0a08a}#nomWin tr.click:hover{background:#fff2c9;cursor:pointer}#nomWin .ok{color:#4f8a3c;font-weight:700}#nomWin .ng{color:#b5452f;font-weight:700}
#nomWin .party{margin:8px 0 12px;padding:8px;border:1px dashed #c9ab7a;border-radius:8px}#nomWin button{padding:6px 14px;border-radius:7px;border:1px solid #7a5032;background:#ffe8a8;font-weight:700;cursor:pointer}
#nomWin .x{position:absolute;right:12px;top:8px;background:none;border:none;font-size:20px}#nomWin .msg{margin-left:10px;color:#7a5032}`;
  function init(get) { getS = get; const st = document.createElement('style'); st.textContent = css; document.head.append(st);
    const b = document.createElement('button'); b.id = 'nomBtn'; b.textContent = '📜 지명 (시험)'; b.onclick = open; document.body.append(b); }
  function open() { const s = getS(); G.nomEnsure(s); if (!cur) cur = s.requests[0].id; if (!el) { el = document.createElement('div'); el.id = 'nomWin'; document.body.append(el); } el.hidden = false; draw(); }
  function close() { if (el) el.hidden = true; }
  function draw() {
    const s = getS(), R = s.requests, r = R.find(x => x.id === cur) || R[0];
    const st = { open: '지명 받는 중', queued: '다음 주 출발', active: '원정 중', done: '성공', failed: '실패' };
    let h = `<button class="x" title="닫기">✕</button><div class="l"><h2>지명 의뢰 (시험 3건)</h2>`;
    for (const x of R) h += `<div class="card ${x.id === r.id ? 'on' : ''}" data-r="${x.id}"><b>[${x.d.giver}] ${x.d.name}</b><br><small>${['토벌', '사냥·채집', '조사', '호위·구호', '탐사'][x.d.type]} · 인원 ${x.d.party[0]}~${x.d.party[1]}명 · 보상 ${x.d.reward}G<br>조건: ${x.d.req[0] < 0 ? '주력 능력치' : G.STATS[x.d.req[0]]} ${x.d.req[1]} 이상 · 상태: ${st[x.state]}</small></div>`;
    h += `<p style="font-size:12px;color:#8a735a">결정(2026-11-16): 파티 중 1명만 조건(★)을 채우면 됨 · 수락 = 전직 규칙(애착 단계 40/65/90/100% × 위험 0.8/1.0/1.1) · 보상은 게시판처럼 모험가 몫 · 대열은 항상 자동(직업 순)</p></div>`;
    const L = G.nomList(s, r.id), party = r.party.map(id => s.advs.find(a => a.id === id)).filter(Boolean);
    const P = r.state === 'open' && party.length ? G.questP(s, party.slice().sort((x, y) => G.NOM_CFG.rowOrder.indexOf(x.core) - G.NOM_CFG.rowOrder.indexOf(y.core)), r.q) : null;
    h += `<div class="r"><h2>${r.d.name} — 지명</h2><div class="party">파티 (${party.length}/${r.d.party[1]}, 자동 정렬): ${party.length ? party.slice().sort((x, y) => G.NOM_CFG.rowOrder.indexOf(x.core) - G.NOM_CFG.rowOrder.indexOf(y.core)).map(a => `${a.name}(${CLS[a.core]})`).join(' → ') : '비어 있음'}`;
    if (P != null) h += ` · 예상 성공률 <b>${Math.round(P * 100)}%</b> ${P >= 0.7 ? '안전' : P >= 0.4 ? '주의' : '위험'}`;
    h += `<br><button id="nomSend" ${r.state !== 'open' || party.length < r.d.party[0] || !G.nomMeets(s, r) ? 'disabled' : ''}>보내기 (다음 주 출발)</button>${r.state === 'open' && party.length && !G.nomMeets(s, r) ? ' <span class="ng">조건(★)을 채운 모험가가 1명 있어야 해요</span>' : ''}<span class="msg">${msg}</span></div>`;
    h += `<table><tr><th>이름</th><th>직업</th><th>등급</th><th>조건 능력치 (파티 중 1명 ★)</th><th>애착</th><th>수락</th><th>상태</th></tr>`;
    for (const x of L) {
      const state = x.inParty ? '<span class="ok">✔ 수락</span>' : x.busy ? x.busy : x.refusedUntil ? `<span class="ng">✖ 거절 (${x.refusedUntil - s.week}주)</span>` : !x.ok ? `조건 미달` : x.away ? '길드 밖 (부름 편지)' : '길드에 있음';
      const can = r.state === 'open' && (x.inParty || (x.ok && !x.refusedUntil));
      h += `<tr class="${can ? 'click' : 'no'}" data-a="${can ? x.id : ''}"><td>${x.name}</td><td>${CLS[x.core]}</td><td>${GR[x.grade]}</td><td>${x.meets ? '<span class="ok">★</span> ' : ''}${x.stat} / ${x.need}</td><td>${Math.round(x.attach)}</td><td>${x.ok ? x.chance + '%' : '—'}</td><td>${state}</td></tr>`;
    }
    h += `</table></div>`; el.innerHTML = h;
    el.querySelector('.x').onclick = close;
    el.querySelectorAll('.card').forEach(c => c.onclick = () => { cur = c.dataset.r; msg = ''; draw(); });
    el.querySelectorAll('tr[data-a]').forEach(tr => { if (!tr.dataset.a) return; tr.onclick = () => { const id = +tr.dataset.a || tr.dataset.a, a = s.advs.find(z => String(z.id) === String(id)); const res = G.nominate(s, r.id, a.id); msg = res.removed ? `${a.name}: 파티에서 뺌` : res.why ? `${a.name}: ${res.why}` : `${a.name}: ${res.ok ? '✔' : '✖'} "${res.line}"`; draw(); }; });
    const sb = el.querySelector('#nomSend'); if (sb) sb.onclick = () => { if (G.nomSend(s, r.id)) { msg = '다음 주 진행 때 게시판보다 먼저 출발합니다.'; draw(); } };
  }
  root.NominationTrial = { init, open, close };
})(this);
