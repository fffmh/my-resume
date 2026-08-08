import { ref } from 'vue'

export type Theme = 'dark' | 'light'

const KEY = 'resume-theme'
const theme = ref<Theme>('dark')

function apply(t: Theme): void {
  theme.value = t
  document.documentElement.setAttribute('data-theme', t)
  document.documentElement.style.colorScheme = t
  try {
    localStorage.setItem(KEY, t)
  } catch {
    /* 忽略存储异常 */
  }
}

/** 应用启动时初始化主题（默认 JARVIS 暗色，记忆用户选择） */
export function initTheme(): void {
  let saved: string | null = null
  try {
    saved = localStorage.getItem(KEY)
  } catch {
    /* ignore */
  }
  apply(saved === 'light' ? 'light' : 'dark')
}

export function toggleTheme(): void {
  apply(theme.value === 'dark' ? 'light' : 'dark')
}

export function useTheme() {
  return { theme, toggleTheme }
}