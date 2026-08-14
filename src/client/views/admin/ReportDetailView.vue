<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute, RouterLink } from 'vue-router';
import { apiGet, apiPost, photoUrl } from '../../lib/api';
import StatusBadge from '../../components/StatusBadge.vue';
import { downloadReportZip, formatWib } from '../../lib/utils';
import type { ReportPublic, ReviewPublic } from '@shared/constants';

const route = useRoute();
const report = ref<ReportPublic | null>(null);
const reviews = ref<ReviewPublic[]>([]);
const note = ref('');
const decision = ref<'APPROVED' | 'REVISION_REQUIRED' | 'REJECTED'>('APPROVED');
const error = ref('');
const message = ref('');
const loading = ref(false);
const showConfirm = ref(false);

onMounted(async () => {
  const [reportData, reviewData] = await Promise.all([
    apiGet<{ report: ReportPublic }>(`/reports/${route.params.id}`),
    apiGet<{ reviews: ReviewPublic[] }>(`/reports/${route.params.id}/reviews`),
  ]);
  report.value = reportData.report;
  reviews.value = reviewData.reviews.map((r) => ({
    ...r,
    adminName: (r as ReviewPublic & { admin_name?: string }).admin_name ?? r.adminName,
  }));
});

async function submitReview() {
  if (!report.value) return;
  if (decision.value !== 'APPROVED' && !note.value.trim()) {
    error.value = 'Catatan wajib diisi untuk keputusan ini.';
    return;
  }
  loading.value = true;
  error.value = '';
  try {
    const data = await apiPost<{ report: ReportPublic }>(`/reports/${report.value.id}/review`, {
      decision: decision.value,
      note: note.value || undefined,
    });
    report.value = data.report;
    const reviewData = await apiGet<{ reviews: ReviewPublic[] }>(`/reports/${report.value.id}/reviews`);
    reviews.value = reviewData.reviews;
    message.value = 'Keputusan tersimpan.';
    showConfirm.value = false;
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Gagal menyimpan review.';
  } finally {
    loading.value = false;
  }
}

async function downloadZip() {
  if (!report.value) return;
  await downloadReportZip(report.value);
}

const decisionLabels: Record<string, string> = {
  APPROVED: 'Disetujui',
  REVISION_REQUIRED: 'Perlu Perbaikan',
  REJECTED: 'Ditolak',
};
</script>

<template>
  <div v-if="report" class="mx-auto max-w-4xl space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold">{{ report.reportNumber }}</h1>
        <p class="text-sm text-slate-600">{{ report.areaName }} — {{ report.reporterName }}</p>
        <p class="text-xs text-slate-500">{{ report.reporterEmail }}</p>
      </div>
      <StatusBadge :status="report.status" />
    </div>

    <div class="card grid gap-4 text-sm md:grid-cols-2">
      <p><span class="text-slate-500">Before:</span> {{ formatWib(report.beforeCapturedAt) }}</p>
      <p><span class="text-slate-500">After:</span> {{ formatWib(report.afterCapturedAt) }}</p>
      <p><span class="text-slate-500">Dikirim:</span> {{ formatWib(report.submittedAt) }}</p>
    </div>

    <div class="card grid gap-4 md:grid-cols-2">
      <div>
        <h2 class="mb-2 font-semibold">Before</h2>
        <img
          v-if="report.photos?.find((p) => p.photoType === 'BEFORE')"
          :src="photoUrl(report.photos!.find((p) => p.photoType === 'BEFORE')!.id)"
          class="max-h-80 rounded-lg object-contain"
          alt="Before"
        />
      </div>
      <div>
        <h2 class="mb-2 font-semibold">After</h2>
        <img
          v-if="report.photos?.find((p) => p.photoType === 'AFTER')"
          :src="photoUrl(report.photos!.find((p) => p.photoType === 'AFTER')!.id)"
          class="max-h-80 rounded-lg object-contain"
          alt="After"
        />
      </div>
    </div>

    <section v-if="reviews.length" class="card">
      <h2 class="mb-3 font-semibold">Histori Review</h2>
      <div class="space-y-3">
        <div v-for="review in reviews" :key="review.id" class="rounded-lg border border-slate-100 p-3">
          <div class="flex items-center justify-between">
            <span class="font-medium">{{ decisionLabels[review.decision] ?? review.decision }}</span>
            <span class="text-xs text-slate-500">{{ formatWib(review.createdAt) }}</span>
          </div>
          <p v-if="review.note" class="mt-1 text-sm text-slate-600">{{ review.note }}</p>
          <p class="mt-1 text-xs text-slate-400">
            {{ (review as ReviewPublic & { admin_name?: string }).admin_name ?? review.adminName ?? 'Admin' }}
          </p>
        </div>
      </div>
    </section>

    <div class="card space-y-3">
      <button type="button" class="btn-secondary" @click="downloadZip">Unduh ZIP</button>

      <template v-if="['SUBMITTED', 'RESUBMITTED'].includes(report.status)">
        <div>
          <label class="label">Keputusan</label>
          <select v-model="decision" class="input">
            <option value="APPROVED">ACC (Setujui)</option>
            <option value="REVISION_REQUIRED">Perlu Perbaikan</option>
            <option value="REJECTED">Ditolak</option>
          </select>
        </div>
        <div>
          <label class="label">Catatan</label>
          <textarea v-model="note" class="input min-h-24" />
        </div>
        <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
        <p v-if="message" class="text-sm text-green-700">{{ message }}</p>
        <button type="button" class="btn-primary" @click="showConfirm = true">Simpan Keputusan</button>
      </template>
    </div>

    <div
      v-if="showConfirm"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div class="card max-w-md space-y-4">
        <h3 class="text-lg font-semibold">Konfirmasi Keputusan</h3>
        <p class="text-sm text-slate-600">
          Yakin ingin {{ decision === 'APPROVED' ? 'menyetujui' : decision === 'REVISION_REQUIRED' ? 'meminta perbaikan pada' : 'menolak' }}
          laporan {{ report.reportNumber }}?
        </p>
        <div class="flex gap-3">
          <button type="button" class="btn-primary flex-1" :disabled="loading" @click="submitReview">
            Ya, Simpan
          </button>
          <button type="button" class="btn-secondary flex-1" @click="showConfirm = false">Batal</button>
        </div>
      </div>
    </div>

    <RouterLink to="/admin/laporan" class="btn-secondary inline-flex">Kembali</RouterLink>
  </div>
</template>
