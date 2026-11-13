# SD 모션 제작 작업 기록 (이어하기용)

> 최종 갱신: 2026-11-12 23:58 · 작성: Claude
> **새 세션은 SD 스프라이트·모션·Gemini·ComfyUI 작업을 시작하기 전에 이 문서를 먼저 읽습니다.** 대화 기록이 요약되거나 세션이 바뀌어도 이 문서만 보면 이어서 할 수 있어야 합니다.
> 작업을 하면서 바뀐 방식·현황·결정은 **그 자리에서 이 문서에 적습니다.** (규칙: `docs/working_rules.md`, 할 일 전체: `docs/todo.md`)

## 요약
- 모션은 **ComfyUI(LTX 2.5)로 동작 초안 → 쓸 만하면 Gemini로 영상 재생성 또는 그대로 후처리 → 마젠타 크로마키 → 정렬·프레임 선택 → 시트/프레임 저장** 순서입니다.
- Gemini 영상은 **계정당 하루 3개, 계정 2개 = 하루 최대 6개**. 사용자가 직접 Gemini에서 만들고 다운로드 폴더에 둡니다.
- 지금 진행 중: **달리기**(전사 남만 Gemini 완료, 7직업 Gemini 묶음 전달, 마법사 여·전사 여는 LTX 재생성 필요)와 **공격**(전사 남 가로 베기 완료, 나머지 직업 대기).
- 책 UI 펼침면 워터마크는 ComfyUI Qwen 편집으로 제거 완료(아래 6장).

---

## 1. 일하는 방식 (사용자와 합의)

