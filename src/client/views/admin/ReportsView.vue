<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { apiGet, apiPost, photoUrl } from '../../lib/api';
import StatusBadge from '../../components/StatusBadge.vue';
import { downloadReportsZip, formatWib } from '../../lib/utils';
import type { AreaPublic, ReportPublic, UserPublic } from '@shared/constants';

interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface BulkReviewResponse {
  approved: string[];
  skipped: Array<{ id: string; reason: string }>;
  summary: {
    requested: number;
    approved: number;
    skipped: number;
  };
}

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
const approving = ref(false);
const selectedIds = ref<string[]>([]);
const page = ref(1);
const pageSize = ref(25);
const pagination = ref<PaginationMeta>({ page: 1, pageSize: 25, total: 0, totalPages: 1 });
const previewReport = ref<ReportPublic | null>(null);
const today = new Date().toISOString().slice(0, 10);

const eligibleReports = computed(() =>
  reports.value.filter((report) => ['SUBMITTED', 'RESUBMITTED'].includes(report.status)),
);

const selectedEligibleIds = computed(() =>
  selectedIds.value.filter((id) => eligibleReports.value.some((report) => report.id === id)),
);

const allEligibleSelected = computed(
  () =>
    eligibleReports.value.length > 0 &&
    eligibleReports.value.every((report) => selectedIds.value.includes(report.id)),
);

function buildQuery() {
  const params = new URLSearchParams();
  if (statusFilter.value) params.set('status', statusFilter.value);
  if (userIdFilter.value) params.set('userId', userIdFilter.value);
  if (areaIdFilter.value) params.set('areaId', areaIdFilter.value);
  if (dateFrom.value) params.set('dateFrom', dateFrom.value);
  if (dateTo.value) params.set('dateTo', dateTo.value);
  if (reportNumber.value.trim()) params.set('reportNumber', reportNumber.value.trim());
  params.set('page', String(page.value));
  params.set('pageSize', String(pageSize.value));
  return `?${params.toString()}`;
}

async function load(resetPage = false) {
  if (resetPage) page.value = 1;
  loading.value = true;
  try {
    const data = await apiGet<{ reports: ReportPublic[]; pagination: PaginationMeta }>(
      `/reports${buildQuery()}`,
    );
    reports.value = data.reports;
    pagination.value = data.pagination;
    selectedIds.value = [];
  } finally {
    loading.value = false;
  }
}

function isEligible(report: ReportPublic) {
  return ['SUBMITTED', 'RESUBMITTED'].includes(report.status);
}

function toggleReport(reportId: string) {
  selectedIds.value = selectedIds.value.includes(reportId)
    ? selectedIds.value.filter((id) => id !== reportId)
    : [...selectedIds.value, reportId];
}

function toggleAllEligible() {
  if (allEligibleSelected.value) {
    const eligibleIds = new Set(eligibleReports.value.map((report) => report.id));
    selectedIds.value = selectedIds.value.filter((id) => !eligibleIds.has(id));
    return;
  }

  selectedIds.value = [
    ...new Set([...selectedIds.value, ...eligibleReports.value.map((report) => report.id)]),
  ];
}

async function approveReports(ids: string[], label: string) {
  const uniqueIds = [...new Set(ids)];
  if (!uniqueIds.length || approving.value) return;

  const confirmed = window.confirm(
    `${label}\n\n${uniqueIds.length} laporan akan ditandai sebagai Disetujui. Tindakan ini tercatat atas akun admin Anda.`,
  );
  if (!confirmed) return;

  approving.value = true;
  try {
    const result = await apiPost<BulkReviewResponse>('/reports/bulk-review', {
      reportIds: uniqueIds,
    });

    if (result.summary.skipped > 0) {
      window.alert(
        `${result.summary.approved} laporan berhasil disetujui. ${result.summary.skipped} laporan dilewati karena status sudah berubah atau sudah diproses.`,
      );
    }

    await load();
  } catch (error) {
    window.alert(error instanceof Error ? error.message : 'Gagal menyetujui laporan.');
  } finally {
    approving.value = false;
  }
}

