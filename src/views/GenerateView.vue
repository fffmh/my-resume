<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../api/adapter'
import { STYLE_NAMES } from '../api/resumeTemplates'
import type { ResumeRecord } from '../api/types'
import AppIcon from '../components/AppIcon.vue'
import { toast } from '../composables/useToast'

const router = useRouter()
const targetJob = ref('')
const jd = ref('')
const style = ref('aurora')
const generating = ref(false)
const saving = ref(false)
const record = ref<ResumeRecord | null>(null)
const previewOpen = ref(false)

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
      <div v-for="(step, i) in steps" :key="step" class="step" :class="{ done: activeStep > i, active: activeStep === i }">
        <span class="step-dot">
          <AppIcon v-if="activeStep > i" name="check" :size="13" />
          <span v-else-if="activeStep === i" class="spinner"></span>
          <span v-else class="idx">{{ i + 1 }}</span>
        </span>
        <span>{{ step }}</span>
      </div>
    </div>


    <Teleport to="body">
      <div v-if="previewOpen && record" class="modal-overlay" style="z-index: 120;">
        <div class="modal" style="width: 880px; max-height: 92vh;" role="dialog" aria-modal="true" aria-label="简历预览">
          <div class="modal-head">
            <h3>简历预览 · {{ record.title }}</h3>
            <div style="display: flex; gap: 10px; align-items: center;">
              <button class="btn btn-ghost btn-sm" type="button" @click="previewOpen = false">关闭</button>
              <button class="btn btn-primary btn-sm" type="button" :disabled="saving" @click="save">{{ saving ? '保存中…' : '保存到简历库' }}</button>
            </div>
          </div>
          <div class="modal-body">
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
.style-opt { padding: 10px 18px; border-radius: 12px; cursor: pointer; font-size: 14px; color: var(--ink-dim); transition: all 0.25s var(--ease); }
.style-opt:hover { color: var(--ink); }
.style-opt.active { color: #04121a; font-weight: 700; background: linear-gradient(100deg, var(--accent-1), var(--accent-2)); border-color: transparent; box-shadow: 0 8px 26px rgba(56,225,255,0.3); }
.steps-panel { margin-top: 20px; display: flex; flex-direction: column; gap: 14px; }
.step { display: flex; align-items: center; gap: 12px; color: var(--ink-dim); font-size: 14px; }
.step.active { color: var(--ink); }
.step.done { color: var(--ink-dim); }
.step-dot { width: 26px; height: 26px; border-radius: 50%; display: grid; place-items: center; background: rgba(255,255,255,0.06); border: 1px solid var(--glass-border); color: var(--ink-dim); }
.step.active .step-dot { border-color: rgba(56,225,255,0.6); color: var(--accent-1); box-shadow: 0 0 14px rgba(56,225,255,0.3); }
.step.done .step-dot { border-color: rgba(61,220,151,0.6); color: var(--ok); }
.idx { font-size: 12px; }
.spinner { width: 12px; height: 12px; border-radius: 50%; border: 2px solid rgba(56,225,255,0.25); border-top-color: var(--accent-1); animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.preview-frame { width: 100%; height: 76vh; border: none; border-radius: 12px; background: #0a0f1e; }
</style>