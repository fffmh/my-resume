<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../api/adapter'
import { STYLE_NAMES } from '../api/resumeTemplates'
import { scoreResume, type ResumeScore } from '../api/score'
import { printResume } from '../api/print'
import type { ResumeRecord } from '../api/types'
import AppIcon from '../components/AppIcon.vue'
import ScoreGauge from '../components/ScoreGauge.vue'
import { toast } from '../composables/useToast'

const router = useRouter()
const targetJob = ref('')
const jd = ref('')
const style = ref('aurora')
const generating = ref(false)
const saving = ref(false)
const record = ref<ResumeRecord | null>(null)
const scoreInfo = ref<ResumeScore | null>(null)
const previewOpen = ref(false)
const templates = ref<{ id: string; name: string }[]>([])
const selectedTemplateId = ref('')
const exporting = ref(false)

const steps = ['读取信息库资料', '按岗位匹配筛选素材', '优化措辞与量化表达', '渲染简历模板']
const activeStep = ref(-1)

async function generate() {
  if (!targetJob.value.trim()) {
    toast('请填写目标岗位', 'error')
    return
  }
  generating.value = true
  activeStep.value = 0
  for (let i = 0; i < steps.length; i++) {
    activeStep.value = i
    await new Promise((r) => setTimeout(r, 520))
  }
  try {
    const result = await api.generateResume({
      targetJob: targetJob.value.trim(),
      jd: jd.value,
      style: style.value,
    })
    record.value = result.record
    const sections = await api.getSections()
    scoreInfo.value = scoreResume(sections, targetJob.value.trim(), jd.value)
    const tpls = await api.getTemplates()
    templates.value = tpls
    if (tpls.length) selectedTemplateId.value = tpls[0].id
    previewOpen.value = true
  } catch (err) {
    toast(`生成失败：${(err as Error).message}`, 'error')
  } finally {
    generating.value = false
    activeStep.value = -1
  }
}

async function save() {
  if (!record.value) return
  saving.value = true
  try {
    await api.saveResume(record.value)
    toast('已保存到简历库')
    previewOpen.value = false
    router.push('/resumes')
  } catch (err) {
    toast(`保存失败：${(err as Error).message}`, 'error')
  } finally {
    saving.value = false
  }
}

