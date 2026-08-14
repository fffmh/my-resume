# -*- coding: utf-8 -*-
"""生成引擎（Python 移植）：筛选打分 + 评分 + 大模型润色（可降级规则）。"""
import json
import re
import time
from datetime import datetime, timezone

from . import embeddings, retrieve, store

STYLE_NAMES = {
    'aurora': '极光 · 现代',
    'minimal': '静界 · 简洁',
    'classic': '曜石 · 经典',
    'royal': '鎏金 · 商务',
    'holotech': '全息 · 科技',
    'mono': '极客 · 终端',
    'ocean': '深海 · 渐变',
    'paper': '白纸 · 打印',
}

ACTION_VERBS = ['负责', '主导', '推动', '搭建', '优化', '设计', '实现', '参与', '统筹', '攻克', '重构', '落地', '构建', '维护', '提升', '降低', '支持']


def tokenize(text):
    norm = text.lower()
    tokens = []
    for m in re.finditer(r'[a-z0-9][a-z0-9._+#-]*', norm):
        tokens.append(m.group(0))
    cjk = re.sub(r'[^\u4e00-\u9fa5]', '', norm)
    for i in range(len(cjk)):
        tokens.append(cjk[i])
        if i + 1 < len(cjk):
            tokens.append(cjk[i:i + 2])
    return tokens


def build_keywords(target_job, jd):
    return {t for t in tokenize(f'{target_job} {jd}') if len(t) >= 2}


def score_entry(entry, keywords):
    score = 0
    for v in entry.values():
        if isinstance(v, str):
            for t in tokenize(v):
                if t in keywords:
                    score += 1
    return score


def _first(sections_by_id, sid):
    s = sections_by_id.get(sid)
    return dict(s['entries'][0]) if s and s.get('entries') else {}


def _keep(sections_by_id, sid):
    s = sections_by_id.get(sid)
    return [dict(e) for e in (s['entries'] if s else [])]


def _ranked(sections_by_id, sid, keywords, target_job, jd):
    s = sections_by_id.get(sid)
    if not s:
        return []
    entries = [dict(e) for e in s['entries']]
    if not entries:
        return []
    lex_map = {e['id']: score_entry(e, keywords) for e in entries}
    max_lex = max(lex_map.values()) or 1
    sem_map = {}
    if embeddings.model_ready():
        hits = retrieve.search_entries(f'{target_job} {jd}', top_k=30)
        sem_map = {h['meta']['entryId']: h['score'] for h in hits if h['meta']['sectionId'] == sid}

    def blend(e):
        return 0.6 * sem_map.get(e['id'], 0.0) + 0.4 * (lex_map.get(e['id'], 0) / max_lex)

    return sorted(entries, key=blend, reverse=True)


def build_resume_data(sections, target_job, jd):
    by_id = {s['id']: s for s in sections}
    keywords = build_keywords(target_job, jd)
    return {
        'basic': _first(by_id, 'basic'),
        'intention': _first(by_id, 'intention'),
        'education': _keep(by_id, 'education'),
        'work': _ranked(by_id, 'work', keywords, target_job, jd),
        'project': _ranked(by_id, 'project', keywords, target_job, jd),
        'skills': _ranked(by_id, 'skills', keywords, target_job, jd),
        'certificate': _keep(by_id, 'certificate'),
        'self': str(_first(by_id, 'self').get('content', '')),
        'targetJob': target_job,
    }


def render_text(data):
    parts = []
    for sid in ('basic', 'intention'):
        d = data.get(sid) or {}
        parts.extend(str(v) for k, v in d.items() if k != 'id' and v)
    for sid in ('education', 'work', 'project', 'skills', 'certificate'):
        for it in data.get(sid) or []:
            parts.extend(str(v) for k, v in it.items() if k != 'id' and v)
    if data.get('self'):
        parts.append(str(data['self']))
    return ' '.join(parts)


