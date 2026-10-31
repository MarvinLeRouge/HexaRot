import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import App from './App.vue'
import { router } from './router'
import { useAuthStore } from './stores/auth'
import en from './locales/en.json'
import fr from './locales/fr.json'
import { DEFAULT_LOCALE, applyDocumentLanguage, loadStoredLocale, resolveInitialLocale } from './i18n/locale'
import './style.css'

const pinia = createPinia()

const locale = resolveInitialLocale(loadStoredLocale(), navigator.languages)
applyDocumentLanguage(locale)

const i18n = createI18n({
  legacy: false,
  locale,
  fallbackLocale: DEFAULT_LOCALE,
  messages: { en, fr },
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
