import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { UserPublic } from '@shared/constants';
import { apiGet, apiPost } from '../lib/api';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<UserPublic | null>(null);
  const loading = ref(false);
  const initialized = ref(false);

  const isAuthenticated = computed(() => user.value !== null);
  const isAdmin = computed(() => user.value?.role === 'ADMIN');
  const isCs = computed(() => user.value?.role === 'CS');

  async function fetchSession() {
    loading.value = true;
    try {
      const data = await apiGet<{ user: UserPublic | null }>('/auth/session');
      user.value = data.user;
    } catch {
      user.value = null;
    } finally {
      loading.value = false;
      initialized.value = true;
    }
  }

  async function login(username: string, password: string) {
    const data = await apiPost<{ user: UserPublic }>('/auth/login', { username, password });
    user.value = data.user;
    return data.user;
  }

  async function logout() {
    try {
      await apiPost('/auth/logout');
    } finally {
      user.value = null;
    }
  }

  return { user, loading, initialized, isAuthenticated, isAdmin, isCs, fetchSession, login, logout };
});
