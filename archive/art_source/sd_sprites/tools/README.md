# SD 모션 후처리 스크립트

작업 공간(클라우드)에서 쓰던 스크립트를 세션이 바뀌어도 잃지 않도록 보관합니다. 방식 설명은 `docs/art/sd_motion_workflow.md`.

| 파일 | 용도 | 사용법 |
| --- | --- | --- |
| `run_gemini_pp.py` | Gemini 달리기 영상 → 키잉·워터마크 제거·루프 주기 자동 탐색·640×800 정렬 | `python3 run_gemini_pp.py 영상.mp4 이름 출력폴더` · 환경변수 `PMIN`/`PMAX`(주기 탐색 범위, 기본 16~60), `XFADE=3`(이음매 3프레임 섞기), `PERCENTER=1`(몸통 중심 프레임별 보정) |
| `attack_ltx_pp.py` | LTX 공격 영상(2초 49프레임) → 동작 구간 자동 탐지·16프레임 선택·1024×880 정렬 | `python3 attack_ltx_pp.py 영상.mp4 출력폴더 이름` · `OX=400`(발 기준 x, 기본 512 — 찌르기처럼 오른쪽으로 길면 줄임), `NOGREEN=1`(초록 색번짐 억제, 초록이 없는 캐릭터만) |
| `attack_ltx_pp_manual_7904.py` | 전사 남 가로 베기 7904 확정본에 쓴 원본(프레임 수동 선택 SEL) | 경로가 하드코딩됨 |

- 필요: python3, numpy, scipy, Pillow, opencv-python, ffmpeg.
