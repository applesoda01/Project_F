# Book Versions Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 원본 v1과 개선안 v2를 함께 읽고 변경/상태를 비교한다.

**Architecture:** v1 소스 유지, v2 독립 소스, Node 빌드 도구로 mdBook 2판과 기존 URL 호환 출력 생성. 생성 HTML에 상대경로 버전 링크 추가.

**Tech Stack:** mdBook 0.4.40, Node 내장 모듈, Markdown, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-11-17-book-versions-design.md`

## Global Constraints

- 브랜치 `fix_proto_design`; 기존 원문 및 게임 코드 보존.
- 문서 반영과 게임 구현을 분리; 새 수치는 검증용.
- main 외 브랜치에서 기존 Pages를 교체하지 않는다.

## Review Focus

- 중첩 장에서 버전 전환 시 경로 유지.
- v2에만 있는 장은 v1 첫 페이지로 이동.
- 배포 하위 경로 및 로컬 파일에서 링크 작동.
- 기존 v1 원문 및 과거 측정 의미 보존.
- 미리보기 CI에 Pages 배포 권한/단계 없음.

## Tasks

- [x] 1. `docs/book-v2/` 생성. 원문 첨부 보존, 개정 장/변경 비교/기능 관리/출처 작성. 원본과 비교.
- [x] 2. `docs/tools/build-books.mjs` 및 `docs/tools/build-books.test.mjs`. 실제 빌드 테스트 실패→통과. 중첩 링크, 없는 장의 대체 경로, 원본 불변, 기존 출력 보호 검증.
- [x] 3. `.github/workflows/main.yml` 빌드 명령 교체, `book-preview.yml`에 PR/브랜치 산출물 빌드만 추가. `docs/BOOK_VERSIONS.md`에 로컬/별도 URL 배포 절차 작성.
- [x] 4. 실제 빌드·내부 링크 검사 및 독립 검토 완료. UI 접근은 도구 제한으로 미완료이며 완료 주장 범위에서 제외.

## 진행 기록

- 2026-11-17: `fix_proto_design` 생성. Node 26 사용 가능; Python 별칭 실행 불가이므로 기존 CI에도 있는 Node로 빌드 도구 작성. mdBook 공식 0.4.40 Windows 바이너리 확보.
- 결정: 사용자가 이전 제안을 승인하고 구현을 요청했으므로 같은 구성의 추가 승인 없이 진행. 실제 공개 배포는 요청 범위에서 제외하고 가능 여부/절차를 설명한다.
- 2026-11-17: mdBook 0.4.40이 일부 README 링크를 README.html로 남기는 기존 문제 확인. 생성물에서 실제 index.html로만 보정해 원본 보존. 전체 HTML 로컬 링크/자산 검사 실패→통과.
- 독립 검토: Critical/Important 없음. 테스트 임시 산출물 정리 권고를 반영. 원본 첨부는 별도 SHA-256 비교로 확인.
- 검증 범위: 문서 빌드·버전 링크·자산·원문 불변·덮어쓰기 방지. 브라우저 시각/작은 화면/검색 조작은 로컬 접근 제한으로 미완료. 원격 Actions·공개 배포·게임 밸런스 실험은 실행하지 않음. 기존 PNG 두 파일은 작업에서 제외.
- 배포 보호: 기존 main workflow에 main 전용 조건을 추가해 기능 브랜치 수동 실행으로 전체 Pages를 교체하지 않도록 함.
