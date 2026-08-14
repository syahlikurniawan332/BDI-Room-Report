<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { apiGet } from '../../lib/api';
import { listDrafts, type LocalDraft } from '../../lib/drafts';
import { formatWib } from '../../lib/utils';
import type { ReportPublic } from '@shared/constants';

const serverDrafts = ref<ReportPublic[]>([]);
const localDrafts = ref<LocalDraft[]>([]);
const loading = ref(true);

onMounted(async () => {
  try {
    const [reportData, drafts] = await Promise.all([
      apiGet<{ reports: ReportPublic[] }>('/reports?status=DRAFT'),
      listDrafts(),
    ]);
    serverDrafts.value = reportData.reports;
    localDrafts.value = drafts.filter((d) => !d.serverReportId);
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold">Daftar Draft</h1>
      <RouterLink to="/cs/laporan/baru" class="btn-primary min-h-12">Buat Draft Baru</RouterLink>
    </div>

    <section v-if="localDrafts.length" class="space-y-3">
      <h2 class="font-semibold text-slate-700">Draft Lokal</h2>
      <RouterLink
        v-for="draft in localDrafts"
        :key="draft.id"
        :to="`/cs/draft/${draft.id}`"
        class="card block hover:border-primary-300"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="font-medium">{{ draft.areaName }}</p>
            <p class="text-xs text-slate-500">
              Before: {{ draft.beforeBlob ? 'Ada' : 'Belum' }} · After: {{ draft.afterBlob ? 'Ada' : 'Belum' }}
            </p>
          </div>
          <span class="text-xs text-slate-500">{{ formatWib(draft.updatedAt) }}</span>
        </div>
      </RouterLink>
    </section>

    <section class="space-y-3">
      <h2 class="font-semibold text-slate-700">Draft Server</h2>
      <p v-if="loading" class="text-sm text-slate-500">Memuat...</p>
      <p v-else-if="!serverDrafts.length" class="text-sm text-slate-500">Tidak ada draft server.</p>
      <RouterLink
        v-for="draft in serverDrafts"
        :key="draft.id"
        :to="`/cs/laporan/${draft.id}`"
        class="card block hover:border-primary-300"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="font-medium">{{ draft.areaName ?? draft.areaId }}</p>
            <p class="text-xs text-slate-500">{{ draft.reportNumber }}</p>
          </div>
          <span class="text-xs text-slate-500">{{ formatWib(draft.updatedAt) }}</span>
        </div>
      </RouterLink>
    </section>

    <RouterLink to="/cs" class="btn-secondary inline-flex">Kembali</RouterLink>
  </div>
</template>
