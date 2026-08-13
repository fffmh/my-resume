# -*- coding: utf-8 -*-
"""本地中文嵌入：bge-small-zh-v1.5（懒加载，模型缺失时自动降级为纯词法检索）。"""
import os

QUERY_PREFIX = '为这个句子生成表示以用于检索相关文章：'

_model = None
_model_error = None


def model_ready():
    return _model is not None


def ensure_model():
    global _model, _model_error
    if _model is not None:
        return _model
    if _model_error:
        return None
    try:
        from sentence_transformers import SentenceTransformer
        _model = SentenceTransformer('BAAI/bge-small-zh-v1.5')
        return _model
    except Exception as exc:  # noqa: BLE001
        _model_error = str(exc)
        return None


def embed(texts, is_query=False):
    """返回归一化向量列表；模型不可用时返回 None。"""
    model = ensure_model()
    if model is None:
        return None
    if isinstance(texts, str):
        texts = [texts]
    if is_query:
        texts = [QUERY_PREFIX + t for t in texts]
    vecs = model.encode(texts, normalize_embeddings=True, show_progress_bar=False)
    return [v.tolist() for v in vecs]


def cosine(a, b):
    if not a or not b:
        return 0.0
    return sum(x * y for x, y in zip(a, b))