<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { RouterLink } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useNotificationStore } from '../stores/notifications';
import { useAuthStore } from '../stores/auth';
import { formatWib } from '../lib/utils';

const auth = useAuthStore();
const store = useNotificationStore();
const { unreadCount, items } = storeToRefs(store);
const open = ref(false);

const listPath = auth.isAdmin ? '/admin/notifikasi' : '/cs/notifikasi';

onMounted(() => {
  if (auth.isAuthenticated) store.startPolling();
});

onUnmounted(() => {
  if (!auth.isAuthenticated) store.stopPolling();
});

async function toggle() {
  open.value = !open.value;
  if (open.value) await store.fetchNotifications();
}

async function markAllRead() {
  await store.markRead(undefined, true);
}
</script>

<template>
  <div class="relative">
    <button
      type="button"
      class="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100"
      aria-label="Notifikasi"
      @click="toggle"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
      <span
        v-if="unreadCount > 0"
        class="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white"
      >
        {{ unreadCount > 9 ? '9+' : unreadCount }}
      </span>
    </button>

    <div
      v-if="open"
      class="absolute right-0 z-50 mt-2 w-80 rounded-xl border border-slate-200 bg-white shadow-lg"
    >
      <div class="flex items-center justify-between border-b px-4 py-3">
        <span class="font-semibold">Notifikasi</span>
        <button v-if="unreadCount > 0" type="button" class="text-xs text-primary-600" @click="markAllRead">
          Tandai semua dibaca
        </button>
      </div>
      <div class="max-h-80 overflow-y-auto">
        <p v-if="!items.length" class="p-4 text-sm text-slate-500">Tidak ada notifikasi.</p>
        <button
          v-for="item in items.slice(0, 8)"
          :key="item.id"
          type="button"
          class="block w-full border-b border-slate-100 px-4 py-3 text-left hover:bg-slate-50"
          :class="{ 'bg-blue-50': !item.readAt }"
          @click="store.markRead([item.id])"
        >
          <p class="text-sm font-medium">{{ item.title }}</p>
          <p class="text-xs text-slate-600">{{ item.message }}</p>
          <p class="mt-1 text-xs text-slate-400">{{ formatWib(item.createdAt) }}</p>
        </button>
      </div>
      <RouterLink
        :to="listPath"
        class="block border-t px-4 py-2 text-center text-sm text-primary-600 hover:bg-slate-50"
        @click="open = false"
      >
        Lihat semua
      </RouterLink>
    </div>
  </div>
</template>
