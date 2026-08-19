<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { apiGet } from '../../lib/api';
import { formatWib } from '../../lib/utils';

interface CsActivity {
  id: string;
  displayName: string;
  username: string;
  lastSubmittedAt: string | null;
  lastStatus: string | null;
}

const stats = ref({
  todayReports: 0,
  pending: 0,
  revision: 0,
  approved: 0,
  rejected: 0,
  newComplaints: 0,
  notReportedToday: 0,
});
const csActivity = ref<CsActivity[]>([]);
const loading = ref(true);

function formatStatus(status: string | null): string {
  switch (status) {
    case 'APPROVED':
      return 'Disetujui';
    case 'SUBMITTED':
      return 'Menunggu Review';
    case 'RESUBMITTED':
      return 'Dikirim Ulang';
    case 'REVISION_REQUIRED':
      return 'Perlu Perbaikan';
    case 'REJECTED':
      return 'Ditolak';
    default:
      return 'Belum Ada Laporan';
  }
}

function statusClass(status: string | null): string {
  switch (status) {
    case 'APPROVED':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300';
    case 'SUBMITTED':
    case 'RESUBMITTED':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300';
    case 'REVISION_REQUIRED':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300';
    case 'REJECTED':
      return 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300';
    default:
      return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300';
  }
}