# ---------------- 评分 ----------------
def score_resume(sections, target_job, jd):
    suggestions = []
    by_id = {s['id']: s for s in sections}

    basic = _first(by_id, 'basic')
    intention = _first(by_id, 'intention')
    work_list = _keep(by_id, 'work')
    edu_list = _keep(by_id, 'education')
    skill_list = _keep(by_id, 'skills')
    self_text = str(_first(by_id, 'self').get('content', '')).strip()

    checks = [
        (bool(basic.get('name')), '补充姓名'),
        (bool(basic.get('phone')), '补充联系电话'),
        (bool(basic.get('email')), '补充邮箱'),
        (bool(basic.get('city')), '补充现居城市'),
        (bool(intention.get('position')), '补充期望职位'),
        (bool(intention.get('salary')), '补充期望薪资'),
        (len(work_list) > 0, '补充至少一段工作经历'),
        (len(edu_list) > 0, '补充教育经历'),
        (len(skill_list) >= 3, '技能建议至少 3 项'),
        (bool(self_text), '补充自我评价'),
    ]
    complete_score = 0
    for ok, tip in checks:
        if ok:
            complete_score += 2.5
        else:
            suggestions.append(tip)

    keywords = build_keywords(target_job, jd)
    match_text = ' '.join(
        ' '.join(str(v) for k, v in it.items() if k != 'id' and v)
        for it in work_list + skill_list + _keep(by_id, 'project')
    )
    match_tokens = set(tokenize(match_text))
    hit = sum(1 for kw in keywords if kw in match_tokens)
    ratio = hit / len(keywords) if keywords else 0
    match_score = min(25, ratio * 25 * 1.6) if keywords else 12.5
    if keywords and ratio < 0.3:
        suggestions.append(f'补充与目标岗位相关的关键词：{"、".join(sorted(keywords)[:6])}')

    quant_text = ' '.join(
        f"{it.get('achievement', '')} {it.get('contribution', '')}"
        for it in work_list + _keep(by_id, 'project')
    )
    num_matches = len(re.findall(r'\d+(?:\.\d+)?\s*[%％倍个项人天msMBGB]?', quant_text))
    quant_score = min(25, num_matches * 5)
    if num_matches < 3:
        suggestions.append('在业绩/贡献中增加量化成果，如「性能提升 40%」「覆盖 5000+ 用户」')

    content_text = '\n'.join(
        f"{it.get('content', '')}\n{it.get('contribution', '')}"
        for it in work_list + _keep(by_id, 'project')
    )
    bullet_count = 0
    verb_count = 0
    for line in content_text.split('\n'):
        line = line.strip()
        if not line:
            continue
        bullet_count += 1
        if any(line.startswith(v) for v in ACTION_VERBS):
            verb_count += 1
    lang_score = 0
    if bullet_count >= 5:
        lang_score += 12
    else:
        lang_score += bullet_count * 2.4
        if bullet_count < 5:
            suggestions.append('工作/项目描述建议拆分为 5 条以上要点，便于阅读')
    lang_score += min(13, verb_count * 1.3)
    if bullet_count > 0 and verb_count < bullet_count * 0.4:
        suggestions.append('要点开头建议使用动作动词（负责/主导/搭建/优化…）')

    total = max(0, min(100, round(complete_score + match_score + quant_score + lang_score)))
    return {
        'total': total,
        'dimensions': [
            {'key': 'complete', 'name': '信息完整度', 'score': round(complete_score), 'max': 25, 'tip': '核心字段是否齐备'},
            {'key': 'match', 'name': '岗位匹配', 'score': round(match_score), 'max': 25, 'tip': '与目标岗位 / JD 关键词重合度'},
            {'key': 'quant', 'name': '量化成果', 'score': round(quant_score), 'max': 25, 'tip': '业绩是否用数字说话'},
            {'key': 'lang', 'name': '语言质量', 'score': round(lang_score), 'max': 25, 'tip': '要点化与动作动词使用'},
        ],
        'suggestions': list(dict.fromkeys(suggestions))[:6],
    }


