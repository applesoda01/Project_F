# 메뉴 잠금 그림 — 제미나이 프롬프트 3개 (그대로 복사)

작성: Claude · 2026-11-23 14:44 (14:57 ①②③ 생성 완료 · 15:00 ② 쓰지 않음) · 설계: [메뉴_잠금_설계.md](../design/메뉴_잠금_설계.md) · 사용자 결정: "자물쇠라던지 이런건 새롭게 제미나이를 통해 그리는 게 좋겠어"

**쓰는 법:** 요청마다 ① 참고 그림 `docs/art/images/menu_bar_now.png`(지금 아래 메뉴)를 **끌어다 놓고**, ② 아래 상자 하나를 통째로 붙여 넣습니다. 결과는 흰 배경 그대로 주시면 됩니다. 제미나이는 참고 그림을 붙여 넣으면 거절할 때가 있어서 끌어다 놓아야 합니다.

메뉴 아이콘은 도트가 아니라 **손그림 게임 아이콘**(굵은 진갈색 외곽선 · 따뜻한 색 · 부드러운 명암)이므로 같은 화풍으로 요청합니다.

| # | 파일 | 게임 안 크기 | 쓰는 곳 |
| --- | --- | --- | --- |
| ① | `lock_badge.png` | 32×32 (책갈피용 22×22는 줄여서) | 회색 칸 오른쪽 위 · 잠김 말풍선 · 책갈피 |
| ② | ~~`slot_unknown.png`~~ | — | **쓰지 않음** (15:00 사용자: 잠긴 칸은 모두 회색 + 자물쇠). 원본만 archive에 보관 |
| ③ | `unlock_burst_0~3.png` | 각 160×160 | 열리는 순간 빛 번짐 (4장 반복 없이 한 번) |

---

## ① 자물쇠 배지 → `lock_badge.png`

```
Create an image. Use the attached screenshot only as the style and color reference (a cozy fantasy guild-management game menu bar with hand-painted cartoon icons, thick dark-brown outlines, warm colors, soft shading). Draw ONE small padlock icon in the SAME hand-painted game-icon style: a chunky golden-brass padlock body with a rounded steel shackle, a tiny dark keyhole, a soft highlight on the top-left, and a thick dark-brown outline like the reference icons. It must still read clearly when shrunk to 32 pixels, so keep shapes simple and bold. Centered, filling about 75% of the image. Plain pure white background. No text, no shadow on the ground. Square image.
```

## ② 「?」 빈 자리 → `slot_unknown.png` (쓰지 않음 · 기록용)

```
Create an image. Use the attached screenshot only as the style and color reference (a cozy fantasy guild-management game menu bar with hand-painted cartoon icons, thick dark-brown outlines, warm colors, soft shading). Draw ONE "mystery slot" icon for a menu that is not unlocked yet: a soft rounded-square parchment plate, slightly darker cream than the menu bar, with a gently embossed brown question mark in the middle and a faint dashed border, low contrast so it feels quiet and secret, not like an error. Same hand-painted style with soft outlines. Centered, filling about 80% of the image. Plain pure white background. No text other than the question mark. Square image.
```

## ③ 열리는 빛 번짐 4장 → `unlock_burst_0~3.png`

```
Create an image. Use the attached screenshot only as the style and color reference (a cozy fantasy guild-management game with hand-painted cartoon icons, warm colors). Draw a sprite sheet of FOUR animation frames, in one row from left to right with equal spacing and every frame the same size, showing a magical "unlocked!" light burst: frame 1 a small bright golden spark, frame 2 a round warm glow with short light rays, frame 3 the largest burst with twelve light rays and a few tiny star sparkles, frame 4 the burst fading out into scattered small sparkles. Warm golden yellow and soft white, hand-painted game effect style, no outlines on the light. The center of each frame stays empty enough for an icon to sit on top. Plain pure white background. No text. Wide image.
```

---

**잘 안 나올 때 (해당 요청 끝에 덧붙이기)**
- 너무 사실적이거나 3D처럼 나오면 → `Flat hand-painted 2D game icon, not 3D, not realistic.`
- 외곽선이 약하면 → `Thick dark-brown outline like the reference icons.`
- ③이 한 장만 나오면 → `Four separate frames side by side, same size.`

**받은 뒤 Claude가 하는 일:** 흰 배경을 투명으로 바꾸고 여백을 자릅니다. 위 표의 크기로 줄이고, ③은 네 장으로 나눕니다. 결과는 `prototype/assets/ui/hud/`에 넣고, 원본은 `archive/art_source/menu_lock/`에 보관합니다. 그다음 시안 위에 다시 얹어 1280 · 1920으로 확인하고 보여 드립니다.
