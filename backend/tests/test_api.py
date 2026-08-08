# -*- coding: utf-8 -*-
from fastapi import FastAPI
from fastapi.testclient import TestClient

from backend import store
from backend.routes import router

app = FastAPI()
app.include_router(router, prefix='/api')
client = TestClient(app)


def test_sections_seeded():
    r = client.get('/api/info/sections')
    assert r.status_code == 200
    assert len(r.json()) == 8


def test_entry_crud():
    entry = {'id': store.gen_id(), 'company': 'X公司', 'position': '工程师', 'content': 'xxx', 'achievement': '', 'keywords': ''}
    r = client.post('/api/info/work/entries', json=entry)
    assert r.status_code == 200
    sections = client.get('/api/info/sections').json()
    work = next(s for s in sections if s['id'] == 'work')
    assert len(work['entries']) == 1


def test_generate_and_resumes():
    client.put('/api/info/basic', json={
        'id': 'basic', 'name': '基本信息', 'icon': 'user', 'desc': '', 'single': True,
        'fields': [], 'entries': [{'id': store.gen_id(), 'name': '张三', 'phone': '13800138000', 'email': 'z@x.com'}],
    })
    r = client.post('/api/generate', json={'targetJob': '前端开发工程师', 'jd': 'Vue 性能优化', 'style': 'aurora'})
    assert r.status_code == 200
    record = r.json()['record']
    assert 0 <= record['score'] <= 100
    assert 'data' in record

    r = client.post('/api/resumes', json=record)
    assert r.status_code == 200
    resumes = client.get('/api/resumes').json()
    assert len(resumes) == 1
    client.delete(f"/api/resumes/{record['id']}")
    assert len(client.get('/api/resumes').json()) == 0


def test_settings_and_data():
    client.put('/api/settings', json={'llm': {'baseUrl': 'https://api.deepseek.com', 'apiKey': 'sk-t', 'model': 'deepseek-chat'}})
    assert client.get('/api/settings').json()['llm']['apiKey'] == 'sk-t'

    payload = client.get('/api/data/export').json()
    client.delete('/api/data')
    client.post('/api/data/import', json=payload)
    assert len(client.get('/api/info/sections').json()) == 8


def test_demo_and_import():
    r = client.post('/api/demo')
    assert r.status_code == 200
    assert r.json()['filled'] > 0

    files = {'file': ('resume.txt', '林澈\n138 0013 8000\n\n教育背景\n2021.7-至今 复旦大学 计算机 硕士\n', 'text/plain')}
    r = client.post('/api/import', files=files)
    assert r.status_code == 200
    preview = r.json()
    assert preview['sections'].get('basic')
    assert preview['sections'].get('education')