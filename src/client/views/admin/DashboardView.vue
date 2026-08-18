<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { apiGet } from '../../lib/api';
import { formatWib } from '../../lib/utils';

interface CsActivity {
  id: string;
  displayName: string;
  username: string;
  lastSubmittedAt: string | null;
  lastStatus: string | null;
}

const stats = ref({
  todayReports: 0,
  pending: 0,
  revision: 0,
  approved: 0,
  rejected: 0,
  newComplaints: 0,
  notReportedToday: 0,
});
const csActivity = ref<CsActivity[]>([]);
const loading = ref(true);

onMounted(async () => {
  try {
    const data = await apiGet<{ stats: typeof stats.value; csActivity: CsActivity[] }>(
      '/dashboard/admin',
    );
    stats.value = data.stats;
    csActivity.value = data.csActivity;
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="space-y-6">
    <h1 class="text-2xl font-bold">Dashboard Admin</h1>

    <div
  class="grid overflow-hidden rounded-2xl border border-[#e4dccb] bg-white shadow-sm sm:grid-cols-2 lg:grid-cols-4"
>
  <div class="border-b border-[#eee7d8] px-5 py-4 sm:border-r lg:border-b-0">
    <p class="text-xs font-semibold uppercase tracking-wider text-slate-500">
      Laporan hari ini
    </p>
    <p class="mt-1 text-2xl font-bold text-[#17233d]">
      {{ loading ? '...' : stats.todayReports }}
    </p>
  </div>

  <div class="border-b border-[#eee7d8] px-5 py-4 lg:border-b-0 lg:border-r">
    <p class="text-xs font-semibold uppercase tracking-wider text-slate-500">
      Disetujui
    </p>
    <p class="mt-1 text-2xl font-bold text-emerald-700">
      {{ loading ? '...' : stats.approved }}
    </p>
  </div>

  <div class="border-b border-[#eee7d8] px-5 py-4 sm:border-r lg:border-b-0">
    <p class="text-xs font-semibold uppercase tracking-wider text-slate-500">
      Ditolak
    </p>
    <p class="mt-1 text-2xl font-bold text-red-700">
      {{ loading ? '...' : stats.rejected }}
    </p>
  </div>

  <div class="px-5 py-4">
    <p class="text-xs font-semibold uppercase tracking-wider text-slate-500">
      Belum melapor
    </p>
    <p class="mt-1 text-2xl font-bold text-amber-600">
      {{ loading ? '...' : stats.notReportedToday }}
    </p>
  </div>
</div>

<div class="grid gap-3 md:grid-cols-3">
  <RouterLink
    to="/admin/laporan?status=SUBMITTED"
    class="group flex items-center justify-between rounded-2xl border border-[#e4dccb] bg-white px-5 py-4 shadow-sm transition hover:-translate-y-0.5 hover:border-[#17233d] hover:shadow-md focus:outline-none focus:ring-4 focus:ring-[#17233d]/10"
  >
    <span>
      <span class="block text-sm font-semibold text-[#17233d]">
        Menunggu Review
      </span>
      <span class="mt-1 block text-2xl font-bold text-[#17233d]">
        {{ loading ? '...' : stats.pending }}
      </span>
    </span>
    <span
      class="flex h-9 w-9 items-center justify-center rounded-full bg-[#f3ecdc] text-lg text-[#17233d] transition group-hover:translate-x-1 group-hover:bg-[#17233d] group-hover:text-white"
      aria-hidden="true"
    >
      →
    </span>
  </RouterLink>

  <RouterLink
    to="/admin/laporan?status=REVISION_REQUIRED"
    class="group flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50/50 px-5 py-4 shadow-sm transition hover:-translate-y-0.5 hover:border-amber-500 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-amber-200"
  >
    <span>
      <span class="block text-sm font-semibold text-amber-900">
        Perlu Perbaikan
      </span>
      <span class="mt-1 block text-2xl font-bold text-amber-700">
        {{ loading ? '...' : stats.revision }}
      </span>
    </span>
    <span
      class="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-lg text-amber-800 transition group-hover:translate-x-1 group-hover:bg-amber-600 group-hover:text-white"
      aria-hidden="true"
    >
      →
    </span>
  </RouterLink>

  <RouterLink
    to="/admin/pengaduan?status=NEW"
    class="group flex items-center justify-between rounded-2xl border border-sky-200 bg-sky-50/50 px-5 py-4 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-500 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-sky-200"
  >
    <span>
      <span class="block text-sm font-semibold text-sky-900">
        Pengaduan Baru
      </span>
      <span class="mt-1 block text-2xl font-bold text-sky-700">
        {{ loading ? '...' : stats.newComplaints }}
      </span>
    </span>
    <span
      class="flex h-9 w-9 items-center justify-center rounded-full bg-sky-100 text-lg text-sky-800 transition group-hover:translate-x-1 group-hover:bg-sky-600 group-hover:text-white"
      aria-hidden="true"
    >
      →
    </span>
  </RouterLink>
</div>

    <section class="card overflow-x-auto">
      <h2 class="mb-3 font-semibold">Aktivitas CS</h2>
      <table class="min-w-full text-sm">
        <thead>
          <tr class="border-b text-left text-slate-500">
            <th class="py-2 pr-4">Nama</th>
            <th class="py-2 pr-4">Username</th>
            <th class="py-2 pr-4">Laporan Terakhir</th>
            <th class="py-2">Status Terakhir</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="cs in csActivity" :key="cs.id" class="border-b border-slate-100">
            <td class="py-2 pr-4">{{ cs.displayName }}</td>
            <td class="py-2 pr-4">{{ cs.username }}</td>
            <td class="py-2 pr-4">{{ formatWib(cs.lastSubmittedAt) }}</td>
            <td class="py-2">
              {{ cs.lastStatus ?? 'Belum Ada Laporan' }}
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <RouterLink to="/admin/laporan" class="card hover:border-primary-300"
        >Kelola Laporan</RouterLink
      >
      <RouterLink to="/admin/pengaduan" class="card hover:border-primary-300"
        >Kelola Pengaduan</RouterLink
      >
      <RouterLink to="/admin/pengguna" class="card hover:border-primary-300"
        >Kelola Pengguna</RouterLink
      >
      <RouterLink to="/admin/area" class="card hover:border-primary-300">Kelola Area</RouterLink>
      <RouterLink to="/admin/libur" class="card hover:border-primary-300">Kelola Libur</RouterLink>
      <RouterLink to="/admin/notifikasi" class="card hover:border-primary-300"
        >Notifikasi</RouterLink
      >
    </div>
  </div>
</template>