# ---------------- 大模型润色 ----------------
def optimize_with_llm(settings, target_job, jd, data, rag_chunks=None):
    """DeepSeek 润色：few-shot + 四层指令 + 结构化 JSON 输出；失败自动重试 1 次后返回 None（规则兜底）。"""
    llm = (settings or {}).get('llm') or {}
    api_key = llm.get('apiKey', '')
    if not api_key:
        return None
    base_url = llm.get('baseUrl') or 'https://api.deepseek.com'
    model = llm.get('model') or 'deepseek-chat'

    rag_text = ''
    if rag_chunks:
        parts = []
        for ch in rag_chunks:
            src = '个人历史简历' if ch['meta'].get('source') == 'personal' else '通用范文'
            parts.append(f'【参考{src}：{ch["meta"].get("title", "")}】\n{ch["text"]}')
        rag_text = '\n\n以下为可参考的范文片段（仅参考结构与措辞，严禁照抄或虚构本人经历）：\n' + '\n\n'.join(parts) + '\n\n'

    few_shot = (
        '【润色示例】\n'
        '原文：负责公司前端项目，做了很多性能优化。\n'
        '润色后：主导招聘平台前端架构与核心链路开发，搭建 Vue3 + TypeScript 统一组件库（40+ 组件，业务接入率 72%）；'
        '通过缓存、懒加载与代码分割将首屏从 3.2s 优化至 1.1s（-66%）。\n'
    )

    system_prompt = (
        '你是资深 HR 简历顾问。你只基于用户给定的事实润色简历，绝不虚构、夸大或编造任何信息'
        '（公司、职位、数字、项目均不得新增）。改写遵循四层原则：'
        '1) 完整保留事实；2) 优化措辞（要点用动作动词开头，去掉口语与空话）；'
        '3) 补强量化表达（把可量化的点明确成数字，数字必须来自原文或可合理推断）；'
        '4) 对齐岗位关键词（把 JD 中的关键词自然地融入经历与技能）。'
        '要点化输出，单条 20-40 字。'
    )
    user_prompt = (
        f'目标岗位：{target_job}\n'
        f'岗位要求：{jd or "（无）"}\n\n'
        f'原始素材 JSON：\n{json.dumps(data, ensure_ascii=False)}\n\n'
        f'{few_shot}'
        f'{rag_text}'
        '请输出一份润色后的简历数据，仅输出 JSON（不要任何解释文字），字段结构与输入一致。'
        '工作/项目经历每条记录的 content 保持多行字符串（用 \n 分隔各条要点）。'
        'JSON 格式：{"basic":{...},"intention":{...},"education":[...],"work":[...],"project":[...],"skills":[...],"certificate":[...],"self":"..."}'
    )

    for _attempt in range(2):
        try:
            from openai import OpenAI
            client = OpenAI(base_url=base_url, api_key=api_key, timeout=60)
            resp = client.chat.completions.create(
                model=model,
                messages=[{'role': 'system', 'content': system_prompt}, {'role': 'user', 'content': user_prompt}],
                temperature=0.5,
                max_tokens=4000,
                response_format={'type': 'json_object'},
            )
            raw = (resp.choices[0].message.content or '').strip()
            start_idx = raw.find('{')
            end_idx = raw.rfind('}')
            if start_idx < 0 or end_idx <= start_idx:
                continue
            parsed = json.loads(raw[start_idx:end_idx + 1])
            if not isinstance(parsed, dict) or 'work' not in parsed:
                continue
            return parsed
        except Exception:
            continue
    return None


