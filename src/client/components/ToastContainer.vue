<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useNotificationStore } from '../stores/notifications';
import { useAuthStore } from '../stores/auth';
import { useRouter } from 'vue-router';
import { notificationEntityLink } from '../lib/notification-links';

const store = useNotificationStore();
const auth = useAuthStore();
const router = useRouter();
const { toasts } = storeToRefs(store);

async function openToast(toast: (typeof toasts.value)[number]) {
  const notification = toast.notification;
  const target = notificationEntityLink(
    auth.user?.role,
    notification.relatedEntityType,
    notification.relatedEntityId,
  );

  if (!notification.readAt) await store.markRead([notification.id]);
  store.dismissToast(toast.id);

  if (target) await router.push(target);
}
</script>

<template>
  <div class="fixed bottom-4 right-4 z-50 flex max-w-sm flex-col gap-2">
    <div
      v-for="toast in toasts"
      :key="toast.id"
      class="cursor-pointer rounded-lg border border-slate-200 bg-white p-4 shadow-lg transition hover:border-primary-300 hover:shadow-xl"
      role="button"
      tabindex="0"
      @click="openToast(toast)"
      @keydown.enter="openToast(toast)"
    >
      <div class="flex items-start justify-between gap-2">
        <div>
          <p class="font-medium text-slate-900">{{ toast.notification.title }}</p>
          <p class="mt-1 text-sm text-slate-600">{{ toast.notification.message }}</p>
        </div>
        <button
          type="button"
          class="text-slate-400 hover:text-slate-600"
          aria-label="Tutup notifikasi"
          @click.stop="store.dismissToast(toast.id)"
        >
          ×
        </button>
      </div>
    </div>
  </div>
</template>
