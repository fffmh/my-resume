# -*- coding: utf-8 -*-
from backend import store, vector


def test_vec_roundtrip():
    vector.upsert_vec('entries', 'work:w1', [0.1, 0.2, 0.3])
    vecs = vector.get_vecs('entries', ['work:w1', 'work:none'])
    assert 'work:w1' in vecs
    assert 'work:none' not in vecs
    vector.remove_vec('entries', 'work:w1')
    assert 'work:w1' not in vector.get_vecs('entries', ['work:w1'])


def test_ensure_vectors_without_model():
    # 模型不可用：不应抛错，返回空
    docs = [{'id': 'x', 'text': '任意文本'}]
    vecs = vector.ensure_vectors('entries', docs)
    assert vecs == {}
    assert store.list_sections()