def score_resume_llm(settings, target_job, jd, sections):
    """HR 评分卡：让大模型按 5 维打分（各 20 分），失败返回 None（退回纯规则分）。"""
    llm = (settings or {}).get('llm') or {}
    api_key = llm.get('apiKey', '')
    if not api_key:
        return None
    base_url = llm.get('baseUrl') or 'https://api.deepseek.com'
    model = llm.get('model') or 'deepseek-chat'
    try:
        data = build_resume_data(sections, target_job, jd)
        system_prompt = (
            '你是资深 HR。请按 HR 评分卡给候选人简历打分，只基于简历内容，不虚构、不脑补。'
            '五个维度各 20 分：岗位匹配度、可量化成果、结构完整度、语言质量、专业表达。'
        )
        user_prompt = (
            f'目标岗位：{target_job}\n'
            f'岗位要求：{jd or "（无）"}\n\n'
            f'简历内容（JSON）：\n{json.dumps(data, ensure_ascii=False)}\n\n'
            '输出 JSON（不要解释文字）：'
            '{"total":0-100,"dims":[{"name":"岗位匹配","score":0-20,"tip":"扣分原因/改进建议"},'
            '{"name":"可量化成果","score":0-20,"tip":"..."},{"name":"结构完整","score":0-20,"tip":"..."},'
            '{"name":"语言质量","score":0-20,"tip":"..."},{"name":"专业表达","score":0-20,"tip":"..."}],'
            '"comment":"一句话总评"}'
        )
        from openai import OpenAI
        client = OpenAI(base_url=base_url, api_key=api_key, timeout=60)
        resp = client.chat.completions.create(
            model=model,
            messages=[{'role': 'system', 'content': system_prompt}, {'role': 'user', 'content': user_prompt}],
            temperature=0.3,
            max_tokens=1200,
            response_format={'type': 'json_object'},
        )
        raw = (resp.choices[0].message.content or '').strip()
        s = raw.find('{')
        e = raw.rfind('}')
        if s < 0 or e <= s:
            return None
        parsed = json.loads(raw[s:e + 1])
        total = max(0, min(100, int(parsed.get('total', 0))))
        dims = parsed.get('dims') or []
        suggestions = []
        for d in dims:
            if isinstance(d, dict) and d.get('score', 20) < 12 and d.get('tip'):
                suggestions.append(f"{d.get('name', '维度')}：{d['tip']}")
        return {
            'total': total,
            'dims': dims,
            'suggestions': suggestions[:4],
            'comment': str(parsed.get('comment', '')).strip(),
        }
    except Exception:
        return None


def _merge_llm(data, llm_data):
    out = dict(data)
    for sid in ('basic', 'intention'):
        if isinstance(llm_data.get(sid), dict):
            merged = dict(data.get(sid) or {})
            merged.update({k: v for k, v in llm_data[sid].items() if v not in (None, '')})
            out[sid] = merged
    for sid in ('education', 'work', 'project', 'skills', 'certificate'):
        if isinstance(llm_data.get(sid), list):
            items = []
            for it in llm_data[sid]:
                if isinstance(it, dict):
                    it = dict(it)
                    it.setdefault('id', store.gen_id())
                    items.append(it)
            if items:
                out[sid] = items
    if isinstance(llm_data.get('self'), str) and llm_data['self'].strip():
        out['self'] = llm_data['self'].strip()
    if llm_data.get('targetJob'):
        out['targetJob'] = llm_data['targetJob']
    return out


