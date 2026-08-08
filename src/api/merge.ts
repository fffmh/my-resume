import { str } from './util'
import { tokenize } from './similarity'
import type { GenerateInput, SectionData, SectionEntry } from './types'
import { renderResume } from './resumeTemplates'

export interface ResumeData {
  basic: Record<string, string>
  intention: Record<string, string>
  education: SectionEntry[]
  work: SectionEntry[]
  project: SectionEntry[]
  skills: SectionEntry[]
  certificate: SectionEntry[]
  self: string
  targetJob: string
}

const ACTION_VERBS = ['负责', '主导', '推动', '搭建', '优化', '设计', '实现', '参与', '统筹', '攻克', '重构', '落地']

/** 按 JD 关键词给条目打分（词袋重合度） */
export function scoreEntry(entry: SectionEntry, keywords: Set<string>): number {
  let score = 0
  for (const value of Object.values(entry)) {
    const text = str(value).toLowerCase()
    for (const token of tokenize(text)) {
      if (keywords.has(token)) score++
    }
  }
  return score
}

/** 从目标岗位与 JD 中提取关键词集合 */
export function buildKeywords(targetJob: string, jd: string): Set<string> {
  const keywords = new Set<string>()
  for (const token of tokenize(`${targetJob} ${jd}`)) {
    if (token.length >= 2) keywords.add(token)
  }
  return keywords
}

/** 轻量润色：时间格式统一、要点补动作动词、空行清理 */
export function polishBullets(value: unknown): string[] {
  return str(value)
    .split(/\r?\n/)
    .map((l) => l.replace(/^[-•·*]\s*/, '').trim())
    .filter(Boolean)
    .map((line, i) => {
      const startsWithVerb = ACTION_VERBS.some((v) => line.startsWith(v))
      return startsWithVerb ? line : `${ACTION_VERBS[i % ACTION_VERBS.length]}${line}`
    })
}

function entryToMap(entry: SectionEntry | undefined): Record<string, string> {
  if (!entry) return {}
  const map: Record<string, string> = {}
  for (const [k, v] of Object.entries(entry)) {
    if (k !== 'id') map[k] = str(v)
  }
  return map
}

/** 组装结构化简历数据：筛选排序 + 轻量润色 */
export function buildResumeData(sections: SectionData[], input: GenerateInput): ResumeData {
  const find = (id: string) => sections.find((s) => s.id === id)
  const keywords = buildKeywords(input.targetJob, input.jd)

  const rank = (id: string) => {
    const section = find(id)
    if (!section) return []
    return [...section.entries]
      .map((entry) => ({ entry, score: scoreEntry(entry, keywords) }))
      .sort((a, b) => b.score - a.score)
      .map((x) => x.entry)
  }

  const basic = entryToMap(find('basic')?.entries[0])
  const intention = entryToMap(find('intention')?.entries[0])
  const selfEntry = find('self')?.entries[0]
  const self = selfEntry ? str(selfEntry.content) : ''

  return {
    basic,
    intention,
    education: find('education')?.entries ?? [],
    work: rank('work'),
    project: rank('project'),
    skills: rank('skills'),
    certificate: find('certificate')?.entries ?? [],
    self,
    targetJob: input.targetJob,
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** 生成简历（模拟阶段：筛选 + 轻规则润色 + 模板渲染） */
export function buildResume(sections: SectionData[], input: GenerateInput): { html: string; text: string; title: string } {
  const data = buildResumeData(sections, input)
  const html = renderResume(input.style, data, buildKeywords(input.targetJob, input.jd))
  const text = stripHtml(html)
  const title = input.targetJob ? `${input.targetJob} · 简历` : '我的简历'
  return { html, text, title }
}