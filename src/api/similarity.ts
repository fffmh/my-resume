import type { ResumeGroup, ResumeRecord } from './types'

/** 分词：ASCII 词 + 中文单字与 bigram */
export function tokenize(text: string): string[] {
  const norm = text.toLowerCase()
  const tokens: string[] = []
  for (const m of norm.matchAll(/[a-z0-9][a-z0-9._+#-]*/g)) tokens.push(m[0])
  const cjk = norm.replace(/[^\u4e00-\u9fa5]/g, '')
  for (let i = 0; i < cjk.length; i++) {
    tokens.push(cjk[i])
    if (i + 1 < cjk.length) tokens.push(cjk.slice(i, i + 2))
  }
  return tokens
}

/** Jaccard 相似度 */
export function jaccard(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0
  const sa = new Set(a)
  const sb = new Set(b)
  let inter = 0
  for (const x of sa) if (sb.has(x)) inter++
  const union = sa.size + sb.size - inter
  return union === 0 ? 0 : inter / union
}

export function similarity(a: string, b: string): number {
  return jaccard(tokenize(a), tokenize(b))
}

/**
 * 相近简历分组：先按目标岗位相似度聚类，内容相似度作为补充依据。
 * 纯函数，供 Web Worker 调用，避免阻塞主线程。
 */
export function groupResumes(resumes: ResumeRecord[], jobThreshold = 0.4, textThreshold = 0.55): ResumeGroup[] {
  const used = new Set<string>()
  const groups: ResumeGroup[] = []
  for (const resume of resumes) {
    if (used.has(resume.id)) continue
    const members = [resume]
    used.add(resume.id)
    for (const other of resumes) {
      if (used.has(other.id)) continue
      const jobSim = similarity(resume.targetJob, other.targetJob)
      const textSim = similarity(resume.text, other.text)
      if (jobSim >= jobThreshold || (jobSim > 0 && textSim >= textThreshold)) {
        members.push(other)
        used.add(other.id)
      }
    }
    groups.push({ key: resume.targetJob || '未分类', resumes: members })
  }
  return groups.sort((a, b) => b.resumes.length - a.resumes.length)
}