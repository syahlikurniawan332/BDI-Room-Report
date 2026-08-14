import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { apiGet, apiPost } from '../lib/api';
import type { NotificationPublic } from '@shared/constants';

const POLL_INTERVAL_MS = 45_000;

export const useNotificationStore = defineStore('notifications', () => {
  const items = ref<NotificationPublic[]>([]);
  const unreadCount = ref(0);
  const loading = ref(false);
  const toasts = ref<Array<{ id: string; notification: NotificationPublic }>>([]);
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let knownIds = new Set<string>();

  const hasUnread = computed(() => unreadCount.value > 0);

  async function fetchUnreadCount() {
    const data = await apiGet<{ count: number }>('/notifications/unread-count');
    unreadCount.value = data.count;
  }

  async function fetchNotifications() {
    loading.value = true;
    try {
      const data = await apiGet<{ notifications: NotificationPublic[] }>('/notifications');
      items.value = data.notifications;
      await fetchUnreadCount();

      for (const n of data.notifications) {
        if (!n.readAt && !knownIds.has(n.id)) {
          knownIds.add(n.id);
          showToast(n);
        }
      }
    } finally {
      loading.value = false;
    }
  }

  function showToast(notification: NotificationPublic) {
    const id = crypto.randomUUID();
    toasts.value.push({ id, notification });
    setTimeout(() => dismissToast(id), 6000);
  }

  function dismissToast(id: string) {
    toasts.value = toasts.value.filter((t) => t.id !== id);
  }

  async function markRead(ids?: string[], all = false) {
    await apiPost('/notifications/mark-read', all ? { all: true } : { ids });
    await fetchNotifications();
  }

  function startPolling() {
    stopPolling();
    knownIds = new Set(items.value.map((n) => n.id));
    void fetchNotifications();
    pollTimer = setInterval(() => {
      void fetchUnreadCount().then(async () => {
        if (unreadCount.value > 0) await fetchNotifications();
      });
    }, POLL_INTERVAL_MS);
  }

  function stopPolling() {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  function reset() {
    stopPolling();
    items.value = [];
    unreadCount.value = 0;
    toasts.value = [];
    knownIds = new Set();
  }

  return {
    items,
    unreadCount,
    loading,
    toasts,
    hasUnread,
    fetchNotifications,
    fetchUnreadCount,
    markRead,
    startPolling,
    stopPolling,
    reset,
    dismissToast,
  };
});
