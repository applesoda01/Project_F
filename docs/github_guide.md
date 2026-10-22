# 깃허브 작업 안내

저장소: `applesoda01/Project_F` (비공개)

## 흐름

```
작업자가 수정 → 변경 요청(PR) → 자동 검사(데이터 검사 + 관문 1) 결과가 PR 댓글로 → 승인·반영(merge)
→ main 반영 시 자동으로: data_gen.js 다시 만들기 → 관문 1 검증 → 최신 빌드 배포
```

| 자동 작업 | 파일 | 언제 |
| --- | --- | --- |
| 데이터 검사 | `.github/workflows/data-check.yml` | PR이 올라오거나 고쳐질 때 |
| 최신 빌드 | `.github/workflows/main.yml` | main 에 반영될 때 (Actions 화면에서 직접 실행도 가능) |

## 외부 작업자: 깃허브 웹에서 고치기 (프로그램 설치 없이)

1. 저장소의 `data` 폴더에서 고칠 CSV를 엽니다 (예: `data/speech.csv`).
2. 오른쪽 위 연필 아이콘(Edit)을 누르고 고칩니다. 쉼표(,)가 들어간 칸은 큰따옴표로 감쌉니다.
3. **Commit changes…** → "Create a new branch for this commit and start a pull request" 선택 → **Propose changes** → **Create pull request**.
4. 1~2분 뒤 PR 아래에 검사 결과 댓글이 달립니다. 오류가 있으면 알려 준 행을 고쳐 같은 PR에 다시 커밋합니다.
5. `data_gen.js`는 신경 쓰지 않아도 됩니다. 반영될 때 자동으로 다시 만들어집니다.

많이 고칠 때는 CSV를 내려받아 엑셀·구글 시트에서 고친 뒤 **CSV UTF-8**로 저장해 같은 자리에 올려도 됩니다 (Add file → Upload files).

## 외부 작업자: GitHub Desktop으로 고치기

1. **Current branch → New branch** 로 작업 가지를 만듭니다 (이름 예: `speech-수정`).
2. CSV를 고치고, 가능하면 `python tools/data_build.py` 로 미리 검사합니다.
3. Commit → **Publish branch** → **Create Pull Request**.

## 윤석 (관리자)

- **검토와 반영:** PR의 검사 댓글이 모두 ✅ 이면 **Merge pull request** 를 누릅니다.
- **최신본 받기:** GitHub Desktop에서 **Fetch origin → Pull**.
- **최신 빌드 보기:**
  - Pages 주소 (설정 후): Settings → Pages 에 표시되는 주소
  - 압축 파일: Actions → 최신 빌드 → 가장 위 실행 → Artifacts 의 `최신빌드` (14일 보관)

## 처음 한 번 설정

1. **Settings → Actions → General → Workflow permissions:** "Read and write permissions" 선택 후 Save (data_gen.js 자동 커밋, PR 댓글에 필요).
2. **Settings → Pages → Build and deployment → Source:** "GitHub Actions" 선택.
   - 비공개 저장소의 Pages는 유료 요금제(GitHub Pro 등)에서만 켜집니다. 무료 요금제면 이 단계는 건너뛰고 Actions의 `최신빌드` 압축 파일을 씁니다.
3. **Settings → Collaborators → Add people:** 외부 작업자의 깃허브 아이디로 초대합니다. 권한은 Write.
4. (권장) **Settings → Branches → Add rule:** `main` 에 "Require a pull request before merging" 과 "Require status checks: 데이터 검사 / check" 를 켜면, 검사를 통과한 변경만 반영됩니다.

## 주의

- 이미지·PPT는 Git LFS로 저장됩니다. 무료 계정은 LFS 저장·전송량에 한도가 있어, 자동 작업은 게임 그림(`prototype/`)만 받도록 해 두었습니다.
- 밸런스 항목을 새로 만들거나 지우는 것, 의뢰 종류 개수를 바꾸는 것은 규칙 변경이라 코드와 함께 바꿔야 합니다.
