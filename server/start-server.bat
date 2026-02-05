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
if not exist "venv\Scripts\activate.bat" (
    echo [ERROR] Failed to create virtual environment!
    pause
    exit /b 1
)

:: Check if venv creation succeeded
if not exist "venv\Scripts\activate.bat" (
    echo [ERROR] Failed to create virtual environment!
    pause
    exit /b 1
)

:: Activate virtual environment (safe to call multiple times)
echo [INFO] Activating virtual environment...
call venv\Scripts\activate.bat

:: Check if dependencies are installed
pip show fastapi >nul 2>&1
if %errorlevel% neq 0 goto install_deps
goto deps_ok

:install_deps
echo.
echo [SETUP] Installing dependencies (this may take a few minutes)...
pip install --upgrade pip
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install dependencies!
    pause
    exit /b 1
)

echo.
echo [SETUP] Downloading spaCy English model...
python -m spacy download en_core_web_sm
echo [OK] All dependencies installed

:deps_ok

:: Create data directories
if not exist "data" mkdir data
if not exist "data\chromadb" mkdir data\chromadb
if not exist "logs" mkdir logs

echo.
echo [INFO] Starting RAG backend server...
echo [INFO] Server will be available at: http://localhost:8765
echo [INFO] API docs available at: http://localhost:8765/docs
echo.
echo Press Ctrl+C to stop the server
echo =====================================================================
echo.

:: Start the server
python main.py

:: If server exits, pause to see any error messages
echo.
echo [INFO] Server stopped
pause
