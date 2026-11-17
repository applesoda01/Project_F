# tools/sync_pull.bat — Project_F 자동 동기화

로그인할 때마다(또는 더블클릭으로) 원격 main을 받아 옵니다. **남은 변경이나 푸시 안 한 커밋이 있으면 받지 않고 창으로 알려 주고 멈춥니다** — 충돌을 만들지 않습니다.

## 설치 (PC마다 한 번, 1분)
1. 파일 탐색기에서 `C:\dev\Project_F\tools\sync_pull.bat`을 오른쪽 클릭 → **바로 가기 만들기**
2. `Win + R` → `shell:startup` 입력 → 열린 폴더에 1번의 바로 가기를 옮겨 넣기
3. 끝. 다음 로그인부터 자동으로 돕니다. 바로 해 보려면 `sync_pull.bat`을 더블클릭

## 창이 뜨면
| 창 | 뜻 | 할 일 |
| --- | --- | --- |
| 최신본을 받았어요 / 이미 최신이에요 | 정상 | 없음 |
| 커밋하지 않은 변경이 N개 | 이 PC에서 고친 파일이 남아 있음 | GitHub Desktop Changes 탭 확인 → 커밋 · 푸시 또는 버리기 |
| 푸시하지 않은 커밋이 N개 | 이 PC에만 있는 커밋 | Push origin |
| 브랜치가 main이 아니에요 | 다른 브랜치에 있음 | main으로 바꾸기 |
| 원격에 연결하지 못했어요 | 인터넷 | 연결 확인 |

- 기록: `%LOCALAPPDATA%\Project_F_sync.log`
- `git`이 PATH에 없으면 GitHub Desktop에 들어 있는 git을 씁니다.
- "이미 최신" 창이 귀찮으면 바로 가기 대상 끝에 ` /quiet`를 붙이면 그때는 창을 띄우지 않습니다.
