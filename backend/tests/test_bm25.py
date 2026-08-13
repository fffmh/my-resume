# -*- coding: utf-8 -*-
from backend.bm25 import BM25, tokenize


def test_tokenize_chinese():
    tokens = tokenize('前端开发工程师 性能优化')
    assert '前端' in tokens or '前端开发' in tokens
    assert '性能优化' in tokens or '性能' in tokens


def test_bm25_prefers_exact_term():
    docs = ['PMP 项目管理 认证', 'Vue 组件库 性能优化 首屏']
    b = BM25(docs)
    scores = b.score('PMP')
    assert scores[0] > scores[1]
    scores2 = b.score('性能优化')
    assert scores2[1] > scores2[0]


def test_bm25_empty_corpus():
    b = BM25([])
    assert b.score('任意') == []