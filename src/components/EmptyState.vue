<script setup lang="ts">
import AppIcon from './AppIcon.vue'
withDefaults(defineProps<{ icon?: string; title: string; desc: string }>(), { icon: 'doc' })
</script>

<template>
  <div class="empty glass">
    <div class="empty-icon"><AppIcon :name="icon" :size="30" /></div>
    <h3>{{ title }}</h3>
    <p>{{ desc }}</p>
    <div style="margin-top: 18px;"><slot /></div>
  </div>
</template>