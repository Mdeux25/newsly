import { createApp } from 'vue'
import App from './App.vue'
import { createI18n } from './i18n'

// Import Mobile-First Theme CSS (replaces Bootstrap)
import './styles/mobile-first-theme.css'
import 'bootstrap-icons/font/bootstrap-icons.css'

const app = createApp(App)

// Add i18n plugin
const i18n = createI18n()
app.config.globalProperties.$t = i18n.t
app.config.globalProperties.$i18n = i18n

app.mount('#app')
