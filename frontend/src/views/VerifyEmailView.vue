<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/auth'
import ResendVerificationForm from '../components/ResendVerificationForm.vue'

const { t } = useI18n()
const route = useRoute()
const authStore = useAuthStore()

onMounted(() => {
  const token = typeof route.query.token === 'string' ? route.query.token : ''
  void authStore.verifyEmail(token)
})
</script>

<template>
  <div class="verify-email-view">
    <h1>{{ t('auth.verifyEmail.title') }}</h1>
    <p v-if="authStore.verifyStatus === 'success'">
      {{ t('auth.verifyEmail.success') }}
      <router-link to="/login">
        {{ t('auth.verifyEmail.loginLink') }}
      </router-link>
    </p>
    <div v-else-if="authStore.verifyStatus === 'error'">
      <p role="alert">
        {{ t('auth.verifyEmail.error') }}
      </p>
      <ResendVerificationForm />
    </div>
  </div>
</template>

<style scoped>
.verify-email-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  max-width: 360px;
  margin: 0 auto;
  text-align: center;
}
</style>
