<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { apiGet, apiPatch, apiPost } from '../../lib/api';
import { formatWib } from '../../lib/utils';
import type { UserPublic } from '@shared/constants';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/auth';

const auth = useAuthStore();
const router = useRouter();
const users = ref<UserPublic[]>([]);
const showCreate = ref(false);
const tempPassword = ref('');
const form = ref({
  displayName: '',
  username: '',
  email: '',
  role: 'CS' as 'ADMIN' | 'CS',
  generatePassword: true,
  password: '',
});
const loading = ref(true);
const error = ref('');

async function load() {
  const data = await apiGet<{ users: UserPublic[] }>('/users');
  users.value = data.users;
}

onMounted(async () => {
  await load();
  loading.value = false;
});

async function createUser() {
  error.value = '';
  tempPassword.value = '';
  try {
    const payload = {
      ...form.value,
      password: form.value.generatePassword ? undefined : form.value.password,
    };
    const data = await apiPost<{ user: UserPublic; temporaryPassword: string }>('/users', payload);
    tempPassword.value = data.temporaryPassword;
    showCreate.value = false;
    await load();
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Gagal membuat user.';
  }
}

async function toggleActive(user: UserPublic) {
  await apiPatch(`/users/${user.id}`, { isActive: !user.isActive });
  await load();
}

async function resetPassword(user: UserPublic) {
  const isOwnAccount = user.id === auth.user?.id;
  error.value = '';

  const password = window.prompt(
    `Masukkan password baru untuk ${user.displayName}:`,
  );

  if (password === null) return;

  if (password.length < 8) {
    error.value = 'Password minimal 8 karakter.';
    return;
  }

  try {
    const data = await apiPost<{ temporaryPassword: string }>(
      `/users/${user.id}/reset-password`,
      {
        password,
        generatePassword: false,
      },
    );

    tempPassword.value = data.temporaryPassword;

    await apiPost(`/users/${user.id}/revoke-sessions`);
    if (isOwnAccount) {
  await auth.logout();
  await router.replace({ name: 'login' });
  return;
}
  } catch (e) {
    error.value =
      e instanceof Error ? e.message : 'Gagal mereset password.';
  }
}

async function revokeSessions(user: UserPublic) {
  await apiPost(`/users/${user.id}/revoke-sessions`);
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold">Pengguna</h1>
      <button type="button" class="btn-primary" @click="showCreate = !showCreate">
        {{ showCreate ? 'Batal' : 'Tambah User' }}
      </button>
    </div>

    <p
      v-if="error"
      class="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700"
    >
      {{ error }}
    </p>

    <div v-if="tempPassword" class="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm">
      Password sementara (tampil sekali): <strong>{{ tempPassword }}</strong>
      <button type="button" class="ml-3 underline" @click="tempPassword = ''">Tutup</button>
    </div>

    <form v-if="showCreate" class="card grid gap-3 md:grid-cols-2" @submit.prevent="createUser">
      <div><label class="label">Nama</label><input v-model="form.displayName" class="input" required /></div>
      <div><label class="label">Username</label><input v-model="form.username" class="input" required /></div>
      <div><label class="label">Email</label><input v-model="form.email" type="email" class="input" required /></div>
      <div>
        <label class="label">Role</label>
        <select v-model="form.role" class="input"><option value="CS">CS</option><option value="ADMIN">Admin</option></select>
      </div>
      <div class="md:col-span-2">
        <label class="inline-flex items-center gap-2 text-sm">
          <input v-model="form.generatePassword" type="checkbox" />
          Generate password otomatis
        </label>
        <input v-if="!form.generatePassword" v-model="form.password" class="input mt-2" type="password" />
      </div>
      <button type="submit" class="btn-primary md:col-span-2">Simpan</button>
    </form>

    <div class="card overflow-x-auto">
      <table class="min-w-full text-sm">
        <thead>
          <tr class="border-b text-left text-slate-500">
            <th class="py-2 pr-3">Nama</th>
            <th class="py-2 pr-3">Username</th>
            <th class="py-2 pr-3">Role</th>
            <th class="py-2 pr-3">Login Terakhir</th>
            <th class="py-2">Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in users" :key="user.id" class="border-b border-slate-100">
            <td class="py-2 pr-3">{{ user.displayName }}</td>
            <td class="py-2 pr-3">{{ user.username }}</td>
            <td class="py-2 pr-3">{{ user.role }}</td>
            <td class="py-2 pr-3">{{ formatWib(user.lastLoginAt) }}</td>
            <td class="py-2 space-x-2">
              <button type="button" class="text-primary-600" @click="resetPassword(user)">Reset Password</button>
              <button type="button" class="text-primary-600" @click="revokeSessions(user)">Logout Pengguna</button>
              <button type="button" class="text-primary-600" @click="toggleActive(user)">
                {{ user.isActive ? 'Nonaktifkan' : 'Aktifkan' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
