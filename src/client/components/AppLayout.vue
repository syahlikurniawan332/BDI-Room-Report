<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { computed } from 'vue';

const auth = useAuthStore();
const route = useRoute();

const isPublic = computed(() => !route.meta.requiresAuth && route.name !== 'login');
</script>

<template>
  <div class="min-h-screen">
    <header class="border-b border-slate-200 bg-white">
      <div class="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <RouterLink to="/" class="text-lg font-semibold text-primary-700">
          BDI Cleaning Control
        </RouterLink>
        <nav class="flex items-center gap-3 text-sm">
          <RouterLink to="/pengaduan" class="text-slate-600 hover:text-primary-600">Pengaduan</RouterLink>
          <template v-if="auth.isAuthenticated">
            <RouterLink
              :to="auth.isAdmin ? '/admin' : '/cs'"
              class="text-slate-600 hover:text-primary-600"
            >
              Dashboard
            </RouterLink>
            <span class="text-slate-500">{{ auth.user?.displayName }}</span>
            <button class="btn-secondary" @click="auth.logout()">Keluar</button>
          </template>
          <RouterLink v-else to="/login" class="btn-primary">Masuk</RouterLink>
        </nav>
      </div>
    </header>
    <main :class="isPublic ? 'mx-auto max-w-6xl px-4 py-6' : 'mx-auto max-w-6xl px-4 py-6'">
      <slot />
    </main>
  </div>
</template>
