<script setup lang="ts">
defineProps<{
  open: boolean
  title: string
  body: string
  confirmLabel: string
  cancelLabel: string
}>()

const emit = defineEmits<{ confirm: []; cancel: [] }>()
</script>

<template>
  <div
    v-if="open"
    class="confirm-dialog"
    role="dialog"
    aria-modal="true"
  >
    <div class="confirm-dialog__panel">
      <h2>{{ title }}</h2>
      <p>{{ body }}</p>
      <div class="confirm-dialog__actions">
        <button
          type="button"
          class="confirm-dialog__cancel"
          @click="emit('cancel')"
        >
          {{ cancelLabel }}
        </button>
        <button
          type="button"
          class="confirm-dialog__confirm"
          @click="emit('confirm')"
        >
          {{ confirmLabel }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.confirm-dialog {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  z-index: 100;
}

.confirm-dialog__panel {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 24px;
  max-width: 400px;
  box-shadow: var(--shadow);
}

.confirm-dialog__actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 16px;
}

.confirm-dialog__confirm {
  background: var(--danger);
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
}

.confirm-dialog__cancel {
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 8px 16px;
  color: var(--text-h);
}
</style>
