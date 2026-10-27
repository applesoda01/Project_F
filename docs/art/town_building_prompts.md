# 마을 건물 스프라이트 프롬프트 표 (Gemini)

> 요약: 길드 본관(`sprites/guild_v1.png`)을 화풍·크기 기준으로 삼아, 나머지 16종을 같은 형식으로 뽑습니다. 입력 이미지는 **화풍 1장**(`ref_primary.png` 또는 완성된 `guild_v1.png`)만 올립니다. 건물은 한 번에 한 채씩, 흰 배경으로 생성합니다.

## 공통 프롬프트 (건물 설명 칸만 바꿔 붙여 넣기)
```
Create an image. Use the attached image ONLY as the art style reference (painterly hand-drawn
fantasy town, warm terracotta tile roofs, cream plaster walls with brown timber framing, thin
warm brown linework, soft gouache brush texture, vibrant clean colors). Draw ONE game building
sprite: {건물 설명}. Camera: isometric about 35 degrees, viewed from the front corner so the left
face and right face are both visible, the building footprint is a perfect square of {w}x{d}
tiles with the front corner as the lowest point. Plain flat pure white background, no ground,
no cast shadow, no people, no text. Show the whole building centered with margin around it.
```
- 크기 일관성: 길드 본관(2×2)을 기준으로, 1×1 건물은 약 절반 폭, 대성당·성처럼 큰 건물은 요청에 "slightly taller than the guild hall"을 덧붙입니다.
- 화풍이 흔들리면 길드 본관 이미지를 두 번째 입력으로 올리고 "same style and scale as image 2"를 추가합니다.

## 건물별 설명
| id | 건물 | 발자국(타일) | 등장 단계 | 건물 설명 (프롬프트 칸에 입력) |
| --- | --- | --- | --- | --- |
| church | 성당 | 2x2 | 개척촌 | a stone village church with a pointed slate spire, arched stained-glass window, small golden cross, wooden double door |
| cathedral | 대성당 | 2x2 | 도시 | a grand stone cathedral with twin towers, rose window, buttresses and a tall central spire (upgrade of the church, same footprint) |
| magic | 마법 학원 | 2x2 | 마을 | a magic academy: a round-tower school with a purple pointed roof, glowing blue windows, floating books and a small observatory dome |
| tower | 마탑 | 2x2 | 도시 | a tall slender wizard tower with spiral stairs, purple conical roof, glowing crystals at the top (upgrade of the magic academy, same footprint) |
| observ | 천문대 | 2x2 | 읍 | an observatory with a white stone drum, a copper dome that has a slit with a brass telescope, star-patterned banners |
| theater | 극장 | 2x2 | 읍 | a theater: a grand red-roofed hall with a columned front, a small stage curtain visible in the arched entrance, playbill posters |
| library | 대도서관 | 2x2 | 읍 | a great library: a stone building with large arched windows, a green copper roof, stacks of books visible, a lantern at the door |
| arena | 투기장 | 2x2 | 마을 | a round colosseum-style arena of sandy stone with arched openings, crossed-sword banners, a wooden gate |
| dojo | 수련원 | 2x2 | 마을 | a training hall in half-timbered style with a wide low roof, wooden training dummies and weapon racks in a front yard |
| hunter | 사냥꾼 조합 | 2x2 | 개척촌 | a hunters guild lodge: a log-and-stone cabin with antler trophies, hanging furs, a bow rack and a smoking chimney |
| alchemy | 연금 공방 | 2x2 | 읍 | an alchemy workshop with a crooked roof, copper still pipes, colorful bubbling glass bottles on shelves and green smoke from a chimney |
| watch | 망루 | 1x1 | 개척촌 | a tall wooden-and-stone watchtower with a lookout platform and a signal beacon on top (1x1 tile footprint) |
| inn | 여관 | 2x2 | 개척촌 | a cozy inn and tavern: a two-story half-timbered building with a hanging mug sign, outdoor barrels and benches, warm window light |
| potion | 물약 상점 | 2x2 | 마을 | a potion shop: a small shop with a mushroom-shaped awning, shelves of colorful potion bottles, a cauldron sign |
| weapon | 무기점 | 2x2 | 마을 | a weapon shop with a blue roof, an open front with swords and shields on display, a crossed-swords sign |
| smith | 대장간 | 2x2 | 마을 | a blacksmith: brick forge building with a big chimney, glowing forge opening, an anvil outside, a hammer sign |

## 후처리 규격 (제가 처리)
- 흰 배경 제거 → 투명 PNG, 여백 잘라내기, 앵커(앞 꼭짓점)=하단 중앙.
- 크기: 점유 w×d 타일의 폭 = (w+d)×47px(×0.944 배율) 기준으로, 지붕 돌출분 +15% 허용.
- 저장: `docs/art/town_ref/sprites/{id}_v1.png`, 확인용 합성 이미지는 `{id}_on_plate_check.png`.

## 순서 제안
1. 일반 건물 4종(여관, 물약 상점, 무기점, 대장간) — 인구 단계로 가장 먼저 필요
2. 핵심 건물 중 개척촌·마을 단계(성당, 마법 학원, 사냥꾼 조합, 투기장, 수련원, 망루)
3. 읍 이상(천문대, 극장, 대도서관, 연금 공방) + 업그레이드(대성당, 마탑)
4. 영주의 성 5단계, 민가 변형(지붕색 4 × 1·2층)
