<script setup lang="ts">
import type { UserPublic } from '@shared/constants';

defineProps<{
  user: UserPublic;
  isOwnAccount: boolean;
}>();

defineEmits<{
  edit: [];
  resetPassword: [];
  revokeSessions: [];
  toggleActive: [];
}>();
</script>

<template>
  <div class="flex flex-wrap items-center gap-2">
    <button
      type="button"
      class="flex h-9 w-9 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-700 transition hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300"
      title="Edit pengguna"
      aria-label="Edit pengguna"
      @click="$emit('edit')"
    >
      <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 20h9" stroke-linecap="round" />
        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>

    <button
      type="button"
      class="flex h-9 w-9 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 text-amber-700 transition hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300"
      title="Reset password"
      aria-label="Reset password"
      @click="$emit('resetPassword')"
    >
      <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M3 12a9 9 0 1 0 3-6.7L3 8" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M3 3v5h5" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M12 8v4l3 2" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>

    <button
      type="button"
      class="flex h-9 w-9 items-center justify-center rounded-lg border border-violet-200 bg-violet-50 text-violet-700 transition hover:bg-violet-100 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-300"
      title="Logout seluruh sesi pengguna"
      aria-label="Logout seluruh sesi pengguna"
      @click="$emit('revokeSessions')"
    >
      <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M10 17l5-5-5-5M15 12H3" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" stroke-linecap="round" />
      </svg>
    </button>

    <button
      type="button"
      class="flex h-9 w-9 items-center justify-center rounded-lg border transition disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 dark:disabled:border-slate-700 dark:disabled:bg-slate-800"
      :class="
        user.isActive && !isOwnAccount
          ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300'
          : !user.isActive
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300'
            : ''
      "
      :disabled="isOwnAccount"
      :title="isOwnAccount ? 'Akun sendiri tidak dapat dinonaktifkan' : user.isActive ? 'Nonaktifkan pengguna' : 'Aktifkan pengguna'"
      :aria-label="isOwnAccount ? 'Akun sendiri tidak dapat dinonaktifkan' : user.isActive ? 'Nonaktifkan pengguna' : 'Aktifkan pengguna'"
      @click="$emit('toggleActive')"
    >
      <svg v-if="user.isActive" viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M18.4 6.6a9 9 0 1 1-12.8 0M12 2v10" stroke-linecap="round" />
      </svg>
      <svg v-else viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 5v14M5 12h14" stroke-linecap="round" />
      </svg>
    </button>
  </div>
</template>
