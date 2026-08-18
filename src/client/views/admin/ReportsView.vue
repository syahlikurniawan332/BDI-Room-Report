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
  <div class="space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p
          class="text-xs font-semibold uppercase tracking-[0.2em] text-[#a38a59]"
        >
          Administrasi
        </p>
        <h1 class="mt-1 text-2xl font-bold text-[#17233d]">
          Laporan
        </h1>
      </div>

      <button
        type="button"
        class="rounded-xl border border-[#cbd5e1] bg-white px-4 py-2.5 text-sm font-semibold text-[#17233d] shadow-sm transition hover:border-[#17233d] hover:bg-[#fdfbf6] disabled:cursor-not-allowed disabled:opacity-60"
        :disabled="zipLoading || !reports.length"
        @click="downloadBulkZip"
      >
        {{ zipLoading ? 'Menyiapkan ZIP...' : 'Unduh ZIP (maks. 20)' }}
      </button>
    </div>

    <section
      class="rounded-2xl border border-[#e4dccb] bg-white p-5 shadow-sm"
    >
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="font-semibold text-[#17233d]">Filter laporan</h2>
          <p class="mt-1 text-sm text-slate-500">
            Temukan laporan berdasarkan status, CS, area, atau tanggal.
          </p>
        </div>

        <button
          type="button"
          class="rounded-xl bg-[#17233d] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#243557]"
          @click="load"
        >
          Terapkan Filter
        </button>
      </div>

      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
            <option v-for="user in users" :key="user.id" :value="user.id">
              {{ user.displayName }}
            </option>
          </select>
        </div>

        <div>
          <label class="label">Area</label>
          <select v-model="areaIdFilter" class="input">
            <option value="">Semua Area</option>
            <option v-for="area in areas" :key="area.id" :value="area.id">
              {{ area.name }}
            </option>
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
          <input
            v-model="reportNumber"
            type="text"
            class="input"
            placeholder="Cari nomor laporan..."
          />
        </div>
      </div>
    </section>

    <section
      class="overflow-hidden rounded-2xl border border-[#e4dccb] bg-white shadow-sm"
    >
      <div class="border-b border-[#eee7d8] px-5 py-4">
        <h2 class="font-semibold text-[#17233d]">Daftar laporan</h2>
      </div>

      <div class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead class="bg-[#fdfbf6] text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
            <tr>
              <th class="px-5 py-3">No. Laporan</th>
              <th class="px-4 py-3">Area</th>
              <th class="px-4 py-3">CS</th>
              <th class="px-4 py-3">Status</th>
              <th class="px-4 py-3">Dikirim</th>
              <th class="px-5 py-3 text-right">Aksi</th>
            </tr>
          </thead>

          <tbody class="divide-y divide-[#eee7d8]">
            <tr v-if="loading">
              <td colspan="6" class="px-5 py-10 text-center text-slate-500">
                Memuat laporan...
              </td>
            </tr>

            <tr v-else-if="!reports.length">
              <td colspan="6" class="px-5 py-10 text-center text-slate-500">
                Tidak ada laporan yang sesuai dengan filter.
              </td>
            </tr>

            <tr
              v-for="report in reports"
              :key="report.id"
              class="transition hover:bg-[#fdfbf6]"
            >
              <td class="px-5 py-4 font-medium text-[#17233d]">
                {{ report.reportNumber }}
              </td>
              <td class="px-4 py-4">{{ report.areaName }}</td>
              <td class="px-4 py-4">{{ report.reporterName }}</td>
              <td class="px-4 py-4">
                <StatusBadge :status="report.status" />
              </td>
              <td class="px-4 py-4 whitespace-nowrap text-slate-600">
                {{ formatWib(report.submittedAt) }}
              </td>
              <td class="px-5 py-4 text-right">
                <RouterLink
                  :to="`/admin/laporan/${report.id}`"
                  class="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold text-[#17233d] transition hover:bg-[#f3ecdc]"
                >
                  Lihat
                  <span aria-hidden="true">→</span>
                </RouterLink>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>
