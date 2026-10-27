# 팝업 창 디자인 의뢰서 (Gemini 이미지 생성용)

작성일 2026-10-27 · 용도: 의뢰 게시판·모험가·시설·장부 등 모든 팝업 창의 공통 틀

## 방향 (확정)

- 바깥: 하단·상단 HUD와 이어지는 **얇은 월넛 나무 프레임** (폭의 약 4%)
- 안쪽: 아틀리에 시리즈의 분위기를 참고한 **크림색 종이 + 아주 옅은 마름모 무늬**
- 아틀리에 화면을 그대로 따라 그리지 않는다. 구조와 분위기만 참고하고 장식 모양은 독자적으로 만든다.
- 구분선(말려 올라간 선)과 마름모 무늬는 코드로 만들고 이미지는 필요 없다.

## 만들 이미지 3종

| # | 이미지 | 쓰임 | 늘리는 방식 |
|---|---|---|---|
| A | 팝업 패널 | 모든 팝업의 바탕 | 9분할(모서리 고정, 가운데 늘림) |
| B | 제목 판 | 팝업 상단 제목 | 3분할(양 끝 고정, 가운데 늘림) |
| C | 섹션 머리 띠 | 표·목록 구역 이름 | 3분할 |

한 장에 하나씩 만드는 것을 권장한다 (한 장에 여러 개를 넣으면 크기와 비율이 흐트러진다).
참고 이미지로 **우리 HUD 화면**(`docs/art/ui/hud/ingame_hud_preview.png`)을 함께 첨부한다.

## 공통 문장 (세 프롬프트 앞에 붙임)

```
Attach reference: our game's HUD (dark walnut wood frame, cream parchment, small gold studs, glossy casual hand-painted look).
Match its wood tone, cream color, outline weight and glossy hand-painted finish exactly.
Do NOT copy any existing game's UI. Original design only.
Background: flat solid magenta #FF00FF, no gradient. NO drop shadow, NO glow, NO floor shadow. No text, no numbers, no icons.
```

## A. 팝업 패널

```
A large rectangular popup window panel, front view, aspect ratio about 3:2.
Outer frame: thin dark walnut wood frame, uniform thickness about 4% of the panel width, subtle top highlight and a thin darker inner edge line, corner radius about 3% of the width.
Exactly ONE small round gold stud in each of the four corners of the frame, and no other studs or ornaments.
Inside: cream parchment paper #FBF1DC filling the whole inner area, with a very faint, low-contrast diamond (rhombus) lattice pattern and a very subtle paper grain. Completely empty and flat otherwise.
The panel fills about 85% of the canvas, centered. Canvas 2048x1366.
```

## B. 제목 판

```
A single horizontal title plaque, front view, aspect ratio about 6:1, centered.
Cream parchment center #FBF1DC (empty), surrounded by a thin gold-brown ornamental frame with small tasteful curled filigree at the left and right ends only, plus a small gold stud at each end.
Keep the ornament modest and symmetrical, readable at small size. The center must stay empty for text.
The plaque fills about 80% of the canvas width. Canvas 2048x512.
```

## C. 섹션 머리 띠

```
A single horizontal section header band, front view, aspect ratio about 8:1, centered.
Soft grayish-brown painted band with a gentle brush-stroke texture, flat top-rounded corners (rounded at the top corners, flat at the bottom), slightly darker edge line, no ornaments, empty center for text.
It must look like a label tab sitting on top of a parchment card.
The band fills about 80% of the canvas width. Canvas 2048x384.
```

## 받은 뒤 작업 (제가 진행)

1. 마젠타 배경 제거 후 각각 투명 PNG로 분리 (`prototype/assets/ui/pop/`)
2. 패널은 CSS 9분할(border-image)로 적용, 제목 판·머리 띠는 3분할
3. 구분선은 SVG, 마름모 무늬는 CSS로 제작
4. 팝업 크기별(게시판·장부·모험가·시설·식당·기록)로 모양 확인

## 체크 포인트

- 패널: 모서리 징 4개가 같은 크기인가, 프레임 두께가 네 변에서 같은가, 중앙이 비어 있는가
- 그림자가 하나도 없는가 (이중 그림자 금지)
- 제목 판: 양 끝 장식이 좌우 대칭인가
- 세 이미지의 나무색·크림색이 HUD와 같은가
