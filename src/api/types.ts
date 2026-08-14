/** 字段类型 */
export type FieldType = 'text' | 'textarea' | 'date' | 'select' | 'tags'

export interface FieldDef {
  key: string
  label: string
  type: FieldType
  options?: string[]
  placeholder?: string
}

/** 信息库中的一条记录 */
export interface SectionEntry {
  id: string
  [field: string]: unknown
}

/** 一个信息库（含字段定义与条目） */
export interface SectionData {
  id: string
  name: string
  icon: string
  desc: string
  single: boolean
  fields: FieldDef[]
  entries: SectionEntry[]
}

/** 导入解析结果（半真解析：真实抽文本 + 关键词分类） */
export interface ImportPreview {
  fileName: string
  sections: Record<string, SectionEntry[]>
  warnings: string[]
  /** 每条识别结果的置信度（与 sections 一一对应，后端/LLM 提供） */
  confidence?: Record<string, Array<{ level: string; reason?: string }>>
}

export interface TemplateInfo {
  id: string
  name: string
  fileName: string
  size: number
  placeholders: string[]
  uploadedAt: string
  blob?: Blob
}

export interface ResumeRecord {
  id: string
  title: string
  targetJob: string
  style: string
  styleName: string
  html: string
  text: string
  createdAt: string
  score?: number
  suggestions?: string[]
  data?: Record<string, unknown>
}

export interface ResumeGroup {
  key: string
  resumes: ResumeRecord[]
}

export interface LlmSettings {
  baseUrl: string
  apiKey: string
  model: string
}

export interface AppSettings {
  llm: LlmSettings
}

export interface GenerateInput {
  targetJob: string
  jd: string
  style: string
}

export interface GenerateResult {
  record: ResumeRecord
}

/**
 * 统一数据访问接口（适配器模式）。
 * 第一阶段 LocalStorageAdapter 落在浏览器 IndexedDB；
 * 第二阶段仅需在 adapter.ts 切换为 HttpAdapter（指向 FastAPI /api/*），组件零改动。
 */
export interface IResumeAPI {
  getSections(): Promise<SectionData[]>
  saveSection(section: SectionData): Promise<void>
  addEntry(sectionId: string, entry: SectionEntry): Promise<void>
  updateEntry(sectionId: string, entry: SectionEntry): Promise<void>
  deleteEntry(sectionId: string, entryId: string): Promise<void>

  importFile(file: File): Promise<ImportPreview>
  confirmImport(preview: ImportPreview): Promise<void>

  uploadTemplate(file: File): Promise<TemplateInfo>
  getTemplates(): Promise<TemplateInfo[]>
  deleteTemplate(id: string): Promise<void>

  /** 用已上传模板生成 Word/PDF 文件（后端模式） */
  fillTemplate(templateId: string, data: Record<string, unknown>): Promise<Blob>

  generateResume(input: GenerateInput): Promise<GenerateResult>
  saveResume(record: ResumeRecord): Promise<void>
  getResumes(): Promise<ResumeRecord[]>
  deleteResume(id: string): Promise<void>

  /** 语义检索简历（后端模式为向量检索，本地模式为关键词+相似度兜底） */
  searchResumes(query: string): Promise<ResumeRecord[]>

  /** 简历分组（后端模式为向量语义分组，本地模式为 Jaccard 兜底） */
  getResumeGroups(resumes: ResumeRecord[]): Promise<ResumeGroup[]>

  getSettings(): Promise<AppSettings>
  saveSettings(settings: AppSettings): Promise<void>

  /** 导出全部数据为 JSON 字符串（便于跨设备迁移演示数据） */
  exportData(): Promise<string>
  /** 从 JSON 字符串恢复全部数据 */
  importData(json: string): Promise<void>

  /** 一键填充示例数据（仅填充空信息库，不清用户数据） */
  seedDemo(): Promise<void>
  /** 清空本地全部数据 */
  clearAll(): Promise<void>
}