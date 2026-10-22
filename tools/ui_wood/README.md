# 우드 대화창 재조립

Gemini 1차 우드 시안(`docs/art/dialog/gemini_wood_v1.png`)에서 재료(바깥 나무 띠, 양피지, 놋쇠 모서리, 이름표, 넘김 화살표)를 뽑아 **한 겹 틀** 대화창으로 다시 조립합니다.

- `build_box.py` — `build(W, H, T, bright)` : 너비·높이·틀 두께·밝기로 대화창 한 장 생성 (투명 PNG)
- `compose.py` — 전체 시안 합성. `python compose.py 24 18` → `wood_v2_T24.png`, `wood_v2_T18.png`

경로는 작업 환경 기준으로 적혀 있으니 쓰기 전에 맞춰 주세요.
- `scene.py` — 게임 화면(1920×1080)에 틀 18px 대화창을 얹고 양피지 불투명도별 시안(100·85·70·55%) 생성
