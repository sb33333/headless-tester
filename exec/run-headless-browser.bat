@echo off
chcp 65001 >nul

setlocal

set "DEFAULT_URL=http://localhost:8080"
:: %~dp0는 현재 배치파일이 있는 폴더 경로를 의미합니다.
set "DEFAULT_USER_DATA_DIR=%~dp0temp_profile"
set "DEFAULT_HEADLESS_PORT=9222"

:: if와 괄호 사이에 반드시 공백이 있어야 합니다.
if "%~1"=="" (
    set "TARGET_URL=%DEFAULT_URL%"
) else (
    set "TARGET_URL=%~1"
)
if "%~2"== "" (
    set "USER_DATA_DIR=%DEFAULT_USER_DATA_DIR%"
) else (
    set "USER_DATA_DIR=%~2"
)
if "%~3"=="" (
    set "HEADLESS_PORT=%DEFAULT_HEADLESS_PORT%"
) else (
    set "HEADLESS_PORT=%~3"
)

echo URL::: %TARGET_URL%
echo USER_DATA_DIR::: %USER_DATA_DIR%
echo HEADLESS_PORT::: %HEADLESS_PORT%
pause

"C:\Program Files\Google\Chrome\Application\chrome.exe" --headless --disable-gpu --no-sandbox --remote-debugging-port=%HEADLESS_PORT% --enable-logging --v=1 --log-dest=stdout --remote-allow-origins=* --user-data-dir="%USER_DATA_DIR%" --disable-features=Translate,NetworkService,NetworkServiceInProcess --no-first-run --disable-sync "%TARGET_URL%"

set /p CONFIRM="작업에 사용된 폴더(%USER_DATA_DIR%)를 삭제하시겠습니까?(Y/N): "

:: /i 옵션은 대소문자 구분 안 함, 괄호 앞뒤 공백 확인
if /i "%CONFIRM%"=="Y" (
    timeout /t 2 >nul
    rmdir /s /q "%USER_DATA_DIR%"
    if exist "%USER_DATA_DIR%" (
        echo "일부 파일이 삭제되지 않았습니다."
    ) else (
        echo "폴더가 삭제되었습니다."
    )
) else (
    echo "사용자 데이터를 유지합니다."
)

pause
endlocal