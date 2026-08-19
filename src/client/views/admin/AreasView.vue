<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { apiGet, apiPatch, apiPost } from '../../lib/api';
import type { AreaPublic } from '@shared/constants';

const areas = ref<AreaPublic[]>([]);
const name = ref('');
const error = ref('');
const editingId = ref<string | null>(null);
const editingName = ref('');
const savingEdit = ref(false);

async function load() {
  const data = await apiGet<{ areas: AreaPublic[] }>('/areas?active=0');
  areas.value = data.areas;
}

onMounted(load);

async function addArea() {
  error.value = '';
  try {
    const newName = name.value.trim();

    if (newName.length < 2) {
      error.value = 'Nama area minimal 2 karakter.';
      return;
    }

    await apiPost('/areas', {
      name: newName,
    });
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

function startEdit(area: AreaPublic) {
  error.value = '';
  editingId.value = area.id;
  editingName.value = area.name;
}

function cancelEdit() {
  editingId.value = null;
  editingName.value = '';
}

async function saveEdit(area: AreaPublic) {
  const newName = editingName.value.trim();

  if (newName.length < 2) {
    error.value = 'Nama area minimal 2 karakter.';
    return;
  }

  if (newName === area.name) {
    cancelEdit();
    return;
  }

  error.value = '';
  savingEdit.value = true;

  try {
    await apiPatch(`/areas/${area.id}`, {
      name: newName,
    });

    cancelEdit();
    await load();
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Gagal mengubah nama area.';
  } finally {
    savingEdit.value = false;
  }
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

            <td class="py-2 pr-3">
              <input
                v-if="editingId === area.id"
                v-model="editingName"
                class="input w-full min-w-[220px]"
                maxlength="200"
                autofocus
                @keyup.enter="saveEdit(area)"
                @keyup.esc="cancelEdit"
              />

              <span v-else class="font-medium text-slate-800 dark:text-slate-200">
                {{ area.name }}
              </span>
            </td>

            <td class="py-2 pr-3">{{ area.isActive ? 'Aktif' : 'Nonaktif' }}</td>
            <td class="py-2">
              <div v-if="editingId === area.id" class="flex items-center gap-3">
                <button
                  type="button"
                  class="font-medium text-emerald-600 transition hover:text-emerald-700 disabled:opacity-50 dark:text-emerald-400 dark:hover:text-emerald-300"
                  :disabled="savingEdit"
                  @click="saveEdit(area)"
                >
                  {{ savingEdit ? 'Menyimpan...' : 'Simpan' }}
                </button>

                <button
                  type="button"
                  class="font-medium text-slate-500 transition hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  :disabled="savingEdit"
                  @click="cancelEdit"
                >
                  Batal
                </button>
              </div>

              <div v-else class="flex flex-wrap items-center gap-x-4 gap-y-2">
                <button
                  type="button"
                  class="font-medium text-blue-600 transition hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                  @click="startEdit(area)"
                >
                  Edit
                </button>

                <button
                  type="button"
                  class="font-medium transition"
                  :class="
                    area.isActive
                      ? 'text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300'
                      : 'text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300'
                  "
                  @click="toggle(area)"
                >
                  {{ area.isActive ? 'Nonaktifkan' : 'Aktifkan' }}
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
