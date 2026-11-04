#!/usr/bin/env bash

# ==============================================================================
# Automated Wood Timber Defect Sorting System - Startup Launcher
# ==============================================================================

PROJECT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$PROJECT_DIR"

echo "================================================================="
echo "🪵 Automated Wood Timber Defect Sorting System"
echo "================================================================="
echo "📁 Project Directory: $PROJECT_DIR"
echo "🚀 Starting FastAPI Backend on http://127.0.0.1:8000 ..."
echo "🌐 Opening dashboard in your browser in 2 seconds..."
echo "🛑 Press Ctrl + C to stop the server at any time."
echo "================================================================="

# Automatically open browser after 2 seconds
(sleep 2 && (open "http://127.0.0.1:8000" 2>/dev/null || xdg-open "http://127.0.0.1:8000" 2>/dev/null)) &

# Launch FastAPI backend with uvicorn
python3 -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
