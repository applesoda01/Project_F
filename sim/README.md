# 밸런스 시뮬레이터

| 파일 | 내용 |
| --- | --- |
| `sim_engine.js` | 시뮬레이터 엔진 (현재 기준, 명성 포함). 수치 기본값 `defaults()`는 게임도 사용 |
| `guild_sim_v0.1.html` | 시뮬레이터 화면 v0.1 (브라우저로 열기). 안에 든 엔진은 명성 도입 전 버전 |
| `scripts/fame_cmp.js` | 60판 요약: 연도별 모험가 수, 길드 등급 도달, 첫해 순이익·성공률, 명성 추이 |
| `scripts/long_cmp.js` | 장기 지표: S급 도달, 첫 엔딩, 10·15년차 모험가 수, 사망자, 첫 2차 전직 |
| `scripts/promo_test.js` | 게임 규칙으로 전직 시점 측정 (자동 승인 봇 40판) |

```
node sim/scripts/fame_cmp.js sim/sim_engine.js
node sim/scripts/long_cmp.js sim/sim_engine.js
cd sim/scripts && node promo_test.js
```

`fame_cmp.js`와 `long_cmp.js`는 두 번째 인자로 명성 설정을 JSON으로 덮어써 비교할 수 있습니다.
