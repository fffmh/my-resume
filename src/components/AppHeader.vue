<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()
const links = [
  { to: '/', label: '首页' },
  { to: '/generate', label: '生成简历' },
  { to: '/resumes', label: '简历库' },
  { to: '/settings', label: '设置' },
]
</script>

<template>
  <header class="header">
    <router-link to="/" class="logo">
      <span class="logo-mark">✦</span>
      <span class="logo-text">流光简历</span>
      <span class="logo-sub">RESUME.GALLERY</span>
    </router-link>
    <nav class="nav" aria-label="主导航">
      <router-link v-for="l in links" :key="l.to" :to="l.to" class="nav-link" :class="{ active: route.path === l.to }">
        {{ l.label }}
      </router-link>
    </nav>
  </header>
</template>

<style scoped>
.header {
  position: relative; z-index: 20;
  display: flex; align-items: center; justify-content: space-between; gap: 20px;
  padding: 14px 26px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  background: rgba(5, 7, 15, 0.55);
  backdrop-filter: blur(18px);
}
.logo { display: flex; align-items: baseline; gap: 10px; text-decoration: none; color: var(--ink); }
.logo-mark {
  align-self: center; font-size: 20px; color: var(--accent-1);
  text-shadow: 0 0 18px rgba(56, 225, 255, 0.8);
}
.logo-text { font-family: var(--font-display); font-size: 20px; font-weight: 800; letter-spacing: 0.04em;
  background: linear-gradient(100deg, #eaf0ff, var(--accent-1) 60%, var(--accent-2));
  -webkit-background-clip: text; background-clip: text; color: transparent; }
.logo-sub { font-size: 10px; letter-spacing: 0.28em; color: var(--ink-faint); }
.nav { display: flex; gap: 6px; }
.nav-link {
  padding: 8px 15px; border-radius: 10px; font-size: 14px; color: var(--ink-dim);
  text-decoration: none; transition: all 0.25s var(--ease);
}
.nav-link:hover { color: var(--ink); background: rgba(255, 255, 255, 0.06); }
.nav-link.active { color: #aef3ff; background: rgba(56, 225, 255, 0.1); border: 1px solid rgba(56, 225, 255, 0.25); }
@media (max-width: 640px) {
  .header { flex-direction: column; align-items: flex-start; padding: 14px 18px; }
  .logo-sub { display: none; }
}
</style>