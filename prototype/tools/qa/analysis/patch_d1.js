// D1 시험 규칙 (2026-11-24): 「길드 식당에서 먹은 모험가가 길드에 더 자주 온다」
// 게임 파일은 고치지 않고, 측정 도구가 읽어 들인 game_core.js 글을 메모리에서만 두 군데 바꿉니다.
//   cfg.d1 = { att: n }     먹을 때마다 애착 +n (애착이 높을수록 자주 옴 — 지금 규칙의 출석 공식을 그대로 탐)
//   cfg.d1 = { visits: n }  먹고 나간 모험가는 돌아온 뒤 n주 동안 길드에 꼭 들름 (단골)
//   cfg.d7 = k            (D7) 길드에 와서 쉬는 모험가도 먹음 — 떠나는 사람과 같은 살 확률 × k, 가장 싼 요리, 제값, 자리와 그릇이 있을 때만
// cfg.d1 · cfg.d7 이 없으면 원본과 똑같이 돕니다 (관문 1 값 418G · 89.9% 로 확인).
module.exports=function(file,src){if(file!=='game_core.js')return src;
  const A="if (a.attach >= 100 || a.home) return true;",B="eaters++; ate.add(m.id);";
  if(src.split(A).length!==2||src.split(B).length!==2)throw new Error('patch_d1: 붙일 자리를 찾지 못했습니다 (game_core.js 가 바뀜)');
  src=src.replace(A,A+" if (s.cfg.d1 && a.fed > 0) { a.fed--; return true; }");
  src=src.replace(B,B+" if (s.cfg.d1) { if (s.cfg.d1.att) m.attach = Math.min(100, m.attach + s.cfg.d1.att); if (s.cfg.d1.visits) m.fed = s.cfg.d1.visits; }");
  const C="for (const a of idle) departOne(s, a, idle);";if(src.split(C).length!==2)throw new Error('patch_d1: D7 자리를 찾지 못했습니다');
  src=src.replace(C,C+` if (s.cfg.d7 && mealCookOn(s)) for (const m of s.advs) { if (!m.alive || m.state !== 'town') continue; if (s.seatUsed >= seatsOf(s)) break;
    let dish = null; for (const d of DISH) { if (!s.dishes[d.name] || d.g > s.grade || stockOf(s, d) <= 0) continue; if (!dish || menuOf(s, d).price < menuOf(s, dish).price) dish = d; } if (!dish) break;
    const full = menuOf(s, dish).price; if (!(m.wallet >= full && s.R() < Math.min(1, E.mealBuyRate[m.spend] * priceK(s, dish, full) * s.cfg.d7))) continue;
    s.seatUsed++; m.wallet -= full; takeBowl(s, dish); const W = s.soldW = s.soldW || {}; W[dish.name] = (W[dish.name] || 0) + 1; const inc = full + (upg(s, '주점') ? (E.upMargin || 5) : 0); s.gold += inc; s.month.meal += inc; const md = s.month.dishes = s.month.dishes || {}; md[dish.name] = (md[dish.name] || 0) + 1; s.d7n = (s.d7n || 0) + 1;
    if (s.cfg.d1 && s.cfg.d1.visits) m.fed = s.cfg.d1.visits; }`);
  return src;};
