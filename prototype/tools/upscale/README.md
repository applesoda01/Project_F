# 걷기 시트 업스케일 도구

그림용 AI 모델(Real-ESRGAN x4plus_anime_6B)로 128px 셀 시트를 256px(또는 원하는 크기)로 키웁니다. torch 없이 onnxruntime만으로 돌아갑니다.

## 준비 (한 번만)
```
pip install onnxruntime onnx pillow scipy numpy
# 모델 받기 (약 18MB)
curl -L -o anime6B.pth https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.2.4/RealESRGAN_x4plus_anime_6B.pth
python build_onnx.py anime6B.pth anime6B.onnx
```

## 사용
```
python upscale_sheet.py anime6B.onnx chr_warrior_m_walk.png chr_warrior_m_walk_256.png 256
```
- 입력: 셀 128px 시트(가로 24 × 세로 4). 출력 셀 크기는 마지막 숫자(256 권장, 512도 가능)
- 속도: CPU 2코어 기준 셀당 약 2초 → 시트 1장(96칸) 약 3분
- 투명 영역의 색을 주변 색으로 채운 뒤 확대해서 검은 테두리가 생기지 않게 하고, 알파(투명도)도 같은 모델로 확대합니다
- 게임은 그림 높이로 셀 크기를 알아내므로, 같은 파일 이름으로 바꿔 넣기만 하면 됩니다 (JSON의 cell_size·pivot은 참고용)

## 일러스트 한 장 (전신 일러스트 등)
```
python upscale_image.py anime6B.onnx 접수원.png 접수원_x2.png 2
```
- 큰 그림은 192px 타일로 나눠 처리하므로 메모리 걱정 없음. 1024×1536 → 2048×3072 약 2분 (CPU 2코어)
- 투명 PNG면 알파도 같이 확대

## 정리 용도 (크기는 그대로, 노이즈·계단 선만 정리)
```
python upscale_image.py anime6B.onnx 원본.png 원본_정리.png 1
```
- 4배로 키운 뒤 원래 크기로 줄여, AI 생성 이미지의 압축 노이즈와 뭉개진 외곽선을 정리
- 잘 맞음: 셀화풍 캐릭터·UI·아이콘, AI 생성 리소스를 부위로 자르기 전 정리
- 주의: 붓 질감·부드러운 명암·배경 질감이 매끈해짐 → 원본은 항상 보관하고 결과만 따로 저장

## 모델 라이선스
Real-ESRGAN은 BSD-3-Clause입니다. 상용 출시 전에 모델 출처와 라이선스 표기를 확인하세요.
