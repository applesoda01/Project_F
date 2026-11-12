/* 길드 바깥 배경: 계절 · 시간대 · 날씨 (2026.11) — 설계: docs/design/guild_time_season.md
   - 계절·날씨별 바깥 그림 4종(일반·가을·겨울·비) + 건물 안은 원본 그대로(마스크) + 시간대 색·밝기 + 랜턴 불빛
   - 달 → 계절(3월 시작: 3~8 일반 / 9~11 가을 / 12~2 겨울), 주 → 시간대(아침·낮·노을·저녁), 비는 일반 달 시작에 10%
   - 식물 흔들림 · 낙엽/눈/비 입자 · 구름 · 별 · 유리 물방울
   - 직접 열기(file://)에서도 되도록 웹지엘·픽셀 읽기를 쓰지 않고 2D 캔버스만 사용 (흔들림은 타일 이동으로 근사)
   - 그림 좌표: 시안(1280×720) 좌표를 그대로 쓰고 SS 변환으로 화면(1920×1080)에 맞춤. 시안 그림은 방 크기 89% 로 맞춰 변환해 둠
   - 개발용: 주소 끝에 ?sky=autumn:2 (계절:주차 0~3) 를 붙이면 고정해서 볼 수 있음. 계절 = day·autumn·winter·rain */
