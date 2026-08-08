<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { api } from '../api/adapter'
import { printResume } from '../api/print'
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
const search = ref('')

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return resumes.value
  return resumes.value.filter((r) =>
    [r.title, r.targetJob, r.styleName, r.text].some((s) => (s || '').toLowerCase().includes(q)),
  )
})

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
    computeGroups(filtered.value)
  } finally {
    loading.value = false
  }
}
onMounted(load)
watch(search, () => computeGroups(filtered.value))
onBeforeUnmount(() => {
  worker?.terminate()
  window.clearTimeout(debounceTimer)
})

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function scoreTone(score: number): string {
  if (score >= 80) return 'high'
  if (score >= 60) return 'mid'
  return 'low'
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
  computeGroups(filtered.value)
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

    <div class="search-row">
      <div class="search-box">
        <AppIcon name="search" :size="16" />
        <input v-model="search" type="search" placeholder="搜索标题 / 目标岗位 / 风格 / 内容…" />
      </div>
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

    <EmptyState
      v-else-if="!filtered.length"
      icon="search"
      title="没有匹配的简历"
      desc="换个关键词试试，或清空搜索条件查看全部。"
    />

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
              <span v-if="typeof r.score === 'number'" class="score-chip" :class="scoreTone(r.score)">{{ r.score }}分</span>
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

    <Modal v-if="preview" :title="`简历预览 · ${preview.title}`" width="880px" @close="preview = null">
      <div style="display: flex; gap: 10px; margin-bottom: 14px; flex-wrap: wrap;">
        <button class="btn btn-ghost btn-sm" type="button" @click="printResume(preview!.html)"><AppIcon name="print" :size="15" /> 打印 / 另存为 PDF</button>
        <span v-if="typeof preview.score === 'number'" class="chip score-chip" :class="scoreTone(preview.score)">匹配 {{ preview.score }} 分</span>
      </div>
      <iframe :srcdoc="preview.html" class="preview-frame" title="简历预览" />
    </Modal>
  </div>
</template>

<style scoped>
.search-row { margin-bottom: 18px; }
.search-box {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 14px; border-radius: 10px;
  background: var(--input-bg); border: 1px solid var(--line);
  color: var(--ink-dim); max-width: 420px;
  transition: border-color 0.25s, box-shadow 0.25s;
}
.search-box:focus-within { border-color: rgba(56, 225, 255, 0.65); box-shadow: 0 0 0 3px rgba(56, 225, 255, 0.12); }
.search-box input { flex: 1; background: none; border: none; outline: none; color: var(--ink); font-size: 14px; }
.search-box input::placeholder { color: var(--ink-faint); }
.group { margin-bottom: 30px; }
.group-head { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
.group-title { display: flex; align-items: center; gap: 8px; font-family: var(--font-display); font-weight: 700; font-size: 16px; color: var(--ink); }
.group-title svg { color: var(--accent-1); }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
.resume-card { padding: 20px; display: flex; flex-direction: column; gap: 14px; transition: transform 0.3s var(--ease), border-color 0.3s, box-shadow 0.3s; }
.resume-card:hover { transform: translateY(-4px); border-color: rgba(56, 225, 255, 0.5); box-shadow: var(--shadow-card), var(--glow-cyan); }
.rc-title { font-family: var(--font-display); font-size: 16px; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rc-meta { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.rc-actions { display: flex; gap: 8px; margin-top: auto; }
.score-chip { padding: 3px 10px; border-radius: 4px; font-size: 12px; font-weight: 700; font-variant-numeric: tabular-nums; }
.score-chip.high { color: var(--ok); background: rgba(61, 220, 151, 0.12); border-color: rgba(61, 220, 151, 0.4); }
.score-chip.mid { color: var(--accent-1); background: rgba(56, 225, 255, 0.1); border-color: rgba(56, 225, 255, 0.35); }
.score-chip.low { color: var(--danger); background: rgba(255, 107, 139, 0.1); border-color: rgba(255, 107, 139, 0.4); }
.preview-frame { width: 100%; height: 70vh; border: none; border-radius: 12px; background: #0a0f1e; }
@media (max-width: 640px) {
  .search-box { max-width: none; }
  .preview-frame { height: 60vh; }
}
</style>