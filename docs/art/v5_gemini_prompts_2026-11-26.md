# V5 새 그림 — 제미나이 프롬프트 (2026-11-26 야간 · 그대로 복사)

작성: Claude · 2026-11-26 야간 · 관련: [todo1125.md](../todo1125.md) R3 · R4 · R5 · R7 · R8 · R9 · [plan/야간작업_2026-11-26.md](../plan/야간작업_2026-11-26.md) G1 ~ G5

**쓰는 법 (지금까지와 같음):** 요청마다 ① 참고 그림을 **끌어다 놓고** ② 상자 하나를 통째로 붙여 넣기. 결과는 **흰 배경 그대로** 주시면 Claude가 배경을 지우고 크기를 맞춥니다. 같은 그림체가 필요하면 같은 채팅방에서 이어 요청합니다.

- 공통 규칙(리소스 규칙): **그림 안에 글자 없음 · 바닥 그림자 없음**.
- **이름은 모두 [임시]입니다.** 이름이 바뀌어도 그림은 대개 그대로 쓸 수 있지만, 모양이 이름에 묶인 것(보스 뱃지)은 다시 만들 수 있습니다.
- 사람 초상(사냥꾼 · 탐험가 · 점술가)은 이 문서가 아니라 ComfyUI로 후보를 만들었습니다(야간 작업 목록 G6).

| # | 그림 | 참고 그림 (끌어다 놓기) | 게임 파일 · 크기 | 요청 수 |
| --- | --- | --- | --- | :---: |
| ① | F급 새 소재 아이콘 10종 + 옛 동전 | `prototype/assets/icons/mat_slay_F.png` 등 소재 아이콘 2 ~ 3장 | `icons/mat_*.png` 256×256 | 4 (석 장씩) |
| ② | 보스가 주는 물건 8종 | `docs/art/images/ref_gear_icons.png` | `icons/boss_*.png` 256×256 | 3 |
| ③ | 보스 뱃지 10개 + 뱃지 판 | `docs/art/images/ref_gear_icons.png` | `icons/badge_*.png` 256×256 · `deco/badge_board.png` | 4 |
| ④ | 새 시설 3종 (로비 바닥 2칸 × 2칸) | 로비 테이블 세트 그림 | `deco/fac_*.png` | 3 |
| ⑤ | 점술가의 천막 (마을 지도) | `sprites/guild_v1.png` | `sprites/seer_tent.png` | 1 |

---

## ① F급 새 소재 아이콘 → `icons/mat_*.png` (256×256)

석 장씩 한 줄로 요청합니다. 같은 채팅방에서 이어 갑니다.

**공통 앞부분** (네 요청 모두 이 문장으로 시작):
```
Create an image. Use the attached icons as the exact style reference: hand-painted 2D fantasy RPG crafting material icons with thick dark outlines, soft shading, warm colors, one item centered on a plain background. Draw THREE separate material icons side by side in one row with clear empty space between them, all in exactly the same style, size and framing as the attached icons. Plain flat pure white background, no text, no labels, no cast shadow.
```

**①-1** (공통 앞부분 뒤에 붙임)
```
Left: "Boar Tusk" — one large curved ivory-yellow boar tusk with a chipped tip and a darker root end. Middle: "Boar Loin" — a thick fresh cut of red boar meat with a white fat edge, tied with a short string. Right: "Oak Log" — a short sturdy oak log with visible growth rings on the cut end and rough brown bark.
```

**①-2**
```
Left: "Tough Hide" — a folded piece of thick dark-brown leather hide with stitched edges and a rough fur side showing. Middle: "Clear Mana Stone" — a small clear pale-blue crystal shard with a soft inner glow and a few facets. Right: "Fragrant Mushroom" — a cluster of three plump golden-brown mushrooms with a faint aroma swirl.
```

**①-3**
```
Left: "Fine Cotton" — a neatly rolled bolt of soft cream-white cotton cloth tied with a thin ribbon. Middle: "Rare Herb" — a bundle of bright green herb leaves with tiny white flowers, tied with twine. Right: "Old Iron Scrap" — a dark rusty piece of antique iron, part of an old ornate hinge with a worn rivet.
```

**①-4**
```
Left: "Big Carp" — one large golden-scaled river carp with a slightly open mouth. Middle: "Old Coin" — one worn ancient bronze coin with a square hole in the middle and faded engraved symbols, a little green patina at the edge. Right: leave this slot empty (no third icon).
```
- 마지막 요청은 두 장입니다(옛 동전 = 점술가가 받는 「옛 물건」 줄의 F급).

---

## ② 보스가 주는 물건 8종 → `icons/boss_*.png` (256×256)

17-6에서 정한 아홉 가지 가운데 레어 장비를 뺀 여덟입니다(레어 장비는 지금 장비 아이콘 형식으로 따로).

**공통 앞부분:**
```
Create an image. Use the attached icons as the exact style reference: hand-painted 2D fantasy RPG item icons with thick dark outlines, soft shading, warm colors. Draw THREE separate special item icons side by side in one row with clear empty space between them, all in the same style and framing as the attached icons. These are rare reward items, so give each a small soft glow. Plain flat pure white background, no text, no cast shadow.
```

