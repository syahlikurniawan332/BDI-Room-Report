<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute, RouterLink } from 'vue-router';
import { apiGet, apiPost, photoUrl } from '../../lib/api';
import StatusBadge from '../../components/StatusBadge.vue';
import { downloadReportZip, formatWib } from '../../lib/utils';
import type { ReportPublic } from '@shared/constants';

const route = useRoute();
const report = ref<ReportPublic | null>(null);
const note = ref('');
const decision = ref<'APPROVED' | 'REVISION_REQUIRED' | 'REJECTED'>('APPROVED');
const error = ref('');
const message = ref('');
const loading = ref(false);

onMounted(async () => {
  const data = await apiGet<{ report: ReportPublic }>(`/reports/${route.params.id}`);
  report.value = data.report;
});

async function submitReview() {
  if (!report.value) return;
  loading.value = true;
  error.value = '';
  try {
    const data = await apiPost<{ report: ReportPublic }>(`/reports/${report.value.id}/review`, {
      decision: decision.value,
      note: note.value || undefined,
    });
    report.value = data.report;
    message.value = 'Keputusan tersimpan.';
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
</script>

<template>
  <div v-if="report" class="mx-auto max-w-4xl space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold">{{ report.reportNumber }}</h1>
        <p class="text-sm text-slate-600">{{ report.areaName }} — {{ report.reporterName }}</p>
      </div>
      <StatusBadge :status="report.status" />
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
        <p class="mt-1 text-xs text-slate-500">{{ formatWib(report.beforeCapturedAt) }}</p>
      </div>
      <div>
        <h2 class="mb-2 font-semibold">After</h2>
        <img
          v-if="report.photos?.find((p) => p.photoType === 'AFTER')"
          :src="photoUrl(report.photos!.find((p) => p.photoType === 'AFTER')!.id)"
          class="max-h-80 rounded-lg object-contain"
          alt="After"
        />
        <p class="mt-1 text-xs text-slate-500">{{ formatWib(report.afterCapturedAt) }}</p>
      </div>
    </div>

    <div class="card space-y-3">
      <button type="button" class="btn-secondary" @click="downloadZip">Unduh ZIP</button>

      <template v-if="['SUBMITTED', 'RESUBMITTED'].includes(report.status)">
        <div>
          <label class="label">Keputusan</label>
          <select v-model="decision" class="input">
            <option value="APPROVED">Setujui</option>
            <option value="REVISION_REQUIRED">Minta Perbaikan</option>
            <option value="REJECTED">Tolak</option>
          </select>
        </div>
        <div>
          <label class="label">Catatan</label>
          <textarea v-model="note" class="input min-h-24" />
        </div>
        <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
        <p v-if="message" class="text-sm text-green-700">{{ message }}</p>
        <button type="button" class="btn-primary" :disabled="loading" @click="submitReview">
          Simpan Keputusan
        </button>
      </template>
    </div>

    <RouterLink to="/admin/laporan" class="btn-secondary inline-flex">Kembali</RouterLink>
  </div>
</template>
