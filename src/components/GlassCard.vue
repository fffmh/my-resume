<script setup lang="ts">
import AppIcon from './AppIcon.vue'
withDefaults(defineProps<{
  title: string
  desc: string
  icon: string
  to?: string
  badge?: string
}>(), { to: '', badge: '' })
</script>

<template>
  <router-link v-if="to" :to="to" class="glass card-link">
    <div class="card-icon"><AppIcon :name="icon" :size="22" /></div>
    <div class="card-title">{{ title }}</div>
    <div class="card-desc">{{ desc }}</div>
    <span v-if="badge" class="card-badge">{{ badge }}</span>
  </router-link>
  <button v-else type="button" class="glass card-link card-btn">
    <div class="card-icon"><AppIcon :name="icon" :size="22" /></div>
    <div class="card-title">{{ title }}</div>
    <div class="card-desc">{{ desc }}</div>
  </button>
</template>

<style scoped>
.card-btn { width: 100%; text-align: left; font-family: var(--font-body); cursor: pointer; }
</style>