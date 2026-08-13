# -*- coding: utf-8 -*-
"""向量持久化（chromadb）：仅存储 id -> embedding，检索时文档文本从数据源实时读取。"""
import chromadb

from . import embeddings, store

_client = None
_collections = {}


class _NoopEF:
    """占位嵌入函数：本项目始终显式传入 embeddings，避免 chroma 内置模型下载。"""

    @staticmethod
    def name():
        return 'noop'

    def __call__(self, input):  # noqa: A002
        raise RuntimeError('请显式传入 embeddings')


def reset():
    """重置客户端与集合缓存（测试隔离 / 数据目录切换时调用）。"""
    global _client, _collections
    _client = None
    _collections = {}


def _client_():
    global _client
    if _client is None:
        _client = chromadb.PersistentClient(path=str(store.DATA_DIR / 'chroma'))
    return _client


def _coll(name):
    if name not in _collections:
        _collections[name] = _client_().get_or_create_collection(name=name, embedding_function=_NoopEF())
    return _collections[name]


def upsert_vec(collection, doc_id, vec):
    _coll(collection).upsert(ids=[doc_id], embeddings=[vec])


def remove_vec(collection, doc_id):
    try:
        _coll(collection).delete(ids=[doc_id])
    except Exception:
        pass


def get_vecs(collection, doc_ids):
    """返回 {doc_id: vec}，仅取已存在的向量。"""
    if not doc_ids:
        return {}
    try:
        res = _coll(collection).get(ids=list(doc_ids), include=['embeddings'])
    except Exception:
        return {}
    out = {}
    if res and res.get('ids'):
        emb_list = res.get('embeddings')
        if emb_list is None:
            emb_list = [None] * len(res['ids'])
        for i, rid in enumerate(res['ids']):
            emb = emb_list[i]
            if emb is not None:
                out[rid] = emb.tolist() if hasattr(emb, 'tolist') else emb
    return out


def ensure_vectors(collection, docs):
    """为缺失向量的文档补算并持久化（模型不可用时跳过）。"""
    if not embeddings.model_ready() or not docs:
        return {}
    vecs = get_vecs(collection, [d['id'] for d in docs])
    missing = [d for d in docs if d['id'] not in vecs]
    if missing:
        texts = [d['text'] for d in missing]
        computed = embeddings.embed(texts)
        if computed:
            for d, vec in zip(missing, computed):
                upsert_vec(collection, d['id'], vec)
                vecs[d['id']] = vec
    return vecs