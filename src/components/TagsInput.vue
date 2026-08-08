<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{ modelValue: string; placeholder?: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const input = ref('')
const tags = ref<string[]>(props.modelValue ? props.modelValue.split(/[,，、]/).map((s) => s.trim()).filter(Boolean) : [])

watch(() => props.modelValue, (v) => {
  const next = v ? v.split(/[,，、]/).map((s) => s.trim()).filter(Boolean) : []
  if (next.join(',') !== tags.value.join(',')) tags.value = next
})

function sync() {
  emit('update:modelValue', tags.value.join(', '))
}
function add() {
  const value = input.value.trim()
  if (value && !tags.value.includes(value)) {
    tags.value.push(value)
    sync()
  }
  input.value = ''
}
function remove(index: number) {
  tags.value.splice(index, 1)
  sync()
}
</script>

<template>
  <div class="tags-editor">
    <span v-for="(tag, i) in tags" :key="tag + i" class="tag">
      {{ tag }}
      <button type="button" aria-label="移除" @click="remove(i)">✕</button>
    </span>
    <input
      v-model="input"
      class="tags-input"
      :placeholder="placeholder || '输入后回车添加'"
      @keydown.enter.prevent="add"
      @keydown.space.prevent="add"
      @blur="add"
    />
  </div>
</template>