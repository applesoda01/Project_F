/* 소리·설정 (2026.11): 계절·날씨(길드와 마을이 같은 달력)에 맞춘 BGM과 옵션 값.
   assets/audio/town_{day|autumn|winter|rain}_{intro|loop}.ogg — 시작할 때 intro를 한 번 들려 주고 loop로 이어 간다.
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

  function start(k) {
    const intro = new Audio(url(k, 'intro')), loop = new Audio(url(k, 'loop'));
    loop.loop = true; intro.volume = loop.volume = 0; intro.preload = loop.preload = 'auto';
    const tr = { k, intro, loop, gain: 0, out: false };
    intro.onended = () => { if (!tr.out) loop.play().catch(() => {}); };
    intro.onerror = () => { if (!tr.out) loop.play().catch(() => {}); };   // intro 파일이 없으면 곧바로 loop
    intro.play().catch(() => { tr.blocked = true; });
    return tr;
  }
  function stop(tr) { tr.out = true; Snd.fade.push(tr); }

  // 매 프레임 호출: 계절이 바뀌면 부드럽게 교체, 음량 변화는 즉시 반영
  Snd.update = function (s, dt) {
    const L = root.LobbySky, key = (L && L.calendar && s) ? L.calendar(s).key : 'day';
    const k = ['day', 'autumn', 'winter', 'rain'].includes(key) ? key : 'day';
    if (Snd.unlocked && (!Snd.cur || Snd.cur.k !== k)) { if (Snd.cur) stop(Snd.cur); Snd.cur = start(k); }
    const v = vol(), c = Snd.cur;
    if (c) {
      if (c.blocked) { c.blocked = false; c.intro.play().catch(() => { c.blocked = true; }); }
      c.gain = Math.min(1, c.gain + dt / 1.2); c.intro.volume = c.loop.volume = v * c.gain;
    }
    for (let i = Snd.fade.length - 1; i >= 0; i--) {
      const f = Snd.fade[i]; f.gain = Math.max(0, f.gain - dt / 1.2); f.intro.volume = f.loop.volume = v * f.gain;
      if (f.gain <= 0) { f.intro.pause(); f.loop.pause(); Snd.fade.splice(i, 1); }
    }
  };
  // 브라우저는 사용자가 한 번 누르기 전에는 소리를 막는다 → 첫 클릭·키 입력에서 풀어 준다
  const unlock = () => { Snd.unlocked = true; ['pointerdown', 'keydown'].forEach(e => root.removeEventListener(e, unlock, true)); };
  ['pointerdown', 'keydown'].forEach(e => root.addEventListener(e, unlock, true));
  Snd.set = function (k, v) { Opt[k] = v; save(); };
  root.Snd = Snd;
})(this);
