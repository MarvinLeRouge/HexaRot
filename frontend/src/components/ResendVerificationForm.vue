<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/auth'
import LoadingSpinner from './LoadingSpinner.vue'

const props = withDefaults(defineProps<{ initialEmail?: string }>(), { initialEmail: '' })

const { t } = useI18n()
const authStore = useAuthStore()
const email = ref(props.initialEmail)

const canSubmit = computed(() => authStore.resendStatus !== 'loading' && email.value.trim().length > 0)

// This component mounts fresh at two call sites (LoginForm, VerifyEmailView);
// without a reset, a resendStatus of 'success'/'error' from one mount leaks
// into the other's initial render.
onMounted(() => authStore.resetResend())

async function handleSubmit(): Promise<void> {
  if (!canSubmit.value) return
  await authStore.resendVerification(email.value)
}
</script>

<template>
  <form
    class="resend-verification-form"
    :aria-busy="authStore.resendStatus === 'loading'"
    @submit.prevent="handleSubmit"
  >
    <label>
      {{ t('auth.resendVerification.form.email.label') }}
      <input
        v-model="email"
        type="email"
        required
      >
    </label>
    <button
      type="submit"
      :disabled="!canSubmit"
    >
      <LoadingSpinner v-if="authStore.resendStatus === 'loading'" />
      {{ authStore.resendStatus === 'loading' ? t('auth.resendVerification.form.submit.loading') : t('auth.resendVerification.form.submit.label') }}
    </button>
    <p
      v-if="authStore.resendStatus === 'success'"
      class="resend-verification-form__success"
      role="status"
    >
      {{ t('auth.resendVerification.success') }}
    </p>
    <p
      v-else-if="authStore.resendStatus === 'error'"
      class="resend-verification-form__error"
      role="alert"
    >
      {{ t(`errors.${authStore.resendErrorKind}`) }}
    </p>
  </form>
</template>

<style scoped>
.resend-verification-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.resend-verification-form label {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.resend-verification-form__error {
  color: var(--danger);
}

.resend-verification-form__success {
  color: var(--text-muted);
}
</style>
