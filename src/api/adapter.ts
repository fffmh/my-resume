import { LocalStorageAdapter } from './LocalStorageAdapter'
import type { IResumeAPI } from './types'

/**
 * 数据访问入口（唯一需要切换的地方）。
 * 第二阶段：改为 import { HttpAdapter } from './HttpAdapter'
 *          export const api: IResumeAPI = new HttpAdapter()
 */
export const api: IResumeAPI = new LocalStorageAdapter()