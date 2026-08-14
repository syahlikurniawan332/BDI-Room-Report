<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { apiGet, apiPatch, apiPost } from '../../lib/api';
import type { AreaPublic } from '@shared/constants';

const areas = ref<AreaPublic[]>([]);
const name = ref('');
const error = ref('');

async function load() {
  const data = await apiGet<{ areas: AreaPublic[] }>('/areas?active=0');
  areas.value = data.areas;
}

onMounted(load);

async function addArea() {
  error.value = '';
  try {
    await apiPost('/areas', { name: name.value });
    name.value = '';
    await load();
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Gagal menambah area.';
  }
}

async function toggle(area: AreaPublic) {
  await apiPatch(`/areas/${area.id}`, { isActive: !area.isActive });
  await load();
}
</script>

<template>
  <div class="space-y-4">
    <h1 class="text-2xl font-bold">Area Kebersihan</h1>

    <form class="card flex flex-wrap gap-3" @submit.prevent="addArea">
      <input v-model="name" class="input flex-1" placeholder="Nama area baru" required />
      <button type="submit" class="btn-primary">Tambah</button>
    </form>
    <p v-if="error" class="text-sm text-red-600">{{ error }}</p>

    <div class="card overflow-x-auto">
      <table class="min-w-full text-sm">
        <thead>
          <tr class="border-b text-left text-slate-500">
            <th class="py-2 pr-3">Urutan</th>
            <th class="py-2 pr-3">Nama</th>
            <th class="py-2 pr-3">Status</th>
            <th class="py-2">Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="area in areas" :key="area.id" class="border-b border-slate-100">
            <td class="py-2 pr-3">{{ area.displayOrder }}</td>
            <td class="py-2 pr-3">{{ area.name }}</td>
            <td class="py-2 pr-3">{{ area.isActive ? 'Aktif' : 'Nonaktif' }}</td>
            <td class="py-2">
              <button type="button" class="text-primary-600" @click="toggle(area)">
                {{ area.isActive ? 'Nonaktifkan' : 'Aktifkan' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
