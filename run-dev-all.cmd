@echo off
setlocal

cd /d "%~dp0backend" || exit /b 1
start "NeuroRail Backend" cmd /c ".\venv\Scripts\python -m uvicorn app.main:app --reload --port 8000"

cd /d "%~dp0frontend" || exit /b 1
start "NeuroRail Frontend" cmd /c "npm run dev"
