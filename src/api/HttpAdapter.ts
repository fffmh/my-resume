import type {
  AppSettings,
  GenerateInput,
  GenerateResult,
  IResumeAPI,
  ImportPreview,
  ResumeRecord,
  SectionData,
  SectionEntry,
  TemplateInfo,
} from './types'

/**
 * 第二阶段适配器（就绪桩）：指向 FastAPI 后端 /api/*。
 * 后端上线后，只需在 adapter.ts 把实现切换为 new HttpAdapter()。
 */
export class HttpAdapter implements IResumeAPI {
  private base = ''

  private async req<T>(method: string, url: string, body?: unknown): Promise<T> {
    const res = await fetch(this.base + url, {
      method,
      headers: body instanceof FormData ? undefined : { 'Content-Type': 'application/json' },
      body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
    })
    if (!res.ok) throw new Error(`API ${method} ${url} -> ${res.status}`)
    return (await res.json()) as T
  }

  getSections(): Promise<SectionData[]> {
    return this.req('GET', '/api/info/sections')
  }

  saveSection(section: SectionData): Promise<void> {
    return this.req('PUT', `/api/info/${section.id}`, section)
  }

  addEntry(sectionId: string, entry: SectionEntry): Promise<void> {
    return this.req('POST', `/api/info/${sectionId}/entries`, entry)
  }

  updateEntry(sectionId: string, entry: SectionEntry): Promise<void> {
    return this.req('PUT', `/api/info/${sectionId}/entries/${entry.id}`, entry)
  }

  deleteEntry(sectionId: string, entryId: string): Promise<void> {
    return this.req('DELETE', `/api/info/${sectionId}/entries/${entryId}`)
  }

  async importFile(file: File): Promise<ImportPreview> {
    const form = new FormData()
    form.append('file', file)
    return this.req('POST', '/api/import', form)
  }

  confirmImport(preview: ImportPreview): Promise<void> {
    return this.req('POST', '/api/import/confirm', preview)
  }

  uploadTemplate(file: File): Promise<TemplateInfo> {
    const form = new FormData()
    form.append('file', file)
    return this.req('POST', '/api/templates', form)
  }

  getTemplates(): Promise<TemplateInfo[]> {
    return this.req('GET', '/api/templates')
  }

  deleteTemplate(id: string): Promise<void> {
    return this.req('DELETE', `/api/templates/${id}`)
  }

  generateResume(input: GenerateInput): Promise<GenerateResult> {
    return this.req('POST', '/api/generate', input)
  }

  saveResume(record: ResumeRecord): Promise<void> {
    return this.req('POST', '/api/resumes', record)
  }

  getResumes(): Promise<ResumeRecord[]> {
    return this.req('GET', '/api/resumes')
  }

  deleteResume(id: string): Promise<void> {
    return this.req('DELETE', `/api/resumes/${id}`)
  }

  getSettings(): Promise<AppSettings> {
    return this.req('GET', '/api/settings')
  }

  saveSettings(settings: AppSettings): Promise<void> {
    return this.req('PUT', '/api/settings', settings)
  }

  async exportData(): Promise<string> {
    const data = await this.req<unknown>('GET', '/api/data/export')
    return JSON.stringify(data)
  }

  importData(json: string): Promise<void> {
    return this.req('POST', '/api/data/import', JSON.parse(json))
  }

  seedDemo(): Promise<void> {
    return this.req('POST', '/api/demo')
  }

  clearAll(): Promise<void> {
    return this.req('DELETE', '/api/data')
  }
}