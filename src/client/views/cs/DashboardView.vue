<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { apiGet } from '../../lib/api';
import { listDrafts, type LocalDraft } from '../../lib/drafts';
import { formatWib } from '../../lib/utils';
import StatusBadge from '../../components/StatusBadge.vue';
import type { ReportPublic } from '@shared/constants';
import { useAuthStore } from '../../stores/auth';

const auth = useAuthStore();
const stats = ref({ drafts: 0, pending: 0, revision: 0, approved: 0 });
const recentReports = ref<ReportPublic[]>([]);
const localDrafts = ref<LocalDraft[]>([]);
const loading = ref(true);

onMounted(async () => {
  try {
    const [dashboard, reportData, drafts] = await Promise.all([
      apiGet<{ stats: typeof stats.value }>('/dashboard/cs'),
      apiGet<{ reports: ReportPublic[] }>('/reports'),
      listDrafts(),
    ]);
    stats.value = dashboard.stats;
    recentReports.value = reportData.reports.filter((r) => r.status !== 'DRAFT').slice(0, 5);
    localDrafts.value = drafts.filter((d) => !d.serverReportId);
    stats.value.drafts += localDrafts.value.length;
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold">Dashboard CS</h1>
        <p class="text-sm text-slate-600">Selamat datang, {{ auth.user?.displayName }}</p>
      </div>
      <RouterLink to="/cs/laporan/baru" class="btn-primary min-h-12 px-6 text-base">
        Buat Laporan Baru
      </RouterLink>
    </div>

    <div class="grid grid-cols-2 gap-3">
      <RouterLink to="/cs/draft" class="card hover:border-primary-300">
        <p class="text-sm text-slate-500">Draft</p>
        <p class="text-2xl font-bold">{{ loading ? '...' : stats.drafts }}</p>
      </RouterLink>
      <RouterLink to="/cs/riwayat?status=SUBMITTED" class="card hover:border-primary-300">
        <p class="text-sm text-slate-500">Menunggu Review</p>
        <p class="text-2xl font-bold">{{ loading ? '...' : stats.pending }}</p>
      </RouterLink>
      <RouterLink to="/cs/perbaikan" class="card hover:border-amber-300">
        <p class="text-sm text-slate-500">Perlu Perbaikan</p>
        <p class="text-2xl font-bold text-amber-700">{{ loading ? '...' : stats.revision }}</p>
      </RouterLink>
      <RouterLink to="/cs/riwayat?status=APPROVED" class="card hover:border-green-300">
        <p class="text-sm text-slate-500">Selesai</p>
        <p class="text-2xl font-bold text-green-700">{{ loading ? '...' : stats.approved }}</p>
      </RouterLink>
    </div>

    <div class="grid gap-2 sm:grid-cols-2">
      <RouterLink to="/cs/draft" class="btn-secondary text-center">Daftar Draft</RouterLink>
      <RouterLink to="/cs/riwayat" class="btn-secondary text-center">Riwayat Laporan</RouterLink>
      <RouterLink to="/cs/perbaikan" class="btn-secondary text-center">Perlu Perbaikan</RouterLink>
      <RouterLink to="/cs/notifikasi" class="btn-secondary text-center">Notifikasi</RouterLink>
    </div>

    <section v-if="localDrafts.length" class="space-y-2">
      <h2 class="font-semibold">Draft Terbaru</h2>
      <RouterLink
        v-for="draft in localDrafts.slice(0, 3)"
        :key="draft.id"
        :to="`/cs/draft/${draft.id}`"
        class="card block hover:border-primary-300"
      >
        <div class="flex items-center justify-between">
          <span>{{ draft.areaName }}</span>
          <span class="text-xs text-slate-500">{{ formatWib(draft.updatedAt) }}</span>
        </div>
      </RouterLink>
    </section>

    <section class="card">
      <h2 class="font-semibold">Laporan Terbaru</h2>
      <p v-if="loading" class="mt-3 text-sm text-slate-500">Memuat...</p>
      <div v-else-if="!recentReports.length" class="mt-3 text-sm text-slate-500">Belum ada laporan.</div>
      <div v-else class="mt-3 space-y-2">
        <RouterLink
          v-for="report in recentReports"
          :key="report.id"
          :to="`/cs/laporan/${report.id}`"
          class="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 hover:bg-slate-50"
        >
          <div>
            <p class="text-sm font-medium">{{ report.reportNumber }}</p>
            <p class="text-xs text-slate-500">{{ report.areaName }}</p>
          </div>
          <StatusBadge :status="report.status" />
        </RouterLink>
      </div>
    </section>
  </div>
</template>
