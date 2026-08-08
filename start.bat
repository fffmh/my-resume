@echo off
chcp 65001 >nul
cd /d %~dp0
if not exist node_modules (
  echo 首次运行，正在安装依赖（约1分钟）...
  call npm install
)
echo 正在启动 http://localhost:5173 ...
call npm run dev
pause