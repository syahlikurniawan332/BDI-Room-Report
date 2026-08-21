<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { apiGet, apiPatch, apiPost } from '../../lib/api';
import { formatWib } from '../../lib/utils';
import type { UserPublic } from '@shared/constants';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/auth';
import UserActionButtons from '../../components/UserActionButtons.vue';

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

const editingId = ref<string | null>(null);
const savingEdit = ref(false);

const editForm = ref({
  displayName: '',
  username: '',
  email: '',
});

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
  if (user.id === auth.user?.id) {
    error.value = 'Akun yang sedang digunakan tidak dapat dinonaktifkan.';
    return;
  }

  await apiPatch(`/users/${user.id}`, { isActive: !user.isActive });
  await load();
}

async function resetPassword(user: UserPublic) {
  const isOwnAccount = user.id === auth.user?.id;
  error.value = '';

  const password = window.prompt(`Masukkan password baru untuk ${user.displayName}:`);

  if (password === null) return;

  if (password.length < 8) {
    error.value = 'Password minimal 8 karakter.';
    return;
  }

  try {
    const data = await apiPost<{ temporaryPassword: string }>(`/users/${user.id}/reset-password`, {
      password,
      generatePassword: false,
    });

    tempPassword.value = data.temporaryPassword;

    await apiPost(`/users/${user.id}/revoke-sessions`);
    if (isOwnAccount) {
      await auth.logout();
      await router.replace({ name: 'login' });
      return;
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Gagal mereset password.';
  }
}

async function revokeSessions(user: UserPublic) {
  await apiPost(`/users/${user.id}/revoke-sessions`);
}

function startEdit(user: UserPublic) {
  error.value = '';

  editingId.value = user.id;

  editForm.value = {
    displayName: user.displayName,
    username: user.username,
    email: user.email,
  };
}

function cancelEdit() {
  editingId.value = null;

  editForm.value = {
    displayName: '',
    username: '',
    email: '',
  };
}

async function saveEdit(user: UserPublic) {
  const displayName = editForm.value.displayName.trim();
  const username = editForm.value.username.trim();
  const email = editForm.value.email.trim();

  if (displayName.length < 2) {
    error.value = 'Nama minimal 2 karakter.';
    return;
  }

  if (username.length < 3) {
    error.value = 'Username minimal 3 karakter.';
    return;
  }

  if (!email) {
    error.value = 'Email wajib diisi.';
    return;
  }

  if (displayName === user.displayName && username === user.username && email === user.email) {
    cancelEdit();
    return;
  }

  error.value = '';
  savingEdit.value = true;

  try {
    await apiPatch(`/users/${user.id}`, {
      displayName,
      username,
      email,
    });

    cancelEdit();
    await load();
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Gagal mengubah pengguna.';
  } finally {
    savingEdit.value = false;
  }
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

    <p v-if="error" class="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">
      {{ error }}
    </p>

    <div v-if="tempPassword" class="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm">
      Password sementara (tampil sekali): <strong>{{ tempPassword }}</strong>
      <button type="button" class="ml-3 underline" @click="tempPassword = ''">Tutup</button>
    </div>

    <form v-if="showCreate" class="card grid gap-3 md:grid-cols-2" @submit.prevent="createUser">
      <div>
        <label class="label">Nama</label><input v-model="form.displayName" class="input" required />
      </div>
      <div>
        <label class="label">Username</label
        ><input v-model="form.username" class="input" required />
      </div>
      <div>
        <label class="label">Email</label
        ><input v-model="form.email" type="email" class="input" required />
      </div>
      <div>
        <label class="label">Role</label>
        <select v-model="form.role" class="input">
          <option value="CS">CS</option>
          <option value="ADMIN">Admin</option>
        </select>
      </div>
      <div class="md:col-span-2">
        <label class="inline-flex items-center gap-2 text-sm">
          <input v-model="form.generatePassword" type="checkbox" />
          Generate password otomatis
        </label>
        <input
          v-if="!form.generatePassword"
          v-model="form.password"
          class="input mt-2"
          type="password"
        />
      </div>
      <button type="submit" class="btn-primary md:col-span-2">Simpan</button>
    </form>

    <div class="card hidden overflow-x-auto md:block">
      <table class="min-w-full text-sm">
        <thead>
          <tr class="border-b text-left text-slate-500">
            <th class="py-2 pr-3">Nama</th>
            <th class="py-2 pr-3">Username</th>
            <th class="py-2 pr-3">Email</th>
            <th class="py-2 pr-3">Role</th>
            <th class="py-2 pr-3">Login Terakhir</th>
            <th class="py-2">Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="user in users"
            :key="user.id"
            class="border-b border-slate-100 dark:border-slate-800"
          >
            <!-- Nama -->
            <td class="py-2 pr-3">
              <input
                v-if="editingId === user.id"
                v-model="editForm.displayName"
                class="input min-w-[180px]"
                maxlength="200"
              />

              <span v-else>
                {{ user.displayName }}
              </span>
            </td>

            <!-- Username -->
            <td class="py-2 pr-3">
              <input
                v-if="editingId === user.id"
                v-model="editForm.username"
                class="input min-w-[140px]"
                maxlength="50"
              />

              <span v-else>
                {{ user.username }}
              </span>
            </td>

            <!-- Email -->
            <td class="py-2 pr-3">
              <input
                v-if="editingId === user.id"
                v-model="editForm.email"
                type="email"
                class="input min-w-[220px]"
                maxlength="200"
              />

              <span v-else>
                {{ user.email }}
              </span>
            </td>

            <!-- Role -->
            <td class="py-2 pr-3">
              {{ user.role }}
            </td>

            <!-- Login Terakhir -->
            <td class="py-2 pr-3">
              {{ formatWib(user.lastLoginAt) }}
            </td>

            <!-- Aksi -->
            <td class="py-2">
              <!-- Mode Edit -->
              <div v-if="editingId === user.id" class="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  class="font-medium text-emerald-600 transition hover:text-emerald-700 disabled:opacity-50 dark:text-emerald-400 dark:hover:text-emerald-300"
                  :disabled="savingEdit"
                  @click="saveEdit(user)"
                >
                  {{ savingEdit ? 'Menyimpan...' : 'Simpan' }}
                </button>

                <button
                  type="button"
                  class="font-medium text-slate-500 transition hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  :disabled="savingEdit"
                  @click="cancelEdit"
                >
                  Batal
                </button>
              </div>

              <!-- Mode Normal -->
              <UserActionButtons
                v-else
                :user="user"
                :is-own-account="user.id === auth.user?.id"
                @edit="startEdit(user)"
                @reset-password="resetPassword(user)"
                @revoke-sessions="revokeSessions(user)"
                @toggle-active="toggleActive(user)"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="space-y-3 md:hidden">
      <article
        v-for="user in users"
        :key="user.id"
        class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
      >
        <template v-if="editingId === user.id">
          <div class="space-y-3">
            <div>
              <label class="label">Nama</label>
              <input v-model="editForm.displayName" class="input" maxlength="200" />
            </div>
            <div>
              <label class="label">Username</label>
              <input v-model="editForm.username" class="input" maxlength="50" />
            </div>
            <div>
              <label class="label">Email</label>
              <input v-model="editForm.email" type="email" class="input" maxlength="200" />
            </div>
            <div class="flex gap-2">
              <button type="button" class="btn-primary flex-1" :disabled="savingEdit" @click="saveEdit(user)">
                {{ savingEdit ? 'Menyimpan...' : 'Simpan' }}
              </button>
              <button type="button" class="btn-secondary" :disabled="savingEdit" @click="cancelEdit">
                Batal
              </button>
            </div>
          </div>
        </template>

        <template v-else>
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <h2 class="truncate font-semibold text-slate-900 dark:text-slate-100">
                {{ user.displayName }}
              </h2>
              <p class="mt-0.5 text-sm text-slate-500 dark:text-slate-400">@{{ user.username }}</p>
            </div>
            <span
              class="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold"
              :class="user.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'"
            >
              {{ user.isActive ? 'Aktif' : 'Nonaktif' }}
            </span>
          </div>

          <dl class="mt-4 grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-sm">
            <dt class="text-slate-500">Email</dt>
            <dd class="min-w-0 break-all text-slate-700 dark:text-slate-300">{{ user.email }}</dd>
            <dt class="text-slate-500">Role</dt>
            <dd class="text-slate-700 dark:text-slate-300">{{ user.role }}</dd>
            <dt class="text-slate-500">Login terakhir</dt>
            <dd class="text-slate-700 dark:text-slate-300">{{ formatWib(user.lastLoginAt) }}</dd>
          </dl>

          <div class="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
            <UserActionButtons
              :user="user"
              :is-own-account="user.id === auth.user?.id"
              @edit="startEdit(user)"
              @reset-password="resetPassword(user)"
              @revoke-sessions="revokeSessions(user)"
              @toggle-active="toggleActive(user)"
            />
          </div>
        </template>
      </article>
    </div>
  </div>
</template>
