<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <div class="admin-users-view">
    <h1>{{ t('admin.users.title') }}</h1>
  </div>
</template>
