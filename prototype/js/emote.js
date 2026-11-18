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
  const SYM = { dx: -0.85, dy: 0, k: 1 };   // 2026-11-18 22:47 사용자 확정 (기호를 얼굴 반대편으로)
  // 기호별 추가 보정 + 기호 그림만 좌우 뒤집기 (사용자 22:53: 「?!」를 뺀 7종 모두 기호 반전 — 「?!」는 글자라 늘 바로 읽히게 둠)
  const SYMK = { win: { dx: 0, dy: 0, k: 1, flip: true }, sweat: { dx: 0, dy: 0, k: 1, flip: true }, note: { dx: 0, dy: 0, k: 1, flip: true }, heart: { dx: 0, dy: 0, k: 1, flip: true }, anger: { dx: 0, dy: 0, k: 1, flip: true }, smile: { dx: 0, dy: 0, k: 1, flip: true }, qex: { dx: 0, dy: 0, k: 1, flip: false }, spark: { dx: 0, dy: 0, k: 1, flip: true } };   // 기호 묶음 보정 (8종 모두 같이, 단위 = 얼굴 가로 · k = 크기 배율, 기호 가운데 기준) — tools/emote_tuner.html 에서 맞춤
  const FACE_H = 296 / 330;
  const E = { base: 'assets/emote/', KINDS, NAME, POS, PARTS, SYM, SYMK };
  function symBox(P, o, q) {   // 기호 상자 [x, y, w] (얼굴 가로 단위) = 원래 자리 + 묶음 보정 + 기호별 보정
    const Q = o || SYM, K = q || { dx: 0, dy: 0, k: 1 }, w = P.s[2] * Q.k * (K.k || 1), c = P.s[0] + P.s[2] / 2 + Q.dx + (K.dx || 0);
    return [c - w / 2, P.s[1] + Q.dy + (K.dy || 0) - (w - P.s[2]) / 2, w];
  }
  const symk = (k, opt) => (opt && opt.symk ? opt.symk[k] : SYMK[k]) || null;
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
    const face = img('face_r'), ex = img('e_' + k), sy = img('s_' + k); if (!ok(face) || !ok(ex) || !ok(sy)) return;
    const x0 = cx - W / 2, y0 = cy - H / 2, ox = x0 + W * 0.96, oy = y0 + H * 0.96;   // 등장 기준점 = 꼬리 끝
    const a = Math.min(1, Math.max(0, age) / 0.18), kk = a >= 1 ? 1 : 1 + 1.7 * Math.pow(a - 1, 3) + 0.7 * Math.pow(a - 1, 2);
    const out = Math.max(0, Math.min(1, remain / 0.35)), sc = (0.5 + 0.5 * Math.max(0, Math.min(1.12, kk))) * (0.55 + 0.45 * out);
    const { f, s } = motion(k, Math.max(0, age));
    const bx = p => p[0] * W;
    // 반전 (2026-11-18 고침): 원본 배치 그대로 그린 뒤 아이콘 전체를 거울처럼 뒤집음 (예전: 자리만 뒤집고 그림은 그대로 → 표정 · 기호가 원본과 달라 보였음)
    g.save(); if (mir) { g.translate(cx, 0); g.scale(-1, 1); g.translate(-cx, 0); }
    // 등장 = 물풍선 띠용 (2026-11-18 사용자 확정 "더 말랑하게"): 아래 가운데 기준으로 쑥 커지며 세로로 늘었다 가로로 퍼졌다 출렁이다 멈춤 [임시: 세기 45% · 2.3번/초 · 잦아듦 4.2]
    const ag = Math.max(0, age), gr = 1 - Math.pow(1 - Math.min(1, ag / 0.14), 3), wob = Math.exp(-ag * 4.2) * Math.sin(ag * 2 * Math.PI * 2.3);
    const so = 0.55 + 0.45 * out, jx = gr * (1 - 0.45 * wob) * so, jy = gr * (1 + 0.45 * wob) * so, bxo = x0 + W / 2, byo = y0 + H;
    g.globalAlpha *= Math.min(1, ag / 0.06, out); g.translate(bxo, byo - (1 - out) * 0.06 * H); g.scale(jx, jy); g.translate(-bxo, -byo);
    g.shadowColor = 'rgba(40,22,8,.35)'; g.shadowBlur = 4; g.shadowOffsetY = 2;
    // 얼굴 + 표정
    g.save(); const fx = x0 + W / 2, fy = y0 + H;   // 얼굴 기준점: 아래 가운데
    g.translate(fx + f.x * W, fy + f.y * W); g.rotate(f.r * Math.PI / 180); g.scale(f.sx, f.sy); g.translate(-fx, -fy);
    g.drawImage(face, x0, y0, W, H); g.shadowColor = 'transparent';
    const ew = P.e[2] * W; g.drawImage(ex, x0 + bx(P.e), y0 + P.e[1] * W, ew, ew * ex.naturalHeight / ex.naturalWidth);
    g.restore();
    // 기호
    if (s.k > 0.01) {
      const KQ = symk(k, opt), B = symBox(P, opt && opt.sym, KQ), sw = B[2] * W, sh = sw * sy.naturalHeight / sy.naturalWidth, scx = x0 + B[0] * W + sw / 2, scy = y0 + B[1] * W + sh / 2;
      g.save(); g.shadowColor = 'transparent'; g.globalAlpha *= Math.max(0, Math.min(1, s.a));
      g.translate(scx + s.x * sw, scy + s.y * sw); g.rotate(s.r * Math.PI / 180); g.scale(s.k, s.k); if (mir && k === 'qex') g.scale(-1, 1);   /* 「?!」 글자만은 뒤집지 않음 (거꾸로 읽히지 않게) */
      if (KQ && KQ.flip) g.scale(-1, 1);   /* 기호 그림만 좌우 뒤집기 (신남 · 헤헤 · 반짝) */
      g.drawImage(sy, -sw / 2, -sh / 2, sw, sh); g.restore();
    }
    g.restore();
  };
  // HTML (대화 극장): 움직임 없이 한 장. mirror 기본 = 로비와 같음
  E.html = function (k, W, mirror) {
    const P = PARTS[k]; if (!P) return ''; const mir = mirror == null ? POS.mirror : mirror, H = W * FACE_H;
    const im = (n, l, t, w, ex) => `<img src="${E.base}${n}.png" style="position:absolute;left:${l}px;top:${t}px;width:${w}px${ex || ''}" alt="">`;
    return `<span style="position:relative;display:inline-block;width:${W}px;height:${H}px${mir ? ';transform:scaleX(-1)' : ''}">${im('face_r', 0, 0, W)}${im('e_' + k, P.e[0] * W, P.e[1] * W, P.e[2] * W)}${(B => im('s_' + k, B[0] * W, B[1] * W, B[2] * W, ((mir && k === 'qex') !== !!(SYMK[k] && SYMK[k].flip)) ? ';transform:scaleX(-1)' : ''))(symBox(P, null, SYMK[k]))}</span>`;
  };
  E.svg = (k) => E.html(k, 40);   // 예전 이름 (대화 극장 호환)
  root.Emote = E;
  if (typeof location !== 'undefined' && !/\/tools\//.test(location.pathname)) E.preload();   // 게임: 처음 뜰 때 빈칸 없게 미리 불러옴
})(typeof window !== 'undefined' ? window : globalThis);
