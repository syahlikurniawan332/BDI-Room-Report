<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { apiGet } from '../../lib/api';

interface DailyReportItem {
  id: string;
  reportNumber: string;
  reporterName: string;
  areaName: string;
  status: string;
  submittedAt: string;
  beforePhotoId: string | null;
  afterPhotoId: string | null;
  latestReviewNote: string | null;
}

interface DailySummaryResponse {
  date: string;

  summary: {
    total: number;
    approved: number;
    revision: number;
    pending: number;
    rejected: number;
  };

  reports: DailyReportItem[];
}

interface CsReportGroup {
  reporterName: string;
  reports: DailyReportItem[];
}

const route = useRoute();
const router = useRouter();

const selectedDate = ref(
  typeof route.query.date === 'string' && route.query.date
    ? route.query.date
    : new Date().toISOString().slice(0, 10),
);

const loading = ref(true);
const errorMessage = ref('');
const data = ref<DailySummaryResponse | null>(null);

const reportDate = computed(() => selectedDate.value);

const groupedReports = computed<CsReportGroup[]>(() => {
  if (!data.value) {
    return [];
  }

  const groups = new Map<string, DailyReportItem[]>();

  for (const report of data.value.reports) {
    const existing = groups.get(report.reporterName) ?? [];

    existing.push(report);

    groups.set(report.reporterName, existing);
  }

  return Array.from(groups.entries()).map(([reporterName, reports]) => ({
    reporterName,
    reports,
  }));
});

const totalCsReported = computed(() => groupedReports.value.length);

function formatStatus(status: string): string {
  switch (status) {
    case 'APPROVED':
      return 'Disetujui';

    case 'REVISION_REQUIRED':
      return 'Perlu Perbaikan';

    case 'SUBMITTED':
      return 'Menunggu Review';

    case 'RESUBMITTED':
      return 'Dikirim Ulang';

    case 'REJECTED':
      return 'Ditolak';

    default:
      return status;
  }
}

