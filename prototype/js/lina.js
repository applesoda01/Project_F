/* 리나 (접수원) — 2026.10 리소스 교체
   - 카운터 가운데(x=960)에 고정. 걷지 않는다. 모험가는 용건과 상관없이 가운데 한 줄로 선다.
   - 그림: receptionist.json 규칙 그대로
     · 대기: idle_blink 0번 + 깜빡임(1→2→1→0, 2.5~5.5초마다) + 숨쉬기(발 기준 세로 1.0~1.015배, 3초 주기)
     · 동작 시트 12×6 = 72프레임, 24fps(3초), 대기 자세로 시작·끝
     · 혼자 있을 때 6±2초마다 [read, guide, greet] 중 하나(같은 묶음 연속 금지), 변형 a/b 무작위
     · 손님 응대: 첫 방문 인사 = greet, 그 밖의 응대·대화창 시작 = guide
   - 모험가 쪽에서 request()로 응대를 부탁하고, 끝나면 done 콜백을 받는다. */
(function (root) {
  'use strict';
  const A = root.Assets;
  const X = 960;                                   // 고정 위치
  const FEET = 414;                                // 발밑 화면 y (카운터 y=372가 다리를 가림, 머리 꼭대기 ≈ 164)
  const H = 250;                                   // 화면에서의 키 (모험가와 같음)
  const WIN = { meal: X, quest: X, sale: X };      // 예전 세 창구 → 모두 가운데
  const GROUPS = { greet: ['greet_a'], guide: ['guide_a', 'guide_b'], read: ['read_a', 'read_b'] };
  const BLINK_SEQ = [1, 2, 1, 0], BLINK_T = [0.055, 0.085, 0.08];
  const SAY = { wave: '어서 오세요!', paper: '다녀오세요!', happy: '수고하셨어요!', talk: '' };
  const MOTION_SPEED = 1.5;                         // 동작 재생 배속 (1.5 → 24fps 시트를 36fps로, 3초 → 2초)
  const rnd = (a, b) => a + Math.random() * (b - a);

  const Lina = { x: X, t: 0, queue: [], job: null, bubble: null, mode: 'idle', moving: false, WIN,
    anim: null, lastGroup: null, idleT: 0, nextIdle: rnd(4, 8), blink: null, blinkAt: rnd(2.5, 5.5), wasChat: false };

  Lina.request = function (job) { Lina.queue.push(job); };
  Lina.say = function (text, dur) { Lina.bubble = { text, until: Lina.t + (dur || 2.2) }; };
  Lina.play = function (group, force) {
    if (!force && Lina.anim) return;
    const v = GROUPS[group][Math.floor(Math.random() * GROUPS[group].length)];
    if (!A.has('recep_' + v)) return;
    Lina.anim = { key: 'recep_' + v, t: 0 }; Lina.lastGroup = group; Lina.idleT = 0; Lina.blink = null;
  };
  Lina.flush = function () {
    const all = (Lina.job ? [Lina.job] : []).concat(Lina.queue); Lina.job = null; Lina.queue = [];
    for (const j of all) { if (!j.started) j.onStart && j.onStart(); j.done && j.done(); }
  };

  Lina.update = function (dt) {
    Lina.t += dt;
    // 응대 (자리 이동 없이 바로 시작)
    if (!Lina.job && Lina.queue.length) {
      const j = Lina.job = Lina.queue.shift(); j.t = 0; j.started = true; Lina.mode = j.mode || 'talk';
      const text = j.text != null ? j.text : SAY[Lina.mode]; if (text) Lina.say(text, (j.dur || 1.5) + 0.4);
      if (!j.chore) Lina.play(Lina.mode === 'wave' ? 'greet' : 'guide', true);
      j.onStart && j.onStart();
    }
    if (Lina.job) { const j = Lina.job; j.t += dt; if (j.t >= (j.dur || 1.5)) { Lina.job = null; Lina.mode = 'idle'; j.done && j.done(); } }
    // 대화창이 열리면 안내 동작
    if (Lina.chatting && !Lina.wasChat) Lina.play('guide', true);
    Lina.wasChat = !!Lina.chatting;
    // 동작 재생
    if (Lina.anim) { Lina.anim.t += dt * MOTION_SPEED; if (Lina.anim.t >= 72 / 24) { Lina.anim = null; Lina.idleT = 0; Lina.nextIdle = rnd(4, 8); } }
    // 혼자 있을 때 가끔 동작 (6±2초, 같은 묶음 연속 금지)
    if (!Lina.anim && !Lina.job && !Lina.queue.length && !Lina.chatting) {
      Lina.idleT += dt;
      if (Lina.idleT > Lina.nextIdle) {
        const pick = Object.keys(GROUPS).filter(g => g !== Lina.lastGroup);
        Lina.play(pick[Math.floor(Math.random() * pick.length)]);
        if (Math.random() < 0.25 && Lina.lastGroup === 'read') Lina.say(root.Speech.lina('lina_idle'), 1.8);
      }
    }
    // 깜빡임 (대기 중에만)
    if (!Lina.anim) {
      if (!Lina.blink && Lina.t > Lina.blinkAt) Lina.blink = { i: 0, t: 0 };
      if (Lina.blink) { Lina.blink.t += dt; while (Lina.blink && Lina.blink.t >= (BLINK_T[Lina.blink.i] || 0.06)) { Lina.blink.t -= BLINK_T[Lina.blink.i] || 0.06; Lina.blink.i++; if (Lina.blink.i >= BLINK_SEQ.length) { Lina.blink = null; Lina.blinkAt = Lina.t + rnd(2.5, 5.5); } } }
    }
    if (Lina.bubble && Lina.t > Lina.bubble.until) Lina.bubble = null;
  };

  Lina.draw = function (g) {
    let it, fr, cols;
    if (Lina.anim && A.has(Lina.anim.key)) { it = A.items[Lina.anim.key]; fr = Math.min(71, Math.floor(Lina.anim.t * 24)); cols = 12; }
    else if (A.has('recep_idle')) { it = A.items.recep_idle; fr = Lina.blink ? BLINK_SEQ[Lina.blink.i] : 0; cols = 3; }
    else { A.draw(g, 'npc_lina_idle', X, FEET - 300, {}); return; }
    const img = it.img, rows = it.sheet.rows, cs = img.height / rows, f = cs / it.sheet.cell;
    const sc = H / (it.sheet.charH * f), col = fr % cols, row = Math.floor(fr / cols);
    const breath = Lina.anim ? 1 : 1 + 0.0075 * (1 - Math.cos(Lina.t * 2 * Math.PI / 3));   // 1.0 ~ 1.015
    g.save(); g.translate(X, FEET); g.scale(sc, sc * breath);
    g.drawImage(img, col * cs, row * cs, cs, cs, -cs / 2, -it.sheet.pivotY * f, cs, cs);
    g.restore();
  };
  Lina.headPos = () => ({ x: X, y: FEET - H });

  root.Lina = Lina;
})(this);
