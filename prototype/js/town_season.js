/* 마을 계절 · 시간대 · 날씨 (2026.11) — 설계: docs/design/town_time_season.md
   - 계절·날씨 판단과 시간대 색은 길드(LobbySky)와 같은 달력·같은 값을 씀 (달 → 계절, 주 → 시간대, 비는 일반 달 시작 10%)
   - 지면판: 1단계(개척촌)만 계절 판 4종(일반·가을·겨울·비), 2~5단계는 일반 판 그대로 두고 색·입자·흔들림만 입힘
   - 시간대 색은 지면판 + 건물 + 거주 모험가에 함께 곱함(Town.draw 가 따로 그린 세계 캔버스에 곱한 뒤 화면에 올림)
   - 입자(낙엽·눈·비·웅덩이 파문 40%), 식물 흔들림(3.5px), 강물 흐름: 직접 열기(file://)에서도 되도록 2D 캔버스만 사용
     → 흔들림은 town_data.js(미리 뽑은 표)로 칸 단위로 그림을 밀어 근사하고, 강물 반짝임은 작은 캔버스에 계산해 늘려서 얹음
   - 구름·새는 일반 배경(비 아님·가을·겨울 아님)의 아침·낮·노을에만 보이고 저녁에 서서히 사라짐 (SKYVIS) */
