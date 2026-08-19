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
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <p
          class="text-xs font-semibold uppercase tracking-[0.2em] text-[#a38a59]"
        >
          Cleaning Service
        </p>
        <h1 class="mt-1 text-2xl font-bold text-[#17233d] dark:text-slate-100">
          Dashboard CS
        </h1>
        <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Selamat datang, {{ auth.user?.displayName }}
        </p>
      </div>

      <RouterLink
        to="/cs/laporan/baru"
        class="inline-flex items-center gap-2 rounded-xl bg-[#17233d] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#243557]"
      >
        <span class="text-lg leading-none" aria-hidden="true">+</span>
        Buat Laporan Baru
      </RouterLink>
    </div>

    <!-- Ringkasan -->
    <section
      class="grid overflow-hidden rounded-2xl border border-[#e4dccb] dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm sm:grid-cols-2 lg:grid-cols-4"
    >
      <RouterLink
        to="/cs/draft"
        class="border-b border-[#eee7d8] dark:border-slate-800 px-5 py-4 transition hover:bg-[#fdfbf6] dark:hover:bg-slate-800 sm:border-r lg:border-b-0"
      >
        <p class="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Draft
        </p>
        <p class="mt-1 text-2xl font-bold text-[#17233d] dark:text-slate-100">
          {{ loading ? '...' : stats.drafts }}
        </p>
      </RouterLink>

      <RouterLink
        to="/cs/riwayat?status=SUBMITTED"
        class="border-b border-[#eee7d8] dark:border-slate-800 px-5 py-4 transition hover:bg-[#fdfbf6] dark:hover:bg-slate-800 lg:border-b-0 lg:border-r"
      >
        <p class="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Menunggu Review
        </p>
        <p class="mt-1 text-2xl font-bold text-[#17233d] dark:text-slate-100">
          {{ loading ? '...' : stats.pending }}
        </p>
      </RouterLink>

      <RouterLink
        to="/cs/perbaikan"
        class="border-b border-[#eee7d8] dark:border-slate-800 px-5 py-4 transition hover:bg-amber-50 dark:bg-amber-950/30 dark:hover:bg-amber-950/30 sm:border-r lg:border-b-0"
      >
        <p class="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Perlu Perbaikan
        </p>
        <p class="mt-1 text-2xl font-bold text-amber-700 dark:text-amber-400">
          {{ loading ? '...' : stats.revision }}
        </p>
      </RouterLink>

      <RouterLink
        to="/cs/riwayat?status=APPROVED"
        class="px-5 py-4 transition hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
      >
        <p class="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Selesai
        </p>
        <p class="mt-1 text-2xl font-bold text-emerald-700">
          {{ loading ? '...' : stats.approved }}
        </p>
      </RouterLink>
    </section>

    <!-- Akses cepat -->
    <section>
      <div class="mb-3 flex items-center justify-between">
        <h2 class="font-semibold text-[#17233d] dark:text-slate-100">Akses cepat</h2>
        <RouterLink
          to="/cs/riwayat"
          class="text-sm font-semibold text-[#17233d] dark:text-slate-100 hover:underline"
        >
          Lihat riwayat
        </RouterLink>
      </div>

      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <RouterLink
          to="/cs/draft"
          class="group flex items-center justify-between rounded-2xl border border-[#e4dccb] dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-4 shadow-sm transition hover:-translate-y-0.5 hover:border-[#17233d] hover:shadow-md"
        >
          <span class="font-semibold text-[#17233d] dark:text-slate-100">Daftar Draft</span>
          <span
            class="text-lg text-[#17233d] dark:text-slate-100 transition group-hover:translate-x-1"
            aria-hidden="true"
          >
            →
          </span>
        </RouterLink>

        <RouterLink
          to="/cs/riwayat"
          class="group flex items-center justify-between rounded-2xl border border-[#e4dccb] dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-4 shadow-sm transition hover:-translate-y-0.5 hover:border-[#17233d] hover:shadow-md"
        >
          <span class="font-semibold text-[#17233d] dark:text-slate-100">Riwayat Laporan</span>
          <span
            class="text-lg text-[#17233d] dark:text-slate-100 transition group-hover:translate-x-1"
            aria-hidden="true"
          >
            →
          </span>
        </RouterLink>

        <RouterLink
          to="/cs/perbaikan"
          class="group flex items-center justify-between rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30/50 dark:bg-amber-950/20 px-4 py-4 shadow-sm transition hover:-translate-y-0.5 hover:border-amber-500 hover:shadow-md"
        >
          <span class="font-semibold text-amber-900 dark:text-amber-200">Perlu Perbaikan</span>
          <span
            class="text-lg text-amber-800 dark:text-amber-300 transition group-hover:translate-x-1"
            aria-hidden="true"
          >
            →
          </span>
        </RouterLink>

        <RouterLink
          to="/cs/notifikasi"
          class="group flex items-center justify-between rounded-2xl border border-[#e4dccb] dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-4 shadow-sm transition hover:-translate-y-0.5 hover:border-[#17233d] hover:shadow-md"
        >
          <span class="font-semibold text-[#17233d] dark:text-slate-100">Notifikasi</span>
          <span
            class="text-lg text-[#17233d] dark:text-slate-100 transition group-hover:translate-x-1"
            aria-hidden="true"
          >
            →
          </span>
        </RouterLink>
      </div>
    </section>

    <!-- Draft lokal -->
    <section
      v-if="localDrafts.length"
      class="overflow-hidden rounded-2xl border border-[#e4dccb] dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm"
    >
      <div
        class="flex items-center justify-between border-b border-[#eee7d8] dark:border-slate-800 px-5 py-4"
      >
        <h2 class="font-semibold text-[#17233d] dark:text-slate-100">Draft terbaru</h2>
        <RouterLink
          to="/cs/draft"
          class="text-sm font-semibold text-[#17233d] dark:text-slate-100 hover:underline"
        >
          Lihat semua
        </RouterLink>
      </div>

      <div class="divide-y divide-[#eee7d8] dark:divide-slate-800">
        <RouterLink
          v-for="draft in localDrafts.slice(0, 3)"
          :key="draft.id"
          :to="`/cs/draft/${draft.id}`"
          class="group flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-[#fdfbf6] dark:hover:bg-slate-800"
        >
          <span>
            <span class="block font-semibold text-[#17233d] dark:text-slate-100">
              {{ draft.areaName }}
            </span>
            <span class="mt-1 block text-xs text-slate-500 dark:text-slate-400">
              Terakhir disimpan {{ formatWib(draft.updatedAt) }}
            </span>
          </span>
          <span
            class="text-lg text-[#17233d] dark:text-slate-100 transition group-hover:translate-x-1"
            aria-hidden="true"
          >
            →
          </span>
        </RouterLink>
      </div>
    </section>

    <!-- Laporan terbaru -->
    <section
      class="overflow-hidden rounded-2xl border border-[#e4dccb] dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm"
    >
      <div
        class="flex items-center justify-between border-b border-[#eee7d8] dark:border-slate-800 px-5 py-4"
      >
        <h2 class="font-semibold text-[#17233d] dark:text-slate-100">Laporan terbaru</h2>
        <RouterLink
          to="/cs/riwayat"
          class="text-sm font-semibold text-[#17233d] dark:text-slate-100 hover:underline"
        >
          Lihat semua
        </RouterLink>
      </div>

      <p
        v-if="loading"
        class="px-5 py-10 text-center text-sm text-slate-500 dark:text-slate-400"
      >
        Memuat laporan...
      </p>

      <p
        v-else-if="!recentReports.length"
        class="px-5 py-10 text-center text-sm text-slate-500 dark:text-slate-400"
      >
        Belum ada laporan yang dikirim.
      </p>

      <div v-else class="divide-y divide-[#eee7d8] dark:divide-slate-800">
        <RouterLink
          v-for="report in recentReports"
          :key="report.id"
          :to="`/cs/laporan/${report.id}`"
          class="group flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-[#fdfbf6] dark:hover:bg-slate-800"
        >
          <span class="min-w-0">
            <span class="block truncate font-semibold text-[#17233d] dark:text-slate-100">
              {{ report.reportNumber }}
            </span>
            <span class="mt-1 block text-sm text-slate-500 dark:text-slate-400">
              {{ report.areaName }}
            </span>
          </span>

          <span class="flex items-center gap-3">
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
  </div>
</template>
