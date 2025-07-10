import 'virtual:uno.css'
import '@/styles/main.scss'
// 导入 highlight.js 的基础样式
import 'highlight.js/styles/github.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
