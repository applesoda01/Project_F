/* 말풍선 대사 (M2-8)
   상황(수주·출발·성공·실패·레벨업·승급·식사·첫 방문·잡담/소문) × 말투(성향)로 한마디를 고른다.
   말투는 성향에서 정함: 무모 → 호탕, 신중 → 조심, 사교적 → 다정, 독불장군 → 무뚝뚝, 그 외 → 보통.
   대사 표는 data/speech.csv 에 있다. */
(function (root) {
  'use strict';
  const TONE_NAME = { bold: '호탕', careful: '조심', friendly: '다정', loner: '무뚝뚝', plain: '보통' };
  // 대사는 data/speech.csv 에서 고친다 (data_gen.js 로 만들어 읽음)
  const SP = (root.GAME_DATA && root.GAME_DATA.speech) || { L: {}, rumor: [], lina: {} };
  const L = SP.L, RUMOR = SP.rumor;

  function tone(a) { if (!a) return 'plain'; if (a.risk === 2) return 'bold'; if (a.risk === 0) return 'careful'; if (a.social === 2) return 'friendly'; if (a.social === 0) return 'loner'; return 'plain'; }
  function line(a, ev, seed) {
    if (ev === 'chat' && RUMOR.length && Math.random() < 0.3) return RUMOR[Math.floor(Math.random() * RUMOR.length)];
    const g = L[ev] || L.chat || {}, t = g[tone(a)];
    const set = t && t.length ? t : (g.plain || ['…']);
    const i = seed != null ? Math.abs(seed) % set.length : Math.floor(Math.random() * set.length);
    return set[i];
  }
  // 리나 말풍선 (lina_meal, lina_depart …)
  function lina(ev) { const set = SP.lina[ev] || []; return set.length ? set[Math.floor(Math.random() * set.length)] : ''; }
  // 모험가끼리 대화 (2026-11-13, docs/design/character_talk_v1.md): 말 거는 A의 말투에서 open, 대답하는 B의 말투에서 reply를 골라 이어 붙임
  // rel: 'good' | 'bad' | '' (⑤ 친밀도 — 숨김 수치, 아직 없음). 그 관계 대사가 있으면 우선
  const TK = SP.talk || {};
  function pick(role, sit, t, rel) {
    const g = (TK[sit] || {})[role] || {}, pool = (g[t] || []).concat(g.any || []);
    const fit = rel ? pool.filter(x => x[1] === rel) : [], base = pool.filter(x => !x[1]);
    const set = fit.length ? fit : base.length ? base : ((g.plain || []).filter(x => !x[1]));
    return set.length ? set[Math.floor(Math.random() * set.length)][0] : '';
  }
  function talk(a, b, sit, rel, q) {   // q: 의뢰 이름 (출발 대화 {q})
    const fill = s => s.replace(/\{a\}/g, a.name).replace(/\{b\}/g, b.name).replace(/\{q\}/g, q || '이번 의뢰');
    const o = pick('open', sit, tone(a), rel), r = pick('reply', sit, tone(b), rel); if (!o || !r) return null;
    const c = pick('close', sit, tone(a), rel);
    return [fill(o), fill(r)].concat(c ? [fill(c)] : []);
  }
  root.Speech = { line, lina, tone, talk, TONE_NAME };
})(this);