(function (root) {
  'use strict';
  const W = 1920, H = 1080, PK = 0.40, AMP = 3.5, SPD = 1.0;
  const SEAS = ['day', 'autumn', 'winter', 'rain'];
  const SK = { day: 1, autumn: 1, winter: .6, rain: 1.3 }, FK = { day: 1, autumn: 1, winter: .35, rain: 1.2 };   // 식물·강 계절 배율
  const SKYVIS = [1, 1, 1, 0];                                                                                    // 아침·낮·노을 보임, 저녁 숨김
  const rnd = (a, b) => a + Math.random() * (b - a);
  const sm = x => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
  const lerp = (a, b, f) => a + (b - a) * f;
  const cvs = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
  const LS = () => root.LobbySky;
  const D = () => root.TOWN_SKY_DATA;

  const S = { T: 0, key: 'day', from: null, xf: 0, tint: [1, 1, 1], lum: 1, vis: 1, world: null, pc: null, rc: null, rcx: null, rimg: null, lastKey: null };
  const Town = {};

  // ---------- 한 칸 값 잡음 (강 줄기용) ----------
  const hs = (x, y) => { x = (x * 123.34) % 1; y = (y * 456.21) % 1; if (x < 0) x += 1; if (y < 0) y += 1; const d = x * (x + 45.32) + y * (y + 45.32); x += d; y += d; const v = (x * y) % 1; return v < 0 ? v + 1 : v; };
  const vn = (x, y) => { const ix = Math.floor(x), iy = Math.floor(y); let fx = x - ix, fy = y - iy; fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
    return lerp(lerp(hs(ix, iy), hs(ix + 1, iy), fx), lerp(hs(ix, iy + 1), hs(ix + 1, iy + 1), fx), fy); };
  const ss = (a, b, x) => sm((x - a) / (b - a));

  // ---------- 시간대 ----------
  // 주 → 달 → 계절, 길드와 같은 규칙을 그대로 가져다 씀 (없으면 일반·낮)
  function calendar(s) {
    const L = LS(); if (!L) return { key: 'day', phase: 1, month: 6 };
    return L.forced || L.calendar(s);
  }
  function phaseState(p) { const L = LS(); return L && L.phase ? L.phase(p) : { t: [1, 1, 1], ll: 0, gk: 0 }; }
  function skyVis(p) { const w = Math.floor(p) % 4, f = p - Math.floor(p); return lerp(SKYVIS[(w + 3) % 4], SKYVIS[w], sm(f / 0.1333)); }

  // ---------- 입자 (시안 1280×720 좌표로 계산하고 1.5배로 그림) ----------
  const LEAF = ['#d9531e', '#e8a02b', '#b5381c', '#f0c24b', '#c9701f'];
  const PUD = [[270, 560, 26], [930, 600, 24], [640, 640, 30], [1100, 500, 18], [380, 330, 18]];
  let leaves = [], flakes = [], drops = [], ripples = [], nextRip = 0;
  function initParts() {
    leaves = []; flakes = []; drops = []; ripples = [];
    for (let i = 0; i < 92; i++) leaves.push({ x: rnd(0, 1280), y: rnd(-100, 720), vy: rnd(26, 50), ph: rnd(0, 6.3), sp: rnd(.8, 1.8), r: rnd(0, 6.3), vr: rnd(-2.2, 2.2), s: rnd(8, 14), c: LEAF[i % 5], k: i % 3 === 0 ? 1 : 0 });
    for (let i = 0; i < 190; i++) flakes.push({ x: rnd(0, 1280), y: rnd(-20, 720), vy: rnd(24, 58), ph: rnd(0, 6.3), sp: rnd(.6, 1.4), s: rnd(3.2, 7.2), r: rnd(0, 6.3), vr: rnd(-.9, .9), dot: false });
    for (let i = 0; i < 110; i++) flakes.push({ x: rnd(0, 1280), y: rnd(-20, 720), vy: rnd(40, 80), ph: rnd(0, 6.3), sp: rnd(.6, 1.6), s: rnd(1.1, 2.2), r: 0, vr: 0, dot: true });
    for (let i = 0; i < 460; i++) drops.push({ x: rnd(-100, 1380), y: rnd(-100, 720), v: rnd(620, 900), l: rnd(14, 24) });
  }
  function leafPath(c, s, maple) {
    c.beginPath();
    if (maple) { for (let i = 0; i <= 40; i++) { const a = i / 40 * 6.283, m = 1 + .17 * Math.sin(7 * a); c.lineTo(Math.cos(a) * s * 1.05 * m, Math.sin(a) * s * .72 * m); } c.closePath(); }
    else { c.moveTo(-s, 0); c.quadraticCurveTo(-s * .25, -s * .8, s, 0); c.quadraticCurveTo(-s * .25, s * .8, -s, 0); c.closePath(); }
  }
  function drawLeaf(px, l) {
    px.save(); px.translate(l.x, l.y); px.rotate(l.r); px.scale(1, .5 + .5 * Math.abs(Math.sin(l.r * .8 + l.ph)));
    leafPath(px, l.s, l.k); px.fillStyle = l.c; px.fill(); px.lineWidth = .8; px.strokeStyle = 'rgba(40,20,5,.45)'; px.stroke();
    px.beginPath(); px.moveTo(-l.s * 1.1, 0); px.lineTo(l.s * .8, 0); px.strokeStyle = 'rgba(255,240,200,.35)'; px.stroke(); px.restore();
  }
  function drawFlake(px, f) {
    px.save(); px.translate(f.x, f.y); px.rotate(f.r); const s = f.s;
    px.strokeStyle = 'rgba(235,246,255,.95)'; px.lineWidth = Math.max(1, s * .2); px.lineCap = 'round'; px.beginPath();
    for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3, ca = Math.cos(a), sa = Math.sin(a); px.moveTo(0, 0); px.lineTo(ca * s, sa * s);
      for (const q of [.45, .72]) { const bx = ca * s * q, by = sa * s * q, bl = s * (q < .5 ? .4 : .26); for (const sg of [-1, 1]) { const b = a + sg * Math.PI / 3; px.moveTo(bx, by); px.lineTo(bx + Math.cos(b) * bl, by + Math.sin(b) * bl); } } }
    px.stroke(); px.restore();
  }
  function drawParts(dt) {
    const px = S.pc.getContext('2d'); px.setTransform(1, 0, 0, 1, 0, 0); px.clearRect(0, 0, W, H);
    const k = S.key; if (k === 'day') return false;
    px.setTransform(1.5, 0, 0, 1.5, 0, 0);
    const T = S.T;
    if (k === 'autumn') { const nl = Math.round(leaves.length / 2 * PK); for (let i = 0; i < nl; i++) { const l = leaves[i]; l.y += l.vy * dt; l.x += Math.sin(T * l.sp + l.ph) * 28 * dt + 10 * dt; l.r += l.vr * dt; if (l.y > 740) { l.y = -20; l.x = rnd(0, 1280); } if (l.x > 1300) l.x = -20; drawLeaf(px, l); } }
    if (k === 'winter') { const ids = []; for (let q = 0; q < Math.round(95 * PK); q++) ids.push(q); for (let q = 0; q < Math.round(55 * PK); q++) ids.push(190 + q);
      for (const fi of ids) { const f = flakes[fi]; f.y += f.vy * dt; f.x += Math.sin(T * f.sp + f.ph) * 14 * dt + 4 * dt; f.r += f.vr * dt; if (f.y > 735) { f.y = -10; f.x = rnd(0, 1280); } if (f.x > 1290) f.x = -10;
        if (f.dot) { px.fillStyle = 'rgba(255,255,255,.8)'; px.beginPath(); px.arc(f.x, f.y, f.s, 0, 6.283); px.fill(); } else drawFlake(px, f); } }
    if (k === 'rain') {
      px.strokeStyle = 'rgba(205,220,240,.38)'; px.lineWidth = 1.2; px.beginPath(); const nd = Math.round(drops.length / 2 * PK);
      for (let i = 0; i < nd; i++) { const d = drops[i]; d.y += d.v * dt; d.x -= d.v * .16 * dt; if (d.y > 730 || d.x < -60) { d.y = rnd(-80, -10); d.x = rnd(0, 1400); } px.moveTo(d.x, d.y); px.lineTo(d.x + d.l * .16, d.y - d.l); }
      px.stroke();
      nextRip -= dt; if (nextRip <= 0) { nextRip = rnd(.12, .3) / Math.max(.2, PK * 2); const pd = PUD[Math.floor(Math.random() * PUD.length)]; ripples.push({ x: pd[0] + rnd(-pd[2] * .4, pd[2] * .4), y: pd[1] + rnd(-pd[2] * .2, pd[2] * .2), r: 0, m: pd[2] * .8, a: 1 }); }
      for (let i = ripples.length - 1; i >= 0; i--) { const r = ripples[i]; r.r += r.m * 1.1 * dt; r.a -= 1.3 * dt; if (r.a <= 0) { ripples.splice(i, 1); continue; } px.strokeStyle = 'rgba(225,238,250,' + (r.a * .7).toFixed(2) + ')'; px.lineWidth = 1; px.beginPath(); px.ellipse(r.x, r.y, r.r, r.r * .45, 0, 0, 6.283); px.stroke(); }
    }
    return true;
  }

  // ---------- 지면판: 식물 흔들림 + 강물 흐름 ----------
  // 판 한 장을 그리고, 흔들리는 칸만 조금 밀어서 다시 그림
  function drawPlateSway(g, img, key, still) {
    g.drawImage(img, 0, 0);
    const d = D(); if (!d || still) return;
    const T = S.T, A = AMP * (SK[key] || 1), m = 28;
    for (const [tx, ty, wp] of d.plants) {
      const wf = wp / 100, x = tx + 12, y = H - (ty + 12);
      const w1 = Math.sin(x * .011 + y * .006 - T * SPD * 1.5), w2 = Math.sin(x * .045 + y * .06 + T * SPD * 3.0), w3 = Math.sin(y * .03 + T * SPD * 2.1 + x * .01);
      const dx = wf * (w1 + .35 * w2) * A, dy = -wf * .3 * w3 * A * .5;
      g.drawImage(img, tx - 2 + dx, ty - 2 + dy, m, m, tx - 2, ty - 2, m, m);
    }
    const fl = FK[key] || 1, rm = 12;
    for (const [tx, ty, rv, ct] of d.river) {
      const r = rv / 100, c = ct / 100, x = tx + 4, y = ty + 4;
      const fdx = x < W * .5 ? .81 : -.81, fdy = .59, ndx = -fdy, ndy = fdx;
      const s = x * fdx + y * fdy, cc = x * ndx + y * ndy, spd = .35 + .9 * c;
      const wx = vn(s * .03 - T * spd * .25, cc * .06) - .5, wy = vn(s * .03 - T * spd * .2 + 5, cc * .06 + 3) - .5, k = 2.0 * r * fl * (.4 + .6 * c);
      const dx = (fdx * wx + ndx * wy) * k, dy = (fdy * wx + ndy * wy) * k;
      g.drawImage(img, tx - 2 + dx, ty - 2 + dy, rm, rm, tx - 2, ty - 2, rm, rm);
    }
    riverGlint(g, key);
  }
  // 강물 반짝임(길쭉하고 서서히 생겼다 사라지는 결)과 어두운 결: 8px 칸마다 계산해 작은 캔버스에 찍고 늘려서 얹음
  function riverGlint(g, key) {
    const d = D(), fl = FK[key] || 1, T = S.T; if (!d || fl <= 0) return;
    if (!S.rc) { S.rc = document.createElement('canvas'); S.rc.width = W / 8; S.rc.height = H / 8; S.rcx = S.rc.getContext('2d'); S.rimg = S.rcx.createImageData(W / 8, H / 8); }
    const im = S.rimg, a = im.data; a.fill(0); const w8 = W / 8;
    for (const [tx, ty, rv, ct] of d.river) {
      const r = rv / 100, c = ct / 100, x = tx + 4, y = ty + 4, fdx = x < W * .5 ? .81 : -.81, fdy = .59, ndx = -fdy, ndy = fdx;
      const s = x * fdx + y * fdy, cc = x * ndx + y * ndy, spd = .35 + .9 * c;
      const wq0 = s * .010 - T * spd * .22, wq1 = cc * .045, warp = vn(wq0 * 1.3 + T * .07, wq1 * 1.3 + 3.1) - .5, q0 = wq0 + warp * .9, q1 = wq1 + warp * .6;
      const n1 = vn(q0, q1 + T * .05), n2 = vn(s * .021 - T * spd * .31 + 7.3 + warp, cc * .09 + T * .08 + warp), life = .5 + .5 * Math.sin(T * .55 + vn(q0 * .7, q1 * .7) * 12.566);
      const strand = ss(.60, .82, n1 * .6 + n2 * .4) * life, hl = strand * r * fl * (.25 + .12 * c);
      const dk = ss(.66, .9, vn(s * .016 - T * spd * .15 + 11, cc * .06 + T * .04)) * r * fl * .09;
      const i = ((ty >> 3) * w8 + (tx >> 3)) * 4;
      if (hl >= dk) { a[i] = 217; a[i + 1] = 242; a[i + 2] = 255; a[i + 3] = Math.min(255, Math.round(hl * 255 * 1.9)); }
      else { a[i] = 13; a[i + 1] = 26; a[i + 2] = 31; a[i + 3] = Math.min(255, Math.round(dk * 255 * 1.9)); }
    }
    S.rcx.putImageData(im, 0, 0);
    g.save(); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(S.rc, 0, 0, W, H); g.restore();
  }

  // ---------- 바깥에서 쓰는 함수 ----------
  Town.prepare = function () { if (!S.world) { S.world = cvs(); S.wc = cvs(); S.pc = cvs(); S.sc = cvs(); S.sc2 = cvs(); initParts(); } return S; };
  // 이 단계·계절에 쓸 지면판 이름. 1단계만 계절 판이 있음
  Town.plateKey = function (stage, key, has) {
    if (stage === 0 && key !== 'day') { const k = 'town_plate20_' + key; if (has(k)) return k; }
    return 'town_plate' + (stage + 1);
  };
  // 시간 흐름: s = 게임 상태, wf = 이번 주 진행률(0~1), still = 움직임 줄이기
  Town.update = function (s, dt, wf, still) {
    Town.prepare(); if (still) dt = 0;
    S.T += dt;
    const cal = calendar(s), key = cal.key, p = cal.phase + (LS() && LS().forced ? 0.6 : (wf == null ? 0.5 : wf)), st = phaseState(p);
    if (S.key !== key) { S.from = S.key; S.xf = 0; S.key = key; initParts(); }
    if (S.from) { S.xf += dt / 4; if (S.xf >= 1) { S.from = null; S.xf = 0; } }          // 계절이 바뀔 때 약 4초 섞음
    S.tint = st.t.map(v => v * (key === 'rain' ? .9 : 1)); S.lum = .299 * S.tint[0] + .587 * S.tint[1] + .114 * S.tint[2];
    S.vis = key === 'day' ? skyVis(p) : 0; S.dt = dt; S.still = !!still;
  };
  Town.state = S;
  // 세계(지면판·건물·모험가)를 그릴 캔버스: 다 그린 뒤 tint() 로 시간대 색을 곱하고 worldImage() 를 화면에 올림
  Town.world = function () { const wg = S.world.getContext('2d'); wg.globalCompositeOperation = 'source-over'; wg.globalAlpha = 1; return wg; };
  // 판 그리기 (계절이 바뀌는 중이면 앞 판에서 섞음). getPlate(key) → 그림
  Town.drawPlate = function (wg, stage, getKey, getImg) {
    const key = S.key, img = getImg(getKey(stage, key));
    if (S.from) { const fi = getImg(getKey(stage, S.from)); if (fi && fi !== img) { drawPlateSway(wg, fi, S.from, S.still); wg.save(); wg.globalAlpha = sm(S.xf); const c2 = S.wc.getContext('2d'); c2.clearRect(0, 0, W, H); if (img) drawPlateSway(c2, img, key, S.still); wg.drawImage(S.wc, 0, 0); wg.restore(); return; } }
    if (img) drawPlateSway(wg, img, key, S.still);
  };
  Town.tint = function (wg) {
    const t = S.tint; wg.globalCompositeOperation = 'multiply'; wg.fillStyle = `rgb(${Math.round(t[0] * 255)},${Math.round(t[1] * 255)},${Math.round(t[2] * 255)})`; wg.fillRect(0, 0, W, H); wg.globalCompositeOperation = 'source-over';
  };
  Town.worldImage = () => S.world;
  // 입자: 시간대 밝기를 따라 어두워짐
  Town.drawFx = function (g) {
    if (!drawParts(S.dt || 0)) return;
    g.save(); try { g.filter = 'brightness(' + Math.max(.35, S.lum).toFixed(2) + ')'; } catch (e) { /* 미지원 */ } g.drawImage(S.pc, 0, 0); g.restore();
  };
  // 구름·새: drawFn(ctx) 가 그린 것에 시간대 색을 곱하고 보임 정도(vis)만큼 반투명으로 올림 (일반 배경의 아침~노을에만)
  Town.drawSky = function (g, drawFn) {
    if (S.vis <= .01) return false;
    const a = S.sc.getContext('2d'), b = S.sc2.getContext('2d'), t = S.tint;
    a.setTransform(1, 0, 0, 1, 0, 0); a.clearRect(0, 0, W, H); a.globalCompositeOperation = 'source-over'; a.globalAlpha = 1; drawFn(a);
    b.setTransform(1, 0, 0, 1, 0, 0); b.globalCompositeOperation = 'source-over'; b.globalAlpha = 1; b.clearRect(0, 0, W, H); b.drawImage(S.sc, 0, 0);
    b.globalCompositeOperation = 'multiply'; b.fillStyle = `rgb(${Math.round(t[0] * 255)},${Math.round(t[1] * 255)},${Math.round(t[2] * 255)})`; b.fillRect(0, 0, W, H);
    b.globalCompositeOperation = 'destination-in'; b.drawImage(S.sc, 0, 0); b.globalCompositeOperation = 'source-over';
    g.save(); g.globalAlpha = S.vis; g.drawImage(S.sc2, 0, 0); g.restore(); return true;
  };
  root.TownSeason = Town;
})(this);
