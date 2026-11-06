# Qwen Image Edit 2509 두 장 입력 (정면 SD + 방향 기준 4001)
- 입력 image1: lina_front_smooth.png(얼굴·옷·색), image2: lina_pose4001.png(첫 생성 12장 중 4001번을 흰 배경으로 정리, 몸 방향·자세)
- 노드: UNETLoader(qwen_image_edit_2509_fp8_e4m3fn) → LoraLoaderModelOnly(Lightning 4steps, 1.0) → ModelSamplingAuraFlow(shift 3) / CLIPLoader(qwen_2.5_vl_7b_fp8_scaled, type qwen_image) / VAELoader(qwen_image_vae)
- TextEncodeQwenImageEditPlus(prompt, vae, image1, image2) → ConditioningZeroOut(음수), VAEEncode(image2) → KSampler(steps 4, cfg 1, euler/simple, seed 9001~9020) → SaveImage lina_v6b_<seed>
- 프롬프트: "Image 1 is the character Lina. Keep her face exactly as in image 1: the same round green eyes, the same eye shape and expression, the same reddish-brown bob hair with a small side bun, white jacket, red bow tie, gray skirt, brown boots, same colors, same thick black outline, same chibi proportions. Redraw her in the pose and body direction of image 2: the body turned three-quarters toward the left, shoulders slightly slanted, standing with both arms hanging at her sides, face looking toward the left front. Full body, plain white background."
- 속도: 장당 약 27초(20장 약 9분, 첫 장은 모델 로딩 포함)