async function exportBuiltinDocx() {
  if (!targetJob.value.trim()) return
  exporting.value = true
  try {
    const blob = await api.exportBuiltinDocx({ targetJob: targetJob.value.trim(), jd: jd.value, style: style.value })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${targetJob.value.trim().replace(/[\\/:*?"<>|]/g, '_')}-简历.docx`
    a.click()
    URL.revokeObjectURL(url)
    toast('已导出内置模板 Word')
  } catch (err) {
    toast((err as Error).message, 'error')
  } finally {
    exporting.value = false
  }
}

async function exportWithTemplate() {
  if (!record.value || !selectedTemplateId.value) return
  exporting.value = true
  try {
    const blob = await api.fillTemplate(selectedTemplateId.value, (record.value.data || {}) as Record<string, unknown>)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${record.value.title.replace(/[\\/:*?"<>|]/g, '_')}-filled`
    a.click()
    URL.revokeObjectURL(url)
    toast('已用模板生成文件')
  } catch (err) {
    toast((err as Error).message, 'error')
  } finally {
    exporting.value = false
  }
}
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <h1>生成简历</h1>
        <p>输入目标岗位与岗位要求，系统从信息库筛选匹配素材并自动优化生成</p>
      </div>
    </div>

    <div class="glass panel">
      <div class="field">
        <label>目标岗位 <span class="muted">（必填）</span></label>
        <input v-model="targetJob" placeholder="如：前端开发工程师" />
      </div>
      <div class="field">
        <label>岗位描述 / JD <span class="muted">（可选，用于更精准的匹配与关键词对齐）</span></label>
        <textarea v-model="jd" rows="5" placeholder="粘贴职位要求，如：精通 Vue/React，熟悉性能优化、组件库建设…" />
      </div>
      <div class="field">
        <label>简历风格</label>
        <div class="style-row">
          <button
            v-for="(name, key) in STYLE_NAMES"
            :key="key"
            type="button"
            class="style-opt glass"
            :class="{ active: style === key }"
            @click="style = key"
          >
            {{ name }}
          </button>
        </div>
      </div>
      <div style="display: flex; justify-content: flex-end;">
        <button class="btn btn-primary" type="button" :disabled="generating" @click="generate">
          <AppIcon name="sparkles" :size="16" /> {{ generating ? '生成中…' : '生成简历' }}
        </button>
      </div>
      <p class="muted tip">演示版使用本地规则润色（筛选匹配 + 措辞优化 + 关键词高亮）；第二阶段接入大模型后质量更高。</p>
    </div>

    <div v-if="generating" class="glass panel steps-panel" aria-live="polite">
      <div class="radar" aria-hidden="true"><div class="radar-ring"></div></div>
      <div v-for="(step, i) in steps" :key="step" class="step" :class="{ done: activeStep > i, active: activeStep === i }">
        <span class="step-dot">
          <AppIcon v-if="activeStep > i" name="check" :size="13" />
          <span v-else-if="activeStep === i" class="spinner"></span>
          <span v-else class="idx">0{{ i + 1 }}</span>
        </span>
        <span>{{ step }}</span>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="previewOpen && record" class="modal-overlay" style="z-index: 120;">
        <div class="modal" style="width: min(900px, 100%); max-height: 94vh;" role="dialog" aria-modal="true" aria-label="简历预览">
          <div class="modal-head">
            <h3>简历预览 · {{ record.title }}</h3>
            <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
              <template v-if="record.data">
                <button class="btn btn-holo btn-sm" type="button" :disabled="exporting" @click="exportBuiltinDocx">
                  <AppIcon name="download" :size="15" /> {{ exporting ? '导出中…' : '内置模板·导出Word' }}
                </button>
                <template v-if="templates.length">
                  <select v-model="selectedTemplateId" class="tpl-select" :title="'选择模板'">
                    <option v-for="t in templates" :key="t.id" :value="t.id">{{ t.name }}</option>
                  </select>
                  <button class="btn btn-holo btn-sm" type="button" :disabled="exporting" @click="exportWithTemplate">
                    <AppIcon name="download" :size="15" /> {{ exporting ? '导出中…' : '模板导出' }}
                  </button>
                </template>
              </template>
              <button class="btn btn-ghost btn-sm" type="button" @click="printResume(record.html)"><AppIcon name="print" :size="15" /> 打印 / PDF</button>
              <button class="btn btn-ghost btn-sm" type="button" @click="previewOpen = false">关闭</button>
              <button class="btn btn-primary btn-sm" type="button" :disabled="saving" @click="save">{{ saving ? '保存中…' : '保存到简历库' }}</button>
            </div>
          </div>
          <div class="modal-body">
            <div v-if="scoreInfo" class="glass diag">
              <div class="diag-head">岗位匹配诊断</div>
              <div class="diag-main">
                <ScoreGauge :score="scoreInfo.total" />
                <div class="diag-dims">
                  <div v-for="d in scoreInfo.dimensions" :key="d.key" class="dim">
                    <div class="dim-head"><span>{{ d.name }}</span><b class="mono">{{ d.score }}/{{ d.max }}</b></div>
                    <div class="dim-bar"><div class="dim-fill" :style="{ width: (d.score / d.max) * 100 + '%' }"></div></div>
                    <div class="muted dim-tip">{{ d.tip }}</div>
                  </div>
                </div>
              </div>
              <ul v-if="scoreInfo.suggestions.length" class="diag-tips">
                <li v-for="(s, i) in scoreInfo.suggestions" :key="i">▸ {{ s }}</li>
              </ul>
            </div>
            <iframe :srcdoc="record.html" class="preview-frame" title="简历预览" />
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.panel { padding: 26px; }
.tip { margin-top: 14px; font-size: 12.5px; }
.style-row { display: flex; gap: 10px; flex-wrap: wrap; }
.style-opt { padding: 10px 18px; border-radius: 10px; cursor: pointer; font-size: 14px; color: var(--ink-dim); transition: all 0.25s var(--ease); }
.style-opt:hover { color: var(--ink); }
.style-opt.active {
  color: #03121a; font-weight: 700;
  background: linear-gradient(100deg, var(--accent-1), var(--accent-2));
  border-color: transparent;
  box-shadow: 0 8px 26px rgba(56, 225, 255, 0.32);
}
.steps-panel { margin-top: 20px; display: flex; flex-direction: column; gap: 14px; position: relative; overflow: hidden; }
.radar { position: absolute; right: 26px; top: 50%; transform: translateY(-50%); width: 96px; height: 96px; opacity: 0.9; }
.radar-ring {
  width: 100%; height: 100%; border-radius: 50%;
  border: 1px solid rgba(56, 225, 255, 0.35);
  background: conic-gradient(from 0deg, rgba(56, 225, 255, 0.35), transparent 25%);
  animation: radar-spin 1.6s linear infinite;
  box-shadow: 0 0 30px rgba(56, 225, 255, 0.2);
}
@keyframes radar-spin { to { transform: rotate(360deg); } }
.step { display: flex; align-items: center; gap: 12px; color: var(--ink-dim); font-size: 14px; }
.step.active { color: var(--ink); }
.step.done { color: var(--ink-dim); }
.step-dot { width: 26px; height: 26px; border-radius: 6px; display: grid; place-items: center; background: var(--input-bg); border: 1px solid var(--line); color: var(--ink-dim); font-variant-numeric: tabular-nums; }
.step.active .step-dot { border-color: rgba(56, 225, 255, 0.65); color: var(--accent-1); box-shadow: 0 0 14px rgba(56, 225, 255, 0.35); }
.step.done .step-dot { border-color: rgba(61, 220, 151, 0.6); color: var(--ok); }
.idx { font-size: 12px; }
.spinner { width: 12px; height: 12px; border-radius: 50%; border: 2px solid rgba(56, 225, 255, 0.25); border-top-color: var(--accent-1); animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.preview-frame { width: 100%; height: 56vh; border: none; border-radius: 12px; background: #0a0f1e; }
.diag { padding: 20px; margin-bottom: 18px; }
.diag-head { font-family: var(--font-display); font-weight: 700; margin-bottom: 16px; letter-spacing: 0.04em; }
.diag-main { display: flex; align-items: center; gap: 26px; flex-wrap: wrap; }
.diag-dims { flex: 1; min-width: 240px; display: flex; flex-direction: column; gap: 14px; }
.dim-head { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 6px; }
.dim-head b { color: var(--accent-1); }
.dim-bar { height: 7px; border-radius: 4px; background: rgba(56, 225, 255, 0.1); overflow: hidden; }
.dim-fill { height: 100%; border-radius: 4px; background: linear-gradient(90deg, var(--accent-1), var(--accent-2)); box-shadow: 0 0 10px rgba(56, 225, 255, 0.5); transition: width 0.9s var(--ease); }
.dim-tip { font-size: 11.5px; margin-top: 4px; }
.diag-tips { margin-top: 16px; display: flex; flex-direction: column; gap: 7px; }
.diag-tips li { list-style: none; font-size: 13px; color: var(--ink-dim); line-height: 1.6; }
.tpl-select {
  padding: 7px 10px; border-radius: 8px; font-size: 13px; max-width: 150px;
  background: var(--input-bg); border: 1px solid var(--line); color: var(--ink); outline: none;
}
.tpl-select option { background: var(--option-bg); color: var(--ink); }
@media (max-width: 640px) {
  .radar { display: none; }
  .diag-main { flex-direction: column; align-items: flex-start; }
}
</style>