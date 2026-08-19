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

interface AssignedArea {
  assignment_id: string;
  assigned_from: string;
  area_id: string;
  area_name: string;
  slug: string;
  display_order: number;
}

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
  else if (localDraft.value?.beforeBlob)
    beforeStatus.value = beforeStatus.value === 'failed' ? 'failed' : 'local';
  else beforeStatus.value = 'idle';

  if (hasAfterOnServer.value) afterStatus.value = 'saved';
  else if (localDraft.value?.afterBlob)
    afterStatus.value = afterStatus.value === 'failed' ? 'failed' : 'local';
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
  try {
    /*
     * Laporan baru:
     * hanya mengambil area yang sedang ditugaskan
     * kepada CS yang login.
     */
    if (isNew.value) {
      const assignmentData = await apiGet<{
        areas: AssignedArea[];
      }>('/area-assignments/mine');

      areas.value = assignmentData.areas.map((area) => ({
        id: area.area_id,
        name: area.area_name,
        slug: area.slug,
        isActive: true,
      })) as AreaPublic[];
    } else {
      /*
       * Draft / laporan existing tetap menggunakan master area.
       *
       * Tujuannya agar laporan lama masih dapat dibuka
       * walaupun assignment area sudah di-rolling.
       */
      const areaData = await apiGet<{
        areas: AreaPublic[];
      }>('/areas');

      areas.value = areaData.areas;
    }

    if (isLocalDraft.value) {
      localDraft.value = (await getDraft(String(route.params.localId))) ?? null;

      if (localDraft.value) {
        areaId.value = localDraft.value.areaId;
      }

      updatePreviews();
      syncUploadStatus();
      return;
    }

    if (!isNew.value) {
      const data = await apiGet<{
        report: ReportPublic;
      }>(`/reports/${route.params.id}`);

      report.value = data.report;
      areaId.value = data.report.areaId;

      await loadLocalDraftByServerId(data.report.id);

      updatePreviews();
      syncUploadStatus();

      await resumePendingUploads();
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Gagal memuat data laporan.';
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
  <div class="mx-auto max-w-4xl space-y-6">
    <div
      class="rounded-2xl bg-[#17233d] px-6 py-6 text-white shadow-[0_16px_40px_rgba(23,35,61,0.16)] sm:px-8"
    >
      <p class="text-xs font-semibold uppercase tracking-[0.22em] text-[#d8c9a7]">
        Balai Diklat Industri Medan
      </p>

      <div class="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold">
            {{ isNew || isLocalDraft ? 'Laporan Kebersihan Baru' : 'Detail Laporan' }}
          </h1>
          <p v-if="report" class="mt-1 text-sm text-slate-300">
            {{ report.reportNumber }}
          </p>
          <p v-else class="mt-1 text-sm text-slate-300">
            Dokumentasikan kondisi sebelum dan sesudah pembersihan.
          </p>
        </div>

        <StatusBadge v-if="report" :status="report.status" />
      </div>
    </div>

    <section
      class="overflow-hidden rounded-2xl border border-[#e4dccb] dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm"
    >
      <div class="border-b border-[#eee7d8] dark:border-slate-800 px-6 py-5">
        <h2 class="font-semibold text-[#17233d] dark:text-slate-100">Informasi laporan</h2>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Pastikan area yang dipilih sudah sesuai sebelum mengambil foto.
        </p>
      </div>

      <div class="space-y-6 p-6">
        <div class="grid gap-4 md:grid-cols-2">
          <div>
            <label class="label">Nama Pegawai CS</label>
            <input
              class="input bg-[#fdfbf6] text-slate-600 dark:text-slate-300"
              :value="auth.user?.displayName"
              readonly
            />
          </div>

          <div>
            <label class="label">Email CS</label>
            <input
              class="input bg-[#fdfbf6] text-slate-600 dark:text-slate-300"
              :value="auth.user?.email"
              readonly
            />
          </div>
        </div>

        <div>
          <label class="label">Area</label>
          <select v-model="areaId" class="input" :disabled="!canEdit || !!report?.id">
            <option value="">Pilih area tugas...</option>

            <option v-for="area in areas" :key="area.id" :value="area.id">
              {{ area.name }}
            </option>
          </select>
          <p
            v-if="isNew && areas.length === 0"
            class="mt-2 text-sm text-amber-600 dark:text-amber-400"
          >
            Belum ada area yang ditugaskan kepada Anda. Hubungi admin untuk mengatur penugasan area.
          </p>

          <p v-else-if="isNew" class="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Hanya area yang menjadi tanggung jawab Anda yang ditampilkan.
          </p>
        </div>
      </div>
    </section>

    <section
      class="overflow-hidden rounded-2xl border border-[#e4dccb] dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm"
    >
      <div class="border-b border-[#eee7d8] dark:border-slate-800 px-6 py-5">
        <h2 class="font-semibold text-[#17233d] dark:text-slate-100">Dokumentasi kebersihan</h2>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Ambil foto kondisi sebelum dan setelah pembersihan.
        </p>
      </div>

      <div class="grid gap-5 p-6 md:grid-cols-2">
        <div class="rounded-xl border border-[#e4dccb] dark:border-slate-700 bg-[#fdfbf6] p-4">
          <p class="mb-3 text-sm font-semibold text-[#17233d] dark:text-slate-100">
            1. Foto Before
          </p>
          <PhotoCapture
            label="Foto Before"
            mode="camera"
            :preview-url="beforePreview"
            :status="beforeStatus"
            :disabled="!canEdit"
            @capture="(file, at) => handlePhotoCapture('before', file, at)"
            @retry="retryUpload('before')"
          />
        </div>

        <div class="rounded-xl border border-[#e4dccb] dark:border-slate-700 bg-[#fdfbf6] p-4">
          <p class="mb-3 text-sm font-semibold text-[#17233d] dark:text-slate-100">2. Foto After</p>
          <PhotoCapture
            label="Foto After"
            mode="camera"
            :preview-url="afterPreview"
            :status="afterStatus"
            :disabled="!canEdit || !hasBeforeOnServer"
            @capture="(file, at) => handlePhotoCapture('after', file, at)"
            @retry="retryUpload('after')"
          />
        </div>
      </div>
    </section>

    <p
      v-if="report?.adminNote"
      class="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-5 py-4 text-sm leading-6 text-amber-950"
    >
      <span class="font-semibold">Catatan admin:</span>
      {{ report.adminNote }}
    </p>

    <p
      v-if="message"
      class="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-800"
    >
      {{ message }}
    </p>

    <p
      v-if="error"
      class="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/30 px-5 py-4 text-sm text-red-700 dark:text-red-300"
    >
      {{ error }}
    </p>

    <div
      class="flex flex-col-reverse gap-3 border-t border-[#e4dccb] dark:border-slate-700 pt-6 sm:flex-row sm:justify-between"
    >
      <RouterLink
        to="/cs"
        class="inline-flex min-h-12 items-center justify-center rounded-xl border border-[#cbd5e1] bg-white dark:bg-slate-900 px-5 text-sm font-semibold text-[#17233d] dark:text-slate-100 transition hover:border-[#17233d] hover:bg-[#fdfbf6] dark:hover:bg-slate-800"
      >
        Kembali
      </RouterLink>

      <button
        v-if="canEdit"
        type="button"
        class="min-h-12 rounded-xl bg-[#17233d] px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-[#243557] disabled:cursor-not-allowed disabled:opacity-60"
        :disabled="!canSubmit"
        @click="submitReport"
      >
        {{ submitting ? 'Mengirim laporan...' : 'Kirim Laporan' }}
      </button>
    </div>
  </div>
</template>
