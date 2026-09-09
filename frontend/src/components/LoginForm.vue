<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/auth'
import LoadingSpinner from './LoadingSpinner.vue'
import ResendVerificationForm from './ResendVerificationForm.vue'

const { t } = useI18n()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')

const canSubmit = computed(() => {
  return authStore.loginStatus !== 'loading' && email.value.trim().length > 0 && password.value.length > 0
})

const errorMessage = computed(() => {
  const kind = authStore.loginErrorKind
  if (!kind) return null
  if (kind === 'network' || kind === 'unknown') return t(`errors.${kind}`)
  return t(`auth.login.form.error.${kind}`)
})

async function handleSubmit(): Promise<void> {
  if (!canSubmit.value) return
  await authStore.login(email.value, password.value)
}
</script>

<template>
  <form
    class="login-form"
    :aria-busy="authStore.loginStatus === 'loading'"
    @submit.prevent="handleSubmit"
  >
    <label>
      {{ t('auth.login.form.email.label') }}
      <input
        v-model="email"
        type="email"
        autocomplete="username"
        required
      >
    </label>
    <label>
      {{ t('auth.login.form.password.label') }}
      <input
        v-model="password"
        type="password"
        autocomplete="current-password"
        required
      >
    </label>
    <button
      type="submit"
      :disabled="!canSubmit"
    >
      <LoadingSpinner v-if="authStore.loginStatus === 'loading'" />
      {{ authStore.loginStatus === 'loading' ? t('auth.login.form.submit.loading') : t('auth.login.form.submit.label') }}
    </button>
    <p
      v-if="authStore.loginStatus === 'error' && errorMessage"
      class="login-form__error"
      role="alert"
    >
      {{ errorMessage }}
    </p>
    <ResendVerificationForm
      v-if="authStore.loginErrorKind === 'unverified'"
      :initial-email="email"
    />
  </form>
</template>

<style scoped>
.login-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.login-form label {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.login-form__error {
  color: var(--danger);
}
</style>
