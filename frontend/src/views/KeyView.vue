<script setup lang="ts">
import { onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useKeyStore } from '../stores/key'
import KeyGeneratorForm from '../components/KeyGeneratorForm.vue'
import KeyParserForm from '../components/KeyParserForm.vue'

const store = useKeyStore()
const { t } = useI18n()

onUnmounted(() => {
  store.reset()
})
</script>

<template>
  <div class="key-view">
    <h1>{{ t('key.title') }}</h1>
    <div class="key-view__body">
      <KeyGeneratorForm />
      <KeyParserForm />
    </div>
  </div>
</template>

<style scoped>
.key-view {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.key-view h1 {
  align-self: center;
}

.key-view__body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 32px;
}

@media (min-width: 900px) {
  .key-view h1 {
    align-self: flex-start;
  }

  .key-view__body {
    display: grid;
    grid-template-columns: 1fr 1fr;
    align-items: start;
    gap: 24px;
  }
}
</style>
