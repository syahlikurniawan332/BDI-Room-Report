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
  <div class="space-y-6">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.2em] text-[#a38a59]">
          Cleaning Service
        </p>
        <h1 class="mt-1 text-2xl font-bold text-[#17233d] dark:text-slate-100">
          Riwayat Laporan
        </h1>
        <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Lihat status seluruh laporan yang pernah dikirim.
        </p>
      </div>

      <div class="w-full sm:w-60">
        <label class="label">Filter status</label>
        <select v-model="statusFilter" class="input" @change="load">
          <option value="">Semua Status</option>
          <option value="SUBMITTED">Menunggu Review</option>
          <option value="RESUBMITTED">Dikirim Ulang</option>
          <option value="APPROVED">Disetujui</option>
          <option value="REVISION_REQUIRED">Perlu Perbaikan</option>
          <option value="REJECTED">Ditolak</option>
        </select>
      </div>
    </div>

    <section
      class="overflow-hidden rounded-2xl border border-[#e4dccb] dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm"
    >
      <div class="border-b border-[#eee7d8] dark:border-slate-800 px-5 py-4">
        <h2 class="font-semibold text-[#17233d] dark:text-slate-100">Daftar laporan</h2>
      </div>

      <p
        v-if="loading"
        class="px-5 py-10 text-center text-sm text-slate-500 dark:text-slate-400"
      >
        Memuat riwayat laporan...
      </p>

      <p
        v-else-if="!reports.length"
        class="px-5 py-10 text-center text-sm text-slate-500 dark:text-slate-400"
      >
        Belum ada laporan pada kategori ini.
      </p>

      <div v-else class="divide-y divide-[#eee7d8] dark:divide-slate-800">
        <RouterLink
          v-for="report in reports"
          :key="report.id"
          :to="`/cs/laporan/${report.id}`"
          class="group flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-[#fdfbf6] dark:hover:bg-slate-800"
        >
          <span class="min-w-0">
            <span class="block truncate font-semibold text-[#17233d] dark:text-slate-100">
              {{ report.reportNumber }}
            </span>
            <span class="mt-1 block text-sm text-slate-600 dark:text-slate-300">
              {{ report.areaName }}
            </span>
            <span class="mt-1 block text-xs text-slate-400">
              {{ formatWib(report.submittedAt ?? report.updatedAt) }}
            </span>
          </span>

          <span class="flex shrink-0 items-center gap-3">
            <StatusBadge :status="report.status" />
            <span
              class="text-lg text-[#17233d] dark:text-slate-100 transition group-hover:translate-x-1"
              aria-hidden="true"
            >
              →
            </span>
          </span>
        </RouterLink>
      </div>
    </section>

    <RouterLink
      to="/cs"
      class="inline-flex items-center gap-2 rounded-xl border border-[#cbd5e1] bg-white dark:bg-slate-900 px-4 py-2.5 text-sm font-semibold text-[#17233d] dark:text-slate-100 transition hover:border-[#17233d] hover:bg-[#fdfbf6] dark:hover:bg-slate-800"
    >
      <span aria-hidden="true">←</span>
      Kembali ke Dashboard
    </RouterLink>
  </div>
</template>