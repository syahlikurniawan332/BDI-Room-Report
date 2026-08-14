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
const reports = ref<ReportPublic[]>([]);
const localDrafts = ref<LocalDraft[]>([]);
const loading = ref(true);

onMounted(async () => {
  try {
    const [reportData, drafts] = await Promise.all([
      apiGet<{ reports: ReportPublic[] }>('/reports'),
      listDrafts(),
    ]);
    reports.value = reportData.reports;
    localDrafts.value = drafts.filter((d) => !d.serverReportId);
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
      <RouterLink to="/cs/laporan/baru" class="btn-primary">Buat Laporan Baru</RouterLink>
    </div>

    <section v-if="localDrafts.length" class="card">
      <h2 class="font-semibold">Draft Lokal (IndexedDB)</h2>
      <div class="mt-3 space-y-2">
        <RouterLink
          v-for="draft in localDrafts"
          :key="draft.id"
          :to="`/cs/draft/${draft.id}`"
          class="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 hover:bg-slate-50"
        >
          <span>{{ draft.areaName }}</span>
          <span class="text-xs text-slate-500">{{ formatWib(draft.updatedAt) }}</span>
        </RouterLink>
      </div>
    </section>

    <section class="card">
      <h2 class="font-semibold">Laporan Saya</h2>
      <p v-if="loading" class="mt-3 text-sm text-slate-500">Memuat...</p>
      <div v-else-if="!reports.length" class="mt-3 text-sm text-slate-500">Belum ada laporan.</div>
      <div v-else class="mt-3 overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead>
            <tr class="border-b text-left text-slate-500">
              <th class="py-2 pr-4">No.</th>
              <th class="py-2 pr-4">Area</th>
              <th class="py-2 pr-4">Status</th>
              <th class="py-2">Diperbarui</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="report in reports" :key="report.id" class="border-b border-slate-100">
              <td class="py-2 pr-4">
                <RouterLink :to="`/cs/laporan/${report.id}`" class="text-primary-600 hover:underline">
                  {{ report.reportNumber }}
                </RouterLink>
              </td>
              <td class="py-2 pr-4">{{ report.areaName ?? report.areaId }}</td>
              <td class="py-2 pr-4"><StatusBadge :status="report.status" /></td>
              <td class="py-2">{{ formatWib(report.updatedAt) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>
