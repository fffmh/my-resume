# -*- coding: utf-8 -*-
"""流光简历 · 第二阶段后端入口：API + 托管构建后的前端（同源免 CORS）。"""
import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from . import store
from .routes import router as api_router

ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / 'dist'

app = FastAPI(title='流光简历 · 后端', version='2.0.0')

app.include_router(api_router, prefix='/api')

# 访问口令保护：仅在设置环境变量 RESUME_ACCESS_TOKEN 时启用（公网/隧道场景必须设置）
PUBLIC_API_PATHS = {'/api/health'}


def current_access_token() -> str:
    """访问口令：环境变量优先，其次取服务端 settings.json（保证任何启动方式都受保护）。"""
    tok = os.environ.get('RESUME_ACCESS_TOKEN', '').strip()
    if tok:
        return tok
    try:
        return str(store.get_settings().get('accessToken') or '').strip()
    except Exception:
        return ''


@app.middleware('http')
async def access_token_guard(request, call_next):
    path = request.url.path
    ACCESS_TOKEN = current_access_token()
    if ACCESS_TOKEN and path.startswith('/api/') and path not in PUBLIC_API_PATHS:
        token = request.headers.get('x-access-token') or request.cookies.get('resume_token')
        if token != ACCESS_TOKEN:
            return JSONResponse({'detail': '需要访问口令'}, status_code=401)
    return await call_next(request)

# 首次启动播种 8 个信息库
store.seed_sections()

# 托管前端构建产物（npm run build:backend 生成）。
# 项目使用 hash 路由，服务器只需要 '/'、'/assets/*'、'/sw.js'、'/manifest.webmanifest'、'/icons/*'，
# 因此直接以 StaticFiles(html=True) 挂根路径即可（api 路由在前，优先匹配）。
if DIST.exists() and (DIST / 'index.html').exists():
    app.mount('/', StaticFiles(directory=DIST, html=True), name='static')


if __name__ == '__main__':
    import uvicorn
    uvicorn.run('backend.main:app', host='0.0.0.0', port=8000, reload=True)