# 퀄리티 점검 도구 (2026-11-22)

보고서: `docs/reports/퀄리티_점검_2026-11-22.md`

| 파일 | 하는 일 | 실행 |
| --- | --- | --- |
| `qa_tempo.js` | 자동 플레이 30판 × 48주, 주마다 기록 종류를 셈 (조용한 주 계산용 원자료 `qa_out/tempo_raw.json`) | `node qa_tempo.js` (이 폴더에 `qa_out/` 필요) |
| `qa_first10.js` | 타이틀 → 새로 시작 → 프롤로그 → 튜토리얼을 빛나는 칸만 눌러 진행, 단계별 시간 · 화면 · 대사 기록 | 시험 사본 필요(아래) · `node qa_first10.js 1280` |
| `qa_stress.js` | 72주 진행 + 4주마다 창 10종 열기 + 극단 상황(금고 0 · 모험가 0 · 저장) + 주 처리 시간 | 시험 사본 필요 · `node qa_stress.js 1280 11` |
| `qa_load.js` | 시작 전에 받는 파일 수 · 용량 | 시험 사본 필요 · `node qa_load.js` |

- 시험 사본: `prototype` 전체를 이 스크립트들 옆 `qa/` 폴더에 복사하고, `js/main.js`의 `Lobby.update(s, 0); Director.init(s); UI.hud();` 앞에 `window.__s = () => s;`를 넣습니다(게임 상태를 읽기 위해서이며, 원본은 고치지 않습니다).
- Playwright가 필요합니다. 결과는 `qa_out/`에 저장됩니다.
