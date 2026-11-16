# SD 모션 후처리 · 시험 스크립트 (2026-11-16 보관)

작업 세션의 임시 폴더에서 쓰던 것을 그대로 옮겨 둔 사본입니다. 실행 전에 맨 위의 경로(`S=` 등)를 지금 환경에 맞게 고치세요.

| 파일 | 하는 일 | 쓰는 법 |
|---|---|---|
| `attack_ltx_pp_sel.py` | LTX 영상 → 크로마키 → 1024×880 캔버스(발 512,787)에 16프레임 정렬, `sheet.png` · 미리보기 | `SELX="0,3,…" NOGREEN=1 python3 attack_ltx_pp_sel.py 영상.mp4 출력폴더 이름` (`SELX` 없으면 움직임 구간을 자동 선택) |
| `mon_sheet.py` | 위 결과(`pick/<이름>/atk_*.png`) → 보라 번짐 · 300px 미만 조각 제거 → 256×220 · 8열 webp + json | `python3 mon_sheet.py 작업폴더` (`작업폴더/pick`, `작업폴더/game`) |
| `eat_pp.py` | 로비 식사 · 맥주 영상 → 앉기 시트와 같은 칸(180×175) · 의자 기준점으로 맞춘 24칸 12열 webp | `NOGREEN=1 python3 eat_pp.py 영상.mp4 직업 출력폴더` (앉기 시트와 `start_in/<직업>.png`가 필요) |
| `kfont.py` | PIL용 한글 글꼴 `kfont(크기)` | `from kfont import kfont` |
| `mon_test.js` | 게임 사본에서 전투 원정을 열고 미니 뷰 캔버스를 프레임으로 저장 (몬스터 강제 지정 가능) | `node mon_test.js 태그 mon_02,mon_06` — 사본 `expedition.js`에 `X.__s` · `X.__open` 주입 필요 |
| `eat_test.js` | 게임 사본 로비에 탁자 3개를 놓고 앉은 모험가를 촬영 | `node eat_test.js 태그` |
| `ltx_base_lastframe.json` | LTX 그래프(마지막 프레임 고정). 노드 398:376 프롬프트 · 398:373 부정 · 398:339/338 시드 · 395 · E1 그림 · 75 저장 이름 | ComfyUI `/prompt`에 `{prompt, front:true}`로 보냄 |
| `base_nolast.json` | 마지막 프레임 고정 없는 LTX 그래프(쓰러짐용) | 위와 같음 |
| `ltx_jobs_SEARCH1 · MON1 · EAT1.json` | 실제로 돌린 작업 목록(프롬프트 · 시드 · 저장 이름) | 다시 만들 때 프롬프트를 참고 |

주의
- 게임 사본에서 `tools/data_build.py`를 돌릴 때는 사본의 `assets`가 저장소를 가리키는 링크가 아닌지 먼저 확인합니다 (2026-11-16 저장소 `assets/icons/`를 덮어쓴 사고).
- `file://`로 연 페이지의 캔버스를 읽으려면 chromium을 `--allow-file-access-from-files`로 띄웁니다.
