<script setup lang="ts">
import { nextTick, shallowRef, watch, type Component } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'

const helpFiles = import.meta.glob<{ default: Component }>('../content/help/*.md')

const { locale } = useI18n()
const route = useRoute()
const content = shallowRef<Component | null>(null)

/** The router's own scrolling runs before the lazily loaded content exists, so the view scrolls itself. */
function scrollToHash(): void {
  if (!route.hash) return
  document.getElementById(decodeURIComponent(route.hash.slice(1)))?.scrollIntoView()
}

watch(
  locale,
  async (current) => {
    const load = helpFiles[`../content/help/${current}.md`] ?? helpFiles['../content/help/en.md']
    const loaded = (await load()).default
    // A quicker switch may have happened while this file was loading
    if (current !== locale.value) return
    content.value = loaded
    await nextTick()
    scrollToHash()
  },
  { immediate: true },
)

watch(() => route.hash, scrollToHash)
</script>

<template>
  <article class="help-view">
    <component
      :is="content"
      v-if="content"
    />
  </article>
</template>

<style scoped>
.help-view {
  max-width: 720px;
  margin: 0 auto;
}

.help-view :deep(h1),
.help-view :deep(h2),
.help-view :deep(h3) {
  color: var(--text-h);
  font-weight: 500;
  scroll-margin-top: 16px;
}

.help-view :deep(h2) {
  margin-top: 40px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border);
}

.help-view :deep(h3) {
  margin-top: 28px;
  margin-bottom: 4px;
}

.help-view :deep(p) {
  margin: 8px 0;
}
</style>
