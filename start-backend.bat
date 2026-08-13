@echo off
chcp 65001 >nul
cd /d %~dp0
echo [0/3] 检查语义检索模型...
python backend\check_model.py
if %errorlevel%==0 (
  echo      [OK] 语义模型已就绪
) else (
  echo      [提示] 首次启用语义检索请运行: python backend\download_model.py（约100MB，需联网；跳过也不影响基本功能）
)

echo [1/3] 构建前端（后端模式）...
call npm run build:backend
echo [2/3] 启动后端 http://localhost:8000 ...
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
pause