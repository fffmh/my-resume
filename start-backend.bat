@echo off
chcp 65001 >nul
cd /d %~dp0
echo [1/2] 构建前端（后端模式）...
call npm run build:backend
echo [2/2] 启动后端 http://localhost:8000 ...
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
pause