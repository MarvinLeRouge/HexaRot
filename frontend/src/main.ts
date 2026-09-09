import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import App from './App.vue'
import { router } from './router'
import { useAuthStore } from './stores/auth'
import en from './locales/en.json'
import './style.css'

const pinia = createPinia()

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  fallbackLocale: 'en',
  messages: { en },
})

const app = createApp(App)
app.use(pinia)
app.use(i18n)

// Router guards read authStore.accessToken/user - restoring the session
// before the router is installed guarantees the very first navigation sees
// a settled auth state instead of racing the restore.
const authStore = useAuthStore()
await authStore.restoreSession()

app.use(router)
app.mount('#app')
