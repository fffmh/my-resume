# -*- coding: utf-8 -*-
"""内置 8 个信息库定义（与前端 presets.ts 保持一致）。"""

DEFAULT_SECTIONS = [
    {
        'id': 'basic', 'name': '基本信息', 'icon': 'user', 'desc': '姓名、联系方式与个人概况', 'single': True,
        'fields': [
            {'key': 'name', 'label': '姓名', 'type': 'text', 'placeholder': '张三'},
            {'key': 'gender', 'label': '性别', 'type': 'select', 'options': ['男', '女', '其他']},
            {'key': 'birth', 'label': '出生日期', 'type': 'date'},
            {'key': 'phone', 'label': '联系电话', 'type': 'text', 'placeholder': '13800138000'},
            {'key': 'email', 'label': '邮箱', 'type': 'text', 'placeholder': 'name@example.com'},
            {'key': 'city', 'label': '现居城市', 'type': 'text', 'placeholder': '上海'},
            {'key': 'degree', 'label': '学历', 'type': 'select', 'options': ['高中', '大专', '本科', '硕士', '博士']},
            {'key': 'years', 'label': '工作年限', 'type': 'text', 'placeholder': '5年'},
            {'key': 'homepage', 'label': '个人主页 / GitHub', 'type': 'text', 'placeholder': 'https://github.com/xxx'},
        ],
        'entries': [],
    },
    {
        'id': 'intention', 'name': '求职意向', 'icon': 'target', 'desc': '期望职位、城市、薪资与到岗时间', 'single': True,
        'fields': [
            {'key': 'position', 'label': '期望职位', 'type': 'text', 'placeholder': '前端开发工程师'},
            {'key': 'city', 'label': '期望城市', 'type': 'text', 'placeholder': '上海'},
            {'key': 'salary', 'label': '期望薪资', 'type': 'text', 'placeholder': '25-35K·14薪'},
            {'key': 'type', 'label': '工作性质', 'type': 'select', 'options': ['全职', '兼职', '实习']},
            {'key': 'join', 'label': '到岗时间', 'type': 'text', 'placeholder': '随时到岗'},
        ],
        'entries': [],
    },
    {
        'id': 'education', 'name': '教育经历', 'icon': 'cap', 'desc': '学校、学历、专业与时间线', 'single': False,
        'fields': [
            {'key': 'school', 'label': '学校', 'type': 'text', 'placeholder': '复旦大学'},
            {'key': 'degree', 'label': '学历', 'type': 'select', 'options': ['高中', '大专', '本科', '硕士', '博士']},
            {'key': 'major', 'label': '专业', 'type': 'text', 'placeholder': '计算机科学与技术'},
            {'key': 'start', 'label': '开始时间', 'type': 'text', 'placeholder': '2019.09'},
            {'key': 'end', 'label': '结束时间', 'type': 'text', 'placeholder': '2023.06'},
            {'key': 'honor', 'label': '在校经历 / 荣誉', 'type': 'textarea', 'placeholder': '奖学金、竞赛、社团等'},
        ],
        'entries': [],
    },
    {
        'id': 'work', 'name': '工作经历', 'icon': 'briefcase', 'desc': '公司、职位、职责与业绩成果', 'single': False,
        'fields': [
            {'key': 'company', 'label': '公司', 'type': 'text', 'placeholder': '字节跳动'},
            {'key': 'position', 'label': '职位', 'type': 'text', 'placeholder': '前端工程师'},
            {'key': 'start', 'label': '开始时间', 'type': 'text', 'placeholder': '2021.07'},
            {'key': 'end', 'label': '结束时间', 'type': 'text', 'placeholder': '至今'},
            {'key': 'content', 'label': '工作内容', 'type': 'textarea', 'placeholder': '每行一条，可用 - 或 · 开头'},
            {'key': 'achievement', 'label': '业绩成果', 'type': 'textarea', 'placeholder': '尽量量化，如：首屏加载时间从 3s 优化到 1.2s'},
            {'key': 'keywords', 'label': '关键词', 'type': 'tags', 'placeholder': 'Vue, TypeScript, 性能优化'},
        ],
        'entries': [],
    },
    {
        'id': 'project', 'name': '项目经历', 'icon': 'rocket', 'desc': '项目、角色、技术栈与个人贡献', 'single': False,
        'fields': [
            {'key': 'name', 'label': '项目名称', 'type': 'text', 'placeholder': '招聘数据中台'},
            {'key': 'role', 'label': '角色', 'type': 'text', 'placeholder': '前端负责人'},
            {'key': 'start', 'label': '开始时间', 'type': 'text', 'placeholder': '2022.03'},
            {'key': 'end', 'label': '结束时间', 'type': 'text', 'placeholder': '2022.12'},
            {'key': 'tech', 'label': '技术栈', 'type': 'tags', 'placeholder': 'Vue3, Pinia, ECharts'},
            {'key': 'desc', 'label': '项目描述', 'type': 'textarea', 'placeholder': '项目背景与规模'},
            {'key': 'contribution', 'label': '我的贡献', 'type': 'textarea', 'placeholder': '每行一条，突出个人成果'},
        ],
        'entries': [],
    },
    {
        'id': 'skills', 'name': '技能特长', 'icon': 'zap', 'desc': '技能清单与熟练程度', 'single': False,
        'fields': [
            {'key': 'name', 'label': '技能名称', 'type': 'text', 'placeholder': 'Vue 3'},
            {'key': 'level', 'label': '熟练度', 'type': 'select', 'options': ['入门', '熟练', '精通']},
            {'key': 'years', 'label': '使用年限', 'type': 'text', 'placeholder': '3年'},
        ],
        'entries': [],
    },
    {
        'id': 'certificate', 'name': '证书资质', 'icon': 'badge', 'desc': '证书、认证与资格', 'single': False,
        'fields': [
            {'key': 'name', 'label': '证书名称', 'type': 'text', 'placeholder': 'PMP 项目管理认证'},
            {'key': 'org', 'label': '颁发机构', 'type': 'text', 'placeholder': 'PMI'},
            {'key': 'date', 'label': '获得时间', 'type': 'text', 'placeholder': '2023.05'},
            {'key': 'note', 'label': '备注', 'type': 'text', 'placeholder': '可选'},
        ],
        'entries': [],
    },
    {
        'id': 'self', 'name': '自我评价', 'icon': 'quote', 'desc': '一段精炼的自我介绍', 'single': True,
        'fields': [
            {'key': 'content', 'label': '内容', 'type': 'textarea', 'placeholder': '用 2-4 句话概括你的优势与职业目标'},
        ],
        'entries': [],
    },
]

# 字段标签映射：section_id -> {field_key: 中文标签}
FIELD_LABELS = {s['id']: {f['key']: f['label'] for f in s['fields']} for s in DEFAULT_SECTIONS}