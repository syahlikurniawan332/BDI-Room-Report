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

    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div class="card">
        <p class="text-sm text-slate-500">Laporan Hari Ini</p>
        <p class="text-2xl font-bold">{{ loading ? '...' : stats.todayReports }}</p>
      </div>
      <RouterLink to="/admin/laporan?status=SUBMITTED" class="card hover:border-primary-300">
        <p class="text-sm text-slate-500">Menunggu Review</p>
        <p class="text-2xl font-bold">{{ loading ? '...' : stats.pending }}</p>
      </RouterLink>
      <RouterLink to="/admin/laporan?status=REVISION_REQUIRED" class="card hover:border-amber-300">
        <p class="text-sm text-slate-500">Perlu Perbaikan</p>
        <p class="text-2xl font-bold">{{ loading ? '...' : stats.revision }}</p>
      </RouterLink>
      <RouterLink to="/admin/pengaduan?status=NEW" class="card hover:border-blue-300">
        <p class="text-sm text-slate-500">Pengaduan Baru</p>
        <p class="text-2xl font-bold">{{ loading ? '...' : stats.newComplaints }}</p>
      </RouterLink>
      <div class="card">
        <p class="text-sm text-slate-500">Disetujui</p>
        <p class="text-2xl font-bold text-green-700">{{ loading ? '...' : stats.approved }}</p>
      </div>
      <div class="card">
        <p class="text-sm text-slate-500">Ditolak</p>
        <p class="text-2xl font-bold text-red-700">{{ loading ? '...' : stats.rejected }}</p>
      </div>
      <div class="card">
        <p class="text-sm text-slate-500">Belum Melapor Hari Ini</p>
        <p class="text-2xl font-bold text-amber-600">
          {{ loading ? '...' : stats.notReportedToday }}
        </p>
      </div>
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
