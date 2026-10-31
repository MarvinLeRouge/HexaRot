<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, saveLocale, type Locale } from '../i18n/locale'

const { t, locale } = useI18n()

// shortcut: toggles between exactly two locales, switch to a menu if a third is added
const otherLocale = computed<Locale>(() => SUPPORTED_LOCALES.find((candidate) => candidate !== locale.value) ?? DEFAULT_LOCALE)

function switchLocale(): void {
  // Read once: otherLocale flips as soon as locale changes
  const next = otherLocale.value
  locale.value = next
  saveLocale(next)
}
</script>

<template>
  <button
    type="button"
    class="language-switcher"
    :lang="otherLocale"
    :aria-label="t('language.switchTo', {}, { locale: otherLocale })"
    @click="switchLocale"
  >
    {{ t('language.name', {}, { locale: otherLocale }) }}
  </button>
</template>

<style scoped>
.language-switcher {
  background: none;
  border: none;
  color: var(--text-h);
  font-weight: 500;
  font-family: inherit;
  font-size: inherit;
  cursor: pointer;
  padding: 0;
}
</style>
