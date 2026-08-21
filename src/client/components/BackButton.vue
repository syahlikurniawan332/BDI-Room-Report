<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const auth = useAuthStore();

function goBack() {
  const previous = window.history.state?.back as string | null | undefined;

  if (previous) {
    router.back();
    return;
  }

  void router.push(auth.isAdmin ? '/admin' : auth.isCs ? '/cs' : '/');
}
</script>

<template>
  <button
    type="button"
    class="mb-5 inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-[#17233d] shadow-sm transition hover:border-[#17233d] hover:bg-[#fdfbf6] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
    @click="goBack"
  >
    <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2">
      <path d="m15 18-6-6 6-6" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
    Kembali
  </button>
</template>
