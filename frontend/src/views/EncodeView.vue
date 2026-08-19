<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useEncodeStore } from '../stores/encode'
import EncodeParamsForm from '../components/EncodeParamsForm.vue'
import EncodeResultPanel from '../components/EncodeResultPanel.vue'

const store = useEncodeStore()
const { t } = useI18n()
</script>

<template>
  <div class="encode-view">
    <h1>{{ t('encode.title') }}</h1>
    <EncodeParamsForm />
    <p
      v-if="store.status === 'error'"
      class="encode-view__error"
      role="alert"
    >
      {{ store.errorMessage ?? t(`errors.${store.errorCode}`) }}
    </p>
    <EncodeResultPanel
      v-if="store.status === 'success' && store.result"
      :result="store.result"
    />
  </div>
</template>

<style scoped>
.encode-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
}

.encode-view__error {
  color: #c0392b;
}
</style>
