<script setup lang="ts">
import { computed } from 'vue'
import type { FieldDef } from '../api/types'
import TagsInput from './TagsInput.vue'

const props = defineProps<{ field: FieldDef; modelValue: unknown }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const value = computed<string>({
  get: () => (props.modelValue === undefined || props.modelValue === null ? '' : String(props.modelValue)),
  set: (v: string) => emit('update:modelValue', v),
})
</script>

<template>
  <textarea v-if="field.type === 'textarea'" v-model="value" :placeholder="field.placeholder" rows="5" />
  <select v-else-if="field.type === 'select'" v-model="value">
    <option value="">请选择</option>
    <option v-for="opt in field.options" :key="opt" :value="opt">{{ opt }}</option>
  </select>
  <TagsInput v-else-if="field.type === 'tags'" v-model="value" :placeholder="field.placeholder" />
  <input v-else v-model="value" :type="field.type === 'date' ? 'date' : 'text'" :placeholder="field.placeholder" />
</template>