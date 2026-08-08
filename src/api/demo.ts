import type { SectionEntry } from './types'
import { genId } from './util'

function e(partial: Record<string, unknown>): SectionEntry {
  return { id: genId(), ...partial }
}

/** 一键体验：一份完整的前端工程师示例数据（8 个信息库全覆盖） */
export const DEMO_ENTRIES: Record<string, SectionEntry[]> = {
  basic: [e({
    name: '林澈', gender: '男', birth: '1998-05-12', phone: '13800138000',
    email: 'linche.dev@gmail.com', city: '上海', degree: '本科', years: '5年',
    homepage: 'https://github.com/linche',
  })],
  intention: [e({ position: '前端开发工程师', city: '上海', salary: '25-35K·14薪', type: '全职', join: '两周内到岗' })],
  education: [e({
    school: '复旦大学', degree: '本科', major: '计算机科学与技术',
    start: '2016.09', end: '2020.06', honor: '国家奖学金 · 校优秀毕业生',
  })],
  work: [
    e({
      company: '字节跳动', position: '前端工程师', start: '2022.07', end: '至今',
      content: '负责招聘平台核心链路的架构与开发，主导组件库与工程化建设\n搭建基于 Vue3 + TypeScript 的统一组件库，覆盖 40+ 业务页面\n推动微前端改造，应用启动耗时降低 38%',
      achievement: '核心页面首屏从 3.2s 优化至 1.1s（-66%）；组件复用率提升至 72%',
      keywords: 'Vue3, TypeScript, 微前端, 性能优化',
    }),
    e({
      company: '美团', position: '前端开发工程师', start: '2020.07', end: '2022.06',
      content: '负责商家端数据看板与可视化\n基于 ECharts 搭建可视化图表体系，覆盖 20+ 业务报表\n抽象通用请求层与权限指令，开发效率提升 30%',
      achievement: '报表渲染耗时降低 45%；接入商家 5000+',
      keywords: 'ECharts, 可视化, 工程化',
    }),
  ],
  project: [
    e({
      name: '简历生成引擎', role: '前端负责人', start: '2023.03', end: '2023.08',
      tech: 'Vue3, Pinia, Vite, 无头浏览器',
      desc: '面向求职者的多模板简历生成平台，支持信息库复用与岗位匹配筛选',
      contribution: '设计数据层适配器与模板渲染管线；接入关键词匹配与规则润色，简历生成耗时 < 1s',
    }),
    e({
      name: '实时数据中台', role: '核心开发', start: '2021.09', end: '2022.03',
      tech: 'Vue2, WebSocket, ECharts',
      desc: '商家经营数据实时看板，日均 10 万级查询',
      contribution: '负责实时链路与增量渲染优化，页面卡顿率下降 60%',
    }),
  ],
  skills: [
    e({ name: 'Vue 3 / Vue 2', level: '精通', years: '5年' }),
    e({ name: 'TypeScript', level: '精通', years: '4年' }),
    e({ name: '性能优化', level: '精通', years: '4年' }),
    e({ name: '微前端 / 工程化', level: '熟练', years: '3年' }),
    e({ name: 'Node.js', level: '熟练', years: '3年' }),
    e({ name: 'React', level: '熟练', years: '2年' }),
  ],
  certificate: [
    e({ name: 'PMP 项目管理认证', org: 'PMI', date: '2023.05', note: '' }),
    e({ name: 'CET-6 英语六级', org: '教育部', date: '2018.12', note: '' }),
  ],
  self: [e({
    content: '5 年前端开发经验，专注工程化与性能优化。热爱把复杂问题拆解成清晰方案，习惯用数据衡量结果；注重代码质量与团队协作，追求可持续的高质量交付。',
  })],
}