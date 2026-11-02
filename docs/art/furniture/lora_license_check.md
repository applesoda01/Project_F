# 탁자·의자 LoRA 후보 라이선스·시점 확인 (2026-10-26)

대상: 스팀 상업 출시용 2D 애니풍 길드 경영 게임의 탁자·의자. 시점 "정면 15°"(탁자 윗면 타원 세로÷가로 ≈ 0.26), 화풍 2D 애니풍, 생성은 ComfyUI.
조사 방법: 제작자 원본 페이지(Hugging Face, Civitai)와 Black Forest Labs(BFL) 공식 페이지를 열어 읽음. 법률 자문이 아니며 "확정"이 아님. 모델 파일은 내려받거나 설치하지 않았음. 샘플 이미지는 직접 보지 못하고 페이지 글과 프롬프트로만 판단함(아래 시점·화풍 항목은 그 한계 안에서의 추정).

## 결론

1. **이 용도에 바로 맞는 후보는 없음.** 세 후보 모두 정면 15° 2D 애니풍이라는 근거를 페이지에서 찾지 못함 (후보 1은 3D풍·아이소메트릭, 후보 2는 아이소메트릭, 후보 3은 정면 구도에 가깝지만 3D·일러스트풍).
2. **상업 이용 근거가 가장 분명한 쪽은 후보 1의 LoRA 자체(Apache-2.0)이지만, 기반 모델 FLUX.1-dev 라이선스가 모호함.** 상업 출시용이면 BFL에 직접 문의하거나 상업 라이선스를 검토하는 것이 안전함.
3. 후보 2·3은 Civitai 페이지에서 라이선스 표기를 확인하지 못함(미확인). 상업 이용을 전제로 쓰기 전에 모델 페이지의 라이선스 항목을 직접 열어 확인해야 함.
4. 선택 후보 중에서는 **Animagine XL 4.0**(SDXL 계열 체크포인트, 페이지에 상업 이용 허용이 적힘)이 라이선스 근거는 가장 분명함. 다만 인물 위주 모델이라 가구만 뽑을 수 있는지는 미확인.

추천 순위 (시점·화풍 적합성과 라이선스 근거를 함께 본 임시 판단):
- 1순위: Animagine XL 4.0 (체크포인트, 가구 생성 가능 여부는 시험 필요)
- 2순위: 후보 3 Game Props (구도는 정면에 가까움, 라이선스 미확인)
- 3순위: 후보 2 Mobile Game Isometric Furniture XL (아이소메트릭이라 시점 불일치)
- 보류: 후보 1 Flux-Game-Assets-LoRA-v2 (BFL 라이선스 확인 전)

## 후보별 확인표

| 후보 | 원본 URL | LoRA 라이선스 | 기반 모델 라이선스 | 생성물 상업 이용 | 시점 | 화풍 | 비고(미확인 포함) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1. Flux-Game-Assets-LoRA-v2 | https://huggingface.co/gokaygokay/Flux-Game-Assets-LoRA-v2 | Apache-2.0 (페이지 표기) | FLUX.1 [dev] Non-Commercial License (아래 별도 정리) | LoRA 쪽은 제한 없음. 기반 모델 조항이 모호함 → 미확인 | 샘플 프롬프트에 isometric이 많고 정면 지정은 없음 | 3D 렌더풍, 픽셀아트 1개, 2D 애니풍 프롬프트 없음 | 학습 데이터: 데이터셋 이름 언급 없음(학습 도구만 명시) → 미확인. 호출어 `wbgmsst`. 샘플은 프롬프트로만 확인 |
| 2. Mobile Game Isometric Furniture XL | https://civitai.com/models/1862673/mobile-game-isometric-furniture-xl | **미확인** (아래 비고) | SDXL 1.0 → CreativeML Open RAIL++-M | 미확인 | 아이소메트릭 (제작자 설명·태그) | 캐주얼 모바일 게임풍, 단순 배경용 | 같은 페이지를 읽은 결과가 서로 달랐음. 첫 번째 확인에서는 Open RAIL++-M과 부록 링크가 있다고 나왔고, 이후 두 번의 확인에서는 라이선스 항목과 해당 문구가 페이지에 없다고 나옴. 어느 쪽이 맞는지 이 조사에서 가리지 못함. 학습 데이터 언급 없음(스텝 2,520, 에폭 7만 표기). 샘플 1장의 내용은 확인 못함 |
| 3. Game Props | https://civitai.com/models/543078/game-props | **미확인** (페이지에 표기 없음, 서비스 약관 링크만) | SDXL 1.0 → CreativeML Open RAIL++-M | 미확인 | 예시 프롬프트에 중앙·정면·대칭 구도가 많음 (프롬프트로 추정) | 3D·스타일 일러스트풍, 발광 효과, 어두운/그라데이션 배경. 2D 애니풍 여부 미확인 | 학습 데이터 언급 없음. 샘플 1장의 내용은 확인 못함 |

