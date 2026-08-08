import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from './views/HomeView.vue'
import SectionEditor from './views/SectionEditor.vue'
import ImportView from './views/ImportView.vue'
import TemplatesView from './views/TemplatesView.vue'
import GenerateView from './views/GenerateView.vue'
import ResumeLibrary from './views/ResumeLibrary.vue'
import SettingsView from './views/SettingsView.vue'

export default createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/section/:id', name: 'section', component: SectionEditor, props: true },
    { path: '/import', name: 'import', component: ImportView },
    { path: '/templates', name: 'templates', component: TemplatesView },
    { path: '/generate', name: 'generate', component: GenerateView },
    { path: '/resumes', name: 'resumes', component: ResumeLibrary },
    { path: '/settings', name: 'settings', component: SettingsView },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})