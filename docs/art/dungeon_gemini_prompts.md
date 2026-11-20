# 던전 「고블린 굴」 그림 — 제미나이 프롬프트 4개 (그림 6장, 그대로 복사)

작성: Claude · 2026-11-20 11:35 · 관련: [design/proposal_dungeon_v1.md](../design/proposal_dungeon_v1.md) 6 · 9장 (사용자 결정: 그림은 제미나이로 직접 만듦)

**쓰는 법:** 요청마다 ① 참고 그림을 **끌어다 놓고** ② 아래 상자 하나를 통째로 붙여 넣기. 결과는 **흰 배경 그대로** 주시면 Claude가 배경을 지우고 크기를 맞춥니다. 같은 그림체가 필요하면 같은 채팅방에서 이어 요청합니다.

| # | 그림 | 참고 그림 (끌어다 놓기) | 게임 파일 · 크기 |
| --- | --- | --- | --- |
| ① | 고블린 대장 (보스) 서 있는 모습 1장 | `docs/art/images/ref_goblin.png` | `expedition_sd/mon_goblin_boss_*` (먼저 정지 1장 → 확정되면 움직임 시트는 [sd_motion_workflow.md](sd_motion_workflow.md) 방식) |
| ② | 레어 장신구 「고블린 왕의 인장」 아이콘 | `docs/art/images/ref_gear_icons.png` | `icons/gear_rare_goblin.png` 256×256 |
| ③ | 굴 사냥꾼 세트 3부위 (단검 · 가죽 갑옷 · 부적) 아이콘 | `docs/art/images/ref_gear_icons.png` | `icons/gear_set_goblin_1~3.png` 256×256 |
| ④ | 던전 표시 「고블린 굴」 입구 아이콘 | `docs/art/images/ref_gear_icons.png` | `icons/dungeon_goblin.png` 256×256 |

- 공통 규칙(리소스 규칙): **그림 안에 글자 없음 · 바닥 그림자 없음(코드가 그림)**.
- 그림이 오기 전까지 게임에서는 고블린 그림 크게 + 붉은 기 · 기존 장비 아이콘으로 자리만 잡아 둡니다.

---

## ① 고블린 대장 (보스) → `mon_goblin_boss_idle` (정지 1장 먼저)

```
Create an image. Use the attached image as the exact style reference: a cute chibi (super-deformed, about 2.5 heads tall) 2D fantasy game monster with thick dark outlines, soft cel shading and warm colors. Draw ONE goblin chieftain, the boss of a goblin cave, in the same chibi style and proportions as the attached goblin but clearly stronger and more important: slightly bigger and stockier, green skin, a crude crown made of bent iron and animal teeth, a tattered dark red cape with a fur collar, a heavy spiked wooden club held in both hands, a few scars, a confident grin showing small fangs, standing in a ready idle pose facing slightly to the left (three-quarter view), full body visible from head to feet. Pure plain white background, no ground, no shadow, no text, no frame, nothing else in the image.
```

## ② 레어 장신구 「고블린 왕의 인장」 → `gear_rare_goblin.png`

```
Create an image. Use the attached icons as the exact style reference: hand-painted 2D fantasy RPG item icons with thick dark outlines, soft shading, warm colors, one item centered on a plain background. Draw ONE item icon in the same style: "The Goblin King's Seal", a legendary amulet. A heavy dark-gold signet medallion hanging on a rough iron chain, the medallion is engraved with a goblin skull crest, a glowing deep green gemstone set in the center, small animal fangs hanging around the rim, faint magical green sparkles around it so it looks rare and precious. Centered, filling about 80% of the square canvas. Pure plain white background, no shadow, no text, no frame.
```

## ③ 굴 사냥꾼 세트 3부위 → `gear_set_goblin_1.png`(단검) · `_2.png`(갑옷) · `_3.png`(부적)

```
Create an image. Use the attached icons as the exact style reference: hand-painted 2D fantasy RPG item icons with thick dark outlines, soft shading, warm colors. Draw THREE separate item icons side by side in one row with clear empty space between them, all in the same style and as one matching equipment set called "Cave Hunter set" (the same color theme on all three: dark brown leather, moss green cloth, bone-white goblin fang decorations, small rusty iron rivets). 1) a short hunting dagger with a bone handle wrapped in green cloth and a goblin fang charm on the pommel. 2) a light leather armor vest reinforced with bone plates and a green cloth sash. 3) a small charm amulet made of a carved goblin tooth, green beads and a leather cord. Each item centered in its own area, same size. Pure plain white background, no shadow, no text, no frame.
```

## ④ 던전 표시 「고블린 굴」 입구 → `dungeon_goblin.png`

```
Create an image. Use the attached icons as the style reference: hand-painted 2D fantasy RPG icons with thick dark outlines, soft shading and warm colors. Draw ONE icon of a goblin cave entrance: a dark rocky cave mouth in a small grassy hillside, rough wooden support beams at the entrance, a crude goblin skull totem on a stick beside it, a torch glowing orange inside the darkness, a few bones and a broken shield on the ground. Compact and readable at small size like an item icon, centered, filling about 80% of the square canvas. Pure plain white background, no shadow, no text, no frame.
```
