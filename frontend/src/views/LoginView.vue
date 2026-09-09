<script setup lang="ts">
import { watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/auth'
import LoginForm from '../components/LoginForm.vue'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

watch(
  () => authStore.loginStatus,
  (status) => {
    if (status === 'success') {
      const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/encode'
      void router.push(redirect)
    }
  },
)
</script>

<template>
  <div class="login-view">
    <h1>{{ t('auth.login.title') }}</h1>
    <LoginForm />
    <router-link to="/register">
      {{ t('auth.register.title') }}
    </router-link>
  </div>
</template>

<style scoped>
.login-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  max-width: 360px;
  margin: 0 auto;
}
</style>
