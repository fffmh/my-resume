# -*- coding: utf-8 -*-
import io

import docx

from backend import docx_export, store


def test_build_docx():
    sections = store.list_sections()
    by_id = {s['id']: s for s in sections}
    by_id['basic']['entries'] = [{'id': store.gen_id(), 'name': '张三', 'phone': '13800138000', 'email': 'z@x.com', 'city': '上海', 'years': '5年'}]
    by_id['intention']['entries'] = [{'id': store.gen_id(), 'position': '前端开发工程师', 'salary': '25-35K'}]
    by_id['work']['entries'] = [
        {'id': store.gen_id(), 'company': 'A公司', 'position': '前端', 'start': '2021.01', 'end': '至今',
         'content': '负责搭建组件库\n优化首屏性能', 'achievement': '性能提升 40%', 'keywords': ''},
    ]
    by_id['skills']['entries'] = [{'id': store.gen_id(), 'name': 'Vue3', 'level': '精通', 'years': '3年'}]
    by_id['self']['entries'] = [{'id': store.gen_id(), 'content': '热爱前端'}]
    data = {
        'basic': dict(by_id['basic']['entries'][0]),
        'intention': dict(by_id['intention']['entries'][0]),
        'education': [], 'work': [dict(by_id['work']['entries'][0])],
        'project': [], 'skills': [dict(by_id['skills']['entries'][0])],
        'certificate': [], 'self': '热爱前端', 'targetJob': '前端开发工程师',
    }
    out = docx_export.build_docx(data)
    doc = docx.Document(io.BytesIO(out))
    texts = [p.text for p in doc.paragraphs]
    joined = '\n'.join(texts)
    assert '张三' in joined
    assert '前端开发工程师' in joined
    assert '性能提升 40%' in joined
    assert '热爱前端' in joined