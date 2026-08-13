# -*- coding: utf-8 -*-
from backend import embeddings, retrieve, store

VEC = {
    'query': [1.0, 0.0, 0.0, 0.0],
    'doc_a': [0.9, 0.1, 0.0, 0.0],
    'doc_b': [0.2, 0.8, 0.0, 0.0],
    '_default': [0.0, 0.0, 1.0, 0.0],
}


def _enable_fake_model(monkeypatch):
    monkeypatch.setattr(embeddings, '_model', object())
    monkeypatch.setattr(embeddings, 'model_ready', lambda: True)

    def fake_embed(texts, is_query=False):
        out = []
        for t in texts:
            key = 'query' if is_query else t
            out.append(VEC.get(key, VEC['_default']))
        return out

    monkeypatch.setattr(embeddings, 'embed', fake_embed)


def test_hybrid_rrf_fuses_lexical_and_semantic(monkeypatch):
    store.add_entry('work', {'id': 'a', 'company': '', 'position': '', 'content': '项目管理认证 经验丰富', 'achievement': '', 'keywords': ''})
    store.add_entry('work', {'id': 'b', 'company': '', 'position': '', 'content': 'PMP 证书 持有者', 'achievement': '', 'keywords': ''})
    _enable_fake_model(monkeypatch)

    hits = retrieve.search_entries('PMP 证书', top_k=5)
    ids = [h['id'] for h in hits]
    # 纯向量会把 a 排最前且可能漏掉 b；混合检索应同时命中两者，且同时命中词法与向量的 b 靠前
    assert any('a' in i for i in ids)
    assert any('b' in i for i in ids)
    assert ids[0].endswith(':b')


def test_lexical_fallback_without_model():
    store.add_entry('work', {'id': 'a', 'company': '', 'position': '', 'content': 'PMP 项目管理', 'achievement': '', 'keywords': ''})
    store.add_entry('work', {'id': 'b', 'company': '', 'position': '', 'content': 'Vue 组件库', 'achievement': '', 'keywords': ''})
    hits = retrieve.search_entries('PMP', top_k=5)
    assert hits and 'PMP 项目管理' in hits[0]['text']


def test_search_resumes_and_knowledge(monkeypatch):
    _enable_fake_model(monkeypatch)
    store.save_resume({'id': 'r1', 'title': '前端简历', 'targetJob': '前端开发工程师', 'style': 'aurora', 'styleName': '极光', 'html': '', 'text': 'Vue3 TypeScript 性能优化 首屏加载', 'createdAt': '2026-01-01T00:00:00Z'})
    hits = retrieve.search_resumes('首屏加载', top_k=5)
    assert any(h['id'] == 'r1' for h in hits)

    kb = retrieve.search_knowledge('前端 简历 写法', top_k=5)
    assert kb
    assert all(h['meta'].get('source') in ('builtin', 'personal') for h in kb)