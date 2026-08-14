<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter, RouterLink } from 'vue-router';
import PhotoCapture, { type UploadStatus } from '../../components/PhotoCapture.vue';
import StatusBadge from '../../components/StatusBadge.vue';
import { apiGet, apiPost, apiUpload, photoUrl } from '../../lib/api';
import {
  createDraftId,
  deleteDraft,
  getDraft,
  listDrafts,
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
const beforeStatus = ref<UploadStatus>('idle');
const afterStatus = ref<UploadStatus>('idle');

const isLocalDraft = computed(() => route.name === 'cs-local-draft');
const isNew = computed(() => route.name === 'cs-report-new');
const canEdit = computed(
  () => !report.value || ['DRAFT', 'REVISION_REQUIRED'].includes(report.value.status),
);

const beforePreview = ref<string | null>(null);
const afterPreview = ref<string | null>(null);

function updatePreviews() {
  if (localDraft.value?.beforeBlob) {
    beforePreview.value = URL.createObjectURL(localDraft.value.beforeBlob);
  } else {
    const photo = report.value?.photos?.find((p) => p.photoType === 'BEFORE');
    beforePreview.value = photo ? photoUrl(photo.id) : null;
  }

  if (localDraft.value?.afterBlob) {
    afterPreview.value = URL.createObjectURL(localDraft.value.afterBlob);
  } else {
    const photo = report.value?.photos?.find((p) => p.photoType === 'AFTER');
    afterPreview.value = photo ? photoUrl(photo.id) : null;
  }
}

const hasBeforeOnServer = computed(() =>
  Boolean(report.value?.photos?.some((p) => p.photoType === 'BEFORE')),
);
const hasAfterOnServer = computed(() =>
  Boolean(report.value?.photos?.some((p) => p.photoType === 'AFTER')),
);
const canSubmit = computed(
  () => canEdit.value && hasBeforeOnServer.value && hasAfterOnServer.value && !submitting.value,
);

function syncUploadStatus() {
  if (hasBeforeOnServer.value) beforeStatus.value = 'saved';
  else if (localDraft.value?.beforeBlob) beforeStatus.value = beforeStatus.value === 'failed' ? 'failed' : 'local';
  else beforeStatus.value = 'idle';

  if (hasAfterOnServer.value) afterStatus.value = 'saved';
  else if (localDraft.value?.afterBlob) afterStatus.value = afterStatus.value === 'failed' ? 'failed' : 'local';
  else afterStatus.value = 'idle';
}

async function uploadPhoto(type: 'before' | 'after', file: File, capturedAt: string) {
  const reportId = await ensureServerReport();
  const formData = new FormData();
  formData.append('photo', file);
  formData.append('capturedAt', capturedAt);
  await apiUpload(`/photos/reports/${reportId}/${type}`, formData);
  const data = await apiGet<{ report: ReportPublic }>(`/reports/${reportId}`);
  report.value = data.report;
  updatePreviews();
}

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

async function handlePhotoCapture(type: 'before' | 'after', file: File, capturedAt: string) {
  error.value = '';
  const statusRef = type === 'before' ? beforeStatus : afterStatus;
  statusRef.value = 'local';

  try {
    if (type === 'before' && (isLocalDraft.value || !report.value)) {
      if (!areaId.value) {
        error.value = 'Pilih area terlebih dahulu.';
        statusRef.value = 'idle';
        return;
      }
      const area = areas.value.find((a) => a.id === areaId.value);
      if (!localDraft.value) {
        localDraft.value = {
          id: isLocalDraft.value ? String(route.params.localId) : createDraftId(),
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

    if (type === 'after' && localDraft.value) {
      localDraft.value.afterBlob = file;
      localDraft.value.afterCapturedAt = capturedAt;
      localDraft.value.updatedAt = capturedAt;
      await saveDraft(localDraft.value);
    }

    statusRef.value = 'uploading';
    loading.value = true;
    await uploadPhoto(type, file, capturedAt);
    statusRef.value = 'saved';
    message.value = `Foto ${type} tersimpan.`;
  } catch (e) {
    statusRef.value = 'failed';
    error.value = e instanceof Error ? e.message : `Gagal menyimpan foto ${type}.`;
  } finally {
    loading.value = false;
    syncUploadStatus();
  }
}

async function retryUpload(type: 'before' | 'after') {
  const blob = type === 'before' ? localDraft.value?.beforeBlob : localDraft.value?.afterBlob;
  const capturedAt =
    type === 'before' ? localDraft.value?.beforeCapturedAt : localDraft.value?.afterCapturedAt;
  if (!blob || !capturedAt) return;
  const file = blob instanceof File ? blob : new File([blob], 'photo.webp', { type: 'image/webp' });
  await handlePhotoCapture(type, file, capturedAt);
}

async function resumePendingUploads() {
  if (!localDraft.value || !report.value?.id) return;
  if (localDraft.value.beforeBlob && !hasBeforeOnServer.value) {
    await retryUpload('before');
  }
  if (localDraft.value.afterBlob && !hasAfterOnServer.value) {
    await retryUpload('after');
  }
}

async function loadLocalDraftByServerId(serverReportId: string) {
  const drafts = await listDrafts();
  localDraft.value = drafts.find((d) => d.serverReportId === serverReportId) ?? null;
}

onMounted(async () => {
  const areaData = await apiGet<{ areas: AreaPublic[] }>('/areas');
  areas.value = areaData.areas.filter((a) => a.isActive);

  if (isLocalDraft.value) {
    localDraft.value = (await getDraft(String(route.params.localId))) ?? null;
    if (localDraft.value) areaId.value = localDraft.value.areaId;
    updatePreviews();
    syncUploadStatus();
    return;
  }

  if (!isNew.value) {
    const data = await apiGet<{ report: ReportPublic }>(`/reports/${route.params.id}`);
    report.value = data.report;
    areaId.value = data.report.areaId;
    await loadLocalDraftByServerId(data.report.id);
    updatePreviews();
    syncUploadStatus();
    await resumePendingUploads();
  }
});

async function submitReport() {
  if (!canSubmit.value || !report.value) {
    error.value = 'Lengkapi foto before dan after di server terlebih dahulu.';
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
    <div class="text-center">
      <h1 class="text-lg font-bold uppercase tracking-wide text-primary-800">
        Form Controling Cleaning Service
      </h1>
      <p class="text-sm font-medium text-slate-600">Balai Diklat Industri Medan</p>
    </div>

    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-xl font-bold">{{ isNew || isLocalDraft ? 'Laporan Baru' : 'Detail Laporan' }}</h2>
        <p v-if="report" class="text-sm text-slate-600">{{ report.reportNumber }}</p>
      </div>
      <StatusBadge v-if="report" :status="report.status" />
    </div>

    <div class="card space-y-4">
      <div class="grid gap-4 md:grid-cols-2">
        <div>
          <label class="label">Nama Pegawai CS</label>
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
        mode="camera"
        :preview-url="beforePreview"
        :status="beforeStatus"
        :disabled="!canEdit"
        @capture="(file, at) => handlePhotoCapture('before', file, at)"
        @retry="retryUpload('before')"
      />
      <PhotoCapture
        label="Foto After"
        mode="camera"
        :preview-url="afterPreview"
        :status="afterStatus"
        :disabled="!canEdit || !hasBeforeOnServer"
        @capture="(file, at) => handlePhotoCapture('after', file, at)"
        @retry="retryUpload('after')"
      />

      <p v-if="report?.adminNote" class="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
        Catatan admin: {{ report.adminNote }}
      </p>
      <p v-if="message" class="text-sm text-green-700">{{ message }}</p>
      <p v-if="error" class="text-sm text-red-600">{{ error }}</p>

      <div class="flex flex-col gap-3 sm:flex-row">
        <button
          v-if="canEdit"
          type="button"
          class="btn-primary min-h-14 flex-1 text-base"
          :disabled="!canSubmit"
          @click="submitReport"
        >
          {{ submitting ? 'Mengirim...' : 'Kirim Laporan' }}
        </button>
        <RouterLink to="/cs" class="btn-secondary min-h-14 text-center">Kembali</RouterLink>
      </div>
    </div>
  </div>
</template>
