# 타이틀 배경 그림 — 제미나이 프롬프트 7개 (그대로 복사)

작성: Claude · 2026-11-19 18:38 · 방향: 시안 12 C 해돋이 아침 · 규격·후처리는 [title_sky_gpt_prompts.md](title_sky_gpt_prompts.md)

**쓰는 법:** 요청마다 ① 참고 그림 `docs/art/images/title_now.png` 를 **끌어다 놓고** ② 아래 상자 하나를 통째로 붙여 넣기. 결과는 흰 배경 그대로 주시면 됩니다. (제미나이는 참고 그림을 붙여 넣기 대신 끌어다 놓아야 거절되지 않음 — pixel_spec.md 6장)

---

## ① 해 → `sun.png`

```
Create an image. Use the attached screenshot only as the style and color reference (bright 2D side-scrolling pixel-art fantasy game). Draw ONE rising sun as a pixel-art game sprite: a big round warm pale-yellow sun, lighter in the center and golden at the edge, with a thin bright rim. No rays. Strict pixel art: hard square pixel edges, no anti-aliasing, no blur, at most 16 colors. Centered, filling about 70% of the image. Plain pure white background. No text. Square image.
```

## ② 구름 4개 → `cloud_a~d.png`

> 2026-11-19: 아래 첫 프롬프트로 뽑은 구름은 검은 외곽선이 진해 배경과 따로 놀아서, **외곽선 없는 판**(맨 아래 「② 구름 다시」)으로 바꿈. 게임에 들어간 것은 다시 뽑은 쪽

```
Create an image. Use the attached screenshot only as the style and color reference (bright 2D side-scrolling pixel-art fantasy game). Draw FOUR separate fluffy white cumulus clouds as pixel-art game sprites, placed in a 2 by 2 grid with wide white space between them so they never touch: one long flat cloud, one tall puffy cloud, one small round cloud, one medium cloud with three bumps. White tops, very light blue-gray undersides, a faint warm peach edge on the right side like sunrise light. Strict pixel art: hard square pixel edges, no anti-aliasing, no blur, at most 16 colors. Plain pure white background. No text. Wide image.
```

## ③ 먼 산 띠 → `far_mountains.png`

```
Create an image. Use the attached screenshot only as the style and color reference (bright 2D side-scrolling pixel-art fantasy game). Draw a WIDE horizontal strip of a distant mountain range for a parallax background: soft blue-violet mountains with a few small snow caps and peaks of different heights. The mountains fill only the lower 60% of the image; the top is empty white. The left edge and the right edge are the same height so the strip can repeat seamlessly. No trees, no buildings. Strict pixel art: hard square pixel edges, no anti-aliasing, no blur, at most 16 colors, soft outlines. Plain pure white background. No text. Wide image.
```

## ④ 가까운 언덕 띠 → `near_hills.png`

```
Create an image. Use the attached screenshot only as the style and color reference (bright 2D side-scrolling pixel-art fantasy game). Draw a WIDE horizontal strip of bright rolling green hills for a parallax background, with a few tiny round trees and bushes on the ridges. The hills fill only the lower 40% of the image; the top is empty white. The left edge and the right edge are the same height so the strip can repeat seamlessly. Fresh, sunny, saturated greens. Strict pixel art: hard square pixel edges, no anti-aliasing, no blur, at most 16 colors, soft outlines. Plain pure white background. No text. Wide image.
```

## ⑤ 성채 → `castle.png`

```
Create an image. Use the attached screenshot only as the style and color reference (bright 2D side-scrolling pixel-art fantasy game). Draw ONE distant fantasy castle as a pixel-art game sprite, seen from the side: a stone keep with battlements and three slender towers with pointed blue-slate roofs, a few small warm-lit windows, cool blue-gray stone so it looks far away. Each tower top has an EMPTY flagpole with no flag. Strict pixel art: hard square pixel edges, no anti-aliasing, no blur, at most 16 colors, soft outlines. Centered, filling about 70% of the image. Plain pure white background. No ground, no text. Square image.
```

## ⑥ 깃발 4장 → `flag_0~3.png`

```
Create an image. Use the attached screenshot only as the style and color reference (bright 2D side-scrolling pixel-art fantasy game). Draw a pixel-art sprite sheet of FOUR animation frames of a small bright red pennant flag waving in the wind, flag cloth only with no pole, in one row from left to right with equal spacing, every frame the same size, and the 4th frame leads smoothly back to the 1st. Bright red with a darker red shade. Strict pixel art: hard square pixel edges, no anti-aliasing, no blur. Plain pure white background. No text. Wide image.
```

## ⑦ 새 2장 → `bird_0~1.png`

```
Create an image. Use the attached screenshot only as the style and color reference (bright 2D side-scrolling pixel-art fantasy game). Draw a pixel-art sprite sheet of TWO animation frames of a small dark-blue bird flying, side view facing left: frame 1 wings up, frame 2 wings down, side by side with wide white space between them. Simple silhouette with one lighter blue highlight. Strict pixel art: hard square pixel edges, no anti-aliasing, no blur. Plain pure white background. No text. Wide image.
```

---

**잘 안 나올 때 (해당 요청 끝에 덧붙이기)**
- 흐릿하거나 그라데이션이 보이면 → `Every edge must be a hard pixel edge. No gradients.`
- 너무 어둡거나 탁하면 → `Brighter and more saturated, sunny morning.`
- 띠(③ ④)의 양 끝 높이가 달라도 그대로 주세요. 이음새는 Claude가 맞춥니다.

---

## ② 구름 다시 (외곽선 없음 · 실제로 쓴 것) — 참고 그림은 먼 산 그림

```
Create an image. Use the attached mountain image only as the style reference. Draw FOUR separate soft fluffy cumulus clouds as pixel-art sprites in a 2 by 2 grid with wide white space between them: one long flat cloud, one tall puffy cloud, one small round cloud, one medium cloud. NO outlines at all — shapes are defined only by color: bright white tops, two steps of very light blue shading at the bottom, a thin warm peach highlight on the right edge like sunrise light. Same soft painterly pixel style as the mountains. Strict pixel art: hard square pixel edges, no anti-aliasing, no blur, at most 8 colors. Plain pure white background. No text. Wide image.
```
