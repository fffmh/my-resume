# -*- coding: utf-8 -*-
"""混合检索：jieba BM25（词法） + bge 向量（稠密），RRF 倒数排名融合。"""
from . import bm25, embeddings, knowledge, store, vector

RRF_K = 60
COSINE_THRESHOLD = 0.6


def _source_docs(collection):
    """从数据源实时构建检索文档（含元数据），不依赖向量库。"""
    if collection == 'resumes':
        return [
            {
                'id': r['id'],
                'text': r.get('text', '') or ' '.join(str(v) for v in r.values() if isinstance(v, str)),
                'meta': {
                    'title': r.get('title', ''),
                    'targetJob': r.get('targetJob', ''),
                    'style': r.get('styleName', ''),
                    'createdAt': r.get('createdAt', ''),
                },
            }
            for r in store.list_resumes()
        ]
    if collection == 'entries':
        docs = []
        for section in store.list_sections():
            for entry in section.get('entries', []):
                text = ' '.join(str(v) for k, v in entry.items() if k != 'id' and v)
                docs.append({
                    'id': f"{section['id']}:{entry['id']}",
                    'text': text,
                    'meta': {'sectionId': section['id'], 'sectionName': section.get('name', ''), 'entryId': entry['id']},
                })
        return docs
    if collection == 'knowledge':
        return knowledge.load_all()
    return []


def search(collection, query, top_k=8):
    docs = _source_docs(collection)
    if not docs or not query.strip():
        return []

    b = bm25.BM25([d['text'] for d in docs])
    lex_scores = b.score(query)
    lex_order = sorted(range(len(docs)), key=lambda i: -lex_scores[i])
    lex_ranks = {docs[i]['id']: r for r, i in enumerate(lex_order) if lex_scores[i] > 0}

    vec_ranks = {}
    if embeddings.model_ready():
        vecs = vector.ensure_vectors(collection, docs)
        if vecs:
            qv = (embeddings.embed([query], is_query=True) or [None])[0]
            if qv:
                vec_scores = {d['id']: embeddings.cosine(qv, vecs[d['id']]) for d in docs if d['id'] in vecs}
                vec_order = sorted(vec_scores, key=lambda did: -vec_scores[did])
                vec_ranks = {did: r for r, did in enumerate(vec_order[:top_k * 2])}

    fused = {}
    for did in set(list(lex_ranks.keys()) + list(vec_ranks.keys())):
        s = 0.0
        if did in lex_ranks:
            s += 1.0 / (RRF_K + lex_ranks[did] + 1)
        if did in vec_ranks:
            s += 1.0 / (RRF_K + vec_ranks[did] + 1)
        fused[did] = s

    by_id = {d['id']: d for d in docs}
    order = sorted(fused, key=lambda did: -fused[did])
    out = []
    for did in order[:top_k]:
        d = dict(by_id[did])
        d['score'] = round(fused[did], 4)
        out.append(d)
    return out


def search_resumes(query, top_k=8):
    hits = search('resumes', query, top_k=top_k)
    by_id = {r['id']: r for r in store.list_resumes()}
    out = []
    for h in hits:
        record = dict(by_id.get(h['id'], {}))
        record['score'] = h['score']
        out.append(record)
    return out


def search_entries(query, top_k=12):
    return search('entries', query, top_k=top_k)


def search_knowledge(query, top_k=3):
    hits = search('knowledge', query, top_k=top_k)
    # 个人历史范文轻微加权，优先呈现
    hits.sort(key=lambda h: (h['meta'].get('source') == 'personal', h['score']), reverse=True)
    return hits


def group_resumes(resumes, threshold=COSINE_THRESHOLD):
    """语义分组：模型可用时用向量余弦 + 贪心阈值聚类；否则退回 Jaccard 词法分组。"""
    if not resumes:
        return []
    docs = [
        {'id': r['id'], 'text': r.get('text', ''), 'meta': {'title': r.get('title', ''), 'targetJob': r.get('targetJob', '')}}
        for r in resumes
    ]
    used = set()
    groups = []
    if embeddings.model_ready():
        vecs = vector.ensure_vectors('resumes', docs)
        qv_ready = bool(vecs)
    else:
        qv_ready = False

    for i, r in enumerate(resumes):
        if r['id'] in used:
            continue
        members = [r]
        used.add(r['id'])
        for j, other in enumerate(resumes):
            if other['id'] in used:
                continue
            sim = 0.0
            if qv_ready and docs[i]['id'] in vecs and docs[j]['id'] in vecs:
                sim = embeddings.cosine(vecs[docs[i]['id']], vecs[docs[j]['id']])
            else:
                sim = _jaccard_sim(docs[i]['text'], docs[j]['text'])
            job_sim = _jaccard_sim(str(r.get('targetJob', '')), str(other.get('targetJob', '')))
            if max(sim, job_sim) >= threshold:
                members.append(other)
                used.add(other['id'])
        groups.append({'key': r.get('targetJob') or '未分类', 'resumes': members})
    return sorted(groups, key=lambda g: -len(g['resumes']))


def _jaccard_sim(a, b):
    ta = set(bm25.tokenize(a))
    tb = set(bm25.tokenize(b))
    if not ta or not tb:
        return 0.0
    inter = len(ta & tb)
    union = len(ta | tb)
    return inter / union if union else 0.0