# -*- coding: utf-8 -*-
from backend.classify import classify_text

SAMPLE = """
张三
13800138000
zhangsan@example.com
本科 上海

求职意向：前端开发工程师 期望薪资 25-35K

教育经历
2019.09 - 2023.06 复旦大学 计算机科学与技术 本科

工作经历
2021.07 - 至今 字节跳动 前端工程师
负责招聘平台的前端开发，使用 Vue3 TypeScript

项目经历
项目：简历生成器 角色：前端负责人 技术栈：Vue3, Vite
搭建简历编辑器，支持多模板渲染

技能
Vue3, TypeScript, Vite, 性能优化

自我评价
热爱前端，关注工程化与体验优化
"""

ENHANCED = """
林澈
138 0013 8000

教育背景
2021.7-至今 复旦大学 计算机科学与技术 硕士

专业技能
Vue3, TypeScript, Docker

期望城市：上海
"""


def test_basic_fields():
    sections, _ = classify_text(SAMPLE)
    basic = sections['basic'][0]
    assert basic['phone'] == '13800138000'
    assert basic['email'] == 'zhangsan@example.com'
    assert basic['name'] == '张三'


def test_intention():
    sections, _ = classify_text(SAMPLE)
    intention = sections['intention'][0]
    assert '前端开发工程师' in intention['position']


def test_education():
    sections, _ = classify_text(SAMPLE)
    edu = sections['education'][0]
    assert '复旦大学' in edu['school']
    assert '计算机' in edu['major']


def test_work():
    sections, _ = classify_text(SAMPLE)
    work = sections['work'][0]
    assert '字节跳动' in work['company']
    assert '前端工程师' in work['position']


def test_skills():
    sections, _ = classify_text(SAMPLE)
    names = [s['name'] for s in sections['skills']]
    assert 'Vue3' in names
    assert 'TypeScript' in names


def test_self():
    sections, _ = classify_text(SAMPLE)
    assert '热爱前端' in sections['self'][0]['content']


def test_enhanced_patterns():
    sections, _ = classify_text(ENHANCED)
    assert sections['basic'][0]['phone'] == '13800138000'
    assert sections['basic'][0]['name'] == '林澈'
    edu = sections['education'][0]
    assert '复旦大学' in edu['school']
    assert edu['start'].startswith('2021')
    assert edu['end'] == '至今'
    assert 'Docker' in [s['name'] for s in sections['skills']]
    assert sections['intention'][0]['city'] == '上海'