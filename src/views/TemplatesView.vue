<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { api } from '../api/adapter'
import type { TemplateInfo } from '../api/types'
import AppIcon from '../components/AppIcon.vue'
import EmptyState from '../components/EmptyState.vue'
import { toast } from '../composables/useToast'

const templates = ref<TemplateInfo[]>([])
const loading = ref(true)
const uploading = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

async function load() {
  loading.value = true
  try {
    templates.value = await api.getTemplates()
  } finally {
    loading.value = false
  }
}
onMounted(load)

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

async function onFile(file: File) {
  uploading.value = true
  try {
    const info = await api.uploadTemplate(file)
    toast(`模板「${info.name}」已上传，识别到 ${info.placeholders.length} 个占位符`)
    await load()
  } catch (err) {
    toast(`上传失败：${(err as Error).message}`, 'error')
  } finally {
    uploading.value = false
  }
}

async function removeTemplate(t: TemplateInfo) {
  if (!window.confirm(`确定删除模板「${t.name}」吗？`)) return
  await api.deleteTemplate(t.id)
  toast('已删除', 'info')
  await load()
}
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <h1>模板管理</h1>
        <p>上传 Word / PDF 简历模板，系统识别其中的 &#123;&#123;占位符&#125;&#125;（真实填写将在第二阶段启用）</p>
      </div>
      <button class="btn btn-primary" type="button" :disabled="uploading" @click="fileInput?.click()">
        <AppIcon name="upload" :size="16" /> {{ uploading ? '上传中…' : '上传模板' }}
      </button>
    </div>

    <input ref="fileInput" type="file" accept=".docx,.pdf" hidden @change="fileInput?.files?.[0] && onFile(fileInput.files[0])" />

    <div v-if="loading" class="skeleton skel-card" style="height: 160px;"></div>

    <div v-else-if="!templates.length">
      <EmptyState icon="layers" title="还没有模板" desc="上传一个包含 {{姓名}}、{{工作经历}} 等占位符的 Word/PDF 模板，系统会自动识别变量清单。">
        <button class="btn btn-primary" type="button" @click="fileInput?.click()">上传第一个模板</button>
      </EmptyState>
    </div>

    <div v-else class="tpl-grid">
      <div v-for="t in templates" :key="t.id" class="glass tpl-card">
        <div class="tpl-head">
          <div class="tpl-icon"><AppIcon name="file" :size="20" /></div>
          <div class="tpl-info">
            <div class="tpl-name">{{ t.name }}</div>
            <div class="muted mono">{{ t.fileName }} · {{ formatSize(t.size) }} · {{ new Date(t.uploadedAt).toLocaleDateString() }}</div>
          </div>
          <button class="icon-btn danger" type="button" title="删除" @click="removeTemplate(t)"><AppIcon name="trash" :size="16" /></button>
        </div>
        <div class="tpl-placeholders">
          <span class="chip" v-for="p in t.placeholders" :key="p">{{ p }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tpl-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }
.tpl-card { padding: 20px; }
.tpl-head { display: flex; align-items: center; gap: 14px; margin-bottom: 16px; }
.tpl-icon { width: 42px; height: 42px; border-radius: 12px; display: grid; place-items: center; color: var(--accent-2); background: rgba(79,124,255,0.12); border: 1px solid rgba(79,124,255,0.35); }
.tpl-info { flex: 1; min-width: 0; }
.tpl-name { font-family: var(--font-display); font-weight: 700; font-size: 15px; margin-bottom: 3px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tpl-placeholders { display: flex; flex-wrap: wrap; gap: 8px; }
.icon-btn { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 9px; background: rgba(255,255,255,0.06); border: 1px solid var(--glass-border); color: var(--ink-dim); cursor: pointer; transition: all 0.2s; flex-shrink: 0; }
.icon-btn:hover { color: var(--danger); border-color: rgba(255,107,139,0.5); }
</style>