import { HttpAdapter } from './HttpAdapter'
import { LocalStorageAdapter } from './LocalStorageAdapter'
import type { IResumeAPI } from './types'

/**
 * 数据访问入口（按构建模式切换）：
 * - 默认（GitHub Pages / 本地演示）：LocalStorageAdapter，数据存浏览器
 * - 后端模式（npm run build:backend）：HttpAdapter，指向同源 FastAPI /api/*
 */
export const api: IResumeAPI =
  import.meta.env.VITE_BACKEND === '1' ? new HttpAdapter() : new LocalStorageAdapter()