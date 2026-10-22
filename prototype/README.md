# 2차 프로토타입

`index.html`을 브라우저로 열면 실행됩니다 (서버 불필요).

| 파일 | 역할 |
| --- | --- |
| `js/game_core.js` | **게임 규칙** (화면과 분리, 유니티 C# 이식 대상) |
| `js/sim_engine.js` | 시뮬레이터 기본값(`defaults()`)을 게임도 같이 씀. 원본은 `sim/sim_engine.js`와 동일하게 유지 |
| `js/data.js` | 요리·스킬 데이터 |
| `js/manifest.js` · `js/assets.js` | 리소스 목록과 로더 (M2-1) |
| `js/stage.js` | 1920×1080 화면 구조 (M2-2) |
| `js/lobby.js` | 로비 그리기·게시판 (M2-3·M2-4) |
| `js/actors.js` | 모험가 이동과 규칙 연결 (M2-5·M2-7) |
| `js/lina.js` | 리나 행동 (M2-6) |
| `js/speech.js` | 말풍선 대사표 (M2-8) |
| `js/ui.js` | 모서리 UI·팝업·대화·전직 제안·상세창 (M2-9~11, M3-3·M3-4) |
| `js/main.js` | 진입점, 시간 진행, 저장 |
| `assets/` | 그림 — 규칙은 [docs/art/asset_rules.md](../docs/art/asset_rules.md) |
| `experiments/` | 시험판 (리나 컷아웃, 전사 옆모습 걷기, 로비 연출, 쪽지 흔들림) |

규칙을 고쳤다면 `sim/sim_engine.js`도 같이 고치고 `prototype/js/sim_engine.js`에 복사한 뒤, 개발 패널의 "관문 1 검증"을 돌려 [docs/balance/gate1.md](../docs/balance/gate1.md)에 기록합니다.
