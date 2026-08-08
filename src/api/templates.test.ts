import { describe, expect, it } from 'vitest'
import { buildResumeData } from './merge'
import { DEFAULT_SECTIONS } from './presets'
import { renderResume, STYLE_NAMES } from './resumeTemplates'

describe('resumeTemplates', () => {
  it('5 种风格均可渲染，且包含姓名与目标岗位', () => {
    const sections = DEFAULT_SECTIONS.map((s) => ({
      ...s,
      entries: s.id === 'basic' ? [{ id: '1', name: '测试用户', phone: '13800138000' }] : [],
    }))
    const data = buildResumeData(sections, { targetJob: '前端开发工程师', jd: '', style: 'aurora' })
    const styles = Object.keys(STYLE_NAMES)
    expect(styles.length).toBe(5)
    for (const style of styles) {
      const html = renderResume(style, data)
      expect(html).toContain('<!doctype html>')
      expect(html).toContain('测试用户')
      expect(html).toContain('前端开发工程师')
    }
  })
})