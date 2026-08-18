<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { apiGet } from '../../lib/api';
import StatusBadge from '../../components/StatusBadge.vue';
import type { ReportPublic } from '@shared/constants';

const reports = ref<ReportPublic[]>([]);
const loading = ref(true);

onMounted(async () => {
  try {
    const data = await apiGet<{ reports: ReportPublic[] }>('/reports?status=REVISION_REQUIRED');
    reports.value = data.reports;
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="space-y-4">
    <h1 class="text-2xl font-bold">Laporan Perlu Perbaikan</h1>
    <p v-if="loading" class="text-sm text-slate-500">Memuat...</p>
    <p v-else-if="!reports.length" class="text-sm text-slate-500">Tidak ada laporan yang perlu diperbaiki.</p>
    <div v-else class="space-y-3">
      <RouterLink
        v-for="report in reports"
        :key="report.id"
        :to="`/cs/laporan/${report.id}`"
        class="card block hover:border-amber-300"
      >
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="font-medium">{{ report.reportNumber }}</p>
            <p class="text-sm text-slate-600">{{ report.areaName }}</p>
            <p v-if="report.adminNote" class="mt-2 rounded bg-amber-50 p-2 text-sm text-amber-900">
              {{ report.adminNote }}
            </p>
          </div>
          <StatusBadge :status="report.status" />
        </div>
      </RouterLink>
    </div>
    <RouterLink to="/cs" class="btn-secondary inline-flex">Kembali</RouterLink>
  </div>
</template>
