<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import { api } from '../api/adapter'
import { genId, str } from '../api/util'
import type { SectionData, SectionEntry } from '../api/types'
import AppIcon from '../components/AppIcon.vue'
import EmptyState from '../components/EmptyState.vue'
import FieldInput from '../components/FieldInput.vue'
import Modal from '../components/Modal.vue'
import { toast } from '../composables/useToast'

const props = defineProps<{ id: string }>()

const section = ref<SectionData | null>(null)
const loading = ref(true)

const editorOpen = ref(false)
const editingId = ref('')
const draft = reactive<Record<string, unknown>>({})

function draftFrom(entry?: SectionEntry): Record<string, unknown> {
  const base: Record<string, unknown> = {}
  if (section.value) {
    for (const field of section.value.fields) base[field.key] = entry ? str(entry[field.key]) : ''
  }
  return base
}

async function load() {
  loading.value = true
  try {
    const sections = await api.getSections()
    section.value = sections.find((s) => s.id === props.id) ?? null
  } finally {
    loading.value = false
  }
}
onMounted(load)
watch(() => props.id, load)

async function saveSingle() {
  if (!section.value) return
  const existing = section.value.entries[0]
  const entry: SectionEntry = { id: existing?.id ?? genId(), ...draftFrom(existing), ...draft }
  if (existing) await api.updateEntry(section.value.id, entry)
  else await api.addEntry(section.value.id, entry)
  toast('已保存')
  await load()
}

function openEditor(entry?: SectionEntry) {
  editingId.value = entry?.id ?? ''
  Object.keys(draft).forEach((k) => delete draft[k])
  Object.assign(draft, draftFrom(entry))
  editorOpen.value = true
}

async function saveEntry() {
  if (!section.value) return
  const isEdit = Boolean(editingId.value)
  const entry: SectionEntry = { id: editingId.value || genId(), ...draft }
  if (isEdit) await api.updateEntry(section.value.id, entry)
  else await api.addEntry(section.value.id, entry)
  editorOpen.value = false
  toast(isEdit ? '已更新' : '已新增')
  await load()
}

async function removeEntry(entry: SectionEntry) {
  if (!section.value) return
  if (!window.confirm('确定删除这条记录吗？')) return
  await api.deleteEntry(section.value.id, entry.id)
  toast('已删除', 'info')
  await load()
}

function summary(entry: SectionEntry): string {
  if (!section.value) return ''
  return section.value.fields
    .slice(0, 3)
    .map((f) => str(entry[f.key]))
    .filter(Boolean)
    .join(' · ')
}
</script>

<template>
  <div v-if="section">
    <div class="page-head">
      <div>
        <h1>{{ section.name }}</h1>
        <p>{{ section.desc }}</p>
      </div>
      <div style="display: flex; gap: 10px;">
        <button class="btn btn-ghost btn-sm" type="button" @click="$router.push('/')"><AppIcon name="arrow" :size="15" /> 返回首页</button>
        <button v-if="!section.single" class="btn btn-primary btn-sm" type="button" @click="openEditor()"><AppIcon name="plus" :size="15" /> 新增记录</button>
      </div>
    </div>

    <div v-if="loading" class="skeleton skel-card" style="height: 200px;"></div>

    <template v-else>
      <div v-if="section.single" class="glass panel">
        <div class="panel-title">资料</div>
        <div class="form-grid">
          <div
            v-for="field in section.fields"
            :key="field.key"
            class="field"
            :class="field.type === 'textarea' ? 'field-wide' : ''"
          >
            <label>{{ field.label }}</label>
            <FieldInput v-model="draft[field.key]" :field="field" />
          </div>
        </div>
        <div style="display: flex; justify-content: flex-end; margin-top: 8px;">
          <button class="btn btn-primary" type="button" :disabled="loading" @click="saveSingle">保存</button>
        </div>
      </div>

      <div v-else>
        <div v-if="section.entries.length" class="entry-grid">
          <div v-for="entry in section.entries" :key="entry.id" class="glass entry-card">
            <div class="entry-summary">{{ summary(entry) || '（空记录）' }}</div>
            <div class="entry-actions">
              <button class="icon-btn" type="button" title="编辑" @click="openEditor(entry)"><AppIcon name="edit" :size="16" /></button>
              <button class="icon-btn danger" type="button" title="删除" @click="removeEntry(entry)"><AppIcon name="trash" :size="16" /></button>
            </div>
          </div>
        </div>
        <EmptyState v-else icon="doc" title="还没有记录" desc="点击右上角「新增记录」，或到「导入文件」自动识别填入。">
          <button class="btn btn-primary" type="button" @click="openEditor()">新增第一条</button>
        </EmptyState>
      </div>
    </template>

    <Modal v-if="editorOpen" :title="editingId ? '编辑记录' : '新增记录'" width="720px" @close="editorOpen = false">
      <div class="form-grid">
        <div
          v-for="field in section.fields"
          :key="field.key"
          class="field"
          :class="field.type === 'textarea' ? 'field-wide' : ''"
        >
          <label>{{ field.label }}</label>
          <FieldInput v-model="draft[field.key]" :field="field" />
        </div>
      </div>
      <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 8px;">
        <button class="btn btn-ghost" type="button" @click="editorOpen = false">取消</button>
        <button class="btn btn-primary" type="button" @click="saveEntry">保存</button>
      </div>
    </Modal>
  </div>
</template>

<style scoped>
.panel { padding: 26px; }
.panel-title { font-family: var(--font-display); font-size: 16px; font-weight: 700; margin-bottom: 18px; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 16px; }
.field-wide { grid-column: 1 / -1; }
.entry-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; }
.entry-card { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 16px 18px; transition: border-color 0.25s; }
.entry-card:hover { border-color: rgba(56, 225, 255, 0.4); }
.entry-summary { font-size: 14px; color: var(--ink); line-height: 1.6; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.entry-actions { display: flex; gap: 6px; flex-shrink: 0; }
.icon-btn { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 9px; background: rgba(255,255,255,0.06); border: 1px solid var(--glass-border); color: var(--ink-dim); cursor: pointer; transition: all 0.2s; }
.icon-btn:hover { color: var(--accent-1); border-color: rgba(56,225,255,0.5); }
.icon-btn.danger:hover { color: var(--danger); border-color: rgba(255,107,139,0.5); }
@media (max-width: 640px) { .form-grid { grid-template-columns: 1fr; } }
</style>