## FLUX.1 [dev] 라이선스 (후보 1의 기반 모델)

원본 `LICENSE.md` 전문은 이번에 열지 못함(접근 제한). 아래는 모델 카드, 허깅페이스 토론, BFL 도움말과 제3자 요약에 근거한 정리이며, 정확한 문구는 직접 확인해야 함.

| 항목 | 내용 | 출처 |
| --- | --- | --- |
| Outputs 조항 (2.4) | 생성물을 상업 목적 포함 어떤 목적에도 쓸 수 있다는 취지. 인용: "for any purpose (including for commercial purposes)" | 허깅페이스 토론 #136의 사용자 인용 |
| 모델 카드 | 인용: "Generated outputs can be used for personal, scientific, and commercial purposes" | 모델 카드 (페이지 자체가 "Non-Commercial"과 상충한다고 읽힘) |
| 비상업 정의 (1.3) | 모델이나 그 출력에서 대가를 받는 활동은 비상업이 아니라는 취지 | 토론 #136의 사용자 요약 |
| 제한 조항 (4(a)) | 상업·제작 목적 사용 금지. 인용: "Use for commercial or production purposes." | 제3자 요약(DeepWiki), 원문 미확인 |
| 같은 요약의 해석 | 위 제한은 모델 사용에 대한 것이고 생성물은 상업 이용 가능(경쟁 모델 학습만 제외) | 제3자 요약, 원문 미확인 |
| BFL 공식 해석 | **찾지 못함.** 토론 #136에는 BFL 직원 답변이 없고, 사용자들도 "충돌이 있다"고 봄 | 토론 #136 |
| BFL 도움말 | FLUX.1 [dev] 오픈 웨이트는 "FLUX Non-Commercial: commercial license required"로 표기. API는 인용: "full commercial rights with no separate license". FLUX 생성물로 모델을 학습시키려면 별도 Synthetic Data 라이선스가 필요 | https://help.bfl.ai/articles/9272590838-self-serve-dev-license-overview-pricing |

정리: 모델 카드와 Outputs 조항은 생성물 상업 이용을 허용하는 것으로 읽히지만, 라이선스 이름과 비상업 정의, 제한 조항과 충돌해 보이고 BFL의 공식 해석은 찾지 못했음. 공식 문구가 모호하므로 안전하다고 단정할 수 없음.

### 상업 라이선스 (FLUX.1 [dev])

- 셀프 호스팅 상업 라이선스 약관: https://bfl.ai/legal/self-hosted-commercial-license-terms
  - 대상은 "FLUX [dev]" 모델이며 FLUX.1 [dev]가 명시되어 있지 않아 포함 여부는 미확인. EU는 별도 약관.
  - 요금은 약관에 숫자가 없고 https://bfl.ai/pricing/licensing 에 있다고 안내됨 (이 페이지는 열지 못함) → 가격 **미확인**.
  - 신청: 별도 신청 절차 설명 없음. 약관 수락 및 Developer Terms 동의, 사용량(이미지 수) 보고 또는 추적 소프트웨어 사용 필요. 콘텐츠 필터링 구현, 제3자 청구에 대한 BFL 면책 의무 조항 있음.
