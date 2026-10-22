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
  root.Speech = { line, lina, tone, TONE_NAME };
})(this);
