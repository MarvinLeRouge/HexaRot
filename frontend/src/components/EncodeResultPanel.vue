<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { EncodeResult } from '../stores/encode'

const props = defineProps<{
  result: EncodeResult
}>()

const { t } = useI18n()

const pngDataUrl = computed(() => `data:image/png;base64,${props.result.png}`)

const copyState = ref<'idle' | 'copied'>('idle')

async function copyKey(): Promise<void> {
  await navigator.clipboard.writeText(props.result.key)
  copyState.value = 'copied'
  setTimeout(() => {
    copyState.value = 'idle'
  }, 2000)
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function downloadPng(): void {
  const byteChars = atob(props.result.png)
  const byteNumbers = new Array<number>(byteChars.length)
  for (let i = 0; i < byteChars.length; i++) {
    byteNumbers[i] = byteChars.charCodeAt(i)
  }
  triggerDownload(new Blob([new Uint8Array(byteNumbers)], { type: 'image/png' }), 'hexarot-cryptogram.png')
}

function downloadSvg(): void {
  triggerDownload(new Blob([props.result.svg], { type: 'image/svg+xml' }), 'hexarot-cryptogram.svg')
}
</script>

<template>
  <section class="encode-result-panel">
    <div class="encode-result-panel__previews">
      <img
        :src="pngDataUrl"
        :alt="t('encode.result.pngAlt')"
        class="encode-result-panel__png"
      >
      <!-- eslint-disable-next-line vue/no-v-html -- result.svg is generated exclusively by this project's own backend renderer, never from user input, so it is a trusted string. -->
      <div
        class="encode-result-panel__svg"
        v-html="result.svg"
      />
    </div>

    <div class="encode-result-panel__key">
      <span>{{ t('encode.result.keyLabel') }}: <code>{{ result.key }}</code></span>
      <button
        type="button"
        @click="copyKey"
      >
        {{ copyState === 'copied' ? t('encode.result.copied') : t('encode.result.copy') }}
      </button>
    </div>

    <div
      v-if="result.warnings.length > 0"
      class="encode-result-panel__warnings"
      role="alert"
    >
      <p>{{ t('encode.result.warningsHeading') }}</p>
      <ul>
        <li
          v-for="warning in result.warnings"
          :key="warning"
        >
          {{ warning }}
        </li>
      </ul>
    </div>

    <div
      v-if="result.unknownChars.length > 0"
      class="encode-result-panel__unknown-chars"
    >
      <p>{{ t('encode.result.unknownCharsExplanation') }}</p>
      <ul>
        <li
          v-for="char in result.unknownChars"
          :key="char"
        >
          {{ char }}
        </li>
      </ul>
    </div>

    <div class="encode-result-panel__downloads">
      <button
        type="button"
        @click="downloadPng"
      >
        {{ t('encode.result.downloadPng') }}
      </button>
      <button
        type="button"
        @click="downloadSvg"
      >
        {{ t('encode.result.downloadSvg') }}
      </button>
    </div>
  </section>
</template>

<style scoped>
.encode-result-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 480px;
}

.encode-result-panel__previews {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.encode-result-panel__png {
  image-rendering: pixelated;
  max-width: 200px;
}

.encode-result-panel__key {
  display: flex;
  align-items: center;
  gap: 8px;
}

.encode-result-panel__warnings {
  border: 1px solid #c0392b;
  border-radius: 4px;
  padding: 8px 12px;
}
</style>
