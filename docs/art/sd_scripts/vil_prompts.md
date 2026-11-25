# 마을 주민 더미 — 쓴 프롬프트 원문 (2026-11-25 밤 작업)

> `docs/art/sd_motion_workflow.md` 0장에 옮겨 정리하기 전의 원문 모음. 결과와 고른 이유는 `docs/plan/밤사이_작업_2026-11-25.md`.
> 그래프: SD 캐릭터는 0장의 8노드 그래프, Qwen 편집은 아래 「Qwen 그래프」, LTX는 `ltx_base_lastframe.json`(끝 그림을 주지 않을 때는 끝 그림 자리에 시작 그림을 다시 넣음).

## 1. SD 캐릭터 (우리 LoRA) — 디자인 줄
- 남: `young adult man villager, slim build, short brown hair, brown eyes, light blue linen shirt with rolled-up sleeves, brown vest, dark olive work trousers, brown leather boots, no weapon, no armor` (시드 621 ~ 624, 고른 것 622)
- 여: `adult woman villager, chestnut brown hair tied back, brown eyes, light cloth headscarf, plain green dress, white apron, brown shoes, no weapon, no armor` (시드 701 · 702, 고른 것 701)
- 실패한 시도: 프롬프트에 `plain solid magenta background`와 부정 `fat, chubby, …, white background, grey background`를 넣으면 부위 시트가 무너짐(앞뒤 돌림 그림이 됨). 틀은 그대로 두고 디자인 줄에 `slim build`만 넣는 것이 맞음.

## 2. Qwen 그래프 (Qwen-Image-Edit 2509 + Lightning 4스텝)
UNETLoader `qwen_image_edit_2509_fp8_e4m3fn` → LoraLoaderModelOnly `Qwen-Image-Edit-2509-Lightning-4steps-V1.0-bf16` 1.0 → ModelSamplingAuraFlow shift 3 → CFGNorm 1 / CLIPLoader `qwen_2.5_vl_7b_fp8_scaled` (type `qwen_image`) / VAELoader `qwen_image_vae` / TextEncodeQwenImageEditPlus(프롬프트 + image1 [+ image2]) · 부정은 빈 글 / VAEEncode(image1) → KSampler 4스텝 · cfg 1 · euler · simple · denoise 1. 입력은 1024×1024 마젠타. 한 장 약 30초.

### 2-1. 3/4 방향 돌리기 (정면 → 3/4)
```
Rotate the character slightly so the body is turned about 30 degrees toward the right side of the picture (a three-quarter front view, not a side view). Both eyes and the whole face stay clearly visible, the face looks slightly to the right. Standing upright, arms relaxed at the sides, feet together. Keep everything else exactly the same: same face, hair, eyes, clothes, colors, proportions, size, position, line art and flat chibi art style. Plain solid magenta background.
```
- 시드 1201 ~ 1203. 고른 것: 남 1202(좌우 뒤집음) · 여 1201.
- 배운 것: ① 모험가 걷기 그림을 image2로 넣고 「같은 각도로」라고 하면 **옆모습(90°)** 이 됨 → 참고 그림 없이 「30도」로 ② Qwen은 왼쪽 · 오른쪽을 잘 지키지 않음 → 왼쪽을 보면 좌우를 뒤집어 씀 (모험가 원본은 오른쪽을 보는 3/4).

### 2-2. 앉은 그림 (3/4 서 있는 그림 → 앉음)
- 남 (image2 = 모험가 앉은 그림 `sit/aligned/archer_f_sit_aligned.png`, 시드 1401, 뒤집음):
```
Make the character in image 1 sit in exactly the same pose as the character in image 2: seated on an invisible chair, three-quarter view facing right, knees bent at a right angle, lower legs hanging down, both hands resting on the knees, back straight, looking slightly to the right. Keep the character in image 1 exactly the same: same face, hair, eyes, clothes, colors, proportions, head size, line art and flat chibi art style. Do not copy the clothes, hair or colors of image 2. No chair, no furniture. Plain solid magenta background, full body.
```
- 여 (참고 그림 없이, 시드 1502 — 참고 그림을 넣으면 궁수의 옷 · 머리가 섞였음):
```
Make this character sit down on an invisible chair: seated, knees bent at a right angle, lower legs hanging straight down, both hands resting on her knees on top of the white apron, back straight, same three-quarter view, looking slightly forward. Keep the character exactly the same: same face, hair, eyes, white headscarf, green dress, white apron, brown belt, stockings, shoes, colors, proportions, head size, line art and flat chibi art style. No chair, no furniture, no shadow. Plain solid magenta background, full body.
```
- 앉은 그림은 서 있는 그림과 **머리 폭이 같도록** 크기를 맞춤 (`sd_sitkey.py`).

### 2-3. 먹기 · 맥주 시작 그림 (앉은 그림 → 접시 · 잔을 듦)
```
Keep this seated character exactly the same and in exactly the same seated pose, position and size, but now he holds a small round white plate with a piece of roast meat and bread on his lap with both hands. Same face, hair, eyes, clothes, colors, proportions, line art and flat chibi art style. Only one plate. No table, no chair, no shadow. Plain solid magenta background, full body.
```
```
Keep this seated character exactly the same and in exactly the same seated pose, position and size, but now he holds a wooden beer mug with white foam on his lap with both hands. Same face, hair, eyes, clothes, colors, proportions, line art and flat chibi art style. Only one mug. No table, no chair, no shadow. Plain solid magenta background, full body.
```
- 여자는 he/his → she/her, `headscarf`를 「Same …」 목록에 더함. 시드 1601 · 1602. 고른 것: 남 먹기 1602 · 맥주 1601, 여 먹기 1602 · 맥주 1601.

