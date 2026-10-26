# 리나 클릭 메뉴 — Gemini 생성 안내 (2026-10-26)

기준 시안: `menu_B2_post.png` (나무 명패형). 이 이미지를 **스타일 참고로 매번 첨부**한다.
글자는 Gemini가 한글을 자주 틀리므로 **그림에 넣지 않고 코드로 올린다.** 그림은 빈 명패·아이콘·뱃지만 만든다.

## 1. 버튼 상태 3단계

| 상태 | 모습 | 동작 |
| --- | --- | --- |
| 일반 | 양피지색 면 + 짙은 나무 테두리 + 금색 안선 | 마우스를 올리면 선택과 같은 모습으로 바뀜 |
| 선택 | 진한 나무색 면 + 금색 안선 굵게, 글자는 크림색 | 누르고 있거나 키보드로 고른 상태 |
| 잠김 | 채도를 뺀 회갈색 면, 테두리 어둡게, 자물쇠 | 눌러도 반응 없음, 올리면 "전직 가능 시점에 열립니다" 같은 안내 |

(전직 제안은 일반 상태만 금색 바탕을 따로 둔다 = 강조형 1장 추가)

## 2. 만들 그림과 규격

| 그림 | 크기 | 수량 |
| --- | --- | --- |
| ~~빈 명패 4장~~ → **Gemini가 아닌 코드로 그려 완성** (`plaque/`, 680×168 = 화면 340×84, 아래 그림자 턱 포함, 투명 배경). Gemini 결과가 딱딱해서 시안 B2의 둥근 틀을 그대로 사용 | 완료 |
| 아이콘 6종 (이야기·요리·음식 설정·전직 제안·메인 퀘스트·마을로 가기) + 잠금 자물쇠 | 128×128 | 6장 |
| 아이콘 메달리온(원형 받침) 일반 / 선택 / 잠김 | 128×128 | 3장 |
| 뱃지 NEW 라벨, 빨간 숫자 원 | 각 약 120×56 / 56×56 | 2장 |

요청 때마다 순백색 배경을 쓰고, 나중에 윤곽 기준으로 제거한다. 명패는 좌우 끝 장식이 늘어나지 않게 가운데만 늘려 쓸 수 있도록 **양끝 장식이 대칭**이어야 한다.

## 3. 영문 프롬프트 (첨부: 시안 이미지)

> 빈 명패 프롬프트는 쓰지 않는다(위 표 참고). 아이콘·메달리온·뱃지만 Gemini로 만든다.

**빈 명패 (상태별로 문장 한 줄만 바꿔 4번 요청)**
```
Using the attached game UI as style reference, draw one empty horizontal wooden plaque button, no text, no icon. Wide rounded rectangle, ratio 680:156. Dark carved wood outer frame, thin gold inner line, [STATE]. Soft drop shadow below. Pure white background, flat front view, game UI asset.
```
[STATE]
- normal: `parchment cream face with subtle warm gradient`
- selected: `dark brown wood face with a thicker glowing gold inner line`
- locked: `desaturated grey-brown face, dull dark frame, no gold, looks inactive`
- highlight: `warm golden yellow face with a gold inner line`

**아이콘 (한 장에 하나씩, 시안의 선화·색 톤 유지)**
```
Using the attached game UI as style reference, draw one flat game icon on a pure white background: [SUBJECT]. Thick brown outline (#5a3a22), warm cream and gold fills, simple shapes, centered, 128x128 feel.
```
[SUBJECT]
- talk: `a speech bubble with three dots`
- cook: `a cooking pot with steam`
- menu: `a menu card with a small check mark seal`
- promo: `a gold star with an upward arrow`
- quest: `a rolled quest scroll with a small red flag`
- town: `a small cozy cottage with a red-brown roof, arched wooden door and a tiny chimney`
- lock: `a small padlock, grey-brown`

**메달리온**
```
Using the attached game UI as style reference, draw one empty circular medallion, no icon inside. [STATE]. Gold ring around dark wood ring. Pure white background, centered.
```
[STATE]: normal `cream parchment center` / selected `warm light-gold center` / locked `grey-brown center, no gold`

**뱃지**
```
Using the attached game UI as style reference, draw one small rounded gold label with no text, pure white background.   (NEW 라벨)
Draw one small red circle badge with white rim, no text, pure white background.   (숫자 뱃지)
```

## 4. 받은 뒤 검수 (제가 한다)
- 명패 4장이 같은 크기·같은 테두리 두께인지, 상태 간 위치가 어긋나지 않는지
- 아이콘 6종의 선 굵기·색 톤이 같은지, 메달리온 안에 들어가는지(여백 12% 이상)
- 흰 배경 제거 후 가장자리 번짐