1. **결과물을 만들기 전에 묻습니다.** ComfyUI 대기열 등록, 이미지·영상 생성, 파일 쓰기는 "무엇을/어떻게/예상 시간"을 한 줄로 말하고 "진행해줘"를 받은 뒤 시작. 선택지 답·불만·지적은 요청이 아닙니다.
2. **영상 모션은 시작 이미지를 먼저 보여 줍니다.** 마젠타 배경 시작 이미지를 보여 주고 확인받은 뒤 LTX를 돌립니다.
3. **배경은 단색 마젠타**(#FF00FF 근처)로 받습니다. 투명 처리는 Claude가 크로마키로.
4. **무료로만.** Google AI Studio 등은 무료 등급만 씀(2026-11-12 확인: 계정 "무료 등급"). 유료(Paid) 모델·결제 동의는 하지 않음. 약관·동의 창은 사용자가 직접 누름.
5. **답변 형식:** 맨 앞 `[YY-MM-DD HH:MM]`(시계 도구 값), 격식체 한국어, 결론 먼저, 근거 2~3개, 수치 포함.
6. **Git:** Claude는 클라우드 저장소 사본에서 수정·커밋하되 **"커밋해줘"/"푸시해줘"를 받은 뒤에만** 합니다. 사용자는 GitHub Desktop에서 Pull.
7. **브라우저:** 작업 중인 탭(예: AI Studio 입력 중)은 다른 주소로 이동하지 않습니다. 확인용 페이지는 **새 탭**에서 엽니다. (2026-11-12 사용량 확인하려다 올린 이미지가 사라진 실수)

## 2. 환경

| 항목 | 내용 |
| --- | --- |
| 사용자 PC | 장치 이름 `pc` (Windows, 사용자 `apple`). Claude 데스크톱 앱이 켜져 있어야 연결됨 |
| 연결 폴더 | `C:\Users\apple\Downloads`, `...\OneDrive\문서\GitHub\Project_F`, `...\Comfy-Desktop\ComfyUI-Shared\{input,output,models}`, `...\바탕 화면\Claude` |
| PC에서 못 하는 것 | 명령 실행(git 등) 불가. 파일 읽기(stage)·쓰기(commit)만 |
| ComfyUI | `http://127.0.0.1:8188`, AMD RX 9070 XT. 내장 브라우저 새 탭에서 열고 `fetch('/prompt')`로 작업 등록, `client_id: 'claude-kf'` |
| 출력 위치 | `ComfyUI-Shared\output\pf\` (파일명 접두어로 구분) |
| 입력 위치 | `ComfyUI-Shared\input\` (시작 이미지는 `device_commit_files`로 넣음) |
| 저장소 사본 | 클라우드 `/home/claude/project_f_latest` (2026-11-12 `8343d99`에서 새로 클론. `/home/claude/project_f`는 옛 이력이라 쓰지 않음) |

**ComfyUI 실행 기록은 재시작하면 사라집니다.** 그래프는 결과 mp4의 메타데이터(`prompt` 태그)에 들어 있으므로 `ffprobe -show_entries format_tags=prompt`로 꺼내 복원합니다. (작업 공간 사본 예: `/mnt/user-data/outputs/runB/*.mp4`)

## 3. LTX 2.5 영상 생성 (ComfyUI)

### 그래프 핵심 노드 (기존 그래프 복제 후 값만 바꿈)
| 노드 | 역할 | 값 |
| --- | --- | --- |
| `398:376` | 프롬프트 (PrimitiveStringMultiline `value`) | 아래 템플릿 |
| `398:373` | 부정 프롬프트 (CLIPTextEncode) | CFG 1.0이면 효과 없음 |
| `398:339` / `398:338` | 시드 / 시드+1 (RandomNoise) | 예: 7116 / 7117 |
| `398:362` | 길이(초) | 3초=73프레임, 2초=49프레임 |
| `398:361` | fps | 24 |
| `395`, `E1` | 시작·끝 이미지 (LoadImage) | 같은 이미지 = 처음과 끝이 같은 루프 |
| `75` | SaveVideo `filename_prefix` | `pf/<종류>_<직업>_mag_s<시드>` |
| `398:374` | VAEDecodeTiled | tile 384, temporal 32 |
| 모델 | `ltx-2.5-22b-distilled-transformer-comfy-int8-convrot`, 텍스트 `gemma4-12b-with-proj-ltx-2.5`, 업스케일 `ltx-2.5-latent-spatial-upscaler-x2` | |
| 시그마 | `398:397` ManualSigmas `1.0, 0.99375, 0.9875, 0.98125, 0.975, 0.909375, 0.725, 0.421875, 0.0` | |

- 등록 전 점검: `398:368`이 SamplerCustomAdvanced, `398:358` audio_vae = `['398:386',0]`, G1 frame_idx −1, tile 384, 길이 값, LoadImage 파일명.
- 출력 768×768 (시작 이미지 1024 또는 800).
- 1건 약 1분 20초. 첫 실행은 모델 로딩으로 더 걸림.

### LTX에서 알게 된 것
- 아주 작은 움직임(숨쉬기)은 "정지(0.1px)" 아니면 "과하게 큼" 둘 중 하나로 나옴 → 대기 모션은 후처리로 만듦(4장).
- 시작 이미지에 여백을 두면(캐릭터 높이가 화면의 약 52%) 무기가 화면 밖으로 나가지 않음.
- 2초 + "extremely fast, no pause" 문구로 공격 동작 구간이 45~60프레임에서 21~30프레임으로 줄어듦.
- 빠른 프레임은 번짐, 색이 흐려짐(머리 올리브빛, 팔 민트빛, 갑옷 라벤더빛) → 후처리에서 색 보정.
- "가로 베기"는 칼날이 지면과 평행·가슴 높이라고 못박지 않으면 내려찍기→찌르기로 해석함.

### 달리기 프롬프트 템플릿 (runB·runD에서 쓴 것, 캐릭터 묘사만 바꿈)
```
Use the provided start image as the first frame and also as the last frame. A cute chibi game character with a big head, <캐릭터 묘사>, seen from a three-quarter view facing right, on a plain solid magenta background. <He/She> jogs in place slowly and smoothly, performing exactly one single running cycle across the whole video: first one foot steps forward while the other leg kicks back, then the feet swap once, <his/her> arms bend and pump opposite to the legs, <his/her> body bounces slightly with each step, and <his/her> hair and clothes flutter slightly. The motion is slow and gentle, and at the very end <he/she> returns exactly to the starting pose. The character stays in the same spot and does not travel across the frame. The head, face, hair, outfit and art style stay exactly the same as the start image, flat colors and thick dark outlines. The camera is locked and does not move, zoom or pan. The background stays plain solid magenta and does not change. No text.
```
부정: `blurry, extra limbs, deformed, melting, text, watermark, camera movement, zoom, background change, realistic, 3d render, walking slowly, standing still, turning around, sitting, new objects, weapon, shadow, floor`

캐릭터 묘사 예:
- 전사 여: `a young woman with very long black hair and violet eyes, wearing white and silver plate armor, a brown belt and white armored boots`
- 마법사 남: `a young man with short brown hair and brown eyes, wearing a tall blue hat with gold ornaments, a blue coat with gold trim, a dark blue cape and dark boots`
- 전사 남(공격용): `a young man with short brown hair and purple eyes, wearing silver chest armor, a blue tunic, a brown belt, bandaged forearms and brown boots`

### 공격 프롬프트 (전사 남 기준)
- 머리: 위 공통 첫 문장 + 캐릭터 묘사 + `He holds a long sword with a blue crossguard in his right hand, low at his side with the blade pointing diagonally down and forward.`
- 가로 베기(채택 7904): `swings the sword back to his far side at chest height by twisting his torso, then instantly sweeps it in one wide flat horizontal arc across the front of his body from his left to his right, the blade parallel to the ground` + `the sword stays at chest height … never raised above his shoulders`
- 꼬리(2초용): `The attack is extremely fast and explosive, over in a split second, with almost no wind-up and no pause in any pose. Right after the strike he quickly returns the sword and himself exactly to the starting pose and then stays still. The sword stays sharp and solid in every frame … only one sword. … camera locked … background plain solid magenta … No text.`
- 부정: motion blur, speed lines, extra swords, raising sword overhead, thrust/stab 등. 여성 캐릭터는 대명사를 바꿈.
- 설정: 2초(49프레임), 24fps, CFG 1.5.

## 4. 후처리 공통

### 마젠타 크로마키
- 캐릭터·영상: 마젠타와의 L1 거리 d → alpha = clip((d−130)/(280−130)), 0.98 이상은 불투명. 가장자리 색은 가장 가까운 불투명 픽셀 색으로 교체(distance transform). 200px 이상 덩어리만 남김(2px 팽창). 가장자리 4px 안 디스필: R·B에서 min(R−G, B−G)×0.95 빼기. (느슨한 90~250 기준은 마젠타 테두리가 남았음)
- 책·UI 그림: m = min(R,B) − G, alpha = clip((200−m)/120), 가장 큰 덩어리만, 가장자리 디스필.
- 확대·축소는 알파 곱한 상태로(premultiplied) LANCZOS 후 되돌림.

### 정렬 규격
| 모션 | 캔버스 | 기준 |
| --- | --- | --- |
| 서 있기·걷기·달리기 | 640×800 RGBA | 키 516px, 발 y=787, 가운데 x=320 |
| 공격 | 1024×880 RGBA | 발 기준점 (512, 787), 클립 전체 한 가지 변환(이동 보존). 768 영상 → 게임 배율 1.303 |
| 앉기 시트 | 3328×576, 칸 256×288 | 0행 앉기 13프레임(12fps), 1행 대기 4프레임 |

### Gemini 이미지 처리
- 1024² 이미지는 오른쪽 아래 (x 880~927, y 880~927)에 반짝임 워터마크. 배경 위에 있으면 [868:940, 872:950]을 배경색(251,0,251)으로 칠해 지움.
- **처음 요청할 때 여백을 넣으면** 워터마크가 배경 위에 떨어져 쉽게 지워짐. Gemini는 나중의 "크기 줄여 줘" 요청을 무시함.
- 공격 시작 이미지: 반짝임 제거 → 캐릭터 높이 529px, 바닥 y=894, 가운데 x=512 (1024² 마젠타 캔버스).

### 대기(idle) 만드는 법 (전사 남, 확정)
LTX로는 숨쉬기가 안 나와서 **시작 이미지를 후처리로 움직임**: 72프레임, 호흡 10px(사용자 확정, 3px는 약했음). 스크립트 `idle_final.py`(작업 공간, 사라질 수 있음).

## 5. 모션별 현황 (2026-11-12 23:58)

### 달리기 — 작업 방식
1. LTX로 직업별 달리기 초안(3초, 시드 여러 개) → 프레임 시트로 "달리는 유형이 보이는지" 판단.
2. 보이는 것은 **Gemini에 기본 영상 + 시작 이미지 + 프롬프트를 넣어 영상 재생성**(사용자가 직접). 결과(1280×720 또는 1920×1080, 24fps, 72프레임, 오른쪽 아래 워터마크)를 다운로드 폴더에 저장.
3. Claude가 가져와 키잉·정렬(640×800, 키 516, 발 787)·루프 프레임 선택.

| 직업 | LTX 기본 영상 | Gemini | 다음 |
| --- | --- | --- | --- |
| 전사 남 | runA s6300 | **완료** (`3aa29cff` 1280×720 채택. `d95cdb7a` 1920×1080은 발이 화면 아래로 잘려 제외. 둘 다 3초 72프레임) | 후처리 완료 41프레임(2걸음), 저장소 반영 |
| 궁수 여 | runB s7100 (좋음) | **완료** `a84f8329` (11-13) | 후처리 완료 23프레임. **이음매가 살짝 튐 → 별도 보정 예정**(2주기 자르기·크로스페이드·프레임별 위치 보정 비교) |
| 궁수 남 | runB s7102 (좋음) | **완료** `cdbba5c5` | 후처리 완료 18프레임 |
| 성직자 여 | runD s7302 (좋음) | **완료** `8a5b0fd5` | 후처리 완료 19프레임 |
| 도적 남 | runD s7316 (좋음) | **완료** `3a223b95` | 후처리 완료 20프레임 (이음매 차이 0.91, 가장 깔끔) |
| 마법사 남 | runD s7308 (좋음) | **완료** `b63dac07` (11-13 오전) | 후처리 완료 17프레임 (배율 0.977), 저장소 반영 전 |
| 도적 여 | runB s7112 (망토가 크게 퍼짐) | 묶음 06 — 11-13 `6b4c7cfd` **실패: 옷이 마법사 남 코트로 바뀜**(같은 채팅방에서 연달아 만들어 섞인 것으로 추정). 색 바꾸기로는 못 고침 | **새 채팅방 + 옷 설명 한 줄 추가 프롬프트로 재생성** |
| 성직자 남 | runB s7106 (보통, 걷기에 가까움) | 묶음 07 (다음 날) | 대기 |
| 마법사 여 | runB s7108, runD s7304·s7306 (모두 약함) | 묶음 08 (**runE s7404 채택**) | 다음 Gemini (11-13, 프롬프트 강화: "runs in place energetically, two clear running cycles, knees lift high, both feet briefly leave the ground", 부정에 small steps·walking 추가) |
| 전사 여 | runB s7116 (약함) | 묶음 09 (**runE s7414 채택**) | 다음 Gemini |

- **Gemini 결과 후처리 (2026-11-13 확정):** 결과는 1280×720, 24fps, 10초(240프레임). 배경이 순수 마젠타가 아니라 약 (236, 32, 220) → 테두리 중앙값을 배경색으로 쓰고 거리 d 기준 alpha = clip((d−45)/(120−45)) (예전 130/280 기준은 피부가 반투명해져 얼굴이 회색이 됨). 오른쪽 아래 [640:, 1080:] 워터마크 제거 → 처음 1초 뒤에서 같은 자세로 돌아오는 주기 P(16~60)와 시작점을 자동 탐색 → 첫 프레임(시작 이미지) 키로 배율 = 516/키 → 주기 안 가장 낮은 발을 y=787, 평균 중심을 x=320에 고정. 스크립트 `pp.py`(작업 공간). 결과: 작업 공간 `run_final/<직업>/run_NN.png, run.gif, sheet.png, run.json`.
- **Gemini 주의 (11-13):** 같은 채팅방에서 여러 캐릭터를 연달아 만들면 앞 캐릭터의 옷이 섞임 → **번호마다 새 채팅방**. 프롬프트 맨 앞에 옷 설명 한 줄(예: 도적 여 "The character wears a light gray hooded cloak over a short brown leather tunic with a brown belt and gold buckle, white shorts, a purple scarf, and purple boots with white bandages. Do not change any part of this outfit.")을 넣음. 하루 한도(계정당 3개)를 다 쓰면 다음 날.
- **사용자 진행 방식:** 사용자는 자기 브라우저의 Gemini에서 생성. Claude는 번호마다 **시작 이미지·참고 영상을 이 대화에 SendUserFile로 올리고 프롬프트도 함께 붙여 줌**(경로에서 찾는 수고를 덜기 위함). 계정이 막히면 다른 계정으로 전환.
- 저장소 반영: `archive/art_source/sd_sprites/run/<직업>/` (run_NN.png, run.gif, run.json). 게임용 시트(`prototype/assets/chr/`)는 아직 안 만듦.
- Gemini 묶음: `C:\Users\apple\Downloads\run_gemini\` — `00_prompt.txt`(사용법·공통 프롬프트), `0N_<직업>_run_base.mp4`, `0N_<직업>_start.png`. 계정 A: 01~03, 계정 B: 04~06, 07은 다음 날.
- 시작 이미지 원본: 작업 공간 `/mnt/user-data/outputs/runstart/pf_run_start_<직업>_mag.png` (800×800, 몸 높이 약 515px). ComfyUI input에도 같은 이름.

### 공격
- **후처리 스크립트:** `archive/art_source/sd_sprites/tools/attack_ltx_pp.py` (동작 구간 자동 탐지 → 16프레임). 전사 남 후보 대각 7702·내려찍기 7720·찌르기 7830도 처리함(작업 공간 `atk/final_more/`).
- 11-13 밤 ComfyUI는 1건 3~4분(Qwen 편집 뒤 VRAM 여유 4GB). 예전 1분 20초.
| 직업 | 상태 |
| --- | --- |
| 전사 남 | **가로 베기 7904 완료**: 16프레임 1024×880, 충돌 프레임 8·9·10, `attack_horizontal.json`, `warrior_m_attack_horizontal.zip` 전달. 후보: 대각 베기 7702, 상단 찌르기 7712(7프레임 정지 → 약 14프레임으로 줄이자는 안, 미실행), 내려찍기 7720, 찌르기 7830, 회전 7812, 백핸드 7820. 남은 문제: 중간 프레임 색 번짐, 검 번짐(1~2, 8~9) |
| 전사 여 | atkF(11-13 밤) 시험 완료: **가로 7952 · 대각 7960 · 찌르기 7970 채택**, 16프레임 처리(작업 공간 `atkF/final/`, 찌르기는 발 기준 x=400). 중간 프레임 치마 올리브빛 색번짐 |
| 궁수 여 | atkF: **활 쏘기 7980 채택**(발사 7~9프레임, 화살은 게임에서 따로). 근접 휘두르기 7990·7992는 타격 효과·적이 그려져 탈락 → 부정어 보강해 재생성 |
| 나머지 | Gemini 무기 든 시작 이미지 대기 (요청 묶음 `gemini_atk.zip` 전달됨). 도적은 단검(하나 vs 쌍 비교 후 결정), 성직자는 마법 시전(남은 기존 SD + 책) |

### 서 있기·앉기
- 전사 남(갈색 머리 새 디자인): 앉기 `warrior_m_sit_5404.zip`, 대기 `warrior_m_idle_72f.zip` 전달. **저장소에는 아직 반영 안 함** (경로 `archive/art_source/sd_sprites/...`, 게임용 `prototype/assets/chr/`).
- 전사 남의 앉기 정면·걷기·정면/뒷면은 옛 디자인 그대로. 궁수 여 의자 위치 미확인.

## 6. 책 UI 펼침면 워터마크 제거 (2026-11-12)
- 원본: `Downloads\Gemini_Generated_Image_a7yezqa7yezqa7ye.png` (2752×1536), 반짝임이 책 오른쪽 아래(x 2592~2690, y 1376~1471) 책장 줄무늬·가죽 위에 걸침.
- 시도: ① 왼쪽 아래를 좌우로 뒤집어 덮기 → 줄무늬 이음매 보임. ② AI Studio Nano Banana 2 Lite(무료) 편집 → 별을 못 지우고 구도까지 바뀜, 실패. ③ **ComfyUI Qwen-Image-Edit 2509 + Lightning 4단계 LoRA → 성공.**
- 성공 방법: 원본 오른쪽 아래 1024×1024 크롭(`pf_book_corner_in.png`) → `TextEncodeQwenImageEditPlus`(프롬프트 "Remove the white four-pointed star mark. Restore the page edges and the dark red leather book cover underneath it naturally. Keep everything else exactly unchanged."), ModelSamplingAuraFlow shift 3, CFGNorm 1, KSampler 4단계 cfg 1 euler/simple, 시드 8101 → 별 주변만 경계를 부드럽게 해 원본에 섞음 → 키잉 → 1600×879.
- 결과: `prototype/assets/ui/book/book_spread.png`, 보관 `archive/assets/book/book_spread_src.png` (저장소 사본, **커밋 전**).
- 같은 방식이 **Gemini 워터마크가 그림 위에 걸린 모든 경우**에 쓸 수 있음.

## 7. 다음 순서
1. 사용자가 Gemini로 달리기 01~06 생성 → 다운로드 폴더에서 가져와 후처리.
2. 마법사 여·전사 여 LTX 달리기 재생성(각 시드 3개, 약 8분) — 승인 후.
3. 전사 여·궁수 여 공격 시험 10건 — 승인 후.
4. 전사 남 대기·앉기·공격·달리기 저장소 반영 — "커밋해줘" 후.
5. 책 UI 부품 시트 ②·③ (인수인계 `handoff_2026-11-12_night.md` 4장).
