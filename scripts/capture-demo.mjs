// 演示素材采集：截图 + GIF 帧（用本机 Edge，headless）
import { chromium } from 'playwright-core'
import fs from 'node:fs'
import path from 'node:path'

const BASE = process.env.DEMO_BASE || 'http://127.0.0.1:8000'
const TOKEN = process.env.RESUME_ACCESS_TOKEN || '' // 仅从环境变量读取，切勿把真实口令写进仓库
const OUT = path.resolve('docs/screenshots')
const FRAMES = path.join(OUT, 'frames')

fs.mkdirSync(FRAMES, { recursive: true })

async function api(method, url, body) {
  const res = await fetch(BASE + url, {
    method,
    headers: { ...(TOKEN ? { 'X-Access-Token': TOKEN } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  return res.status === 204 ? null : res.json().catch(() => null)
}

// 准备演示数据：清空 → 一键体验
await api('DELETE', '/api/data')
await api('POST', '/api/demo')

const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
if (TOKEN) await page.addInitScript((t) => localStorage.setItem('resume-access-token', t), TOKEN)

const shot = async (name) => {
  await page.screenshot({ path: path.join(OUT, name) })
  console.log('shot:', name)
}

// 1) 首页（暗色）
await page.goto(BASE + '/', { waitUntil: 'load' })
await page.waitForSelector('.card-link', { timeout: 20000 })
await page.waitForTimeout(800)
await shot('01-home-dark.png')

// 2) 首页（亮色）
await page.locator('.theme-btn').click()
await page.waitForTimeout(700)
await shot('02-home-light.png')
await page.locator('.theme-btn').click()
await page.waitForTimeout(500)

// 3) 生成流程（GIF 帧）
await page.goto(BASE + '/#/generate')
await page.getByPlaceholder('如：前端开发工程师').fill('前端开发工程师')
await page.getByPlaceholder(/粘贴职位要求/).fill('Vue 性能优化 组件库 前端工程化')
let frame = 0
const grab = async () => {
  await page.screenshot({ path: path.join(FRAMES, `f${String(frame).padStart(2, '0')}.png`) })
  frame++
}
await grab()
await page.getByRole('button', { name: '生成简历' }).click()
for (let i = 0; i < 6; i++) {
  await page.waitForTimeout(500)
  await grab()
}
await page.waitForSelector('text=岗位匹配评分', { timeout: 30000 })
await page.waitForTimeout(1200)
await grab()
await shot('03-score.png')

// 4) 保存 → 简历库
await page.getByRole('button', { name: '保存到简历库' }).click()
await page.waitForURL(/#\/resumes/, { timeout: 20000 })
await page.waitForSelector('.resume-card', { timeout: 20000 })
await page.waitForTimeout(1200)
await grab()
await shot('04-library.png')

// 5) 语义搜索
await page.getByPlaceholder(/语义搜索/).fill('首屏加载变快')
await page.waitForTimeout(2500)
await shot('05-semantic-search.png')

// 6) 导入识别 + 置信度
await page.goto(BASE + '/#/import')
await page.setInputFiles('input[type=file]', path.resolve('scripts/fixtures/sample-resume.txt'))
await page.waitForSelector('.conf-chip', { timeout: 60000 })
await page.waitForTimeout(1200)
await shot('06-import-confidence.png')

// 7) 移动端首页
const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })
if (TOKEN) await mobile.addInitScript((t) => localStorage.setItem('resume-access-token', t), TOKEN)
await mobile.goto(BASE + '/', { waitUntil: 'load' })
await mobile.waitForSelector('.card-link', { timeout: 20000 })
await mobile.waitForTimeout(800)
await mobile.screenshot({ path: path.join(OUT, '07-mobile.png') })
console.log('shot: 07-mobile.png')

await browser.close()
console.log('done, frames:', frame)