import { classifyText } from './classify'
import { DEMO_ENTRIES } from './demo'
import { buildResume } from './merge'
import { DEFAULT_PLACEHOLDERS, DEFAULT_SECTIONS } from './presets'
import { STYLE_NAMES } from './resumeTemplates'
import { scoreResume } from './score'
import { clearStore, deleteValue, getAll, getOne, putValue, STORES } from './storage'
import { genId } from './util'
import type {
  AppSettings,
  GenerateInput,
  GenerateResult,
  IResumeAPI,
  ImportPreview,
  ResumeGroup,
  ResumeRecord,
  SectionData,
  SectionEntry,
  TemplateInfo,
} from './types'

/** 伪异步延迟：模拟真实后端的网络等待，倒逼前端写好 Loading 态 */
export const SIMULATED_LATENCY_MS = 600

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export const DEFAULT_SETTINGS: AppSettings = {
  llm: { baseUrl: 'https://api.deepseek.com', apiKey: '', model: 'deepseek-chat' },
}

/**
 * 第一阶段适配器：数据落在浏览器 IndexedDB（容量大、异步签名与未来 fetch 一致），
 * 并内置伪异步延迟。第二阶段切换 HttpAdapter 即可，接口签名完全一致。
 */
export class LocalStorageAdapter implements IResumeAPI {
  private latencyMs: number

  constructor(latencyMs: number = SIMULATED_LATENCY_MS) {
    this.latencyMs = latencyMs
  }

  private async wait(): Promise<void> {
    if (this.latencyMs > 0) await delay(this.latencyMs)
  }

  private async ensureSeeded(): Promise<void> {
    const all = await getAll<SectionData>('sections')
    if (!all.length) {
      for (const section of DEFAULT_SECTIONS) await putValue('sections', section)
    }
  }

  async getSections(): Promise<SectionData[]> {
    await this.wait()
    await this.ensureSeeded()
    return getAll<SectionData>('sections')
  }

  async saveSection(section: SectionData): Promise<void> {
    await this.wait()
    await putValue('sections', section)
  }

  private async mutateEntry(
    sectionId: string,
    entry: SectionEntry,
    mode: 'add' | 'update' | 'delete',
  ): Promise<void> {
    await this.wait()
    await this.ensureSeeded()
    const sections = await getAll<SectionData>('sections')
    const section = sections.find((s) => s.id === sectionId)
    if (!section) return
    if (mode === 'delete') {
      section.entries = section.entries.filter((e) => e.id !== entry.id)
    } else if (mode === 'add') {
      if (section.single) section.entries = [entry]
      else section.entries.push(entry)
    } else {
      const index = section.entries.findIndex((e) => e.id === entry.id)
      if (index >= 0) section.entries[index] = entry
      else if (section.single) section.entries = [entry]
      else section.entries.push(entry)
    }
    await putValue('sections', section)
  }

  addEntry(sectionId: string, entry: SectionEntry): Promise<void> {
    return this.mutateEntry(sectionId, entry, 'add')
  }

  updateEntry(sectionId: string, entry: SectionEntry): Promise<void> {
    return this.mutateEntry(sectionId, entry, 'update')
  }

  deleteEntry(sectionId: string, entryId: string): Promise<void> {
    return this.mutateEntry(sectionId, { id: entryId } as SectionEntry, 'delete')
  }

  async importFile(file: File): Promise<ImportPreview> {
    await this.wait()
    const { extractText } = await import('./extract')
    const result = await extractText(file)
    if (result.error) {
      return { fileName: file.name, sections: {}, warnings: [result.error], confidence: {} }
    }
    const sections = await getAll<SectionData>('sections')
    const classified = classifyText(result.text)
    const confidence: ImportPreview['confidence'] = {}
    for (const [sid, entries] of Object.entries(classified.sections)) {
      const def = sections.find((s) => s.id === sid)
      const keys = (def?.fields ?? []).map((f) => f.key)
      confidence[sid] = entries.map((e) => {
        const filled = keys.filter((k) => String(e[k] ?? '').trim()).length
        const ratio = keys.length ? filled / keys.length : 0
        return { level: ratio >= 0.6 ? '高' : ratio >= 0.3 ? '中' : '低', reason: '' }
      })
    }
    return { fileName: file.name, sections: classified.sections, warnings: classified.warnings, confidence }
  }

  async confirmImport(preview: ImportPreview): Promise<void> {
    await this.wait()
    await this.ensureSeeded()
    const sections = await getAll<SectionData>('sections')
    for (const [sectionId, entries] of Object.entries(preview.sections)) {
      const section = sections.find((s) => s.id === sectionId)
      if (!section || !entries.length) continue
      if (section.single) {
        section.entries = [entries[entries.length - 1]]
      } else {
        for (const entry of entries) {
          const dup = section.entries.some((e) => JSON.stringify(e) === JSON.stringify(entry))
          if (!dup) section.entries.push(entry)
        }
      }
      await putValue('sections', section)
    }
  }

