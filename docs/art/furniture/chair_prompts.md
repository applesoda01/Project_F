# 의자 3면(정면·후면·측면) × 색상 3종 생성 프롬프트

> 기준 이미지: 사용자가 첨부한 정면 의자 (밝은 원목, 사다리형 등받이 3단, 아래 가로 받침대 1개)
> 15° 시점은 의자에 적용하지 않음. 3면 모두 **완전 정사영(Orthographic)** 으로 생성.
> 총 9장 = 색상 3종 × 3면. 생성 순서: 색상별로 정면 → 측면 → 후면.

## 0. 공통 규칙 (모든 프롬프트 맨 앞에 붙임)

```
Use the attached image as the exact design reference. Keep the SAME chair: same proportions,
same ladder-back with 3 horizontal slats, same thick seat plank, same 4 legs with one lower
front stretcher, same hand-painted fantasy game-asset style, soft wood grain, thin dark-brown
outline, warm highlight on the top edges. Perfectly flat orthographic view, no perspective,
no camera tilt. Single object centered, full chair visible with margin on all sides.
Plain flat warm-gray background (#B9A79B), no floor, no cast shadow, no ground shadow, no text,
no watermark. Square 1:1, high resolution.
```

## 1. 색상 3종 정의

| 코드 | 이름 | 나무색 지시문 (프롬프트에 삽입) | 용도 |
|---|---|---|---|
| A | 밝은 원목 | `light honey oak wood, warm tan (#D9A86C base)` | 기준(첨부 이미지와 동일) |
| B | 중간 갈색 | `medium chestnut brown wood, (#A8693A base)` | 일반 |
| C | 어두운 월넛 | `dark walnut wood, deep brown (#5E3A22 base)` | 고급/VIP 좌석 |

## 2. 면별 프롬프트 (공통 규칙 + 색상 지시문 + 아래 문장)

**정면 (Front)** — 첨부 이미지를 그대로 사용하므로 색상 B, C만 생성
```
Front view, exactly facing the camera. Recolor the attached chair to {색상 지시문}.
Do not change the shape at all; only change the wood color and keep the same shading logic.
```

**측면 (Side, 오른쪽 프로필)**
```
Pure side profile view, rotated exactly 90 degrees to the right (camera at the chair's right side).
Show the thin profile of the two back posts and slats as a single narrow vertical bar, the seat
plank as a horizontal bar with its depth, front and back legs, and the lower stretcher in profile.
Seat height about 45% of total chair height. {색상 지시문}.
```

**후면 (Back)**
```
Back view, exactly from behind. Show the rear of the ladder-back slats and rear posts, the seat
plank's back edge, the two rear legs in front with the front legs partially hidden behind them.
Same silhouette width as the front view. {색상 지시문}.
```

## 3. 일관성 유지 요령 (중요)

1. **한 채팅 안에서** 진행: 정면 → 측면 → 후면 순서로 요청하고, 매번 첨부 이미지를 다시 붙입니다.
2. 측면·후면이 어긋나면 `Match the exact height, width and slat positions of the attached front view`를 한 줄 추가합니다.
3. 색상 B, C는 A의 3면이 확정된 뒤, 확정된 A 3장을 첨부하고 `Recolor only` 요청으로 만드는 편이 형태가 가장 잘 유지됩니다.
4. 배경은 단색으로 요청했으므로 이후 배경 제거가 쉽습니다. 바닥 그림자는 게임에서 코드로 별도 처리합니다.
5. 측면·후면에서 원근이 들어가면 `orthographic, no perspective, like a technical turnaround sheet`를 강조합니다.

## 4. 납품 규격 (가공 후)

- 투명 PNG, 192×256 (블루프린트 의자 규격), 의자 하단 중앙 정렬
- 파일명: `chair_{A|B|C}_{front|side|back}.png`
- 저장 위치: `art_source/furniture/chair/` (원본), `prototype/assets/furniture/` (가공본)
