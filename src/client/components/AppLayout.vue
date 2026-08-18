<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import NotificationBell from './NotificationBell.vue';

const auth = useAuthStore();
const route = useRoute();

const theme = ref<'light' | 'dark'>('light');

function applyTheme() {
  document.documentElement.classList.toggle('dark', theme.value === 'dark');

  localStorage.setItem('theme', theme.value);
}

function toggleTheme() {
  theme.value = theme.value === 'light' ? 'dark' : 'light';
  applyTheme();
}

onMounted(() => {
  const savedTheme = localStorage.getItem('theme');

  if (savedTheme === 'dark' || savedTheme === 'light') {
    theme.value = savedTheme;
  } else {
    theme.value = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  applyTheme();
});

const router = useRouter();

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

function isActiveLink(path: string) {
  if (path === '/admin' || path === '/cs') {
    return route.path === path;
  }

  return route.path === path || route.path.startsWith(`${path}/`);
}

async function handleLogout() {
  try {
    await auth.logout();
  } finally {
    await router.replace({ name: 'login' });
  }
}
</script>

<template>
  <div
    class="min-h-screen bg-slate-50 text-slate-900 transition-colors duration-200 dark:bg-slate-950 dark:text-slate-100"
  >
    <header
      class="border-b border-slate-200 bg-white transition-colors duration-200 dark:border-slate-800 dark:bg-slate-900"
    >
      <div
        class="mx-auto flex min-h-[72px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6"
      >
        <!-- Logo -->
        <RouterLink to="/" class="flex shrink-0 items-center gap-3">
          <span
            class="flex h-10 w-10 items-center justify-center rounded-full bg-[#17233d] text-xs font-bold tracking-wide text-[#fff8e8]"
          >
            BDI
          </span>

          <span class="hidden leading-tight sm:block">
            <span class="block font-semibold text-[#17233d]"> BDI Cleaning Control </span>
            <span class="block text-xs text-slate-500"> Monitoring Kebersihan </span>
          </span>
        </RouterLink>

        <nav class="flex min-w-0 items-center justify-end gap-1.5 text-sm">
          <!-- Pengaduan publik -->
          <RouterLink
            to="/pengaduan"
            class="hidden rounded-full px-3 py-2 font-medium transition sm:inline-flex"
            :class="
              isActiveLink('/pengaduan')
                ? 'bg-[#17233d] text-white shadow-sm'
                : 'text-slate-600 hover:bg-[#f3ecdc] hover:text-[#17233d]'
            "
          >
            Pengaduan Publik
          </RouterLink>

          <template v-if="auth.isAuthenticated">
            <!-- Menu CS -->
            <template v-if="auth.isCs">
              <RouterLink
                v-for="link in csLinks"
                :key="link.to"
                :to="link.to"
                class="hidden rounded-full px-3 py-2 font-medium transition lg:inline-flex"
                :class="
                  isActiveLink(link.to)
                    ? 'bg-[#17233d] text-white shadow-sm'
                    : 'text-slate-600 hover:bg-[#f3ecdc] hover:text-[#17233d]'
                "
              >
                {{ link.label }}
              </RouterLink>
            </template>

            <!-- Menu Admin -->
            <template v-else-if="auth.isAdmin">
              <RouterLink
                v-for="link in adminLinks"
                :key="link.to"
                :to="link.to"
                class="hidden rounded-full px-3 py-2 font-medium transition lg:inline-flex"
                :class="
                  isActiveLink(link.to)
                    ? 'bg-[#17233d] text-white shadow-sm'
                    : 'text-slate-600 hover:bg-[#f3ecdc] hover:text-[#17233d]'
                "
              >
                {{ link.label }}
              </RouterLink>
            </template>

            <!-- Dashboard untuk layar kecil -->
            <RouterLink
              :to="basePath"
              class="rounded-full px-3 py-2 font-medium transition lg:hidden"
              :class="
                isActiveLink(basePath)
                  ? 'bg-[#17233d] text-white'
                  : 'text-slate-600 hover:bg-[#f3ecdc]'
              "
            >
              Dashboard
            </RouterLink>

            <div class="ml-1 flex items-center">
              <button
                type="button"
                class="flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white text-lg transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                :title="theme === 'dark' ? 'Gunakan mode terang' : 'Gunakan mode gelap'"
                @click="toggleTheme"
              >
                <span v-if="theme === 'dark'">☀️</span>
                <span v-else>🌙</span>
              </button>

              <NotificationBell />
            </div>

            <div class="ml-1 hidden rounded-full bg-[#f3ecdc] px-3 py-2 xl:block">
              <p class="max-w-44 truncate text-sm font-medium text-[#17233d]">
                {{ auth.user?.displayName }}
              </p>
            </div>

            <button
              type="button"
              class="ml-1 rounded-full border border-[#17233d] bg-white px-4 py-2 font-semibold text-[#17233d] transition hover:bg-[#17233d] hover:text-white"
              @click="handleLogout"
            >
              Keluar
            </button>
          </template>

          <RouterLink
            v-else
            to="/login"
            class="ml-1 rounded-full bg-emerald-700 px-5 py-2.5 font-semibold text-white shadow-sm transition hover:bg-emerald-800"
          >
            Masuk
          </RouterLink>
        </nav>
      </div>
    </header>

    <main class="mx-auto max-w-7xl px-4 py-7 sm:px-6">
      <slot />
    </main>
  </div>
</template>
