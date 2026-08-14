# -*- coding: utf-8 -*-
from backend import embeddings, generate, retrieve, store


def _sections():
    sections = store.list_sections()
    by_id = {s['id']: s for s in sections}
    by_id['basic']['entries'] = [{'id': store.gen_id(), 'name': '张三', 'phone': '13800138000'}]
    by_id['work']['entries'] = [
        {'id': 'w1', 'company': 'A', 'position': '前端', 'content': '负责搭建组件库\n优化首屏性能', 'achievement': '性能提升 40%', 'keywords': ''},
        {'id': 'w2', 'company': 'B', 'position': '后端', 'content': 'Java 微服务', 'achievement': '', 'keywords': ''},
    ]
    by_id['skills']['entries'] = [{'id': 's1', 'name': 'Vue', 'level': '精通', 'years': '3年'}]
    return sections


def test_generate_rag_injects_knowledge(monkeypatch):
    sections = _sections()
    settings = {'llm': {'apiKey': 'sk-x', 'baseUrl': '', 'model': ''}}

    monkeypatch.setattr(embeddings, '_model', object())
    monkeypatch.setattr(embeddings, 'model_ready', lambda: True)
    monkeypatch.setattr(
        retrieve, 'search_knowledge',
        lambda q, top_k=3: [
            {'id': 'kb-1', 'text': '参考范文：量化成果写法示例', 'meta': {'source': 'builtin', 'title': '通用写法要点'}},
        ],
    )

    captured = {}

    def fake_llm(settings_, target_job, jd, data, rag_chunks=None):
        captured['rag'] = rag_chunks
        return {'basic': {'name': '张三'}, 'work': [{'id': 'w1', 'content': '负责 主导'}], 'self': '靠谱'}

    monkeypatch.setattr(generate, 'score_resume_llm', lambda *a, **k: None)
    monkeypatch.setattr(generate, 'optimize_with_llm', fake_llm)
    record = generate.generate(settings, sections, '前端开发工程师', 'Vue 性能优化', 'aurora')
    assert record['usedRag'] is True
    assert captured['rag'] and '量化成果' in captured['rag'][0]['text']


def test_generate_degrades_without_model():
    sections = _sections()
    settings = {'llm': {'apiKey': '', 'baseUrl': '', 'model': ''}}
    record = generate.generate(settings, sections, '前端开发工程师', 'Vue 性能优化', 'aurora')
    assert record['usedRag'] is False
    assert record['usedLlm'] is False
    assert 0 <= record['score'] <= 100
    # 语义选材降级为词袋：w1（前端）应排在 w2（后端）之前
    work_ids = [w['id'] for w in record['data']['work']]
    assert work_ids.index('w1') < work_ids.index('w2')