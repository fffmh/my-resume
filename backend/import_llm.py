# -*- coding: utf-8 -*-
"""导入增强：LLM 结构化抽取（DeepSeek）+ 规则置信度分级。"""
import json
import re

from .classify import gen_id
from . import store


def schema_for_prompt():
    out = {}
    for s in store.list_sections():
        out[s['id']] = {
            'single': s.get('single', False),
            'fields': [{'key': f['key'], 'label': f['label']} for f in s.get('fields', [])],
        }
    return out


def rule_confidence(sections):
    """基于字段填充率给规则识别结果打置信度（高>=60% / 中>=30% / 低）。"""
    defs = {s['id']: s for s in store.list_sections()}
    conf = {}
    for sid, entries in sections.items():
        fields = defs.get(sid, {}).get('fields', [])
        keys = [f['key'] for f in fields if f.get('type') not in ('tags', 'textarea')] or [f['key'] for f in fields]
        arr = []
        for e in entries:
            filled = sum(1 for k in keys if str(e.get(k, '')).strip())
            ratio = filled / len(keys) if keys else 0
            level = '高' if ratio >= 0.6 else ('中' if ratio >= 0.3 else '低')
            arr.append({'level': level, 'reason': ''})
        conf[sid] = arr
    return conf


def import_classify_llm(settings, text):
    """DeepSeek 结构化抽取：把简历文本解析成 8 库条目 + 置信度；失败/无 Key 返回 None。"""
    llm = (settings or {}).get('llm') or {}
    api_key = llm.get('apiKey', '')
    if not api_key or not (text or '').strip():
        return None
    base_url = llm.get('baseUrl') or 'https://api.deepseek.com'
    model = llm.get('model') or 'deepseek-chat'
    try:
        schema = schema_for_prompt()
        from openai import OpenAI
        client = OpenAI(base_url=base_url, api_key=api_key, timeout=60)
        system_prompt = '你是简历信息抽取助手。只抽取文本中明确存在的信息，绝不虚构或推断；字段缺失留空字符串。'
        user_prompt = (
            f'简历文本：\n{(text or "")[:12000]}\n\n'
            f'信息库字段结构（key 与 label）：\n{json.dumps(schema, ensure_ascii=False)}\n\n'
            '输出 JSON（不要解释文字）：\n'
            '{"sections":{"basic":[{字段key:值,...}],"work":[...],...},'
            '"confidence":{"basic":[{"level":"高|中|低","reason":"低置信度的原因，可为空"}],...}}\n'
            '要求：sections 只含结构里出现的字段 key，id 字段省略；confidence 与 sections 每条一一对应；'
            'multi-line 字段（工作内容/业绩/贡献等）用 \\n 分隔要点。'
        )
        resp = client.chat.completions.create(
            model=model,
            messages=[{'role': 'system', 'content': system_prompt}, {'role': 'user', 'content': user_prompt}],
            temperature=0.1,
            max_tokens=4000,
            response_format={'type': 'json_object'},
        )
        raw = (resp.choices[0].message.content or '').strip()
        start = raw.find('{')
        end = raw.rfind('}')
        if start < 0 or end <= start:
            return None
        parsed = json.loads(raw[start:end + 1])
        sections = parsed.get('sections') or {}
        confidence = parsed.get('confidence') or {}
        if not isinstance(sections, dict):
            return None
        cleaned = {}
        cleaned_conf = {}
        for sid, entries in sections.items():
            if not isinstance(entries, list) or not entries:
                continue
            if sid not in schema or not schema[sid].get('fields'):
                continue
            keys = {f['key'] for f in schema[sid]['fields']}
            good = []
            for it in entries:
                if not isinstance(it, dict):
                    continue
                row = {k: str(v) for k, v in it.items() if k in keys and v is not None}
                if sid == 'basic' and 'phone' in row:
                    digits = re.sub(r'[\s-]', '', row['phone'])
                    if re.fullmatch(r'1[3-9]\d{9}|0\d{2,3}\d{7,8}', digits):
                        row['phone'] = digits
                row['id'] = gen_id()
                good.append(row)
            if not good:
                continue
            cleaned[sid] = good
            conf_list = confidence.get(sid) or []
            cleaned_conf[sid] = []
            for i in range(len(good)):
                c = conf_list[i] if i < len(conf_list) and isinstance(conf_list[i], dict) else {}
                level = c.get('level') if c.get('level') in ('高', '中', '低') else '中'
                cleaned_conf[sid].append({'level': level, 'reason': str(c.get('reason', ''))})
        if not cleaned:
            return None
        return {'sections': cleaned, 'confidence': cleaned_conf}
    except Exception:
        return None