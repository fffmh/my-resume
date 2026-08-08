import { reactive } from 'vue'

export interface ToastItem {
  id: number
  type: 'success' | 'error' | 'info'
  message: string
}

const toasts = reactive<ToastItem[]>([])
let seq = 0

export function toast(message: string, type: ToastItem['type'] = 'success'): void {
  const id = ++seq
  toasts.push({ id, type, message })
  window.setTimeout(() => {
    const index = toasts.findIndex((t) => t.id === id)
    if (index >= 0) toasts.splice(index, 1)
  }, 3200)
}

export function useToast() {
  return { toasts, toast }
}