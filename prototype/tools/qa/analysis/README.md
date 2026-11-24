# 정밀 분석 도구 (2026-11-24)

보고서: `docs/reports/게임_정밀분석_2026-11-24.md`

게임 규칙 코드(`js/game_core.js`)를 그대로 읽어 자동으로 여러 판을 돌리고, 정책(플레이 방식)을 바꿔 가며 지표를 비교합니다. 게임 코드는 고치지 않습니다.

## 한 번에 돌리기

```
bash prototype/tools/qa/analysis/run_all.sh     # 약 20분, results/ 에 글 파일 15개
python3 prototype/tools/qa/analysis/charts.py docs/reports/qa_1124/analysis   # 그림 3장 (run_all 뒤에)
```

큰 중간 파일(판마다의 주별 기록, 약 14MB)은 시스템 임시 폴더에 둡니다.

## 파일

| 파일 | 하는 일 |
| --- | --- |
| `load.js` | 게임 규칙 코드를 읽어 들임 |
| `harness.js` | `play(seed, 주, 정책)` — 한 판을 돌려 주별 금고 · 모험가 상태 · 귀환 기록 · 장부를 모음. 기본 정책은 관문 1 봇과 같은 값(418G · 89.9%)이 나옴 |
| `exp_levers.js` · `paired.js` | 결정 22가지를 하나씩 바꿔 100판 · 같은 시드 짝 비교 (95% 구간) |
| `exp_sens.js` | 계약 · 음식 가격 · 준비량 · 매입가 + 규칙 수치 민감도 (60판 96주) |
| `exp_long.js` · `an_long.js` · `an_kinds.js` | 3년(144주) 장기 실행과 집계 (기준 봇 · 다 사는 봇) |
| `exp_tension.js` | 첫해 나쁜 일의 횟수 · 메인 퀘스트 받는 시점 · 예상과 실제 성공률 |
| `exp_req.js` · `exp_req2.js` | 리퀘스트마다 등장 · 완료 주 · 봇의 금고 여유 규칙이 주는 영향 |
| `exp_newcomer.js` · `exp_new2.js` | 신입 모험가의 주별 상태 · 상주 시험 |
| `exp_y2.js` | E급 뒤 칸 배분 · 업그레이드 · 수수료 |
| `exp_rep.js` | 첫해 의뢰 · 몬스터 반복 |
| `exp_drift.js` | 최근 변경(비전투 · 별)과 승급 시점 |
| `chk_donate.js` · `savechk.js` | 첫해 지출 내역 · 저장에 든 수치 표 |
| `ux_cap.js` | 화면 14개를 해상도별로 캡처하고 실제 글자 크기 · 누르는 것의 수와 크기를 잼 (시험 사본 · Playwright 필요) |
| `chat_rep.js` | 1배속으로 몇 분 돌려 기록창 대사를 모음 (시험 사본 · Playwright 필요) |
| `charts.py` | 보고서 그림 3장 |

## 정책을 새로 만들 때

`harness.js`의 `play(seed, W, P)`에서 `P`로 바꿀 수 있는 것:

| 키 | 뜻 |
| --- | --- |
| `req: 'none'` | 리퀘스트 · 메인 퀘스트를 처리하지 않음 |
| `cook: 'none' / 'dish'` | 요리 안 함 / 요리만 발견하고 준비량 · 시장은 그대로 |
| `tables: 0~4` | 테이블 세트 수 (기본은 봇 규칙) |
| `fee: 0.05 / 0.15` | 수수료 |
| `deco` · `build` · `dg: 'send'` | 장식 · 시설과 업그레이드 · 던전 |
| `cfg: c => { … }` | 규칙 수치를 그 판에서만 바꿈 (저장소의 수치는 그대로) |
| `pre(g, w)` · `post(g, w)` | 주 넘김 앞뒤에 직접 행동을 넣음 |
| `snap: [48, 96]` | 그 주의 모험가 명부를 따로 남김 |

화면 도구의 시험 사본 만드는 법은 `prototype/tools/qa/README.md`를 봅니다.
