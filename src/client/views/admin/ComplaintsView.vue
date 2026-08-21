<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { apiGet, apiPost, photoUrl } from '../../lib/api';
import StatusBadge from '../../components/StatusBadge.vue';
import { formatWib } from '../../lib/utils';
import type { ComplaintPublic } from '@shared/constants';

type AdminComplaint = ComplaintPublic;

const complaints = ref<AdminComplaint[]>([]);
const selected = ref<AdminComplaint | null>(null);

const loading = ref(true);
const detailLoading = ref(false);
const actionLoading = ref(false);

const error = ref('');
const success = ref('');

const showReturnForm = ref(false);
const returnNote = ref('');
const previewPhotoId = ref<string | null>(null);

const waitingCount = computed(
  () => complaints.value.filter((item) => item.status === 'WAITING_VERIFICATION').length,
);

const activeCount = computed(
  () => complaints.value.filter((item) => ['NEW', 'IN_PROGRESS'].includes(item.status)).length,
);

async function loadList() {
  error.value = '';

  try {
    const data = await apiGet<{
      complaints: AdminComplaint[];
    }>('/complaints');

    complaints.value = data.complaints;
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Gagal mengambil daftar pengaduan.';
  }
}

async function openDetail(id: string) {
  detailLoading.value = true;
  error.value = '';
  success.value = '';
  showReturnForm.value = false;
  returnNote.value = '';

  try {
    const data = await apiGet<{
      complaint: AdminComplaint;
    }>(`/complaints/${id}`);

    selected.value = data.complaint;
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Gagal mengambil detail pengaduan.';
  } finally {
    detailLoading.value = false;
  }
}

async function refreshSelected() {
  await loadList();

  if (selected.value) {
    await openDetail(selected.value.id);
  }
}

async function verifyComplaint() {
  if (!selected.value) return;

  const confirmed = window.confirm(`Verifikasi ${selected.value.complaintNumber} sebagai selesai?`);

  if (!confirmed) return;

  actionLoading.value = true;
  error.value = '';
  success.value = '';

  try {
    await apiPost(`/complaints/${selected.value.id}/verify`, {});

    success.value = 'Pengaduan berhasil diverifikasi sebagai selesai.';

    await refreshSelected();
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Gagal memverifikasi pengaduan.';
  } finally {
    actionLoading.value = false;
  }
}

async function verifyAllComplaints() {
  if (waitingCount.value === 0) return;

  const confirmed = window.confirm(
    `Verifikasi selesai untuk ${waitingCount.value} pengaduan yang sedang menunggu verifikasi?`,
  );
  if (!confirmed) return;

  actionLoading.value = true;
  error.value = '';
  success.value = '';

  try {
    const result = await apiPost<{ verifiedCount: number }>('/complaints/verify-all', {});
    success.value = `${result.verifiedCount} pengaduan berhasil diverifikasi selesai.`;
    await refreshSelected();
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Gagal memverifikasi semua pengaduan.';
  } finally {
    actionLoading.value = false;
  }
}

async function returnComplaint() {
  if (!selected.value) return;

  const note = returnNote.value.trim();

  if (note.length < 3) {
    error.value = 'Catatan tindak lanjut wajib diisi minimal 3 karakter.';
    return;
  }

  actionLoading.value = true;
  error.value = '';
  success.value = '';

  try {
    await apiPost(`/complaints/${selected.value.id}/return`, {
      note,
    });

    success.value = 'Pengaduan dikembalikan kepada CS untuk ditindaklanjuti.';

    showReturnForm.value = false;
    returnNote.value = '';

    await refreshSelected();
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Gagal mengembalikan pengaduan kepada CS.';
  } finally {
    actionLoading.value = false;
  }
}

function statusDescription(status: string) {
  switch (status) {
    case 'NEW':
      return 'Pengaduan telah diterima dan menunggu CS mulai menangani.';

    case 'IN_PROGRESS':
      return 'Pengaduan sedang ditangani oleh CS.';

    case 'WAITING_VERIFICATION':
      return 'CS telah menyelesaikan pekerjaan dan menunggu verifikasi admin.';

    case 'RESOLVED':
      return 'Pengaduan telah diverifikasi selesai.';

    case 'REJECTED':
      return 'Pengaduan ditolak.';

    default:
      return '';
  }
}

onMounted(async () => {
  await loadList();
  loading.value = false;
});
</script>

