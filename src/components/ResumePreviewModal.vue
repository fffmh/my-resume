<script setup lang="ts">
import type { ResumeRecord } from '../api/types'
import Modal from './Modal.vue'

defineProps<{ record: ResumeRecord }>()
const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <Modal title="简历预览" width="860px" @close="emit('close')">
    <iframe :srcdoc="record.html" class="preview-frame" title="简历预览" />
    <div class="preview-bar">
      <span class="chip">{{ record.styleName }}</span>
      <span class="chip">目标岗位：{{ record.targetJob || '未填写' }}</span>
    </div>
  </Modal>
</template>

<style scoped>
.preview-frame { width: 100%; height: 72vh; border: none; border-radius: 12px; background: #0a0f1e; }
.preview-bar { display: flex; gap: 8px; margin-top: 14px; flex-wrap: wrap; }
</style>