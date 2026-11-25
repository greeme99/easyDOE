@echo off
setlocal

title easyDOE - DOE LAB Launcher
echo ==================================================
echo   easyDOE (DOE LAB) Server and Chrome Launcher
echo ==================================================

if exist "C:\nvm4w\nodejs" set "PATH=C:\nvm4w\nodejs;%PATH%"
if defined NVM_SYMLINK if exist "%NVM_SYMLINK%" set "PATH=%NVM_SYMLINK%;%PATH%"

where npm >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js / npm not found. Check C:\nvm4w\nodejs
    pause
    exit /b 1
)

set "APP_DIR=%~dp0app"
set "URL=http://localhost:5173/DOE/doe/"

if not exist "%APP_DIR%\package.json" (
    echo [ERROR] Cannot find %APP_DIR%\package.json
    pause
    exit /b 1
)

cd /d "%APP_DIR%"

if not exist "node_modules" (
    echo [INFO] Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo [ERROR] npm install failed.
        pause
        exit /b 1
    )
)

echo [1/2] Starting Vite dev server on %URL% ...
start "easyDOE-Server" /D "%APP_DIR%" cmd /k npm run dev -- --port 5173

echo [2/2] Waiting for server...
ping -n 4 127.0.0.1 >nul

echo Opening Chrome: %URL%
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" "%URL%"
) else if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" (
    start "" "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" "%URL%"
) else if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" (
    start "" "%LocalAppData%\Google\Chrome\Application\chrome.exe" "%URL%"
) else (
    start "" "%URL%"
)

echo Done! Close the "easyDOE-Server" window to stop the server.
exit /b 0
