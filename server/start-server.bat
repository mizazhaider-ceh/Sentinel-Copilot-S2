@echo off
:: ===========================================================================
:: S2-Sentinel Copilot - Server Management Script (Windows)
:: ===========================================================================
:: Interactive menu for managing frontend + backend servers
::
:: Options:
:: 1. Start Servers (Frontend + Backend)
:: 2. Restart Servers
:: 3. Stop Servers
:: 4. Install/Update Dependencies
:: 5. View Server Status
:: 6. Open Frontend in Browser
:: 7. Exit
::
:: Built by MIHx0 (Muhammad Izaz Haider)
:: ===========================================================================

setlocal enabledelayedexpansion
title S2-Sentinel Server Manager
cd /d "%~dp0"

:menu
cls
echo.
echo  +=====================================================================+
echo  ^|           S2-Sentinel Copilot - Server Manager                     ^|
echo  ^|                   Built by MIHx0 (Muhammad Izaz Haider)            ^|
echo  +=====================================================================+
echo.
echo  [1] Start Servers          (Frontend + Backend)
echo  [2] Restart Servers        (Stop then Start)
echo  [3] Stop Servers           (Kill all running instances)
echo  [4] Install/Update Deps    (pip install + spaCy model)
echo  [5] View Server Status     (Check if running)
echo  [6] Open in Browser        (Launch http://localhost:3000)
echo  [7] Clean Logs/Cache       (Clear logs + ChromaDB)
echo  [8] Exit
echo.
echo  +=====================================================================+
echo.

set /p choice="Enter your choice (1-8): "

if "%choice%"=="1" goto start_servers
if "%choice%"=="2" goto restart_servers
if "%choice%"=="3" goto stop_servers
if "%choice%"=="4" goto install_deps
if "%choice%"=="5" goto check_status
if "%choice%"=="6" goto open_browser
if "%choice%"=="7" goto clean_data
if "%choice%"=="8" goto exit_script

echo [ERROR] Invalid choice. Please enter 1-8.
timeout /t 2 >nul
goto menu

:: ===========================================================================
:: SUBROUTINES
:: ===========================================================================

:start_servers
cls
echo.
echo  ========================================
echo   STARTING SERVERS
echo  ========================================
echo.

:start_servers
cls
echo.
echo  ========================================
echo   STARTING SERVERS
echo  ========================================
echo.

:: Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in PATH!
    echo Please install Python 3.10+ from https://www.python.org/downloads/
    pause
    goto menu
)

for /f "tokens=2 delims= " %%a in ('python --version 2^>^&1') do set PYVER=%%a
echo [INFO] Found Python %PYVER%

:: Check if virtual environment exists
if not exist "venv" (
    echo [SETUP] Creating virtual environment...
    python -m venv venv
)

if not exist "venv\Scripts\python.exe" (
    echo [ERROR] Failed to create virtual environment!
    pause
    goto menu
)

set "VENV_PYTHON=%~dp0venv\Scripts\python.exe"
set "VENV_PIP=%~dp0venv\Scripts\pip.exe"

:: Check dependencies
"%VENV_PIP%" show fastapi >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARN] Dependencies not installed. Running installation...
    goto install_deps
)

:: Create data directories
if not exist "data" mkdir data
if not exist "data\chromadb" mkdir data\chromadb
if not exist "logs" mkdir logs

:: Stop any existing servers first
call :stop_servers_silent

:: Start frontend HTTP server in background
set "PROJECT_ROOT=%~dp0.."
echo [STARTING] Frontend server on port 3000...
start "S2-Sentinel-Frontend" /MIN python -m http.server 3000 --directory "%PROJECT_ROOT%"
timeout /t 2 >nul

:: Start backend server in background
echo [STARTING] Backend server on port 8765...
start "S2-Sentinel-Backend" /MIN "%VENV_PYTHON%" main.py
timeout /t 3 >nul

