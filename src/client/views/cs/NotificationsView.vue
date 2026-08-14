<script setup lang="ts">
import { onMounted } from 'vue';
import { RouterLink } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useNotificationStore } from '../../stores/notifications';
import { formatWib } from '../../lib/utils';

const store = useNotificationStore();
const { items, loading } = storeToRefs(store);

onMounted(() => store.fetchNotifications());

function entityLink(type: string | null, id: string | null) {
  if (!type || !id) return null;
  if (type === 'report') return `/cs/laporan/${id}`;
  return null;
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold">Notifikasi</h1>
      <button type="button" class="btn-secondary" @click="store.markRead(undefined, true)">
        Tandai semua dibaca
      </button>
    </div>

    <p v-if="loading" class="text-sm text-slate-500">Memuat...</p>
    <p v-else-if="!items.length" class="text-sm text-slate-500">Tidak ada notifikasi.</p>
    <div v-else class="space-y-2">
      <component
        :is="entityLink(item.relatedEntityType, item.relatedEntityId) ? RouterLink : 'div'"
        v-for="item in items"
        :key="item.id"
        :to="entityLink(item.relatedEntityType, item.relatedEntityId) ?? undefined"
        class="card block"
        :class="{ 'border-primary-200 bg-blue-50/50': !item.readAt }"
        @click="!item.readAt && store.markRead([item.id])"
      >
        <p class="font-medium">{{ item.title }}</p>
        <p class="text-sm text-slate-600">{{ item.message }}</p>
        <p class="mt-1 text-xs text-slate-400">{{ formatWib(item.createdAt) }}</p>
      </component>
    </div>

    <RouterLink to="/cs" class="btn-secondary inline-flex">Kembali</RouterLink>
  </div>
</template>
