/* 소리·설정 (2026.11): 계절·날씨(길드와 마을이 같은 달력)에 맞춘 BGM과 옵션 값.
   assets/audio/town_{day|autumn|winter|rain}_{intro|loop}.ogg — 시작할 때 intro를 한 번 들려 주고 loop로 이어 간다.
   2026-11-12: <audio loop> 대신 Web Audio(AudioBufferSourceNode)로 재생. <audio>는 곡이 한 바퀴 끝날 때와 intro → loop 이음매에서
   잠깐 끊기거나 겹쳐 들렸음 → 소리를 미리 풀어 두고 샘플 단위로 이어 붙여 이음매 없이 반복한다.
   계절이 바뀌면 지금처럼 즉시 1.2초 크로스페이드로 다음 곡. Web Audio를 못 쓰는 브라우저는 예전 방식(<audio>)으로 대신한다.
   옵션은 localStorage 'guildProto2_opt' 에 저장한다 (저장소가 없으면 이번 접속 동안만 유지). */
(function (root) {
  'use strict';
  const KEY = 'guildProto2_opt', DEF = { bgm: 0.6, mute: false, fx: true, report: true };
  const Opt = Object.assign({}, DEF);
  try { Object.assign(Opt, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { /* 저장소 없음 */ }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(Opt)); } catch (e) { /* 무시 */ } };
  const Snd = { opt: Opt, cur: null, key: null, unlocked: false, fade: [] };
  const url = (k, part) => `assets/audio/town_${k}_${part}.ogg`;
  const vol = () => Opt.mute ? 0 : Math.max(0, Math.min(1, Opt.bgm)) * 0.8;
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
    const k = ['day', 'autumn', 'winter', 'rain'].includes(key) ? key : 'day';
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
  const unlock = () => { Snd.unlocked = true; ensureCtx(); ['pointerdown', 'keydown'].forEach(e => root.removeEventListener(e, unlock, true)); };
  ['pointerdown', 'keydown'].forEach(e => root.addEventListener(e, unlock, true));
  Snd.set = function (k, v) { Opt[k] = v; save(); };
  root.Snd = Snd;
})(this);