async function downloadPhoto(photoId: string, reportNumber: string, type: 'before' | 'after') {
  const response = await fetch(photoUrl(photoId), { credentials: 'include' });
  if (!response.ok) {
    window.alert('Foto tidak dapat diunduh.');
    return;
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${reportNumber}-${type}.${blob.type === 'image/png' ? 'png' : blob.type === 'image/jpeg' ? 'jpg' : 'webp'}`;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function downloadBulkZip() {
  zipLoading.value = true;
  try {
    const source = selectedIds.value.length
      ? reports.value.filter((report) => selectedIds.value.includes(report.id))
      : reports.value;

    const fullReports = await Promise.all(
      source
        .slice(0, 20)
        .map((report) =>
          apiGet<{ report: ReportPublic }>(`/reports/${report.id}`).then((data) => data.report),
        ),
    );
    await downloadReportsZip(fullReports);
  } finally {
    zipLoading.value = false;
  }
}

function openPreview(report: ReportPublic) {
  previewReport.value = report;
}

function closePreview() {
  previewReport.value = null;
}

async function changePage(nextPage: number) {
  if (nextPage < 1 || nextPage > pagination.value.totalPages || nextPage === page.value) return;
  page.value = nextPage;
  await load();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

onMounted(async () => {
  const [userData, areaData] = await Promise.all([
    apiGet<{ users: UserPublic[] }>('/users'),
    apiGet<{ areas: AreaPublic[] }>('/areas'),
  ]);
  users.value = userData.users.filter((user) => user.role === 'CS');
  areas.value = areaData.areas;
  await load();
});
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p
          class="text-xs font-semibold uppercase tracking-[0.2em] text-[#a38a59] dark:text-amber-300"
        >
          Administrasi
        </p>
        <h1 class="mt-1 text-2xl font-bold text-[#17233d] dark:text-slate-100">Kelola Laporan</h1>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Tinjau foto before/after dan proses laporan tanpa harus membuka satu per satu.
        </p>
      </div>

      <div class="flex flex-wrap gap-2">
        <RouterLink
          :to="{
            name: 'admin-daily-report',
            query: { date: today },
          }"
          class="btn-secondary"
        >
          Rekap Harian
        </RouterLink>
        <button
          type="button"
          class="btn-secondary"
          :disabled="zipLoading || !reports.length"
          @click="downloadBulkZip"
        >
          {{
            zipLoading
              ? 'Menyiapkan ZIP...'
              : selectedIds.length
                ? `Unduh ZIP (${selectedIds.length})`
                : 'Unduh ZIP Halaman'
          }}
        </button>

        <button
          type="button"
          class="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-emerald-600 dark:hover:bg-emerald-500"
          :disabled="approving || !eligibleReports.length"
          @click="
            approveReports(
              eligibleReports.map((report) => report.id),
              `Setujui semua laporan yang tampil?`,
            )
          "
        >
          {{ approving ? 'Memproses...' : `Setujui Semua yang Tampil (${eligibleReports.length})` }}
        </button>
      </div>
    </div>

    <section
      class="rounded-2xl border border-[#e4dccb] bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="font-semibold text-[#17233d] dark:text-slate-100">Filter laporan</h2>
          <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Aksi “Setujui Semua” hanya berlaku pada laporan yang sedang tampil setelah filter.
          </p>
        </div>

        <button
          type="button"
          class="rounded-xl bg-[#17233d] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#243557] dark:bg-blue-600 dark:hover:bg-blue-500"
          @click="load(true)"
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

    <div
      v-if="selectedEligibleIds.length"
      class="sticky top-3 z-20 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 shadow-sm dark:border-emerald-900 dark:bg-emerald-950/80"
    >
      <p class="text-sm font-medium text-emerald-900 dark:text-emerald-100">
        {{ selectedEligibleIds.length }} laporan siap disetujui.
      </p>
      <button
        type="button"
        class="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50 dark:bg-emerald-600 dark:hover:bg-emerald-500"
        :disabled="approving"
        @click="approveReports(selectedEligibleIds, 'Setujui laporan yang dipilih?')"
      >
        Setujui Terpilih ({{ selectedEligibleIds.length }})
      </button>
    </div>

    <!-- Desktop/tablet -->
    <section
      class="hidden overflow-hidden rounded-2xl border border-[#e4dccb] bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 md:block"
    >
      <div
        class="flex items-center justify-between border-b border-[#eee7d8] px-5 py-4 dark:border-slate-800"
      >
        <div>
          <h2 class="font-semibold text-[#17233d] dark:text-slate-100">Daftar laporan</h2>
          <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {{ pagination.total }} laporan ditemukan · halaman {{ pagination.page }} dari
            {{ pagination.totalPages }}
          </p>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="min-w-[1050px] w-full text-sm">
          <thead
            class="bg-[#fdfbf6] text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:bg-slate-950 dark:text-slate-400"
          >
            <tr>
              <th class="px-4 py-3">
                <input
                  type="checkbox"
                  :checked="allEligibleSelected"
                  :disabled="!eligibleReports.length"
                  aria-label="Pilih semua laporan yang dapat disetujui"
                  @change="toggleAllEligible"
                />
              </th>
              <th class="px-4 py-3">Laporan / CS</th>
              <th class="px-4 py-3">Area</th>
              <th class="px-4 py-3">Before</th>
              <th class="px-4 py-3">After</th>
              <th class="px-4 py-3">Status</th>
              <th class="px-4 py-3">Dikirim</th>
              <th class="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>

          <tbody class="divide-y divide-[#eee7d8] dark:divide-slate-800">
            <tr v-if="loading">
              <td colspan="8" class="px-5 py-12 text-center text-slate-500 dark:text-slate-400">
                Memuat laporan...
              </td>
            </tr>

            <tr v-else-if="!reports.length">
              <td colspan="8" class="px-5 py-12 text-center text-slate-500 dark:text-slate-400">
                Tidak ada laporan yang sesuai dengan filter.
              </td>
            </tr>

            <tr
              v-for="report in reports"
              :key="report.id"
              class="align-middle transition hover:bg-[#fdfbf6] dark:hover:bg-slate-800/60"
            >
              <td class="px-4 py-4">
                <input
                  v-if="isEligible(report)"
                  type="checkbox"
                  :checked="selectedIds.includes(report.id)"
                  :aria-label="`Pilih ${report.reportNumber}`"
                  @change="toggleReport(report.id)"
                />
              </td>

              <td class="px-4 py-4">
                <p class="font-semibold text-[#17233d] dark:text-slate-100">
                  {{ report.reportNumber }}
                </p>
                <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {{ report.reporterName }}
                </p>
              </td>

              <td class="px-4 py-4 text-slate-700 dark:text-slate-300">{{ report.areaName }}</td>

              <td class="px-4 py-3">
                <button
                  v-if="report.beforePhotoId"
                  type="button"
                  class="group block overflow-hidden rounded-lg border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800"
                  @click="openPreview(report)"
                >
                  <img
                    :src="photoUrl(report.beforePhotoId)"
                    alt="Foto before"
                    loading="lazy"
                    class="h-20 w-28 object-cover transition group-hover:scale-105"
                  />
                </button>
                <span v-else class="text-xs text-slate-400">Tidak ada</span>
              </td>

              <td class="px-4 py-3">
                <button
                  v-if="report.afterPhotoId"
                  type="button"
                  class="group block overflow-hidden rounded-lg border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800"
                  @click="openPreview(report)"
                >
                  <img
                    :src="photoUrl(report.afterPhotoId)"
                    alt="Foto after"
                    loading="lazy"
                    class="h-20 w-28 object-cover transition group-hover:scale-105"
                  />
                </button>
                <span v-else class="text-xs text-slate-400">Tidak ada</span>
              </td>

              <td class="px-4 py-4"><StatusBadge :status="report.status" /></td>

              <td class="whitespace-nowrap px-4 py-4 text-slate-600 dark:text-slate-400">
                {{ formatWib(report.submittedAt) }}
              </td>

              <td class="px-4 py-4">
                <div class="flex justify-end gap-1.5">
                  <button
                    v-if="isEligible(report)"
                    type="button"
                    class="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500"
                    @click="approveReports([report.id], `Setujui ${report.reportNumber}?`)"
                  >
                    Setujui
                  </button>
                  <RouterLink
                    :to="`/admin/laporan/${report.id}`"
                    class="rounded-lg px-3 py-2 text-xs font-semibold text-[#17233d] hover:bg-[#f3ecdc] dark:text-blue-300 dark:hover:bg-slate-800"
                  >
                    Tinjau & Catatan
                  </RouterLink>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Mobile -->
    <section class="space-y-3 md:hidden">
      <div v-if="loading" class="card py-10 text-center text-slate-500 dark:text-slate-400">
        Memuat laporan...
      </div>
      <div
        v-else-if="!reports.length"
        class="card py-10 text-center text-slate-500 dark:text-slate-400"
      >
        Tidak ada laporan yang sesuai dengan filter.
      </div>

      <article v-for="report in reports" :key="report.id" class="card space-y-4">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <input
                v-if="isEligible(report)"
                type="checkbox"
                :checked="selectedIds.includes(report.id)"
                :aria-label="`Pilih ${report.reportNumber}`"
                @change="toggleReport(report.id)"
              />
              <p class="truncate font-semibold text-[#17233d] dark:text-slate-100">
                {{ report.reportNumber }}
              </p>
            </div>
            <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">
              {{ report.reporterName }} · {{ report.areaName }}
            </p>
            <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {{ formatWib(report.submittedAt) }}
            </p>
          </div>
          <StatusBadge :status="report.status" />
        </div>

        <div class="grid grid-cols-2 gap-3">
          <button
            type="button"
            class="overflow-hidden rounded-xl border border-slate-200 bg-slate-50 text-left dark:border-slate-700 dark:bg-slate-800"
            @click="openPreview(report)"
          >
            <span class="block px-2 py-1.5 text-xs font-medium text-slate-500 dark:text-slate-400"
              >Before</span
            >
            <img
              v-if="report.beforePhotoId"
              :src="photoUrl(report.beforePhotoId)"
              alt="Foto before"
              loading="lazy"
              class="h-32 w-full object-cover"
            />
            <span v-else class="grid h-32 place-items-center text-xs text-slate-400"
              >Tidak ada foto</span
            >
          </button>

          <button
            type="button"
            class="overflow-hidden rounded-xl border border-slate-200 bg-slate-50 text-left dark:border-slate-700 dark:bg-slate-800"
            @click="openPreview(report)"
          >
            <span class="block px-2 py-1.5 text-xs font-medium text-slate-500 dark:text-slate-400"
              >After</span
            >
            <img
              v-if="report.afterPhotoId"
              :src="photoUrl(report.afterPhotoId)"
              alt="Foto after"
              loading="lazy"
              class="h-32 w-full object-cover"
            />
            <span v-else class="grid h-32 place-items-center text-xs text-slate-400"
              >Tidak ada foto</span
            >
          </button>
        </div>

        <div class="grid grid-cols-2 gap-2">
          <button
            v-if="isEligible(report)"
            type="button"
            class="rounded-lg bg-emerald-700 px-3 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 dark:bg-emerald-600"
            @click="approveReports([report.id], `Setujui ${report.reportNumber}?`)"
          >
            Setujui
          </button>
          <RouterLink
            :to="`/admin/laporan/${report.id}`"
            class="rounded-lg border border-slate-300 px-3 py-2.5 text-center text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"
            :class="{ 'col-span-2': !isEligible(report) }"
          >
            Tinjau & Catatan
          </RouterLink>
        </div>
      </article>
    </section>

    <div
      v-if="pagination.totalPages > 1"
      class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-900"
    >
      <span class="text-slate-500 dark:text-slate-400">
        Halaman {{ pagination.page }} dari {{ pagination.totalPages }} ·
        {{ pagination.total }} laporan
      </span>
      <div class="flex gap-2">
        <button
          type="button"
          class="btn-secondary"
          :disabled="pagination.page <= 1 || loading"
          @click="changePage(pagination.page - 1)"
        >
          Sebelumnya
        </button>
        <button
          type="button"
          class="btn-secondary"
          :disabled="pagination.page >= pagination.totalPages || loading"
          @click="changePage(pagination.page + 1)"
        >
          Berikutnya
        </button>
      </div>
    </div>

    <!-- Lightbox comparison -->
    <div
      v-if="previewReport"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4"
      role="dialog"
      aria-modal="true"
      @click.self="closePreview"
    >
      <div
        class="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-slate-900"
      >
        <div
          class="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-900"
        >
          <div>
            <h2 class="font-semibold text-[#17233d] dark:text-slate-100">
              Perbandingan Before / After
            </h2>
            <p class="text-sm text-slate-500 dark:text-slate-400">
              {{ previewReport.reportNumber }} · {{ previewReport.areaName }}
            </p>
          </div>
          <button type="button" class="btn-secondary" @click="closePreview">Tutup</button>
        </div>

        <div class="grid gap-4 p-5 md:grid-cols-2">
          <div class="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
            <div class="mb-2 flex items-center justify-between gap-2">
              <h3 class="font-semibold dark:text-slate-100">Before</h3>
              <button
                v-if="previewReport.beforePhotoId"
                type="button"
                class="text-sm font-semibold text-blue-700 hover:underline dark:text-blue-300"
                @click="
                  downloadPhoto(previewReport.beforePhotoId, previewReport.reportNumber, 'before')
                "
              >
                Download
              </button>
            </div>
            <img
              v-if="previewReport.beforePhotoId"
              :src="photoUrl(previewReport.beforePhotoId)"
              alt="Foto before ukuran besar"
              class="max-h-[60vh] w-full rounded-lg bg-slate-100 object-contain dark:bg-slate-950"
            />
            <div
              v-else
              class="grid h-64 place-items-center rounded-lg bg-slate-100 text-slate-400 dark:bg-slate-950"
            >
              Foto tidak tersedia
            </div>
            <p class="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Diambil: {{ formatWib(previewReport.beforeCapturedAt) }}
            </p>
          </div>

          <div class="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
            <div class="mb-2 flex items-center justify-between gap-2">
              <h3 class="font-semibold dark:text-slate-100">After</h3>
              <button
                v-if="previewReport.afterPhotoId"
                type="button"
                class="text-sm font-semibold text-blue-700 hover:underline dark:text-blue-300"
                @click="
                  downloadPhoto(previewReport.afterPhotoId, previewReport.reportNumber, 'after')
                "
              >
                Download
              </button>
            </div>
            <img
              v-if="previewReport.afterPhotoId"
              :src="photoUrl(previewReport.afterPhotoId)"
              alt="Foto after ukuran besar"
              class="max-h-[60vh] w-full rounded-lg bg-slate-100 object-contain dark:bg-slate-950"
            />
            <div
              v-else
              class="grid h-64 place-items-center rounded-lg bg-slate-100 text-slate-400 dark:bg-slate-950"
            >
              Foto tidak tersedia
            </div>
            <p class="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Diambil: {{ formatWib(previewReport.afterCapturedAt) }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
