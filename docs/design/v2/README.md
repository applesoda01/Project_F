# 기획서 v2 (컨텐츠 요소별 정리)

- 정리일: 2026-11-16 (1차 정리) · 같은 날 원본 갱신 반영(raid_invasion_v2.md 새 문서, sub_quest_F_v1.md §6, nomination_v1.md §7-2·§7-3, game_overview.md 갱신 기록)
- 범위: `docs/design/` 원본 문서를 컨텐츠 요소별 12개 문서로 다시 묶었습니다. 원본은 그대로 두었습니다.
- `docs/balance/` 문서는 옮기지 않고 링크만 걸었습니다. `popup_quality_todo.md`(진행표)와 `nomination_trial/`(시험판 기록)은 넣지 않았습니다.

## 정리 규칙

- 요약하지 않고 옮겼습니다. 수치·표·목록·확정/가안 표기는 원문 그대로입니다.
- 원본끼리 다르면 날짜가 최신인 쪽을 본문에 쓰고, 다른 쪽은 `⚠️ 출처 차이`로 남겼습니다.
- 각 절 끝의 `> 출처:` 줄에 원본 파일과 절 번호가 있습니다.
- 화면 배치·UI 동작은 `10_UI.md`, 규칙·수치는 각 컨텐츠 문서에 둡니다. 다른 분류 내용은 링크로 잇습니다.
- 표기: (표기 없음) 확정 · [가안] 방향 확정, 수치 변경 가능 · [제안] 아직 결정 전

## 목차

| 문서 | 내용 | 주요 원본 |
| --- | --- | --- |
| [00_게임개요](00_게임개요.md) | 콘셉트, 핵심 루프, 시간, 용어, 핵심 수치, 플랫폼, 기술·제작 환경, 로드맵 | design_v0.1 §1–4·부록, game_overview §1·2·10·11 |
| [01_모험가](01_모험가.md) | 직업 48개, 능력치, 레벨·스킬 82개, 등급·승급 보너스, 전직, 애착도, 성향, 파티, 사망·계승, 몸 상태, 칭호, 모험가끼리 대화 | design_v0.1 §7·8·12-2.2, adv_condition_v1, titles_v1, character_talk_v1, popup_advs, popup_promo |
| [02_의뢰](02_의뢰.md) | 퀘스트 분류, 유입, 배분, 게시판 규칙, 의뢰 유형, 성공 판정, 지명 퀘스트, 서브 퀘스트(F급 28개), 설비 해금 보상, 메인 퀘스트 | design_v0.1 §6·12-1.6, nomination_v1, named_sub_quest_v1, sub_quest_F_v1(+csv), popup_board |
| [03_전투](03_전투.md) | 의뢰 전투 계산, 출발 판단, 마을 방어전(습격·침공), 전투 수치, 마인 세부, 침공 v2(F급 메인 「다리를 지켜라」) | quest_combat, raid_invasion_v1, raid_invasion_v2, design_v0.1 §11.2–11.3·12-2.1, game_overview §5 |
| [04_아이템](04_아이템.md) | 장비 91개, 물약, 소재 35종, 요리 | design_v0.1 §7.8·12-2.3·12-2.4·12-2.6, game_overview §6, cooking |
| [05_길드](05_길드.md) | 길드 공간, 시설 효과 44개, F·E 시설 개편, 하우징(장식·테이블·자유 배치), 훈련장·도서관, 로비 식사·맥주 | design_v0.1 §9·12-2.5, guild_interior, popup_fac |
| [06_마을](06_마을.md) | 마을 화면 흐름, 슬롯, 건물, 인구·민가 | design_v0.1 §10, town_structure, town_houses_v1 |
| [07_경제](07_경제.md) | 길드 수입, 중계료율, 모험가 경제, 지출처, 장부 항목 | design_v0.1 §5, game_overview §8, popup_ledger |
| [08_길드승급](08_길드승급.md) | 승급 흐름, 승급 시설, 명성·신뢰도, 다회차 | design_v0.1 §11.1, game_overview 관련 절 |
| [09_스토리_세계관](09_스토리_세계관.md) | 주인공, 세계관, 영주, 접수원, 서브 스토리, 마왕·간부, 멀티엔딩, 전생자 | design_v0.1 §12·12-1 |
| [10_UI](10_UI.md) | 타이틀, 팝업 7종, 책 펼침판, 지명 창, 식당, 원정 현황 패널·미니 뷰, 대화 화면, HUD | title_screen, popup_*, expedition_panel, quest_combat §6 |
| [11_비주얼_사운드](11_비주얼_사운드.md) | 비주얼 방향, 레퍼런스, 길드·마을 배경 시간대·계절·날씨, 배경음악 | design_v0.1 §13·14, guild_time_season, town_time_season |

