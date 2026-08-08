<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { api } from '../api/adapter'
import type { ResumeGroup, ResumeRecord } from '../api/types'
import AppIcon from '../components/AppIcon.vue'
import EmptyState from '../components/EmptyState.vue'
import Modal from '../components/Modal.vue'
import { toast } from '../composables/useToast'

const resumes = ref<ResumeRecord[]>([])
const groups = ref<ResumeGroup[]>([])
const loading = ref(true)
const grouping = ref(false)
const preview = ref<ResumeRecord | null>(null)

let worker: Worker | null = null
let debounceTimer: number | undefined

function computeGroups(list: ResumeRecord[]) {
  window.clearTimeout(debounceTimer)
  debounceTimer = window.setTimeout(() => {
    worker?.terminate()
    if (!list.length) {
      groups.value = []
      grouping.value = false
      return
    }
    grouping.value = true
    worker = new Worker(new URL('../api/similarity.worker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = (e: MessageEvent<ResumeGroup[]>) => {
      groups.value = e.data
      grouping.value = false
    }
    worker.onerror = () => {
      groups.value = []
      grouping.value = false
      toast('分组计算失败，已降级为平铺展示', 'error')
    }
    worker.postMessage(list)
  }, 300)
}

async function load() {
  loading.value = true
  try {
    resumes.value = await api.getResumes()
    computeGroups(resumes.value)
  } finally {
    loading.value = false
  }
}
onMounted(load)
onBeforeUnmount(() => {
  worker?.terminate()
  window.clearTimeout(debounceTimer)
})

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function downloadHtml(record: ResumeRecord) {
  const blob = new Blob([record.html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${record.title.replace(/[\\/:*?"<>|]/g, '_')}.html`
  a.click()
  URL.revokeObjectURL(url)
  toast('已下载 HTML 简历')
}

async function removeResume(record: ResumeRecord) {
  if (!window.confirm(`确定删除「${record.title}」吗？`)) return
  await api.deleteResume(record.id)
  resumes.value = resumes.value.filter((r) => r.id !== record.id)
  computeGroups(resumes.value)
  toast('已删除', 'info')
}
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <h1>简历库</h1>
        <p>已生成简历自动按目标岗位与内容相似度分组（Web Worker 计算，不卡界面）</p>
      </div>
      <router-link to="/generate" class="btn btn-primary btn-sm"><AppIcon name="sparkles" :size="15" /> 去生成</router-link>
    </div>

    <div v-if="loading" class="grid">
      <div v-for="i in 4" :key="i" class="skeleton skel-card" style="height: 150px;"></div>
    </div>

    <EmptyState
      v-else-if="!resumes.length"
      icon="folder"
      title="简历库还是空的"
      desc="去「生成简历」输入目标岗位，生成的第一份简历会出现在这里，并按相似度自动归组。"
    >
      <router-link to="/generate" class="btn btn-primary">开始生成</router-link>
    </EmptyState>

    <div v-else>
      <div v-if="grouping" class="muted" style="margin-bottom: 14px; font-size: 13px;">正在按相似度分组…</div>

      <div v-for="group in groups" :key="group.key" class="group">
        <div class="group-head">
          <div class="group-title">
            <AppIcon name="target" :size="16" /> {{ group.key }}
          </div>
          <span class="chip">{{ group.resumes.length }} 份</span>
        </div>
        <div class="grid">
          <div v-for="r in group.resumes" :key="r.id" class="glass resume-card">
            <div class="rc-title">{{ r.title }}</div>
            <div class="rc-meta">
              <span class="chip">{{ r.styleName }}</span>
              <span class="chip mono">{{ formatDate(r.createdAt) }}</span>
            </div>
            <div class="rc-actions">
              <button class="btn btn-ghost btn-sm" type="button" @click="preview = r"><AppIcon name="eye" :size="15" /> 预览</button>
              <button class="btn btn-ghost btn-sm" type="button" @click="downloadHtml(r)"><AppIcon name="download" :size="15" /> 下载</button>
              <button class="btn btn-danger btn-sm" type="button" @click="removeResume(r)"><AppIcon name="trash" :size="15" /></button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <Modal v-if="preview" :title="`简历预览 · ${preview.title}`" width="860px" @close="preview = null">
      <iframe :srcdoc="preview.html" class="preview-frame" title="简历预览" />
    </Modal>
  </div>
</template>

<style scoped>
.group { margin-bottom: 30px; }
.group-head { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
.group-title { display: flex; align-items: center; gap: 8px; font-family: var(--font-display); font-weight: 700; font-size: 16px; color: var(--ink); }
.group-title svg { color: var(--accent-1); }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
.resume-card { padding: 20px; display: flex; flex-direction: column; gap: 14px; transition: transform 0.3s var(--ease), border-color 0.3s, box-shadow 0.3s; }
.resume-card:hover { transform: translateY(-4px); border-color: rgba(56,225,255,0.4); box-shadow: var(--shadow-card), var(--glow-cyan); }
.rc-title { font-family: var(--font-display); font-size: 16px; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rc-meta { display: flex; gap: 8px; flex-wrap: wrap; }
.rc-actions { display: flex; gap: 8px; margin-top: auto; }
.preview-frame { width: 100%; height: 72vh; border: none; border-radius: 12px; background: #0a0f1e; }
</style>