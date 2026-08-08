<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../api/adapter'
import { genId } from '../api/util'
import type { SectionData } from '../api/types'
import AppIcon from '../components/AppIcon.vue'
import GlassCard from '../components/GlassCard.vue'
import Modal from '../components/Modal.vue'
import SkeletonCard from '../components/SkeletonCard.vue'
import { toast } from '../composables/useToast'

const router = useRouter()
const sections = ref<SectionData[]>([])
const loading = ref(true)
const showCustom = ref(false)
const customName = ref('')
const customFields = ref('')
const seeding = ref(false)

async function seedDemo() {
  seeding.value = true
  try {
    await api.seedDemo()
    const filled = (await api.getSections()).filter((s) => s.entries.length).length
    toast(`已填充 ${filled} 个信息库示例数据，去「生成简历」体验一下吧`)
  } catch (err) {
    toast(`填充失败：${(err as Error).message}`, 'error')
  } finally {
    seeding.value = false
  }
}

async function load() {
  loading.value = true
  try {
    sections.value = await api.getSections()
  } finally {
    loading.value = false
  }
}
onMounted(load)

function countOf(s: SectionData): string {
  return s.single ? (s.entries.length ? '已填写' : '待填写') : `${s.entries.length} 条`
}

async function createCustom() {
  const name = customName.value.trim()
  const fieldNames = customFields.value.split(/[,，、]/).map((s) => s.trim()).filter(Boolean)
  if (!name) {
    toast('请填写信息库名称', 'error')
    return
  }
  if (!fieldNames.length) {
    toast('请至少填写一个字段', 'error')
    return
  }
  const section: SectionData = {
    id: genId(),
    name,
    icon: 'layers',
    desc: '自定义信息库',
    single: false,
    fields: fieldNames.map((label, i) => ({ key: `f${i}`, label, type: 'text' as const })),
    entries: [],
  }
  await api.saveSection(section)
  showCustom.value = false
  customName.value = ''
  customFields.value = ''
  toast(`已创建信息库「${name}」`)
  router.push(`/section/${section.id}`)
}

const tools = [
  { to: '/import', icon: 'upload', title: '导入文件', desc: '读取 .txt/.docx/.pdf，自动识别并填入对应信息库' },
  { to: '/templates', icon: 'layers', title: '模板管理', desc: '上传 Word/PDF 模板，识别占位符（填写在第二阶段生效）' },
  { to: '/generate', icon: 'sparkles', title: '生成简历', desc: '输入目标岗位，从信息库筛选素材生成简历' },
  { to: '/resumes', icon: 'folder', title: '简历库', desc: '已生成简历自动按岗位与内容相似度分组' },
  { to: '/settings', icon: 'sliders', title: '设置', desc: 'AI 配置、数据导出与本地数据管理' },
]
</script>

