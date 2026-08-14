<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();

const username = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);

async function submit() {
  error.value = '';
  loading.value = true;
  try {
    const user = await auth.login(username.value.trim(), password.value);
    const redirect = (route.query.redirect as string) || (user.role === 'ADMIN' ? '/admin' : '/cs');
    await router.push(redirect);
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Username atau password salah.';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="mx-auto max-w-md">
    <div class="card">
      <h1 class="text-xl font-bold">Masuk</h1>
      <p class="mt-1 text-sm text-slate-600">Gunakan username dan password yang diberikan admin.</p>

      <form class="mt-6 space-y-4" @submit.prevent="submit">
        <div>
          <label class="label" for="username">Username</label>
          <input id="username" v-model="username" class="input" autocomplete="username" required />
        </div>
        <div>
          <label class="label" for="password">Password</label>
          <input
            id="password"
            v-model="password"
            type="password"
            class="input"
            autocomplete="current-password"
            required
          />
        </div>
        <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
        <button type="submit" class="btn-primary w-full" :disabled="loading">
          {{ loading ? 'Memproses...' : 'Masuk' }}
        </button>
      </form>
    </div>
  </div>
</template>
