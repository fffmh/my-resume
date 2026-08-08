# -*- coding: utf-8 -*-
"""半真解析（Python 移植版）：与前端 classify.ts 同一套规则。"""
import re
import time
import os

RE_EMAIL = re.compile(r'[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}')
RE_PHONE = re.compile(r'(1[3-9]\d{9})|(0\d{2,3}\d{7,8})')
RE_DEGREE = re.compile(r'(博士|硕士研究生|硕士|本科|大专|专科|高中|中专|初中)')
RE_YEARS = re.compile(r'(\d+(?:\.\d+)?)\s*年')
RE_DATE_RANGE = re.compile(
    r'(\d{4})\s*[年./-]\s*(\d{1,2})?\s*[-~至到]\s*(?:(\d{4})\s*[年./-]\s*(\d{1,2})?|(至今|现在|今))'
)

TECH_KEYWORDS = [
    'python', 'java', 'javascript', 'typescript', 'vue', 'react', 'node', 'nodejs', 'go', 'golang',
    'c++', 'c#', 'rust', 'sql', 'mysql', 'postgresql', 'redis', 'mongodb', 'docker', 'kubernetes',
    'k8s', 'linux', 'git', 'html', 'css', 'nginx', 'flutter', 'android', 'ios', '小程序', '微信小程序',
    'echarts', 'webpack', 'vite', 'pinia', 'redux', '微服务', '大数据', '算法', '机器学习', '深度学习',
    'next.js', 'nuxt', 'tailwind', 'webpack5', 'babel', 'rollup', 'esbuild', 'sass', 'less', 'postcss',
    'd3', 'three.js', 'canvas', 'webgl', 'uniapp', 'taro', 'electron', 'react native', 'express', 'koa',
    'nestjs', 'spring', 'django', 'flask', 'fastapi', 'rabbitmq', 'kafka', 'elasticsearch', 'clickhouse',
    'hive', 'spark', 'flink', 'pandas', 'numpy', 'pytorch', 'tensorflow', 'langchain', 'gitlab', 'jenkins',
    'ci/cd', '云原生', 'serverless', '低代码', '可视化',
]


def gen_id():
    return f'{int(time.time() * 1000):x}-{os.urandom(4).hex()}'


def make_entry(partial=None):
    entry = {'id': gen_id()}
    if partial:
        entry.update(partial)
    return entry


def split_tags(value):
    return ', '.join([s.strip() for s in re.split(r'[,，、;；\s]+', value) if s.strip()])


def extract_date_range(line):
    m = RE_DATE_RANGE.search(line)
    if not m:
        return '', ''
    start = m.group(1) if m.group(1) else ''
    if m.group(2):
        start = f"{m.group(1)}.{m.group(2).zfill(2)}"
    if m.group(5):
        return start, '至今'
    end = m.group(3) if m.group(3) else ''
    if m.group(4):
        end = f"{m.group(3)}.{m.group(4).zfill(2)}"
    return start, end


SECTION_HEADER_RE = re.compile(
    r'(教育经历|教育背景|学习经历|工作经历|工作履历|职业经历|从业经历|实习经历|项目经历|项目经验|项目实践|'
    r'专业技能|技能特长|技能|技术栈|证书|认证|资格|自我评价|个人简介|自我介绍|关于我|求职意向|基本信息|个人总结)'
)


def is_section_header(line):
    return bool(SECTION_HEADER_RE.search(line))


