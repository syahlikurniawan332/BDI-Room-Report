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
  <div class="space-y-6">
    <div>
      <p class="text-xs font-semibold uppercase tracking-[0.2em] text-[#a38a59]">
        Cleaning Service
      </p>
      <h1 class="mt-1 text-2xl font-bold text-[#17233d] dark:text-slate-100">
        Laporan Perlu Perbaikan
      </h1>
      <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">
        Periksa catatan admin, perbaiki laporan, lalu kirim ulang.
      </p>
    </div>

    <section
      class="overflow-hidden rounded-2xl border border-amber-200 dark:border-amber-800 bg-white dark:bg-slate-900 shadow-sm"
    >
      <div class="border-b border-amber-100 bg-amber-50 dark:bg-amber-950/30/60 px-5 py-4">
        <h2 class="font-semibold text-amber-950">Menunggu perbaikan</h2>
      </div>

      <p
        v-if="loading"
        class="px-5 py-10 text-center text-sm text-slate-500 dark:text-slate-400"
      >
        Memuat laporan...
      </p>

      <p
        v-else-if="!reports.length"
        class="px-5 py-10 text-center text-sm text-slate-500 dark:text-slate-400"
      >
        Tidak ada laporan yang perlu diperbaiki.
      </p>

      <div v-else class="divide-y divide-[#f3dfb7]">
        <RouterLink
          v-for="report in reports"
          :key="report.id"
          :to="`/cs/laporan/${report.id}`"
          class="group flex items-start justify-between gap-4 px-5 py-4 transition hover:bg-amber-50 dark:bg-amber-950/30 dark:hover:bg-amber-950/30/50"
        >
          <span class="min-w-0">
            <span class="block font-semibold text-[#17233d] dark:text-slate-100">
              {{ report.reportNumber }}
            </span>
            <span class="mt-1 block text-sm text-slate-600 dark:text-slate-300">
              {{ report.areaName }}
            </span>

            <span
              v-if="report.adminNote"
              class="mt-3 block rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-sm leading-5 text-amber-950"
            >
              <span class="font-semibold">Catatan admin:</span>
              {{ report.adminNote }}
            </span>
          </span>

          <span class="flex shrink-0 items-center gap-3">
            <StatusBadge :status="report.status" />
            <span
              class="text-lg text-amber-900 dark:text-amber-200 transition group-hover:translate-x-1"
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
