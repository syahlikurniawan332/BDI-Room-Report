<script setup lang="ts">
import { RouterLink } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
</script>

<template>
  <div class="space-y-8">
    <!-- Hero -->
    <section
      class="card border border-slate-200 bg-white text-slate-900 transition-colors dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
    >
      <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">
        BDI Medan Cleaning Control
      </h1>

      <p class="mt-2 text-slate-600 dark:text-slate-300">
        Sistem pelaporan kondisi kebersihan area Balai Diklat Industri Medan.
      </p>

      <div class="mt-6 flex flex-wrap gap-3">
        <RouterLink
          v-if="!auth.isAuthenticated"
          to="/login"
          class="btn-primary"
        >
          Masuk Staff
        </RouterLink>

        <RouterLink
          v-else
          :to="auth.isAdmin ? '/admin' : '/cs'"
          class="btn-primary"
        >
          Buka Dashboard
        </RouterLink>

        <RouterLink
          to="/pengaduan"
          class="btn-secondary"
        >
          Kirim Pengaduan
        </RouterLink>
      </div>
    </section>

    <!-- Role Cards -->
    <section class="grid gap-4 md:grid-cols-3">
      <div
        class="card border border-slate-200 bg-white transition-colors dark:border-slate-800 dark:bg-slate-900"
      >
        <h2 class="font-semibold text-slate-900 dark:text-slate-100">
          Cleaning Service
        </h2>

        <p class="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Ambil foto before/after, simpan draft, kirim laporan.
        </p>
      </div>

      <div
        class="card border border-slate-200 bg-white transition-colors dark:border-slate-800 dark:bg-slate-900"
      >
        <h2 class="font-semibold text-slate-900 dark:text-slate-100">
          Admin
        </h2>

        <p class="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Review laporan, kelola area, pengguna, dan pengaduan.
        </p>
      </div>

      <div
        class="card border border-slate-200 bg-white transition-colors dark:border-slate-800 dark:bg-slate-900"
      >
        <h2 class="font-semibold text-slate-900 dark:text-slate-100">
          Masyarakat
        </h2>

        <p class="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Kirim pengaduan anonim dengan foto opsional.
        </p>
      </div>
    </section>
  </div>
</template>