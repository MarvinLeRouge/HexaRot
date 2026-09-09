<script setup lang="ts">
import { watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

// Handles the mid-session case: a token that dies while already on a
// protected route (api/client.ts's 401 handling clears it). The router
// guard already covers the pre-navigation case; this is the other half of
// spec Decision 5's single redirect owner.
watch(
  () => authStore.accessToken,
  (token, previousToken) => {
    if (previousToken && !token && route.meta.requiresAuth) {
      void router.push({ path: '/login', query: { redirect: route.fullPath } })
    }
  },
)

function handleLogout(): void {
  // Do not navigate here: authStore.logout() clears the token, which the
  // watcher above observes and redirects from on its own. A second
  // navigator racing the watcher's push would append an unwanted
  // ?redirect= query, violating spec Decision 5's single redirect owner.
  authStore.logout()
}
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
      <router-link
        v-if="authStore.user?.role === 'ADMIN'"
        to="/admin/users"
      >
        {{ t('nav.admin') }}
      </router-link>
      <span class="app-layout__nav-spacer" />
      <router-link
        v-if="!authStore.accessToken"
        to="/login"
      >
        {{ t('auth.nav.login') }}
      </router-link>
      <button
        v-else
        type="button"
        class="app-layout__logout"
        @click="handleLogout"
      >
        {{ t('auth.nav.logout') }}
      </button>
    </nav>
    <main class="app-layout__content">
      <router-view />
    </main>
  </div>
</template>

<style scoped>
.app-layout__nav {
  display: flex;
  align-items: center;
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

.app-layout__nav-spacer {
  flex: 1;
}

.app-layout__logout {
  background: none;
  border: none;
  color: var(--text-h);
  font-weight: 500;
  font-family: inherit;
  font-size: inherit;
  cursor: pointer;
  padding: 0;
}

.app-layout__content {
  padding: 16px;
}
</style>
