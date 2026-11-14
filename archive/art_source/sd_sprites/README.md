# SD 스프라이트 (플랜 B)

대상: 모험가 10종 (cleric_f, rogue_f, warrior_m, archer_m, mage_m, cleric_m, rogue_m, mage_f, warrior_f, archer_f)

## 구성
- `sit/<char>/sit_NN.png`: 앉기 구간 프레임 (서 있음 → 앉은 자세 + 안정화 6프레임). 720×700 RGBA, 의자 기준 정렬 완료. 일어서기 = 역재생, 앉은 상태 숨쉬기·깜빡임은 코드 처리 예정.
- `sit/aligned/`: 앉은 최종 자세 이미지와 `meta.json` (의자 중심 x=360, 바닥 y=620, 의자 높이 390).
- `sit/sit_chair_placement.json`: 종별 의자 오프셋(cx, by). 10종 사용자 확정.
- `walk/<char>/walk_NN.png`: 걷기 1주기 24프레임(30fps 기준 0.8초). 640×800 RGBA, 서 있는 기준(키 516px, 바닥 y=787) 정렬.
- `idle/<char>/idle_NN.png`: 서 있기 대기 72프레임. 640×800 RGBA, 걷기와 같은 서 있는 기준(키 약 516px, 바닥 y≈787). `idle/<char>/idle.gif`는 미리보기(프레임당 40ms).
- `run/<char>/run_NN.png`: 달리기 1주기 루프(직업마다 18~41프레임, 24fps). 640×800 RGBA, 서 있는 기준(키 516px, 바닥 y=787, 가운데 x=320). `run.json`에 원본 영상·시작 프레임·배율, `run.gif`는 미리보기. 2026-11-14 기준 **10종 모두** (궁수 여는 이음매 보정본 24프레임, 성직자 남은 33 → 20프레임으로 속도 맞춤, 최근 5종은 자홍 테두리 · 윤곽 색 정리). 방식은 `docs/art/sd_motion_workflow.md`.
- `lina/<motion>/<motion>_NN.png`: 접수원 리나 5모션(idle, greet, guide, paper, thanks) 각 72프레임. 256×256 RGBA, 발끝 y=244, 캐릭터 높이 약 214px, 24fps. `lina/<motion>/<motion>.gif`는 녹색 배경 미리보기, `lina/lina_<motion>_sheet_12x6.png`는 12×6 시트.
- `*/sitdown.gif`, `walk/<char>/walk.gif`: 미리보기(원본 정렬본 기준).

## 제작 방식
- 앉기: ComfyUI + LTX 2.5, 시작=서 있는 원본, 끝=앉은 자세(LTXVAddGuide). 종별 최적 시드 채택.
  - 시드: cleric_f s3006, rogue_f s3000, warrior_m s3000, archer_m s3002, mage_m s3000, cleric_m s3002, rogue_m s3002, mage_f s3002, warrior_f sitkf2_s3000, archer_f sitkf4_s3016.
- 걷기: LTX 영상에서 발걸음 주기를 재서 24프레임으로 정렬. archer_f는 walk10 s1016(발 주기 27프레임 → 24프레임), 루프 시작 눈 깜빡임 5프레임은 눈 영역을 이웃 프레임으로 교체.
- 후처리(전체 적용): 약한 선 정리(가장자리 잡티 제거, 평탄부 노이즈 감소, 선 선명화) + FSRCNN 2배 확대 후 원래 크기로 축소.

## 보간 보정 (2026-11-14)
- 원본 영상이 같은 그림을 2~3장씩 반복(실제 초당 8장)해 끊겨 보이던 모션을 ComfyUI RIFE v4.26으로 사이 그림을 채워 교체: **앉기** 궁수 여 · 궁수 남 · 도적 여 · 도적 남 · 마법사 여, **대기** 궁수 남 · 마법사 남. 장수 · 정렬은 그대로, 원래 그림이 있던 장은 원본 유지. 게임 시트(`prototype/assets/lobby_iso/chr/*_sit.webp`, `*_idle.webp`)도 다시 만듦 (webp 품질 88, 앉기 칸 180×175 · 대기 칸 160×200 · 대기는 2장마다 1장)

## 선 정리 (Real-ESRGAN, 2026-11-14 반영)
- **달리기 10세트 · 앉기 10명 · 대기 10명(72장 전부)** 프레임을 Real-ESRGAN anime_6B로 정리해 교체(1,360장): 투명 테두리 번짐 방지(bleed) → ×4 확대 → Lanczos로 원래 크기 → **원래 알파 그대로 다시 씌움**(외곽 모양 · 크기 변화 없음). ComfyUI에서 묶음(애니메이션 PNG) 단위로 처리, 장당 16~22초.
- 효과: 선이 또렷해지고 압축 얼룩 · 번진 색이 줄어듦. 정지 부분 떨림(원본에서 거의 안 변하는 픽셀의 장 사이 변화)은 대기 0.7~1.3 → 0.8~2.0, 앉기 1.0~1.4 → 1.3~2.1 (0~255 단계, 눈에 띄지 않음).
- 게임 시트 `prototype/assets/lobby_iso/chr/*_sit.webp` · `*_idle.webp` 20장을 정리본으로 다시 만듦 (같은 칸 · 배치 · WEBP 품질 88, Lanczos 1/4 축소). 용량 4,111KB → 4,127KB (+0.4%).

## 알려진 한계
- 앉기: mage_m은 중간에 몸이 기울고, cleric_m은 옷단에 원형 흔적이 약하게 남음.
- 걷기: 전사 남·성직자 남은 기준 이미지가 달라 색 보정 없이 키만 맞춤. 종별 움직임 크기 차이(키 대비 프레임당 0.45%~1.03%) 보정은 미적용. 여궁수 상하 흔들림(약 16px)은 미보정.
