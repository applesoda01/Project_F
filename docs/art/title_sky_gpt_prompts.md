# 타이틀 배경(하늘 · 원경) GPT 그림 요청표

작성: Claude · 2026-11-19 18:36 · 결정: 사용자 "좀 힘찬 분위기" → 시안 12 C 해돋이 아침 방향 (`docs/design/mockups/test_1119/` 의 `mk_12_title_C.png`) · "필요한 그림 리소스는 GPT로 생성"
규격 기준: [pixel_spec.md](pixel_spec.md) (도트 1칸 = 화면 2px, 화면 1600×900 = 도트 800×450, 배경 팔레트 16색 이내, 반투명 금지, 배경은 캐릭터보다 외곽선 약하게)

## 0. 요약

- 그림 **6종(파일 14장) · GPT 요청 7번** 으로 뽑아 주시면, 흰 배경 지우기 · 도트 크기로 줄이기 · 색 줄이기 · 이음새 맞추기는 Claude가 합니다.
- 하늘 색(파랑 → 금빛)과 햇살 줄기는 **코드로 그립니다** (그림 필요 없음).
- 모든 요청에 **지금 타이틀 화면 한 장**(`docs/art/images/title_now.png`, 돌길 · 집 · 캐릭터가 보이는 것)을 화풍 참고로 함께 올려 주세요.

## 1. 필요한 그림

| # | 이름 (저장 파일) | 개수 | 도트 크기 (가로×세로) | 뒤 → 앞 순서 | 움직임 |
| --- | --- | --- | --- | --- | --- |
| 1 | 해 `sun.png` | 1 | 72×72 | 하늘 바로 앞 | 없음 (빛은 코드) |
| 2 | 구름 `cloud_a~d.png` | 4 | 각 100~220 × 40~70 | 해 앞 | 오른쪽 → 왼쪽으로 천천히 |
| 3 | 먼 산 띠 `far_mountains.png` | 1 | 1600×130 (화면 두 개 너비, 좌우 이어짐) | 구름 앞 | 땅보다 아주 느리게 (약 0.1배) |
| 4 | 가까운 언덕 띠 `near_hills.png` | 1 | 1600×70 (좌우 이어짐) | 산 앞 | 땅의 약 0.3배 |
| 5 | 성채 `castle.png` + 깃발 `flag_0~3.png` | 1 + 4 | 성 220×190 / 깃발 각 24×16 | 언덕 위 (가끔 지나감) | 성은 언덕과 같이, 깃발은 4장 반복 |
| 6 | 새 `bird_0~1.png` | 2 | 각 16×10 | 맨 앞 하늘 | 날갯짓 2장, 무리로 지나감 |

- 저장 위치(게임): `prototype/assets/title_bg/` · 원본(GPT 그대로): `archive/art_source/title_bg/`
- 땅 위쪽 지면선은 도트 y=396 근처입니다. 산 · 언덕 띠의 **아래 끝은 땅에 가려지므로** 아래쪽 20도트는 대충 채워도 됩니다.

## 2. 공통 프롬프트 (모든 요청 앞에 붙임)

```
Create an image. Use the attached screenshot ONLY as the art-style and color reference:
a bright 2D side-scrolling pixel-art fantasy game (cobblestone road, red-tiled wooden houses,
chibi adventurers). Draw in the SAME pixel-art style: clean hard-edged square pixels, no
anti-aliasing, no blur, no gradients inside shapes, flat color areas with 2-3 shading steps,
a limited palette (at most 16 colors), soft and slightly lighter outlines than the characters.
Mood: an energetic, hopeful sunrise morning at the start of an adventure.
Background: plain flat pure white (#FFFFFF). No text, no people, no ground unless asked.
```

## 3. 그림별 요청 (공통 프롬프트 뒤에 붙임)

### 1. 해 `sun.png`
```
Draw ONE rising sun as a pixel-art game sprite: a round warm pale-yellow sun (#FFF3C0 center to
#FFD27A edge) with a thin brighter rim, no rays (rays are drawn separately), centered, large,
filling about 70% of the canvas. Square canvas 1024x1024.
```

