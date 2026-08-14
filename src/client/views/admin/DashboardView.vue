<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { apiGet } from '../../lib/api';

const stats = ref({ pendingReports: 0, newComplaints: 0, activeCs: 0, activeAreas: 0 });
const loading = ref(true);

onMounted(async () => {
  try {
    const [reports, complaints, users, areas] = await Promise.all([
      apiGet<{ reports: Array<{ status: string }> }>('/reports?status=SUBMITTED'),
      apiGet<{ complaints: Array<{ status: string }> }>('/complaints?status=NEW'),
      apiGet<{ users: Array<{ role: string; isActive: boolean }> }>('/users'),
      apiGet<{ areas: Array<{ isActive: boolean }> }>('/areas'),
    ]);
    stats.value = {
      pendingReports: reports.reports.length,
      newComplaints: complaints.complaints.length,
      activeCs: users.users.filter((u) => u.role === 'CS' && u.isActive).length,
      activeAreas: areas.areas.filter((a) => a.isActive).length,
    };
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
        <p class="text-sm text-slate-500">Laporan Menunggu</p>
        <p class="text-2xl font-bold">{{ loading ? '...' : stats.pendingReports }}</p>
      </div>
      <div class="card">
        <p class="text-sm text-slate-500">Pengaduan Baru</p>
        <p class="text-2xl font-bold">{{ loading ? '...' : stats.newComplaints }}</p>
      </div>
      <div class="card">
        <p class="text-sm text-slate-500">CS Aktif</p>
        <p class="text-2xl font-bold">{{ loading ? '...' : stats.activeCs }}</p>
      </div>
      <div class="card">
        <p class="text-sm text-slate-500">Area Aktif</p>
        <p class="text-2xl font-bold">{{ loading ? '...' : stats.activeAreas }}</p>
      </div>
    </div>

    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <RouterLink to="/admin/laporan" class="card hover:border-primary-300">Kelola Laporan</RouterLink>
      <RouterLink to="/admin/pengaduan" class="card hover:border-primary-300">Kelola Pengaduan</RouterLink>
      <RouterLink to="/admin/pengguna" class="card hover:border-primary-300">Kelola Pengguna</RouterLink>
      <RouterLink to="/admin/area" class="card hover:border-primary-300">Kelola Area</RouterLink>
      <RouterLink to="/admin/libur" class="card hover:border-primary-300">Kelola Libur</RouterLink>
    </div>
  </div>
</template>
