import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 45000,
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: 'http://127.0.0.1:8010',
    channel: 'msedge', // 复用本机 Edge，避免下载浏览器
    headless: true,
    viewport: { width: 1280, height: 800 },
  },
  webServer: {
    command: 'npm run build:backend && python -m uvicorn backend.main:app --host 127.0.0.1 --port 8010',
    url: 'http://127.0.0.1:8010',
    reuseExistingServer: false,
    timeout: 120000,
    env: { RESUME_DATA_DIR: '.e2e-data' },
  },
})