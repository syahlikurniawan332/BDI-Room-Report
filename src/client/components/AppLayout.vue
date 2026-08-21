<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import NotificationBell from './NotificationBell.vue';
import BackButton from './BackButton.vue';

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

const csLinks = [
  { to: '/cs', label: 'Dashboard' },
  { to: '/cs/laporan/baru', label: 'Buat Laporan' },
  { to: '/cs/draft', label: 'Draft' },
  { to: '/cs/riwayat', label: 'Riwayat' },
  { to: '/cs/pengaduan', label: 'Pengaduan' },
  { to: '/cs/notifikasi', label: 'Notifikasi' },
];

const adminLinks = [
  { to: '/admin', label: 'Dashboard' },
  { to: '/admin/laporan', label: 'Laporan' },
  { to: '/admin/pengaduan', label: 'Pengaduan' },
  { to: '/admin/notifikasi', label: 'Notifikasi' },
];

const adminMobileLinks = [
  { to: '/admin', label: 'Dashboard', icon: '⌂' },
  { to: '/admin/laporan', label: 'Laporan', icon: '▤' },
  { to: '/admin/pengaduan', label: 'Pengaduan', icon: '!' },
];

const csMobileLinks = [
  { to: '/cs', label: 'Dashboard', icon: '⌂' },
  { to: '/cs/laporan/baru', label: 'Laporan', icon: '+' },
  { to: '/cs/pengaduan', label: 'Pengaduan', icon: '!' },
];

const mobileLinks = computed(() => {
  if (auth.isAdmin) {
    return adminMobileLinks;
  }

  if (auth.isCs) {
    return csMobileLinks;
  }

  return [];
});

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
      class="print:hidden sticky top-0 z-40 border-b border-slate-200 bg-white transition-colors duration-200 dark:border-slate-800 dark:bg-slate-900"
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

          <span class="hidden leading-tight md:block">
            <span class="block font-semibold text-[#17233d]"> BDI Cleaning Control </span>
            <span class="block text-xs text-slate-500"> Monitoring Kebersihan </span>
          </span>
        </RouterLink>

        <nav class="flex min-w-0 items-center justify-end gap-1.5 text-sm">
          <RouterLink
            v-if="!auth.isAuthenticated"
            to="/pengaduan"
            class="inline-flex rounded-full px-3 py-2 font-medium transition"
            :class="
              isActiveLink('/pengaduan')
                ? 'bg-[#17233d] text-white shadow-sm'
                : 'text-slate-600 hover:bg-[#f3ecdc] hover:text-[#17233d]'
            "
          >
            <span class="sm:hidden">Pengaduan</span>
            <span class="hidden sm:inline">Pengaduan Publik</span>
          </RouterLink>

          <template v-if="auth.isAuthenticated">
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

            <div class="ml-1 flex items-center">
              <button
                type="button"
                class="flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white text-lg transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                :title="theme === 'dark' ? 'Gunakan mode terang' : 'Gunakan mode gelap'"
                @click="toggleTheme"
              >
                <span v-if="theme === 'dark'">☀️</span>
                <span v-else>🌙</span>
              </button>

              <NotificationBell />

              <button
                type="button"
                class="flex h-10 w-10 items-center justify-center rounded-full border border-red-200 bg-white text-red-600 transition hover:bg-red-50 dark:border-red-900 dark:bg-slate-900 dark:text-red-400 dark:hover:bg-red-950/40 lg:hidden"
                title="Keluar"
                aria-label="Keluar"
                @click="handleLogout"
              >
                <svg
                  viewBox="0 0 24 24"
                  class="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  aria-hidden="true"
                >
                  <path
                    d="M10 17l5-5-5-5M15 12H3M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </button>
            </div>

            <div class="ml-1 hidden rounded-full bg-[#f3ecdc] px-3 py-2 dark:bg-slate-800 xl:block">
              <p class="max-w-44 truncate text-sm font-medium text-[#17233d] dark:text-slate-100">
                {{ auth.user?.displayName }}
              </p>
            </div>

            <button
              type="button"
              class="ml-1 hidden rounded-full border border-[#17233d] bg-white px-4 py-2 font-semibold text-[#17233d] transition hover:bg-[#17233d] hover:text-white dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800 lg:inline-flex"
              @click="handleLogout"
            >
              Keluar
            </button>
          </template>

          <RouterLink
            v-if="!auth.isAuthenticated"
            to="/"
            class="ml-1 rounded-full bg-emerald-700 px-5 py-2.5 font-semibold text-white shadow-sm transition hover:bg-emerald-800"
          >
            Masuk
          </RouterLink>
        </nav>
      </div>
    </header>

    <main class="mx-auto max-w-7xl px-4 py-7 pb-28 sm:px-6 lg:pb-7 print:max-w-none print:p-0">
      <BackButton v-if="!['/', '/admin', '/cs'].includes(route.path)" />
      <slot />
    </main>
    <nav
      v-if="auth.isAuthenticated"
      class="print:hidden fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 lg:hidden"
    >
      <div class="mx-auto grid max-w-md grid-cols-3 gap-2">
        <RouterLink
          v-for="link in mobileLinks"
          :key="link.to"
          :to="link.to"
          class="flex min-w-0 flex-col items-center justify-center rounded-xl px-2 py-2 text-xs font-medium transition"
          :class="
            isActiveLink(link.to)
              ? 'bg-[#17233d] text-white dark:bg-blue-600'
              : 'text-slate-500 hover:bg-slate-100 hover:text-[#17233d] dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
          "
        >
          <span
            class="mb-0.5 flex h-6 items-center justify-center text-lg leading-none"
            aria-hidden="true"
          >
            {{ link.icon }}
          </span>

          <span class="max-w-full truncate">
            {{ link.label }}
          </span>
        </RouterLink>
      </div>
    </nav>
  </div>
</template>
