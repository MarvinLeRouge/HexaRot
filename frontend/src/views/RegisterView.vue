<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/auth'
import RegisterForm from '../components/RegisterForm.vue'

const { t } = useI18n()
const authStore = useAuthStore()
</script>

<template>
  <div class="register-view">
    <h1>{{ t('auth.register.title') }}</h1>
    <RegisterForm v-if="authStore.registerStatus !== 'success'" />
    <div
      v-else
      class="register-view__success"
      role="status"
    >
      <h2>{{ t('auth.register.success.heading') }}</h2>
      <p>{{ t('auth.register.success.body') }}</p>
    </div>
  </div>
</template>

<style scoped>
.register-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  max-width: 360px;
  margin: 0 auto;
  text-align: center;
}
</style>
