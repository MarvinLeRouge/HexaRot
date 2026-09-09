<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/auth'
import { evaluatePassword, isPasswordValid } from '../utils/password-strength'
import LoadingSpinner from './LoadingSpinner.vue'

const { t } = useI18n()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')

const criteria = computed(() => evaluatePassword(password.value))

const canSubmit = computed(() => {
  return authStore.registerStatus !== 'loading' && email.value.trim().length > 0 && isPasswordValid(password.value)
})

const errorMessage = computed(() => {
  const kind = authStore.registerErrorKind
  if (!kind) return null
  if (kind === 'duplicateEmail') return t('auth.register.form.error.duplicateEmail')
  if (kind === 'validation') return authStore.registerErrorMessage ?? t('errors.unknown')
  return t(`errors.${kind}`)
})

async function handleSubmit(): Promise<void> {
  if (!canSubmit.value) return
  await authStore.register(email.value, password.value)
}
</script>

<template>
  <form
    class="register-form"
    :aria-busy="authStore.registerStatus === 'loading'"
    @submit.prevent="handleSubmit"
  >
    <label>
      {{ t('auth.register.form.email.label') }}
      <input
        v-model="email"
        type="email"
        autocomplete="username"
        required
      >
    </label>
    <label>
      {{ t('auth.register.form.password.label') }}
      <input
        v-model="password"
        type="password"
        autocomplete="new-password"
        required
      >
    </label>
    <ul class="register-form__criteria">
      <li :class="{ 'register-form__criteria-met': criteria.minLength }">
        {{ t('auth.register.form.password.criteria.minLength') }}
      </li>
      <li :class="{ 'register-form__criteria-met': criteria.lowercase }">
        {{ t('auth.register.form.password.criteria.lowercase') }}
      </li>
      <li :class="{ 'register-form__criteria-met': criteria.uppercase }">
        {{ t('auth.register.form.password.criteria.uppercase') }}
      </li>
      <li :class="{ 'register-form__criteria-met': criteria.digit }">
        {{ t('auth.register.form.password.criteria.digit') }}
      </li>
      <li :class="{ 'register-form__criteria-met': criteria.special }">
        {{ t('auth.register.form.password.criteria.special') }}
      </li>
    </ul>
    <button
      type="submit"
      :disabled="!canSubmit"
    >
      <LoadingSpinner v-if="authStore.registerStatus === 'loading'" />
      {{ authStore.registerStatus === 'loading' ? t('auth.register.form.submit.loading') : t('auth.register.form.submit.label') }}
    </button>
    <p
      v-if="authStore.registerStatus === 'error' && errorMessage"
      class="register-form__error"
      role="alert"
    >
      {{ errorMessage }}
    </p>
  </form>
</template>

<style scoped>
.register-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.register-form label {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.register-form__criteria {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  color: var(--text-muted);
  font-size: 0.9em;
}

.register-form__criteria-met {
  color: var(--accent);
}

.register-form__error {
  color: var(--danger);
}
</style>
