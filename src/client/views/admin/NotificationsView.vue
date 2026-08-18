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
  if (type === 'report') return `/admin/laporan/${id}`;
  if (type === 'complaint') return `/admin/pengaduan`;
  return null;
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p
          class="text-xs font-semibold uppercase tracking-[0.2em] text-[#a38a59]"
        >
          Administrasi
        </p>
        <h1 class="mt-1 text-2xl font-bold text-[#17233d]">
          Notifikasi
        </h1>
      </div>

      <button
        type="button"
        class="rounded-xl border border-[#cbd5e1] bg-white px-4 py-2.5 text-sm font-semibold text-[#17233d] shadow-sm transition hover:border-[#17233d] hover:bg-[#fdfbf6] disabled:cursor-not-allowed disabled:opacity-60"
        :disabled="!items.length"
        @click="store.markRead(undefined, true)"
      >
        Tandai semua dibaca
      </button>
    </div>

    <section
      class="overflow-hidden rounded-2xl border border-[#e4dccb] bg-white shadow-sm"
    >
      <div class="border-b border-[#eee7d8] px-5 py-4">
        <h2 class="font-semibold text-[#17233d]">Pembaruan terbaru</h2>
      </div>

      <p v-if="loading" class="px-5 py-10 text-center text-sm text-slate-500">
        Memuat notifikasi...
      </p>

      <p
        v-else-if="!items.length"
        class="px-5 py-10 text-center text-sm text-slate-500"
      >
        Tidak ada notifikasi.
      </p>

      <div v-else class="divide-y divide-[#eee7d8]">
        <component
          :is="entityLink(item.relatedEntityType, item.relatedEntityId) ? RouterLink : 'div'"
          v-for="item in items"
          :key="item.id"
          :to="entityLink(item.relatedEntityType, item.relatedEntityId) ?? undefined"
          class="group flex items-start gap-4 px-5 py-4 transition"
          :class="[
            !item.readAt
              ? 'bg-[#fffaf0]'
              : 'bg-white',
            entityLink(item.relatedEntityType, item.relatedEntityId)
              ? 'cursor-pointer hover:bg-[#fdfbf6]'
              : '',
          ]"
          @click="!item.readAt && store.markRead([item.id])"
        >
          <span
            class="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
            :class="item.readAt ? 'bg-slate-200' : 'bg-[#b89555]'"
          />

          <span class="min-w-0 flex-1">
            <span class="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span class="font-semibold text-[#17233d]">
                {{ item.title }}
              </span>
              <span class="text-xs text-slate-400">
                {{ formatWib(item.createdAt) }}
              </span>
            </span>

            <span class="mt-1 block text-sm leading-6 text-slate-600">
              {{ item.message }}
            </span>
          </span>

          <span
            v-if="entityLink(item.relatedEntityType, item.relatedEntityId)"
            class="mt-1 text-lg text-[#17233d] transition group-hover:translate-x-1"
            aria-hidden="true"
          >
            →
          </span>
        </component>
      </div>
    </section>

    <RouterLink
      to="/admin"
      class="inline-flex items-center gap-2 rounded-xl border border-[#cbd5e1] bg-white px-4 py-2.5 text-sm font-semibold text-[#17233d] transition hover:border-[#17233d] hover:bg-[#fdfbf6]"
    >
      <span aria-hidden="true">←</span>
      Kembali ke Dashboard
    </RouterLink>
  </div>
</template>
