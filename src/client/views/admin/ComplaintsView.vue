<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { apiGet, apiPatch, photoUrl } from '../../lib/api';
import StatusBadge from '../../components/StatusBadge.vue';
import { formatWib, COMPLAINT_STATUS_LABELS } from '../../lib/utils';
import type { ComplaintPublic } from '@shared/constants';

const complaints = ref<ComplaintPublic[]>([]);
const selected = ref<ComplaintPublic | null>(null);
const status = ref<ComplaintPublic['status']>('IN_PROGRESS');
const adminNote = ref('');
const loading = ref(true);

async function loadList() {
  const data = await apiGet<{ complaints: ComplaintPublic[] }>('/complaints');
  complaints.value = data.complaints;
}

async function openDetail(id: string) {
  const data = await apiGet<{ complaint: ComplaintPublic }>(`/complaints/${id}`);
  selected.value = data.complaint;
  status.value = data.complaint.status;
  adminNote.value = data.complaint.adminNote ?? '';
}

async function save() {
  if (!selected.value) return;
  await apiPatch(`/complaints/${selected.value.id}`, {
    status: status.value,
    adminNote: adminNote.value,
  });
  await loadList();
  await openDetail(selected.value.id);
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

    <div class="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
      <!-- Daftar pengaduan -->
      <section
        class="overflow-hidden rounded-2xl border border-[#e4dccb] bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
      >
        <div
          class="flex items-center justify-between border-b border-[#eee7d8] px-5 py-4 dark:border-slate-800"
        >
          <h2 class="font-semibold text-[#17233d] dark:text-slate-100">
            Daftar pengaduan
          </h2>

          <span
            class="rounded-full bg-[#f3ecdc] px-3 py-1 text-xs font-semibold text-[#17233d] dark:bg-slate-800 dark:text-slate-200"
          >
            {{ complaints.length }} pengaduan
          </span>
        </div>

        <div class="overflow-x-auto">
          <table class="min-w-full text-sm">
            <thead
              class="bg-[#fdfbf6] text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:bg-slate-950 dark:text-slate-400"
            >
              <tr>
                <th class="px-5 py-3">No.</th>
                <th class="px-4 py-3">Area</th>
                <th class="px-4 py-3">Status</th>
                <th class="px-5 py-3" aria-label="Pilih" />
              </tr>
            </thead>

            <tbody class="divide-y divide-[#eee7d8] dark:divide-slate-800">
              <tr v-if="loading">
                <td
                  colspan="4"
                  class="px-5 py-10 text-center text-slate-500 dark:text-slate-400"
                >
                  Memuat pengaduan...
                </td>
              </tr>

              <tr v-else-if="!complaints.length">
                <td
                  colspan="4"
                  class="px-5 py-10 text-center text-slate-500 dark:text-slate-400"
                >
                  Belum ada pengaduan.
                </td>
              </tr>

              <tr
                v-for="item in complaints"
                :key="item.id"
                class="cursor-pointer transition hover:bg-[#fdfbf6] dark:hover:bg-slate-800/70"
                :class="
                  selected?.id === item.id
                    ? 'bg-[#f3ecdc]/70 dark:bg-slate-800'
                    : ''
                "
                @click="openDetail(item.id)"
              >
                <td
                  class="px-5 py-4 font-medium text-[#17233d] dark:text-slate-100"
                >
                  {{ item.complaintNumber }}
                </td>

                <td class="px-4 py-4 text-slate-700 dark:text-slate-300">
                  {{ item.areaName }}
                </td>

                <td class="px-4 py-4">
                  <StatusBadge :status="item.status" />
                </td>

                <td
                  class="px-5 py-4 text-right text-lg text-[#17233d] dark:text-slate-300"
                >
                  →
                </td>
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

          <h2 class="mt-4 font-semibold text-[#17233d] dark:text-slate-100">
            Pilih pengaduan
          </h2>

          <p
            class="mt-2 max-w-sm text-sm leading-6 text-slate-500 dark:text-slate-400"
          >
            Klik salah satu baris pengaduan untuk melihat detail dan
            memperbarui statusnya.
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

            <StatusBadge :status="status" />
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
              <p class="text-sm font-semibold text-[#17233d] dark:text-slate-100">
                Isi pengaduan
              </p>

              <p
                class="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600 dark:text-slate-300"
              >
                {{ selected.complaintText }}
              </p>
            </div>

            <div v-if="selected.photo">
              <p
                class="mb-2 text-sm font-semibold text-[#17233d] dark:text-slate-100"
              >
                Foto pendukung
              </p>

              <img
                :src="photoUrl(selected.photo.id, 'complaint')"
                alt="Foto pengaduan"
                class="max-h-72 w-full rounded-xl border border-[#e4dccb] bg-[#fdfbf6] object-contain dark:border-slate-700 dark:bg-slate-950"
              />
            </div>

            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label class="label">Status pengaduan</label>

                <select v-model="status" class="input">
                  <option
                    v-for="(label, key) in COMPLAINT_STATUS_LABELS"
                    :key="key"
                    :value="key"
                  >
                    {{ label }}
                  </option>
                </select>
              </div>

              <div>
                <label class="label">Catatan admin</label>

                <textarea
                  v-model="adminNote"
                  class="input min-h-[102px] resize-y"
                  placeholder="Tambahkan catatan tindak lanjut..."
                />
              </div>
            </div>

            <div
              class="flex justify-end border-t border-[#eee7d8] pt-5 dark:border-slate-800"
            >
              <button
                type="button"
                class="rounded-xl bg-[#17233d] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#243557] dark:bg-blue-600 dark:hover:bg-blue-500"
                @click="save"
              >
                Simpan Perubahan
              </button>
            </div>
          </div>
        </template>
      </section>
    </div>
  </div>
</template>
