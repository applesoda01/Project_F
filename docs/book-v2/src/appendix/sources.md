# 부록 D. 원본 문서 지도

**이 책의 원본은 `docs/design/v2/`의 기획서 12개입니다.** 결정 이력 · 출처 차이 · 측정 근거가 필요하면 아래 문서를 보십시오.

| 이 책 | 원본 기획서 (`docs/design/v2/`) | 분량 |
| --- | --- | ---: |
| 1 · 2장 | `00_게임개요.md` | 2만 자 |
| 3장 모험가 | `01_모험가.md` | 8만 자 |
| 4장 의뢰와 퀘스트 | `02_의뢰.md` | 10만 자 |
| 5장 전투 | `03_전투.md` | 8만 자 |
| 6장 아이템 | `04_아이템.md` | 4만 자 |
| 7장 길드와 마을 | `05_길드.md`, `06_마을.md` | 9만 자 |
| 8장 길드 승급 | `08_길드승급.md` | 2만 자 |
| 9장 경제 | `07_경제.md` | 2만 자 |
| 10장 화면 | `10_UI.md`, `11_비주얼_사운드.md` | 14만 자 |
| 11장 세계관 | `09_스토리_세계관.md` | 2만 자 |

## 그 밖의 자료

| 자료 | 위치 |
| --- | --- |
| 설정값 | `prototype/data/balance.csv` |
| 결정 기록 | `docs/decisions.md` |
| 할 일 | `docs/todo.md` |
| 밸런스 문서 | `docs/balance/` (economy_v1, gate1, progression_v1 등) |
| 제안서 | `docs/design/proposal_*.md` |
| 게임 코드 | `prototype/js/` (규칙 `game_core.js`, 전투 `combat.js`, 시뮬레이터 `sim_engine.js`) |
| 이 책의 원고 | V1 `docs/book/src/`, V2 `docs/book-v2/src/`. 브랜치 수정만으로 공개 배포되지 않음 |

## 첨부 개선안 → 본문 대응

| 개선안 내용 | 통합한 기존 목차 |
| --- | --- |
| 소속·계약·종료·계승 | [모험가](../ch03/lifecycle.md), [성향·애착](../ch03/personality.md) |
| 발주·수행·예약 | [게시판](../ch04/board.md), [지명](../ch04/nomination.md) |
| 소유·매입·위탁 | [물약과 소재](../ch06/potion.md), [장비](../ch06/gear.md) |
| 서비스·시설·마을 경제 | [시설](../ch07/facilities.md), [요리](../ch06/cooking.md), [마을](../ch07/town.md) |
| 수수료·보상·지원·예산 | [경제](../ch09/README.md) |
| UI 예시 | 해당 시스템 장 + [책 UI 안내](../ch10/book.md) |
| 호환·단계·검증 | [범위](../ch01/scope.md), [장부](../ch09/ledger.md), [미결](pending.md) |

| 자료 | 보관·기준 |
| --- | --- |
| 사용자 첨부 원문 | `docs/references/guild-economy-contracts-2026-11-16/original.html` — 저장소 참고 자료, 책의 별도 장으로 게시하지 않음 |
| 첨부 검토 기준 | `bd7e207`, 2026-11-16 정적 검토 |
| v1 보존 기준 | `6df6325` |
| 실제 설정·코드 | `prototype/data/balance.csv`, `prototype/js/game_core.js` |
| UI 리소스·생성 | [책 UI 리소스 표](../ch10/book.md), `docs/tools/render-book-mockups.ps1` |

원문이 참조한 「길드의 수익 구조.md」는 이번에 직접 제공되지 않았으므로 재검토했다고 주장하지 않습니다.