### 2. 구름 `cloud_a~d.png` (한 번에 4개)
```
Draw FOUR separate fluffy white cumulus clouds as pixel-art sprites, arranged in a 2x2 grid with
wide white gaps between them so they do not touch. Different shapes: one long flat cloud, one
tall puffy cloud, one small round cloud, one medium cloud with three bumps. Colors: white tops,
very light blue-gray (#DCE8F8) undersides, a faint warm peach (#FFE2C8) edge on the right side
as if lit by a sunrise. Canvas 1536x1024.
```

### 3. 먼 산 띠 `far_mountains.png`
```
Draw a WIDE horizontal strip of distant mountain range as a pixel-art game parallax layer:
soft blue-violet mountains (#7B8FD0, #6C7FC0, highlight #9DB0E6) with a few snow caps, gentle
atmospheric haze, peaks of varied heights, the strip fills the lower 60% of the canvas and the
top is empty white. The left edge and right edge must have the SAME height so the strip can
loop seamlessly. No trees, no buildings. Canvas 1536x1024.
```

### 4. 가까운 언덕 띠 `near_hills.png`
```
Draw a WIDE horizontal strip of rolling green hills as a pixel-art game parallax layer:
bright fresh green hills (#5CAE5C, #479A4C, highlight #7CC86A) with a few tiny round trees and
bushes on the ridges, the strip fills the lower 40% of the canvas and the top is empty white.
The left edge and right edge must have the SAME height so the strip can loop seamlessly.
Canvas 1536x1024.
```

### 5. 성채 `castle.png` · 깃발 `flag_0~3.png`
성채:
```
Draw ONE distant fantasy castle as a pixel-art sprite seen from the side: a stone keep with
battlements and three slender towers with pointed blue-slate roofs, a few warm lit windows,
cool blue-gray stone (#4A5C8E, #5E70A2, highlight #8094C4) so it reads as far away. Put an
empty flagpole on top of each tower (no flags; flags are separate). Centered, filling about
70% of the canvas. Canvas 1024x1024.
```
깃발 (4장 한 줄):
```
Draw FOUR frames of a small red pennant flag waving in the wind as a pixel-art sprite sheet,
left to right in one row with equal spacing, each frame the same size, flag only (no pole),
bright red (#E0483A) with a darker red (#A8302A) shade, the frames loop smoothly
(frame 4 leads back to frame 1). Canvas 1536x1024.
```

### 6. 새 `bird_0~1.png`
```
Draw TWO frames of a small dark-blue bird flying, side view, as a pixel-art sprite sheet:
frame 1 wings up, frame 2 wings down, side by side with a wide gap, simple silhouette with one
lighter highlight color (#16305E, #2C4C86). Canvas 1536x1024.
```

## 4. 잘 안 나올 때

- 흐릿하거나 그라데이션이 생기면 끝에 `Strict pixel art, every edge is a hard pixel edge.` 를 더합니다.
- 띠(3 · 4)의 양 끝 높이가 다르면 그대로 주셔도 됩니다. Claude가 좌우를 이어 붙여 맞춥니다.
- 색이 너무 어둡거나 탁하면 `brighter and more saturated, sunny morning` 을 더합니다.
- 결과 원본 그대로(흰 배경) 주시면 됩니다. 이름은 위 표의 이름으로 붙여 주시면 편합니다.

## 5. 받은 뒤 Claude가 하는 일

1. 흰 배경 → 투명, 여백 자르기 (반투명 0 · 255만)
2. 위 표의 도트 크기로 가장 가까운 픽셀 축소 → 16색 이내로 줄이기
3. 산 · 언덕 띠 좌우 이음새 맞추기
4. `title.html` 에 층 넣기: 코드 하늘(파랑 → 금빛) + 햇살 줄기 → 해 → 구름 → 먼 산 → 언덕 + 성채 → 기존 땅 · 캐릭터. 로고 뒤 옅은 그늘, 「PRESS ANY KEY」 그림자
5. 1280×720 · 1920×1080 으로 찍어 확인 → 시안 확인 뒤 PC 저장
