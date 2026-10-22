/* 화면 구조 (M2-2)
   - 게임 화면은 항상 1920×1080 기준으로 그린다. 창 크기에 맞춰 비율을 지키며 줄이고, 남는 곳은 레터박스.
   - 캔버스(로비 그림) 위에 HTML UI 층을 겹친다. UI도 1920×1080 좌표로 배치하고 같은 배율로 줄인다.
   - 고해상도 화면(devicePixelRatio)에서는 캔버스 해상도를 올려 선명하게 그린다. */
(function (root) {
  'use strict';
  const W = 1920, H = 1080;
  function Stage(host) {
    this.host = host;
    host.classList.add('stage-host');
    this.box = document.createElement('div'); this.box.className = 'stage-box';
    this.canvas = document.createElement('canvas'); this.canvas.className = 'stage-canvas';
    this.ui = document.createElement('div'); this.ui.className = 'stage-ui';
    this.box.append(this.canvas, this.ui); host.appendChild(this.box);
    this.g = this.canvas.getContext('2d');
    this.scale = 1; this.dpr = 1;
    const ro = new ResizeObserver(() => this.fit()); ro.observe(host);
    this.fit();
  }
  Stage.W = W; Stage.H = H;
  Stage.prototype.fit = function () {
    const r = this.host.getBoundingClientRect();
    const s = Math.min(r.width / W, r.height / H) || 1;
    this.scale = s;
    const bw = Math.round(W * s), bh = Math.round(H * s);
    Object.assign(this.box.style, { width: bw + 'px', height: bh + 'px', left: Math.round((r.width - bw) / 2) + 'px', top: Math.round((r.height - bh) / 2) + 'px' });
    this.dpr = Math.min(2, root.devicePixelRatio || 1);
    this.canvas.width = Math.round(bw * this.dpr); this.canvas.height = Math.round(bh * this.dpr);
    this.canvas.style.width = bw + 'px'; this.canvas.style.height = bh + 'px';
    this.ui.style.transform = `scale(${s})`;
  };
  // 그리기 시작: 1920×1080 좌표계로 맞춘 컨텍스트를 돌려준다
  Stage.prototype.begin = function () {
    const g = this.g, k = this.scale * this.dpr;
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, this.canvas.width, this.canvas.height);
    g.setTransform(k, 0, 0, k, 0, 0); g.imageSmoothingQuality = 'high';
    return g;
  };
  // 화면 좌표(마우스) → 게임 좌표
  Stage.prototype.toGame = function (cx, cy) {
    const r = this.box.getBoundingClientRect();
    return { x: (cx - r.left) / this.scale, y: (cy - r.top) / this.scale };
  };
  root.Stage = Stage;
})(this);
