# 가구 도면 (정면 15°)

탁자·의자의 시점을 고정하기 위한 선화 도면. Gemini 첨부용과 ComfyUI ControlNet 입력용을 겸한다.
카메라 15° 내려다보기, 탁자 윗면 타원 세로÷가로 = sin15° = 0.26. 모두 직교 투영으로 계산해 그렸다.

| 파일 | 용도 |
| --- | --- |
| `table_blueprint_640x400.png` | 탁자 도면 (흰 바탕 검은 선, 파일 규격 640×400, 발밑 y=392, 가운데 x=320) |
| `chair_front·back·side_blueprint_192x256.png` | 의자 앞·뒤·옆 (옆은 앞쪽이 오른쪽). 발밑선 y=250 공통 |
| `chairs_blueprint_sheet.png` | 의자 3방향을 한 장에(1152×512). Gemini에 3방향을 한 번에 요청할 때 첨부 |
| `*_annotated.png` | 사람 확인용. 발밑선(주황)·중심선(파랑) 표시. 모델에 넣지 말 것 |
| `inverted_*.png` | 검은 바탕 흰 선. ControlNet canny 등 흰 선 입력을 받는 모델용 |

## 쓰는 방법

- **Gemini:** 도면 + 배경 이미지를 첨부하고 "Redraw this blueprint as a finished game asset, keeping exactly the same shape, proportions and camera angle" 취지로 요청. 도면이 단순해서 Lv1·Lv2는 같은 도면에 장식만 달리 요청한다.
- **ControlNet:** 선화(lineart)·canny·scribble 중 모델에 맞는 쪽 입력. 반전본은 canny용.
- 도면은 형태 기준이다. 색·질감·장식은 AI가 정한다.

재생성: `python tools/furniture/make_blueprint.py` (Pillow 필요). 의자 치수는 스크립트 위쪽 `Wc, Dc`와 `boxes()`.
