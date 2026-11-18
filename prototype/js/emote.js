/* 감정 아이콘 (2026-11-18 확정) — 얼굴 말풍선 + 표정 + 기호. 그림: assets/emote/ (GPT 생성 부품 · 사용자 제공)
   - 부품 배치: GPT 8종 원본에 겹쳐 맞춘 좌표 (단위 = 얼굴 가로). 조절 도구: tools/emote_tuner.html
   - 로비 위치 (사용자 확정 22:19): 모험가 중심(발과 머리의 가운데) 기준 좌우 +63 · 상하 −81 · 가로 62px, 그림 좌우 반전 · 명찰 뒤에 깔림
   - 움직임: 등장 톡 · 종류별 (얼굴 / 기호 따로) · 끝 0.35초 작아지며 흐려짐 — 시안 docs/design/mockups/talk_emote/emote_v11_*.gif [임시 값]
   Emote.draw(g, k, cx, cy, age, remain) → 캔버스 · Emote.html(k, W) → HTML (대화 극장) */
(function (root) {
  'use strict';
  const KINDS = ['win', 'sweat', 'note', 'heart', 'anger', 'smile', 'qex', 'spark'];
  const NAME = { win: '해냈다!', sweat: '식은땀', note: '신남', heart: '고마워', anger: '욱', smile: '헤헤', qex: '어?!', spark: '반짝' };
  const PARTS = { win: { e: [0.13, 0.291, 0.752], s: [0.879, -0.021, 0.173] }, sweat: { e: [0.109, 0.188, 0.758], s: [0.752, -0.024, 0.242] }, note: { e: [0.133, 0.312, 0.752], s: [0.739, -0.042, 0.379] }, heart: { e: [0.133, 0.376, 0.661], s: [0.721, -0.033, 0.376] }, anger: { e: [0.1, 0.239, 0.791], s: [0.782, -0.073, 0.345] }, smile: { e: [0.112, 0.321, 0.752], s: [0.727, -0.094, 0.336] }, qex: { e: [0.076, 0.155, 0.791], s: [0.803, -0.121, 0.321] }, spark: { e: [0.103, 0.17, 0.797], s: [0.779, -0.164, 0.364] } };
  const POS = { dx: 63, dy: -81, size: 62, mirror: true };   // 로비 (게임 화면 1920 기준 px)
  const FACE_H = 296 / 330;
  const E = { base: 'assets/emote/', KINDS, NAME, POS, PARTS };
  const cache = {};
  function img(n) {
    if (typeof Image === 'undefined') return null;
    const k = E.base + n; if (!cache[k]) { const im = new Image(); im.src = k + '.png'; cache[k] = im; } return cache[k];
  }
  const ok = im => im && im.complete && im.naturalWidth;
  E.preload = () => { for (const k of KINDS) { img('e_' + k); img('s_' + k); } img('face'); img('face_r'); };
  const wave = (t, p) => 0.5 - 0.5 * Math.cos(2 * Math.PI * ((t % p) / p));   // 0 → 1 → 0
  const lerp = (a, b, x) => a + (b - a) * Math.max(0, Math.min(1, x));
  // 종류별 움직임: f = 얼굴(표정 포함) { x, y, r, sx, sy } (얼굴 가로 비율) · s = 기호 { x, y, r, k(배율), a } (기호 가로 비율)
  function motion(k, t) {
    const f = { x: 0, y: 0, r: 0, sx: 1, sy: 1 }, s = { x: 0, y: 0, r: 0, k: 1, a: 1 };
    switch (k) {
      case 'win': { f.y = -0.04 * wave(t, 0.52) * FACE_H; const b = Math.sin(Math.PI * Math.min(1, (t % 0.52) / 0.52 / 0.8)); s.y = -0.18 * b * 2; s.r = 10 * b; break; }
      case 'sweat': { f.x = 0.015 * Math.sin(2 * Math.PI * t / 0.14); const p = (t % 1.1) / 1.1; s.y = (-0.1 + 0.55 * p * p) * 1.5; s.a = p < 0.15 ? p / 0.15 : p > 0.7 ? 1 - (p - 0.7) / 0.3 : 1; break; }
      case 'note': { f.r = 6 * Math.sin(2 * Math.PI * t / 0.8); const p = (t % 1.3) / 1.3; s.x = -0.15 + 0.3 * p; s.y = 0.25 - 0.55 * p; s.r = -10 + 22 * p; s.k = 0.7 + 0.35 * p; s.a = p < 0.25 ? p / 0.25 : 1 - (p - 0.25) / 0.75; break; }
      case 'heart': { const p = (t % 0.9) / 0.9; s.k = p < 0.14 ? lerp(1, 1.28, p / 0.14) : p < 0.28 ? lerp(1.28, 1, (p - 0.14) / 0.14) : p < 0.42 ? lerp(1, 1.2, (p - 0.28) / 0.14) : p < 0.6 ? lerp(1.2, 1, (p - 0.42) / 0.18) : 1; break; }
      case 'anger': { f.x = 0.018 * Math.sin(2 * Math.PI * t / 0.2); s.k = 0.8 + 0.42 * wave(t, 0.4); break; }
      case 'smile': { const b = wave(t, 0.7); f.sx = 1 + 0.08 * b; f.sy = 1 - 0.1 * b; s.k = 0.7 + 0.45 * wave(t, 0.7); s.r = 18 * wave(t, 0.7); break; }
      case 'qex': { s.k = t < 0.36 ? 0 : t < 0.55 ? lerp(0, 1.3, (t - 0.36) / 0.19) : t < 0.7 ? lerp(1.3, 1, (t - 0.55) / 0.15) : 1; f.y = t > 0.36 && t < 0.68 ? -0.06 * FACE_H * Math.sin(Math.PI * (t - 0.36) / 0.32) : 0; break; }
      case 'spark': { const b = wave(t, 0.8); s.k = 0.7 + 0.45 * b; s.r = 18 * b; f.y = -0.04 * FACE_H * wave(t, 0.8); break; }
    }
    return { f, s };
  }
  // (cx, cy) = 아이콘 가운데. age: 뜬 지 몇 초, remain: 사라질 때까지 남은 초
  E.draw = function (g, k, cx, cy, age, remain, opt) {
    const P = PARTS[k]; if (!P) return;
    const mir = (opt && opt.mirror != null) ? opt.mirror : POS.mirror, W = (opt && opt.size) || POS.size, H = W * FACE_H;
    const face = img(mir ? 'face' : 'face_r'), ex = img('e_' + k), sy = img('s_' + k); if (!ok(face) || !ok(ex) || !ok(sy)) return;
    const x0 = cx - W / 2, y0 = cy - H / 2, ox = x0 + W * (mir ? 0.04 : 0.96), oy = y0 + H * 0.96;   // 등장 기준점 = 꼬리 끝
    const a = Math.min(1, Math.max(0, age) / 0.18), kk = a >= 1 ? 1 : 1 + 1.7 * Math.pow(a - 1, 3) + 0.7 * Math.pow(a - 1, 2);
    const out = Math.max(0, Math.min(1, remain / 0.35)), sc = (0.5 + 0.5 * Math.max(0, Math.min(1.12, kk))) * (0.55 + 0.45 * out);
    const { f, s } = motion(k, Math.max(0, age));
    const bx = p => (mir ? 1 - p[0] - p[2] : p[0]) * W;
    g.save(); g.globalAlpha *= Math.min(1, a * 1.5, out); g.translate(ox, oy - (1 - out) * 0.06 * H); g.scale(sc, sc); g.translate(-ox, -oy);
    g.shadowColor = 'rgba(40,22,8,.35)'; g.shadowBlur = 4; g.shadowOffsetY = 2;
    // 얼굴 + 표정
    g.save(); const fx = x0 + W / 2, fy = y0 + H;   // 얼굴 기준점: 아래 가운데
    g.translate(fx + f.x * W, fy + f.y * W); g.rotate(f.r * Math.PI / 180); g.scale(f.sx, f.sy); g.translate(-fx, -fy);
    g.drawImage(face, x0, y0, W, H); g.shadowColor = 'transparent';
    const ew = P.e[2] * W; g.drawImage(ex, x0 + bx(P.e), y0 + P.e[1] * W, ew, ew * ex.naturalHeight / ex.naturalWidth);
    g.restore();
    // 기호
    if (s.k > 0.01) {
      const sw = P.s[2] * W, sh = sw * sy.naturalHeight / sy.naturalWidth, scx = x0 + bx(P.s) + sw / 2, scy = y0 + P.s[1] * W + sh / 2;
      g.save(); g.shadowColor = 'transparent'; g.globalAlpha *= Math.max(0, Math.min(1, s.a));
      g.translate(scx + s.x * sw, scy + s.y * sw); g.rotate(s.r * Math.PI / 180); g.scale(s.k, s.k); g.drawImage(sy, -sw / 2, -sh / 2, sw, sh); g.restore();
    }
    g.restore();
  };
  // HTML (대화 극장): 움직임 없이 한 장. mirror 기본 = 로비와 같음
  E.html = function (k, W, mirror) {
    const P = PARTS[k]; if (!P) return ''; const mir = mirror == null ? POS.mirror : mirror, H = W * FACE_H;
    const bx = p => (mir ? 1 - p[0] - p[2] : p[0]) * W, im = (n, l, t, w) => `<img src="${E.base}${n}.png" style="position:absolute;left:${l}px;top:${t}px;width:${w}px" alt="">`;
    return `<span style="position:relative;display:inline-block;width:${W}px;height:${H}px">${im(mir ? 'face' : 'face_r', 0, 0, W)}${im('e_' + k, bx(P.e), P.e[1] * W, P.e[2] * W)}${im('s_' + k, bx(P.s), P.s[1] * W, P.s[2] * W)}</span>`;
  };
  E.svg = (k) => E.html(k, 40);   // 예전 이름 (대화 극장 호환)
  root.Emote = E;
  if (typeof location !== 'undefined' && !/\/tools\//.test(location.pathname)) E.preload();   // 게임: 처음 뜰 때 빈칸 없게 미리 불러옴
})(typeof window !== 'undefined' ? window : globalThis);
