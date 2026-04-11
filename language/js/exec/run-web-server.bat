@echo off
setlocal

:: 1. 실행할 JAR 파일 이름 고정
set "JAR_FILE=resource-server.jar"

:: 2. 파일 존재 여부 확인
if not exist "%JAR_FILE%" (
    echo [오류] "%JAR_FILE%" 파일을 찾을 수 없습니다.
    pause
    exit /b
)

:: 3. 파라미터 처리
:: %~1 : 첫 번째 인자 (서빙 경로)
:: %~2 : 두 번째 인자 (포트 번호)

set "SERVE_PATH=%~1"
if "%SERVE_PATH%"=="" set "SERVE_PATH=../resource"

set "TARGET_PORT=%~2"
if "%TARGET_PORT%"=="" set "TARGET_PORT=9999"

:: 4. 기본 경로 폴더 자동 생성 (필요시)
if not exist "%SERVE_PATH%" (
    echo [안내] "%SERVE_PATH%" 폴더가 없어 새로 생성합니다.
    mkdir "%SERVE_PATH%"
)

echo ==========================================
echo  Spring Boot Static Server Config
echo ------------------------------------------
echo  - 실행 파일 : %JAR_FILE%
echo  - 서빙 경로 : %SERVE_PATH%
echo  - 포트 번호 : %TARGET_PORT%
echo ==========================================

:: 5. Spring Boot 실행
:: --server.port 파라미터를 추가하여 포트를 변경합니다.
java -jar "%JAR_FILE%" --resource.path="%SERVE_PATH%" --server.port=%TARGET_PORT%

pause