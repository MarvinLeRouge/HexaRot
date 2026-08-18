<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <div class="app-layout">
    <nav class="app-layout__nav">
      <router-link to="/encode">
        {{ t('nav.encode') }}
      </router-link>
      <router-link to="/decode">
        {{ t('nav.decode') }}
      </router-link>
      <router-link to="/key">
        {{ t('nav.key') }}
      </router-link>
    </nav>
    <main class="app-layout__content">
      <router-view />
    </main>
  </div>
</template>

<style scoped>
.app-layout__nav {
  display: flex;
  gap: 16px;
  padding: 16px;
  border-bottom: 1px solid var(--border);
}

.app-layout__nav a {
  color: var(--text-h);
  text-decoration: none;
  font-weight: 500;
}

.app-layout__nav a.router-link-active {
  color: var(--accent);
}

.app-layout__content {
  padding: 16px;
}
</style>
