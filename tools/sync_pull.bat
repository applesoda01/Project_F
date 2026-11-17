@echo off
rem ============================================================
rem  Project_F 자동 동기화 (2026-11-17)
rem  - 로그인할 때(시작 프로그램) 또는 더블클릭으로 실행
rem  - 남은 변경 · 푸시 안 한 커밋이 없을 때만 원격 main을 받아 옴 (git pull --ff-only)
rem  - 남은 것이 있으면 받지 않고 창으로 알려 주고 멈춤 (충돌을 만들지 않음)
rem  - 기록: %LOCALAPPDATA%\Project_F_sync.log
rem ============================================================
chcp 65001 >nul
setlocal EnableDelayedExpansion
cd /d "%~dp0.."
set "LOG=%LOCALAPPDATA%\Project_F_sync.log"

rem --- git 찾기: PATH에 없으면 GitHub Desktop에 들어 있는 git을 씀
set "GIT=git"
where git >nul 2>nul
if errorlevel 1 (
  set "GIT="
  for /d %%D in ("%LOCALAPPDATA%\GitHubDesktop\app-*") do if exist "%%D\resources\app\git\cmd\git.exe" set "GIT=%%D\resources\app\git\cmd\git.exe"
)
if not defined GIT (
  set "MSG=git을 찾지 못했어요. GitHub Desktop이 설치되어 있는지 확인해 주세요."
  goto :popup_stop
)

echo [%date% %time%] 시작: %cd%>>"%LOG%"

rem --- 지금 브랜치가 main인지
for /f "delims=" %%B in ('"%GIT%" rev-parse --abbrev-ref HEAD 2^>nul') do set "BR=%%B"
if not "!BR!"=="main" (
  set "MSG=지금 브랜치가 main이 아니에요(!BR!). GitHub Desktop에서 main으로 바꾼 뒤 다시 실행해 주세요."
  goto :popup_stop
)

rem --- 원격 확인
"%GIT%" fetch origin main >>"%LOG%" 2>&1
if errorlevel 1 (
  set "MSG=원격(GitHub)에 연결하지 못했어요. 인터넷 연결을 확인해 주세요."
  goto :popup_stop
)

rem --- 남은 변경(커밋 안 한 파일)
set "DIRTY=0"
for /f "delims=" %%L in ('"%GIT%" status --porcelain') do set /a DIRTY+=1
rem --- 푸시 안 한 커밋 / 받아 올 커밋 수
for /f %%N in ('"%GIT%" rev-list --count origin/main..HEAD') do set "AHEAD=%%N"
for /f %%N in ('"%GIT%" rev-list --count HEAD..origin/main') do set "BEHIND=%%N"
echo   남은 변경 !DIRTY! / 푸시 안 한 커밋 !AHEAD! / 받을 커밋 !BEHIND!>>"%LOG%"

if not "!DIRTY!"=="0" (
  set "MSG=커밋하지 않은 변경이 !DIRTY!개 있어서 받지 않았어요. GitHub Desktop의 Changes 탭을 확인해 주세요. (받을 커밋 !BEHIND!개)"
  goto :popup_stop
)
if not "!AHEAD!"=="0" (
  set "MSG=이 PC에 푸시하지 않은 커밋이 !AHEAD!개 있어서 받지 않았어요. 먼저 Push 해 주세요. (받을 커밋 !BEHIND!개)"
  goto :popup_stop
)
if "!BEHIND!"=="0" (
  echo   이미 최신>>"%LOG%"
  if /i "%~1"=="/quiet" exit /b 0
  set "MSG=이미 최신이에요. 받을 것이 없어요."
  goto :popup_ok
)

"%GIT%" pull --ff-only origin main >>"%LOG%" 2>&1
if errorlevel 1 (
  set "MSG=받기(Pull)에 실패했어요. 기록 파일을 확인해 주세요: %LOG%"
  goto :popup_stop
)
for /f "delims=" %%H in ('"%GIT%" log -1 --format^=%%h') do set "HEADC=%%H"
echo   받음: 커밋 !BEHIND!개, 지금 !HEADC!>>"%LOG%"
set "MSG=최신본을 받았어요. 커밋 !BEHIND!개, 지금 !HEADC!"
goto :popup_ok

:popup_stop
echo   멈춤: !MSG!>>"%LOG%"
powershell -NoProfile -Command "Add-Type -AssemblyName PresentationFramework; [void][System.Windows.MessageBox]::Show($env:MSG, 'Project_F 동기화 - 확인 필요', 'OK', 'Warning')"
exit /b 1

:popup_ok
powershell -NoProfile -Command "Add-Type -AssemblyName PresentationFramework; [void][System.Windows.MessageBox]::Show($env:MSG, 'Project_F 동기화', 'OK', 'Information')"
exit /b 0
