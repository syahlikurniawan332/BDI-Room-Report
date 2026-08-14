<script setup lang="ts">
import { RouterLink } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
</script>

<template>
  <div class="space-y-8">
    <section class="card">
      <h1 class="text-2xl font-bold text-slate-900">BDI Medan Cleaning Control</h1>
      <p class="mt-2 text-slate-600">
        Sistem pelaporan kondisi kebersihan area Balai Diklat Industri Medan.
      </p>
      <div class="mt-6 flex flex-wrap gap-3">
        <RouterLink v-if="!auth.isAuthenticated" to="/login" class="btn-primary">Masuk Staff</RouterLink>
        <RouterLink
          v-else
          :to="auth.isAdmin ? '/admin' : '/cs'"
          class="btn-primary"
        >
          Buka Dashboard
        </RouterLink>
        <RouterLink to="/pengaduan" class="btn-secondary">Kirim Pengaduan</RouterLink>
      </div>
    </section>

    <section class="grid gap-4 md:grid-cols-3">
      <div class="card">
        <h2 class="font-semibold">Cleaning Service</h2>
        <p class="mt-2 text-sm text-slate-600">Ambil foto before/after, simpan draft, kirim laporan.</p>
      </div>
      <div class="card">
        <h2 class="font-semibold">Admin</h2>
        <p class="mt-2 text-sm text-slate-600">Review laporan, kelola area, pengguna, dan pengaduan.</p>
      </div>
      <div class="card">
        <h2 class="font-semibold">Masyarakat</h2>
        <p class="mt-2 text-sm text-slate-600">Kirim pengaduan anonim dengan foto opsional.</p>
      </div>
    </section>
  </div>
</template>
