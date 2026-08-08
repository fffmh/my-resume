<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import AppIcon from './AppIcon.vue'

const props = withDefaults(defineProps<{ title: string; width?: string }>(), { width: '920px' })
const emit = defineEmits<{ close: [] }>()

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <Teleport to="body">
    <div class="modal-overlay" @click.self="emit('close')">
      <div class="modal" :style="{ width: props.width }" role="dialog" aria-modal="true" :aria-label="title">
        <div class="modal-head">
          <h3>{{ title }}</h3>
          <button class="icon-btn" type="button" aria-label="关闭" @click="emit('close')"><AppIcon name="close" :size="18" /></button>
        </div>
        <div class="modal-body"><slot /></div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.icon-btn { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 9px; background: var(--glass-bg); border: 1px solid var(--line); color: var(--ink-dim); cursor: pointer; transition: all 0.2s; }
.icon-btn:hover { color: var(--ink); border-color: rgba(56,225,255,0.5); }
</style>