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
