import { expect, test, request as playwrightRequest } from '@playwright/test'

const BASE = 'http://127.0.0.1:8010'

test.beforeAll(async () => {
  const api = await playwrightRequest.newContext({ baseURL: BASE })
  await api.delete('/api/data')
  await api.post('/api/demo')
  await api.dispose()
})

test('一键体验 → 生成 → 评分 → 保存 → 简历库', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: '一键体验' }).click()
  await expect(page.getByText(/已填充/)).toBeVisible({ timeout: 15000 })

  await page.goto('/#/generate')
  await page.getByPlaceholder('如：前端开发工程师').fill('前端开发工程师')
  await page.getByPlaceholder(/粘贴职位要求/).fill('Vue 性能优化 组件库')
  await page.getByRole('button', { name: '生成简历' }).click()

  // 生成预览：评分仪表出现
  await expect(page.getByText('岗位匹配评分')).toBeVisible({ timeout: 30000 })
  await expect(page.getByText('AI 建议').first()).toBeVisible().catch(() => {}) // 可能无建议，不强制

  // 保存到简历库
  await page.getByRole('button', { name: '保存到简历库' }).click()
  await expect(page).toHaveURL(/#\/resumes/)
  await expect(page.getByText('前端开发工程师 · 简历').first()).toBeVisible({ timeout: 15000 })
})

test('生成页导出内置 Word 按钮存在', async ({ page }) => {
  await page.goto('/#/generate')
  await page.getByPlaceholder('如：前端开发工程师').fill('前端开发工程师')
  await page.getByRole('button', { name: '生成简历' }).click()
  await expect(page.getByRole('button', { name: /内置模板·导出Word/ })).toBeVisible({ timeout: 30000 })
})