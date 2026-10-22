/* 리소스 로더 (M2-1)
   매니페스트의 파일을 읽고, 실패하면 임시 그래픽을 만든다.
   주소에 ?temp=1 을 붙이면 모든 리소스를 임시 그래픽으로 강제한다(교체 구조 확인용). */
(function (root) {
  'use strict';
  const Assets = { items: {}, stats: { ok: 0, temp: 0, total: 0 }, forceTemp: /[?&]temp=1/.test(location.search) };

  function placeholder(key, it) {
    const sc = 2, c = document.createElement('canvas');
    c.width = Math.max(2, Math.round(it.w * sc)); c.height = Math.max(2, Math.round(it.h * sc));
    const g = c.getContext('2d'); g.scale(sc, sc);
    const r = Math.min(10, it.w / 6, it.h / 6);
    g.fillStyle = it.color; g.globalAlpha = 0.85;
    g.beginPath(); g.roundRect ? g.roundRect(1, 1, it.w - 2, it.h - 2, r) : g.rect(1, 1, it.w - 2, it.h - 2); g.fill();
    g.globalAlpha = 1; g.strokeStyle = 'rgba(40,25,10,.7)'; g.lineWidth = 2; g.setLineDash([6, 4]); g.stroke(); g.setLineDash([]);
    if (it.w >= 40 && it.h >= 24) { // 이름표
      const fs = Math.max(9, Math.min(18, it.w / 9));
      g.font = `600 ${fs}px "Malgun Gothic", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = 'rgba(30,18,8,.85)';
      const label = key.replace(/_/g, ' ');
      const words = label.split(' '), lines = []; let cur = '';
      for (const w of words) { const t = cur ? cur + ' ' + w : w; if (g.measureText(t).width > it.w - 8 && cur) { lines.push(cur); cur = w; } else cur = t; }
      lines.push(cur);
      lines.forEach((l, i) => g.fillText(l, it.w / 2, it.h / 2 + (i - (lines.length - 1) / 2) * fs * 1.15));
    }
    return c;
  }

  Assets.load = function (manifest, onProgress) {
    const keys = Object.keys(manifest.items);
    Assets.stats = { ok: 0, temp: 0, total: keys.length, missing: [] };
    return Promise.all(keys.map(key => new Promise(done => {
      const it = manifest.items[key];
      const finish = (img, ok) => {
        Assets.items[key] = Object.assign({}, it, { img, ok });
        ok ? Assets.stats.ok++ : (Assets.stats.temp++, Assets.stats.missing.push(key));
        onProgress && onProgress(Assets.stats); done();
      };
      if (Assets.forceTemp) { if (it.optional) { Assets.items[key] = Object.assign({}, it, { img: null, ok: false }); Assets.stats.total--; return done(); } return finish(placeholder(key, it), false); }
      const img = new Image();
      img.onload = () => finish(img, true);
      img.onerror = () => it.optional ? (Assets.items[key] = Object.assign({}, it, { img: null, ok: false }), Assets.stats.total--, done()) : finish(placeholder(key, it), false);
      img.src = (root.ASSET_INLINE && root.ASSET_INLINE[it.src]) || manifest.base + it.src;
    })));
  };

  // 기준점과 매니페스트 크기로 그린다. o: {w,h,alpha,flip,rot(라디안),px,py(회전축 0~1)}
  Assets.draw = function (g, key, x, y, o) {
    const it = Assets.items[key]; if (!it || !it.img) return;
    o = o || {};
    const w = o.w || it.w, h = o.h || it.h;
    g.save();
    if (o.alpha != null) g.globalAlpha *= o.alpha;
    g.translate(x, y);
    if (o.rot) { const px = (o.px != null ? o.px : it.ax) * w - it.ax * w, py = (o.py != null ? o.py : it.ay) * h - it.ay * h; g.translate(px, py); g.rotate(o.rot); g.translate(-px, -py); }
    if (o.flip) g.scale(-1, 1);
    g.drawImage(it.img, -it.ax * w, -it.ay * h, w, h);
    g.restore();
  };
  Assets.has = key => !!(Assets.items[key] && Assets.items[key].ok);

  root.Assets = Assets;
})(this);
