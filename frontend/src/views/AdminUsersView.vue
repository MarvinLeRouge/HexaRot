<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAdminStore, type AdminUserSummary } from '../stores/admin'
import ConfirmDialog from '../components/ConfirmDialog.vue'

const { t } = useI18n()
const adminStore = useAdminStore()

const pendingDelete = ref<AdminUserSummary | null>(null)

onMounted(() => {
  void adminStore.fetchUsers()
})

function toggleActive(user: AdminUserSummary): void {
  adminStore.setActive(user.id, !user.active).catch(() => {})
}

function requestDelete(user: AdminUserSummary): void {
  pendingDelete.value = user
}

function cancelDelete(): void {
  pendingDelete.value = null
}

async function confirmDelete(): Promise<void> {
  if (!pendingDelete.value) return
  await adminStore.removeUser(pendingDelete.value.id).catch(() => {})
  pendingDelete.value = null
}
</script>

<template>
  <div class="admin-users-view">
    <h1>{{ t('admin.users.title') }}</h1>
    <p
      v-if="adminStore.status === 'error'"
      class="admin-users-view__error"
      role="alert"
    >
      {{ t('admin.users.error.prefix', { detail: adminStore.errorMessage }) }}
    </p>
    <table
      v-if="adminStore.users.length > 0"
      class="admin-users-view__table"
    >
      <thead>
        <tr>
          <th>{{ t('admin.users.table.email') }}</th>
          <th>{{ t('admin.users.table.role') }}</th>
          <th>{{ t('admin.users.table.verified') }}</th>
          <th>{{ t('admin.users.table.active') }}</th>
          <th>{{ t('admin.users.table.createdAt') }}</th>
          <th>{{ t('admin.users.table.actions') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="user in adminStore.users"
          :key="user.id"
        >
          <td>{{ user.email }}</td>
          <td>{{ user.role }}</td>
          <td>{{ user.emailVerified }}</td>
          <td>{{ user.active }}</td>
          <td>{{ user.createdAt }}</td>
          <td>
            <button
              type="button"
              @click="toggleActive(user)"
            >
              {{ user.active ? t('admin.users.actions.deactivate') : t('admin.users.actions.activate') }}
            </button>
            <button
              type="button"
              @click="requestDelete(user)"
            >
              {{ t('admin.users.actions.delete') }}
            </button>
          </td>
        </tr>
      </tbody>
    </table>
    <ConfirmDialog
      :open="pendingDelete !== null"
      :title="t('admin.users.confirmDelete.title')"
      :body="pendingDelete ? t('admin.users.confirmDelete.body', { email: pendingDelete.email }) : ''"
      :confirm-label="t('admin.users.confirmDelete.confirm')"
      :cancel-label="t('admin.users.confirmDelete.cancel')"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>

<style scoped>
.admin-users-view__table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 16px;
}

.admin-users-view__table th,
.admin-users-view__table td {
  text-align: left;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border);
}

.admin-users-view__error {
  color: var(--danger);
}
</style>
