import { beforeEach, describe, expect, it } from 'vitest'
import { LocalStorageAdapter } from './LocalStorageAdapter'
import { genId } from './util'

describe('LocalStorageAdapter', () => {
  const api = new LocalStorageAdapter(0) // 关闭伪异步延迟，测试更快

  beforeEach(async () => {
    await api.clearAll()
  })

  it('首次读取自动播种 8 个内置信息库', async () => {
    const sections = await api.getSections()
    expect(sections.length).toBe(8)
  })

  it('信息库条目 增/改/删 闭环', async () => {
    const entry = { id: genId(), company: '测试公司', position: '工程师', content: '做了一些事', achievement: '', keywords: '' }
    await api.addEntry('work', entry)
    let reloaded = (await api.getSections()).find((s) => s.id === 'work')!
    expect(reloaded.entries).toHaveLength(1)

    await api.updateEntry('work', { ...entry, position: '高级工程师' })
    reloaded = (await api.getSections()).find((s) => s.id === 'work')!
    expect(String(reloaded.entries[0].position)).toBe('高级工程师')

    await api.deleteEntry('work', entry.id)
    reloaded = (await api.getSections()).find((s) => s.id === 'work')!
    expect(reloaded.entries).toHaveLength(0)
  })

  it('生成 → 保存 → 查询 → 删除 简历闭环', async () => {
    const { record } = await api.generateResume({ targetJob: '前端开发工程师', jd: 'Vue 性能优化', style: 'aurora' })
    expect(record.html).toContain('前端开发工程师')

    await api.saveResume(record)
    let resumes = await api.getResumes()
    expect(resumes.length).toBe(1)

    await api.deleteResume(record.id)
    resumes = await api.getResumes()
    expect(resumes.length).toBe(0)
  })

  it('导出 / 导入数据可还原', async () => {
    await api.addEntry('basic', { id: genId(), name: '李四', phone: '13900000000' })
    const json = await api.exportData()
    await api.clearAll()
    await api.importData(json)
    const sections = await api.getSections()
    const basic = sections.find((s) => s.id === 'basic')!
    expect(String(basic.entries[0]?.name)).toBe('李四')
  })

  it('设置保存与读取', async () => {
    await api.saveSettings({ llm: { baseUrl: 'https://api.deepseek.com', apiKey: 'sk-test', model: 'deepseek-chat' } })
    const settings = await api.getSettings()
    expect(settings.llm.apiKey).toBe('sk-test')
  })
})