def generate(settings, sections, target_job, jd, style):
    data = build_resume_data(sections, target_job, jd)
    rag_chunks = retrieve.search_knowledge(f'{target_job} {jd}', top_k=3) if embeddings.model_ready() else []
    llm_data = optimize_with_llm(settings, target_job, jd, data, rag_chunks)
    used_llm = llm_data is not None
    if used_llm:
        data = _merge_llm(data, llm_data)
    text = render_text(data)
    score = score_resume(sections, target_job, jd)
    llm_score = score_resume_llm(settings, target_job, jd, sections)
    if llm_score:
        suggestions = score['suggestions'] + [f'AI 建议：{s}' for s in llm_score['suggestions']]
        if llm_score.get('comment'):
            suggestions.append(f"AI 评审：{llm_score['comment']}")
        score = {
            **score,
            'total': round(0.4 * score['total'] + 0.6 * llm_score['total']),
            'suggestions': list(dict.fromkeys(suggestions))[:8],
        }
    return {
        'id': store.gen_id(),
        'title': f'{target_job} · 简历',
        'targetJob': target_job,
        'style': style,
        'styleName': STYLE_NAMES.get(style, style),
        'data': data,
        'text': text,
        'score': score['total'],
        'suggestions': score['suggestions'],
        'createdAt': datetime.now(timezone.utc).isoformat(),
        'usedLlm': used_llm,
        'usedRag': bool(rag_chunks) and used_llm,
    }


# ---------------- 一键体验示例数据 ----------------
def demo_entries():
    def e(**kw):
        kw['id'] = store.gen_id()
        return kw
    return {
        'basic': [e(name='林澈', gender='男', birth='1998-05-12', phone='13800138000', email='linche.dev@gmail.com', city='上海', degree='本科', years='5年', homepage='https://github.com/linche')],
        'intention': [e(position='前端开发工程师', city='上海', salary='25-35K·14薪', type='全职', join='两周内到岗')],
        'education': [e(school='复旦大学', degree='本科', major='计算机科学与技术', start='2016.09', end='2020.06', honor='国家奖学金 · 校优秀毕业生')],
        'work': [
            e(company='字节跳动', position='前端工程师', start='2022.07', end='至今', content='负责招聘平台核心链路的架构与开发，主导组件库与工程化建设\n搭建基于 Vue3 + TypeScript 的统一组件库，覆盖 40+ 业务页面\n推动微前端改造，应用启动耗时降低 38%', achievement='核心页面首屏从 3.2s 优化至 1.1s（-66%）；组件复用率提升至 72%', keywords='Vue3, TypeScript, 微前端, 性能优化'),
            e(company='美团', position='前端开发工程师', start='2020.07', end='2022.06', content='负责商家端数据看板与可视化\n基于 ECharts 搭建可视化图表体系，覆盖 20+ 业务报表\n抽象通用请求层与权限指令，开发效率提升 30%', achievement='报表渲染耗时降低 45%；接入商家 5000+', keywords='ECharts, 可视化, 工程化'),
        ],
        'project': [
            e(name='简历生成引擎', role='前端负责人', start='2023.03', end='2023.08', tech='Vue3, Pinia, Vite, 无头浏览器', desc='面向求职者的多模板简历生成平台，支持信息库复用与岗位匹配筛选', contribution='设计数据层适配器与模板渲染管线；接入关键词匹配与规则润色，简历生成耗时 < 1s'),
            e(name='实时数据中台', role='核心开发', start='2021.09', end='2022.03', tech='Vue2, WebSocket, ECharts', desc='商家经营数据实时看板，日均 10 万级查询', contribution='负责实时链路与增量渲染优化，页面卡顿率下降 60%'),
        ],
        'skills': [
            e(name='Vue 3 / Vue 2', level='精通', years='5年'),
            e(name='TypeScript', level='精通', years='4年'),
            e(name='性能优化', level='精通', years='4年'),
            e(name='微前端 / 工程化', level='熟练', years='3年'),
            e(name='Node.js', level='熟练', years='3年'),
            e(name='React', level='熟练', years='2年'),
        ],
        'certificate': [
            e(name='PMP 项目管理认证', org='PMI', date='2023.05', note=''),
            e(name='CET-6 英语六级', org='教育部', date='2018.12', note=''),
        ],
        'self': [e(content='5 年前端开发经验，专注工程化与性能优化。热爱把复杂问题拆解成清晰方案，习惯用数据衡量结果；注重代码质量与团队协作，追求可持续的高质量交付。')],
    }