# 마을 시안 생성 가이드 (Gemini) — 화풍 레퍼런스 + 구도 가이드

> 요약: 입력 이미지는 **항상 2장**(화풍 1 + 구도 1)입니다. 화풍은 `ref_primary.png`(항구 마을, 얇은 선)와 필요 시 `ref_secondary.png`(양피지 지도풍), 구도는 `guide_bare_stage*.png`(회색 클레이, 색과 선 없음)입니다. 시점은 **고각 약 35°**로 확정했습니다.

## 1. 입력 이미지 역할
| 파일 | 역할 | 쓰는 곳 |
| --- | --- | --- |
| `ref_primary.png` | 화풍 기준 (테라코타 지붕, 크림 벽, 얇은 따뜻한 선, 소품 밀도) | 모든 생성 |
| `ref_secondary.png` | 붓결·잉크 선 보조, 전체 한 장 구도 | 지면판·전체 장면 |
| `ref_mood_hd2d.png` | 조명·틸트시프트 분위기 (이미지로 올리지 않고 문장으로만 참고) | 후처리 |
| `ref_color.png`, `ref_water.png` | 색 팔레트, 물 표현 참고 | 필요할 때만 |
| `guide_bare_stage0~4.png` | **회색 클레이 구도**: 빈 부지의 도로·광장·강·다리·성벽 위치 (색과 윤곽선 없음) | 지면판 4장 |
| `guide_full_stage0.png`, `guide_full_stage4.png` | 건물 배치 확인용(칙칙한 목업 색, **Gemini에 올리지 마세요**) | 우리 확인용 |

## 2. 화풍 문장 (공통)
```
Painterly hand-drawn fantasy town, warm terracotta tile roofs, cream plaster walls with
brown timber framing, thin warm brown linework (not black, not thick), soft gouache brush
texture, vibrant clean saturated colors, turquoise water, rich lived-in props (awnings,
crates, barrels, flower boxes), gentle warm sunlight.
```

## 3. 지면판 (건물 없음)
```
Use image 1 ONLY as the art style reference. Use image 2 (gray clay render) ONLY as the
exact composition and camera angle: high-angle isometric about 35 degrees. Keep every road,
plaza, river and bridge exactly where they are in image 2. Ignore the gray colors of image 2.
Paint an EMPTY town ground plate: no buildings, no houses, no people.
[화풍 문장]
Stage look: {개척촌·마을: dirt roads, wooden fence} / {읍: cobblestone roads, low stone wall}
/ {도시: paved plaza, street lamps, stone wall with gate towers} / {성채 도시: tall stone wall}.
Background: misty mountains upper-left, lake upper-right. 16:9.
```
- 단계별로 `guide_bare_stage{N}.png`를 바꿔 올립니다.

## 4. 건물 단독 스프라이트
```
Use image 1 as the style reference. Draw ONE isometric fantasy building, camera about 35
degrees above horizon, viewed from the front-left corner, {건물 설명}, footprint {w}x{d} tiles,
plain flat white background, no ground, no shadow, no text.
[화풍 문장]
```
- 건물 설명 예: `blacksmith with a tall chimney and an open forge, brick-and-timber`.
- 배경 제거(PNG 투명)와 앵커 정렬은 규격표에 맞춰 후처리합니다.

## 5. 팁
- 결과가 어긋나면 같은 대화에서 "keep the angle of image 2, style only from image 1"을 덧붙입니다.
- 마음에 든 건물 5~10장은 모아 두세요. ComfyUI 단계의 LoRA 학습 자료가 됩니다.
