/* 2차 프로토타입 진입점: 리소스를 읽고, 1차 규칙(game_core.js)을 시간에 맞춰 돌리며 로비와 UI를 그린다. */
(function () {
  'use strict';
  const Gm = window.GuildGame, Sim = window.GuildSim;
  const WEEK_MS = 30000; // 1배속: 1주 = 30초 (1개월 = 120초)
  const SAVE_KEY = 'guildProto2';
  const $ = id => document.getElementById(id);

  const stage = new Stage($('game'));
  let s = Gm.newGame(Sim.defaults(), (Date.now() % 1e9) >>> 0);
  Gm.stepWeek(s); // 화면이 비어 보이지 않도록 첫 주를 미리 진행
  let speed = 1, acc = 0, last = performance.now(), T = 0, debug = false, still = false;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 규칙 한 주 진행 → 전후 상태 비교 → 화면 대본(M2-7) · 알림 · 리나 대화
  function step() {
    const before = Director.snap(s), g0 = s.grade, top = s.log[0];
    Gm.stepWeek(s);
    Director.onWeek(before, s, Lobby.Board);
    const fresh = []; for (const L of s.log) { if (L === top) break; fresh.push(L); }
    UI.onLogs(fresh.reverse());
    if (s.grade > g0) UI.gradeUp(s.grade);
    if (s.week % Gm.WPM === 0) save(true);
  }
  function setSpeed(v) { speed = v; UI.setSpeed(v); }
  function save(quiet) { try { localStorage.setItem(SAVE_KEY, Gm.serialize(s)); } catch (e) { if (!quiet) UI.toast('이 환경에서는 저장할 수 없습니다.', 'warn'); } }
  function swap(ns, msg) { s = ns; UI.setState(s); Lobby.Board.reset(); Director.reset(s); UI.hud(); UI.close(); UI.logClear(); if (msg) UI.say(msg); }
  function load() {
    let t = null; try { t = localStorage.getItem(SAVE_KEY); } catch (e) { /* 저장소 없음 */ }
    if (!t) { UI.toast('저장된 게임이 없습니다.', 'warn'); return; }
    try { const ns = Gm.deserialize(t); ns.cfg = Object.assign(Sim.defaults(), ns.cfg); swap(ns, UI.lines('load', { date: Gm.dateLabel(ns.week) })); }
    catch (e) { UI.toast('저장 데이터를 불러오지 못했습니다.', 'warn'); }
  }
  function newGame() {
    const ns = Gm.newGame(Sim.defaults(), (Date.now() % 1e9) >>> 0); Gm.stepWeek(ns);
    swap(ns, UI.lines('newgame'));
  }

  UI.init(stage, s, { setSpeed, save, load, newGame, changed: () => UI.hud(), promoted: a => Director.celebrate(a.id) });
  LinaMenu.init(stage, () => s, UI); // 리나 클릭 메뉴 (좌3·우3)
  const q = sel => stage.ui.querySelector(sel);
  q('#dWeek').onclick = () => { step(); UI.hud(); };
  q('#dMonth').onclick = () => { for (let i = 0; i < 4; i++) step(); UI.hud(); };
  q('#dGrade').onclick = () => { const g0 = s.grade; Gm.debugSetGrade(s, s.grade + 1); if (!s.filter[s.grade]) { const w = s.filter.slice(); w[s.grade] = 5; Gm.setFilter(s, w); } if (s.grade > g0) UI.gradeUp(s.grade); UI.hud(); };
  q('#dPromo').onclick = () => { // [개발] 전직 시험: 관리소를 짓고 마을에 있는 모험가 능력치를 올린 뒤 제안을 만든다
    if (s.grade < 1) Gm.debugSetGrade(s, 1); s.built['관리소'] = true;
    const town = s.advs.filter(a => a.alive && a.stage === 1).slice(0, 2);
    town.forEach((a, i) => { a.stats[a.core] = Math.max(a.stats[a.core], 52); a.stats[(a.core + 1 + i) % 5] = Math.max(a.stats[(a.core + 1 + i) % 5], 41); a.attach = Math.max(a.attach, 62); });
    for (let i = 0; i < 4; i++) step(); UI.hud();
  };
  q('#dWalk').onclick = e => { e.currentTarget.classList.toggle('on', Director.demoWalk()); };
  q('#dGold').onclick = () => { s.gold += 5000; Gm.log(s, '[디버그] 금고에 5,000G를 넣었습니다.', 'debug'); UI.hud(); };
  q('#dLayer').onclick = e => { debug = !debug; e.currentTarget.classList.toggle('on', debug); };
  q('#dStill').onclick = e => { still = !still; e.currentTarget.classList.toggle('on', still); };
  q('#dTemp').onclick = () => { location.search = Assets.forceTemp ? '' : '?temp=1'; };
  q('#dTemp').textContent = Assets.forceTemp ? '실제 리소스 보기' : '임시 그래픽 보기';
  document.addEventListener('keydown', e => {
    if (e.code === 'Space' && !/INPUT|TEXTAREA|BUTTON/.test(document.activeElement.tagName) && !document.querySelector('#dlg.open')) { e.preventDefault(); setSpeed(speed ? 0 : 1); }
  });

  // ---------- 루프 ----------
  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000); last = now; T += dt;
    if (speed > 0) { acc += dt * 1000 * speed; let n = 0; while (acc >= WEEK_MS) { acc -= WEEK_MS; step(); n++; } if (n) UI.hud(); }
    UI.weekBar(acc / WEEK_MS);
    // 화면 속 동작 빠르기: 배속이 오르면 함께 빨라지되 최대 3배 (일시정지면 멈춤)
    const as = speed === 0 ? 0 : Math.min(3, Math.max(1, speed * 0.6)), adt = dt * as;
    Lobby.update(s, dt); Lina.update(adt); Director.update(adt); UI.update(dt);
    const g = stage.begin();
    Lobby.draw(g, s, T, { debug, still: still || reduce });
    requestAnimationFrame(frame);
  }

  $('loadMsg').textContent = '리소스 불러오는 중…';
  Assets.load(window.ASSET_MANIFEST, st => { $('loadMsg').textContent = `리소스 ${st.ok + st.temp} / ${st.total}`; }).then(() => {
    const st = Assets.stats;
    q('#dAssets').textContent = `리소스 ${st.ok}개 · 임시 그래픽 ${st.temp}개`;
    q('#dAssets').title = st.missing.length ? '임시: ' + st.missing.join(', ') : '모든 파일을 찾았습니다';
    $('loading').remove();
    Lobby.update(s, 0); Director.init(s); UI.hud();
    UI.say(UI.lines('start'));
    requestAnimationFrame(frame);
  });
})();
