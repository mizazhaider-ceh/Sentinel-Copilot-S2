@echo off
:: ===========================================================================
:: S2-Sentinel Copilot - Start RAG Backend (Windows)
:: ===========================================================================
:: This script sets up and starts the Python RAG backend server.
:: 
:: First run: Creates virtual environment and installs dependencies
:: Subsequent runs: Activates venv and starts server
::
:: Usage: Double-click or run from command line
:: ===========================================================================

title S2-Sentinel RAG Backend
cd /d "%~dp0"

echo.
echo  +=====================================================================+
echo  ^|           S2-Sentinel Copilot - RAG Backend Server                 ^|
echo  ^|                   Built by MIHx0 (Muhammad Izaz Haider)            ^|
echo  +=====================================================================+
echo.

:: Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in PATH!
    echo Please install Python 3.10+ from https://www.python.org/downloads/
    pause
    exit /b 1
)

:: Check Python version (need 3.10+)
for /f "tokens=2 delims= " %%a in ('python --version 2^>^&1') do set PYVER=%%a
echo [INFO] Found Python %PYVER%

:: Check if virtual environment exists
if not exist "venv" (
    echo.
    echo [SETUP] First run detected - Creating virtual environment...
    python -m venv venv
)

:: Check if venv creation succeeded
if not exist "venv\Scripts\python.exe" (
    echo [ERROR] Failed to create virtual environment!
    pause
    exit /b 1
)

:: Use venv Python/Pip explicitly (activation can silently fail on some systems)
set "VENV_PYTHON=%~dp0venv\Scripts\python.exe"
set "VENV_PIP=%~dp0venv\Scripts\pip.exe"

echo [INFO] Using Python: %VENV_PYTHON%

:: Check if dependencies are installed
"%VENV_PIP%" show fastapi >nul 2>&1
if %errorlevel% neq 0 goto install_deps
goto deps_ok

:install_deps
echo.
echo [SETUP] Installing dependencies (this may take a few minutes)...
"%VENV_PIP%" install --upgrade pip
"%VENV_PIP%" install -r requirements.txt
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install dependencies!
    pause
    exit /b 1
)

echo.
echo [SETUP] Downloading spaCy English model...
"%VENV_PYTHON%" -m spacy download en_core_web_sm
echo [OK] All dependencies installed

:deps_ok

:: Create data directories
if not exist "data" mkdir data
if not exist "data\chromadb" mkdir data\chromadb
if not exist "logs" mkdir logs

:: Start frontend HTTP server in background (serves index.html on port 3000)
set "PROJECT_ROOT=%~dp0.."
echo [INFO] Starting frontend server...
start "" /B python -m http.server 3000 --directory "%PROJECT_ROOT%" >nul 2>&1

echo.
echo  +=====================================================================+
echo  ^|                    ALL SYSTEMS GO                                  ^|
echo  +=====================================================================+
echo.
echo  [FRONTEND]  http://localhost:3000        (Open this in your browser)
echo  [API]       http://localhost:8765        (Backend RAG API)
echo  [API DOCS]  http://localhost:8765/docs   (Swagger UI)
echo.
echo  Press Ctrl+C to stop both servers
echo  =====================================================================
echo.

:: Start the backend server (blocking - keeps window open)
"%VENV_PYTHON%" main.py

:: Cleanup: kill the frontend server when backend stops
taskkill /F /IM python.exe /FI "WINDOWTITLE eq http.server" >nul 2>&1

echo.
echo [INFO] Servers stopped
pause
