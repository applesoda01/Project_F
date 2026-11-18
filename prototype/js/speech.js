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
  // ---------- 기억 대화 (2026-11-18, docs/design/proposal_adv_memory_v1.md 3장 · data/talk_mem.csv) ----------
  //   말 거는 A에게 말할 기억이 있으면 MEM_P 확률로 그 기억의 "세트"에서 말 걸기 · 대답 · 맺음을 고름 (따로 이어 붙이지 않아 꼬이지 않음)
  //   줄 태그: bold · careful · calm = A의 모험심(무모 · 신중 · 보통) / jon · ban = 그 줄을 말하는 사람의 말씨(조심 말투면 존댓말) / together · new = B도 함께 겪었나 / good · bad = 친밀도 단짝 · 서먹
  const TM = (root.GAME_DATA && root.GAME_DATA.talkMem) || {}, MEM_P = 0.6, MEM_SITS = { table: 1, board: 1, idle: 1, town: 1, depart: 1, return_ok: 1, return_fail: 1 }, LOBBY = { table: 1, board: 1, idle: 1, town: 1 };
  let getS = null; const bind = f => { getS = f; };
  const STYLE = a => a.risk === 2 ? 'bold' : a.risk === 0 ? 'careful' : 'calm';
  const VOICE = a => tone(a) === 'careful' ? 'jon' : 'ban';
  function josa(v, sfx) {
    if (!sfx) return v; const [x, y] = sfx.split('/'), c = String(v).charCodeAt(String(v).length - 1);
    if (c < 0xac00 || c > 0xd7a3) return v + y; const jong = (c - 0xac00) % 28;
    if (x === '으로' && jong === 8) return v + y;   // ㄹ 받침 + 으로/로 → 로
    return v + (jong ? x : y);
  }
  function condOk(cond, m, cx) {
    for (const c of cond) {
      if (c[0] === '@') { const t = c.slice(1); if (cx && !((t === 'bold' || t === 'careful' || t === 'calm') ? cx.style === t : (t === 'jon' || t === 'ban') ? cx.voiceB === t : t === 'together' ? cx.together : t === 'new' ? !cx.together : (t === 'good' || t === 'bad') ? cx.rel === t : true)) return false; continue; }   // 좁은 세트 조건 (생성기 세트)
      const not = c[0] === '!', k = not ? c.slice(1) : c;
      const v = k === 'mon' ? !!m.mon : k === 'late' ? !!m.late : k === 'fz' ? !!m.fz : (k === 'got' || k === 'gave') ? m.role === k : (k === 'lv' || k === 'grade' || k === 'class') ? m.what === k : k === 'yes' ? m.yes === true : k === 'no' ? m.yes === false : true;
      if (not ? v : !v) return false;
    }
    return true;
  }
  function tagOk(t, cx) {
    if (t === 'bold' || t === 'careful' || t === 'calm') return cx.style === t;
    if (t === 'jon' || t === 'ban') return cx.voice === t;
    if (t === 'together') return cx.together; if (t === 'new') return !cx.together;
    if (t === 'good' || t === 'bad') return cx.rel === t;
    return true;
  }
  function pickRow(rows, cx) {   // 관계 태그 줄이 맞으면 그쪽을 먼저 (30%), 아니면 관계 태그 없는 줄
    const ok = rows.filter(([tg]) => tg.every(t => tagOk(t, cx))), relFit = ok.filter(([tg]) => tg.includes('good') || tg.includes('bad')), base = ok.filter(([tg]) => !tg.includes('good') && !tg.includes('bad'));
    const set = relFit.length && (Math.random() < 0.3 || !base.length) ? relFit : base;
    return set.length ? set[Math.floor(Math.random() * set.length)][1] : null;
  }
  function memTalk(a, b, rel) {
    const s = getS && getS(), G = root.GuildGame; if (!s || !G || !G.memOf) return null;
    const ms = G.memOf(s, a).slice().reverse();   // 최근 일부터
    for (const m of ms) {
      const together = (m.with || []).includes(b.id) || (b.mem || []).some(x => x.k === m.k && x.q === m.q && x.w === m.w);
      const sets = (TM[m.k] || []).filter(st => condOk(st.cond, m, { style: STYLE(a), voiceB: VOICE(b), together, rel: rel || '' })); if (!sets.length) continue;
      const st = sets[Math.floor(Math.random() * sets.length)];
      const base = { together, rel: rel || '' };
      const o = pickRow(st.open, Object.assign({ style: STYLE(a), voice: VOICE(a) }, base)), r = pickRow(st.reply, Object.assign({ voice: VOICE(b) }, base));
      if (!o || !r) continue;
      const c = pickRow(st.close, Object.assign({ voice: VOICE(a) }, base));
      const wn = (m.with || []).map(id => (s.advs.find(x => x.id === id) || {}).name).filter(Boolean)[0] || '동료';
      const V = { a: a.name, b: b.name, q: m.q || '그 의뢰', mon: m.mon || '몬스터', with: wn, weeks: m.weeks || 1, giver: m.giver || '의뢰인', part: m.part || '장비', g: m.g || 'F', lv: m.lv || '', cls: m.cls || '' };
      const fill = t => t.replace(/\{(\w+)(?::([^}]+))?\}/g, (m0, k, sfx) => V[k] != null ? josa(V[k], sfx) : m0);
      G.memSaid(a, m);
      return [fill(o), fill(r)].concat(c ? [fill(c)] : []);
    }
    return null;
  }
  function talk(a, b, sit, rel, q) {   // q: 의뢰 이름 (출발 대화 {q})
    { const s = getS && getS(), G = root.GuildGame;   // 2026-11-18: 친밀도(숨김)로 관계 대사 고르기 · 로비 대화는 같은 둘에게 주 1번 친밀도 +1 [임시]
      if (s && G && G.relOf) {
        if (rel == null || rel === '') rel = G.relTier(G.relOf(s, a.id, b.id));
        if (LOBBY[sit] && G.relAdd) { s.relTalk = s.relTalk || {}; const k = a.id < b.id ? a.id + '-' + b.id : b.id + '-' + a.id; if (s.relTalk[k] !== s.week) { s.relTalk[k] = s.week; G.relAdd(s, a.id, b.id, 1); } }
      } }
    if (MEM_SITS[sit] && Math.random() < MEM_P) { const L = memTalk(a, b, rel); if (L) return L; }
    const V = { a: a.name, b: b.name, q: q || '이번 의뢰' };
    const fill = s => s.replace(/\{([abq])(?::([^}]+))?\}/g, (m0, k, sfx) => { const v = V[k]; if (!sfx) return v; const [x, y] = sfx.split('/'); const c = v.charCodeAt(v.length - 1); return v + (c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0 ? x : y); });   // {a:이/가} 같은 조사 처리 (2026-11-16)
    const o = pick('open', sit, tone(a), rel), r = pick('reply', sit, tone(b), rel); if (!o || !r) return null;
    const c = pick('close', sit, tone(a), rel);
    return [fill(o), fill(r)].concat(c ? [fill(c)] : []);
  }
  root.Speech = { line, lina, tone, talk, memTalk, bind, TONE_NAME };
})(this);
