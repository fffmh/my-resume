# -*- coding: utf-8 -*-
from backend import generate, store


def _sections():
    sections = store.list_sections()
    by_id = {s['id']: s for s in sections}
    by_id['basic']['entries'] = [{'id': store.gen_id(), 'name': '张三', 'phone': '13800138000'}]
    by_id['work']['entries'] = [
        {'id': 'w1', 'company': 'A', 'position': '前端', 'content': '负责搭建组件库\n优化首屏性能', 'achievement': '性能提升 40%', 'keywords': ''},
    ]
    by_id['skills']['entries'] = [{'id': 's1', 'name': 'Vue', 'level': '精通', 'years': '3年'}]
    return sections


class _FakeOpenAI:
    captured = {}

    def __init__(self, *a, **k):
        pass

    @property
    def chat(self):
        class Chat:
            completions = _FakeCompletions()
        return Chat()


class _FakeCompletions:
    def create(self, **kwargs):
        _FakeOpenAI.captured = kwargs
        content = '{"basic":{"name":"张三"},"work":[{"id":"w1","content":"负责 主导 优化"}],"self":"靠谱"}'
        message = type('M', (), {'content': content})()
        choice = type('C', (), {'message': message})()
        return type('R', (), {'choices': [choice]})()


def test_optimize_prompt_structured_output(monkeypatch):
    monkeypatch.setattr('openai.OpenAI', _FakeOpenAI)
    settings = {'llm': {'apiKey': 'sk-x', 'baseUrl': '', 'model': 'deepseek-chat'}}
    data = {'basic': {'name': '张三'}, 'work': [{'id': 'w1', 'content': '负责优化'}], 'self': ''}
    out = generate.optimize_with_llm(settings, '前端开发工程师', 'Vue 性能优化', data, [])
    assert out and out['work'][0]['id'] == 'w1'
    cap = _FakeOpenAI.captured
    assert cap.get('response_format') == {'type': 'json_object'}
    assert cap.get('temperature') == 0.5
    user_msg = cap['messages'][1]['content']
    assert '润色示例' in user_msg
    assert '四层原则' not in user_msg  # 四层指令在 system prompt
    assert '四层原则' in cap['messages'][0]['content']


def test_hr_score_blend(monkeypatch):
    sections = _sections()
    settings = {'llm': {'apiKey': 'sk-x', 'baseUrl': '', 'model': ''}}
    monkeypatch.setattr(generate, 'score_resume_llm', lambda *a, **k: {
        'total': 100,
        'dims': [],
        'suggestions': ['量化成果再多一些'],
        'comment': '整体优秀，可进一步突出结果',
    })
    record = generate.generate(settings, sections, '前端开发工程师', 'Vue 性能优化', 'aurora')
    rule = generate.score_resume(sections, '前端开发工程师', 'Vue 性能优化')['total']
    assert record['score'] == round(0.4 * rule + 0.6 * 100)
    assert any('AI 评审' in s for s in record['suggestions'])
    assert any('AI 建议' in s for s in record['suggestions'])


def test_hr_score_none_without_key():
    assert generate.score_resume_llm({'llm': {'apiKey': ''}}, '前端', '', store.list_sections()) is None