/* 마을 화면 (프로토타입 v0.1)
   - 쿼터뷰 16×16 격자 위에 건물 스프라이트를 슬롯 좌표로 배치한다. (data/town_slots.csv 와 같은 값)
   - 단계(0~4)는 인구로 정해지고, 특별 퀘스트 건물은 개발 패널의 해금 스위치로 켠다. (특별 퀘스트는 아직 규칙에 없음)
   - 마우스를 올리면 발자국과 이름, 클릭하면 정보 카드. 거주 모험가가 길을 오가고 소문 말풍선이 뜬다.
   - 투영: 타일 100×58 × 0.944, (0,0) 꼭짓점 = 화면 (960,185). 앵커 = 앞 꼭짓점(gx+w, gy+d), 스프라이트 하단 중앙. 깊이 = gx+w+gy+d */
(function (root) {
  'use strict';
  // 20×20 격자 · 4×4 구역 9개(길 폭 2칸) · 타일은 기존의 90% (2026-10-28 확정)
  const N = 20, S = 0.9, K = 0.944 * S, HX = 50 * K, HY = 29 * K, OX = 960, OY = 70;
  const px = (gx, gy) => OX + (gx - gy) * HX;
  const py = (gx, gy) => OY + (gx + gy) * HY;
  const STAGE_NAMES = ['개척촌', '마을', '읍', '도시', '성채 도시'];

  // id, 이름, gx, gy, w, d, 등장 단계, 해금 조건, 특별(퀘스트 필요), 그림 크기(w,h), 교체 대상
  const B = [
    ['guild', '길드 본관', 9, 9, 2, 2, 0, '항상', 0, 240, 269],
    ['castle', '영주의 성', 2, 2, 4, 4, 0, '항상 (단계에 따라 성장)', 0, 360, 297],
    ['inn', '여관', 8, 14, 2, 2, 0, '개척촌', 0, 205, 181],
    ['potion', '물약 상점', 14, 14, 2, 2, 1, '마을 단계', 0, 205, 183],
    ['smith', '대장간', 16, 14, 2, 2, 1, '마을 단계 (장비 제작·판매 통합)', 0, 205, 163],
    ['church', '성당', 8, 2, 2, 2, 0, '특별 퀘스트(D) 주교 구출', 1, 205, 291],
    ['cathedral', '대성당', 8, 2, 2, 2, 3, '성당 + 도시 단계 + 2번째 특별 퀘스트(A)', 1, 215, 220, 'church'],
    ['magic', '마법 학원', 2, 8, 2, 2, 1, '특별 퀘스트(C) 폭주 실험체', 1, 205, 212],
    ['tower', '마탑', 2, 8, 2, 2, 3, '마법 학원 + 도시 단계 + 2번째 특별 퀘스트(A)', 1, 150, 373, 'magic'],
    ['observ', '천문대', 2, 10, 2, 2, 2, '특별 퀘스트(B) 별이 떨어진 자리', 1, 205, 213],
    ['theater', '극장', 10, 2, 2, 2, 2, '특별 퀘스트(B) 저주받은 가희', 1, 205, 189],
    ['library', '대도서관', 4, 8, 2, 2, 2, '탐사 특별 퀘스트로 발견 (전설)', 1, 205, 163],
    ['arena', '투기장', 2, 14, 2, 2, 1, '특별 퀘스트(C) 떠돌이 검투사단', 1, 215, 162],
    ['dojo', '수련원', 4, 14, 2, 2, 1, '특별 퀘스트(C) 산중의 노사부', 1, 205, 158],
    ['hunter', '사냥꾼 조합', 2, 16, 2, 2, 0, '특별 퀘스트(D) 거대 짐승 사냥', 1, 205, 162],
    ['alchemy', '연금 공방', 14, 14, 2, 2, 2, '특별 퀘스트(B) 연금술사의 유산 (물약 상점 교체)', 1, 205, 183, 'potion'],
    ['watch', '망루', 19, 9, 1, 1, 0, '특별 퀘스트(D) 산적 두목 추적', 1, 100, 249],
].map(r => ({ id: r[0], name: r[1], gx: r[2], gy: r[3], w: r[4], d: r[5], st: r[6], req: r[7], special: !!r[8], sw: r[9], sh: r[10], replaces: r[11] || null }));
  // 배치 툴(tools/town_editor.html)이 내보낸 js/town_layout.js 가 있으면 위치·크기를 덮어씀
  const LAY = root.TOWN_LAYOUT || {};
  for (const b of B) { const o = LAY[b.id]; b.sc = 1; if (o) { b.gx = o.gx; b.gy = o.gy; b.w = o.w; b.d = o.d; b.sc = o.sc || 1; } }
  // 다리 (지면판에는 없음): 왼쪽은 1단계부터, 오른쪽은 2단계(마을)부터. 재질: 1단계 통나무 / 2~3단계 보강 목재 / 4~5단계 석조
  // gx,gy,w,d = 다리가 놓이는 칸(왼쪽은 +gy 방향, 오른쪽은 +gx 방향으로 강을 건넘). 배치 툴로 위치·크기 조정 가능
  const BR = [
    { id: 'bridgeL', name: '왼쪽 다리', gx: 9, gy: 23, w: 2, d: 4, sc: 1, st: 0, flip: false },
    { id: 'bridgeR', name: '오른쪽 다리', gx: 22, gy: 8, w: 4, d: 2, sc: 1, st: 1, flip: true },
  ];
  for (const b of BR) { const o = LAY[b.id]; if (o) { b.gx = o.gx; b.gy = o.gy; b.w = o.w; b.d = o.d; b.sc = o.sc || 1; } }
  const bridgeMat = st => st <= 0 ? 1 : st <= 2 ? 2 : 3;
  const CASTLE_H = [[360, 297], [360, 308], [370, 317], [370, 317], [370, 314]];
  const RUMOR = [[7, 5], [5, 7], [7, 11], [11, 7], [13, 5], [5, 13], [13, 11], [11, 13]];
  const PATHS = [[[7, 19.9], [7, 7]], [[19.9, 7], [7, 7]], [[7, 13], [1, 13], [1, 1]]];
  const LINES = ['요즘 성 쪽이 부쩍 시끄럽더군.', '길드에 새 의뢰가 붙었대.', '여관 맥주가 오늘따라 맛있어.', '저 모험가, 어제 큰 건을 해냈다지?', '대장간 불이 꺼질 날이 없네.', '마을이 점점 커지는 것 같아.', '북쪽 숲에서 이상한 소문이 돌아.', '물약값이 또 올랐다니까.'];

  // 매니페스트 등록 (assets.js 가 읽기 전에 실행됨). 파일이 없으면 조용히 건너뜀
  const M = root.ASSET_MANIFEST.items;
  // 단계별 지면판 (1~5단계: 개척촌 흙길 → 자갈 → 거친 돌길 → 정돈된 돌길·성벽 → 판석·성채)
  for (let i = 1; i <= 5; i++) M['town_plate' + i] = { src: `town/plate_s${i}.jpg`, w: 1920, h: 1080, ax: 0, ay: 0, color: '#8aa36a', optional: true };
  for (const b of B) if (b.id !== 'castle') M['town_' + b.id] = { src: `town/${b.id}.png`, w: b.sw, h: b.sh, ax: 0.5, ay: 1, color: '#c9b48a', optional: true };
  for (let i = 1; i <= 3; i++) M['town_bridge' + i] = { src: `town/bridge${i}.png`, w: 600, h: 415, ax: 0.5, ay: 0.5, color: '#8a6a45', optional: true };
  CASTLE_H.forEach((c, i) => { M['town_castle' + (i + 1)] = { src: `town/castle${i + 1}.png`, w: c[0], h: c[1], ax: 0.5, ay: 1, color: '#c9b48a', optional: true }; });
  // 하늘 연출 그림 (없으면 코드로 그린 임시 그림 사용)
  for (let i = 1; i <= 4; i++) M['town_cloud' + i] = { src: `town/sky/cloud${i}.png`, w: 640, h: 340, ax: 0, ay: 0, optional: true }; // 2배 저장, 0.5배로 그림
  M.town_bird = { src: 'town/sky/bird.png', w: 256, h: 64, ax: 0.5, ay: 0.5, optional: true };

  const Town = { active: false };
  let stage, getS, hooks, ui = null, cv, hover = null, sel = null, T = 0, override = -1, res = new Map(), bub = null, nextBub = 3, mouse = { x: -1, y: -1 };

  const popStage = s => { let k = 0; for (const t of s.cfg.town.stages) if (s.pop >= t) k++; return k; };
  const curStage = s => override >= 0 ? override : popStage(s);
  const unl = s => (s.townUnlock = s.townUnlock || {});

  function status(b, s) {
    const st = curStage(s);
    if (st < b.st) return { on: false, text: `${STAGE_NAMES[b.st]} 단계부터 등장합니다 (현재 ${STAGE_NAMES[st]})` };
    if (b.special && !unl(s)[b.id]) return { on: false, text: '특별 퀘스트를 완료하면 지어집니다' };
    return { on: true, text: '운영 중' };
  }
  // 이번 프레임에 그릴 건물 (교체 규칙 반영)
  function visible(s) {
    const on = B.filter(b => status(b, s).on), hide = new Set(on.map(b => b.replaces).filter(Boolean));
    return on.filter(b => !hide.has(b.id));
  }
  const keyOf = (b, s) => b.id === 'castle' ? 'town_castle' + (curStage(s) + 1) : 'town_' + b.id;
  const sizeOf = (b, s) => { const it = root.Assets.items[keyOf(b, s)], d = it ? [it.w, it.h] : [b.sw, b.sh]; return [d[0] * b.sc * S, d[1] * b.sc * S]; };
  const anchor = b => [px(b.gx + b.w, b.gy + b.d), py(b.gx + b.w, b.gy + b.d)];
  const depth = b => b.gx + b.w + b.gy + b.d;

  function inPoly(p, x, y) { let c = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) { if ((p[i][1] > y) !== (p[j][1] > y) && x < (p[j][0] - p[i][0]) * (y - p[i][1]) / (p[j][1] - p[i][1]) + p[i][0]) c = !c; } return c; }
  const foot = b => [[px(b.gx, b.gy), py(b.gx, b.gy)], [px(b.gx + b.w, b.gy), py(b.gx + b.w, b.gy)], [px(b.gx + b.w, b.gy + b.d), py(b.gx + b.w, b.gy + b.d)], [px(b.gx, b.gy + b.d), py(b.gx, b.gy + b.d)]];
  function hit(b, s, x, y) {
    const [ax, ay] = anchor(b), [w, h] = sizeOf(b, s);
    if (inPoly(foot(b), x, y)) return true;
    return Math.abs(x - ax) < w * 0.4 && y > ay - h && y < ay - 8;
  }
  function pick(s, x, y) {
    let best = null;
    for (const b of visible(s)) if (hit(b, s, x, y) && (!best || depth(b) > depth(best))) best = b;
    return best;
  }

  // ---------- 거주 모험가 ----------
  const CLS = () => root.ASSET_MANIFEST.CLS;
  function syncRes(s) {
    const list = s.advs.filter(a => a.alive && a.state !== 'quest').slice(0, 6), ids = new Set(list.map(a => a.id));
    for (const id of [...res.keys()]) if (!ids.has(id)) res.delete(id);
    list.forEach((a, i) => {
      if (res.has(a.id)) return;
      const path = PATHS[i % PATHS.length], seg = Math.floor(Math.random() * (path.length - 1));
      res.set(a.id, { a, path, seg, t: Math.random(), fwd: Math.random() < 0.5, pause: 0, dir: 'down', x: 0, y: 0, ph: Math.random() * 6 });
    });
  }
  function moveRes(r, dt) {
    if (r.pause > 0) { r.pause -= dt; r.moving = false; place(r); return; }
    const A = r.path[r.seg], Bp = r.path[r.seg + 1], len = Math.hypot(Bp[0] - A[0], Bp[1] - A[1]) || 1;
    r.t += (r.fwd ? 1 : -1) * 0.9 * dt / len; r.moving = true;
    if (r.t >= 1 || r.t <= 0) {
      r.t = r.t >= 1 ? 1 : 0;
      const nxt = r.seg + (r.fwd ? 1 : -1);
      if (nxt < 0 || nxt >= r.path.length - 1) { r.fwd = !r.fwd; r.pause = 1.5 + Math.random() * 3; } else { r.seg = nxt; r.t = r.fwd ? 0 : 1; }
    }
    place(r);
  }
  function place(r) {
    const A = r.path[r.seg], Bp = r.path[r.seg + 1], gx = A[0] + (Bp[0] - A[0]) * r.t, gy = A[1] + (Bp[1] - A[1]) * r.t;
    const x = px(gx, gy), y = py(gx, gy);
    if (r.moving) { const dx = x - r.x, dy = y - r.y; if (r.x || r.y) r.dir = Math.abs(dx) >= Math.abs(dy) * 0.6 ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'); }
    r.x = x; r.y = y; r.gd = gx + gy;
  }
  function drawRes(g, r, T) {
    const a = r.a, c = CLS()[a.core] || 'warrior', sex = a.id % 2 ? 'm' : 'f', k = `chr_${c}_${sex}_walk`, it = root.Assets.items[k], sc = 0.7 * S;
    if (it && it.ok) {
      const rows = it.sheet.rows, cs = it.img.height / rows.length, f = cs / it.sheet.cell, row = Math.max(0, rows.indexOf(r.dir));
      const fr = r.moving ? Math.floor((T * it.sheet.fps) % it.sheet.cols) : 0, pv = it.sheet.pivotY * f;
      const k2 = sc / f; g.drawImage(it.img, fr * cs, row * cs, cs, cs, r.x - cs * k2 / 2, r.y - pv * k2, cs * k2, cs * k2);
    } else {
      const sk = `chr_${c}_${sex}_front`, im = root.Assets.items[sk];
      if (im && im.img) g.drawImage(im.img, r.x - 40 * sc, r.y - 150 * sc + Math.sin(T * 8 + r.ph) * (r.moving ? 2 : 0), 80 * sc, 150 * sc);
      else { g.fillStyle = '#4a78b8'; g.beginPath(); g.ellipse(r.x, r.y - 24, 9, 24, 0, 0, 7); g.fill(); }
    }
  }

  // ---------- 그리기 ----------
  // 임시 지면 (20×20 지면판이 나오기 전까지): 풀밭 + 흙길 + 구역
  function ground(g) {
    const P = (x, y) => [px(x, y), py(x, y)], quad = (x, y, w, d, f, s, lw) => { g.beginPath(); [[x, y], [x + w, y], [x + w, y + d], [x, y + d]].forEach((p, i) => { const q = P(p[0], p[1]); i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]); }); g.closePath(); if (f) { g.fillStyle = f; g.fill(); } if (s) { g.strokeStyle = s; g.lineWidth = lw; g.stroke(); } };
    g.fillStyle = '#7d9a5c'; g.fillRect(0, 0, 1920, 1080);
    quad(0, 0, N, N, '#d3b27f', '#5a3a22', 5);
    for (const a of [2, 8, 14]) for (const b of [2, 8, 14]) quad(a, b, 4, 4, '#93ad68', 'rgba(60,40,20,.5)', 2);
  }
  // ---------- 하늘: 반투명 구름·그림자, 비둘기 무리 (2026-10-28) ----------
  // 그림 파일(town/sky/cloud1~4.png, town/sky/bird.png 가로 4칸 날갯짓 시트)이 있으면 그것을, 없으면 코드로 그린 임시 그림을 씀
  const SKY = {
    CLOUD_ALPHA: 0.6,        // 기본 투명도
    CLOUD_NEAR_ALPHA: 0.15,   // 커서가 구름 한가운데 있을 때
    CLOUD_SPEED: [28, 40],    // px/초 → 화면 가로지르기 약 60~90초
    CLOUD_COUNT: [1, 3],      // 화면에 동시에 떠 있는 수
    WIND: [1, 0.18],          // 바람 방향 (오른쪽, 살짝 아래)
    SHADOW_OFF: [150, 280],   // 그림자 위치 (해가 왼쪽 위)
    SHADOW_ALPHA: 0.16,
    BIRD_EVERY: [20, 40],     // 초
    BIRD_COUNT: [3, 6],
    BIRD_SPEED: [190, 250],
  };
  const rnd = (a, b) => a + Math.random() * (b - a);
  let clouds = [], birds = [], nextBird = rnd(4, 10), cloudArt = null;
  // 임시 구름 그림: 부드러운 원 여러 개를 겹친 모양 3종 (몸체·그림자 한 쌍)
  function makeCloudArt() {
    const arts = [];
    const puff = (c, x, y, r, col, core) => { const gr = c.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, col + '1)'); gr.addColorStop(core, col + '.9)'); gr.addColorStop(1, col + '0)'); c.fillStyle = gr; c.beginPath(); c.arc(x, y, r, 0, 6.283); c.fill(); };
    for (let v = 0; v < 3; v++) {
      const W = 620 + v * 90, H = 340, P = 120, body = document.createElement('canvas'), sh = document.createElement('canvas');
      body.width = sh.width = W; body.height = sh.height = H;
      const b = body.getContext('2d'), s = sh.getContext('2d'), n = 7 + v * 2, blobs = [];
      for (let i = 0; i < n; i++) { const t = i / (n - 1), hump = Math.sin(t * Math.PI); blobs.push([P + (W - 2 * P) * t + rnd(-20, 20), H * 0.62 - hump * rnd(40, 80), rnd(48, 62) + hump * rnd(30, 48)]); }
      for (let i = 0; i < 4 + v; i++) blobs.push([P + rnd(0.15, 0.85) * (W - 2 * P), H * 0.42 + rnd(-20, 25), rnd(45, 75)]); // 위쪽 덩이
      for (const [x, y, r] of blobs) puff(s, x, y, r * 1.05, 'rgba(20,30,45,', 0.55);
      for (const [x, y, r] of blobs) puff(b, x, y + r * 0.22, r, 'rgba(178,190,210,', 0.55);      // 그늘진 아랫면
      for (const [x, y, r] of blobs) puff(b, x - r * 0.12, y - r * 0.12, r * 0.86, 'rgba(255,255,255,', 0.6); // 햇빛 받는 윗면
      arts.push({ body, sh, w: W, h: H });
    }
    return arts;
  }
  const fileArt = {};
  function cloudFiles(getImg) { const r = []; for (let k = 1; k <= 4; k++) if (getImg && getImg('town_cloud' + k)) r.push(k - 1); return r; }
  function cloudImg(i, getImg) {
    const im = getImg && getImg('town_cloud' + (i + 1));
    if (im) { // 파일 그림: 그림자용 실루엣은 한 번만 만들어 둠
      if (!fileArt[i] || fileArt[i].body !== im) { const nw = im.naturalWidth || im.width, nh = im.naturalHeight || im.height, sh = document.createElement('canvas'); sh.width = nw; sh.height = nh;
        const c = sh.getContext('2d'); c.drawImage(im, 0, 0); c.globalCompositeOperation = 'source-in'; c.fillStyle = 'rgb(20,30,45)'; c.fillRect(0, 0, nw, nh);
        fileArt[i] = { body: im, sh, w: nw * 0.5, h: nh * 0.5 }; }
      return fileArt[i];
    }
    return (cloudArt = cloudArt || makeCloudArt())[i % 3];
  }
  function spawnCloud(x) {
    const fs = cloudFiles(skyUpdate.getImg), i = fs.length ? fs[Math.floor(Math.random() * fs.length)] : Math.floor(Math.random() * 3), sc = rnd(0.8, 1.25);
    const y = rnd(-120, 760) - (x === undefined ? 0 : 0);
    clouds.push({ i, sc, x: x === undefined ? -720 : x, y, sp: rnd(SKY.CLOUD_SPEED[0], SKY.CLOUD_SPEED[1]), a: SKY.CLOUD_ALPHA, flip: Math.random() < 0.5 });
  }
  let cloudTarget = 2;
  function skyReset() { clouds = []; birds = []; nextBird = rnd(4, 10); cloudTarget = Math.round(rnd(SKY.CLOUD_COUNT[0], SKY.CLOUD_COUNT[1])); for (let k = 0; k < cloudTarget; k++) spawnCloud(rnd(-300, 1700)); }
  function spawnFlock() {
    const fromLeft = Math.random() < 0.5, n = Math.round(rnd(SKY.BIRD_COUNT[0], SKY.BIRD_COUNT[1])), sp = rnd(SKY.BIRD_SPEED[0], SKY.BIRD_SPEED[1]);
    const y0 = rnd(150, 850), ang = rnd(-0.35, 0.35), vx = Math.cos(ang) * sp * (fromLeft ? 1 : -1), vy = Math.sin(ang) * sp;
    const x0 = fromLeft ? -60 : 1980;
    for (let k = 0; k < n; k++) { const row = Math.ceil(k / 2), side = k % 2 ? 1 : -1; // 느슨한 V자
      birds.push({ x: x0 - Math.sign(vx) * row * rnd(30, 45), y: y0 + side * row * rnd(18, 30), vx: vx * rnd(0.95, 1.05), vy, ph: rnd(0, 6.28), fr: rnd(9, 12), sz: rnd(1.25, 1.5) }); }
  }
  function skyUpdate(dt, mouse) {
    for (const c of clouds) {
      c.x += SKY.WIND[0] * c.sp * dt; c.y += SKY.WIND[1] * c.sp * dt;
      const art = cloudImg(c.i, skyUpdate.getImg), w = art.w * c.sc, h = art.h * c.sc, cx = c.x + w / 2, cy = c.y + h / 2;
      let target = SKY.CLOUD_ALPHA;
      if (mouse && mouse.x >= 0) { const d = Math.hypot((mouse.x - cx) / (w * 0.5), (mouse.y - cy) / (h * 0.5)), f = Math.min(1, Math.max(0, (d - 0.35) / 0.9)); target = SKY.CLOUD_NEAR_ALPHA + (SKY.CLOUD_ALPHA - SKY.CLOUD_NEAR_ALPHA) * f; }
      c.a += (target - c.a) * Math.min(1, dt * 5); c.done = c.x > 1960 || c.y > 1120;
    }
    clouds = clouds.filter(c => !c.done);
    if (clouds.length < cloudTarget) { spawnCloud(); cloudTarget = Math.round(rnd(SKY.CLOUD_COUNT[0], SKY.CLOUD_COUNT[1])); }
    nextBird -= dt; if (nextBird <= 0) { spawnFlock(); nextBird = rnd(SKY.BIRD_EVERY[0], SKY.BIRD_EVERY[1]); }
    for (const b of birds) { b.x += b.vx * dt; b.y += b.vy * dt; b.ph += b.fr * dt; }
    birds = birds.filter(b => b.x > -200 && b.x < 2120 && b.y > -200 && b.y < 1280);
  }
  function drawBird(g, b, shadow, getImg) {
    const im = getImg && getImg('town_bird');
    if (im) { // 시트: 오른쪽을 향한 위에서 본 모습, 가로 4칸
      const fw = (im.naturalWidth || im.width) / 4, fh = im.naturalHeight || im.height, f = Math.floor(b.ph / 1.57) & 3, k = 40 * b.sz / fw;
      g.save(); g.translate(b.x, b.y); g.rotate(Math.atan2(b.vy, b.vx)); g.scale(k, k); if (shadow) g.filter = 'brightness(0)'; g.drawImage(im, f * fw, 0, fw, fh, -fw / 2, -fh / 2, fw, fh); g.restore(); return; }
    // 위에서 내려다본 비둘기: 진행 방향으로 회전, 날갯짓은 날개 길이·폭 변화로 표현
    const s = b.sz, open = 0.45 + 0.55 * Math.abs(Math.cos(b.ph)), span = 17 * s * open, chord = 6 * s * (1.25 - open * 0.5);
    const dark = shadow ? 'rgba(20,30,45,1)' : '#4a4f58', mid = shadow ? 'rgba(20,30,45,1)' : '#8d939d', light = shadow ? 'rgba(20,30,45,1)' : '#b9bec6';
    g.save(); g.translate(b.x, b.y); g.rotate(Math.atan2(b.vy, b.vx));
    for (const side of [-1, 1]) { // 날개
      g.fillStyle = mid; g.beginPath(); g.moveTo(2 * s, 0); g.quadraticCurveTo(1 * s, side * span * 0.6, -chord * 0.4, side * span); g.lineTo(-chord * 1.1, side * span * 0.92); g.quadraticCurveTo(-4 * s, side * span * 0.4, -3 * s, 0); g.closePath(); g.fill();
      if (!shadow) { g.fillStyle = dark; g.beginPath(); g.moveTo(-chord * 0.4, side * span); g.lineTo(-chord * 1.1, side * span * 0.92); g.lineTo(-chord * 0.6, side * span * 0.72); g.closePath(); g.fill(); }
    }
    g.fillStyle = light; g.beginPath(); g.ellipse(0, 0, 8 * s, 3.2 * s, 0, 0, 6.283); g.fill();              // 몸통
    g.fillStyle = mid; g.beginPath(); g.moveTo(-6 * s, 0); g.lineTo(-12 * s, -3.2 * s); g.lineTo(-12 * s, 3.2 * s); g.closePath(); g.fill(); // 꼬리
    g.fillStyle = shadow ? dark : '#6f7680'; g.beginPath(); g.arc(8 * s, 0, 2.6 * s, 0, 6.283); g.fill();     // 머리
    if (!shadow) { g.strokeStyle = 'rgba(40,44,52,.55)'; g.lineWidth = 0.8; g.beginPath(); g.ellipse(0, 0, 8 * s, 3.2 * s, 0, 0, 6.283); g.stroke(); }
    g.restore();
  }
  // 그리는 순서: (세계) → 구름 그림자 → 새 그림자·새 → 구름 → (이름표·말풍선)
  function skyDraw(g, getImg) {
    g.save();
    for (const c of clouds) { const art = cloudImg(c.i, getImg); g.globalAlpha = SKY.SHADOW_ALPHA; drawCloud(g, art.sh, c, art, SKY.SHADOW_OFF); }
    g.globalAlpha = 0.16; for (const b of birds) drawBird(g, { ...b, x: b.x + 45, y: b.y + 95 }, true, getImg);
    g.globalAlpha = 1; for (const b of birds) drawBird(g, b, false, getImg);
    for (const c of clouds) { const art = cloudImg(c.i, getImg); g.globalAlpha = c.a; drawCloud(g, art.body, c, art, [0, 0]); }
    g.restore();
  }
  function drawCloud(g, im, c, art, off) {
    const w = art.w * c.sc, h = art.h * c.sc, x = c.x + off[0], y = c.y + off[1];
    if (c.flip) { g.save(); g.translate(x + w, y); g.scale(-1, 1); g.drawImage(im, 0, 0, w, h); g.restore(); } else g.drawImage(im, x, y, w, h);
  }
  const skyImg = k => { const it = root.Assets && root.Assets.items[k]; return it && it.img && (it.img.naturalWidth || it.img.width) ? it.img : null; };
  skyUpdate.getImg = skyImg;
  Town.update = function (s, dt) {
    if (!Town.active) return;
    T += dt; syncRes(s); if ((T | 0) !== (Town._t | 0) && ui) { const e = ui.querySelector('#tPop'); if (e) e.textContent = `인구 ${Math.round(s.pop)} · 현재 ${STAGE_NAMES[curStage(s)]} · 거주 모험가 ${res.size}명`; } Town._t = T;
    for (const r of res.values()) moveRes(r, dt);
    nextBub -= dt;
    if (nextBub <= 0) { const p = RUMOR[Math.floor(Math.random() * RUMOR.length)]; bub = { x: px(p[0], p[1]), y: py(p[0], p[1]) - 70, t: 4, text: LINES[Math.floor(Math.random() * LINES.length)] }; nextBub = 6 + Math.random() * 5; }
    if (bub) { bub.t -= dt; if (bub.t <= 0) bub = null; }
    skyUpdate(dt, mouse);
  };
  function diamond(g, b, fill, stroke) {
    const f = foot(b); g.beginPath(); f.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath();
    if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = 3; g.stroke(); }
  }
  Town.draw = function (g, s) {
    const A = root.Assets;
    g.fillStyle = '#6f8d56'; g.fillRect(0, 0, 1920, 1080);
    const pk = 'town_plate' + (curStage(s) + 1);
    if (A.has(pk)) A.draw(g, pk, 0, 0); else ground(g);
    for (const br of BR) {
      const st = curStage(s); if (st < br.st) continue;
      const k = 'town_bridge' + bridgeMat(st), it = A.items[k]; if (!(it && it.img)) continue;
      const cx = px(br.gx + br.w / 2, br.gy + br.d / 2), cy = py(br.gx + br.w / 2, br.gy + br.d / 2), w = (br.w + br.d) * HX * 1.1 * br.sc, h = w * 415 / 600;
      g.save(); g.translate(cx, cy); if (br.flip) g.scale(-1, 1); g.drawImage(it.img, -w / 2, -h / 2, w, h); g.restore();
    }
    const items = visible(s).map(b => ({ t: 0, d: depth(b), b }));
    for (const r of res.values()) items.push({ t: 1, d: r.gd + 0.05, r });
    items.sort((p, q) => p.d - q.d);
    for (const it of items) {
      if (it.b) {
        const b = it.b, [ax, ay] = anchor(b);
        if (b === hover || b === sel) diamond(g, b, 'rgba(255,230,140,.35)', b === sel ? '#ffd25a' : 'rgba(255,240,190,.9)');
        const k = keyOf(b, s);
        if (A.items[k] && A.items[k].img) { const [dw, dh] = sizeOf(b, s); A.draw(g, k, ax, ay, { w: dw, h: dh }); }
        else { diamond(g, b, 'rgba(180,150,100,.7)', '#5a3a22'); g.fillStyle = '#3b2a1e'; g.font = '700 18px "Malgun Gothic",sans-serif'; g.textAlign = 'center'; g.fillText(b.name, ax, ay - 20); }
      } else drawRes(g, it.r, T);
    }
    skyDraw(g, skyImg); // 구름 그림자·새·구름 (클릭 판정과 무관)
    // 이름표
    const tag = hover || sel;
    if (tag) {
      const [ax, ay] = anchor(tag), [, h] = sizeOf(tag, s), st = status(tag, s), txt = tag.name;
      g.font = '700 22px "Malgun Gothic",sans-serif'; const w = g.measureText(txt).width + 28, y = ay - h - 14;
      g.fillStyle = 'rgba(34,22,13,.82)'; g.beginPath(); g.roundRect(ax - w / 2, y - 18, w, 36, 10); g.fill();
      g.fillStyle = st.on ? '#fbf1dc' : '#ee9a8a'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, ax, y + 1); g.textBaseline = 'alphabetic';
    }
    if (bub) {
      g.font = '600 20px "Malgun Gothic",sans-serif'; const w = g.measureText(bub.text).width + 30, a = Math.min(1, bub.t * 2);
      g.globalAlpha = a; g.fillStyle = '#fff8e8'; g.strokeStyle = '#5a3a22'; g.lineWidth = 3;
      g.beginPath(); g.roundRect(bub.x - w / 2, bub.y - 22, w, 44, 14); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(bub.x - 8, bub.y + 22); g.lineTo(bub.x, bub.y + 36); g.lineTo(bub.x + 8, bub.y + 22); g.fillStyle = '#fff8e8'; g.fill();
      g.fillStyle = '#3b2a1e'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(bub.text, bub.x, bub.y + 1); g.textBaseline = 'alphabetic'; g.globalAlpha = 1;
    }
  };

  // ---------- UI ----------
  const CSS = `
#townUi{position:absolute;inset:0;display:none;pointer-events:none}
#townUi.on{display:block}
#townUi .plate{pointer-events:auto;z-index:6}
#tBack{position:absolute;left:900px;top:26px;padding:12px 26px;font-size:24px;cursor:pointer}
#tInfo{left:480px;bottom:26px;width:520px;padding:16px 20px 18px;font-size:21px;line-height:1.5}
#tInfo h3{margin:0 0 4px;font-size:27px}
#tInfo .tg{display:inline-block;padding:1px 10px;border-radius:9px;font-size:17px;font-weight:700;background:#6fc47a;color:#fff;margin-left:8px;vertical-align:middle}
#tInfo .tg.off{background:#c0705c}
#tDev{right:26px;top:84px;width:330px;max-height:820px;overflow:auto;padding:12px 14px;font-size:17px;line-height:1.35}
#tDev h4{margin:2px 0 6px;font-size:19px}
#tDev label{display:flex;align-items:center;gap:6px;padding:1px 0;cursor:pointer}
#tDev select,#tDev button{font:inherit;font-size:17px}
`;
  function buildUi() {
    const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    ui = document.createElement('div'); ui.id = 'townUi'; stage.ui.appendChild(ui);
    ui.innerHTML = `<button class="plate btn" id="tBack">← 길드로</button>
<div class="plate" id="tInfo" style="display:none"></div>
<div class="plate" id="tDev"><h4>마을 개발 패널</h4>
<div>단계: <select id="tStage"><option value="-1">자동(인구)</option>${STAGE_NAMES.map((n, i) => `<option value="${i}">${i + 1}. ${n}</option>`).join('')}</select> <span id="tPop"></span></div>
<div style="margin:6px 0"><button class="btn" id="tAll">모두 해금</button> <button class="btn" id="tNone">모두 잠금</button></div>
<div id="tList"></div></div>`;
    ui.querySelector('#tBack').onclick = () => Town.close();
    ui.querySelector('#tStage').onchange = e => { override = +e.target.value; refreshUi(); };
    ui.querySelector('#tAll').onclick = () => { const u = unl(getS()); B.forEach(b => { if (b.special) u[b.id] = true; }); refreshUi(); };
    ui.querySelector('#tNone').onclick = () => { const u = unl(getS()); B.forEach(b => { if (b.special) u[b.id] = false; }); refreshUi(); };
    cv.addEventListener('mousemove', e => { if (!Town.active) return; mouse = stage.toGame(e.clientX, e.clientY); hover = pick(getS(), mouse.x, mouse.y); cv.style.cursor = hover ? 'pointer' : ''; });
    cv.addEventListener('mouseleave', () => { hover = null; mouse = { x: -1, y: -1 }; });
    cv.addEventListener('click', e => { if (!Town.active) return; const p = stage.toGame(e.clientX, e.clientY); sel = pick(getS(), p.x, p.y); refreshUi(); });
  }
  function refreshUi() {
    const s = getS(), q = x => ui.querySelector(x);
    q('#tPop').textContent = `인구 ${Math.round(s.pop)} · 현재 ${STAGE_NAMES[curStage(s)]} · 거주 모험가 ${res.size}명`;
    q('#tList').innerHTML = B.filter(b => b.special).map(b => {
      const stt = status(b, s), tooEarly = curStage(s) < b.st;
      return `<label title="${b.req}"><input type="checkbox" data-id="${b.id}" ${unl(s)[b.id] ? 'checked' : ''}> ${b.name} <small style="color:#8a7258">${STAGE_NAMES[b.st]}~${tooEarly ? ' (단계 부족)' : ''}${stt.on ? ' ●' : ''}</small></label>`;
    }).join('');
    q('#tList').querySelectorAll('input').forEach(i => i.onchange = () => { unl(s)[i.dataset.id] = i.checked; refreshUi(); });
    const box = q('#tInfo');
    if (!sel) { box.style.display = 'none'; return; }
    const stt = status(sel, s), nm = sel.id === 'castle' ? `영주의 성 (${curStage(s) + 1}단계)` : sel.name;
    box.style.display = 'block';
    box.innerHTML = `<h3>${nm}<span class="tg ${stt.on ? '' : 'off'}">${stt.on ? '운영 중' : '잠김'}</span></h3>
<div>등장 단계: ${STAGE_NAMES[sel.st]} 이상 · 규모 ${sel.w}×${sel.d}칸</div><div>해금 조건: ${sel.req}</div><div style="color:var(--muted)">${stt.text}</div>`;
  }

  Town.init = function (st, getState, h) {
    stage = st; getS = getState; hooks = h || {}; cv = st.canvas; buildUi();
    cv.style.pointerEvents = 'auto';
    root.addEventListener('keydown', e => { if (e.key === 'Escape' && Town.active) Town.close(); });
  };
  Town.open = function () {
    if (!ui) return; Town.active = true; ui.classList.add('on'); const dg = document.getElementById('dlg'); if (dg) dg.style.visibility = 'hidden'; sel = null; hover = null; res.clear(); skyReset(); refreshUi();
    if (hooks.onOpen) hooks.onOpen();
  };
  Town.close = function () { Town.active = false; if (ui) ui.classList.remove('on'); const dg = document.getElementById('dlg'); if (dg) dg.style.visibility = ''; hover = null; cv.style.cursor = ''; if (hooks.onClose) hooks.onClose(); };
  Town.refresh = () => { if (Town.active) refreshUi(); };
  Town._res = res; root.Town = Town;
})(this);
