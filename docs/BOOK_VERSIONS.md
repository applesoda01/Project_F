# 기획 안내서 버전과 배포

## 원고

- `docs/book/`: 원본 v1. `6df6325` 기준 파일 보존.
- `docs/book-v2/`: 안내서 v2. 기존 `docs/design/v2/` 재분류 기획서와 다른 버전 체계.
- `docs/book-v2/src/changes.md`: 기능 ID별 변경 비교.
- `docs/book-v2/src/features.md`: 버전별 기능·기획 상태·게임 구현 상태.
- `docs/references/guild-economy-contracts-2026-11-16/original.html`: 첨부 원문 보관. 책에 별도 장으로 게시하지 않는다.
- `docs/book-v2/src/assets/ui/`: 기존 리소스 JPG 예시와 사용자 화면 기반 PNG 시안. 관련 본문에 삽입한다.
- `docs/tools/render-book-mockups.ps1`: `book-mockups.json`으로 초기 JPG 예시만 재생성한다. 새 PNG 시안은 이 스크립트 대상이 아니다.

새 제안을 수록했다고 게임 구현 상태를 완료로 바꾸지 않는다. 확정 시 결정 근거, 구현 시 코드 커밋과 검증 결과를 별도 기록한다.

## 로컬 미리보기

Node 20.12 이상과 mdBook 0.4.40을 사용한다. `MDBOOK` 환경 변수로 실행 파일 경로를 지정할 수 있다.

```powershell
$env:MDBOOK = 'C:\path\to\mdbook.exe'
node --test docs/tools/*.test.mjs
node docs/tools/build-books.mjs --out dist/book-preview
```

출력 폴더는 새 폴더 또는 빈 폴더여야 한다. 재생성할 때는 다른 출력 경로를 주거나 기존 결과를 따로 옮긴다. 빌드 도구는 기존 출력물을 삭제하거나 덮어쓰지 않는다.

`dist/book-preview/index.html`을 열면 v1, `v2/index.html`은 개정판이다. HTML·CSS·검색 파일 전체가 한 묶음이다. 폴더를 통째로 배포하며 HTML 파일만 따로 옮기지 않는다. Mermaid는 기존처럼 외부 CDN을 사용하므로 인터넷 연결이 필요하다.

## 기존 URL 유지

main 배포에 이 변경을 반영하면 다음 구조가 생성된다. **현재 배포 완료를 뜻하지 않는다.**

| 경로 | 내용 |
| --- | --- |
| `/Project_F/book/` 및 기존 장 주소 | v1 내용 유지 + 버전 링크 |
| `/Project_F/book/v1/` | v1 명시적 주소 |
| `/Project_F/book/v2/` | 개선안 v2 |
| `/Project_F/book/v2/changes.html` | 변경 비교표 |

기존 v1 원고에 메뉴를 삽입하지 않고 생성 HTML에만 메뉴를 넣는다. 같은 장을 선택하며 v2에만 있는 장은 v1 첫 페이지로 이동한다. 검색 색인은 판별로 따로 생성한다.

## 읽기 화면

우측 상단 V1/V2 드롭다운으로 버전을 선택하고, 옆의 버전 이력 메뉴에서 발행 기록을 확인한다. 기능 관리 문서는 유지하지만 도구 모음과 목차의 기능 관리 버튼은 표시하지 않는다. 버전 이력도 목차 대신 우측 메뉴로 이동했다.

v2의 변경된 목차와 본문은 붉은색 및 ‘변경’ 표식으로 구분한다. 붉은 목차를 누르면 요약 창이 열리고 ‘문서 열기’로 이동한다. Ctrl/Command 클릭은 원래 링크를 새 탭으로 여는 동작을 유지한다. 본문 변경 영역은 클릭하거나 ‘변경 요약’ 버튼으로 열 수 있다. 기존 본문의 일반 링크는 그대로 이동한다.

요약 창은 V1/V2 차이, 이유, 기획·게임 구현 상태를 짧게 보여 준다. 닫기 버튼, Escape, 바깥 클릭으로 닫는다. 드롭다운과 요약 버튼은 키보드로 조작할 수 있다. 원본에서 그대로 이어받은 문단과 공통 출처 안내는 변경 표시에서 제외한다.

비교는 생성 HTML의 문단·표·목록·이미지 단위다. 표 일부가 바뀌면 해당 표 전체를 하나의 변경 영역으로 표시하며 문자 단위 diff가 아니다. 요약은 `changes.md`의 기능별 기록과 해당 문서의 기능 ID를 사용한다. 게임 규칙이 아닌 새 참고 문서는 문서 추가로 설명한다. 관련 파일은 `docs/tools/book-changes.mjs`, `book-ui.css`, `book-ui.js`다.

## 다른 브랜치의 미리보기

`fix_proto_design` push 또는 관련 PR에서 `기획 안내서 미리보기` workflow가 HTML 산출물 ZIP을 만든다. Actions 실행 화면에서 `book-preview-<커밋>`을 받는다. 브랜치 push 전에는 원격 실행이 발생하지 않는다. 이 workflow는 Pages를 배포하지 않으며 기존 공개 사이트에 영향을 주지 않는다.

GitHub Pages는 저장소당 프로젝트 사이트 하나다. 브랜치 이름만 바꿔서 배포하면 별도 사이트가 생기는 것이 아니라 기존 사이트의 배포물이 교체된다.

별도 주소가 필요하면 다음 중 선택한다.

1. **같은 Pages의 하위 경로**: main의 전체 사이트와 특정 브랜치의 문서 결과를 하나의 산출물로 묶어 `/Project_F/previews/fix_proto_design/book/`에 게시한다. main 업데이트 때도 이 경로를 재생성해야 하며, 기존 main 배포와 같은 동시 실행 제어 아래 하나의 배포 파이프라인에서 관리해야 한다. 현재 workflow에는 이 자동 공개 기능을 추가하지 않았다.
2. **독립 호스팅 또는 별도 저장소 Pages**: 이 브랜치의 문서 산출물만 다른 사이트로 게시한다. 기존 Pages 배포와 충돌하지 않는다. 별도 사이트/호스팅 설정이 필요하다.

이 책의 버전 링크는 상대 경로라 두 방식 모두 같은 산출물을 사용할 수 있다. 실제 공개 URL·호스팅 설정·배포 권한 변경은 별도 작업이다. 이번 변경의 `최신 빌드` workflow에는 main에서만 실행하는 조건을 추가했다. 기능 브랜치에서는 전용 문서 미리보기 workflow를 사용한다. 변경 전 workflow에는 이 보호 조건이 없으므로 오래된 브랜치에서 수동 실행하지 않는다.

근거: [Pages 사이트 종류와 저장소당 제한](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages), [Actions를 이용한 Pages 배포](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).
