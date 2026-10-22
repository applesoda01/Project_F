# 게임 데이터 (외부 작업자용)

시나리오·대사·밸런스 수치는 이 폴더의 CSV 파일에서 고칩니다. 코드는 건드리지 않아도 됩니다.

## 고치는 순서

1. CSV를 엑셀이나 구글 시트로 엽니다. 저장할 때는 **CSV UTF-8** 형식으로 저장합니다(한글이 깨지지 않게).
2. (선택) 미리 검사: `python tools/data_build.py`. 깃허브에 올리면 같은 검사가 자동으로 돌아 결과를 댓글로 알려 줍니다.
   - 오류가 있으면 어느 파일 몇 행이 왜 틀렸는지 알려 주고, 게임 데이터는 바꾸지 않습니다.
   - 통과하면 `prototype/js/data_gen.js`가 새로 만들어집니다. 이 파일은 직접 고치지 않습니다.
3. `prototype/index.html`을 열어 확인합니다. 밸런스를 고쳤다면 개발 패널의 **관문 1 검증**도 눌러 봅니다.
4. 깃허브에 올립니다. 웹에서 고쳐 올리는 방법은 [docs/github_guide.md](../docs/github_guide.md)를 보세요. `data_gen.js`는 반영될 때 자동으로 다시 만들어지므로 같이 올리지 않아도 됩니다.

## 파일

| 파일 | 내용 | 열 |
| --- | --- | --- |
| `balance.csv` | 밸런스 수치 82개 | 구분, 항목, 값, 설명 |
| `dialog.csv` | 리나 대화창 장면 (시작, 승급, 전직, 월간 보고 등 13장면) | 장면, 순서, 표정, 대사, 메모 |
| `speech.csv` | 말풍선 한마디 (모험가 상황 10 × 말투 5, 소문, 리나) | 상황, 말투, 대사, 메모 |
| `quest_types.csv` | 의뢰 종류 이름 5개 | 번호, 이름, 설명 |
| `names.csv` | 모험가 이름 목록 | 이름 |
| `meals.csv` | 요리 | 등급, 요리, 재료, 효과 |
| `skills.csv` | 스킬 | 계열, 단계, 직업, 스킬, 종류, 효과 |

## 규칙

**balance.csv**
- 등급별 값은 `|`로 구분해 F·E·D·C·B·A·S 순서로 적습니다. 예: `100|200|400|800|1500|3000|6000`
- 값의 개수는 바꿀 수 없습니다. 항목을 새로 만들거나 지우는 것은 규칙 변경이라 프로그래머가 코드와 함께 합니다.
- 구분: quest 의뢰 · growth 성장 · adv 모험가 · econ 경제 · gear 장비 · promo 승급·보스 · fame 명성 · town 마을 · ending 엔딩

**dialog.csv**
- 같은 장면의 대사는 `순서` 숫자가 작은 것부터 나옵니다. 줄을 더하면 대사가 늘어납니다.
- 표정: smile(미소) · serious(진지) · laugh(웃음) · worried(걱정) · awkward(곤란) · surprised(놀람)
- `{변수}`는 게임이 채웁니다. 장면마다 쓸 수 있는 변수가 정해져 있으며, 틀리면 검사에서 알려 줍니다.

| 장면 | 쓸 수 있는 변수 |
| --- | --- |
| load | {date} 날짜 |
| gradeup | {grade} 길드 등급 |
| promo_ready, promo_held, promo_declined | {name} 모험가 이름 |
| promo_accepted | {name}, {cls} 새 직업 |
| monthly_deficit | {loss} 적자액, {quests} 의뢰 수, {success} 성공 수 |
| monthly_good | {net} 순이익, {quests}, {success}, {rate} 성공률 |
| monthly_meal | {meal} 식당 매출 |
| monthly_low | {rate}, {net} |
| monthly_normal | {net}, {quests}, {success}, {advs} 모험가 수 |

**speech.csv**
- 상황: accept 수주 · depart 출발 · success 성공 · fail 실패 · levelup 레벨업 · gradeup 승급 · meal 식사 · drink 음료 · first 첫 방문 · chat 잡담 · rumor 소문
- 말투: bold 호탕(무모) · careful 조심(신중) · friendly 다정(사교적) · loner 무뚝뚝(독불장군) · plain 보통. 상황마다 plain 대사는 꼭 하나 이상 있어야 합니다.
- 리나 말풍선은 말투를 `lina`로 적고, 상황은 lina_meal · lina_drink · lina_depart · lina_first · lina_success · lina_fail · lina_ledger · lina_unlock · lina_idle 입니다.
- 같은 상황·말투에 여러 줄을 넣으면 무작위로 하나가 나옵니다.
