<script setup lang="ts">
import { RouterLink, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import NotificationBell from './NotificationBell.vue';
import { computed } from 'vue';

const auth = useAuthStore();
const router = useRouter();

async function handleLogout() {
  try {
    await auth.logout();
  } finally {
    await router.replace({ name: 'login' });
  }
}

const basePath = computed(() => (auth.isAdmin ? '/admin' : '/cs'));

const csLinks = [
  { to: '/cs', label: 'Dashboard' },
  { to: '/cs/laporan/baru', label: 'Buat Laporan' },
  { to: '/cs/draft', label: 'Draft' },
  { to: '/cs/riwayat', label: 'Riwayat' },
  { to: '/cs/notifikasi', label: 'Notifikasi' },
];

const adminLinks = [
  { to: '/admin', label: 'Dashboard' },
  { to: '/admin/laporan', label: 'Laporan' },
  { to: '/admin/pengaduan', label: 'Pengaduan' },
  { to: '/admin/notifikasi', label: 'Notifikasi' },
];
</script>

<template>
  <div class="min-h-screen">
    <header class="border-b border-slate-200 bg-white">
      <div class="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <RouterLink to="/" class="text-lg font-semibold text-primary-700">
          BDI Cleaning Control
        </RouterLink>
        <nav class="flex items-center gap-2 text-sm">
          <RouterLink to="/pengaduan" class="hidden text-slate-600 hover:text-primary-600 sm:inline">
            Pengaduan
          </RouterLink>
          <template v-if="auth.isAuthenticated">
            <template v-if="auth.isCs">
              <RouterLink
                v-for="link in csLinks"
                :key="link.to"
                :to="link.to"
                class="hidden text-slate-600 hover:text-primary-600 md:inline"
              >
                {{ link.label }}
              </RouterLink>
            </template>
            <template v-else-if="auth.isAdmin">
              <RouterLink
                v-for="link in adminLinks"
                :key="link.to"
                :to="link.to"
                class="hidden text-slate-600 hover:text-primary-600 md:inline"
              >
                {{ link.label }}
              </RouterLink>
            </template>
            <RouterLink :to="basePath" class="text-slate-600 hover:text-primary-600 md:hidden">
              Dashboard
            </RouterLink>
            <NotificationBell />
            <span class="hidden text-slate-500 sm:inline">{{ auth.user?.displayName }}</span>
            <button class="btn-secondary" @click="handleLogout">Keluar</button>
          </template>
          <RouterLink v-else to="/login" class="btn-primary">Masuk</RouterLink>
        </nav>
      </div>
    </header>
    <main class="mx-auto max-w-6xl px-4 py-6">
      <slot />
    </main>
  </div>
</template>
