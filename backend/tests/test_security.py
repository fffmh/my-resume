# -*- coding: utf-8 -*-
import importlib

from fastapi import FastAPI
from fastapi.testclient import TestClient

from backend import store
from backend.routes import router

app = FastAPI()
app.include_router(router, prefix='/api')
client = TestClient(app)


def test_settings_key_is_masked_and_kept():
    client.put('/api/settings', json={
        'llm': {'baseUrl': 'https://api.deepseek.com', 'apiKey': 'sk-abcdefgh1234', 'model': 'deepseek-chat'},
    })
    got = client.get('/api/settings').json()
    assert got['llm']['apiKey'] == 'sk-****1234'
    assert 'abcdefgh' not in got['llm']['apiKey']

    # 掩码回传 → 原 Key 保持不变
    client.put('/api/settings', json=got)
    assert store.get_settings()['llm']['apiKey'] == 'sk-abcdefgh1234'

    # 传新 Key → 覆盖
    client.put('/api/settings', json={'llm': {'baseUrl': 'https://api.deepseek.com', 'apiKey': 'sk-newkey9999', 'model': 'deepseek-chat'}})
    assert store.get_settings()['llm']['apiKey'] == 'sk-newkey9999'


def test_access_token_guard(monkeypatch):
    monkeypatch.setenv('RESUME_ACCESS_TOKEN', 'secret123')
    from backend import main
    importlib.reload(main)
    guarded = TestClient(main.app)

    # 健康检查无需口令
    assert guarded.get('/api/health').status_code == 200
    # 受保护接口需要口令
    assert guarded.get('/api/info/sections').status_code == 401
    assert guarded.get('/api/info/sections', headers={'X-Access-Token': 'wrong'}).status_code == 401
    ok = guarded.get('/api/info/sections', headers={'X-Access-Token': 'secret123'})
    assert ok.status_code == 200


def test_no_token_configured_allows_access(monkeypatch):
    monkeypatch.delenv('RESUME_ACCESS_TOKEN', raising=False)
    from backend import main
    importlib.reload(main)
    open_client = TestClient(main.app)
    assert open_client.get('/api/info/sections').status_code == 200
    assert open_client.get('/api/health').json()['authRequired'] is False