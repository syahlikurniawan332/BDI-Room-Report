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
  <div class="space-y-4">
    <h1 class="text-2xl font-bold">Pengaduan Masyarakat</h1>

    <div class="grid gap-4 lg:grid-cols-2">
      <div class="card overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead>
            <tr class="border-b text-left text-slate-500">
              <th class="py-2 pr-3">No.</th>
              <th class="py-2 pr-3">Area</th>
              <th class="py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading"><td colspan="3">Memuat...</td></tr>
            <tr
              v-for="item in complaints"
              :key="item.id"
              class="cursor-pointer border-b border-slate-100 hover:bg-slate-50"
              @click="openDetail(item.id)"
            >
              <td class="py-2 pr-3">{{ item.complaintNumber }}</td>
              <td class="py-2 pr-3">{{ item.areaName }}</td>
              <td class="py-2"><StatusBadge :status="item.status" /></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="selected" class="card space-y-3">
        <div class="flex items-center justify-between">
          <h2 class="font-semibold">{{ selected.complaintNumber }}</h2>
          <StatusBadge :status="selected.status" />
        </div>
        <p class="text-sm text-slate-500">{{ formatWib(selected.submittedAt) }} — {{ selected.areaName }}</p>
        <p class="whitespace-pre-wrap text-sm">{{ selected.complaintText }}</p>
        <img
          v-if="selected.photo"
          :src="photoUrl(selected.photo.id, 'complaint')"
          alt="Foto pengaduan"
          class="max-h-64 rounded-lg object-contain"
        />
        <div>
          <label class="label">Status</label>
          <select v-model="status" class="input">
            <option v-for="(label, key) in COMPLAINT_STATUS_LABELS" :key="key" :value="key">
              {{ label }}
            </option>
          </select>
        </div>
        <div>
          <label class="label">Catatan Admin</label>
          <textarea v-model="adminNote" class="input min-h-20" />
        </div>
        <button type="button" class="btn-primary" @click="save">Simpan</button>
      </div>
    </div>
  </div>
</template>
