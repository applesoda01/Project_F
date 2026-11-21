# 오프닝 v2 — Seedance 시험 준비 (3번 컷)

- 목적: Dreamina의 무료 크레딧으로 3번 컷을 생성해 LTX 결과(`mockups/opening_v2/cmp_op03_shot.mp4`)와 비교
- 무료분은 **시험용**. 워터마크가 붙고, 상업적 사용 조건은 아직 확인하지 않았음
- 시작 그림: `archive/art_source/opening/op03_final.png` (1344×768)

## 설정

| 항목 | 값 |
| --- | --- |
| 방식 | Image to Video (시작 그림 1장) |
| 모델 | Seedance 2.0 **Mini** 먼저 (크레딧이 가장 적게 듦). 남으면 Fast 또는 2.5로 1개 |
| 화면 | 16:9 · 720p |
| 길이 | 5초 |
| 개수 | A 프롬프트 2개 + B 프롬프트 1개 (크레딧이 되는 만큼) |

## 프롬프트 A — 차분한 카메라 (추천)

```
Anime style, dark fantasy. Keep the exact art style, colors and characters of the reference image. Four adventurers stand with their backs to the camera, facing a gigantic demon lord far away under a blood-red sky. The archer in the dark green hooded cloak, second from the left, raises his bow, draws an arrow to his cheek and shoots. The arrow flies deep into the distance as a glowing streak of light and hits the demon's chest with a small flash that fades instantly, having no effect. The demon's red eyes flare brighter. The other three companions brace themselves. Embers swirl, cloaks whip in the hot wind. Camera: slow push-in from behind the group with parallax, the foreground characters move faster than the distant demon. Nobody turns toward the camera; faces are never shown.
```

## 프롬프트 B — 역동적인 카메라

```
Anime style, dark fantasy, cinematic anime opening shot. Keep the exact art style, colors and characters of the reference image. Four adventurers seen from behind face a gigantic demon lord in the far distance under a blood-red sky. The camera starts low behind the archer in the dark green hooded cloak and arcs slightly to the right around his shoulder as he raises his bow, draws and releases an arrow. The arrow streaks away into the distance, the camera follows its glowing trail toward the demon, the arrow bursts into sparks on the demon's chest without harming it, and the demon's red eyes flare. Embers and wind, strong parallax between foreground and background. Faces are never shown.
```

## 결과 받으면

- 결과 영상을 이 대화에 올려 주면, LTX 결과와 나란히 붙인 비교 영상을 만듦
- 비교 기준: ① 그림체 유지 ② 활 동작 ③ 카메라 원근감 ④ 녹거나 깨지는 부분

## 결과 (2026-11-22)

- 무료 계정에서는 Seedance 2.0 · 2.5 · 모든 해상도가 업그레이드 필요 → **Seedance 1.0 Fast**(720P · 5초 · 25크레딧)로 1개 생성
- 일일 무료 120크레딧 (한국 계정, 자정 충전 확인)
- 생성 약 1분, 1248×704 · 60fps, 우측 하단 워터마크
- 비교: `mockups/opening_v2/cmp_op03_ltx_vs_seedance.mp4` (A LTX 2번 · B Seedance)
  - Seedance: 카메라가 밀고 들어가는 원근감이 확실하고 그림체 유지 양호. 활을 당긴 뒤 약 3초에 마왕 가슴에 빛이 터졌다 사라짐
  - LTX: 동작은 비슷하게 성공, 카메라 움직임은 더 약함
- 워터마크와 상업 이용 조건 때문에 본 작업에 쓰려면 유료 플랜 약관 확인 필요
