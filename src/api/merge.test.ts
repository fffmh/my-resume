import { describe, expect, it } from 'vitest'
import { buildResume, buildResumeData } from './merge'
import { DEFAULT_SECTIONS } from './presets'
import type { GenerateInput } from './types'
import { genId } from './util'

function sectionWithEntries(id: string, entries: Record<string, unknown>[]) {
  return { ...DEFAULT_SECTIONS.find((s) => s.id === id)!, entries: entries.map((e) => ({ id: genId(), ...e })) }
}

describe('merge / buildResumeData', () => {
  const sections = [
    sectionWithEntries('basic', [{ name: '张三', phone: '13800138000', email: 'z@x.com' }]),
    sectionWithEntries('intention', [{ position: '前端开发工程师', salary: '25-35K', city: '上海' }]),
    sectionWithEntries('work', [
      { company: 'A 公司', position: '前端工程师', content: 'Vue3 组件库 性能优化 工程化', achievement: '首屏 3s → 1.2s' },
      { company: 'B 公司', position: '后端工程师', content: 'Java Spring 微服务', achievement: '' },
    ]),
    sectionWithEntries('skills', [
      { name: 'Vue3', level: '精通' },
      { name: 'Java', level: '熟练' },
    ]),
  ]

  const input: GenerateInput = { targetJob: '前端开发工程师', jd: '精通 Vue 组件化，重视性能优化与前端工程化', style: 'aurora' }

  it('按 JD 关键词对工作经历排序，匹配者在前', () => {
    const data = buildResumeData(sections, input)
    expect(data.work.length).toBe(2)
    expect(String(data.work[0].company)).toContain('A 公司')
  })

  it('生成 HTML 包含目标岗位与姓名，且包含可提取文本', () => {
    const { html, text, title } = buildResume(sections, input)
    expect(title).toContain('前端开发工程师')
    expect(html).toContain('张三')
    expect(text.length).toBeGreaterThan(20)
  })

  it('关键词高亮标记存在', () => {
    const { html } = buildResume(sections, input)
    expect(html).toContain('<mark>')
  })
})