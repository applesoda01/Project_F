# 게임 데이터 (외부 작업자용)

시나리오·대사·밸런스 수치는 이 폴더의 CSV 파일에서 고칩니다. 코드는 건드리지 않아도 됩니다.

## 고치는 순서

1. CSV를 엑셀이나 구글 시트로 엽니다. 저장할 때는 **CSV UTF-8** 형식으로 저장합니다(한글이 깨지지 않게).
2. (선택) 미리 검사: `python prototype/tools/data_build.py`. 깃허브에 올리면 같은 검사가 자동으로 돌아 결과를 댓글로 알려 줍니다.
   - 오류가 있으면 어느 파일 몇 행이 왜 틀렸는지 알려 주고, 게임 데이터는 바꾸지 않습니다.
   - 통과하면 `prototype/js/data_gen.js`가 새로 만들어집니다. 이 파일은 직접 고치지 않습니다.
3. `prototype/index.html`을 열어 확인합니다. 밸런스를 고쳤다면 개발 패널의 **관문 1 검증**도 눌러 봅니다.
4. 깃허브에 올립니다. 웹에서 고쳐 올리는 방법은 [docs/github_guide.md](../docs/github_guide.md)를 보세요. `data_gen.js`는 반영될 때 자동으로 다시 만들어지므로 같이 올리지 않아도 됩니다.

## 파일

| 파일 | 내용 | 열 |
| --- | --- | --- |
| `balance.csv` | 밸런스 수치 108개 | 구분, 항목, 값, 설명 |
| `dialog.csv` | 리나 대화창 장면 (시작, 승급, 전직, 월간 보고 등 13장면) | 장면, 순서, 표정, 대사, 메모 |
| `speech.csv` | 말풍선 한마디 (모험가 상황 10 × 말투 5, 소문, 리나) | 상황, 말투, 대사, 메모 |
| `quest_types.csv` | 의뢰 종류 이름 5개 | 번호, 이름, 설명 |
| `names.csv` | 모험가 이름 목록 | 이름 |
| `meals.csv` | 요리 | 등급, 요리, 재료, 효과 |
| `skills.csv` | 스킬 | 계열, 단계, 직업, 스킬, 종류, 효과 |
| `collegium_data.json` | 소재·음식·장비·물약·퀘스트(기본 의뢰 35칸 + 메인·서브·승급, 적·판정·조건·대사)·기간 규칙 계수. **소재 편집기(`tools/material_editor`)로만 고칩니다** | JSON (형식은 편집기 README) |

## 소재 편집기 데이터 (`collegium_data.json`)

- 소재 편집기에서 **저장**하면 이 폴더에 `collegium_data.json`(+ `icons/`)이 만들어집니다. 직접 고치지 않습니다.
- `data_build.py`가 검사합니다: 기본 의뢰 35칸이 다 있는지, 보상·조합법 소재가 있는 소재인지, 선행 퀘스트가 있는지·돌고 도는지, 적 이름·수, 기간이 1주 이상인지 등. 비어 있는 보상·대사, 90자 넘는 대사는 **경고**만 합니다.
- 검사를 통과하면 자동값(기간 규칙 계수 + 이 폴더의 `balance.csv`)을 계산해 최종값을 `data_gen.js`에 넣습니다. 편집기 화면의 계산과 같은 식입니다.
- 게시판 칸(유형 × 등급)에는 퀘스트가 여러 개 있을 수 있고, 게임·시뮬레이터는 의뢰를 만들 때 그 칸 중 하나를 무작위로 고릅니다. 같은 칸인데 주 소재가 다르거나, 부 소재가 게시판 퀘스트 한 곳에서만 나오면 **경고**합니다.
- 게임·시뮬레이터는 **게시판 칸 퀘스트**의 이름·소요 주·보상 금액·판정 기준치·요구 능력치(직접 지정한 경우)·명성·신뢰도 변화를 이 값으로 씁니다(시뮬레이터는 사망률도). 파일이 없으면 `balance.csv` 값만 씁니다.
- 메인·서브·승급 퀘스트, 적·배경·대사·등장 조건은 `data_gen.js`에 들어가지만 아직 게임에서 쓰지 않습니다(집무실 방문·원정 미니 뷰를 붙일 때 사용).
- `balance.csv`를 고치면 편집기에서 **balance.csv 다시 읽기**를 누르고, `data_build.py`를 다시 돌리세요.
- 등급별 기본 보상(`quest,reward`)은 소재 편집기에서도 고칠 수 있습니다. 편집기에서 저장하면 balance.csv의 그 줄만 바뀝니다.

## 규칙

**balance.csv**
- 등급별 값은 `|`로 구분해 F·E·D·C·B·A·S 순서로 적습니다. 예: `100|200|400|800|1500|3000|6000`
- 값의 개수는 바꿀 수 없습니다. 항목을 새로 만들거나 지우는 것은 규칙 변경이라 프로그래머가 코드와 함께 합니다.
- 구분: quest 의뢰 · growth 성장 · adv 모험가 · econ 경제 · gear 장비 · promo 승급·보스 · fame 명성 · town 마을 · ending 엔딩 · **combat 전투**(2026-11-03, 직업별 체력·마력·공격력, 회피·치명타, 물약, 후퇴선, 부상. 직업 순서는 전사|궁수|마법사|성직자|도적, 성향 순서는 신중|보통|무모 또는 절약|보통|낭비. 아직 게임·시뮬레이터에서 쓰지 않음, [docs/design/quest_combat.md](../docs/design/quest_combat.md))

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
