<template>
  <div class="py-16 text-center">
    <h1 class="text-2xl font-bold">404</h1>
    <p class="mt-2 text-slate-600">Halaman tidak ditemukan.</p>
    <RouterLink to="/" class="btn-primary mt-4 inline-flex">Kembali</RouterLink>
  </div>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router';
</script>
