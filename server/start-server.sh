#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# S2-Sentinel Copilot - Start RAG Backend (Unix/Linux/macOS)
# ═══════════════════════════════════════════════════════════════════════════
# This script sets up and starts the Python RAG backend server.
# 
# First run: Creates virtual environment and installs dependencies
# Subsequent runs: Activates venv and starts server
#
# Usage: ./start-server.sh
# ═══════════════════════════════════════════════════════════════════════════

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Change to script directory
cd "$(dirname "$0")"

echo ""
echo -e "${CYAN}╔═══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║           S2-Sentinel Copilot - RAG Backend Server                ║${NC}"
echo -e "${CYAN}║                   Built by MIHx0 (Muhammad Izaz Haider)           ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if Python 3 is installed
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}[ERROR] Python 3 is not installed!${NC}"
    echo "Please install Python 3.10+ from https://www.python.org/downloads/"
    exit 1
fi

# Get Python version
PYVER=$(python3 --version 2>&1 | cut -d' ' -f2)
echo -e "${BLUE}[INFO]${NC} Found Python $PYVER"

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo ""
    echo -e "${BLUE}[SETUP]${NC} First run detected - Creating virtual environment..."
    python3 -m venv venv
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}[ERROR] Failed to create virtual environment!${NC}"
        exit 1
    fi
    echo -e "${GREEN}[OK]${NC} Virtual environment created"
fi

# Activate virtual environment
echo -e "${BLUE}[INFO]${NC} Activating virtual environment..."
source venv/bin/activate

# Check if dependencies are installed
if [ ! -d "venv/lib" ] || [ ! -f "venv/lib/python"*/site-packages/fastapi/__init__.py 2>/dev/null ]; then
    echo ""
    echo -e "${BLUE}[SETUP]${NC} Installing dependencies (this may take a few minutes)..."
    pip install --upgrade pip
    pip install -r requirements.txt
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}[ERROR] Failed to install dependencies!${NC}"
        exit 1
    fi
    
    echo ""
    echo -e "${BLUE}[SETUP]${NC} Downloading spaCy English model..."
    python -m spacy download en_core_web_sm
    
    echo -e "${GREEN}[OK]${NC} All dependencies installed"
fi

# Create data directories
mkdir -p data/chromadb
mkdir -p logs

echo ""
echo -e "${BLUE}[INFO]${NC} Starting RAG backend server..."
echo -e "${BLUE}[INFO]${NC} Server will be available at: ${GREEN}http://localhost:8765${NC}"
echo -e "${BLUE}[INFO]${NC} API docs available at: ${GREEN}http://localhost:8765/docs${NC}"
echo ""
echo -e "Press ${RED}Ctrl+C${NC} to stop the server"
echo "─────────────────────────────────────────────────────────────────────"
echo ""

# Start the server
python main.py

# Cleanup
echo ""
echo -e "${BLUE}[INFO]${NC} Server stopped"
