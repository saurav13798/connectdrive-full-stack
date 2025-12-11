@echo off
title ConnectDrive Launcher

echo.
echo  ╔══════════════════════════════════════╗
echo  ║           ConnectDrive               ║
echo  ║      Cloud Storage Platform         ║
echo  ╚══════════════════════════════════════╝
echo.

echo Choose your preferred setup method:
echo.
echo [1] PowerShell Setup (Recommended)
echo [2] Batch Script Setup
echo [3] View Quick Start Guide
echo [4] Create Desktop Shortcut
echo [5] Exit
echo.

set /p choice="Enter your choice (1-5): "

if "%choice%"=="1" (
    echo.
    echo Starting PowerShell setup...
    powershell -ExecutionPolicy Bypass -File "setup-and-start.ps1"
) else if "%choice%"=="2" (
    echo.
    echo Starting batch setup...
    call setup-and-start.bat
) else if "%choice%"=="3" (
    echo.
    echo Opening Quick Start Guide...
    start QUICK_START.md
) else if "%choice%"=="4" (
    echo.
    call CREATE_DESKTOP_SHORTCUT.bat
) else if "%choice%"=="5" (
    echo.
    echo Goodbye!
    exit /b 0
) else (
    echo.
    echo Invalid choice. Please try again.
    pause
    goto :eof
)

echo.
pause