onMounted(async () => {
  try {
    const data = await apiGet<{ stats: typeof stats.value; csActivity: CsActivity[] }>(
      '/dashboard/admin',
    );
    stats.value = data.stats;
    csActivity.value = data.csActivity;
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div>
      <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">Dashboard Admin</h1>
      <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Ringkasan aktivitas kebersihan hari ini.
      </p>
    </div>

    <!-- Ringkasan utama -->
    <section
      class="grid overflow-hidden rounded-2xl border border-[#e4dccb] bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-2 lg:grid-cols-4"
    >
      <div
        class="border-b border-[#eee7d8] px-5 py-4 dark:border-slate-800 sm:border-r lg:border-b-0"
      >
        <p
          class="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
        >
          Laporan Hari Ini
        </p>
        <p class="mt-1 text-2xl font-bold text-[#17233d] dark:text-slate-100">
          {{ loading ? '...' : stats.todayReports }}
        </p>
      </div>

      <div
        class="border-b border-[#eee7d8] px-5 py-4 dark:border-slate-800 lg:border-b-0 lg:border-r"
      >
        <p
          class="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
        >
          Disetujui
        </p>
        <p class="mt-1 text-2xl font-bold text-emerald-700 dark:text-emerald-400">
          {{ loading ? '...' : stats.approved }}
        </p>
      </div>

      <div
        class="border-b border-[#eee7d8] px-5 py-4 dark:border-slate-800 sm:border-r lg:border-b-0"
      >
        <p
          class="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
        >
          Ditolak
        </p>
        <p class="mt-1 text-2xl font-bold text-red-700 dark:text-red-400">
          {{ loading ? '...' : stats.rejected }}
        </p>
      </div>

      <div class="px-5 py-4">
        <p
          class="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
        >
          Belum Melapor
        </p>
        <p class="mt-1 text-2xl font-bold text-amber-600 dark:text-amber-400">
          {{ loading ? '...' : stats.notReportedToday }}
        </p>
      </div>
    </section>

    <!-- Perlu ditindaklanjuti -->
    <section>
      <div class="mb-3">
        <h2 class="font-semibold text-slate-900 dark:text-slate-100">Perlu Ditindaklanjuti</h2>
        <p class="text-sm text-slate-500 dark:text-slate-400">
          Pekerjaan yang membutuhkan perhatian admin.
        </p>
      </div>

      <div class="grid gap-3 md:grid-cols-3">
        <RouterLink
          to="/admin/laporan?status=SUBMITTED"
          class="group flex items-center justify-between rounded-2xl border border-[#e4dccb] bg-white px-5 py-4 shadow-sm transition hover:-translate-y-0.5 hover:border-[#17233d] hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
        >
          <span>
            <span class="block text-sm font-semibold text-[#17233d] dark:text-slate-100">
              Menunggu Review
            </span>
            <span class="mt-1 block text-2xl font-bold text-[#17233d] dark:text-slate-100">
              {{ loading ? '...' : stats.pending }}
            </span>
          </span>

          <span
            class="flex h-9 w-9 items-center justify-center rounded-full bg-[#f3ecdc] text-lg text-[#17233d] transition group-hover:translate-x-1 group-hover:bg-[#17233d] group-hover:text-white dark:bg-slate-800 dark:text-slate-200"
          >
            →
          </span>
        </RouterLink>

        <RouterLink
          to="/admin/laporan?status=REVISION_REQUIRED"
          class="group flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50/50 px-5 py-4 shadow-sm transition hover:-translate-y-0.5 hover:border-amber-500 hover:shadow-md dark:border-amber-900 dark:bg-amber-950/20"
        >
          <span>
            <span class="block text-sm font-semibold text-amber-900 dark:text-amber-300">
              Perlu Perbaikan
            </span>
            <span class="mt-1 block text-2xl font-bold text-amber-700 dark:text-amber-400">
              {{ loading ? '...' : stats.revision }}
            </span>
          </span>

          <span
            class="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-lg text-amber-800 transition group-hover:translate-x-1 group-hover:bg-amber-600 group-hover:text-white dark:bg-amber-950 dark:text-amber-300"
          >
            →
          </span>
        </RouterLink>

        <RouterLink
          to="/admin/pengaduan?status=NEW"
          class="group flex items-center justify-between rounded-2xl border border-sky-200 bg-sky-50/50 px-5 py-4 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-500 hover:shadow-md dark:border-sky-900 dark:bg-sky-950/20"
        >
          <span>
            <span class="block text-sm font-semibold text-sky-900 dark:text-sky-300">
              Pengaduan Baru
            </span>
            <span class="mt-1 block text-2xl font-bold text-sky-700 dark:text-sky-400">
              {{ loading ? '...' : stats.newComplaints }}
            </span>
          </span>

          <span
            class="flex h-9 w-9 items-center justify-center rounded-full bg-sky-100 text-lg text-sky-800 transition group-hover:translate-x-1 group-hover:bg-sky-600 group-hover:text-white dark:bg-sky-950 dark:text-sky-300"
          >
            →
          </span>
        </RouterLink>
      </div>
    </section>

    <!-- Aktivitas CS Desktop -->
    <section
      class="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 md:block"
    >
      <div class="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
        <h2 class="font-semibold text-slate-900 dark:text-slate-100">Aktivitas CS</h2>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Status laporan terakhir setiap Cleaning Service.
        </p>
      </div>

      <div class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead class="bg-slate-50 dark:bg-slate-950">
            <tr class="text-left text-slate-500 dark:text-slate-400">
              <th class="px-5 py-3">Nama</th>
              <th class="px-5 py-3">Laporan Terakhir</th>
              <th class="px-5 py-3">Status Terakhir</th>
            </tr>
          </thead>

          <tbody>
            <tr
              v-for="cs in csActivity"
              :key="cs.id"
              class="border-t border-slate-100 dark:border-slate-800"
            >
              <td class="px-5 py-4 font-medium text-slate-900 dark:text-slate-100">
                {{ cs.displayName }}
              </td>

              <td class="px-5 py-4 text-slate-600 dark:text-slate-300">
                {{ formatWib(cs.lastSubmittedAt) }}
              </td>

              <td class="px-5 py-4">
                <span
                  class="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold"
                  :class="statusClass(cs.lastStatus)"
                >
                  {{ formatStatus(cs.lastStatus) }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Aktivitas CS Mobile -->
    <section class="space-y-3 md:hidden">
      <div>
        <h2 class="font-semibold text-slate-900 dark:text-slate-100">Aktivitas CS</h2>
        <p class="text-sm text-slate-500 dark:text-slate-400">Status laporan terakhir setiap CS.</p>
      </div>

      <article
        v-for="cs in csActivity"
        :key="cs.id"
        class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
      >
        <div class="flex items-start justify-between gap-3">
          <div>
            <h3 class="font-semibold text-slate-900 dark:text-slate-100">
              {{ cs.displayName }}
            </h3>

            <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {{
                cs.lastSubmittedAt
                  ? `Terakhir melapor ${formatWib(cs.lastSubmittedAt)}`
                  : 'Belum membuat laporan'
              }}
            </p>
          </div>

          <span
            class="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold"
            :class="statusClass(cs.lastStatus)"
          >
            {{ formatStatus(cs.lastStatus) }}
          </span>
        </div>
      </article>
    </section>

    <!-- Pengaturan -->
    <section>
      <div class="mb-3">
        <h2 class="font-semibold text-slate-900 dark:text-slate-100">Pengaturan</h2>
        <p class="text-sm text-slate-500 dark:text-slate-400">Kelola data pendukung sistem.</p>
      </div>

      <div class="grid gap-3 sm:grid-cols-3">
        <RouterLink
          to="/admin/pengguna"
          class="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-[#17233d] hover:shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          <p class="font-semibold text-slate-900 dark:text-slate-100">Pengguna</p>
          <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Kelola akun admin dan CS.</p>
        </RouterLink>

        <RouterLink
          to="/admin/area"
          class="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-[#17233d] hover:shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          <p class="font-semibold text-slate-900 dark:text-slate-100">Area</p>
          <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Kelola daftar area kebersihan.
          </p>
        </RouterLink>

        <RouterLink
          to="/admin/libur"
          class="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-[#17233d] hover:shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          <p class="font-semibold text-slate-900 dark:text-slate-100">Hari Libur</p>
          <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Atur kalender hari libur.</p>
        </RouterLink>
      </div>
    </section>
  </div>
</template>
