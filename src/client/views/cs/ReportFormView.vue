<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter, RouterLink } from 'vue-router';
import PhotoCapture from '../../components/PhotoCapture.vue';
import StatusBadge from '../../components/StatusBadge.vue';
import { apiGet, apiPost, apiUpload, photoUrl } from '../../lib/api';
import {
  createDraftId,
  deleteDraft,
  getDraft,
  saveDraft,
  type LocalDraft,
} from '../../lib/drafts';
import type { AreaPublic, ReportPublic } from '@shared/constants';
import { useAuthStore } from '../../stores/auth';

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();

const areas = ref<AreaPublic[]>([]);
const report = ref<ReportPublic | null>(null);
const localDraft = ref<LocalDraft | null>(null);
const areaId = ref('');
const error = ref('');
const message = ref('');
const loading = ref(false);
const submitting = ref(false);

const isLocalDraft = computed(() => route.name === 'cs-local-draft');
const isNew = computed(() => route.name === 'cs-report-new');
const canEdit = computed(
  () =>
    !report.value ||
    ['DRAFT', 'REVISION_REQUIRED'].includes(report.value.status),
);

const beforePreview = computed(() => {
  const photo = report.value?.photos?.find((p) => p.photoType === 'BEFORE');
  return photo ? photoUrl(photo.id) : null;
});

const afterPreview = computed(() => {
  const photo = report.value?.photos?.find((p) => p.photoType === 'AFTER');
  return photo ? photoUrl(photo.id) : null;
});

onMounted(async () => {
  const areaData = await apiGet<{ areas: AreaPublic[] }>('/areas');
  areas.value = areaData.areas.filter((a) => a.isActive);

  if (isLocalDraft.value) {
    localDraft.value = (await getDraft(String(route.params.localId))) ?? null;
    if (localDraft.value) areaId.value = localDraft.value.areaId;
    return;
  }

  if (!isNew.value) {
    const data = await apiGet<{ report: ReportPublic }>(`/reports/${route.params.id}`);
    report.value = data.report;
    areaId.value = data.report.areaId;
  }
});

async function ensureServerReport(): Promise<string> {
  if (report.value?.id) return report.value.id;

  if (!areaId.value) throw new Error('Pilih area terlebih dahulu.');

  const created = await apiPost<{ report: ReportPublic }>('/reports', { areaId: areaId.value });
  report.value = created.report;

  if (localDraft.value) {
    localDraft.value.serverReportId = created.report.id;
    await saveDraft(localDraft.value);
  }

  if (isNew.value || isLocalDraft.value) {
    await router.replace(`/cs/laporan/${created.report.id}`);
  }

  return created.report.id;
}

async function onBeforeCapture(file: File, capturedAt: string) {
  error.value = '';
  try {
    if (isLocalDraft.value || !report.value) {
      if (!areaId.value) {
        error.value = 'Pilih area terlebih dahulu.';
        return;
      }
      const area = areas.value.find((a) => a.id === areaId.value);
      if (!localDraft.value) {
        localDraft.value = {
          id: createDraftId(),
          areaId: areaId.value,
          areaName: area?.name ?? areaId.value,
          reporterName: auth.user!.displayName,
          reporterEmail: auth.user!.email,
          createdAt: capturedAt,
          updatedAt: capturedAt,
        };
      }
      localDraft.value.beforeBlob = file;
      localDraft.value.beforeCapturedAt = capturedAt;
      localDraft.value.updatedAt = capturedAt;
      await saveDraft(localDraft.value);
    }

    loading.value = true;
    const reportId = await ensureServerReport();
    const formData = new FormData();
    formData.append('photo', file);
    formData.append('capturedAt', capturedAt);
    await apiUpload(`/photos/reports/${reportId}/before`, formData);
    const data = await apiGet<{ report: ReportPublic }>(`/reports/${reportId}`);
    report.value = data.report;
    message.value = 'Foto before tersimpan.';
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Gagal menyimpan foto before.';
  } finally {
    loading.value = false;
  }
}

async function onAfterCapture(file: File, capturedAt: string) {
  error.value = '';
  try {
    if (localDraft.value) {
      localDraft.value.afterBlob = file;
      localDraft.value.afterCapturedAt = capturedAt;
      localDraft.value.updatedAt = capturedAt;
      await saveDraft(localDraft.value);
    }

    loading.value = true;
    const reportId = await ensureServerReport();
    const formData = new FormData();
    formData.append('photo', file);
    formData.append('capturedAt', capturedAt);
    await apiUpload(`/photos/reports/${reportId}/after`, formData);
    const data = await apiGet<{ report: ReportPublic }>(`/reports/${reportId}`);
    report.value = data.report;
    message.value = 'Foto after tersimpan.';
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Gagal menyimpan foto after.';
  } finally {
    loading.value = false;
  }
}

async function submitReport() {
  if (!report.value) {
    error.value = 'Lengkapi foto before dan after terlebih dahulu.';
    return;
  }
  submitting.value = true;
  error.value = '';
  try {
    const idempotencyKey = crypto.randomUUID();
    await apiPost(`/reports/${report.value.id}/submit`, undefined, {
      'Idempotency-Key': idempotencyKey,
    });
    if (localDraft.value) await deleteDraft(localDraft.value.id);
    message.value = 'Laporan berhasil dikirim.';
    const data = await apiGet<{ report: ReportPublic }>(`/reports/${report.value.id}`);
    report.value = data.report;
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Gagal mengirim laporan.';
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold">{{ isNew || isLocalDraft ? 'Laporan Baru' : 'Detail Laporan' }}</h1>
        <p v-if="report" class="text-sm text-slate-600">{{ report.reportNumber }}</p>
      </div>
      <StatusBadge v-if="report" :status="report.status" />
    </div>

    <div class="card space-y-4">
      <div class="grid gap-4 md:grid-cols-2">
        <div>
          <label class="label">Nama CS</label>
          <input class="input bg-slate-50" :value="auth.user?.displayName" readonly />
        </div>
        <div>
          <label class="label">Email CS</label>
          <input class="input bg-slate-50" :value="auth.user?.email" readonly />
        </div>
      </div>

      <div>
        <label class="label">Area</label>
        <select v-model="areaId" class="input" :disabled="!canEdit || !!report?.id">
          <option value="">Pilih area...</option>
          <option v-for="area in areas" :key="area.id" :value="area.id">{{ area.name }}</option>
        </select>
      </div>

      <PhotoCapture
        label="Foto Before"
        :preview-url="beforePreview"
        @capture="onBeforeCapture"
      />
      <PhotoCapture
        label="Foto After"
        :preview-url="afterPreview"
        @capture="onAfterCapture"
      />

      <p v-if="report?.adminNote" class="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
        Catatan admin: {{ report.adminNote }}
      </p>
      <p v-if="message" class="text-sm text-green-700">{{ message }}</p>
      <p v-if="error" class="text-sm text-red-600">{{ error }}</p>

      <div class="flex gap-3">
        <button
          v-if="canEdit"
          type="button"
          class="btn-primary"
          :disabled="submitting || loading"
          @click="submitReport"
        >
          {{ submitting ? 'Mengirim...' : 'Kirim Laporan' }}
        </button>
        <RouterLink to="/cs" class="btn-secondary">Kembali</RouterLink>
      </div>
    </div>
  </div>
</template>