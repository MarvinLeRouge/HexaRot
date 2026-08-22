<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEncodeStore } from '../stores/encode'
import type { EncodeResult } from '../stores/encode'

const props = withDefaults(
  defineProps<{
    result: EncodeResult
    stale?: boolean
  }>(),
  { stale: false },
)

const store = useEncodeStore()
const { t } = useI18n()

function reencode(): void {
  void store.submit()
}

const copyState = ref<'idle' | 'copied' | 'error'>('idle')

async function copyKey(): Promise<void> {
  try {
    await navigator.clipboard.writeText(props.result.key)
    copyState.value = 'copied'
  } catch {
    copyState.value = 'error'
  }
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
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

function downloadFilename(extension: string): string {
  // Never include the key here: this file is the artifact the user hands to
  // someone else, and a cipher's key must travel on a separate channel from
  // the cryptogram it decrypts. Uses the snapshotted result size, not the
  // live form field, so a filename never claims a size that doesn't match
  // the cryptogram actually inside it.
  return `hexarot-${props.result.size}.${extension}`
}

function downloadPng(): void {
  const byteChars = atob(props.result.png)
  const byteNumbers = new Array<number>(byteChars.length)
  for (let i = 0; i < byteChars.length; i++) {
    byteNumbers[i] = byteChars.charCodeAt(i)
  }
  triggerDownload(new Blob([new Uint8Array(byteNumbers)], { type: 'image/png' }), downloadFilename('png'))
}

function downloadSvg(): void {
  triggerDownload(new Blob([props.result.svg], { type: 'image/svg+xml' }), downloadFilename('svg'))
}
</script>

<template>
  <section
    class="encode-result-panel"
    role="region"
    tabindex="-1"
    aria-live="polite"
    :aria-label="t('encode.result.regionLabel')"
  >
    <div
      v-if="stale"
      class="encode-result-panel__stale-notice"
      role="status"
    >
      <p>{{ t('encode.result.staleNotice') }}</p>
      <button
        type="button"
        class="btn-primary"
        @click="reencode"
      >
        {{ t('encode.result.reencode') }}
      </button>
    </div>

    <div
      class="encode-result-panel__content"
      :class="{ 'encode-result-panel__content--stale': stale }"
    >
      <div class="encode-result-panel__preview">
        <!-- eslint-disable-next-line vue/no-v-html, vue/max-attributes-per-line -- result.svg is generated exclusively by this project's own backend renderer, never from user input, so it is a trusted string. -->
        <div class="encode-result-panel__svg" v-html="result.svg" />
        <span
          v-if="stale"
          class="encode-result-panel__stale-badge"
        >
          {{ t('encode.result.staleBadge') }}
        </span>
      </div>

      <div class="encode-result-panel__key">
        <span class="encode-result-panel__key-label">{{ t('encode.result.keyLabel') }}</span>
        <code class="encode-result-panel__key-value">{{ result.key }}</code>
        <p class="encode-result-panel__key-size">
          {{ t('encode.result.sizeLabel') }}: <strong>{{ t(`encode.form.size.${result.size}`) }}</strong>
        </p>
        <p class="encode-result-panel__key-hint">
          {{ t('encode.result.keyHint') }}
        </p>
        <button
          type="button"
          class="btn-primary"
          :disabled="stale"
          @click="copyKey"
        >
          {{ copyState === 'copied' ? t('encode.result.copied') : copyState === 'error' ? t('encode.result.copyError') : t('encode.result.copy') }}
        </button>
      </div>

      <div
        v-if="result.warnings.length > 0"
        class="encode-result-panel__warnings"
        role="alert"
      >
        <p>{{ t('encode.result.warningsHeading') }}</p>
        <p>{{ t('encode.result.warningsExplanation') }}</p>
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
          class="btn-secondary"
          :disabled="stale"
          @click="downloadPng"
        >
          {{ t('encode.result.downloadPng') }}
        </button>
        <button
          type="button"
          class="btn-secondary"
          :disabled="stale"
          @click="downloadSvg"
        >
          {{ t('encode.result.downloadSvg') }}
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.encode-result-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 480px;
  width: 100%;
}

.encode-result-panel__stale-notice {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border: 1px solid var(--warning-border);
  background: var(--warning-bg);
  border-radius: 8px;
}

.encode-result-panel__stale-notice p {
  margin: 0;
  flex: 1;
}

.encode-result-panel__content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/*
 * The cryptogram's cell colors are the message - dimming them with opacity
 * would display factually wrong colors while claiming to just mark the
 * result "stale". The preview stays at full color fidelity and gets a
 * corner badge instead. The key card gets a dashed outline instead of
 * opacity too: opacity on text has repeatedly failed WCAG contrast in past
 * critiques (round 4, 5, 6), and there's no reason "this may be outdated"
 * should also make the key harder to read.
 */
.encode-result-panel__content--stale .encode-result-panel__key {
  border-style: dashed;
  border-color: var(--warning-border);
  background: transparent;
}

.encode-result-panel__preview {
  position: relative;
  display: flex;
  justify-content: center;
  padding: 20px;
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: var(--shadow);
}

.encode-result-panel__stale-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 2px 8px;
  border: 1px solid var(--warning-border);
  border-radius: 4px;
  background: var(--warning-bg);
  color: var(--text-h);
  font-size: 0.75em;
  font-weight: 600;
}

.encode-result-panel__svg {
  width: 100%;
  max-width: 280px;
}

.encode-result-panel__svg :deep(svg) {
  width: 100%;
  height: auto;
  display: block;
}

.encode-result-panel__key {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  padding: 16px;
  border: 1px solid var(--accent-border);
  border-radius: 8px;
  background: var(--accent-bg);
}

.encode-result-panel__key-label {
  font-size: 0.8em;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-h);
}

.encode-result-panel__key-value {
  font-size: 1.3em;
  padding: 0;
  background: transparent;
  word-break: break-all;
}

.encode-result-panel__key-size {
  margin: 0;
  font-size: 0.9em;
  color: var(--text);
}

.encode-result-panel__key-hint {
  margin: 0;
  font-size: 0.9em;
  color: var(--text);
}

.encode-result-panel__warnings {
  border: 1px solid var(--warning-border);
  background: var(--warning-bg);
  border-radius: 4px;
  padding: 8px 12px;
}

.encode-result-panel__downloads {
  display: flex;
  gap: 12px;
}
</style>