- 도움말 기준: 셀프서비스(Builder)는 FLUX.2 [klein]만 해당. 그 외는 영업 문의. FLUX.1 [dev]를 확장 옵션으로 받을 수 있는지는 문의가 필요함.

## 선택: 정면에 가까운 2D 애니풍에 쓸 수 있는 SDXL 계열

정면 15° 가구에 특화되어 상업 이용이 명시된 LoRA는 찾지 못함. 아래는 애니풍 기반으로 쓸 수 있는 후보이며, 가구 생성 적합성은 시험이 필요함.

| 후보 | 원본 URL | 종류 | 라이선스·상업 이용 | 호출어·사용법 | 비고 |
| --- | --- | --- | --- | --- | --- |
| Animagine XL 4.0 | https://huggingface.co/cagliostrolab/animagine-xl-4.0 | SDXL 체크포인트 | CreativeML Open RAIL++-M. 페이지의 License 항목에 상업 이용이 허용으로 적혀 있음 | 호출어 없음. 주제 태그(1girl 등) + 품질 태그(masterpiece, high score, great score, absurdres) | 학습 데이터 "840만 장의 다양한 애니풍 이미지", 출처 상세 미확인. 인물 없는 장면 생성 가능 여부는 페이지에 없어서 미확인 |
| Linaqruf/anime-detailer-xl-lora | https://huggingface.co/Linaqruf/anime-detailer-xl-lora | 디테일 슬라이더 LoRA | openrail++ (Open RAIL++-M). 상업 이용 별도 언급 없음 | 호출어 없음, 강도(스케일)로 디테일 조절 | 가구용이 아니라 애니풍 디테일 조절용. 학습 데이터 설명 없음 |
| Linaqruf/pastel-anime-xl-lora | https://huggingface.co/Linaqruf/pastel-anime-xl-lora | 화풍 LoRA | openrail++ (Open RAIL++-M). 상업 이용 별도 언급 없음 | 호출어 없음, Danbooru 태그 | 학습 데이터 "고품질 애니풍 이미지 선별본", 데이터셋 저장소 링크 있음. 샘플 내용은 확인 못함 |

참고: Open RAIL++-M 계열은 사용 제한(불법, 유해 콘텐츠 등) 조항이 붙은 라이선스이며 이번에 라이선스 원문 전체를 읽지는 못함. Animagine과 Linaqruf 모델은 학습 데이터에 저작권 있는 이미지가 섞였을 가능성에 대한 언급이 페이지에 없음(미확인).

## 내가 직접 확인해야 할 것

1. FLUX.1-dev `LICENSE.md` 전문 (허깅페이스에서 약관 동의 후 열람): 2.4 Outputs, 1.3 비상업 정의, 4(a) 제한 조항의 정확한 문구와 충돌 여부.
2. BFL에 문의: 비상업 라이선스로 받은 FLUX.1-dev 가중치로 만든 그림을 상업 게임에 써도 되는지. 또는 https://bfl.ai/pricing/licensing 에서 FLUX.1 [dev] 상업 라이선스 가격과 포함 여부.
3. 후보 2(Mobile Game Isometric Furniture XL)와 후보 3(Game Props)의 Civitai 페이지에서 License 및 "Permissions"(상업 이용, 생성 이미지 판매 허용 여부) 항목. 로그인 상태에서 사이드 패널을 확인.
4. 제작자(후보 1~3)에게 상업 이용 가능 여부와 학습 데이터 출처 문의 (특히 후보 2·3은 라이선스 표기가 없거나 불확실함).
5. 샘플 이미지를 직접 보고 시점(정면 15° 가능 여부)과 화풍(2D 애니풍 가능 여부) 확인. 이번 조사는 이미지를 보지 못하고 프롬프트·설명에 의존함.
6. Animagine XL 4.0으로 "no humans, table, chair, front view, white background" 같은 태그로 가구만 뽑을 수 있는지 시험.
7. 스팀 등록 시 AI 생성물 공개 항목(AI 사용 표기) 요건 확인 (이번 조사 범위 밖).
