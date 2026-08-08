import { describe, expect, it } from 'vitest'
import { groupResumes, similarity, tokenize } from './similarity'
import type { ResumeRecord } from './types'

function rec(id: string, targetJob: string, text: string): ResumeRecord {
  return { id, title: id, targetJob, style: 'aurora', styleName: '极光', html: '', text, createdAt: '' }
}

describe('similarity', () => {
  it('tokenize 保留 ASCII 词与中文 bigram', () => {
    const tokens = tokenize('Vue3 前端开发')
    expect(tokens).toContain('vue3')
    expect(tokens).toContain('前端')
    expect(tokens).toContain('端开')
  })

  it('相同文本相似度为 1', () => {
    expect(similarity('前端开发工程师', '前端开发工程师')).toBe(1)
  })

  it('3 份相似简历聚为一组，1 份不同简历独立成组', () => {
    const resumes = [
      rec('a', '前端开发工程师', '熟悉 Vue3 TypeScript 组件库 性能优化 前端工程化'),
      rec('b', '前端开发工程师', 'Vue3 React 组件化 性能优化 前端工程化'),
      rec('c', '前端工程师', '前端开发 Vue 组件 工程化 构建'),
      rec('d', '数据分析师', 'SQL 数据清洗 可视化 报表'),
    ]
    const groups = groupResumes(resumes)
    expect(groups.length).toBe(2)
    const sizes = groups.map((g) => g.resumes.length).sort((x, y) => y - x)
    expect(sizes).toEqual([3, 1])
  })
})