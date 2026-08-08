<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{ name: string; size?: number }>(), { size: 20 })

const ICONS: Record<string, string[]> = {
  user: ['<circle cx="12" cy="7" r="4"/>', '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>'],
  target: ['<circle cx="12" cy="12" r="10"/>', '<circle cx="12" cy="12" r="6"/>', '<circle cx="12" cy="12" r="2"/>'],
  cap: ['<path d="M22 10 12 5 2 10l10 5 10-5z"/>', '<path d="M6 12v5c3 3 9 3 12 0v-5"/>'],
  briefcase: ['<rect x="2" y="7" width="20" height="14" rx="2"/>', '<path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>'],
  rocket: ['<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>', '<path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>', '<path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/>', '<path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>'],
  zap: ['<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>'],
  badge: ['<circle cx="12" cy="8" r="6"/>', '<path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/>'],
  quote: ['<path d="M16 3a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h2v2a4 4 0 0 1-4 4v2a6 6 0 0 0 6-6V5a2 2 0 0 0-2-2h-2Z"/>', '<path d="M8 3a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h2v2a4 4 0 0 1-4 4v2a6 6 0 0 0 6-6V5a2 2 0 0 0-2-2H8Z"/>'],
  upload: ['<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>', '<polyline points="17 8 12 3 7 8"/>', '<line x1="12" y1="3" x2="12" y2="15"/>'],
  layers: ['<polygon points="12 2 2 7 12 12 22 7 12 2"/>', '<polyline points="2 17 12 22 22 17"/>', '<polyline points="2 12 12 17 22 12"/>'],
  sparkles: ['<path d="M12 3l1.9 5.8a2 2 0 0 0 1.3 1.3L21 12l-5.8 1.9a2 2 0 0 0-1.3 1.3L12 21l-1.9-5.8a2 2 0 0 0-1.3-1.3L3 12l5.8-1.9a2 2 0 0 0 1.3-1.3L12 3Z"/>'],
  folder: ['<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>'],
  sliders: ['<line x1="4" y1="21" x2="4" y2="14"/>', '<line x1="4" y1="10" x2="4" y2="3"/>', '<line x1="12" y1="21" x2="12" y2="12"/>', '<line x1="12" y1="8" x2="12" y2="3"/>', '<line x1="20" y1="21" x2="20" y2="16"/>', '<line x1="20" y1="12" x2="20" y2="3"/>', '<line x1="1" y1="14" x2="7" y2="14"/>', '<line x1="9" y1="8" x2="15" y2="8"/>', '<line x1="17" y1="16" x2="23" y2="16"/>'],
  plus: ['<line x1="12" y1="5" x2="12" y2="19"/>', '<line x1="5" y1="12" x2="19" y2="12"/>'],
  trash: ['<polyline points="3 6 5 6 21 6"/>', '<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>'],
  download: ['<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>', '<polyline points="7 10 12 15 17 10"/>', '<line x1="12" y1="15" x2="12" y2="3"/>'],
  eye: ['<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/>', '<circle cx="12" cy="12" r="3"/>'],
  close: ['<line x1="18" y1="6" x2="6" y2="18"/>', '<line x1="6" y1="6" x2="18" y2="18"/>'],
  check: ['<polyline points="20 6 9 17 4 12"/>'],
  arrow: ['<line x1="5" y1="12" x2="19" y2="12"/>', '<polyline points="12 5 19 12 12 19"/>'],
  doc: ['<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>', '<polyline points="14 2 14 8 20 8"/>'],
  edit: ['<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>', '<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>'],
  file: ['<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>', '<polyline points="14 2 14 8 20 8"/>', '<line x1="16" y1="13" x2="8" y2="13"/>', '<line x1="16" y1="17" x2="8" y2="17"/>'],
  sun: ['<circle cx="12" cy="12" r="4"/>', '<path d="M12 2v2"/>', '<path d="M12 20v2"/>', '<path d="m4.93 4.93 1.41 1.41"/>', '<path d="m17.66 17.66 1.41 1.41"/>', '<path d="M2 12h2"/>', '<path d="M20 12h2"/>', '<path d="m6.34 17.66-1.41 1.41"/>', '<path d="m19.07 4.93-1.41 1.41"/>'],
  moon: ['<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>'],
  search: ['<circle cx="11" cy="11" r="7"/>', '<line x1="21" y1="21" x2="16.65" y2="16.65"/>'],
  print: ['<polyline points="6 9 6 2 18 2 18 9"/>', '<path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>', '<rect x="6" y="14" width="12" height="8"/>'],
}

const html = computed(() => (ICONS[props.name] || []).join(''))
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    v-html="html"
  />
</template>