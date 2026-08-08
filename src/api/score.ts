import { tokenize } from './similarity'
import { str } from './util'
import type { SectionData } from './types'

export interface ScoreDimension {
  key: string
  name: string
  score: number
  max: number
  tip: string
}

export interface ResumeScore {
  total: number
  dimensions: ScoreDimension[]
  suggestions: string[]
}

function find(sections: SectionData[], id: string): SectionData | undefined {
  return sections.find((s) => s.id === id)
}

function entry(sections: SectionData[], id: string): Record<string, unknown> | undefined {
  return find(sections, id)?.entries?.[0]
}

function list(sections: SectionData[], id: string): Record<string, unknown>[] {
  return find(sections, id)?.entries ?? []
}

const VERBS = ['负责', '主导', '推动', '搭建', '优化', '设计', '实现', '参与', '统筹', '攻克', '重构', '落地', '构建', '维护', '提升', '降低', '支持']

/** 岗位匹配评分：信息完整度 / 岗位匹配 / 量化成果 / 语言质量，各 25 分合成 0-100 */
export function scoreResume(sections: SectionData[], targetJob: string, jd: string): ResumeScore {
  const suggestions: string[] = []

  // 1. 信息完整度（25）
  const basic = entry(sections, 'basic') ?? {}
  const intention = entry(sections, 'intention') ?? {}
  const workList = list(sections, 'work')
  const eduList = list(sections, 'education')
  const skillList = list(sections, 'skills')
  const selfText = str(entry(sections, 'self')?.content).trim()
  const checks: Array<[boolean, string]> = [
    [Boolean(str(basic.name)), '补充姓名'],
    [Boolean(str(basic.phone)), '补充联系电话'],
    [Boolean(str(basic.email)), '补充邮箱'],
    [Boolean(str(basic.city)), '补充现居城市'],
    [Boolean(str(intention.position)), '补充期望职位'],
    [Boolean(str(intention.salary)), '补充期望薪资'],
    [workList.length > 0, '补充至少一段工作经历'],
    [eduList.length > 0, '补充教育经历'],
    [skillList.length >= 3, '技能建议至少 3 项'],
    [Boolean(selfText), '补充自我评价'],
  ]
  let completeScore = 0
  for (const [ok, tip] of checks) {
    if (ok) completeScore += 2.5
    else suggestions.push(tip)
  }

  // 2. 岗位匹配（25）
  const keywords = new Set<string>()
  for (const t of tokenize(`${targetJob} ${jd}`)) {
    if (t.length >= 2) keywords.add(t)
  }
  const matchText = [...workList, ...skillList, ...list(sections, 'project')]
    .map((x) => Object.values(x).map(str).join(' '))
    .join(' ')
  const matchTokens = tokenize(matchText)
  const hitCount = Array.from(keywords).filter((kw) => matchTokens.includes(kw)).length
  const ratio = keywords.size ? hitCount / keywords.size : 0
  const matchScore = keywords.size ? Math.min(25, ratio * 25 * 1.6) : 12.5
  if (keywords.size && ratio < 0.3) {
    suggestions.push(`补充与目标岗位相关的关键词：${Array.from(keywords).slice(0, 6).join('、')}`)
  }

  // 3. 量化成果（25）
  const quantText = [...workList, ...list(sections, 'project')]
    .map((x) => `${str(x.achievement)} ${str(x.contribution)}`)
    .join(' ')
  const numMatches = (quantText.match(/\d+(?:\.\d+)?\s*[%％倍个项人天msMBGB]?/g) || []).length
  const quantScore = Math.min(25, numMatches * 5)
  if (numMatches < 3) suggestions.push('在业绩/贡献中增加量化成果，如「性能提升 40%」「覆盖 5000+ 用户」')

  // 4. 语言质量（25）
  const contentText = [...workList, ...list(sections, 'project')]
    .map((x) => `${str(x.content)}\n${str(x.contribution)}`)
    .join('\n')
  let bulletCount = 0
  let verbCount = 0
  for (const line of contentText.split(/\r?\n/)) {
    const l = line.trim()
    if (!l) continue
    bulletCount++
    if (VERBS.some((v) => l.startsWith(v))) verbCount++
  }
  let langScore = 0
  if (bulletCount >= 5) langScore += 12
  else {
    langScore += bulletCount * 2.4
    if (bulletCount < 5) suggestions.push('工作/项目描述建议拆分为 5 条以上要点，便于阅读')
  }
  langScore += Math.min(13, verbCount * 1.3)
  if (bulletCount > 0 && verbCount < bulletCount * 0.4) {
    suggestions.push('要点开头建议使用动作动词（负责/主导/搭建/优化…）')
  }

  return {
    total: Math.max(0, Math.min(100, Math.round(completeScore + matchScore + quantScore + langScore))),
    dimensions: [
      { key: 'complete', name: '信息完整度', score: Math.round(completeScore), max: 25, tip: '核心字段是否齐备' },
      { key: 'match', name: '岗位匹配', score: Math.round(matchScore), max: 25, tip: '与目标岗位 / JD 关键词重合度' },
      { key: 'quant', name: '量化成果', score: Math.round(quantScore), max: 25, tip: '业绩是否用数字说话' },
      { key: 'lang', name: '语言质量', score: Math.round(langScore), max: 25, tip: '要点化与动作动词使用' },
    ],
    suggestions: Array.from(new Set(suggestions)).slice(0, 6),
  }
}