<template>
  <div class="space-y-6">
    <div>
      <p
        class="text-xs font-semibold uppercase tracking-[0.2em] text-[#a38a59] dark:text-amber-400"
      >
        Administrasi
      </p>

      <h1 class="mt-1 text-2xl font-bold text-[#17233d] dark:text-slate-100">
        Pengaduan Masyarakat
      </h1>

      <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">
        Tinjau pengaduan yang dikirim melalui formulir publik.
      </p>
    </div>

    <section class="grid gap-3 sm:grid-cols-3">
      <div
        class="rounded-2xl border border-[#e4dccb] bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
      >
        <p
          class="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
        >
          Total
        </p>

        <p class="mt-1 text-2xl font-bold text-[#17233d] dark:text-slate-100">
          {{ complaints.length }}
        </p>
      </div>

      <div
        class="rounded-2xl border border-[#e4dccb] bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
      >
        <p
          class="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
        >
          Sedang Ditangani
        </p>

        <p class="mt-1 text-2xl font-bold text-amber-600 dark:text-amber-400">
          {{ activeCount }}
        </p>
      </div>

      <div
        class="rounded-2xl border border-blue-200 bg-blue-50 p-4 shadow-sm dark:border-blue-900 dark:bg-blue-950/30"
      >
        <p class="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
          Perlu Verifikasi
        </p>

        <p class="mt-1 text-2xl font-bold text-blue-700 dark:text-blue-300">
          {{ waitingCount }}
        </p>
      </div>
    </section>

    <div class="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
      <!-- Daftar pengaduan -->
      <section
        class="overflow-hidden rounded-2xl border border-[#e4dccb] bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
      >
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-[#eee7d8] px-5 py-4 dark:border-slate-800">
          <h2 class="font-semibold text-[#17233d] dark:text-slate-100">Daftar pengaduan</h2>

          <div class="flex items-center gap-2">
            <button
              v-if="waitingCount > 0"
              type="button"
              class="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
              :disabled="actionLoading"
              @click="verifyAllComplaints"
            >
              Verifikasi Semua Selesai ({{ waitingCount }})
            </button>
            <span class="rounded-full bg-[#f3ecdc] px-3 py-1 text-xs font-semibold text-[#17233d] dark:bg-slate-800 dark:text-slate-200">
              {{ complaints.length }} pengaduan
            </span>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="min-w-full text-sm">
            <thead
              class="bg-[#fdfbf6] text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:bg-slate-950 dark:text-slate-400"
            >
              <tr>
                <th class="px-5 py-3">No.</th>
                <th class="px-4 py-3">Area</th>
                <th class="px-4 py-3">Foto</th>
                <th class="px-4 py-3">Status</th>
                <th class="px-5 py-3" aria-label="Pilih" />
              </tr>
            </thead>

            <tbody class="divide-y divide-[#eee7d8] dark:divide-slate-800">
              <tr v-if="loading">
                <td colspan="5" class="px-5 py-10 text-center text-slate-500 dark:text-slate-400">
                  Memuat pengaduan...
                </td>
              </tr>

              <tr v-else-if="!complaints.length">
                <td colspan="5" class="px-5 py-10 text-center text-slate-500 dark:text-slate-400">
                  Belum ada pengaduan.
                </td>
              </tr>

              <tr
                v-for="item in complaints"
                :key="item.id"
                class="cursor-pointer transition hover:bg-[#fdfbf6] dark:hover:bg-slate-800/70"
                :class="selected?.id === item.id ? 'bg-[#f3ecdc]/70 dark:bg-slate-800' : ''"
                @click="openDetail(item.id)"
              >
                <td class="px-5 py-4 font-medium text-[#17233d] dark:text-slate-100">
                  {{ item.complaintNumber }}
                </td>

                <td class="px-4 py-4 text-slate-700 dark:text-slate-300">
                  {{ item.areaName }}
                </td>

                <td class="px-4 py-4" @click.stop>
                  <button
                    v-if="item.completionPhoto"
                    type="button"
                    class="block overflow-hidden rounded-lg border border-slate-200 transition hover:border-[#17233d] hover:shadow-md dark:border-slate-700"
                    title="Lihat foto bukti"
                    @click="previewPhotoId = item.completionPhoto?.id ?? null"
                  >
                    <img
                      :src="photoUrl(item.completionPhoto.id, 'complaint')"
                      alt="Bukti penyelesaian"
                      class="h-12 w-12 object-cover"
                    />
                  </button>
                  <span v-else class="text-xs text-slate-400">Tidak ada foto</span>
                </td>

                <td class="px-4 py-4">
                  <StatusBadge :status="item.status" />
                </td>

                <td class="px-5 py-4 text-right text-lg text-[#17233d] dark:text-slate-300">→</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Detail pengaduan -->
      <section
        class="rounded-2xl border border-[#e4dccb] bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
      >
        <div
          v-if="!selected"
          class="flex min-h-[380px] flex-col items-center justify-center px-6 text-center"
        >
          <div
            class="flex h-12 w-12 items-center justify-center rounded-full bg-[#f3ecdc] text-xl text-[#17233d] dark:bg-slate-800 dark:text-slate-200"
          >
            →
          </div>

          <h2 class="mt-4 font-semibold text-[#17233d] dark:text-slate-100">Pilih pengaduan</h2>

          <p class="mt-2 max-w-sm text-sm leading-6 text-slate-500 dark:text-slate-400">
            Pilih salah satu pengaduan untuk melihat detail, penanggung jawab, dan progres
            penanganannya.
          </p>
        </div>

        <template v-else>
          <div
            class="flex flex-wrap items-start justify-between gap-3 border-b border-[#eee7d8] px-5 py-4 dark:border-slate-800"
          >
            <div>
              <p
                class="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
              >
                Detail pengaduan
              </p>

              <h2 class="mt-1 font-semibold text-[#17233d] dark:text-slate-100">
                {{ selected.complaintNumber }}
              </h2>
            </div>

            <StatusBadge :status="selected.status" />
          </div>

          <div class="space-y-5 p-5">
            <div
              class="rounded-xl bg-[#fdfbf6] px-4 py-3 text-sm text-slate-600 dark:bg-slate-950 dark:text-slate-300"
            >
              <span class="font-semibold text-[#17233d] dark:text-slate-100">
                {{ selected.areaName }}
              </span>

              <span class="mx-2 text-slate-300 dark:text-slate-600">•</span>

              {{ formatWib(selected.submittedAt) }}
            </div>

            <div>
              <p class="text-sm font-semibold text-[#17233d] dark:text-slate-100">Isi pengaduan</p>

              <p
                class="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600 dark:text-slate-300"
              >
                {{ selected.complaintText }}
              </p>
            </div>

            <div v-if="selected.photo">
              <p class="mb-2 text-sm font-semibold text-[#17233d] dark:text-slate-100">
                Foto pendukung
              </p>

              <img
                :src="photoUrl(selected.photo.id, 'complaint')"
                alt="Foto pengaduan"
                class="max-h-72 w-full rounded-xl border border-[#e4dccb] bg-[#fdfbf6] object-contain dark:border-slate-700 dark:bg-slate-950"
              />
            </div>

            <div v-if="selected.completionPhoto">
              <p class="mb-2 text-sm font-semibold text-[#17233d] dark:text-slate-100">
                Bukti penyelesaian dari CS
              </p>
              <button
                type="button"
                class="block w-full"
                @click="previewPhotoId = selected.completionPhoto?.id ?? null"
              >
                <img
                  :src="photoUrl(selected.completionPhoto.id, 'complaint')"
                  alt="Bukti penyelesaian dari CS"
                  class="max-h-72 w-full rounded-xl border border-[#e4dccb] bg-[#fdfbf6] object-contain dark:border-slate-700 dark:bg-slate-950"
                />
              </button>
            </div>

            <!-- Penanggung jawab -->
            <div
              class="grid gap-3 rounded-xl border border-[#eee7d8] p-4 dark:border-slate-800 sm:grid-cols-2"
            >
              <div>
                <p class="text-xs font-medium text-slate-500 dark:text-slate-400">
                  CS Penanggung Jawab
                </p>

                <p
                  class="mt-1 text-sm font-semibold"
                  :class="
                    selected.assignedUserId
                      ? 'text-[#17233d] dark:text-slate-100'
                      : 'text-red-600 dark:text-red-400'
                  "
                >
                  {{ selected.assignedUserName ?? selected.assignedUserId ?? 'Belum ditugaskan' }}
                </p>
              </div>

              <div>
                <p class="text-xs font-medium text-slate-500 dark:text-slate-400">Status Proses</p>

                <div class="mt-1">
                  <StatusBadge :status="selected.status" />
                </div>
              </div>
            </div>

            <!-- Informasi workflow -->
            <div class="rounded-xl bg-[#fdfbf6] p-4 dark:bg-slate-950">
              <p class="text-sm font-semibold text-[#17233d] dark:text-slate-100">
                Progres Penanganan
              </p>

              <p class="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
                {{ statusDescription(selected.status) }}
              </p>

              <div class="mt-4 space-y-2 text-xs text-slate-500 dark:text-slate-400">
                <p>
                  <span class="font-medium">Diterima:</span>
                  {{ formatWib(selected.submittedAt) }}
                </p>

                <p v-if="selected.assignedAt">
                  <span class="font-medium">Ditugaskan:</span>
                  {{ formatWib(selected.assignedAt) }}
                </p>

                <p v-if="selected.startedAt">
                  <span class="font-medium">Mulai ditangani:</span>
                  {{ formatWib(selected.startedAt) }}
                </p>

                <p v-if="selected.waitingVerificationAt">
                  <span class="font-medium">Selesai oleh CS:</span>
                  {{ formatWib(selected.waitingVerificationAt) }}
                </p>

                <p v-if="selected.resolvedAt">
                  <span class="font-medium">Diverifikasi:</span>
                  {{ formatWib(selected.resolvedAt) }}
                </p>
              </div>
            </div>

            <!-- Aksi verifikasi -->
            <div
              v-if="selected.status === 'WAITING_VERIFICATION'"
              class="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/30"
            >
              <p class="font-semibold text-blue-900 dark:text-blue-200">
                Menunggu verifikasi admin
              </p>

              <p class="mt-1 text-sm text-blue-700 dark:text-blue-300">
                Periksa hasil penanganan sebelum menutup pengaduan.
              </p>

              <div v-if="!showReturnForm" class="mt-4 flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  class="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                  :disabled="actionLoading"
                  @click="verifyComplaint"
                >
                  {{ actionLoading ? 'Memproses...' : 'Verifikasi Selesai' }}
                </button>

                <button
                  type="button"
                  class="rounded-xl border border-blue-300 bg-white px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 disabled:opacity-50 dark:border-blue-800 dark:bg-slate-900 dark:text-blue-300 dark:hover:bg-blue-950"
                  :disabled="actionLoading"
                  @click="showReturnForm = true"
                >
                  Minta Tindak Lanjut
                </button>
              </div>

              <div v-else class="mt-4 space-y-3">
                <div>
                  <label class="label"> Catatan untuk CS </label>

                  <textarea
                    v-model="returnNote"
                    class="input min-h-[100px] resize-y"
                    placeholder="Contoh: Mohon bersihkan kembali bagian lantai dekat pintu."
                  />
                </div>

                <div class="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    class="rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:opacity-50"
                    :disabled="actionLoading"
                    @click="returnComplaint"
                  >
                    {{ actionLoading ? 'Mengirim...' : 'Kirim Tindak Lanjut' }}
                  </button>

                  <button
                    type="button"
                    class="btn-secondary"
                    :disabled="actionLoading"
                    @click="
                      showReturnForm = false;
                      returnNote = '';
                    "
                  >
                    Batal
                  </button>
                </div>
              </div>
            </div>

            <!-- Monitoring -->
            <div
              v-else-if="selected.status === 'NEW' || selected.status === 'IN_PROGRESS'"
              class="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300"
            >
              Tidak ada tindakan yang diperlukan dari admin. Pengaduan sedang berada pada proses CS.
            </div>

            <!-- Sudah selesai -->
            <div
              v-else-if="selected.status === 'RESOLVED'"
              class="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300"
            >
              Pengaduan ini telah diverifikasi dan dinyatakan selesai.
            </div>

          </div>
        </template>
      </section>
    </div>
    <div
      v-if="previewPhotoId"
      class="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/80 p-4"
      @click="previewPhotoId = null"
    >
      <button
        type="button"
        class="absolute right-4 top-4 rounded-full bg-white/90 px-3 py-2 text-xl text-slate-900"
        aria-label="Tutup foto"
        @click="previewPhotoId = null"
      >
        &times;
      </button>
      <img
        :src="photoUrl(previewPhotoId, 'complaint')"
        alt="Bukti penyelesaian diperbesar"
        class="max-h-[90vh] max-w-[95vw] rounded-xl object-contain"
        @click.stop
      />
    </div>
  </div>
</template>
