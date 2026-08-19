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
    <KeyGeneratorForm />
    <KeyParserForm />
  </div>
</template>

<style scoped>
.key-view {
  display: flex;
  flex-direction: column;
  gap: 32px;
}
</style>
