<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { apiGet, apiPatch, apiPost } from '../../lib/api';
import type { HolidayPublic } from '@shared/constants';

const holidays = ref<HolidayPublic[]>([]);
const form = ref({
  holidayDate: '',
  name: '',
  holidayType: 'INTERNAL' as HolidayPublic['holidayType'],
});

async function load() {
  const data = await apiGet<{ holidays: HolidayPublic[] }>('/holidays');
  holidays.value = data.holidays;
}

onMounted(load);

async function addHoliday() {
  await apiPost('/holidays', form.value);
  form.value = { holidayDate: '', name: '', holidayType: 'INTERNAL' };
  await load();
}

async function toggle(h: HolidayPublic) {
  await apiPatch(`/holidays/${h.holidayDate}`, { isActive: !h.isActive });
  await load();
}
</script>

<template>
  <div class="space-y-4">
    <h1 class="text-2xl font-bold">Tanggal Merah & Cuti</h1>

    <form class="card grid gap-3 md:grid-cols-4" @submit.prevent="addHoliday">
      <input v-model="form.holidayDate" type="date" class="input" required />
      <input v-model="form.name" class="input md:col-span-2" placeholder="Nama libur" required />
      <select v-model="form.holidayType" class="input">
        <option value="NATIONAL">Nasional</option>
        <option value="COLLECTIVE_LEAVE">Cuti Bersama</option>
        <option value="INTERNAL">Internal</option>
      </select>
      <button type="submit" class="btn-primary md:col-span-4">Tambah</button>
    </form>

    <div class="card max-h-[32rem] overflow-y-auto">
      <table class="min-w-full text-sm">
        <thead>
          <tr class="border-b text-left text-slate-500">
            <th class="py-2 pr-3">Tanggal</th>
            <th class="py-2 pr-3">Nama</th>
            <th class="py-2 pr-3">Jenis</th>
            <th class="py-2">Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="h in holidays" :key="h.holidayDate" class="border-b border-slate-100">
            <td class="py-2 pr-3">{{ h.holidayDate }}</td>
            <td class="py-2 pr-3">{{ h.name }}</td>
            <td class="py-2 pr-3">{{ h.holidayType }}</td>
            <td class="py-2">
              <button type="button" class="text-primary-600" @click="toggle(h)">
                {{ h.isActive ? 'Nonaktifkan' : 'Aktifkan' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
