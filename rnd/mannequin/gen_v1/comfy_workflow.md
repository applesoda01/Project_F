# 마네킹 생성 워크플로 (ComfyUI API, 2026-11-06)
- 체크포인트 Illustrious-XL-v1.0, LoRA 없음, ControlNet promax(SetUnionControlNetType: canny/lineart), strength 0.9, end 0.8
- KSampler: euler_ancestral / normal, 28 step, cfg 6, 1024x1024, seed 2000~2019
- 입력: ctrl_stand.png (자체 설계 실루엣의 윤곽선, tmpl3.py가 생성)
- 긍정: chibi, 2.5 heads tall, plain gray featureless mannequin doll, smooth blank face, no hair, bald, nude doll body, from side, side view, standing, full body, solo, flat color, simple background, white background
- 부정: hair, clothes, clothing, face, eyes, mouth, nose, text, watermark, shadow, gradient, multiple views, color, shading, background, floor, 3d, realistic, extra limbs, cropped
- 속도: 1장당 약 23초 (RX 9070 XT), 20장 약 8분