function formatReportDate(date: string): string {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${date}T00:00:00`));
}

function photoUrl(photoId: string | null): string | null {
  if (!photoId) {
    return null;
  }

  return `/api/photos/reports/${photoId}`;
}

async function loadDailyReport() {
  loading.value = true;
  errorMessage.value = '';

  try {
    data.value = await apiGet<DailySummaryResponse>(
      `/reports/daily-summary?date=${encodeURIComponent(reportDate.value)}`,
    );
  } catch (error) {
    console.error(error);

    errorMessage.value =
      error instanceof Error ? error.message : 'Gagal mengambil rekap laporan harian.';
  } finally {
    loading.value = false;
  }
}

function printReport() {
  window.print();
}

async function applyDateFilter() {
  await router.replace({
    name: 'admin-daily-report',
    query: {
      date: selectedDate.value,
    },
  });

  await loadDailyReport();
}

onMounted(loadDailyReport);
</script>

<template>
  <div class="space-y-6">
    <!-- Action bar -->
    <div class="print:hidden space-y-4">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Rekap Laporan Harian
          </h1>

          <p class="text-sm text-slate-500 dark:text-slate-400">
            Lihat pekerjaan Cleaning Service berdasarkan tanggal.
          </p>
        </div>

        <button
          type="button"
          class="btn-primary"
          :disabled="loading || !data || data.reports.length === 0"
          @click="printReport"
        >
          Cetak Rekap Harian
        </button>
      </div>

      <div class="card flex flex-col gap-3 sm:flex-row sm:items-end">
        <div class="w-full sm:max-w-xs">
          <label class="label"> Tanggal Rekap </label>

          <input v-model="selectedDate" type="date" class="input" />
        </div>

        <button type="button" class="btn-secondary" :disabled="loading" @click="applyDateFilter">
          Tampilkan
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="card text-center text-slate-500 dark:text-slate-400">
      Memuat rekap laporan...
    </div>

    <!-- Error -->
    <div
      v-else-if="errorMessage"
      class="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
    >
      {{ errorMessage }}
    </div>

    <!-- Report -->
    <div
      v-else-if="data"
      id="daily-report-print"
      class="mx-auto max-w-5xl rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8 print:max-w-none print:rounded-none print:border-0 print:bg-white print:p-0 print:text-black print:shadow-none"
    >
      <!-- Header -->
      <div class="border-b border-slate-300 pb-5 text-center print:border-black">
        <h2
          class="text-xl font-bold uppercase tracking-wide text-slate-900 dark:text-slate-100 print:text-black"
        >
          Balai Diklat Industri Medan
        </h2>

        <p class="mt-1 text-lg font-semibold text-slate-700 dark:text-slate-300 print:text-black">
          Rekap Laporan Kebersihan Harian
        </p>

        <p class="mt-2 text-sm text-slate-500 dark:text-slate-400 print:text-black">
          {{ formatReportDate(data.date) }}
        </p>
      </div>

      <!-- Summary -->
      <section class="mt-6">
        <h3 class="mb-3 font-semibold text-slate-900 dark:text-slate-100 print:text-black">
          Ringkasan
        </h3>

        <div class="grid grid-cols-2 gap-3 sm:grid-cols-5 print:grid-cols-5">
          <div class="report-stat">
            <span>CS Melapor</span>
            <strong>{{ totalCsReported }}</strong>
          </div>

          <div class="report-stat">
            <span>Area Dilaporkan</span>
            <strong>{{ data.summary.total }}</strong>
          </div>

          <div class="report-stat">
            <span>Disetujui</span>
            <strong>{{ data.summary.approved }}</strong>
          </div>

          <div class="report-stat">
            <span>Perlu Perbaikan</span>
            <strong>{{ data.summary.revision }}</strong>
          </div>

          <div class="report-stat">
            <span>Menunggu Review</span>
            <strong>{{ data.summary.pending }}</strong>
          </div>
        </div>
      </section>

      <!-- Empty -->
      <div
        v-if="data.reports.length === 0"
        class="mt-8 rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500 dark:border-slate-700 dark:text-slate-400 print:border-black print:text-black"
      >
        Tidak ada laporan pada tanggal ini.
      </div>

      <!-- Reports -->
      <section v-for="group in groupedReports" :key="group.reporterName" class="mt-8">
        <div
          class="mb-3 flex flex-col gap-1 border-b border-slate-300 pb-3 dark:border-slate-700 print:border-black"
        >
          <h3 class="text-lg font-bold text-slate-900 dark:text-slate-100 print:text-black">
            {{ group.reporterName }}
          </h3>

          <p class="text-sm text-slate-500 dark:text-slate-400 print:text-black">
            {{ group.reports.length }} area dilaporkan
          </p>
        </div>

        <!-- Desktop / Print -->
        <div
          class="hidden overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 sm:block print:block print:rounded-none print:border-black"
        >
          <table class="w-full text-sm">
            <thead
              class="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-950 dark:text-slate-300 print:bg-white print:text-black"
            >
              <tr>
                <th class="px-4 py-3">Area</th>

                <th class="px-4 py-3 text-center">Before</th>

                <th class="px-4 py-3 text-center">After</th>

                <th class="px-4 py-3">Status</th>

                <th class="px-4 py-3">Catatan</th>
              </tr>
            </thead>

            <tbody>
              <tr
                v-for="report in group.reports"
                :key="report.id"
                class="border-t border-slate-200 dark:border-slate-700 print:border-black"
              >
                <td
                  class="px-4 py-4 font-medium text-slate-900 dark:text-slate-100 print:text-black"
                >
                  {{ report.areaName }}
                </td>

                <td class="px-4 py-4">
                  <div
                    class="mx-auto h-20 w-28 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-950 print:border-black print:bg-white"
                  >
                    <img
                      v-if="photoUrl(report.beforePhotoId)"
                      :src="photoUrl(report.beforePhotoId) ?? undefined"
                      alt="Foto before"
                      class="h-full w-full object-cover"
                    />

                    <div
                      v-else
                      class="flex h-full items-center justify-center text-xs text-slate-400 print:text-black"
                    >
                      Tidak ada foto
                    </div>
                  </div>
                </td>

                <td class="px-4 py-4">
                  <div
                    class="mx-auto h-20 w-28 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-950 print:border-black print:bg-white"
                  >
                    <img
                      v-if="photoUrl(report.afterPhotoId)"
                      :src="photoUrl(report.afterPhotoId) ?? undefined"
                      alt="Foto after"
                      class="h-full w-full object-cover"
                    />

                    <div
                      v-else
                      class="flex h-full items-center justify-center text-xs text-slate-400 print:text-black"
                    >
                      Tidak ada foto
                    </div>
                  </div>
                </td>

                <td class="px-4 py-4 text-slate-700 dark:text-slate-300 print:text-black">
                  {{ formatStatus(report.status) }}
                </td>

                <td class="max-w-xs px-4 py-4 text-slate-600 dark:text-slate-300 print:text-black">
                  {{ report.latestReviewNote || '-' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Mobile -->
        <div class="space-y-3 sm:hidden print:hidden">
          <article v-for="report in group.reports" :key="report.id" class="card">
            <div>
              <h4 class="font-semibold text-slate-900 dark:text-slate-100">
                {{ report.areaName }}
              </h4>

              <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {{ formatStatus(report.status) }}
              </p>
            </div>

            <div class="mt-4 grid grid-cols-2 gap-3">
              <div>
                <p
                  class="mb-1 text-center text-xs font-semibold text-slate-500 dark:text-slate-400"
                >
                  BEFORE
                </p>

                <img
                  v-if="photoUrl(report.beforePhotoId)"
                  :src="photoUrl(report.beforePhotoId) ?? undefined"
                  alt="Foto before"
                  class="h-28 w-full rounded-lg object-cover"
                />
              </div>

              <div>
                <p
                  class="mb-1 text-center text-xs font-semibold text-slate-500 dark:text-slate-400"
                >
                  AFTER
                </p>

                <img
                  v-if="photoUrl(report.afterPhotoId)"
                  :src="photoUrl(report.afterPhotoId) ?? undefined"
                  alt="Foto after"
                  class="h-28 w-full rounded-lg object-cover"
                />
              </div>
            </div>

            <div
              v-if="report.latestReviewNote"
              class="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600 dark:bg-slate-950 dark:text-slate-300"
            >
              <strong>Catatan:</strong>
              {{ report.latestReviewNote }}
            </div>
          </article>
        </div>
      </section>

      <!-- Signature -->
      <div v-if="data.reports.length > 0" class="mt-12 flex justify-end print:mt-16">
        <div class="w-64 text-center text-sm text-slate-700 dark:text-slate-300 print:text-black">
          <p>Medan, {{ formatReportDate(data.date) }}</p>
          <p class="mt-1">Pengawas</p>

          <div class="h-20"></div>

          <p class="border-t border-slate-500 pt-1 print:border-black">Administrator BDI Medan</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.report-stat {
  @apply flex flex-col rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300;
}

.report-stat strong {
  @apply mt-1 text-xl text-slate-900 dark:text-slate-100;
}

@media print {
  @page {
    size: A4 portrait;
    margin: 14mm;
  }

  .report-stat {
    border-color: #000 !important;
    background: #fff !important;
    color: #000 !important;
  }

  .report-stat strong {
    color: #000 !important;
  }

  .report-item {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  img {
    break-inside: avoid;
  }
}
</style>
