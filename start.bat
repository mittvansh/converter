@echo off
title File Converter
echo ====================================
echo    File Converter
echo ====================================
echo.

cd /d "%~dp0"

REM Check if node_modules exists
if not exist "node_modules" (
    echo [INFO] First time setup - installing dependencies...
    echo This may take a minute...
    echo.
    call npm install --silent
    if errorlevel 1 (
        echo.
        echo [ERROR] Failed to install dependencies.
        echo Please run: npm install
        pause
        exit /b 1
    )
    echo [SUCCESS] Dependencies installed successfully.
    echo.
)

REM Start the application
echo Starting the application...
echo.
npm start

REM If npm fails, try the launcher
if errorlevel 1 (
    echo.
    echo [INFO] Trying alternative launcher...
    node launcher.js
)