echo.
echo  +=====================================================================+
echo  ^|                    SERVERS STARTED                                 ^|
echo  +=====================================================================+
echo.
echo  [FRONTEND]  http://localhost:3000        (Open this in your browser)
echo  [API]       http://localhost:8765        (Backend RAG API)
echo  [API DOCS]  http://localhost:8765/docs   (Swagger UI)
echo.
echo  Servers are running in background windows.
echo  Use option [3] to stop them or [5] to check status.
echo.
pause
goto menu

:restart_servers
cls
echo.
echo  ========================================
echo   RESTARTING SERVERS
echo  ========================================
echo.
call :stop_servers_silent
timeout /t 2 >nul
goto start_servers

:stop_servers
cls
echo.
echo  ========================================
echo   STOPPING SERVERS
echo  ========================================
echo.
call :stop_servers_silent
echo.
echo [OK] All servers stopped.
echo.
pause
goto menu

:stop_servers_silent
echo [STOPPING] Killing frontend server...
taskkill /F /FI "WINDOWTITLE eq S2-Sentinel-Frontend*" >nul 2>&1
echo [STOPPING] Killing backend server...
taskkill /F /FI "WINDOWTITLE eq S2-Sentinel-Backend*" >nul 2>&1
timeout /t 1 >nul
exit /b

:install_deps
cls
echo.
echo  ========================================
echo   INSTALLING DEPENDENCIES
echo  ========================================
echo.

if not exist "venv" (
    echo [SETUP] Creating virtual environment...
    python -m venv venv
)

set "VENV_PYTHON=%~dp0venv\Scripts\python.exe"
set "VENV_PIP=%~dp0venv\Scripts\pip.exe"

echo [INSTALL] Upgrading pip...
"%VENV_PIP%" install --upgrade pip

echo [INSTALL] Installing Python packages...
"%VENV_PIP%" install -r requirements.txt
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install dependencies!
    pause
    goto menu
)

echo [INSTALL] Downloading spaCy English model...
"%VENV_PYTHON%" -m spacy download en_core_web_sm

echo.
echo [OK] All dependencies installed successfully!
echo.
pause
goto menu

:check_status
cls
echo.
echo  ========================================
echo   SERVER STATUS
echo  ========================================
echo.

tasklist /FI "WINDOWTITLE eq S2-Sentinel-Frontend*" 2>nul | find "python.exe" >nul
if %errorlevel% equ 0 (
    echo [RUNNING] Frontend server - http://localhost:3000
) else (
    echo [STOPPED] Frontend server
)

tasklist /FI "WINDOWTITLE eq S2-Sentinel-Backend*" 2>nul | find "python.exe" >nul
if %errorlevel% equ 0 (
    echo [RUNNING] Backend server - http://localhost:8765
) else (
    echo [STOPPED] Backend server
)

echo.
echo Testing connectivity...
curl -s http://localhost:3000 >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Frontend is responding
) else (
    echo [FAIL] Frontend not accessible
)

curl -s http://localhost:8765/health >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Backend is responding
) else (
    echo [FAIL] Backend not accessible
)

echo.
pause
goto menu

:open_browser
echo [OPENING] Launching browser...
start http://localhost:3000
timeout /t 1 >nul
goto menu

:clean_data
cls
echo.
echo  ========================================
echo   CLEAN LOGS AND CACHE
echo  ========================================
echo.
echo WARNING: This will delete:
echo  - All log files in logs/
echo  - ChromaDB database in data/chromadb/
echo.
set /p confirm="Are you sure? (y/n): "
if /i not "%confirm%"=="y" goto menu

if exist "logs" (
    echo [CLEANING] Removing logs...
    rd /s /q logs
    mkdir logs
)

if exist "data\chromadb" (
    echo [CLEANING] Removing ChromaDB...
    rd /s /q data\chromadb
    mkdir data\chromadb
)

echo.
echo [OK] Cleanup complete!
echo.
pause
goto menu

:exit_script
cls
echo.
echo  ========================================
echo   SHUTTING DOWN
echo  ========================================
echo.
call :stop_servers_silent
echo.
echo [INFO] All servers stopped. Goodbye!
echo.
timeout /t 2 >nul
exit
