# -*- coding: utf-8 -*-
"""范文知识库：内置岗位范文（Markdown 分块）+ 用户历史简历（self-RAG）。"""
import re
from pathlib import Path

from . import store

KNOWLEDGE_DIR = Path(__file__).resolve().parent / 'knowledge'
BUILTIN_FILES = [
    '前端开发工程师.md',
    '后端开发工程师.md',
    '数据分析师.md',
    '产品经理.md',
    '通用写法要点.md',
]


def chunk_markdown(text, min_len=180, max_len=520):
    """按二级标题/段落切块，合并到 180-520 字。"""
    parts = re.split(r'\n(?=## )', text)
    chunks = []
    for part in parts:
        paragraphs = [p.strip() for p in part.split('\n') if p.strip()]
        buf = ''
        for p in paragraphs:
            if len(buf) + len(p) + 1 > max_len and buf:
                chunks.append(buf.strip())
                buf = p
            else:
                buf = (buf + '\n' + p) if buf else p
        if buf and len(buf.strip()) >= min_len:
            chunks.append(buf.strip())
    return [c for c in chunks if c]


def load_builtin():
    docs = []
    idx = 0
    for fname in BUILTIN_FILES:
        path = KNOWLEDGE_DIR / fname
        if not path.exists():
            continue
        text = path.read_text(encoding='utf-8')
        for chunk in chunk_markdown(text):
            docs.append({
                'id': f'kb-{idx}',
                'text': chunk,
                'meta': {'source': 'builtin', 'title': fname.replace('.md', ''), 'tag': '范文'},
            })
            idx += 1
    return docs


def load_personal():
    docs = []
    for r in store.list_resumes():
        text = (r.get('text') or '').strip()
        if not text:
            continue
        docs.append({
            'id': f'personal-{r["id"]}',
            'text': text,
            'meta': {'source': 'personal', 'title': r.get('title', '个人简历'), 'tag': '个人历史'},
        })
    return docs


def load_all():
    return load_builtin() + load_personal()