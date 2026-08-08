<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

const props = defineProps<{ score: number }>()

const displayed = ref(0)
onMounted(() => {
  const target = Math.max(0, Math.min(100, props.score))
  const start = performance.now()
  const duration = 900
  const step = (t: number) => {
    const p = Math.min(1, (t - start) / duration)
    displayed.value = Math.round(target * (1 - Math.pow(1 - p, 3)))
    if (p < 1) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
})

const R = 52
const C = 2 * Math.PI * R
const tone = computed(() => {
  if (props.score >= 80) return 'high'
  if (props.score >= 60) return 'mid'
  return 'low'
})
</script>

<template>
  <div class="gauge" :class="`tone-${tone}`">
    <svg viewBox="0 0 120 120" class="gauge-svg" aria-hidden="true">
      <defs>
        <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#38e1ff" />
          <stop offset="100%" stop-color="#4f7cff" />
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" :r="R" fill="none" stroke="rgba(56,225,255,.12)" stroke-width="8" />
      <circle
        cx="60" cy="60" :r="R" fill="none" stroke="url(#gaugeGrad)" stroke-width="8" stroke-linecap="round"
        :stroke-dasharray="C" :stroke-dashoffset="C * (1 - displayed / 100)" transform="rotate(-90 60 60)"
        style="filter: drop-shadow(0 0 8px rgba(56,225,255,.55));"
      />
    </svg>
    <div class="gauge-num">
      <b class="mono">{{ displayed }}</b>
      <span>/100</span>
    </div>
    <div class="gauge-label">岗位匹配评分</div>
  </div>
</template>

<style scoped>
.gauge { position: relative; width: 150px; height: 150px; flex-shrink: 0; }
.gauge-svg { width: 100%; height: 100%; }
.gauge-num { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; gap: 2px; }
.gauge-num b { font-family: var(--font-display); font-size: 34px; font-weight: 800; color: var(--ink); text-shadow: 0 0 18px rgba(56,225,255,.5); }
.gauge-num span { font-size: 13px; color: var(--ink-dim); margin-top: 12px; }
.gauge-label { position: absolute; left: 0; right: 0; bottom: 16px; text-align: center; font-size: 11px; letter-spacing: .12em; color: var(--ink-faint); }
.tone-high .gauge-num b { color: var(--ok); text-shadow: 0 0 18px rgba(61,220,151,.5); }
.tone-low .gauge-num b { color: var(--danger); text-shadow: 0 0 18px rgba(255,107,139,.5); }
</style>