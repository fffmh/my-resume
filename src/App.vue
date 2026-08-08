<script setup lang="ts">
import { useRoute } from 'vue-router'
import AppHeader from './components/AppHeader.vue'
import ToastStack from './components/ToastStack.vue'

const route = useRoute()
</script>

<template>
  <div class="app">
    <div class="bg bg-orb-1"></div>
    <div class="bg bg-orb-2"></div>
    <div class="bg bg-orb-3"></div>
    <div class="bg bg-grid"></div>
    <div class="bg bg-dataflow"></div>
    <div class="scanline" aria-hidden="true"></div>

    <div class="demo-banner">演示版 · 数据仅保存在当前浏览器（IndexedDB），跨设备或清缓存会丢失；第二阶段将接入真实后端与 AI</div>
    <AppHeader />

    <main class="main" :key="route.fullPath">
      <router-view v-slot="{ Component }">
        <transition name="fade-slide" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

    <footer class="footer">流光简历 · Vue 3 + TypeScript · 数据 100% 本地 · 前端展示版</footer>
    <ToastStack />
  </div>
</template>

<style scoped>
.app { min-height: 100vh; display: flex; flex-direction: column; position: relative; }
.footer { position: relative; z-index: 1; text-align: center; padding: 26px; font-size: 12px; color: var(--ink-faint); letter-spacing: 0.14em; }
</style>