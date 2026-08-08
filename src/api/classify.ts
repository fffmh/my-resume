import type { SectionEntry } from './types'
import { genId } from './util'

/**
 * 半真解析：对抽取出的纯文本做关键词/正则分类，
 * 尽力把内容归入对应信息库（识别结果始终可人工编辑后确认）。
 */

const RE_EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/
const RE_PHONE = /(1[3-9]\d{9})|(0\d{2,3}\d{7,8})/
const RE_DEGREE = /(博士|硕士研究生|硕士|本科|大专|专科|高中|中专|初中)/
const RE_YEARS = /(\d+(?:\.\d+)?)\s*年/
const RE_DATE_RANGE = /(\d{4})\s*[年.\/-]\s*(\d{1,2})?\s*[-~至到]\s*(?:(\d{4})\s*[年.\/-]\s*(\d{1,2})?|(至今|现在|今))/

const TECH_KEYWORDS = [
  'python', 'java', 'javascript', 'typescript', 'vue', 'react', 'node', 'nodejs', 'go', 'golang',
  'c++', 'c#', 'rust', 'sql', 'mysql', 'postgresql', 'redis', 'mongodb', 'docker', 'kubernetes',
  'k8s', 'linux', 'git', 'html', 'css', 'nginx', 'flutter', 'android', 'ios', '小程序', '微信小程序',
  'echarts', 'webpack', 'vite', 'pinia', 'redux', '微服务', '大数据', '算法', '机器学习', '深度学习',
  'next.js', 'nuxt', 'tailwind', 'webpack5', 'babel', 'rollup', 'esbuild', 'sass', 'less', 'postcss',
  'd3', 'three.js', 'canvas', 'webgl', 'uniapp', 'taro', 'electron', 'react native', 'express', 'koa',
  'nestjs', 'spring', 'django', 'flask', 'fastapi', 'rabbitmq', 'kafka', 'elasticsearch', 'clickhouse',
  'hive', 'spark', 'flink', 'pandas', 'numpy', 'pytorch', 'tensorflow', 'langchain', 'gitlab', 'jenkins',
  'ci/cd', '云原生', 'serverless', '低代码', '可视化',
]

function makeEntry(partial: Record<string, unknown> = {}): SectionEntry {
  return { id: genId(), ...partial }
}