(function (root) {
  'use strict';
  const A = root.Assets, W = 1920, H = 1080;
  const K = 0.8906283 * 1.5, OX = 104.892827, OY = 116.986242;   // 시안 좌표 → 화면 좌표 (x' = K·x + OX)
  const SEAS = ['day', 'autumn', 'winter', 'rain'];
  const TILE = 24, AMP = 3.5, SPD = 1.0, EMID = 0.5;               // 흔들림 확정값: 세기 3.5px · 속도 1.0 · 풀밭 0.5
  const PK = 0.40;                                                  // 입자 수 40%
  const CLOUD_N = 3, CLOUD_SPD = 8, STAR_K = 1.0, STAR_SZ = 0.5, STAR_ROT = 0.1;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const sm = x => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
  const lerp = (a, b, f) => a + (b - a) * f;
  const hash = n => { n = (n ^ 61) ^ (n >>> 16); n = n + (n << 3); n ^= n >>> 4; n = Math.imul(n, 0x27d4eb2d); return (n ^ (n >>> 15)) >>> 0; };
  const cvs = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };

  const S = { ready: false, inited: false, T: 0, lastT: null, key: null, from: null, xf: 0, door: -1, oc: null, oc2: null, parts: {}, lum: 1 };
  const D = () => root.SKY_DATA;
  const img = k => { const it = A.items[k]; return it && it.ok && it.img ? it.img : null; };

  // ---------- 시간대 ----------
  const EVE = [.46, .48, .74];
  const KEY = i => [
    { t: [.99, .95, .84], ll: 0, gk: 0 },     // 1주 아침
    { t: [1, 1, 1], ll: 0, gk: 0 },           // 2주 낮
    { t: [1, .74, .60], ll: .55, gk: .55 },   // 3주 노을
    { t: EVE, ll: 1, gk: 1 }][i];             // 4주 저녁
  // 시간대 전환 (2026.11 수정): 예전에는 주가 바뀐 직후 약 4초 동안만 섞어서 밝기·색이 '확' 바뀌었다.
  // 이제는 주의 경계 앞뒤로 RAMP 주(1배속 약 24초)에 걸쳐 천천히 섞는다. 길드와 마을이 이 함수를 같이 쓴다.
  const RAMP = 0.8;
  function phase(p) {
    const b = Math.round(p), d = p - b;                                   // b: 가장 가까운 주 경계, d: 경계로부터의 거리(주)
    const a = KEY(((b - 1) % 4 + 4) % 4), c = KEY(((b % 4) + 4) % 4), x = sm(Math.max(0, Math.min(1, (d + RAMP / 2) / RAMP)));
    return { t: [0, 1, 2].map(i => lerp(a.t[i], c.t[i], x)), ll: lerp(a.ll, c.ll, x), gk: lerp(a.gk, c.gk, x) };
  }
  // 주 → 달 → 계절·비
  function calendar(s) {
    const week = Math.max(0, s.week || 0), monthAbs = Math.floor(week / 4), mo = (2 + monthAbs) % 12 + 1;
    const season = mo >= 3 && mo <= 8 ? 'day' : mo >= 9 && mo <= 11 ? 'autumn' : 'winter';
    const rain = season === 'day' && hash(monthAbs * 7919 + 13) % 100 < 10;   // 달마다 정해져 있어서 다시 열어도 같음
    return { key: rain ? 'rain' : season, phase: week % 4, month: mo };
  }

  // ---------- 준비 ----------
  function prepare() {
    if (S.inited) return S.ready; S.inited = true;
    const need = ['sky_room', 'sky_cloud', 'iso_bg', 'iso_bg_open'].concat(SEAS.flatMap(k => ['sky_o_', 'sky_sk_', 'sky_lp_', 'sky_glw_'].map(p => p + k)));
    if (!root.SKY_DATA || need.some(k => !img(k))) { S.ready = false; return false; }
    S.oc = cvs(); S.oc2 = cvs(); S.cl = cvs(); S.sk = cvs(); S.pc = cvs(); S.tc = document.createElement('canvas'); S.lp = document.createElement('canvas');
    S.int = [0, 1].map(o => { const c = cvs(), x = c.getContext('2d'); x.drawImage(img(o ? 'iso_bg_open' : 'iso_bg'), 0, 0); x.globalCompositeOperation = 'destination-in'; x.drawImage(img('sky_room'), 0, 0); return c; });
    genStars(2800); S.ready = true; return true;
  }

  // ---------- 바깥 그림 한 장 만들기 (흔들림 → 시간대 색 → 랜턴 → 건물 안) ----------
  function renderOutdoor(c, k, st, door, sway) {
    const g = c.getContext('2d'), O = img('sky_o_' + k), T = S.T;
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.drawImage(O, 0, 0);
    if (sway) {
      const tiles = D().tiles[k], m = TILE + 4;
      for (const [tx, ty, wf, wm] of tiles) {
        const sx = (tx + TILE / 2 - OX) / K, sy = (ty + TILE / 2 - OY) / K;
        const w1 = Math.sin(sx * .011 + sy * .006 - T * SPD * 1.5), w2 = Math.sin(sx * .045 + sy * .06 + T * SPD * 3.0), w3 = Math.sin(sy * .03 + T * SPD * 2.1 + sx * .01);
        const dx = (wf * (w1 + .35 * w2) + wm * EMID * w1 * .28) * AMP * K, dy = wf * .3 * w3 * AMP * .5 * K;
        g.drawImage(O, tx - 2 + dx, ty - 2 + dy, m, m, tx - 2, ty - 2, m, m);
      }
    }
    const rainK = k === 'rain' ? .9 : 1, t = st.t.map(v => v * rainK);
    g.globalCompositeOperation = 'multiply'; g.fillStyle = `rgb(${Math.round(t[0] * 255)},${Math.round(t[1] * 255)},${Math.round(t[2] * 255)})`; g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = 'source-over';
    // 철제 랜턴: 노을부터 켜지는 그림 조각 (색은 시간대 색을 25%만 섞음)
    if (st.ll > 0.01) {
      const bb = D().lamp[k], lp = img('sky_lp_' + k), w = bb[2] - bb[0], h = bb[3] - bb[1], tc = S.lp; tc.width = w; tc.height = h;
      const x = tc.getContext('2d'); x.clearRect(0, 0, w, h); x.globalCompositeOperation = 'source-over'; x.drawImage(lp, 0, 0);
      x.globalCompositeOperation = 'multiply'; x.fillStyle = `rgb(${Math.round(lerp(1, t[0], .25) * 255)},${Math.round(lerp(1, t[1], .25) * 255)},${Math.round(lerp(1, t[2], .25) * 255)})`; x.fillRect(0, 0, w, h);
      x.globalCompositeOperation = 'destination-in'; x.drawImage(lp, 0, 0);
      g.globalAlpha = st.ll; g.drawImage(tc, bb[0], bb[1]); g.globalAlpha = 1;
      const gb = D().glow[k]; g.globalCompositeOperation = 'screen'; g.globalAlpha = Math.min(1, st.ll * st.gk); g.drawImage(img('sky_glw_' + k), gb[0], gb[1]); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    }
    g.drawImage(S.int[door], 0, 0);   // 건물 안은 원본 그대로 (색·흔들림 없음)
  }

  // ---------- 별 ----------
  let stars = [], flashes = [], nextFlash = 0;
  function genStars(n) {
    stars = []; let sd = 12345; const rn = () => { sd = (sd * 1664525 + 1013904223) % 4294967296; return sd / 4294967296; };
    for (let i = 0; i < n; i++) {
      const r = Math.sqrt(rn()) * 700, t = rn() * 6.2832, q = rn(), s = q < .80 ? .35 + rn() * .45 : q < .96 ? .8 + rn() * .6 : 1.4 + rn() * .8, c = rn(), col = c < .72 ? [255, 255, 255] : c < .88 ? [255, 236, 190] : [190, 215, 255];
      stars.push({ r, t, s, col, ph: rn() * 6.28, tw: .6 + rn() * 1.8, b: .45 + rn() * .55 });
    }
  }
  function inSky(k, x, y) { const X = K * x + OX, Y = K * y + OY; if (X < 0 || Y < 0 || X >= W || Y >= H) return false; const row = D().skyg[k][Math.floor(Y / 32)]; return !!row && row[Math.floor(X / 32)] === '1'; }
  function drawStars(k, alpha) {
    const c = S.sk.getContext('2d'); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, W, H);
    if (alpha <= .01) return;
    c.setTransform(K, 0, 0, K, OX, OY);
    const T = S.T, rot = T * STAR_ROT * 6.2832 / 60, n = Math.round(stars.length * STAR_K);
    if (T > nextFlash && n > 0) { nextFlash = T + (.22 + Math.random() * .4) / Math.max(.25, STAR_K); for (let q = 0; q < 25; q++) { const i = Math.floor(Math.random() * n), s = stars[i], a = s.t + rot, x = 640 + Math.cos(a) * s.r, y = 150 + Math.sin(a) * s.r; if (inSky(k, x, y)) { flashes.push({ i, t0: T, d: .9 + Math.random() * 1.2 }); break; } } }
    flashes = flashes.filter(f => T - f.t0 < f.d); const fl = {}; for (const f of flashes) { const u = (T - f.t0) / f.d; fl[f.i] = Math.pow(Math.sin(Math.PI * u), 2); }
    for (let i = 0; i < n; i++) {
      const s = stars[i], a = s.t + rot, x = 640 + Math.cos(a) * s.r, y = 150 + Math.sin(a) * s.r;
      if (y < -100 || y > 310 || x < -100 || x > 1380) continue;
      const pu = fl[i] || 0, tw = .78 + .22 * Math.sin(T * s.tw + s.ph), al = Math.min(1, alpha * s.b * tw * (1 + 1.2 * pu)), rad = s.s * STAR_SZ * (1 + 1.6 * pu) + pu * 1.1;
      c.fillStyle = `rgba(${s.col[0]},${s.col[1]},${s.col[2]},${al.toFixed(3)})`; c.beginPath(); c.arc(x, y, rad, 0, 6.2832); c.fill();
      if (rad > 1.5 || pu > .05) { c.fillStyle = `rgba(${s.col[0]},${s.col[1]},${s.col[2]},${(al * (.18 + .22 * pu)).toFixed(3)})`; c.beginPath(); c.arc(x, y, rad * (1.9 + .7 * pu), 0, 6.2832); c.fill(); }
    }
    c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'destination-in'; c.drawImage(img('sky_sk_' + k), 0, 0); c.globalCompositeOperation = 'source-over';
  }
  // ---------- 구름 ----------
  const CLOUDS = [{ y: 70, s: .50, v: 1.0, x: 150, f: 0, a: 1 }, { y: 150, s: .34, v: .6, x: 700, f: 1, a: .9 }, { y: 40, s: .40, v: .8, x: 1050, f: 1, a: .95 }, { y: 118, s: .62, v: 1.25, x: -120, f: 0, a: 1 }, { y: 12, s: .28, v: .5, x: 420, f: 0, a: .85 }, { y: 185, s: .45, v: .9, x: 880, f: 0, a: .9 }];
  const CTINT = { day: [255, 255, 255], autumn: [255, 232, 205], winter: [222, 232, 248], rain: [118, 126, 140] };
  function drawClouds(k, tint, dt) {
    const c = S.cl.getContext('2d'); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, W, H);
    const ci = img('sky_cloud'), tc = S.tc, tx = tc.getContext('2d'), cw = ci.width, ch = ci.height, base = CTINT[k] || CTINT.day;
    tc.width = cw; tc.height = ch; tx.clearRect(0, 0, cw, ch); tx.drawImage(ci, 0, 0);
    tx.globalCompositeOperation = 'multiply'; tx.fillStyle = `rgb(${Math.round(base[0] * tint[0])},${Math.round(base[1] * tint[1])},${Math.round(base[2] * tint[2])})`; tx.fillRect(0, 0, cw, ch);
    tx.globalCompositeOperation = 'destination-in'; tx.drawImage(ci, 0, 0); tx.globalCompositeOperation = 'source-over';
    c.setTransform(K, 0, 0, K, OX, OY);
    for (let i = 0; i < CLOUD_N && i < CLOUDS.length; i++) {
      const o = CLOUDS[i]; o.x += CLOUD_SPD * o.v * dt; const w = cw * o.s, hh = ch * o.s; if (o.x > 1400) o.x = -w - 120;
      c.save(); c.globalAlpha = o.a * (k === 'rain' ? .96 : .93); c.translate(o.x + w / 2, o.y + hh / 2); if (o.f) c.scale(-1, 1); c.drawImage(tc, -w / 2, -hh / 2, w, hh); c.restore();
    }
    c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'destination-in'; c.drawImage(img('sky_sk_' + k), 0, 0); c.globalCompositeOperation = 'source-over';
  }

  // ---------- 입자 ----------
  const PUD = [[216, 369, 21], [1151, 571, 10], [193, 621, 14], [1014, 639, 12], [887, 642, 10], [379, 690, 12], [971, 698, 18]];
  const BPOLY = [[640, 13], [1196, 252], [1198, 439], [864, 598], [852, 594], [826, 604], [825, 607], [836, 617], [721, 676], [716, 670], [699, 665], [675, 678], [647, 693], [621, 707], [618, 709], [79, 436], [83, 245]];
  const LEAF = { day: ['#4f9a3a', '#6bb347', '#3f8530', '#86c24f', '#5aa13f'], autumn: ['#d9531e', '#e8a02b', '#b5381c', '#f0c24b', '#c9701f'] };
  const XL = -100, XR = 1400, YT = -100, YB = 740;   // 화면 전체가 덮이도록 시안 좌표에서 넓힌 범위
  let P = { leaves: [], flakes: [], drops: [], ripples: [], beads: [], nextRip: 0, nextBead: 1 };
  function initParts(k) {
    P = { leaves: [], flakes: [], drops: [], ripples: [], beads: [], nextRip: 0, nextBead: rnd(.8, 2) };
    const pal = LEAF[k] || LEAF.autumn;
    for (let i = 0; i < (k === 'day' ? 68 : 92); i++) P.leaves.push({ x: rnd(XL, XR), y: rnd(YT, 720), vy: rnd(26, 50), ph: rnd(0, 6.3), sp: rnd(.8, 1.8), r: rnd(0, 6.3), vr: rnd(-2.2, 2.2), s: rnd(8, 14), c: pal[i % 5], k: (k === 'autumn' && i % 3 === 0) ? 1 : 0 });
    for (let i = 0; i < 190; i++) P.flakes.push({ x: rnd(XL, XR), y: rnd(YT, 720), vy: rnd(24, 58), ph: rnd(0, 6.3), sp: rnd(.6, 1.4), s: rnd(3.2, 7.2), r: rnd(0, 6.3), vr: rnd(-.9, .9), dot: false });
    for (let i = 0; i < 110; i++) P.flakes.push({ x: rnd(XL, XR), y: rnd(YT, 720), vy: rnd(40, 80), ph: rnd(0, 6.3), sp: rnd(.6, 1.6), s: rnd(1.1, 2.2), r: 0, vr: 0, dot: true });
    for (let i = 0; i < 460; i++) P.drops.push({ x: rnd(-200, 1500), y: rnd(YT, 720), v: rnd(620, 900), l: rnd(14, 24) });
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
  function inBld(x, y, m) {
    const test = (X, Y) => { let c = false; for (let i = 0, j = BPOLY.length - 1; i < BPOLY.length; j = i++) { const [xi, yi] = BPOLY[i], [xj, yj] = BPOLY[j]; if ((yi > Y) != (yj > Y) && X < (xj - xi) * (Y - yi) / (yj - yi) + xi) c = !c; } return c; };
    if (test(x, y)) return true; if (m > 0) for (const [dx, dy] of [[m, 0], [-m, 0], [0, m], [0, -m]]) if (test(x + dx, y + dy)) return true; return false;
  }
  function blobPts(asp, elong, tear, tilt, sc) {
    const a2 = rnd(.04, .13), a3 = rnd(.03, .1), a4 = rnd(0, .05), p2 = rnd(0, 6.3), p3 = rnd(0, 6.3), p4 = rnd(0, 6.3), pts = [];
    for (let i = 0; i < 48; i++) { const t = i / 48 * 6.2832, rho = 1 + a2 * Math.cos(2 * t + p2) + a3 * Math.cos(3 * t + p3) + a4 * Math.cos(4 * t + p4); let x = Math.cos(t) * rho * asp, y = Math.sin(t) * rho * elong;
      const s = Math.sin(t); if (s < 0) x *= 1 - tear * (-s) * 1.6; else x *= 1 + tear * .5 * s;
      const c = Math.cos(tilt), sn = Math.sin(tilt); pts.push([(x * c - y * sn) * sc, (x * sn + y * c) * sc]); }
    return pts;
  }
  const ptsPath = (pts, ox, oy) => { const p = new Path2D(); pts.forEach((q, i) => i ? p.lineTo(q[0] + ox, q[1] + oy) : p.moveTo(q[0] + ox, q[1] + oy)); p.closePath(); return p; };
  function spawnBead() {
    for (let k = 0; k < 30; k++) {
      const big = Math.random() < .3, r = big ? rnd(14, 24) : rnd(4, 10), x = rnd(-60, 1340), y = rnd(-70, 712);
      if (inBld(x, y, r * 1.6 + 4)) continue;
      if (P.beads.some(q => Math.hypot(q.x - x, q.y - y) < (q.r + r) * 1.9 + 8)) continue;
      const slide = big && Math.random() < .5, asp = rnd(.6, 1.1), elong = slide ? rnd(1.05, 1.4) : rnd(.85, 1.15), tear = Math.random() < .4 ? rnd(.1, .32) : 0, tilt = rnd(-.45, .45);
      const path = new Path2D(); path.addPath(ptsPath(blobPts(asp, elong, tear, tilt, 1), 0, 0));
      if (slide && Math.random() < .5) { const ang = rnd(0, 6.3), s2 = rnd(.4, .6), d = 1 + s2 * .8; path.addPath(ptsPath(blobPts(rnd(.8, 1.05), rnd(.9, 1.1), 0, rnd(-.4, .4), s2), Math.cos(ang) * d * asp, Math.sin(ang) * d * elong)); }
      P.beads.push({ x, y, y0: y, r, age: 0, hold: rnd(3, 8), slide, vy: 0, fade: 1.4, path, asp, elong, tilt }); return;
    }
  }
  function drawBeads(px, dt, src) { // 유리 물방울: 뒤 풍경이 뒤집혀 비침 (건물 안은 가림 없음)
    P.nextBead -= dt; if (P.nextBead <= 0) { P.nextBead = rnd(.35, 1.1) / PK; if (P.beads.length < Math.round(30 * PK)) spawnBead(); }
    for (let i = P.beads.length - 1; i >= 0; i--) {
      const b = P.beads[i]; b.age += dt; const grow = Math.min(1, b.age / .6); let al = grow;
      if (b.age > b.hold) { const u = b.age - b.hold; if (b.slide) { b.vy = Math.min(120, b.vy + 100 * dt); b.y += b.vy * dt; al = Math.max(0, 1 - Math.max(0, u - 1.2) / 1.0); } else al = Math.max(0, 1 - u / b.fade); if (al <= 0) { P.beads.splice(i, 1); continue; } }
      const r = b.r * (.5 + .5 * grow);
      if (b.slide && b.y > b.y0 + 2) { const g2 = px.createLinearGradient(0, b.y0, 0, b.y); g2.addColorStop(0, 'rgba(215,230,245,0)'); g2.addColorStop(1, 'rgba(215,230,245,' + (.28 * al).toFixed(2) + ')'); px.fillStyle = g2; px.fillRect(b.x - Math.max(1, r * .3), b.y0, Math.max(2, r * .6), b.y - b.y0); }
      const sc = r * (.5 + .5 * grow) / r;
      px.save(); px.globalAlpha = al; px.translate(b.x, b.y); px.scale(r * sc, r * sc); const lw = 1 / (r * sc);
      px.save(); px.translate(.12, .16); px.fillStyle = 'rgba(0,0,0,.14)'; px.fill(b.path); px.restore();
      px.save(); px.clip(b.path);
      const Sz = r * sc * 3.4, sx = OX + K * (b.x - Sz / 2), sy = OY + K * (b.y - Sz / 2), SS = K * Sz;
      px.scale(-1, -1); px.filter = 'contrast(1.55) saturate(1.25) brightness(.95)';
      try { px.drawImage(src, Math.max(0, Math.min(W - SS, sx)), Math.max(0, Math.min(H - SS, sy)), SS, SS, -1.3, -1.3, 2.6, 2.6); } catch (e) { /* 일부 환경에서 그림 읽기가 막히면 굴절 없이 그림 */ }
      px.filter = 'none'; px.scale(-1, -1);
      const gr = px.createLinearGradient(0, -1.2, 0, 1.2); gr.addColorStop(0, 'rgba(8,16,28,.55)'); gr.addColorStop(.35, 'rgba(8,16,28,.12)'); gr.addColorStop(.7, 'rgba(255,255,255,.10)'); gr.addColorStop(1, 'rgba(240,248,255,.62)');
      px.fillStyle = gr; px.fillRect(-2, -2, 4, 4); px.restore();
      const rg = px.createLinearGradient(-1, -1, 1, 1); rg.addColorStop(0, 'rgba(8,16,28,.9)'); rg.addColorStop(.5, 'rgba(30,45,60,.55)'); rg.addColorStop(1, 'rgba(240,248,255,.85)');
      px.lineWidth = Math.max(1.2, r * sc * .14) * lw; px.strokeStyle = rg; px.stroke(b.path);
      if (r > 5) { px.beginPath(); px.ellipse(-.36 * b.asp, -.44 * b.elong, .24 * b.asp, .14, -.6, 0, 6.283); px.fillStyle = 'rgba(255,255,255,.95)'; px.fill();
        if (r > 11) { px.beginPath(); px.ellipse(.3 * b.asp, .58 * b.elong, .26 * b.asp, .09, .4, 0, 6.283); px.fillStyle = 'rgba(255,255,255,.5)'; px.fill(); px.beginPath(); px.arc(.45 * b.asp, .3, Math.max(1.2, r * sc * .06) * lw, 0, 6.283); px.fillStyle = 'rgba(255,255,255,.8)'; px.fill(); } }
      px.restore();
    }
  }
  function drawParts(k, dt, src) {
    const px = S.pc.getContext('2d'); px.setTransform(1, 0, 0, 1, 0, 0); px.clearRect(0, 0, W, H);
    px.save(); px.setTransform(K, 0, 0, K, OX, OY);
    px.beginPath(); px.rect(-300, -300, 2000, 1300); px.moveTo(BPOLY[0][0], BPOLY[0][1]); for (const q of BPOLY) px.lineTo(q[0], q[1]); px.closePath(); px.clip('evenodd');   // 건물 안에는 그리지 않음
    const T = S.T;
    if (k === 'autumn' || k === 'day') { const nl = Math.round(P.leaves.length / 2 * PK); for (let li = 0; li < nl; li++) { const l = P.leaves[li]; l.y += l.vy * dt; l.x += Math.sin(T * l.sp + l.ph) * 28 * dt + 10 * dt; l.r += l.vr * dt; if (l.y > YB) { l.y = YT; l.x = rnd(XL, XR); } if (l.x > XR) l.x = XL; drawLeaf(px, l); } }
    if (k === 'winter') { const ids = []; for (let q = 0; q < Math.round(95 * PK); q++) ids.push(q); for (let q = 0; q < Math.round(55 * PK); q++) ids.push(190 + q);
      for (const fi of ids) { const f = P.flakes[fi]; f.y += f.vy * dt; f.x += Math.sin(T * f.sp + f.ph) * 14 * dt + 4 * dt; f.r += f.vr * dt; if (f.y > YB) { f.y = YT; f.x = rnd(XL, XR); } if (f.x > XR) f.x = XL;
        if (f.dot) { px.fillStyle = 'rgba(255,255,255,.8)'; px.beginPath(); px.arc(f.x, f.y, f.s, 0, 6.283); px.fill(); } else drawFlake(px, f); } }
    if (k === 'rain') {
      px.strokeStyle = 'rgba(205,220,240,.38)'; px.lineWidth = 1.2; px.beginPath(); const nd = Math.round(P.drops.length / 2 * PK);
      for (let di = 0; di < nd; di++) { const d = P.drops[di]; d.y += d.v * dt; d.x -= d.v * .16 * dt; if (d.y > YB || d.x < -260) { d.y = rnd(-180, -10); d.x = rnd(-100, 1600); } px.moveTo(d.x, d.y); px.lineTo(d.x + d.l * .16, d.y - d.l); }
      px.stroke();
      P.nextRip -= dt; if (P.nextRip <= 0) { P.nextRip = rnd(.12, .3); const pd = PUD[Math.floor(Math.random() * PUD.length)]; P.ripples.push({ x: pd[0] + rnd(-pd[2] * .4, pd[2] * .4), y: pd[1] + rnd(-pd[2] * .2, pd[2] * .2), r: 0, m: pd[2] * .8, a: 1 }); }
      for (let i = P.ripples.length - 1; i >= 0; i--) { const r = P.ripples[i]; r.r += r.m * 1.1 * dt; r.a -= 1.3 * dt; if (r.a <= 0) { P.ripples.splice(i, 1); continue; } px.strokeStyle = 'rgba(225,238,250,' + (r.a * .7).toFixed(2) + ')'; px.lineWidth = 1; px.beginPath(); px.ellipse(r.x, r.y, r.r, r.r * .45, 0, 0, 6.283); px.stroke(); }
      drawBeads(px, dt, src);
    }
    px.restore();
  }

  // ---------- 그리기 ----------
  const forced = (() => { const m = /[?&]sky=(day|autumn|winter|rain)(?::(\d))?/.exec(location.search); return m ? { key: m[1], phase: m[2] != null ? +m[2] : 1 } : null; })();
  const Sky = { ready: () => S.ready, forced, state: S, calendar, phase };   // calendar·phase 는 마을(town_season.js)도 같은 달력으로 씀
  // s: 게임 상태, t: 경과 초, opt: { weekFrac(0~1), still, door }
  Sky.draw = function (g, s, t, opt) {
    if (!prepare()) return false;
    opt = opt || {};
    let dt = S.lastT == null ? 0 : Math.min(.1, Math.max(0, t - S.lastT)); S.lastT = t; if (opt.still) dt = 0;
    S.T += dt;
    const cal = forced || calendar(s), key = cal.key, door = s.grade >= 1 ? 1 : 0;
    const wf = forced ? 0.6 : (opt.weekFrac == null ? 0.5 : opt.weekFrac), st = phase(cal.phase + wf), sway = !opt.still;
    if (S.key !== key) { if (S.key) { S.from = S.key; S.xf = 0; } S.key = key; initParts(key); }
    if (S.from) { S.xf += dt / 4; if (S.xf >= 1) { S.from = null; S.xf = 0; } }   // 계절이 바뀔 때 약 4초 섞음
    const tint = st.t.map(v => v * (key === 'rain' ? .9 : 1)); S.lum = .299 * tint[0] + .587 * tint[1] + .114 * tint[2];
    renderOutdoor(S.oc, key, st, door, sway);
    if (S.from) { renderOutdoor(S.oc2, S.from, st, door, sway); g.drawImage(S.oc2, 0, 0); g.save(); g.globalAlpha = sm(S.xf); g.drawImage(S.oc, 0, 0); g.restore(); }
    else g.drawImage(S.oc, 0, 0);
    // 하늘·입자 (구름과 별은 하늘 영역에만, 입자는 건물 밖에만)
    drawClouds(key, tint, dt);
    const starA = key === 'rain' ? Math.max(0, (st.gk - .4) / .6) * .35 : Math.max(0, (st.gk - .4) / .6);
    drawStars(key, starA);
    drawParts(key, dt, S.oc);
    g.drawImage(S.cl, 0, 0); g.drawImage(S.sk, 0, 0);
    g.save(); try { g.filter = 'brightness(' + Math.max(.35, S.lum).toFixed(2) + ')'; } catch (e) { /* 미지원 */ } g.drawImage(S.pc, 0, 0); g.restore();
    return true;
  };
  root.LobbySky = Sky;
})(this);
