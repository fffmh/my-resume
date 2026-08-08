<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { api } from '../api/adapter'
import type { ImportPreview, SectionData } from '../api/types'
import AppIcon from '../components/AppIcon.vue'
import FieldInput from '../components/FieldInput.vue'
import { toast } from '../composables/useToast'

const sections = ref<SectionData[]>([])
const fileInput = ref<HTMLInputElement | null>(null)
const dragging = ref(false)
const processing = ref(false)
const confirming = ref(false)
const preview = ref<ImportPreview | null>(null)

onMounted(async () => {
  sections.value = await api.getSections()
})

function sectionName(id: string): string {
  return sections.value.find((s) => s.id === id)?.name ?? id
}
function sectionDef(id: string): SectionData | undefined {
  return sections.value.find((s) => s.id === id)
}

function onDrop(e: DragEvent) {
  dragging.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file) void handleFile(file)
}

async function handleFile(file: File) {
  processing.value = true
  preview.value = null
  try {
    preview.value = await api.importFile(file)
    if (preview.value && !Object.keys(preview.value.sections).length) {
      toast('未识别到可入库的信息，可先到信息库手动填写', 'info')
    }
  } catch (err) {
    toast(`导入失败：${(err as Error).message}`, 'error')
  } finally {
    processing.value = false
  }
}

function removeEntryRow(sectionId: string, index: number) {
  if (!preview.value) return
  preview.value.sections[sectionId].splice(index, 1)
}

async function confirm() {
  if (!preview.value) return
  confirming.value = true
  try {
    await api.confirmImport(preview.value)
    toast('已写入对应信息库')
    preview.value = null
  } catch (err) {
    toast(`写入失败：${(err as Error).message}`, 'error')
  } finally {
    confirming.value = false
  }
}
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <h1>导入文件</h1>
        <p>读取 .txt / .md / .docx / .pdf，自动识别信息并填入对应信息库（识别结果可编辑后确认）</p>
      </div>
    </div>

    <input ref="fileInput" type="file" accept=".txt,.md,.docx,.pdf" hidden @change="fileInput?.files?.[0] && handleFile(fileInput.files[0])" />

    <div
      class="glass dropzone"
      :class="{ dragging }"
      role="button"
      tabindex="0"
      @click="fileInput?.click()"
      @keydown.enter="fileInput?.click()"
      @dragover.prevent="dragging = true"
      @dragleave.prevent="dragging = false"
      @drop.prevent="onDrop"
    >
      <div class="dz-icon"><AppIcon name="upload" :size="30" /></div>
      <h3>拖拽文件到这里，或点击选择</h3>
      <p class="muted">支持 .txt / .md / .docx / .pdf · 文件内容仅在本浏览器解析</p>
    </div>

    <div v-if="processing" class="glass panel processing">
      <div class="spinner"></div>
      <span>正在读取并识别文件内容…</span>
    </div>

    <div v-if="preview" class="glass panel">
      <div class="panel-head">
        <div>
          <h2>识别结果预览</h2>
          <p class="muted">来源：{{ preview.fileName }} · 确认后将写入对应信息库</p>
        </div>
        <div style="display: flex; gap: 10px;">
          <button class="btn btn-ghost" type="button" @click="preview = null">放弃</button>
          <button class="btn btn-primary" type="button" :disabled="confirming" @click="confirm">
            {{ confirming ? '写入中…' : '确认写入信息库' }}
          </button>
        </div>
      </div>

      <div v-if="preview.warnings.length" class="warnings">
        <div v-for="(w, i) in preview.warnings" :key="i" class="warning">⚠ {{ w }}</div>
      </div>

      <div v-if="!Object.keys(preview.sections).length" class="empty">
        <p>未识别到可入库的信息。可返回信息库手动填写，或换一个结构更清晰的简历文件重试。</p>
      </div>

      <div v-for="(entries, sectionId) in preview.sections" :key="sectionId" class="preview-section">
        <div class="preview-title">
          <AppIcon name="folder" :size="16" /> {{ sectionName(sectionId) }}
          <span class="chip">{{ entries.length }} 条</span>
        </div>
        <div v-for="(entry, eIndex) in entries" :key="eIndex" class="glass entry-box">
          <div class="form-grid">
            <div
              v-for="field in sectionDef(sectionId)?.fields ?? []"
              :key="field.key"
              class="field"
              :class="field.type === 'textarea' ? 'field-wide' : ''"
            >
              <label>{{ field.label }}</label>
              <FieldInput v-model="entries[eIndex][field.key]" :field="field" />
            </div>
            <template v-for="key in Object.keys(entry)" :key="key">
              <div v-if="!sectionDef(sectionId)?.fields.some((f) => f.key === key)" class="field">
                <label>{{ key }}</label>
                <FieldInput v-model="entries[eIndex][key]" :field="{ key, label: key, type: 'text' }" />
              </div>
            </template>
          </div>
          <div style="display: flex; justify-content: flex-end;">
            <button class="btn btn-ghost btn-sm" type="button" @click="removeEntryRow(sectionId, eIndex)">删除本条</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dropzone {
  display: flex; flex-direction: column; align-items: center; gap: 10px;
  padding: 60px 24px; margin-bottom: 24px; cursor: pointer; text-align: center;
  transition: border-color 0.3s, box-shadow 0.3s, transform 0.3s var(--ease);
}
.dropzone:hover, .dropzone.dragging { border-color: rgba(56, 225, 255, 0.6); box-shadow: var(--glow-cyan); transform: translateY(-2px); }
.dz-icon { width: 68px; height: 68px; border-radius: 20px; display: grid; place-items: center; color: var(--accent-1); background: rgba(56,225,255,0.1); border: 1px solid rgba(56,225,255,0.35); box-shadow: 0 0 30px rgba(56,225,255,0.15); margin-bottom: 6px; }
.dropzone h3 { font-family: var(--font-display); font-size: 18px; }
.panel { padding: 24px; margin-top: 24px; }
.panel-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; margin-bottom: 18px; flex-wrap: wrap; }
.panel-head h2 { font-family: var(--font-display); font-size: 18px; }
.processing { display: flex; align-items: center; gap: 14px; color: var(--ink-dim); }
.spinner { width: 22px; height: 22px; border-radius: 50%; border: 2px solid rgba(56,225,255,0.2); border-top-color: var(--accent-1); animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.warnings { margin-bottom: 16px; }
.warning { padding: 10px 14px; border-radius: 10px; font-size: 13px; color: #ffd9a3; background: rgba(255, 183, 77, 0.1); border: 1px solid rgba(255, 183, 77, 0.3); margin-bottom: 8px; }
.preview-section { margin-bottom: 26px; }
.preview-title { display: flex; align-items: center; gap: 8px; font-family: var(--font-display); font-weight: 700; margin-bottom: 12px; }
.entry-box { padding: 18px; margin-bottom: 12px; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 16px; }
.field-wide { grid-column: 1 / -1; }
@media (max-width: 640px) { .form-grid { grid-template-columns: 1fr; } }
</style>