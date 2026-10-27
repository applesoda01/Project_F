# 배속 단추 디자인 의뢰서 (GPT 이미지 생성용)

작성일 2026-10-27 · 용도: 하단 좌측 배속 바에서 마우스를 올리면 나타나는 둥근 단추 1×·2×·4×

## 한눈에 보기

- 만들 것: 둥근 단추 **2종** (평소 / 선택됨). 숫자는 그림에 넣지 않고 게임에서 글자로 올립니다.
- 크기: 한 개 **132×132px** (게임에서 약 48px로 축소 표시, 2.75배 여유)
- 배경: 단색 마젠타 `#FF00FF` (이후 투명으로 오려냄)
- 참고 이미지로 **상단 HUD 명패 그림**(`prototype/assets/ui/lina_menu/btn_selected.png`)을 함께 첨부

## 프롬프트 (그대로 붙여 넣기)

```
Attach reference: the wooden plaque UI (dark walnut frame, cream parchment center, small gold studs).
Design a new ROUND button in exactly the same art style as the reference plaque.

Subject: a single circular game UI button, front view, perfectly circular, centered.
- Outer ring: dark walnut wood frame, same wood tone, subtle top highlight and thin darker inner edge line as the reference.
- Center: flat cream parchment disc with a very subtle paper texture, same color as the reference.
- Two small round gold studs (same as the reference) at the 3 o'clock and 9 o'clock positions on the ring.
- Soft baked drop shadow under the bottom edge only (same softness as the reference), no glow.
- NO text, NO numbers, NO icons. The center must stay empty.

Make TWO versions side by side on one image, same size, same position of studs, evenly spaced:
 A) Normal: parchment center.
 B) Selected: same ring, but the center disc is filled with dark brown wood color (#5A3A22) with a thin cream inner rim, so cream text can sit on it.

Style: clean glossy casual mobile game UI, hand-painted look, soft shading, 2.5D, high resolution.
Background: flat solid magenta #FF00FF, no gradient, no floor shadow beyond the baked drop shadow. Square canvas 2048x1024.
```

## 받은 뒤 작업 (제가 진행)

1. 마젠타 배경 제거 → 각 단추 132×132 투명 PNG로 분리 (`assets/ui/hud/speed_btn.png`, `speed_btn_on.png`)
2. 게임 단추 CSS를 이미지로 교체(`--cd` 지름 값으로 크기 조절), 숫자는 코드 글자
3. 조절기 v5에서 지름·간격·글자 위치 확인

## 체크 포인트 (생성물 확인 시)

- 양쪽 징 위치가 두 장에서 같은가
- 그림자 방향이 아래쪽 하나뿐인가 (이중 그림자 금지 — 지난번 명패 문제)
- 원이 찌그러지지 않았는가, 숫자·무늬가 들어가지 않았는가
- 상단 HUD 명패와 나무색·징 색이 같은가
