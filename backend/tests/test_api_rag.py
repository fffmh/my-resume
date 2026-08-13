# -*- coding: utf-8 -*-
from fastapi import FastAPI
from fastapi.testclient import TestClient

from backend import store
from backend.routes import router

app = FastAPI()
app.include_router(router, prefix='/api')
client = TestClient(app)


def test_api_search_entries():
    store.add_entry('work', {'id': 'w1', 'company': 'A', 'position': '前端', 'content': 'PMP 项目管理 认证', 'achievement': '', 'keywords': ''})
    r = client.post('/api/search', json={'query': 'PMP', 'scope': 'entries', 'top_k': 5})
    assert r.status_code == 200
    entries = r.json()['entries']
    assert entries and 'PMP 项目管理' in entries[0]['text']


def test_api_groups_fallback():
    store.save_resume({'id': 'r1', 'title': '前端简历', 'targetJob': '前端开发工程师', 'style': 'aurora', 'styleName': '极光', 'html': '', 'text': 'Vue3 性能优化 工程化', 'createdAt': '2026-01-01T00:00:00Z'})
    store.save_resume({'id': 'r2', 'title': '前端简历2', 'targetJob': '前端开发工程师', 'style': 'aurora', 'styleName': '极光', 'html': '', 'text': 'React 组件 构建', 'createdAt': '2026-01-02T00:00:00Z'})
    store.save_resume({'id': 'r3', 'title': '数据简历', 'targetJob': '数据分析师', 'style': 'aurora', 'styleName': '极光', 'html': '', 'text': 'SQL 报表', 'createdAt': '2026-01-03T00:00:00Z'})
    r = client.post('/api/resumes/groups', json={'resumes': store.list_resumes()})
    assert r.status_code == 200
    groups = r.json()['groups']
    assert groups
    sizes = sorted((len(g['resumes']) for g in groups), reverse=True)
    assert sizes[0] >= 2  # 两个前端简历归为一组