  async uploadTemplate(file: File): Promise<TemplateInfo> {
    await this.wait()
    const { extractText } = await import('./extract')
    const extracted = await extractText(file)
    const raw = extracted.text
    const placeholders = Array.from(
      new Set((raw.match(/\{\{([^{}]+)\}\}/g) || []).map((p) => p.replace(/[{}]/g, '').trim())),
    )
    const info: TemplateInfo = {
      id: genId(),
      name: file.name.replace(/\.[^.]+$/, '') || file.name,
      fileName: file.name,
      size: file.size,
      placeholders: placeholders.length ? placeholders : DEFAULT_PLACEHOLDERS,
      uploadedAt: new Date().toISOString(),
      blob: file,
    }
    await putValue('templates', info)
    return info
  }

  async getTemplates(): Promise<TemplateInfo[]> {
    await this.wait()
    return getAll<TemplateInfo>('templates')
  }

  deleteTemplate(id: string): Promise<void> {
    return this.wait().then(() => deleteValue('templates', id))
  }

  fillTemplate(_templateId: string, _data: Record<string, unknown>): Promise<Blob> {
    return Promise.reject(new Error('真实模板填写需在「后端模式」下使用（运行 start-backend.bat 后访问 http://localhost:8000）'))
  }

  async generateResume(input: GenerateInput): Promise<GenerateResult> {
    await this.wait()
    const sections = await getAll<SectionData>('sections')
    const { html, text, title } = buildResume(sections, input)
    const scoreInfo = scoreResume(sections, input.targetJob, input.jd)
    const record: ResumeRecord = {
      id: genId(),
      title,
      targetJob: input.targetJob,
      style: input.style,
      styleName: STYLE_NAMES[input.style] ?? input.style,
      html,
      text,
      createdAt: new Date().toISOString(),
      score: scoreInfo.total,
      suggestions: scoreInfo.suggestions,
    }
    return { record }
  }

  saveResume(record: ResumeRecord): Promise<void> {
    return this.wait().then(() => putValue('resumes', record))
  }

  async getResumes(): Promise<ResumeRecord[]> {
    await this.wait()
    return getAll<ResumeRecord>('resumes')
  }

  deleteResume(id: string): Promise<void> {
    return this.wait().then(() => deleteValue('resumes', id))
  }

  async searchResumes(query: string): Promise<ResumeRecord[]> {
    await this.wait()
    const resumes = await getAll<ResumeRecord>('resumes')
    const q = query.trim().toLowerCase()
    if (!q) return resumes
    const { similarity } = await import('./similarity')
    return resumes
      .map((r) => {
        const hay = [r.title, r.targetJob, r.styleName, r.text].join(' ').toLowerCase()
        const lex = hay.includes(q) ? 0.8 : 0
        const sim = similarity(r.text, query)
        return { r, score: lex + sim }
      })
      .filter((x) => x.score > 0.01)
      .sort((a, b) => b.score - a.score)
      .map((x) => x.r)
  }

  async getResumeGroups(resumes: ResumeRecord[]): Promise<ResumeGroup[]> {
    await this.wait()
    const { groupResumes } = await import('./similarity')
    return groupResumes(resumes)
  }

  async getSettings(): Promise<AppSettings> {
    await this.wait()
    const settings = await getOne<AppSettings>('settings', 'main')
    return settings ?? DEFAULT_SETTINGS
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    await this.wait()
    await putValue('settings', { id: 'main', ...settings })
  }

  async seedDemo(): Promise<void> {
    await this.wait()
    await this.ensureSeeded()
    const sections = await getAll<SectionData>('sections')
    let filled = 0
    for (const [sectionId, entries] of Object.entries(DEMO_ENTRIES)) {
      const section = sections.find((s) => s.id === sectionId)
      if (!section || !entries.length) continue
      if (section.single) {
        if (!section.entries.length) {
          section.entries = [{ ...entries[0] }]
          filled++
        }
      } else if (!section.entries.length) {
        section.entries = entries.map((x) => ({ ...x }))
        filled++
      }
      await putValue('sections', section)
    }
    void filled
  }

  async exportData(): Promise<string> {
    await this.wait()
    const [sections, templates, resumes, settings] = await Promise.all([
      getAll('sections'),
      getAll('templates'),
      getAll('resumes'),
      getOne<AppSettings>('settings', 'main'),
    ])
    const payload = { version: 1, exportedAt: new Date().toISOString(), sections, templates, resumes, settings }
    return JSON.stringify(payload, null, 2)
  }

  async importData(json: string): Promise<void> {
    await this.wait()
    const payload = JSON.parse(json) as {
      sections?: SectionData[]
      templates?: TemplateInfo[]
      resumes?: ResumeRecord[]
      settings?: AppSettings
    }
    if (payload.sections) for (const s of payload.sections) await putValue('sections', s)
    if (payload.templates) for (const t of payload.templates) await putValue('templates', t)
    if (payload.resumes) for (const r of payload.resumes) await putValue('resumes', r)
    if (payload.settings) await putValue('settings', { id: 'main', ...payload.settings })
  }

  async clearAll(): Promise<void> {
    await this.wait()
    for (const store of STORES) await clearStore(store)
  }
}