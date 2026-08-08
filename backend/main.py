# -*- coding: utf-8 -*-
"""流光简历 · 第二阶段后端入口：API + 托管构建后的前端（同源免 CORS）。"""
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from . import store
from .routes import router as api_router

ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / 'dist'

app = FastAPI(title='流光简历 · 后端', version='2.0.0')

app.include_router(api_router, prefix='/api')

# 首次启动播种 8 个信息库
store.seed_sections()

# 托管前端构建产物（npm run build:backend 生成）
if DIST.exists() and (DIST / 'index.html').exists():
    app.mount('/assets', StaticFiles(directory=DIST / 'assets'), name='assets')

    @app.get('/{full_path:path}', include_in_schema=False)
    async def spa(full_path: str):
        if full_path.startswith('api/'):
            return JSONResponse({'detail': 'Not Found'}, status_code=404)
        index = DIST / 'index.html'
        if index.exists():
            return FileResponse(index)
        return JSONResponse({'detail': 'frontend not built'}, status_code=404)


if __name__ == '__main__':
    import uvicorn
    uvicorn.run('backend.main:app', host='0.0.0.0', port=8000, reload=True)