# tools/dev — Claude 작업용 도구

## popup_shot.js — 팝업 시안 캡처

게임을 띄워 원하는 상태를 만들고 팝업(·오버 창·연출 장면)을 PNG로 찍습니다. 시안을 사용자에게 보여 줄 때 씁니다. 사용법은 파일 맨 위 주석.

### 준비 (새 세션마다)

Claude 작업 공간(클라우드)에는 프로젝트가 없으므로 먼저 가져옵니다.

1. **프로젝트 사본 만들기**: 연결 폴더 `Project_F`에서 `prototype/` 전체(약 216개 파일, 17MB)와 `tools/dev/`를 `device_stage_files`로 가져옵니다. 한 번에 50개까지라 5번쯤 나눠 가져옵니다. 폴더 구조(`prototype/…`, `tools/dev/…`)는 그대로 둡니다.
   - 규칙·데이터만 고칠 때는 `prototype/js`, `data/`, `tools/`만 있으면 됩니다(관문 1·계산기). 화면 캡처에는 `prototype/assets`·`prototype/css`·`index.html`이 모두 필요합니다.
2. **Playwright**: 작업 공간에 기본 설치돼 있음(`require('playwright')`). 다시 설치하지 않습니다.
3. 사본 루트에서 실행: `node tools/dev/popup_shot.js --pop=ledger --weeks=58 --out=/tmp/x.png`

### 자주 쓰는 예

| 목적 | 명령 |
| --- | --- |
| 장부 + 오버 창 | `--pop=ledger --weeks=58 --hover="table.lg tr:nth-child(5) td:nth-child(2)"` |
| 모험가 목록 오버 | `--pop=advs --weeks=60 --grade=1 --hover="#popBody .ux-row[data-adv]"` |
| 시설 (관리소 지은 상태) | `--pop=fac --weeks=60 --grade=1 --setup="s.gold=5000; G.build(s,'관리소');"` |
| 식당 조리 연출 | `--lab=kitchen --click="[data-kmat=mat_x003],[data-kmat=mat_x019],[data-kcook]" --wait=2600` |
| 작은 창 배율 확인 | `--vw=1366 --vh=768` |
| 소재 판매 창구 | `--pop=sell --weeks=44` (시설 팝업에서 열기: `--pop=fac --click="[data-opensell]"`) |
| 확대 캡처 (사용자에게 보여 줄 때) | `--dsf=2` |

### 함께 쓰는 검사

- 관문 1: `node tools/gate1_check.js` (게임·시뮬레이터 100판, 규칙을 바꾸면 반드시 실행)
- 요리 밸런스: `tools/cook_balance.html`(브라우저)
- 데이터 다시 만들기: `python3 tools/data_build.py` (data/*.csv · collegium_data.json → prototype/js/data_gen.js)

- 2026-11-09: `popup_shot.js`는 이제 **스크롤 막대를 보이게** 찍습니다(실제 게임과 같음). 숨기려면 `--nobars`. 막대가 자리를 차지해 글이 꺾이는 문제를 시안 단계에서 잡기 위함.
