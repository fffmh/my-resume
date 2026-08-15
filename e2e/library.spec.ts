import { expect, test, request as playwrightRequest } from '@playwright/test'

const BASE = 'http://127.0.0.1:8010'

test.beforeAll(async () => {
  const api = await playwrightRequest.newContext({ baseURL: BASE })
  await api.delete('/api/data')
  await api.post('/api/demo')
  // 预置两份简历用于分组/搜索
  const rec = await api.post('/api/generate', { data: { targetJob: '前端开发工程师', jd: 'Vue 性能优化', style: 'holotech' } })
  const rec2 = await api.post('/api/generate', { data: { targetJob: '数据分析师', jd: 'SQL 报表', style: 'paper' } })
  const r1 = (await rec.json()).record
  const r2 = (await rec2.json()).record
  r1.html = '<b>r1</b>'
  r2.html = '<b>r2</b>'
  await api.post('/api/resumes', { data: r1 })
  await api.post('/api/resumes', { data: r2 })
  await api.dispose()
})

test('简历库展示分组与语义搜索', async ({ page }) => {
  await page.goto('/#/resumes')
  await expect(page.getByText('前端开发工程师 · 简历').first()).toBeVisible({ timeout: 15000 })
  // 语义搜索：搜“首屏加载”也能命中性能优化相关简历
  await page.getByPlaceholder(/语义搜索/).fill('首屏加载')
  await expect(page.locator('.resume-card').first()).toBeVisible({ timeout: 15000 })
})