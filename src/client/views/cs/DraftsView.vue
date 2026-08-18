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
  <div class="space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.2em] text-[#a38a59]">
          Cleaning Service
        </p>
        <h1 class="mt-1 text-2xl font-bold text-[#17233d]">Daftar Draft</h1>
        <p class="mt-2 text-sm text-slate-500">
          Lanjutkan laporan yang belum dikirim.
        </p>
      </div>

      <RouterLink
        to="/cs/laporan/baru"
        class="inline-flex items-center gap-2 rounded-xl bg-[#17233d] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#243557]"
      >
        <span class="text-lg leading-none" aria-hidden="true">+</span>
        Buat Laporan Baru
      </RouterLink>
    </div>

    <section
      v-if="localDrafts.length"
      class="overflow-hidden rounded-2xl border border-[#e4dccb] bg-white shadow-sm"
    >
      <div class="border-b border-[#eee7d8] px-5 py-4">
        <h2 class="font-semibold text-[#17233d]">Draft di perangkat ini</h2>
        <p class="mt-1 text-sm text-slate-500">
          Draft ini tersimpan di perangkat dan belum sepenuhnya dikirim ke server.
        </p>
      </div>

      <div class="divide-y divide-[#eee7d8]">
        <RouterLink
          v-for="draft in localDrafts"
          :key="draft.id"
          :to="`/cs/draft/${draft.id}`"
          class="group flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-[#fdfbf6]"
        >
          <span class="min-w-0">
            <span class="block font-semibold text-[#17233d]">
              {{ draft.areaName }}
            </span>
            <span class="mt-1 block text-sm text-slate-500">
              Before: {{ draft.beforeBlob ? 'tersimpan' : 'belum ada' }}
              <span class="mx-1 text-slate-300">•</span>
              After: {{ draft.afterBlob ? 'tersimpan' : 'belum ada' }}
            </span>
            <span class="mt-1 block text-xs text-slate-400">
              Terakhir disimpan {{ formatWib(draft.updatedAt) }}
            </span>
          </span>

          <span
            class="shrink-0 text-lg text-[#17233d] transition group-hover:translate-x-1"
            aria-hidden="true"
          >
            →
          </span>
        </RouterLink>
      </div>
    </section>

    <section
      class="overflow-hidden rounded-2xl border border-[#e4dccb] bg-white shadow-sm"
    >
      <div class="border-b border-[#eee7d8] px-5 py-4">
        <h2 class="font-semibold text-[#17233d]">Draft di server</h2>
        <p class="mt-1 text-sm text-slate-500">
          Laporan yang sudah dibuat tetapi belum dikirim.
        </p>
      </div>

      <p
        v-if="loading"
        class="px-5 py-10 text-center text-sm text-slate-500"
      >
        Memuat draft...
      </p>

      <p
        v-else-if="!serverDrafts.length"
        class="px-5 py-10 text-center text-sm text-slate-500"
      >
        Tidak ada draft di server.
      </p>

      <div v-else class="divide-y divide-[#eee7d8]">
        <RouterLink
          v-for="draft in serverDrafts"
          :key="draft.id"
          :to="`/cs/laporan/${draft.id}`"
          class="group flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-[#fdfbf6]"
        >
          <span class="min-w-0">
            <span class="block font-semibold text-[#17233d]">
              {{ draft.areaName ?? draft.areaId }}
            </span>
            <span class="mt-1 block text-sm text-slate-500">
              {{ draft.reportNumber }}
            </span>
            <span class="mt-1 block text-xs text-slate-400">
              Diperbarui {{ formatWib(draft.updatedAt) }}
            </span>
          </span>

          <span
            class="shrink-0 text-lg text-[#17233d] transition group-hover:translate-x-1"
            aria-hidden="true"
          >
            →
          </span>
        </RouterLink>
      </div>
    </section>

    <RouterLink
      to="/cs"
      class="inline-flex items-center gap-2 rounded-xl border border-[#cbd5e1] bg-white px-4 py-2.5 text-sm font-semibold text-[#17233d] transition hover:border-[#17233d] hover:bg-[#fdfbf6]"
    >
      <span aria-hidden="true">←</span>
      Kembali ke Dashboard
    </RouterLink>
  </div>
</template>