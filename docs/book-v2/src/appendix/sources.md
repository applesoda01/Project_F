# 부록 D. 원본 문서 지도

**개정 규칙은 관련 본문에서 읽습니다. 이 표는 근거의 위치만 안내합니다.**

| 본문 | 기존 기획 근거 |
| --- | --- |
| 1·2장 | `docs/design/v2/00_게임개요.md` |
| 3장 모험가 | `01_모험가.md` |
| 4장 의뢰 | `02_의뢰.md` |
| 5장 전투 | `03_전투.md` |
| 6장 아이템 | `04_아이템.md` |
| 7장 길드·마을 | `05_길드.md` · `06_마을.md` |
| 8장 승급 | `08_길드승급.md` |
| 9장 경제 | `07_경제.md` · `docs/balance/` |
| 10장 UI | `10_UI.md` · `11_비주얼_사운드.md` |
| 11장 이야기 | `09_스토리_세계관.md` |

## 첨부 개선안 → 본문 대응

| 개선안 내용 | 통합한 기존 목차 |
| --- | --- |
| 소속·계약·종료·계승 | [모험가](../ch03/lifecycle.md), [성향·애착](../ch03/personality.md) |
| 발주·수행·예약 | [게시판](../ch04/board.md), [지명](../ch04/nomination.md) |
| 소유·매입·위탁 | [물약과 소재](../ch06/potion.md), [장비](../ch06/gear.md) |
| 서비스·시설·마을 경제 | [시설](../ch07/facilities.md), [요리](../ch06/cooking.md), [마을](../ch07/town.md) |
| 요율·보상·지원·예산 | [경제](../ch09/README.md) |
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
