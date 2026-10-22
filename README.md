# 이세계 모험가 길드 (가칭)

싸우지 않는 길드 마스터가 게시판과 시설로 모험가를 키워, 마왕을 무찌를 파티를 길러 내는 실시간 경영 시뮬레이션입니다.

- 플랫폼: 스팀(PC). 체험판 = 프로토타입 (F~D급, 약 2~3시간)
- 지금 단계: **2차 프로토타입 (M2 디테일·그래픽 작업 중)** — 진행 현황은 [docs/plan/progress.md](docs/plan/progress.md)
- 작성: 윤석 (DRIMAGE)

## 바로 실행해 보기

1. `prototype/index.html`을 브라우저(크롬 권장)로 엽니다. 설치나 서버가 필요 없습니다.
2. 왼쪽 아래 **개발** 버튼에 시간 건너뛰기, 등급 올리기, 전직 시험, 걷기 시연, 관문 1 검증이 있습니다.
3. 한 파일로 묶은 미리보기가 필요하면 `python tools/bundle_preview.py` → `dist/guild_preview.html` (저장소에는 올리지 않음)

## 폴더 안내

| 폴더 | 내용 |
| --- | --- |
| [docs/design](docs/design) | 기획서 — 게임 규칙의 기준 |
| [docs/data](docs/data) | 소재·스킬·시설 효과·장비 데이터 초안 |
| [docs/plan](docs/plan) | 단계별 계획(2차 M2~M3)과 진행 현황 |
| [docs/art](docs/art) | 리소스 규격, 파일 이름 규칙, 레이어 구성, 시안 이미지 |
| [docs/balance](docs/balance) | 시뮬레이터 결과와 관문 검증 기록 |
| [docs/decisions.md](docs/decisions.md) | 결정 기록 (날짜·이유) |
| [docs/history](docs/history) | 인수인계 메모 |
| [prototype](prototype) | 2차 프로토타입 (HTML·JS, 유니티 이식 전 검증용) |
| [sim](sim) | 밸런스 시뮬레이터와 비교 스크립트 |
| [art_source](art_source) | 그림 원본 보관 (전신 일러스트, 걷기 시트 원본, 업스케일본). 게임은 읽지 않음 |
| [tools](tools) | 업스케일, 미리보기 묶기 등 작업 도구 |
| [archive](archive) | 1차 프로토타입 (관문 1 통과본) |
| [presentations](presentations) | 기획 공유 PPT |

## 원칙

- **규칙의 기준은 문서**입니다. 규칙을 바꿀 때는 기획서(`docs/design`)·게임 규칙(`prototype/js/game_core.js`)·시뮬레이터(`sim/sim_engine.js`)를 함께 고치고, `docs/decisions.md`와 `docs/balance`에 남깁니다.
- 규칙(`game_core.js`)과 화면은 분리합니다. 규칙 파일은 유니티 C#으로 1:1 이식합니다.
- 그림은 정해진 파일 이름으로 바꿔 넣기만 하면 반영됩니다 → [docs/art/asset_rules.md](docs/art/asset_rules.md)
