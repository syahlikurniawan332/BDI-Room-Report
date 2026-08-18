<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { apiGet } from '../../lib/api';
import StatusBadge from '../../components/StatusBadge.vue';
import { formatWib } from '../../lib/utils';
import type { ReportPublic } from '@shared/constants';

const route = useRoute();
const reports = ref<ReportPublic[]>([]);
const statusFilter = ref(String(route.query.status ?? ''));
const loading = ref(true);

async function load() {
  loading.value = true;
  try {
    const query = statusFilter.value ? `?status=${statusFilter.value}` : '';
    const data = await apiGet<{ reports: ReportPublic[] }>(`/reports${query}`);
    reports.value = data.reports.filter((r) => r.status !== 'DRAFT');
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-2xl font-bold">Riwayat Laporan</h1>
      <select v-model="statusFilter" class="input w-auto" @change="load">
        <option value="">Semua</option>
        <option value="SUBMITTED">Menunggu Review</option>
        <option value="RESUBMITTED">Dikirim Ulang</option>
        <option value="APPROVED">Disetujui</option>
        <option value="REVISION_REQUIRED">Perlu Perbaikan</option>
        <option value="REJECTED">Ditolak</option>
      </select>
    </div>

    <div class="space-y-3">
      <p v-if="loading" class="text-sm text-slate-500">Memuat...</p>
      <p v-else-if="!reports.length" class="text-sm text-slate-500">Belum ada riwayat.</p>
      <RouterLink
        v-for="report in reports"
        :key="report.id"
        :to="`/cs/laporan/${report.id}`"
        class="card block hover:border-primary-300"
      >
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="font-medium">{{ report.reportNumber }}</p>
            <p class="text-sm text-slate-600">{{ report.areaName }}</p>
            <p class="text-xs text-slate-500">{{ formatWib(report.submittedAt ?? report.updatedAt) }}</p>
          </div>
          <StatusBadge :status="report.status" />
        </div>
      </RouterLink>
    </div>

    <RouterLink to="/cs" class="btn-secondary inline-flex">Kembali</RouterLink>
  </div>
</template>
