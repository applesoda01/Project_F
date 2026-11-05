# Qwen Image Edit 2509 옆모습 변환 (옵션 A)
- 모델: qwen_image_edit_2509_fp8_e4m3fn + qwen_2.5_vl_7b_fp8_scaled(CLIP type qwen_image) + qwen_image_vae
- 속도 LoRA: Qwen-Image-Edit-2509-Lightning-4steps (strength 1.0), ModelSamplingAuraFlow shift 3
- 노드: LoadImage(Lina 정면 SD 1칸을 1024로 확대) → TextEncodeQwenImageEditPlus(image1, vae) ; 음수는 ConditioningZeroOut ; VAEEncode 입력 잠재
- KSampler: steps 4, cfg 1, euler/simple, denoise 1, seed 6001~6020, 약 20초/장
- 프롬프트: "Redraw this exact same chibi character as a left-facing full-body side view (profile), standing still upright with both feet on the ground, arms hanging down at the sides. Keep the same reddish-brown bob hair with a small side bun, green eyes, white jacket, red bow tie, gray skirt, brown boots, same colors, same thick black outline, same chibi proportions, plain white background."
