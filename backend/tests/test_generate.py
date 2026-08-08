# -*- coding: utf-8 -*-
from backend import generate, store


def _sections():
    sections = store.list_sections()
    by_id = {s['id']: s for s in sections}
    by_id['basic']['entries'] = [{'id': store.gen_id(), 'name': '张三', 'phone': '13800138000', 'email': 'z@x.com', 'city': '上海'}]
    by_id['intention']['entries'] = [{'id': store.gen_id(), 'position': '前端开发工程师', 'salary': '25-35K'}]
    by_id['work']['entries'] = [
        {'id': store.gen_id(), 'company': 'A公司', 'position': '前端', 'content': '负责搭建组件库\n优化首屏性能', 'achievement': '性能提升 40%，覆盖 5000 用户', 'keywords': ''},
    ]
    by_id['skills']['entries'] = [
        {'id': store.gen_id(), 'name': 'Vue', 'level': '精通', 'years': '3年'},
        {'id': store.gen_id(), 'name': 'TypeScript', 'level': '精通', 'years': '3年'},
        {'id': store.gen_id(), 'name': '性能优化', 'level': '熟练', 'years': '2年'},
    ]
    by_id['self']['entries'] = [{'id': store.gen_id(), 'content': '热爱前端与工程化'}]
    return sections


def test_rule_path():
    settings = {'llm': {'apiKey': '', 'baseUrl': '', 'model': ''}}
    record = generate.generate(settings, _sections(), '前端开发工程师', 'Vue 性能优化', 'aurora')
    assert 0 <= record['score'] <= 100
    assert record['data']['work']
    assert record['text']
    assert record['usedLlm'] is False
    assert '简历' in record['title']


def test_llm_path(monkeypatch):
    fake = {
        'basic': {'name': '张三', 'phone': '13800138000'},
        'work': [{'position': '前端', 'content': '负责 主导 优化'}],
        'self': '我很强，很靠谱',
    }
    monkeypatch.setattr(generate, 'optimize_with_llm', lambda *a, **k: fake)
    settings = {'llm': {'apiKey': 'sk-x', 'baseUrl': '', 'model': ''}}
    record = generate.generate(settings, _sections(), '前端开发工程师', '', 'aurora')
    assert record['usedLlm'] is True
    assert record['data']['self'] == '我很强，很靠谱'


def test_score_range():
    score = generate.score_resume(_sections(), '前端开发工程师', 'Vue 性能优化 组件库')
    assert 0 <= score['total'] <= 100
    assert len(score['dimensions']) == 4