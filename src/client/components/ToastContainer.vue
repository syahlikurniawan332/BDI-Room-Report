<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useNotificationStore } from '../stores/notifications';

const store = useNotificationStore();
const { toasts } = storeToRefs(store);
</script>

<template>
  <div class="fixed bottom-4 right-4 z-50 flex max-w-sm flex-col gap-2">
    <div
      v-for="toast in toasts"
      :key="toast.id"
      class="rounded-lg border border-slate-200 bg-white p-4 shadow-lg"
    >
      <div class="flex items-start justify-between gap-2">
        <div>
          <p class="font-medium text-slate-900">{{ toast.notification.title }}</p>
          <p class="mt-1 text-sm text-slate-600">{{ toast.notification.message }}</p>
        </div>
        <button
          type="button"
          class="text-slate-400 hover:text-slate-600"
          @click="store.dismissToast(toast.id)"
        >
          ×
        </button>
      </div>
    </div>
  </div>
</template>
