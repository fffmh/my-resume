<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { api } from '../api/adapter'
import type { AppSettings } from '../api/types'
import AppIcon from '../components/AppIcon.vue'
import { toast } from '../composables/useToast'

const settings = reactive<AppSettings>({ llm: { baseUrl: '', apiKey: '', model: '' } })
const loading = ref(true)
const saving = ref(false)
const showKey = ref(false)
const importInput = ref<HTMLInputElement | null>(null)

onMounted(async () => {
  try {
    const loaded = await api.getSettings()
    settings.llm.baseUrl = loaded.llm.baseUrl
    settings.llm.apiKey = loaded.llm.apiKey
    settings.llm.model = loaded.llm.model
  } finally {
    loading.value = false
  }
})

async function saveSettings() {
  saving.value = true
  try {
    await api.saveSettings({ ...settings })
    toast('设置已保存')
  } catch (err) {
    toast(`保存失败：${(err as Error).message}`, 'error')
  } finally {
    saving.value = false
  }
}

async function exportData() {
  try {
    const json = await api.exportData()
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `resume-gallery-data-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast('已导出数据文件')
  } catch (err) {
    toast(`导出失败：${(err as Error).message}`, 'error')
  }
}

async function onImportFile(file: File) {
  const text = await file.text()
  try {
    await api.importData(text)
    toast('数据已导入，刷新后生效')
  } catch (err) {
    toast(`导入失败：${(err as Error).message}`, 'error')
  }
}

async function clearAll() {
  if (!window.confirm('确定清空本浏览器中的全部数据吗？此操作不可恢复，建议先导出备份。')) return
  await api.clearAll()
  toast('已清空本地数据', 'info')
  setTimeout(() => window.location.reload(), 800)
}
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <h1>设置</h1>
        <p>AI 配置、数据迁移与本地数据管理</p>
      </div>
    </div>

    <div v-if="loading" class="skeleton skel-card" style="height: 200px;"></div>

    <template v-else>
      <div class="glass panel">
        <div class="panel-head">
          <div>
            <h2>AI 引擎（第二阶段启用）</h2>
            <p class="muted">当前为演示版，配置项已保存；接入 FastAPI 后端后，此配置将用于真实的大模型润色。</p>
          </div>
          <span class="chip">即将上线</span>
        </div>
        <div class="field">
          <label>API Base URL</label>
          <input v-model="settings.llm.baseUrl" placeholder="https://api.deepseek.com" />
        </div>
        <div class="field-row">
          <div class="field">
            <label>模型</label>
            <input v-model="settings.llm.model" placeholder="deepseek-chat" />
          </div>
          <div class="field">
            <label>API Key</label>
            <div class="key-row">
              <input v-model="settings.llm.apiKey" :type="showKey ? 'text' : 'password'" placeholder="sk-…" autocomplete="off" />
              <button class="btn btn-ghost btn-sm" type="button" @click="showKey = !showKey">{{ showKey ? '隐藏' : '显示' }}</button>
            </div>
          </div>
        </div>
        <div style="display: flex; justify-content: flex-end;">
          <button class="btn btn-primary" type="button" :disabled="saving" @click="saveSettings">{{ saving ? '保存中…' : '保存设置' }}</button>
        </div>
      </div>

      <div class="glass panel">
        <div class="panel-head">
          <div>
            <h2>数据管理</h2>
            <p class="muted">演示版数据仅存当前浏览器。可导出 JSON 备份，或导入其他设备的备份文件。</p>
          </div>
        </div>
        <div class="data-actions">
          <button class="btn btn-ghost" type="button" @click="exportData"><AppIcon name="download" :size="16" /> 导出全部数据</button>
          <button class="btn btn-ghost" type="button" @click="importInput?.click()"><AppIcon name="upload" :size="16" /> 导入数据</button>
          <button class="btn btn-danger" type="button" @click="clearAll"><AppIcon name="trash" :size="16" /> 清空本地数据</button>
        </div>
        <input ref="importInput" type="file" accept=".json" hidden @change="importInput?.files?.[0] && onImportFile(importInput.files[0])" />
      </div>

      <div class="glass panel about">
        <div class="panel-head"><h2>关于</h2></div>
        <p>流光简历 · 第一阶段纯前端展示版（Vue 3 + TypeScript + IndexedDB）。</p>
        <p class="muted" style="margin-top: 8px;">第二阶段将接入 FastAPI 后端：Word/PDF 真实解析、占位符模板填写、大模型润色与高质量导出。升级时仅需切换数据适配器，前端界面零改动。</p>
      </div>
    </template>
  </div>
</template>

<style scoped>
.panel { padding: 26px; margin-bottom: 20px; }
.panel-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 18px; flex-wrap: wrap; }
.panel-head h2 { font-family: var(--font-display); font-size: 17px; margin-bottom: 5px; }
.panel-head p { font-size: 13px; line-height: 1.7; }
.field-row { display: grid; grid-template-columns: 1fr 2fr; gap: 14px; }
.key-row { display: flex; gap: 8px; }
.key-row input { flex: 1; }
.data-actions { display: flex; gap: 10px; flex-wrap: wrap; }
.about p { font-size: 14px; line-height: 1.8; color: var(--ink-dim); }
@media (max-width: 640px) { .field-row { grid-template-columns: 1fr; } }
</style>