<template>
  <div>
    <section class="hero glass">
      <div class="hero-inner">
        <div class="hero-left">
          <div class="hero-kicker">RESUME INTELLIGENCE · DEMO</div>
          <h1 class="hero-title">让每一份简历，<br /><span>都流光溢彩。</span></h1>
          <p class="hero-sub">信息库 · 智能导入 · 岗位匹配生成 · 简历库分组 —— 一套为求职者打造的简历工作台。</p>
          <div class="hero-actions">
            <button class="btn btn-holo" type="button" :disabled="seeding" @click="seedDemo">
              <AppIcon name="sparkles" :size="16" /> {{ seeding ? '填充中…' : '一键体验' }}
            </button>
            <router-link to="/generate" class="btn btn-primary">✦ 生成简历</router-link>
            <router-link to="/resumes" class="btn btn-ghost">浏览简历库</router-link>
          </div>
        </div>
        <div class="hero-stats">
          <div class="stat"><b>8</b><span>内置信息库</span></div>
          <div class="stat"><b>3</b><span>简历风格</span></div>
          <div class="stat"><b>100%</b><span>数据本地</span></div>
        </div>
      </div>
    </section>

    <section class="block">
      <div class="block-head">
        <h2>信息库</h2>
        <button class="btn btn-ghost btn-sm" type="button" @click="showCustom = true">
          <AppIcon name="plus" :size="15" /> 新建信息库
        </button>
      </div>
      <div v-if="loading" class="grid">
        <SkeletonCard v-for="i in 8" :key="i" />
      </div>
      <div v-else class="grid">
        <GlassCard
          v-for="s in sections"
          :key="s.id"
          :to="`/section/${s.id}`"
          :icon="s.icon"
          :title="s.name"
          :desc="s.desc"
          :badge="countOf(s)"
        />
      </div>
    </section>

    <section class="block">
      <div class="block-head"><h2>工作台</h2></div>
      <div class="grid grid-tools">
        <GlassCard v-for="t in tools" :key="t.to" :to="t.to" :icon="t.icon" :title="t.title" :desc="t.desc" />
      </div>
    </section>

    <Modal v-if="showCustom" title="新建自定义信息库" width="560px" @close="showCustom = false">
      <div class="field"><label>信息库名称</label><input v-model="customName" placeholder="如：开源贡献" /></div>
      <div class="field"><label>字段（用逗号分隔）</label><input v-model="customFields" placeholder="如：项目名称, 仓库地址, 简介, 年份" /></div>
      <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 8px;">
        <button class="btn btn-ghost" type="button" @click="showCustom = false">取消</button>
        <button class="btn btn-primary" type="button" @click="createCustom">创建并进入</button>
      </div>
    </Modal>
  </div>
</template>

<style scoped>
.hero { padding: 42px 44px; margin-bottom: 34px; overflow: hidden; position: relative; }
.hero::before {
  content: ''; position: absolute; inset: 0;
  background:
    radial-gradient(420px 200px at 88% 12%, rgba(56, 225, 255, 0.18), transparent 65%),
    radial-gradient(460px 240px at 6% 100%, rgba(79, 124, 255, 0.16), transparent 65%);
  pointer-events: none;
}
.hero-inner { position: relative; display: flex; align-items: center; justify-content: space-between; gap: 30px; }
.hero-kicker { font-size: 11.5px; letter-spacing: 0.34em; color: var(--accent-1); margin-bottom: 16px; }
.hero-title { font-family: var(--font-display); font-size: clamp(34px, 5vw, 54px); font-weight: 800; line-height: 1.16; letter-spacing: 0.01em; }
.hero-title span {
  background: linear-gradient(100deg, var(--accent-1), var(--accent-2) 60%, var(--accent-3));
  -webkit-background-clip: text; background-clip: text; color: transparent;
}
.hero-sub { margin-top: 18px; color: var(--ink-dim); font-size: 15px; line-height: 1.8; max-width: 520px; }
.hero-actions { display: flex; gap: 12px; margin-top: 26px; flex-wrap: wrap; }
.hero-stats { display: flex; gap: 26px; }
.stat { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.stat b { font-family: var(--font-display); font-size: 30px; font-weight: 800; background: linear-gradient(100deg, #eaf0ff, var(--accent-1)); -webkit-background-clip: text; background-clip: text; color: transparent; }
.stat span { font-size: 12px; color: var(--ink-faint); letter-spacing: 0.08em; }
.block { margin-bottom: 34px; }
.block-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.block-head h2 { font-family: var(--font-display); font-size: 20px; font-weight: 700; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 16px; }
@media (max-width: 820px) {
  .hero { padding: 28px 22px; }
  .hero-inner { flex-direction: column; align-items: flex-start; }
  .hero-stats { width: 100%; justify-content: space-around; }
}
@media (max-width: 560px) {
  .hero-actions { flex-direction: column; }
  .hero-actions .btn { width: 100%; }
  .hero-title { font-size: 30px; }
}
</style>