// 책 연출 (2026-11-14) — 표지 펼치기 · 닫기, 장 넘기기(여러 장이면 촤르륵). 시험 페이지: 작업 공간 book_flip/
// 방식: CSS 3D. 넘어가는 장 = 지금 화면을 복제해 반쪽만 보이게 자른 판. 앞면 = 지금 쪽, 뒷면 = 새 장 쪽.
//   UI.open(장 바꾸기) → BookFX.flip(앞 장 번호, 새 장 번호, 그리기 함수)   /   책을 처음 열 때 → BookFX.openCover()
//   닫기(책끈 · Esc · 바깥 누르기) → BookFX.closeCover(실제 닫기)
// 끄기: window.BOOK_FX = false
(function (root) {
  'use strict';
  const PAPER = 'assets/ui/book/book_paper.png', COVER = 'assets/ui/book/book_cover.webp';
  const E = 'cubic-bezier(.45,.05,.35,1)', SH = 'rgba(40,22,8,';
  let busy = false;
  const on = () => root.BOOK_FX !== false && !(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const pop = () => document.getElementById('pop');
  const el = (cls, css) => { const d = document.createElement('div'); d.className = cls; if (css) d.style.cssText = css; return d; };

  // 지금 책 화면(쪽 내용 + 제목 + 문양)을 복제 — 스크롤 위치까지
  function snap() {
    const p = pop(), w = el('bfx-snap', 'position:absolute;left:0;top:0;width:1600px;height:879px;pointer-events:none');
    ['bookTitle', 'popBody', 'bookOrn'].forEach(id => {
      const o = document.getElementById(id); if (!o) return;
      const c = o.cloneNode(true); c.dataset.bfx = id;   // id는 그대로 둠 (책 CSS가 #popBody 등 id로 걸려 있음. 원본이 문서에서 먼저 나와 getElementById는 원본을 찾음) c.classList.add('bfx-' + id);
      w.appendChild(c); c._src = o;
    });
    return w;
  }
  function fixScroll(w) {   // 복제본 안의 스크롤 위치를 원본과 맞춤 (DOM에 붙인 뒤)
    w.querySelectorAll('[data-bfx]').forEach(c => { const o = c._src; if (!o) return;
      const A = [o, ...o.querySelectorAll('*')], B = [c, ...c.querySelectorAll('*')];
      for (let i = 0; i < A.length && i < B.length; i++) if (A[i].scrollTop) B[i].scrollTop = A[i].scrollTop; });
  }
  // 반쪽 판: side 'L' | 'R', content = snap() 결과 또는 null(빈 종이)
  function half(side, content) {
    const h = el('bfx-half', `position:absolute;top:0;left:0;width:800px;height:879px;overflow:hidden;backface-visibility:hidden;background:url(${PAPER}) ${side === 'L' ? '0' : '-800px'} 0/1600px 879px no-repeat`);
    if (content) { content.style.left = side === 'L' ? '0' : '-800px'; h.appendChild(content); }
    const sh = el('bfx-shade', 'position:absolute;inset:0;pointer-events:none;opacity:0'); h.appendChild(sh); h._shade = sh;
    return h;
  }

  // 장 넘기기
  async function flip(from, to, render) {
    if (!on() || busy || from < 0 || to < 0 || from === to || !pop() || !pop().classList.contains('book')) { render(); return; }
    busy = true;
    const p = pop(), fw = to > from, n = Math.min(Math.abs(to - from), 6), sg = fw ? -1 : 1;
    const T = n === 1 ? 450 : Math.max(300, 450 - n * 25), GAP = 80;
    const oldS = snap(); render(); const newS = snap();
    const layer = el('bfx-layer', 'position:absolute;left:0;top:0;width:1600px;height:879px;pointer-events:none;z-index:20;perspective:3200px');
    // 새 장이 아직 드러나면 안 되는 쪽은 옛 장으로 덮어 둠
    const keep = half(fw ? 'L' : 'R', oldS.cloneNode(true)); keep.style.left = fw ? '0' : '800px'; layer.appendChild(keep);
    // 드러나는 쪽 그림자
    const un = el('bfx-under', `position:absolute;top:0;left:${fw ? 800 : 0}px;width:800px;height:879px;background:linear-gradient(${fw ? 90 : 270}deg,${SH}.45),${SH}0) 60%)`);
    layer.appendChild(un);
    p.appendChild(layer); fixScroll(keep);
    const anims = [], leaves = [];
    un.animate([{ opacity: .9 }, { opacity: .9, offset: .6 }, { opacity: 0 }], { duration: T + GAP * (n - 1), easing: 'ease-out', fill: 'forwards' });
    for (let k = 0; k < n; k++) {
      const lf = el('bfx-leaf', `position:absolute;top:0;left:${fw ? 800 : 0}px;width:800px;height:879px;transform-style:preserve-3d;transform-origin:${fw ? '0' : '100%'} 50%;z-index:${30 - k}`);
      const front = half(fw ? 'R' : 'L', k === 0 ? oldS.cloneNode(true) : null);
      const back = half(fw ? 'L' : 'R', k === n - 1 ? newS.cloneNode(true) : null); back.style.transform = 'rotateY(180deg)';
      front._shade.style.background = `linear-gradient(${fw ? 90 : 270}deg,${SH}.05),${SH}.55))`;
      back._shade.style.background = `linear-gradient(${fw ? 270 : 90}deg,${SH}.05),${SH}.55))`;
      lf.append(front, back); layer.appendChild(lf); leaves.push(lf);
      if (k === 0) fixScroll(front);
      const delay = GAP * k, o = { duration: T, delay, easing: E, fill: 'both' };
      lf.animate([{ zIndex: 30 - k }, { zIndex: 30 - k, offset: .499 }, { zIndex: 40 + k, offset: .5 }, { zIndex: 40 + k }], o);   // 책등을 넘으면 반대편 더미 맨 위로
      anims.push(lf.animate([{ transform: 'rotateY(0deg)' }, { transform: `rotateY(${sg * 90}deg) translateZ(2px)`, offset: .5 }, { transform: `rotateY(${sg * 180}deg)` }], o).finished);
      front._shade.animate([{ opacity: 0 }, { opacity: .85, offset: .5 }, { opacity: .85 }], o);
      back._shade.animate([{ opacity: .85 }, { opacity: .85, offset: .5 }, { opacity: 0 }], o);
    }
    try { await Promise.all(anims); } catch (e) { }
    layer.remove(); busy = false;
  }

  // 표지: 닫힌 책(표지만 가운데) → 펼침
  function coverEl() {
    const c = el('bfx-cover', 'position:absolute;left:800px;top:0;width:800px;height:879px;transform-origin:0 50%;transform-style:preserve-3d;z-index:25;pointer-events:none');
    const f = el('bfx-cface', `position:absolute;left:0;top:-6px;width:810px;height:891px;backface-visibility:hidden;background:url(${COVER}) 0 0/100% 100% no-repeat;filter:drop-shadow(0 18px 24px rgba(20,10,4,.5))`);
    c.appendChild(f); return c;
  }
  async function openCover() {
    const p = pop(); if (!on() || busy || !p || !p.classList.contains('book')) return; busy = true;
    const T = 700, s = snap(), c = coverEl(), back = half('L', s);
    // 뒷면 = 왼쪽 쪽 (표지 판 안에서 제자리 뒤집기 → 표지가 -180° 돌면 왼쪽 쪽 자리에 바로 보임)
    const bw = el('bfx-cback', 'position:absolute;left:0;top:0;width:800px;height:879px;transform:rotateY(180deg);backface-visibility:hidden');
    bw.appendChild(back); c.appendChild(bw);
    const layer = el('bfx-layer', 'position:absolute;left:0;top:0;width:1600px;height:879px;pointer-events:none;z-index:20;perspective:3200px');
    layer.appendChild(c); p.appendChild(layer); fixScroll(back);
    p.classList.add('bfx-closed');
    const sx = -400 * 1.12;
    const a = c.animate([{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(-180deg)' }], { duration: T, easing: E, fill: 'forwards' });
    p.animate([{ translate: `${sx}px 0` }, { translate: '0 0' }], { duration: T, easing: E });
    p.animate([{ clipPath: 'inset(-40px -200px -40px 50%)' }, { clipPath: 'inset(-40px -200px -40px 50%)', offset: .5 }, { clipPath: 'inset(-40px -200px -40px -200px)', offset: .5001 }, { clipPath: 'inset(-40px -200px -40px -200px)' }], { duration: T });
    try { await a.finished; } catch (e) { }
    layer.remove(); p.classList.remove('bfx-closed'); busy = false;
  }
  async function closeCover(done) {
    const p = pop(); if (!on() || busy || !p || !p.classList.contains('book')) { done(); return; } busy = true;
    const T = 550, s = snap(), c = coverEl(), back = half('L', s);
    const bw = el('bfx-cback', 'position:absolute;left:0;top:0;width:800px;height:879px;transform:rotateY(180deg);backface-visibility:hidden');
    bw.appendChild(back); c.appendChild(bw);
    const layer = el('bfx-layer', 'position:absolute;left:0;top:0;width:1600px;height:879px;pointer-events:none;z-index:20;perspective:3200px');
    layer.appendChild(c); p.appendChild(layer); fixScroll(back);
    p.classList.add('bfx-closed');
    const sx = -400 * 1.12;
    const a = c.animate([{ transform: 'rotateY(-180deg)' }, { transform: 'rotateY(0deg)' }], { duration: T, easing: E, fill: 'forwards' });
    p.animate([{ translate: '0 0' }, { translate: `${sx}px 0` }], { duration: T, easing: E, fill: 'forwards' });
    p.animate([{ clipPath: 'inset(-40px -200px -40px -200px)' }, { clipPath: 'inset(-40px -200px -40px -200px)', offset: .5 }, { clipPath: 'inset(-40px -200px -40px 50%)', offset: .5001 }, { clipPath: 'inset(-40px -200px -40px 50%)' }], { duration: T, fill: 'forwards' });
    p.animate([{ opacity: 1 }, { opacity: 1, offset: .75 }, { opacity: 0 }], { duration: T + 120, fill: 'forwards' });
    try { await a.finished; await new Promise(r => setTimeout(r, 120)); } catch (e) { }
    done();
    layer.remove(); p.getAnimations().forEach(x => x.cancel()); p.classList.remove('bfx-closed'); busy = false;
  }
  root.BookFX = { flip, openCover, closeCover, get busy() { return busy; } };
})(window);
