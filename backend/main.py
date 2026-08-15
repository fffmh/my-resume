# -*- coding: utf-8 -*-
"""流光简历 · 第二阶段后端入口：API + 托管构建后的前端（同源免 CORS）。"""
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from . import store
from .routes import router as api_router

ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / 'dist'

app = FastAPI(title='流光简历 · 后端', version='2.0.0')

app.include_router(api_router, prefix='/api')

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