import { expect, test } from '@playwright/test'

test('首页渲染：Hero、信息库卡片、主题切换', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('让每一份简历')).toBeVisible()
  // 8 个信息库卡片 + 5 个工具卡片
  await expect(page.locator('.card-link')).toHaveCount(13)
  // 主题切换（默认暗色）
  const html = page.locator('html')
  await expect(html).toHaveAttribute('data-theme', 'dark')
  await page.locator('.theme-btn').click()
  await expect(html).toHaveAttribute('data-theme', 'light')
})

test('PWA：manifest 与 Service Worker 可用', async ({ page }) => {
  await page.goto('/')
  const manifest = await page.evaluate(() => document.querySelector('link[rel="manifest"]')?.getAttribute('href'))
  expect(manifest).toBeTruthy()
  await expect(async () => {
    const sw = await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.getRegistration()
      return reg ? reg.active?.state ?? 'installing' : null
    })
    expect(sw).toBe('activated')
  }).toPass({ timeout: 15000 })
})