<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { apiGet } from '../../lib/api';
import StatusBadge from '../../components/StatusBadge.vue';
import { formatWib } from '../../lib/utils';
import type { ReportPublic } from '@shared/constants';

const reports = ref<ReportPublic[]>([]);
const statusFilter = ref('');
const loading = ref(true);

async function load() {
  loading.value = true;
  try {
    const query = statusFilter.value ? `?status=${statusFilter.value}` : '';
    const data = await apiGet<{ reports: ReportPublic[] }>(`/reports${query}`);
    reports.value = data.reports;
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-2xl font-bold">Laporan</h1>
      <select v-model="statusFilter" class="input w-auto" @change="load">
        <option value="">Semua Status</option>
        <option value="SUBMITTED">Menunggu Review</option>
        <option value="RESUBMITTED">Dikirim Ulang</option>
        <option value="APPROVED">Disetujui</option>
        <option value="REVISION_REQUIRED">Perlu Perbaikan</option>
        <option value="REJECTED">Ditolak</option>
        <option value="DRAFT">Draft</option>
      </select>
    </div>

    <div class="card overflow-x-auto">
      <table class="min-w-full text-sm">
        <thead>
          <tr class="border-b text-left text-slate-500">
            <th class="py-2 pr-4">No.</th>
            <th class="py-2 pr-4">Area</th>
            <th class="py-2 pr-4">CS</th>
            <th class="py-2 pr-4">Status</th>
            <th class="py-2">Dikirim</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading"><td colspan="5" class="py-4 text-slate-500">Memuat...</td></tr>
          <tr v-for="report in reports" :key="report.id" class="border-b border-slate-100">
            <td class="py-2 pr-4">
              <RouterLink :to="`/admin/laporan/${report.id}`" class="text-primary-600 hover:underline">
                {{ report.reportNumber }}
              </RouterLink>
            </td>
            <td class="py-2 pr-4">{{ report.areaName }}</td>
            <td class="py-2 pr-4">{{ report.reporterName }}</td>
            <td class="py-2 pr-4"><StatusBadge :status="report.status" /></td>
            <td class="py-2">{{ formatWib(report.submittedAt) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
