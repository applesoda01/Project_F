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
  const EMO = SP.emo || {}, emoOf = t => (t && EMO[t]) || null;   // 2026-11-18 대사 → 감정 아이콘 (speech.csv · talk.csv 의 감정 열)

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
    const row = set.length ? set[Math.floor(Math.random() * set.length)] : null; pickRow.tg = row ? row[0] : [];   // 고른 줄의 태그 (감정 아이콘용)
    return row ? row[1] : null;
  }
  // 감정 아이콘 고르기 (2026-11-18, js/emote.js) [임시]: 말 걸기 = 기억 종류, 대답 = 고른 줄이 서먹(bad) 줄이면 욱 · 단짝(good) 줄이면 헤헤 · 함께 다친 기억이면 식은땀
  const EMO_OPEN = m => ({ win_big: 'win', qlv: 'win', hurt: 'sweat', fail: 'sweat', gift: 'note', saved: m.role === 'got' ? 'heart' : 'sweat', grow: 'spark', nomin: m.yes ? 'qex' : 'sweat' })[m.k] || null;
  const EMO_REPLY = (tg, together, m) => tg.includes('bad') ? 'anger' : tg.includes('good') ? 'smile' : together && (m.k === 'hurt' || m.k === 'fail') ? 'sweat' : null;
  function memTalk(a, b, rel) {
    const s = getS && getS(), G = root.GuildGame; if (!s || !G || !G.memOf) return null;
    const ms = G.memOf(s, a).slice().reverse();   // 최근 일부터
    for (const m of ms) {
      const together = (m.with || []).includes(b.id) || (b.mem || []).some(x => x.k === m.k && x.q === m.q && x.w === m.w);
      const sets = (TM[m.k] || []).filter(st => condOk(st.cond, m, { style: STYLE(a), voiceB: VOICE(b), together, rel: rel || '' })); if (!sets.length) continue;
      const fresh = sets.filter(x => !(m.used || []).includes(x.id)), pool = fresh.length ? fresh : sets;   // 같은 기억을 두 번째 말할 때는 다른 세트로 (같은 대화 되풀이 방지)
      const st = pool[Math.floor(Math.random() * pool.length)];
      const base = { together, rel: rel || '' };
      const o = pickRow(st.open, Object.assign({ style: STYLE(a), voice: VOICE(a) }, base)), r = pickRow(st.reply, Object.assign({ voice: VOICE(b) }, base)), rTg = pickRow.tg;
      if (!o || !r) continue;
      const c = pickRow(st.close, Object.assign({ voice: VOICE(a) }, base));
      const wn = (m.with || []).map(id => (s.advs.find(x => x.id === id) || {}).name).filter(Boolean)[0] || '동료';
      const V = { a: a.name, b: b.name, q: m.q || '그 의뢰', mon: m.mon || '몬스터', with: wn, weeks: m.weeks || 1, giver: m.giver || '의뢰인', part: m.part || '장비', g: m.g || 'F', lv: m.lv || '', cls: m.cls || '' };
      const fill = t => t.replace(/\{(\w+)(?::([^}]+))?\}/g, (m0, k, sfx) => V[k] != null ? josa(V[k], sfx) : m0);
      (m.used = m.used || []).push(st.id); G.memSaid(a, m);
      const L = [fill(o), fill(r)].concat(c ? [fill(c)] : []);
      L.emo = [EMO_OPEN(m), EMO_REPLY(rTg, together, m)];   // 2026-11-18 감정 아이콘 (말 건 사람 · 대답한 사람) — 맺음 줄은 없음
      return L;
    }
    return null;
  }
  // ---------- 농담 주고받기 세트 (2026-11-19, data/talk_joke.csv · 초안 docs/design/drafts/농담_주고받기_초안_2026-11-19.md) ----------
  //   세트 하나 = 처음부터 끝까지 정해진 4~6줄 (A · B, 세 사람 세트는 C도). 말투는 존댓말(신중) / 반말이 맞아야 하고, 말투까지 같으면 더 자주 고름
  //   사이(단짝 · 서먹) 세트는 그 사이일 때만, 기억 놀림 세트는 그 기억이 있을 때만, 세 사람 세트는 근처에 세 번째 사람이 있을 때만 [임시]
  const TJ = (root.GAME_DATA && root.GAME_DATA.talkJoke) || [], JOKE_P = 0.5, JOKE_GAP = 8;   // 잡담 중 농담 세트 비율 · 같은 세트를 다시 쓰기까지 주 [임시]
  const VOICE_T = t => t === 'careful' ? 'jon' : 'ban';
  function jokeMem(st, a, b) {   // 기억 놀림: 그 기억(가장 최근)을 찾음
    const s = getS && getS(), G = root.GuildGame; if (!s || !G || !G.memOf) return null;
    const [own, k, ...cond] = st.mem, o = own === 'A' ? a : b, x = own === 'A' ? b : a;
    for (const m of G.memOf(s, o).slice().reverse()) {
      if (m.k !== k) continue;
      const together = (m.with || []).includes(x.id) || (x.mem || []).some(y => y.k === m.k && y.q === m.q && y.w === m.w);
      if (cond.every(c => c === 'mon' ? !!m.mon : c === 'late' ? !!m.late : (c === 'got' || c === 'gave') ? m.role === c : (c === 'lv' || c === 'grade') ? m.what === c : c === 'yes' ? m.yes === true : c === 'no' ? m.yes === false : c === 'together' ? together : true)) return m;
    }
    return null;
  }
  function joke(a, b, sit, rel, others) {
    const s = getS && getS(); rel = rel || '';
    const used = (s && (s.jokeUsed = s.jokeUsed || {})) || {}, wk = s ? s.week : 0, pool = [];
    for (const st of TJ) {
      if (!st.sit.includes(sit) || (st.rel && st.rel !== rel) || (used[st.id] != null && wk - used[st.id] < JOKE_GAP)) continue;
      const fit = (x, t) => VOICE_T(tone(x)) === VOICE_T(t) ? (tone(x) === t ? 3 : 1) : 0;
      let w = fit(a, st.tone[0]) * fit(b, st.tone[1]); if (!w) continue;
      let c = null, m = null;
      if (st.kind === 'three') { const cs = (others || []).filter(x => x && x !== a && x !== b && fit(x, st.tone[2])); if (!cs.length) continue; c = cs[Math.floor(Math.random() * cs.length)]; w *= fit(c, st.tone[2]); }
      if (st.kind === 'mem') { m = jokeMem(st, a, b); if (!m) continue; w *= 3; }   // 기억이 맞으면 더 자주 (그 순간에만 할 수 있는 말)
      pool.push({ st, c, m, w });
    }
    if (!pool.length) return null;
    let r = Math.random() * pool.reduce((t, x) => t + x.w, 0), pk = pool[0]; for (const x of pool) { r -= x.w; if (r <= 0) { pk = x; break; } }
    const { st, c, m } = pk; if (s) used[st.id] = wk;
    const V = { a: a.name, b: b.name, c: c ? c.name : '', q: (m && m.q) || '그 의뢰', mon: (m && m.mon) || '몬스터', giver: (m && m.giver) || '의뢰인', part: (m && m.part) || '장비', g: (m && m.g) || 'F', lv: (m && m.lv) || '' };
    const fill = t => t.replace(/\{(\w+)(?::([^}]+))?\}/g, (m0, k, sfx) => V[k] != null && V[k] !== '' ? josa(V[k], sfx) : m0);
    const L = st.lines.map(x => fill(x[1])); L.who = st.lines.map(x => x[0]); L.emo = st.lines.map(x => x[2] || null); L.c = c; L.joke = { id: st.id, title: st.title, kind: st.kind, m };
    return L;
  }
  function talk(a, b, sit, rel, q, others) {   // q: 의뢰 이름 (출발 대화 {q}) · others: 근처 다른 모험가 (세 사람 농담용)
    { const s = getS && getS(), G = root.GuildGame;   // 2026-11-18: 친밀도(숨김)로 관계 대사 고르기 · 로비 대화는 같은 둘에게 주 1번 친밀도 +1 [임시]
      if (s && G && G.relOf) {
        if (rel == null || rel === '') rel = G.relTier(G.relOf(s, a.id, b.id));
        if (LOBBY[sit] && G.relAdd) { s.relTalk = s.relTalk || {}; const k = a.id < b.id ? a.id + '-' + b.id : b.id + '-' + a.id; if (s.relTalk[k] !== s.week) { s.relTalk[k] = s.week; G.relAdd(s, a.id, b.id, 1); } }
      } }
    if (MEM_SITS[sit] && Math.random() < MEM_P) { const L = memTalk(a, b, rel); if (L) return L; }
    if (Math.random() < JOKE_P) { const L = joke(a, b, sit, rel, others); if (L) return L; }   // 2026-11-19 농담 세트
    const V = { a: a.name, b: b.name, q: q || '이번 의뢰' };
    const fill = s => s.replace(/\{([abq])(?::([^}]+))?\}/g, (m0, k, sfx) => { const v = V[k]; if (!sfx) return v; const [x, y] = sfx.split('/'); const c = v.charCodeAt(v.length - 1); return v + (c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0 ? x : y); });   // {a:이/가} 같은 조사 처리 (2026-11-16)
    const o = pick('open', sit, tone(a), rel), r = pick('reply', sit, tone(b), rel); if (!o || !r) return null;
    const c = pick('close', sit, tone(a), rel);
    const out = [fill(o), fill(r)].concat(c ? [fill(c)] : []); out.emo = [emoOf(o), emoOf(r), emoOf(c)];   // 채우기 전 글로 찾음
    return out;
  }
  root.Speech = { line, lina, tone, talk, memTalk, joke, bind, TONE_NAME, emoOf };
})(this);
