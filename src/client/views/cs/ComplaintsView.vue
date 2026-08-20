<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { apiGet, apiPost, photoUrl } from '../../lib/api';

interface Complaint {
  id: string;
  complaintNumber: string;
  areaId: string;
  areaName: string;
  complaintText: string;
  status: string;

  assignedUserId: string | null;
  assignedAt: string | null;
  startedAt: string | null;
  waitingVerificationAt: string | null;

  submittedAt: string;
  resolvedAt: string | null;

  photo?: {
    id: string;
    mimeType: string;
    byteSize: number;
    uploadedAt: string;
  } | null;
}

const complaints = ref<Complaint[]>([]);
const loading = ref(true);
const actionId = ref<string | null>(null);
const error = ref('');
const success = ref('');

const selected = ref<Complaint | null>(null);
const detailLoading = ref(false);

const activeComplaints = computed(() =>
  complaints.value.filter((complaint) =>
    ['NEW', 'IN_PROGRESS', 'WAITING_VERIFICATION'].includes(complaint.status),
  ),
);

const completedComplaints = computed(() =>
  complaints.value.filter((complaint) => ['RESOLVED', 'REJECTED'].includes(complaint.status)),
);

function statusLabel(status: string) {
  switch (status) {
    case 'NEW':
      return 'Pengaduan Baru';

    case 'IN_PROGRESS':
      return 'Sedang Diproses';

    case 'WAITING_VERIFICATION':
      return 'Menunggu Verifikasi';

    case 'RESOLVED':
      return 'Selesai';

    case 'REJECTED':
      return 'Ditolak';

    default:
      return status;
  }
}

