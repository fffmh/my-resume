# -*- coding: utf-8 -*-
from fastapi import FastAPI
from fastapi.testclient import TestClient

from backend import import_llm, store
from backend.routes import router

app = FastAPI()
app.include_router(router, prefix='/api')
client = TestClient(app)


class _FakeOpenAI:
    def __init__(self, *a, **k):
        pass

    @property
    def chat(self):
        class Chat:
            completions = _Completions()
        return Chat()


class _Completions:
    def create(self, **kwargs):
        content = (
            '{"sections":{"basic":[{"name":"李四","phone":"13900000000","email":"lisi@x.com"}],'
            '"work":[{"company":"某公司","position":"工程师","content":"负责搭建\\n优化性能"}],'
            '"bad_section":[{"unknown":"x"}]},'
            '"confidence":{"basic":[{"level":"高","reason":""}],'
            '"work":[{"level":"中","reason":"时间缺失"}]}}'
        )
        message = type('M', (), {'content': content})()
        choice = type('C', (), {'message': message})()
        return type('R', (), {'choices': [choice]})()


def test_rule_confidence_levels():
    sections = {
        'work': [
            {'id': '1', 'company': 'A', 'position': '工程师', 'start': '2021.01', 'end': '至今', 'content': 'x', 'achievement': '', 'keywords': ''},
            {'id': '2', 'company': '', 'position': '', 'content': '', 'achievement': '', 'keywords': ''},
        ]
    }
    conf = import_llm.rule_confidence(sections)
    assert conf['work'][0]['level'] == '高'  # company/position/start/end 4 个关键字段填满
    assert conf['work'][1]['level'] == '低'


def test_import_classify_llm(monkeypatch):
    monkeypatch.setattr('openai.OpenAI', _FakeOpenAI)
    settings = {'llm': {'apiKey': 'sk-x', 'baseUrl': '', 'model': 'deepseek-chat'}}
    result = import_llm.import_classify_llm(settings, '李四 13900000000 某公司 工程师')
    assert result is not None
    assert result['sections']['basic'][0]['name'] == '李四'
    # 未知结构字段被过滤
    assert 'bad_section' not in result['sections']
    assert result['confidence']['work'][0]['level'] == '中'


def test_import_no_key_returns_none():
    assert import_llm.import_classify_llm({'llm': {'apiKey': ''}}, '文本') is None


def test_api_import_uses_llm_and_confidence(monkeypatch):
    store.save_settings({'llm': {'apiKey': 'sk-x', 'baseUrl': '', 'model': 'deepseek-chat'}})
    monkeypatch.setattr('openai.OpenAI', _FakeOpenAI)
    files = {'file': ('r.txt', '李四\n139 0000 0000\n\n工作经历\n某公司 工程师\n', 'text/plain')}
    r = client.post('/api/import', files=files)
    assert r.status_code == 200
    body = r.json()
    assert body['sections'].get('basic')
    assert body['confidence'].get('basic')
    assert body['confidence']['basic'][0]['level'] in ('高', '中', '低')


def test_api_import_rule_fallback_confidence():
    store.save_settings({'llm': {'apiKey': '', 'baseUrl': '', 'model': ''}})
    files = {'file': ('r.txt', '张三\n13800138000\n\n工作经历\n某公司 工程师\n', 'text/plain')}
    r = client.post('/api/import', files=files)
    assert r.status_code == 200
    body = r.json()
    assert body['confidence'] is not None