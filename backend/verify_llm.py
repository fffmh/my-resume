# -*- coding: utf-8 -*-
"""真实 DeepSeek Key 验证：润色 / HR 评分 / 导入抽取 三条链路冒烟。
用法：先配置好 data/settings.json 的 llm.apiKey，然后 python -m backend.verify_llm
"""
import json

from . import generate, import_llm, store

SAMPLE_DATA = {
    'basic': {'name': '林澈', 'phone': '13800138000', 'email': 'linche.dev@gmail.com', 'city': '上海', 'years': '5年', 'degree': '本科'},
    'intention': {'position': '前端开发工程师', 'salary': '25-35K', 'city': '上海'},
    'education': [{'school': '复旦大学', 'major': '计算机科学与技术', 'degree': '本科', 'start': '2016.09', 'end': '2020.06'}],
    'work': [
        {'company': '字节跳动', 'position': '前端工程师', 'start': '2022.07', 'end': '至今',
         'content': '负责招聘平台核心链路开发\n搭建 Vue3 组件库\n做性能优化',
         'achievement': '首屏从 3.2s 优化到 1.1s', 'keywords': 'Vue3, TypeScript'},
    ],
    'project': [{'name': '简历生成引擎', 'role': '前端负责人', 'tech': 'Vue3, Vite', 'desc': '多模板简历生成平台', 'contribution': '设计模板渲染管线'}],
    'skills': [{'name': 'Vue3', 'level': '精通'}, {'name': 'TypeScript', 'level': '精通'}, {'name': '性能优化', 'level': '熟练'}],
    'certificate': [],
    'self': '5 年前端经验，专注工程化与性能优化。',
    'targetJob': '前端开发工程师',
}

SAMPLE_TEXT = """林澈
138 0013 8000
linche.dev@gmail.com
本科 上海

求职意向：前端开发工程师 期望薪资 25-35K

教育经历
2019.09 - 2023.06 复旦大学 计算机科学与技术 本科

工作经历
2021.07 - 至今 字节跳动 前端工程师
负责招聘平台前端开发，使用 Vue3 TypeScript

项目经历
项目：简历生成器 角色：前端负责人 技术栈：Vue3, Vite

技能
Vue3, TypeScript, 性能优化

自我评价
热爱前端，关注工程化与体验优化
"""


def main():
    settings = store.get_settings()
    llm = settings.get('llm') or {}
    key = llm.get('apiKey', '')
    if not key:
        print('尚未配置 DeepSeek API Key。')
        print('配置方式一：启动后端后在「设置」页填写（BaseURL https://api.deepseek.com / model deepseek-chat / Key）。')
        print('配置方式二：编辑 data/settings.json：')
        print('  {"llm": {"baseUrl": "https://api.deepseek.com", "apiKey": "sk-你的Key", "model": "deepseek-chat"}}')
        return

    print('=== 1/3 大模型润色（few-shot + 四层指令） ===')
    out = generate.optimize_with_llm(settings, '前端开发工程师', 'Vue 性能优化 组件库 前端工程化', SAMPLE_DATA, [])
    if out is None:
        print('失败：返回 None（检查 Key / 网络 / 余额）')
    else:
        print(json.dumps(out, ensure_ascii=False, indent=1)[:2000])

    print('\n=== 2/3 HR 评分卡 ===')
    sections = store.list_sections()
    by_id = {s['id']: s for s in sections}
    by_id['basic']['entries'] = [{'id': store.gen_id(), 'name': '林澈', 'phone': '13800138000', 'email': 'l@x.com', 'city': '上海'}]
    by_id['intention']['entries'] = [{'id': store.gen_id(), 'position': '前端开发工程师', 'salary': '25-35K'}]
    by_id['work']['entries'] = [
        {'id': store.gen_id(), 'company': '字节跳动', 'position': '前端工程师', 'start': '2022.07', 'end': '至今',
         'content': '负责搭建组件库\n优化首屏性能', 'achievement': '首屏 3.2s -> 1.1s', 'keywords': ''},
    ]
    by_id['skills']['entries'] = [
        {'id': store.gen_id(), 'name': 'Vue3', 'level': '精通', 'years': '3年'},
        {'id': store.gen_id(), 'name': 'TypeScript', 'level': '精通', 'years': '3年'},
        {'id': store.gen_id(), 'name': '性能优化', 'level': '熟练', 'years': '2年'},
    ]
    by_id['self']['entries'] = [{'id': store.gen_id(), 'content': '热爱前端与工程化'}]
    score = generate.score_resume_llm(settings, '前端开发工程师', 'Vue 性能优化 组件库', sections)
    if score is None:
        print('失败：返回 None')
    else:
        print(json.dumps(score, ensure_ascii=False, indent=1)[:1500])

    print('\n=== 3/3 导入结构化抽取 ===')
    result = import_llm.import_classify_llm(settings, SAMPLE_TEXT)
    if result is None:
        print('失败：返回 None')
    else:
        print('sections:', json.dumps({k: len(v) for k, v in result['sections'].items()}, ensure_ascii=False))
        print('basic:', json.dumps(result['sections'].get('basic', [])[:1], ensure_ascii=False)[:500])
        print('work:', json.dumps(result['sections'].get('work', [])[:1], ensure_ascii=False)[:600])
        print('confidence:', json.dumps(result['confidence'], ensure_ascii=False)[:300])

    print('\n完成。若某一步失败，请检查 Key 是否有效、账户余额，以及网络能否访问 api.deepseek.com。')


if __name__ == '__main__':
    main()