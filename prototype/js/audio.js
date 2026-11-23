/* 소리·설정 (2026.11): 계절·날씨(길드와 마을이 같은 달력)에 맞춘 BGM과 옵션 값.
   assets/audio/town_{day|autumn|winter|rain}_{intro|loop}.ogg — 시작할 때 intro를 한 번 들려 주고 loop로 이어 간다.
   2026-11-12: <audio loop> 대신 Web Audio(AudioBufferSourceNode)로 재생. <audio>는 곡이 한 바퀴 끝날 때와 intro → loop 이음매에서
   잠깐 끊기거나 겹쳐 들렸음 → 소리를 미리 풀어 두고 샘플 단위로 이어 붙여 이음매 없이 반복한다.
   계절이 바뀌면 지금처럼 즉시 1.2초 크로스페이드로 다음 곡. Web Audio를 못 쓰는 브라우저는 예전 방식(<audio>)으로 대신한다.
   옵션은 localStorage 'guildProto2_opt' 에 저장한다 (저장소가 없으면 이번 접속 동안만 유지). */
(function (root) {
  'use strict';
  const KEY = 'guildProto2_opt', DEF = { master: 1, bgm: 0.6, sfx: 0.8, mute: false, fx: true, report: true };   // 2026-11-13: 전체 음량(master) · 효과음(sfx) 추가
  const Opt = Object.assign({}, DEF);
  try { Object.assign(Opt, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { /* 저장소 없음 */ }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(Opt)); } catch (e) { /* 무시 */ } };
  const Snd = { opt: Opt, cur: null, key: null, unlocked: false, fade: [] };
  const SCENE = ['title', 'siege'];   // 2026-11-19 장면 곡: 타이틀 「Lumière d'Aventure」(곡 전체 반복) · 침공 「Siege of C Minor」(intro 13초 + 반복 49.8초), Suno로 사용자 제작
  const url = (k, part) => SCENE.includes(k) ? `assets/audio/${k}_${part}.ogg` : `assets/audio/town_${k}_${part}.ogg`;
  const clamp = v => Math.max(0, Math.min(1, +v || 0));
  const vol = () => Opt.mute ? 0 : clamp(Opt.master == null ? 1 : Opt.master) * clamp(Opt.bgm) * 0.8;
  const FADE = 1.2;

  // ---------- Web Audio ----------
  const AC = root.AudioContext || root.webkitAudioContext;
  let ctx = null;
  const bufs = {};   // url → Promise<AudioBuffer|null> (한 번 받은 곡은 다시 받지 않음)
  function ensureCtx() { if (!ctx && AC) { try { ctx = new AC(); } catch (e) { ctx = null; } } if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {}); return ctx; }
  function load(u) {
    if (!bufs[u]) bufs[u] = fetch(u).then(r => r.ok ? r.arrayBuffer() : Promise.reject(r.status))
      .then(a => new Promise((res, rej) => ctx.decodeAudioData(a, res, rej))).catch(() => null);
    return bufs[u];
  }
  // 2026-11-23 3차 B-음악: 「도입 1번 → 반복 파일만 반복」으로 되돌림. 반복 파일(*_loop.ogg)은 그 자체가 곡 한 바퀴이고 끝이 첫머리로 이어지게 다듬어져 있음
  //   (끝 1초 ↔ 도입 끝 1초 닮음 타이틀 0.94 · 낮 0.93 · 가을 0.95 · 겨울 0.95 · 비 0.98). 1차 3번(도입+반복 통째 반복)은 첫머리가 두 번 나오고 이음매가 튀었음. 침공 곡도 같은 방식(도입 13초 + 반복 49.8초)
  function startWA(k) {
    const g = ctx.createGain(); g.gain.value = 0; g.connect(ctx.destination);
    const tr = { k, g, gain: 0, out: false, srcs: [] };
    Promise.all([load(url(k, 'intro')), load(url(k, 'loop'))]).then(([bi, bl]) => {
      if (tr.out || !bl) return;
      let t = ctx.currentTime + 0.05;
      if (bi) { const si = ctx.createBufferSource(); si.buffer = bi; si.connect(g); si.start(t); tr.srcs.push(si); t += bi.duration; }   // intro 끝나는 순간에 loop를 정확히 붙임
      const sl = ctx.createBufferSource(); sl.buffer = bl; sl.loop = true; sl.connect(g); sl.start(t); tr.srcs.push(sl);
    });
    return tr;
  }
  function stopWA(tr) { for (const s of tr.srcs) { try { s.stop(); } catch (e) { /* 이미 멈춤 */ } } try { tr.g.disconnect(); } catch (e) { /* 무시 */ } }

  // ---------- 예전 방식 (<audio>, Web Audio를 못 쓸 때) ----------
  function startEl(k) {
    const intro = new Audio(url(k, 'intro')), loop = new Audio(url(k, 'loop'));
    loop.loop = true; intro.volume = loop.volume = 0; intro.preload = loop.preload = 'auto';
    const tr = { k, intro, loop, gain: 0, out: false };
    intro.onended = () => { if (!tr.out) loop.play().catch(() => {}); };
    intro.onerror = () => { if (!tr.out) loop.play().catch(() => {}); };   // intro 파일이 없으면 곧바로 loop
    intro.play().catch(() => { tr.blocked = true; });
    return tr;
  }

  const start = k => ensureCtx() ? startWA(k) : startEl(k);
  function setVol(tr, v) { if (tr.g) tr.g.gain.value = v; else tr.intro.volume = tr.loop.volume = v; }
  function kill(tr) {
    if (!tr.g) { tr.intro.pause(); tr.loop.pause(); return; }
    stopWA(tr);
    if (!Snd.cur || Snd.cur.k !== tr.k) { delete bufs[url(tr.k, 'intro')]; delete bufs[url(tr.k, 'loop')]; }   // 풀어 둔 곡은 곡당 약 60MB → 지금 계절이 아니면 버림
  }
  function stop(tr) { tr.out = true; Snd.fade.push(tr); }

  // 매 프레임 호출: 계절이 바뀌면 즉시 크로스페이드로 교체, 음량 변화는 즉시 반영
  Snd.update = function (s, dt) {
    const L = root.LobbySky, key = (L && L.calendar && s) ? L.calendar(s).key : 'day';
    let k = ['day', 'autumn', 'winter', 'rain'].includes(key) ? key : 'day';
    const tl = root.document && root.document.getElementById('titleLay');
    if (tl && tl.classList.contains('on')) k = 'title';   // 타이틀 화면이 떠 있는 동안
    else if (s && s.main && s.main.state === 'live') k = 'siege';   // 침공(메인 퀘스트) 장면 동안 — 끝나면 계절 곡으로 크로스페이드
    if (Snd.unlocked && (!Snd.cur || Snd.cur.k !== k)) { if (Snd.cur) stop(Snd.cur); Snd.cur = start(k); }
    const v = vol(), c = Snd.cur;
    if (c) {
      if (c.blocked) { c.blocked = false; c.intro.play().catch(() => { c.blocked = true; }); }
      c.gain = Math.min(1, c.gain + dt / FADE); setVol(c, v * c.gain);
    }
    for (let i = Snd.fade.length - 1; i >= 0; i--) {
      const f = Snd.fade[i]; f.gain = Math.max(0, f.gain - dt / FADE); setVol(f, v * f.gain);
      if (f.gain <= 0) { kill(f); Snd.fade.splice(i, 1); }
    }
  };
  // 브라우저는 사용자가 한 번 누르기 전에는 소리를 막는다 → 첫 클릭·키 입력에서 풀어 준다 (Web Audio도 이때 깨움)
  // 2026-11-23 버그 1 (사용자: 타이틀 음악이 시작부터 나와야 함): 페이지를 열자마자 소리 엔진을 만들고 곡을 걸어 둠.
  //   브라우저가 허락하면(이 사이트를 전에 눌러 본 적이 있는 등) 바로 들리고, 막으면 엔진이 멈춘 채 기다리다 첫 클릭 · 키 입력에서 이어서 들림
  //   전에는 첫 입력 전까지 곡을 걸지도 않았고, 입력 전에 unlock이 불리면 멈춘 엔진을 다시 깨우지 못했음 → 입력마다 깨우고, 깨어나면 듣기를 그만둠
  const unlock = Snd.unlock = () => {   // 타이틀(iframe) 안을 눌러도 풀리게 main.js가 부름
    Snd.unlocked = true; const c = ensureCtx();
    if (!c || c.state === 'running') ['pointerdown', 'keydown'].forEach(e => root.removeEventListener(e, unlock, true));
    else c.resume().then(() => { if (c.state === 'running') ['pointerdown', 'keydown'].forEach(e => root.removeEventListener(e, unlock, true)); }).catch(() => {});
  };
  ['pointerdown', 'keydown'].forEach(e => root.addEventListener(e, unlock, true));
  if (AC) { ensureCtx(); if (ctx) Snd.unlocked = true; }   // 바로 곡을 걸어 둠 (Web Audio가 있을 때만. 예전 <audio> 방식은 첫 입력을 기다림)
  Snd.set = function (k, v) { Opt[k] = v; save(); };
  // 효과음 음량 = 전체 × 효과음
  Snd.sfxVol = () => Opt.mute ? 0 : clamp(Opt.master == null ? 1 : Opt.master) * clamp(Opt.sfx == null ? 0.8 : Opt.sfx);
  // 2026-11-23 사용자: 클릭 소리 = assets/audio/sfx_click.ogg (사용자가 준 general_click_16.wav, 0.06초). 단추 · 메뉴 · 책갈피 · 목록 줄을 누르는 순간 한 번
  const CLICK = 'assets/audio/sfx_click.ogg', CLICKABLE = 'button, .mb, .cb, .btn, [data-pop], [data-act], [data-sub], [data-ch], [data-adv], .ux-row, [role="button"], a[href]';
  Snd.click = function () {
    const v = Snd.sfxVol(), c = ensureCtx(); if (!v || !c || c.state !== 'running') return;
    load(CLICK).then(b => { if (!b) return; const src = c.createBufferSource(), g = c.createGain(); g.gain.value = v; src.buffer = b; src.connect(g); g.connect(c.destination); src.start(); });
  };
  if (AC) root.addEventListener('pointerdown', e => { if (e.button) return; const t = e.target && e.target.closest && e.target.closest(CLICKABLE); if (t && !t.disabled) Snd.click(); }, true);
  if (AC && ctx) load(CLICK);   // 미리 받아 둠 (첫 클릭이 늦게 들리지 않게)
  root.Snd = Snd;
})(this);
