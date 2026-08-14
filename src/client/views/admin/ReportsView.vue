<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { apiGet } from '../../lib/api';
import StatusBadge from '../../components/StatusBadge.vue';
import { downloadReportsZip, formatWib } from '../../lib/utils';
import type { AreaPublic, ReportPublic, UserPublic } from '@shared/constants';

const route = useRoute();
const reports = ref<ReportPublic[]>([]);
const users = ref<UserPublic[]>([]);
const areas = ref<AreaPublic[]>([]);
const statusFilter = ref(String(route.query.status ?? ''));
const userIdFilter = ref('');
const areaIdFilter = ref('');
const dateFrom = ref('');
const dateTo = ref('');
const reportNumber = ref('');
const loading = ref(true);
const zipLoading = ref(false);

function buildQuery() {
  const params = new URLSearchParams();
  if (statusFilter.value) params.set('status', statusFilter.value);
  if (userIdFilter.value) params.set('userId', userIdFilter.value);
  if (areaIdFilter.value) params.set('areaId', areaIdFilter.value);
  if (dateFrom.value) params.set('dateFrom', dateFrom.value);
  if (dateTo.value) params.set('dateTo', dateTo.value);
  if (reportNumber.value.trim()) params.set('reportNumber', reportNumber.value.trim());
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

async function load() {
  loading.value = true;
  try {
    const data = await apiGet<{ reports: ReportPublic[] }>(`/reports${buildQuery()}`);
    reports.value = data.reports;
  } finally {
    loading.value = false;
  }
}

async function downloadBulkZip() {
  zipLoading.value = true;
  try {
    const fullReports = await Promise.all(
      reports.value.slice(0, 20).map((r) =>
        apiGet<{ report: ReportPublic }>(`/reports/${r.id}`).then((d) => d.report),
      ),
    );
    await downloadReportsZip(fullReports);
  } finally {
    zipLoading.value = false;
  }
}

onMounted(async () => {
  const [userData, areaData] = await Promise.all([
    apiGet<{ users: UserPublic[] }>('/users'),
    apiGet<{ areas: AreaPublic[] }>('/areas'),
  ]);
  users.value = userData.users.filter((u) => u.role === 'CS');
  areas.value = areaData.areas;
  await load();
});
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-2xl font-bold">Laporan</h1>
      <button type="button" class="btn-secondary" :disabled="zipLoading || !reports.length" @click="downloadBulkZip">
        {{ zipLoading ? 'Menyiapkan ZIP...' : 'Unduh ZIP (maks 20 laporan)' }}
      </button>
    </div>

    <div class="card grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <div>
        <label class="label">Status</label>
        <select v-model="statusFilter" class="input">
          <option value="">Semua Status</option>
          <option value="SUBMITTED">Menunggu Review</option>
          <option value="RESUBMITTED">Dikirim Ulang</option>
          <option value="APPROVED">Disetujui</option>
          <option value="REVISION_REQUIRED">Perlu Perbaikan</option>
          <option value="REJECTED">Ditolak</option>
          <option value="DRAFT">Draft</option>
        </select>
      </div>
      <div>
        <label class="label">CS</label>
        <select v-model="userIdFilter" class="input">
          <option value="">Semua CS</option>
          <option v-for="user in users" :key="user.id" :value="user.id">{{ user.displayName }}</option>
        </select>
      </div>
      <div>
        <label class="label">Area</label>
        <select v-model="areaIdFilter" class="input">
          <option value="">Semua Area</option>
          <option v-for="area in areas" :key="area.id" :value="area.id">{{ area.name }}</option>
        </select>
      </div>
      <div>
        <label class="label">Tanggal Dari</label>
        <input v-model="dateFrom" type="date" class="input" />
      </div>
      <div>
        <label class="label">Tanggal Sampai</label>
        <input v-model="dateTo" type="date" class="input" />
      </div>
      <div>
        <label class="label">Nomor Laporan</label>
        <input v-model="reportNumber" type="text" class="input" placeholder="Cari nomor..." />
      </div>
    </div>

    <button type="button" class="btn-primary" @click="load">Terapkan Filter</button>

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