## 여러 문서에 걸친 미결 (정리하며 찾은 것)

각 문서의 "미결" 절에 자세히 있습니다. 여러 분류에 걸치는 것만 모았습니다.

| 항목 | 원본별 값 | 관련 문서 |
| --- | --- | --- |
| 애착 단계 경계 | design 0–29/30–69/70–99/100 · named_sub 0–39/40–64/65–89/90+ · 코드 0–29/30–59/60–89/90+ | 01 · 02 |
| 정착(거주) 기준 애착 | 100(design·overview §3) · 65(population_v1·인구 계산) | 01 · 06 |
| 스킬 발동 확률 | 10/18/28%(design 방어전) · 20/35/50%(skill_combat_v1) · 20% 고정(엔진) | 01 · 03 |
| 관문 1 성공률 기준 | 65–85%(gate1) · 80–95%(decisions) · 80–90%(재미 점검 보고서) | 00 · 03 |
| F급 메인 퀘스트 서사 | 규칙은 침공 「다리를 지켜라」로 정해짐(2026-11-16). 원안 "첫 의뢰"(탐색·일지·옛 파티)의 서사를 어떻게 이을지 | 02 · 08 · 09 |
| 메인 등장 리퀘스트 횟수 | 8회로 확정했으나 지명 수정 뒤 등장이 다시 32주로 당겨짐 → 8 / 10 / 12회 재결정 | 02 · 08 |
| 소재 판매 | 자동 차익 8%(장부·코드) · 판매 창구 직접 판매(economy_v1·cooking) | 04 · 05 · 07 |
| 애착 단계 이름 | 새 이름(방랑자·새내기·동반자·토박이) 확정, 코드 `ATTACH_TITLE`은 옛 이름 | 01 · 10 |
| 전생자 등급 | "길드 등급 + 2" · 모험가 등급 상한 "길드 등급 + 1" | 01 · 09 |
| 의뢰 배분 단계 | 비중 0·1·2·4 · 책 화면 막대 0–3 | 02 · 10 |
| '파티 중 1명만 충족' · 섭외비 · 마감 없음 결정 | `docs/decisions.md`에 아직 기록 없음 | 02 |

## 원본 → v2 대응

| 원본 | v2 |
| --- | --- |
| design_v0.1.md | 전체 분산 (각 문서 머리의 원본 목록 참고) |
| game_overview.md | 전체 분산 |
| adv_condition_v1.md · titles_v1.md · character_talk_v1.md | 01 (화면 절은 10) |
| popup_advs.md · popup_promo.md | 01·04 규칙 / 10 화면 |
| nomination_v1.md · named_sub_quest_v1.md · sub_quest_F_v1.md · sub_quest_F_lines.csv | 02 (설비 해금은 05, 지명 창은 10) |
| popup_board.md | 02 규칙 / 10 화면 |
| quest_combat.md · raid_invasion_v1.md | 03 (미니 뷰는 10) |
| raid_invasion_v2.md | 03 14장 (승급은 08, 화면은 10 18절, 인구는 06) |
| cooking.md | 04 (식당 화면은 10) |
| guild_interior.md · popup_fac.md | 05 (시설 팝업 화면은 10) |
| town_structure.md · town_houses_v1.md | 06 |
| popup_ledger.md | 07 규칙 / 10 화면 |
| title_screen.md · expedition_panel.md · popup_codex.md · popup_log.md | 10 |
| guild_time_season.md · town_time_season.md | 11 |
| popup_quality_todo.md · nomination_trial/ | 넣지 않음 (작업 기록) |