## 3. LTX (2초 · 24fps · 49장, 시드 3개씩)
- 캐릭터 설명 `<DSC>`: 남 `a slim young man with short messy brown hair and brown eyes, wearing a pale mint linen shirt with rolled-up sleeves, a brown vest, a brown belt, dark brown trousers and brown leather boots` / 여 `a young woman with chestnut brown hair tied back under a white cloth headscarf and brown eyes, wearing a short-sleeved green dress, a white apron, a brown belt, dark brown stockings and brown shoes`

### 3-1. 걷기 (시작 = 끝 = 3/4 서 있는 그림, 시드 2101 · 2103 · 2105) — **다시 만들 예정**
```
Use the provided start image as the first frame and also as the last frame. A cute chibi game character with a big head, <DSC>, seen from a three-quarter view facing right, on a plain solid magenta background. He walks in place calmly and smoothly, performing exactly one single walking cycle across the whole video: first one foot steps forward while the other foot pushes back, then the feet swap once, his arms swing gently opposite to the legs, his body bobs very slightly with each step. The motion is relaxed and natural, and at the very end he returns exactly to the starting pose. The character stays in the same spot and does not travel across the frame. The head, face, hair, outfit and art style stay exactly the same as the start image, flat colors and thick dark outlines. The camera is locked and does not move, zoom or pan. The background stays plain solid magenta and does not change. No text.
```
부정: `blurry, extra limbs, deformed, melting, text, watermark, camera movement, zoom, background change, realistic, 3d render, running, jogging, standing still, turning around, sitting, new objects, weapon, shadow, floor`
- 문제(사용자 08:56 「남자 걷는게 이상해」): 보폭이 뒤로 쏠림 · 상체가 굳음 · 세 걸음이라 이음새가 튐 · 녹색 기운. 고치는 안은 밤 작업 기록 끝.

### 3-2. 앉기 (시작 = 서 있는 그림, 끝 = 앉은 그림, 시드 3101 · 3103 · 3105)
```
Use the provided start image as the first frame and the provided end image as the last frame. A cute chibi game character with a big head, <DSC>, seen from a three-quarter view facing right, on a plain solid magenta background. He calmly sits down on an invisible chair: he bends his knees and lowers his hips smoothly, then settles into the seated pose with his hands resting on his knees, exactly matching the end image. The motion is smooth and natural. The character stays in the same spot. There is no chair, no furniture and nobody else. The head, face, hair, outfit and art style stay exactly the same as the start image, flat colors and thick dark outlines. The whole character always stays fully inside the frame. The camera is locked and does not move, zoom or pan. The background stays plain solid magenta and does not change. No text.
```
부정: `blurry, motion blur, extra limbs, deformed, melting, text, watermark, camera movement, zoom, background change, realistic, 3d render, standing up again, walking, jumping, chair, furniture, table, shadow, floor, new objects, second character, afterimage`

### 3-3. 먹기 · 맥주 (시작 = 끝 = 접시 · 잔을 든 앉은 그림, 시드 9101 · 9103 · 9105)
```
Use the provided start image as the first frame and also as the last frame. A cute chibi game character with a big head, <DSC>, sitting, seen from a three-quarter view facing right, on a plain solid magenta background. He is sitting and holding <a small round white plate with roast meat and bread | a wooden beer mug with white foam> on his lap. <He picks up a bite of food from the plate with one hand, eats it happily while chewing with a smile, then puts his hand back on the plate | He lifts the mug to his mouth, takes a big gulp, then lowers it back to his lap with a happy satisfied smile>, and returns exactly to the starting pose. The <plate | mug> keeps the same shape and size and there is only one. He stays seated the whole time. There is nobody else in the scene. The head, face, hair, outfit and art style stay exactly the same as the start image, flat colors and thick dark outlines. The whole character always stays fully inside the frame. The camera is locked and does not move, zoom or pan. The background stays plain solid magenta and does not change. No text.
```
부정: `blurry, motion blur, extra limbs, extra hands, deformed, melting, text, watermark, camera movement, zoom, background change, realistic, 3d render, standing up, walking, jumping, new objects, table, chair, shadow, floor, magic effects, glow, sparkles, second character, other people, afterimage, two mugs, two plates, spilling`

## 4. 후처리
- `sd_cutkey.py 부위시트.png 결과.png` — 부위 시트 왼쪽 캐릭터 → 마젠타 640×800 (키 516 · 발 787)
- `sd_magkey.py 마젠타그림.png 결과.png [flip]` — Qwen 결과 → 1024² 시작 이미지 (키 529 · 발 894 · 가운데 512) + `_rgba.png`
- `sd_sitkey.py 앉은그림.png 서있는_rgba.png 결과.png [flip]` — 머리 폭을 맞춰 앉은 시작 이미지
- `REF=서있는_rgba.png vil_motion_pp.py walk|sit 영상.mp4 출력폴더` · `… eat|beer 영상.mp4 출력폴더 앉기출력폴더` · `… idle 서있는_rgba.png 출력폴더` — 키잉 · 색 보정 · 가장자리 녹색 누름 · 정렬 → 프레임 · 시트(¼) · 미리보기 gif
