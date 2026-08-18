<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();

const username = ref('');
const password = ref('');
const showPassword = ref(false);
const error = ref('');
const loading = ref(false);

async function submit() {
  error.value = '';
  loading.value = true;

  try {
    const user = await auth.login(
      username.value.trim(),
      password.value,
    );

    const redirect =
      (route.query.redirect as string) ||
      (user.role === 'ADMIN' ? '/admin' : '/cs');

    await router.push(redirect);
  } catch (e) {
    error.value =
      e instanceof Error
        ? e.message
        : 'Username atau password salah.';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div
    class="flex min-h-[calc(100vh-130px)] items-center justify-center py-6"
  >
    <div
      class="grid w-full max-w-4xl overflow-hidden rounded-[28px] border border-[#e4dccb] bg-white shadow-[0_20px_60px_rgba(23,35,61,0.12)] md:grid-cols-[0.9fr_1.1fr]"
    >
      <!-- Bagian identitas -->
      <section
        class="relative overflow-hidden bg-[#17233d] px-7 py-10 text-white sm:px-10 md:flex md:min-h-[520px] md:flex-col md:justify-between"
      >
        <div
          class="absolute -right-20 -top-20 h-64 w-64 rounded-full border border-white/10"
        />
        <div
          class="absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-[#d8c9a7]/10"
        />

        <div class="relative">
          <div
            class="mb-8 flex h-34 w-34 items-center justify-center rounded-2xl bg-[#fff8e8] font-bold tracking-wide text-[#17233d] shadow-lg"
          >
            Balai Diklat Industri
          </div>

          <p
            class="text-xs font-semibold uppercase tracking-[0.25em] text-[#d8c9a7]"
          >
            Cleaning Control
          </p>

          <h1
            class="mt-3 max-w-sm text-3xl font-bold leading-tight"
          >
            Monitoring kebersihan yang lebih tertata
          </h1>
        </div>

        <div
          class="relative mt-10 hidden border-t border-white/10 pt-6 text-sm text-slate-300 md:block"
        >
        </div>
      </section>

      <!-- Form login -->
      <section
        class="flex flex-col justify-center px-7 py-10 sm:px-12 md:px-14"
      >
        <div
          class="mb-3 inline-flex w-fit rounded-full bg-[#f3ecdc] px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#17233d]"
        >
          Akses internal
        </div>

        <h2 class="text-3xl font-bold text-[#17233d]">
          Selamat datang
        </h2>

        <p class="mt-2 text-sm leading-6 text-slate-500">
          Masukkan username dan password yang diberikan oleh
          administrator.
        </p>

        <form class="mt-8 space-y-5" @submit.prevent="submit">
          <div>
            <label
              for="username"
              class="mb-2 block text-sm font-semibold text-[#17233d]"
            >
              Username
            </label>

            <input
              id="username"
              v-model="username"
              type="text"
              autocomplete="username"
              placeholder="Masukkan username"
              class="w-full rounded-xl border border-[#d8d1c3] bg-white px-4 py-3 text-[#17233d] outline-none transition placeholder:text-slate-400 focus:border-[#17233d] focus:ring-4 focus:ring-[#17233d]/10"
              required
            />
          </div>

          <div>
            <label
              for="password"
              class="mb-2 block text-sm font-semibold text-[#17233d]"
            >
              Password
            </label>

            <div class="relative">
              <input
                id="password"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="current-password"
                placeholder="Masukkan password"
                class="w-full rounded-xl border border-[#d8d1c3] bg-white px-4 py-3 pr-12 text-[#17233d] outline-none transition placeholder:text-slate-400 focus:border-[#17233d] focus:ring-4 focus:ring-[#17233d]/10"
                required
              />

              <button
                type="button"
                class="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-slate-400 transition hover:text-[#17233d]"
                :aria-label="
                  showPassword
                    ? 'Sembunyikan password'
                    : 'Tampilkan password'
                "
                @click="showPassword = !showPassword"
              >
                <svg
                  v-if="showPassword"
                  viewBox="0 0 24 24"
                  class="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.8"
                >
                  <path
                    d="M3 3l18 18M10.6 10.7a2 2 0 002.7 2.7M9.9 4.2A10.7 10.7 0 0112 4c5.5 0 9 5 9 5a16 16 0 01-2.1 2.6M6.6 6.6C4.2 8.1 3 10 3 10s3.5 5 9 5a10.7 10.7 0 003.4-.6"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>

                <svg
                  v-else
                  viewBox="0 0 24 24"
                  class="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.8"
                >
                  <path
                    d="M3 12s3.5-5 9-5 9 5 9 5-3.5 5-9 5-9-5-9-5z"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                  <circle cx="12" cy="12" r="2.5" />
                </svg>
              </button>
            </div>
          </div>

          <div
            v-if="error"
            class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            role="alert"
          >
            {{ error }}
          </div>

          <button
            type="submit"
            class="flex w-full items-center justify-center rounded-xl bg-[#17233d] px-5 py-3.5 font-semibold text-white shadow-lg shadow-[#17233d]/15 transition hover:bg-[#243557] disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="loading"
          >
            <span
              v-if="loading"
              class="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
            />

            {{ loading ? 'Memproses...' : 'Masuk' }}
          </button>
        </form>

        <p class="mt-6 text-center text-xs text-slate-400">
          Hubungi administrator jika lupa password.
        </p>
      </section>
    </div>
  </div>
</template>