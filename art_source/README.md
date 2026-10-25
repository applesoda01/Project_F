# 그림 원본 보관함

게임이 직접 읽지 않는 **원본·작업용** 그림입니다. 게임이 읽는 그림은 `prototype/assets/`에 있습니다.

| 폴더 | 내용 |
| --- | --- |
| `illustrations/receptionist/` | 접수원 리나 전신 6장 (최종확정 + 표정 5종), 1024×1536 |
| `illustrations/adventurer_f/` · `adventurer_m/` | 1차 직업 모험가 전신 10장. 전사는 구디자인(새 걷기 시트 디자인으로 교체 예정), 여성 마법사는 오른쪽 테두리 선 정리 필요 |
| `walk_sheets_128/` | 받은 걷기 시트 원본 (128px 셀). 게임에는 256px 업스케일본이 들어감 |
| `corrected/` | **보정본** 16장 (원본과 같은 크기, 잡티·계단 현상 정리). 여성 마법사는 오른쪽 테두리 선도 지움 → `mage_f.png` |
| `upscaled/` | 업스케일 결과물 (리나 ×2 시험본) |
| `lobby_bg/` | 로비 배경 v3 (밝은 낮·석재+하늘색·칠판). 합본 1920/3840, 레이어 4장, 게임용 2장, 좌표 json. 게임 코드 좌표 변경 사항은 폴더 안 README |

보정은 `python tools/upscale/correct_batch.py <모델.onnx> art_source/illustrations art_source/corrected` (1024×1536 한 장 약 2분, 1684×2528 약 5분, CPU). 업스케일 방법은 [tools/upscale](../tools/upscale)을 보세요.

## receptionist_blink (리나 눈 깜빡임)

`receptionist_blink/lina_<표정>_blink_<open·half·closed>.png` — 표정 6종 × 3칸 = 18장, 1684×2528 투명 아님(원본 캔버스). 머리카락 분해 레이어를 얹은 대머리 6종 위에 눈 영역만 합성했고, 눈 밖 픽셀은 열린 눈 칸과 동일합니다. 웃음은 눈이 이미 감겨 3칸이 같습니다. 대기 깜빡임은 `open` 유지, 2.5~5.5초마다 half → closed → half → open. 전신 일러스트 기반 3칸 시트 `lina_illust_idle_blink_sheet_512.png`(512 셀, 1536×512, 투명 배경, 발밑 y=488·키 432)를 같은 폴더에 따로 보관합니다. 게임용 `prototype/assets/npc/receptionist_idle_blink.png`(SD 접수원 대기 시트)와는 별개이며 게임에는 연결하지 않았습니다.

## receptionist_workfiles (눈 깜빡임 재료)

`bald_6/` 대머리 6종, `hair_layer/` 머리카락 전체 레이어(원본 픽셀)·분리 4부위·분해용 프롬프트, 진지 원본(귀 보정용). 합성 방법은 [tools/lina_blink/README.md](../tools/lina_blink/README.md).
