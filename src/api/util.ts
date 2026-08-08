/** 生成短唯一 ID */
export function genId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

/** 简单深拷贝 */
export function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

/** 从任意值中取出字符串，容错 undefined/null */
export function str(value: unknown): string {
  if (value === undefined || value === null) return ''
  return String(value)
}

/** 拼接多行文本，去除空行与多余空白 */
export function cleanLines(value: unknown): string {
  return str(value)
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .join('\n')
}