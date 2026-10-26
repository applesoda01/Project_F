# 가구(탁자·의자) 다시 만들기 — 정면 15° 통일

결정(2026-10-26): 카운터(배경 v3)와 시점이 어긋나서 탁자·의자를 모두 새로 만든다. 범위는 Lv1·Lv2 전부, 탁자 2종 + 의자 2레벨 × 3방향(앞·뒤·옆).

## 왜 다시 만드는가

| 대상 | 측정 | 해석 |
| --- | --- | --- |
| 카운터 | 윗면이 얇은 띠로만 보임 | 정면에서 약 10° 안팎 |
| 현재 탁자 | 윗면 타원 180×99 (비율 0.55) | 위에서 약 33° 내려다본 모양 |
| 목표 | 윗면 타원 세로 ÷ 가로 = **0.26** | 정면 약 15°, 카운터·바닥과 같은 시점 |

비교 이미지와 규격은 `furniture_angle_guide.png`.

## 규격 (게임 화면 1920×1080 기준, 파일은 2배)

| 항목 | 탁자 | 의자 |
| --- | --- | --- |
| 파일 크기 | 640×400 | 192×256 |
| 화면 크기 | 320×200 | 96×128 |
| 기준점 | 발밑 가운데 | 발밑 가운데 (3방향 모두 같은 발밑선) |
| 파일 이름 | `table_lv1.png`, `table_lv2.png` | `chair_lv1_front·back·side.png`, `chair_lv2_front·back·side.png` |
| 윗면/좌석 | 윗면 지름 약 360(@2x), 윗면 중심은 발밑에서 위로 약 130(화면) | 좌석 면은 얇은 평행사변형(깊이 ≈ 26%) |

옆(side)은 오른쪽을 향한 모습만 만든다(왼쪽은 코드에서 뒤집기). 투명 배경은 Gemini가 만들지 못하므로 **흰 배경**으로 받아 제가 지운다.

## 도면 (2026-10-26 추가)

`blueprint/`에 정면 15° 선화 도면이 있다(탁자 1장, 의자 앞·뒤·옆, 3방향 한 장 시트, ControlNet용 반전본). **Gemini 요청마다 도면을 함께 첨부**하고 "도면의 형태·비율·시점을 그대로 유지해 완성된 게임 소품으로 그려 줘"라고 덧붙인다. 설명은 [blueprint/README.md](blueprint/README.md).

## Gemini 요청 순서

첨부 2장: `lobby_bg_1920x1080.png`(배경의 색·질감 기준), `furniture_angle_guide.png`(시점 기준). 요청문은 영어로, 한 번에 한 가지씩, 새 대화에서 시작한다(편집 요청은 무시되는 경우가 많음).

### 1. 탁자 Lv1

```
Draw one small round wooden tavern table for a 2D fantasy guild-hall game, in the same clean anime game-art style and palette as the attached lobby background.
Camera: straight-on front view tilted down only about 15 degrees. The tabletop is a thin flat ellipse whose height is about 26% of its width. No three-quarter view, no top-down view.
Simple sturdy design: plain plank top with a thin rim, one central pedestal leg with a small round base. Warm natural wood.
Show only the table, centered, on a solid pure white background, no shadow, no floor, no text.
```

### 2. 탁자 Lv2

탁자 Lv1 결과를 첨부하고 새 대화에서:

```
Draw the upgraded version of the attached table: same size, same camera angle (front view tilted down about 15 degrees, tabletop ellipse height about 26% of its width) and same footprint, but finer craft: carved rim, darker polished wood, a brass band around the pedestal.
Only the table, centered, solid pure white background, no shadow, no text.
```

### 3. 의자 Lv1 (3방향 한 장)

```
Draw one simple wooden chair three times on a single image, in the same clean anime game-art style and palette as the attached lobby background: left = front view, middle = back view, right = right-side profile view.
All three share the same camera: straight-on, tilted down about 15 degrees, so the seat is a thin flat parallelogram (depth about 26% of its width), and all three stand on the same baseline at the same size.
Plain wooden seat and straight backrest, four legs. Warm natural wood.
Solid pure white background, no shadows, no text, each chair clearly separated.
```

### 4. 의자 Lv2

의자 Lv1 결과를 첨부하고:

```
Draw the upgraded version of the attached chair set: same three views, same camera angle, same size and baseline, but with a red cushion on the seat, a shaped backrest and brass nails. Solid pure white background, no shadows, no text.
```

## 받은 뒤 검수

1. 탁자 윗면 타원의 세로 ÷ 가로가 0.22~0.30 안인지 (가이드 이미지 위에 겹쳐 확인)
2. 의자 3방향의 크기·발밑선이 같은지
3. 방(석재+하늘색) 위에 올렸을 때 카운터와 같은 시점으로 보이는지

통과하면 제가 흰 배경을 지우고 규격(640×400, 192×256)에 맞춰 `prototype/assets/furniture/`에 넣는다. 좌석 위치 맞춤(의자 ±104 ↔ 좌석 ±88)과 옆 의자 좌석(코드)은 그림이 확정된 뒤에 한다.