**②-1**
```
Left: "Liquor of Courage" — a small round bottle of deep red liquor with a lion-head stopper. Middle: "Fellowship Liquor" — a wide clay jug with two cups tied to its neck, warm amber drink. Right: "Liquor of Reconciliation" — a slim pale-green bottle with a white dove-shaped stopper.
```

**②-2**
```
Left: "Habit Remedy" — a small corked vial of clear blue potion with a curled ribbon label (no letters). Middle: "Secret Manual" — an old leather-bound book with brass corners and a glowing sigil on the cover (no letters). Right: "Star Fragment" — a small shining five-pointed golden crystal fragment floating above a tiny cloth pouch.
```

**②-3**
```
Left: "Care Package" — a cloth-wrapped bundle tied with string, with bread, an apple and a small jar peeking out. Middle: "Letter of Introduction" — a folded parchment letter sealed with red wax and a ribbon. Right: leave this slot empty (no third icon).
```

---

## ③ 보스 뱃지 10개 → `icons/badge_*.png` · 뱃지 판 → `deco/badge_board.png`

포켓몬 체육관 뱃지 느낌(사용자 15:45). 보스마다 하나, 모두 같은 크기의 작은 금속 휘장입니다. 07-5: 벽 한 칸의 「뱃지 판」에 빈 자리 10개.

**공통 앞부분:**
```
Create an image. Use the attached icons only as the style reference: hand-painted 2D fantasy RPG icons with thick dark outlines, soft shading, warm colors. Draw THREE separate collectible badges side by side in one row with clear empty space between them. Each badge is a small shiny metal emblem of the same size and the same round-ish shape family (like trophy badges a hero collects), each with its own symbol in relief and its own main color. Plain flat pure white background, no text, no cast shadow.
```

**③-1**
```
Left: wolf-pack leader badge — bronze, a howling wolf head over two crossed claw marks. Middle: one-eyed boar badge — copper, a boar head with one eye scarred shut. Right: great-antler stag badge — forest green enamel with gold, a stag head with huge antlers.
```

**③-2**
```
Left: fallen giant tree badge — brown and gold, a huge fallen tree trunk across a path. Middle: old treasure map badge — parchment-yellow enamel with a red X mark and a tiny compass. Right: sealed stone chamber badge — grey stone-colored metal with a closed door and a glowing seal circle.
```

**③-3**
```
Left: wagon bandit badge — dark steel, a wagon wheel with a crossed dagger. Middle: plague village badge — white and teal, a small cottage with a healing herb leaf over it. Right: slime in the well badge — blue-green enamel, a stone well with a cute slime peeking out.
```

**③-4**
```
Left: collapsed mine badge — dark iron and orange, a mine entrance with broken support beams and a pickaxe. Middle: a wooden wall-mounted badge display board, about twice as wide as it is tall, dark polished wood frame with a deep red velvet inside, ten round empty slots in two rows of five, small brass nails at the corners, viewed straight from the front. Right: leave this slot empty.
```

---

## ④ 새 시설 3종 → 로비 바닥 2칸 × 2칸 (07-1)

로비 그림과 같은 비스듬한 시점. 테이블 세트 그림을 참고로 넣습니다.

**공통 앞부분:**
```
Create an image. Use the attached image as the exact style and camera reference (the same isometric angle, scale and hand-painted cozy fantasy guild interior style). Draw ONE piece of guild hall furniture that stands on the floor and takes a 2 by 2 tile square footprint: {설명}. No people. Plain flat pure white background, no floor, no cast shadow, no text.
```

| 시설 | {설명} 칸에 넣을 말 |
| --- | --- |
| 정비대 (04) | a blacksmith's maintenance workbench: a heavy wooden workbench with an iron anvil on one end, a whetstone wheel, hammers and tongs hanging on a small rack, a bucket of water, a few leather straps |
| 점술가의 자리 (19) | a fortune teller's corner: a small round table with a dark blue tablecloth with gold stars, a glowing crystal ball on a stand, a few old coins and cards on the table, a short folding screen with moon patterns behind it, two small stools |
| 약초 시설 (05) | a herbalist's station: a wooden shelf with small potion bottles and jars, bundles of drying herbs hanging above, a small brewing pot over a little brazier, a mortar and pestle on the counter |

- 레벨마다 바뀌는 모습(정비대 Lv 2 화덕이 붙음 등)은 08의 공통 규칙이 정해진 뒤에 따로 요청합니다.

---

## ⑤ 점술가의 천막 → 마을 지도 (19-3 · 19-4)

마을 건물 프롬프트 표의 공통 프롬프트를 그대로 씁니다([town_building_prompts.md](town_building_prompts.md)). {건물 설명}과 크기만:

- 발자국: 1×1 (나중에 그 자리에 마법학원이 섬 — 마법학원은 2×2이므로 놓을 칸은 마법학원 자리의 한 귀퉁이)
- {건물 설명}:
```
a wandering fortune teller's tent at the village edge: a round canvas tent in deep navy blue and faded gold stripes, a pointed top with a small star-shaped ornament, the front flap tied open showing a warm lantern glow and a crystal ball inside, strings of old coins and small charms hanging at the entrance, a small wooden sign post without letters
```
- 주의: 마을 건물 규칙상 마젠타 · 분홍 · 보라는 피합니다(지금 마법 학원 설명의 「purple roof」는 그대로 둠).
