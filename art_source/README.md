# 그림 원본 보관함

게임이 직접 읽지 않는 **원본·작업용** 그림입니다. 게임이 읽는 그림은 `prototype/assets/`에 있습니다.

| 폴더 | 내용 |
| --- | --- |
| `illustrations/receptionist/` | 접수원 리나 전신 6장 (최종확정 + 표정 5종), 1024×1536 |
| `illustrations/adventurer_f/` · `adventurer_m/` | 1차 직업 모험가 전신 10장. 전사는 구디자인(새 걷기 시트 디자인으로 교체 예정), 여성 마법사는 오른쪽 테두리 선 정리 필요 |
| `walk_sheets_128/` | 받은 걷기 시트 원본 (128px 셀). 게임에는 256px 업스케일본이 들어감 |
| `corrected/` | **보정본** 16장 (원본과 같은 크기, 잡티·계단 현상 정리). 여성 마법사는 오른쪽 테두리 선도 지움 → `mage_f.png` |
| `upscaled/` | 업스케일 결과물 (리나 ×2 시험본) |

보정은 `python tools/upscale/correct_batch.py <모델.onnx> art_source/illustrations art_source/corrected` (1024×1536 한 장 약 2분, 1684×2528 약 5분, CPU). 업스케일 방법은 [tools/upscale](../tools/upscale)을 보세요.

## receptionist_blink (리나 눈 깜빡임)

`receptionist_blink/lina_<표정>_blink_<open·half·closed>.png` — 표정 6종 × 3칸 = 18장, 1684×2528 투명 아님(원본 캔버스). 머리카락 분해 레이어를 얹은 대머리 6종 위에 눈 영역만 합성했고, 눈 밖 픽셀은 열린 눈 칸과 동일합니다. 웃음은 눈이 이미 감겨 3칸이 같습니다. 대기 깜빡임은 `open` 유지, 2.5~5.5초마다 half → closed → half → open. 게임용 시트(`idle_blink`)는 기본 표정 3칸으로 이후 만듭니다.