function splitTags(value: string): string {
  return value
    .split(/[,，、;；\s]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .join(', ')
}

function extractDateRange(line: string): [string, string] {
  const m = line.match(RE_DATE_RANGE)
  if (!m) return ['', '']
  const start = m[1] ? (m[2] ? `${m[1]}.${m[2].padStart(2, '0')}` : m[1]) : ''
  if (m[5]) return [start, '至今']
  const end = m[3] ? (m[4] ? `${m[3]}.${m[4].padStart(2, '0')}` : m[3]) : ''
  return [start, end]
}

function isSectionHeader(line: string): boolean {
  return /(教育经历|教育背景|学习经历|工作经历|工作履历|职业经历|从业经历|实习经历|项目经历|项目经验|项目实践|专业技能|技能特长|技能|技术栈|证书|认证|资格|自我评价|个人简介|自我介绍|关于我|求职意向|基本信息|个人总结)/.test(line)
}

export interface ClassifyResult {
  sections: Record<string, SectionEntry[]>
  warnings: string[]
}

export function classifyText(rawText: string): ClassifyResult {
  const text = rawText.replace(/\r/g, '')
  const sections: Record<string, SectionEntry[]> = {}
  const warnings: string[] = []

  const push = (sectionId: string, entry: SectionEntry) => {
    sections[sectionId] = sections[sectionId] || []
    sections[sectionId].push(entry)
  }

  const lines = text.split(/\n/).map((l) => l.trim())
  const email = text.match(RE_EMAIL)?.[0] || ''
  const phone = (text.replace(/[\s-]/g, '').match(RE_PHONE)?.[0] || '')
  const degree = text.match(RE_DEGREE)?.[0] || ''
  const yearsMatch = text.match(RE_YEARS)
  const cityMatch = text.match(/(?:现居|所在城市|城市|居住地)\s*[:：]?\s*([^\s，,。]+)/)
  const nameMatch = text.match(/(?:姓名|名字)\s*[:：]\s*([^\s，,。]+)/)
  const firstLine = lines.find((l) => /^[\u4e00-\u9fa5]{2,4}$/.test(l) && !isSectionHeader(l))

  // 基本信息
  const basic: Record<string, unknown> = {}
  if (nameMatch) basic.name = nameMatch[1]
  else if (firstLine) basic.name = firstLine
  if (phone) basic.phone = phone
  if (email) basic.email = email
  if (degree) basic.degree = degree
  if (yearsMatch) basic.years = `${yearsMatch[1]}年`
  if (cityMatch) basic.city = cityMatch[1]
  const birthMatch = text.match(/(?:出生日期|生日|出生)\s*[:：]?\s*(\d{4}[-/.年]\d{1,2}(?:[-/.日]\d{1,2})?)/)
  if (birthMatch) basic.birth = birthMatch[1]
  if (Object.keys(basic).length) push('basic', makeEntry(basic))

  // 求职意向
  const posMatch = text.match(/(?:求职意向|期望职位|意向职位|应聘|目标岗位)\s*[:：]?\s*([^\n，,。]+)/)
  const salaryMatch = text.match(/(?:期望薪资|薪资要求|薪酬)\s*[:：]?\s*([^\n，,。]+)/)
  const intention: Record<string, unknown> = {}
  if (posMatch) intention.position = posMatch[1].trim()
  if (salaryMatch) intention.salary = salaryMatch[1].trim()
  const intentCity = text.match(/(?:期望城市|意向城市|工作城市|目标城市)\s*[:：]?\s*([^\s，,。]+)/)
  if (intentCity) intention.city = intentCity[1]
  if (Object.keys(intention).length) push('intention', makeEntry(intention))

  // 教育经历 / 工作经历 / 项目经历 / 技能 / 证书 / 自我评价
  let currentSection: string | null = null
  let buffer: string[] = []

  const flush = () => {
    if (!currentSection || !buffer.length) return
    const block = buffer.join('\n')
    if (currentSection === 'education') {
      const school = block.match(/([\u4e00-\u9fa5A-Za-z0-9（）()]+(?:大学|学院|学校|中学))/)
      let major = block.match(/专业\s*[:：]?\s*([^\s，,。]+)/)?.[1] || ''
      if (!major && school) {
        const rest = block.replace(school[0], ' ').replace(RE_DATE_RANGE, ' ').trim()
        const m = rest.match(/^([\u4e00-\u9fa5A-Za-z0-9（）()]{2,12})/)
        if (m) major = m[1]
      }
      const [start, end] = extractDateRange(block)
      const d = degree || block.match(RE_DEGREE)?.[0] || ''
      push('education', makeEntry({ school: school?.[1] || '', degree: d, major, start, end, honor: '' }))
    } else if (currentSection === 'work') {
      const [start, end] = extractDateRange(block)
      const cleaned = block
        .replace(RE_DATE_RANGE, ' ')
        .split(/\s+/)
        .filter((t) => t && !/^\d/.test(t) && !/^[\d.年月至今现在\-~至到]+$/.test(t))
      let company = cleaned[0] || ''
      let position = cleaned[1] || ''
      const companyExact = block.match(/([\u4e00-\u9fa5A-Za-z（）()]+(?:公司|集团|科技|网络|有限|工作室|事务所))/)?.[1]
      if (companyExact) company = companyExact
      const posExact = block.match(/(?:担任|任职|职位|岗位|从事)\s*[:：]?\s*([^\s，,。]+)/)?.[1]
      if (posExact) position = posExact
      push('work', makeEntry({ company, position, start, end, content: block, achievement: '', keywords: '' }))
    } else if (currentSection === 'project') {
      const name = block.match(/项目\s*[:：]?\s*([^\n，,。]+)/)
      const role = block.match(/(?:角色|担任)\s*[:：]?\s*([^\s，,。]+)/)
      const tech = block.match(/(?:技术栈|技术)\s*[:：]?\s*([^\n]+)/)
      push('project', makeEntry({ name: name?.[1]?.trim() || '', role: role?.[1] || '', start: '', end: '', tech: tech ? splitTags(tech[1]) : '', desc: block, contribution: '' }))
    } else if (currentSection === 'certificate') {
      const name = block.split('\n')[0]
      push('certificate', makeEntry({ name, org: '', date: '', note: '' }))
    }
    buffer = []
  }

  for (const line of lines) {
    if (!line) {
      flush()
      currentSection = null
      continue
    }
    if (isSectionHeader(line)) {
      flush()
      if (/教育/.test(line)) currentSection = 'education'
      else if (/工作|实习/.test(line)) currentSection = 'work'
      else if (/项目/.test(line)) currentSection = 'project'
      else if (/证书|认证|资格/.test(line)) currentSection = 'certificate'
      else if (/自我评价|个人总结|自我介绍/.test(line)) currentSection = 'self'
      else currentSection = null
      continue
    }
    if (currentSection === 'self') {
      buffer.push(line)
      continue
    }
    if (currentSection) {
      buffer.push(line)
      continue
    }
    // 无章节头时，按行关键词兜底
    if (/(学校|大学|学院|专业|毕业|学士|硕士|博士)/.test(line)) {
      buffer.push(line); currentSection = 'education'
    } else if (/(公司|任职|就职|担任|工作内容|业绩)/.test(line)) {
      buffer.push(line); currentSection = 'work'
    } else if (/项目/.test(line)) {
      buffer.push(line); currentSection = 'project'
    } else if (/(证书|认证|资格|执照)/.test(line)) {
      buffer.push(line); currentSection = 'certificate'
    } else if (/(技能|掌握|熟练|精通|熟悉|擅长)/.test(line) || TECH_KEYWORDS.some((k) => line.toLowerCase().includes(k))) {
      buffer.push(line); currentSection = 'skills'
    }
  }
  flush()

  // 技能：合并所有技能行并去重
  const skillTexts = lines.filter(
    (l) => /(技能|掌握|熟练|精通|熟悉|擅长)/.test(l) || TECH_KEYWORDS.some((k) => l.toLowerCase().includes(k)),
  )
  const skillNames = new Set<string>()
  for (const line of skillTexts) {
    const cleaned = line.replace(/(技能|掌握|熟练|精通|熟悉|擅长)\s*[:：]?\s*/, '')
    for (const name of cleaned.split(/[,，、;；\s]+/)) {
      const n = name.trim()
      if (n && n.length <= 20) skillNames.add(n)
    }
  }
  if (skillNames.size) {
    const entries = Array.from(skillNames).map((name) => makeEntry({ name, level: '熟练', years: '' }))
    sections['skills'] = (sections['skills'] || []).concat(entries)
  }

  // 自我评价
  const selfLines: string[] = []
  let inSelf = false
  for (const line of lines) {
    if (/自我评价|个人总结|自我介绍/.test(line)) { inSelf = true; continue }
    if (inSelf && !line) break
    if (inSelf) selfLines.push(line)
  }
  const selfContent = selfLines.join('\n').trim()
  if (selfContent) push('self', makeEntry({ content: selfContent }))

  if (Object.keys(sections).length === 0) {
    warnings.push('未能从文件中识别出结构化信息，可先在下方预览中手动填写。')
  }
  return { sections, warnings }
}