def classify_text(raw_text):
    text = raw_text.replace('\r', '')
    sections = {}
    warnings = []
    lines = [l.strip() for l in text.split('\n')]

    def push(section_id, entry):
        sections.setdefault(section_id, []).append(entry)

    email = (RE_EMAIL.search(text) or [''])[0]
    phone = (RE_PHONE.search(re.sub(r'[\s-]', '', text)) or [''])[0]
    degree = (RE_DEGREE.search(text) or [''])[0]
    years_match = RE_YEARS.search(text)
    city_match = re.search(r'(?:现居|所在城市|城市|居住地)\s*[:：]?\s*([^\s，,。]+)', text)
    name_match = re.search(r'(?:姓名|名字)\s*[:：]\s*([^\s，,。]+)', text)
    first_line = next((l for l in lines if re.fullmatch(r'[\u4e00-\u9fa5]{2,4}', l) and not is_section_header(l)), None)

    basic = {}
    if name_match:
        basic['name'] = name_match.group(1)
    elif first_line:
        basic['name'] = first_line
    if phone:
        basic['phone'] = phone
    if email:
        basic['email'] = email
    if degree:
        basic['degree'] = degree
    if years_match:
        basic['years'] = f'{years_match.group(1)}年'
    if city_match:
        basic['city'] = city_match.group(1)
    birth_match = re.search(r'(?:出生日期|生日|出生)\s*[:：]?\s*(\d{4}[-/.年]\d{1,2}(?:[-/.日]\d{1,2})?)', text)
    if birth_match:
        basic['birth'] = birth_match.group(1)
    if basic:
        push('basic', make_entry(basic))

    pos_match = re.search(r'(?:求职意向|期望职位|意向职位|应聘|目标岗位)\s*[:：]?\s*([^\n，,。]+)', text)
    salary_match = re.search(r'(?:期望薪资|薪资要求|薪酬)\s*[:：]?\s*([^\n，,。]+)', text)
    intention = {}
    if pos_match:
        intention['position'] = pos_match.group(1).strip()
    if salary_match:
        intention['salary'] = salary_match.group(1).strip()
    intent_city = re.search(r'(?:期望城市|意向城市|工作城市|目标城市)\s*[:：]?\s*([^\s，,。]+)', text)
    if intent_city:
        intention['city'] = intent_city.group(1)
    if intention:
        push('intention', make_entry(intention))

    current_section = None
    buffer = []

    def flush():
        nonlocal current_section, buffer
        if not current_section or not buffer:
            buffer = []
            return
        block = '\n'.join(buffer)
        if current_section == 'education':
            school_m = re.search(r'([\u4e00-\u9fa5A-Za-z0-9（）()]+(?:大学|学院|学校|中学))', block)
            major_m = re.search(r'专业\s*[:：]?\s*([^\s，,。]+)', block)
            major = major_m.group(1) if major_m else ''
            if not major and school_m:
                rest = RE_DATE_RANGE.sub(' ', block.replace(school_m.group(1), ' '))
                m = re.search(r'^([\u4e00-\u9fa5A-Za-z0-9（）()]{2,12})', rest.strip())
                if m:
                    major = m.group(1)
            start, end = extract_date_range(block)
            d = degree or (RE_DEGREE.search(block).group(0) if RE_DEGREE.search(block) else '')
            push('education', make_entry({'school': school_m.group(1) if school_m else '', 'degree': d, 'major': major, 'start': start, 'end': end, 'honor': ''}))
        elif current_section == 'work':
            start, end = extract_date_range(block)
            cleaned = [t for t in RE_DATE_RANGE.sub(' ', block).split() if t and not re.match(r'^\d', t) and not re.fullmatch(r'[\d.年月至今现在\-~至到]+', t)]
            company = cleaned[0] if cleaned else ''
            position = cleaned[1] if len(cleaned) > 1 else ''
            company_exact = re.search(r'([\u4e00-\u9fa5A-Za-z（）()]+(?:公司|集团|科技|网络|有限|工作室|事务所))', block)
            if company_exact:
                company = company_exact.group(1)
            pos_exact = re.search(r'(?:担任|任职|职位|岗位|从事)\s*[:：]?\s*([^\s，,。]+)', block)
            if pos_exact:
                position = pos_exact.group(1)
            push('work', make_entry({'company': company, 'position': position, 'start': start, 'end': end, 'content': block, 'achievement': '', 'keywords': ''}))
        elif current_section == 'project':
            name_m = re.search(r'项目\s*[:：]?\s*([^\n，,。]+)', block)
            role_m = re.search(r'(?:角色|担任)\s*[:：]?\s*([^\s，,。]+)', block)
            tech_m = re.search(r'(?:技术栈|技术)\s*[:：]?\s*([^\n]+)', block)
            push('project', make_entry({'name': name_m.group(1).strip() if name_m else '', 'role': role_m.group(1) if role_m else '', 'start': '', 'end': '', 'tech': split_tags(tech_m.group(1)) if tech_m else '', 'desc': block, 'contribution': ''}))
        elif current_section == 'certificate':
            push('certificate', make_entry({'name': block.split('\n')[0], 'org': '', 'date': '', 'note': ''}))
        buffer = []

    for line in lines:
        if not line:
            flush()
            current_section = None
            continue
        if is_section_header(line):
            flush()
            if '教育' in line:
                current_section = 'education'
            elif '工作' in line or '实习' in line:
                current_section = 'work'
            elif '项目' in line:
                current_section = 'project'
            elif '证书' in line or '认证' in line or '资格' in line:
                current_section = 'certificate'
            elif '自我评价' in line or '个人总结' in line or '自我介绍' in line:
                current_section = 'self'
            else:
                current_section = None
            continue
        if current_section == 'self':
            buffer.append(line)
            continue
        if current_section:
            buffer.append(line)
            continue
        if re.search(r'(学校|大学|学院|专业|毕业|学士|硕士|博士)', line):
            buffer.append(line)
            current_section = 'education'
        elif re.search(r'(公司|任职|就职|担任|工作内容|业绩)', line):
            buffer.append(line)
            current_section = 'work'
        elif '项目' in line:
            buffer.append(line)
            current_section = 'project'
        elif re.search(r'(证书|认证|资格|执照)', line):
            buffer.append(line)
            current_section = 'certificate'
        elif re.search(r'(技能|掌握|熟练|精通|熟悉|擅长)', line) or any(k in line.lower() for k in TECH_KEYWORDS):
            buffer.append(line)
            current_section = 'skills'
    flush()

    skill_names = set()
    for line in lines:
        if re.search(r'(技能|掌握|熟练|精通|熟悉|擅长)', line) or any(k in line.lower() for k in TECH_KEYWORDS):
            cleaned = re.sub(r'(技能|掌握|熟练|精通|熟悉|擅长)\s*[:：]?\s*', '', line)
            for name in re.split(r'[,，、;；\s]+', cleaned):
                name = name.strip()
                if name and len(name) <= 20:
                    skill_names.add(name)
    if skill_names:
        sections['skills'] = sections.get('skills', []) + [make_entry({'name': n, 'level': '熟练', 'years': ''}) for n in skill_names]

    self_lines = []
    in_self = False
    for line in lines:
        if re.search(r'自我评价|个人总结|自我介绍', line):
            in_self = True
            continue
        if in_self and not line:
            break
        if in_self:
            self_lines.append(line)
    self_content = '\n'.join(self_lines).strip()
    if self_content:
        push('self', make_entry({'content': self_content}))

    if not sections:
        warnings.append('未能从文件中识别出结构化信息，可先在下方预览中手动填写。')
    return sections, warnings