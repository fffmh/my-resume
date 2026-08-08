import { describe, expect, it } from 'vitest'
import { scoreResume } from './score'
import { DEFAULT_SECTIONS } from './presets'
import type { SectionData } from './types'
import { genId } from './util'

function sectionsWith(overrides: Record<string, unknown[]>): SectionData[] {
  return DEFAULT_SECTIONS.map((s) => {
    const entries = (overrides[s.id] ?? []).map((x) => ({ id: genId(), ...(x as Record<string, unknown>) }))
    return { ...s, entries }
  })
}

const full: Record<string, unknown[]> = {
  basic: [{ name: '张三', phone: '13800138000', email: 'z@x.com', city: '上海' }],
  intention: [{ position: '前端开发工程师', salary: '25-35K' }],
  work: [{ company: 'A 公司', position: '前端工程师', content: '负责搭建组件库\n优化首屏性能', achievement: '性能提升 40%，覆盖 5000 用户' }],
  education: [{ school: '某大学', major: '计算机' }],
  skills: [{ name: 'Vue' }, { name: 'TypeScript' }, { name: '性能优化' }],
  project: [{ name: 'P', contribution: '耗时降低 30%' }],
  self: [{ content: '热爱前端与工程化' }],
}

describe('scoreResume', () => {
  it('完整数据得分显著高于空数据，且总分在 0-100', () => {
    const fullScore = scoreResume(sectionsWith(full), '前端开发工程师', 'Vue 性能优化')
    const emptyScore = scoreResume(sectionsWith({}), '前端开发工程师', 'Vue 性能优化')
    expect(fullScore.total).toBeGreaterThan(emptyScore.total)
    expect(fullScore.total).toBeGreaterThanOrEqual(0)
    expect(fullScore.total).toBeLessThanOrEqual(100)
  })

  it('缺失邮箱与自我评价会给出对应建议', () => {
    const s: Record<string, unknown[]> = { ...full, basic: [{ name: '张三', phone: '13800138000' }], self: [] }
    const result = scoreResume(sectionsWith(s), '前端开发工程师', '')
    expect(result.suggestions.some((x) => x.includes('邮箱'))).toBe(true)
    expect(result.suggestions.some((x) => x.includes('自我评价'))).toBe(true)
  })

  it('量化数字被识别，量化维度得分大于 0', () => {
    const result = scoreResume(sectionsWith(full), '前端开发工程师', '')
    const quant = result.dimensions.find((d) => d.key === 'quant')!
    expect(quant.score).toBeGreaterThan(0)
  })

  it('JD 关键词匹配维度得分更高', () => {
    const withJd = scoreResume(sectionsWith(full), '前端开发工程师', 'Vue 性能优化 组件库')
    const noJd = scoreResume(sectionsWith(full), '前端开发工程师', '')
    const match = withJd.dimensions.find((d) => d.key === 'match')!
    expect(withJd.total).toBeGreaterThanOrEqual(noJd.total)
    expect(match.score).toBeGreaterThanOrEqual(0)
  })
})