function statusClass(status: string) {
  switch (status) {
    case 'NEW':
      return 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300';

    case 'IN_PROGRESS':
      return 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300';

    case 'WAITING_VERIFICATION':
      return 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300';

    case 'RESOLVED':
      return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300';

    case 'REJECTED':
      return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300';

    default:
      return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300';
  }
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

async function loadComplaints() {
  loading.value = true;
  error.value = '';

  try {
    const response = await apiGet<{
      complaints: Complaint[];
    }>('/complaints/mine');

    complaints.value = response.complaints;
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Gagal mengambil pengaduan.';
  } finally {
    loading.value = false;
  }
}

async function startComplaint(complaint: Complaint) {
  actionId.value = complaint.id;
  error.value = '';
  success.value = '';

  try {
    await apiPost(`/complaints/${complaint.id}/start`, {});

    success.value = 'Pengaduan mulai ditangani.';

    await loadComplaints();
    if (selected.value?.id === complaint.id) {
      await openDetail(complaint);
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Gagal memulai penanganan pengaduan.';
  } finally {
    actionId.value = null;
  }
}

async function completeComplaint(complaint: Complaint) {
  const confirmed = window.confirm(
    `Tandai pengaduan ${complaint.complaintNumber} sebagai selesai dikerjakan?`,
  );

  if (!confirmed) {
    return;
  }

  actionId.value = complaint.id;
  error.value = '';
  success.value = '';

  try {
    await apiPost(`/complaints/${complaint.id}/complete`, {});

    success.value = 'Pengaduan telah dikirim untuk verifikasi admin.';

    await loadComplaints();
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Gagal menyelesaikan pengaduan.';
  } finally {
    actionId.value = null;
  }
}

async function openDetail(complaint: Complaint) {
  detailLoading.value = true;
  error.value = '';

  try {
    const response = await apiGet<{
      complaint: Complaint;
    }>(`/complaints/${complaint.id}`);

    selected.value = response.complaint;
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Gagal mengambil detail pengaduan.';
  } finally {
    detailLoading.value = false;
  }
}

function closeDetail() {
  selected.value = null;
}

onMounted(loadComplaints);
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div>
      <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">Pengaduan</h1>

      <p class="mt-1 text-sm text-slate-600 dark:text-slate-400">
        Pengaduan masyarakat pada area yang menjadi tanggung jawab Anda.
      </p>
    </div>

    <!-- Alert -->
    <p
      v-if="error"
      class="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
    >
      {{ error }}
    </p>

    <p
      v-if="success"
      class="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300"
    >
      {{ success }}
    </p>

    <!-- Summary -->
    <section class="grid grid-cols-2 gap-3">
      <div class="card">
        <p
          class="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
        >
          Pengaduan Aktif
        </p>

        <p class="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
          {{ loading ? '...' : activeComplaints.length }}
        </p>
      </div>

      <div class="card">
        <p
          class="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
        >
          Selesai
        </p>

        <p class="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
          {{ loading ? '...' : completedComplaints.length }}
        </p>
      </div>
    </section>

    <!-- Loading -->
    <div v-if="loading" class="card text-sm text-slate-500 dark:text-slate-400">
      Memuat pengaduan...
    </div>

    <!-- Empty -->
    <div v-else-if="complaints.length === 0" class="card py-12 text-center">
      <p class="font-medium text-slate-700 dark:text-slate-300">Belum ada pengaduan.</p>

      <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Pengaduan pada area tugas Anda akan muncul di sini.
      </p>
    </div>

    <!-- Active -->
    <section v-else-if="activeComplaints.length > 0" class="space-y-3">
      <div class="flex items-center justify-between">
        <h2 class="font-semibold text-slate-900 dark:text-slate-100">Perlu Ditindaklanjuti</h2>

        <span class="text-sm text-slate-500 dark:text-slate-400">
          {{ activeComplaints.length }} pengaduan
        </span>
      </div>

      <article v-for="complaint in activeComplaints" :key="complaint.id" class="card">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <span
                class="rounded-full px-2.5 py-1 text-xs font-semibold"
                :class="statusClass(complaint.status)"
              >
                {{ statusLabel(complaint.status) }}
              </span>

              <span class="text-xs text-slate-500 dark:text-slate-400">
                {{ complaint.complaintNumber }}
              </span>
            </div>

            <h3 class="mt-3 font-semibold text-slate-900 dark:text-slate-100">
              {{ complaint.areaName }}
            </h3>

            <p class="mt-1 line-clamp-3 text-sm text-slate-600 dark:text-slate-300">
              {{ complaint.complaintText }}
            </p>

            <p class="mt-3 text-xs text-slate-500 dark:text-slate-400">
              Dikirim {{ formatDateTime(complaint.submittedAt) }}
            </p>
          </div>

          <div class="flex shrink-0 flex-col gap-2 sm:min-w-[160px]">
            <button
              type="button"
              class="btn-secondary w-full"
              :disabled="detailLoading"
              @click="openDetail(complaint)"
            >
              Lihat Detail
            </button>

            <button
              v-if="complaint.status === 'NEW'"
              type="button"
              class="btn-primary w-full"
              :disabled="actionId === complaint.id"
              @click="startComplaint(complaint)"
            >
              {{ actionId === complaint.id ? 'Memproses...' : 'Mulai Tangani' }}
            </button>

            <button
              v-else-if="complaint.status === 'IN_PROGRESS'"
              type="button"
              class="btn-primary w-full"
              :disabled="actionId === complaint.id"
              @click="completeComplaint(complaint)"
            >
              {{ actionId === complaint.id ? 'Memproses...' : 'Selesai Dikerjakan' }}
            </button>

            <span
              v-else-if="complaint.status === 'WAITING_VERIFICATION'"
              class="block rounded-xl bg-blue-50 px-3 py-2 text-center text-sm font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
            >
              Menunggu Admin
            </span>
          </div>
        </div>
      </article>
    </section>

    <!-- History -->
    <section v-if="!loading && completedComplaints.length > 0" class="space-y-3">
      <h2 class="font-semibold text-slate-900 dark:text-slate-100">Riwayat Pengaduan</h2>

      <article
        v-for="complaint in completedComplaints"
        :key="complaint.id"
        class="card flex items-center justify-between gap-4"
      >
        <div class="min-w-0">
          <p class="truncate font-medium text-slate-900 dark:text-slate-100">
            {{ complaint.areaName }}
          </p>

          <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {{ complaint.complaintNumber }}
          </p>
        </div>

        <span
          class="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold"
          :class="statusClass(complaint.status)"
        >
          {{ statusLabel(complaint.status) }}
        </span>
      </article>
    </section>

    <!-- Detail Pengaduan -->
    <div
      v-if="selected"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      @click.self="closeDetail"
    >
      <div
        class="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl dark:bg-slate-900"
      >
        <!-- Header -->
        <div
          class="flex items-start justify-between gap-4 border-b border-slate-200 p-5 dark:border-slate-800"
        >
          <div>
            <p class="text-xs font-medium text-slate-500 dark:text-slate-400">
              {{ selected.complaintNumber }}
            </p>

            <h2 class="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">
              {{ selected.areaName }}
            </h2>
          </div>

          <button
            type="button"
            class="rounded-lg px-3 py-1.5 text-xl text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            @click="closeDetail"
          >
            ×
          </button>
        </div>

        <div class="space-y-5 p-5">
          <!-- Status -->
          <div class="flex flex-wrap items-center justify-between gap-3">
            <span
              class="rounded-full px-2.5 py-1 text-xs font-semibold"
              :class="statusClass(selected.status)"
            >
              {{ statusLabel(selected.status) }}
            </span>

            <span class="text-xs text-slate-500 dark:text-slate-400">
              {{ formatDateTime(selected.submittedAt) }}
            </span>
          </div>

          <!-- Isi -->
          <div>
            <p class="text-sm font-semibold text-slate-900 dark:text-slate-100">Isi Pengaduan</p>

            <p
              class="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600 dark:text-slate-300"
            >
              {{ selected.complaintText }}
            </p>
          </div>

          <!-- Foto -->
          <div>
            <p class="text-sm font-semibold text-slate-900 dark:text-slate-100">Foto Pendukung</p>

            <div
              v-if="selected.photo"
              class="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950"
            >
              <img
                :src="photoUrl(selected.photo.id, 'complaint')"
                alt="Foto pengaduan"
                class="max-h-[420px] w-full object-contain"
              />
            </div>

            <div
              v-else
              class="mt-3 rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400"
            >
              Pengaduan ini tidak memiliki foto pendukung.
            </div>
          </div>

          <!-- Action -->
          <div class="border-t border-slate-200 pt-4 dark:border-slate-800">
            <button
              v-if="selected.status === 'NEW'"
              type="button"
              class="btn-primary w-full"
              :disabled="actionId === selected.id"
              @click="startComplaint(selected)"
            >
              {{ actionId === selected.id ? 'Memproses...' : 'Mulai Tangani' }}
            </button>

            <button
              v-else-if="selected.status === 'IN_PROGRESS'"
              type="button"
              class="btn-primary w-full"
              :disabled="actionId === selected.id"
              @click="completeComplaint(selected)"
            >
              {{ actionId === selected.id ? 'Memproses...' : 'Selesai Dikerjakan' }}
            </button>

            <div
              v-else-if="selected.status === 'WAITING_VERIFICATION'"
              class="rounded-xl bg-blue-50 p-3 text-center text-sm font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
            >
              Pekerjaan telah dikirim dan sedang menunggu verifikasi admin.
            </div>

            <div
              v-else-if="selected.status === 'RESOLVED'"
              class="rounded-xl bg-emerald-50 p-3 text-center text-sm font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
            >
              Pengaduan telah diverifikasi selesai.
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
