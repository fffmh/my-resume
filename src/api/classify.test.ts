import { describe, expect, it } from 'vitest'
import { classifyText } from './classify'

const SAMPLE = `
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
`

describe('classifyText', () => {
  it('识别联系方式与基本信息', () => {
    const { sections } = classifyText(SAMPLE)
    const basic = sections.basic?.[0] ?? {}
    expect(basic.phone).toBe('13800138000')
    expect(basic.email).toBe('zhangsan@example.com')
    expect(basic.name).toBe('张三')
  })

  it('识别求职意向', () => {
    const { sections } = classifyText(SAMPLE)
    const intention = sections.intention?.[0] ?? {}
    expect(String(intention.position)).toContain('前端开发工程师')
  })

  it('识别教育经历中的学校与专业', () => {
    const { sections } = classifyText(SAMPLE)
    const edu = sections.education?.[0] ?? {}
    expect(String(edu.school)).toContain('复旦大学')
    expect(String(edu.major)).toContain('计算机')
  })

  it('识别工作经历中的公司与职位', () => {
    const { sections } = classifyText(SAMPLE)
    const work = sections.work?.[0] ?? {}
    expect(String(work.company)).toContain('字节跳动')
    expect(String(work.position)).toContain('前端工程师')
  })

  it('识别技能清单', () => {
    const { sections } = classifyText(SAMPLE)
    const skills = sections.skills ?? []
    const names = skills.map((s) => String(s.name))
    expect(names).toContain('Vue3')
    expect(names).toContain('TypeScript')
  })

  it('识别自我评价', () => {
    const { sections } = classifyText(SAMPLE)
    const self = sections.self?.[0] ?? {}
    expect(String(self.content)).toContain('热爱前端')
  })
})