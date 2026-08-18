<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { apiGet, apiUpload } from '../lib/api';
import type { AreaPublic } from '@shared/constants';

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: { sitekey: string; callback: (token: string) => void }) => string;
      reset: (widgetId: string) => void;
    };
  }
}

const areas = ref<AreaPublic[]>([]);
const areaId = ref('');
const complaintText = ref('');
const photo = ref<File | null>(null);
const turnstileToken = ref('');
const turnstileSiteKey = ref('');
const turnstileWidgetId = ref('');
const message = ref('');
const error = ref('');
const loading = ref(false);
const success = ref(false);

onMounted(async () => {
  const [areaData, config] = await Promise.all([
    apiGet<{ areas: AreaPublic[] }>('/public/areas'),
    apiGet<{ turnstileSiteKey: string }>('/public/config'),
  ]);
  areas.value = areaData.areas;
  turnstileSiteKey.value = config.turnstileSiteKey;

  const slug = new URLSearchParams(window.location.search).get('area');
  if (slug) {
    const match = areas.value.find((a) => a.slug === slug);
    if (match) areaId.value = match.id;
  }

  if (turnstileSiteKey.value) {
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.onload = () => {
      const el = document.getElementById('turnstile-widget');
      if (el && window.turnstile) {
        turnstileWidgetId.value = window.turnstile.render(el, {
          sitekey: turnstileSiteKey.value,
          callback: (token: string) => {
            turnstileToken.value = token;
          },
        });
      }
    };
    document.head.appendChild(script);
  } else {
    turnstileToken.value = 'dev-bypass';
  }
});

function onPhotoChange(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  photo.value = file ?? null;
}

async function submit() {
  error.value = '';
  message.value = '';
  if (!areaId.value || complaintText.value.trim().length < 10) {
    error.value = 'Pilih area dan isi pengaduan minimal 10 karakter.';
    return;
  }
  if (!turnstileToken.value) {
    error.value = 'Selesaikan verifikasi keamanan.';
    return;
  }

  loading.value = true;
  try {
    const formData = new FormData();
    formData.append('areaId', areaId.value);
    formData.append('complaintText', complaintText.value.trim());
    formData.append('turnstileToken', turnstileToken.value);
    if (photo.value) formData.append('photo', photo.value);

    const result = await apiUpload<{ complaintNumber: string; message: string }>(
      '/public/complaints',
      formData,
    );
    success.value = true;
    message.value = `${result.message} Nomor: ${result.complaintNumber}`;
    complaintText.value = '';
    areaId.value = '';
    photo.value = null;
    if (turnstileWidgetId.value && window.turnstile) window.turnstile.reset(turnstileWidgetId.value);
    turnstileToken.value = turnstileSiteKey.value ? '' : 'dev-bypass';
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Gagal mengirim pengaduan.';
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
      class="grid w-full max-w-5xl overflow-hidden rounded-[28px] border border-[#e4dccb] bg-white shadow-[0_20px_60px_rgba(23,35,61,0.12)] lg:grid-cols-[0.8fr_1.2fr]"
    >
      <!-- Informasi -->
      <section
        class="relative overflow-hidden bg-[#17233d] px-7 py-9 text-white sm:px-10 lg:flex lg:flex-col lg:justify-between"
      >
        <div
          class="absolute -right-24 -top-24 h-72 w-72 rounded-full border border-white/10"
        />
        <div
          class="absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-[#d8c9a7]/10"
        />

        <div class="relative">
          <div
            class="mb-7 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#fff8e8] text-[#17233d] shadow-lg"
          >
            <svg
              viewBox="0 0 24 24"
              class="h-7 w-7"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
            >
              <path
                d="M4 5.5A2.5 2.5 0 016.5 3h11A2.5 2.5 0 0120 5.5v8a2.5 2.5 0 01-2.5 2.5H10l-5 4v-4.5A2.5 2.5 0 014 13V5.5z"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M8 8h8M8 11.5h5"
                stroke-linecap="round"
              />
            </svg>
          </div>

          <p
            class="text-xs font-semibold uppercase tracking-[0.25em] text-[#d8c9a7]"
          >
            Layanan masyarakat
          </p>

          <h1 class="mt-3 text-3xl font-bold leading-tight">
            Sampaikan pengaduan kebersihan
          </h1>

          <p class="mt-4 text-sm leading-6 text-slate-300">
            Laporkan kondisi kebersihan pada area BDI Medan.
            Pengaduan dapat dikirim tanpa login.
          </p>

          <div class="mt-8 space-y-4 text-sm text-slate-300">
            <div class="flex items-start gap-3">
              <span
                class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs text-[#fff8e8]"
              >
                1
              </span>
              <p>Pilih area yang ingin dilaporkan.</p>
            </div>

            <div class="flex items-start gap-3">
              <span
                class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs text-[#fff8e8]"
              >
                2
              </span>
              <p>Jelaskan kondisi secara singkat dan jelas.</p>
            </div>

            <div class="flex items-start gap-3">
              <span
                class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs text-[#fff8e8]"
              >
                3
              </span>
              <p>Tambahkan satu foto jika diperlukan.</p>
            </div>
          </div>
        </div>

        <p
          class="relative mt-10 hidden border-t border-white/10 pt-6 text-xs leading-5 text-slate-400 lg:block"
        >
          Pengaduan akan diteruskan kepada administrator untuk
          ditinjau.
        </p>
      </section>

      <!-- Form -->
      <section class="px-7 py-9 sm:px-10 lg:px-12">
        <template v-if="!success">

          <h2 class="mt-3 text-2xl font-bold text-[#17233d]">
            Detail pengaduan
          </h2>

          <p class="mt-2 text-sm leading-6 text-slate-500">
            Isi informasi berikut agar pengaduan dapat ditindaklanjuti.
          </p>

          <form class="mt-7 space-y-5" @submit.prevent="submit">
            <div>
              <label
                for="area"
                class="mb-2 block text-sm font-semibold text-[#17233d]"
              >
                Area yang dilaporkan
              </label>

              <select
                id="area"
                v-model="areaId"
                class="w-full rounded-xl border border-[#d8d1c3] bg-white px-4 py-3 text-[#17233d] outline-none transition focus:border-[#17233d] focus:ring-4 focus:ring-[#17233d]/10"
                required
              >
                <option value="">Pilih area</option>
                <option
                  v-for="area in areas"
                  :key="area.id"
                  :value="area.id"
                >
                  {{ area.name }}
                </option>
              </select>
            </div>

            <div>
              <div class="mb-2 flex items-center justify-between gap-3">
                <label
                  for="text"
                  class="block text-sm font-semibold text-[#17233d]"
                >
                  Isi pengaduan
                </label>

                <span class="text-xs text-slate-400">
                  {{ complaintText.length }}/2000
                </span>
              </div>

              <textarea
                id="text"
                v-model="complaintText"
                maxlength="2000"
                placeholder="Jelaskan kondisi kebersihan yang ingin dilaporkan..."
                class="min-h-36 w-full resize-y rounded-xl border border-[#d8d1c3] bg-white px-4 py-3 text-[#17233d] outline-none transition placeholder:text-slate-400 focus:border-[#17233d] focus:ring-4 focus:ring-[#17233d]/10"
                required
              />
            </div>

            <div>
              <label
                class="mb-2 block text-sm font-semibold text-[#17233d]"
              >
                Foto pendukung
                <span class="font-normal text-slate-400">
                  (opsional)
                </span>
              </label>

              <input
                id="photo"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                class="sr-only"
                @change="onPhotoChange"
              />

              <label
                for="photo"
                class="flex cursor-pointer items-center gap-4 rounded-xl border-2 border-dashed border-[#d8d1c3] bg-[#fdfbf6] px-4 py-4 transition hover:border-[#17233d] hover:bg-[#f8f3e8]"
              >
                <span
                  class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#f3ecdc] text-[#17233d]"
                >
                  <svg
                    viewBox="0 0 24 24"
                    class="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.8"
                  >
                    <path
                      d="M12 16V4m0 0L8 8m4-4l4 4"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                    <path
                      d="M5 14v4a2 2 0 002 2h10a2 2 0 002-2v-4"
                      stroke-linecap="round"
                    />
                  </svg>
                </span>

                <span class="min-w-0">
                  <span
                    class="block truncate text-sm font-semibold text-[#17233d]"
                  >
                    {{
                      photo
                        ? photo.name
                        : 'Pilih foto dari perangkat'
                    }}
                  </span>

                  <span class="mt-1 block text-xs text-slate-400">
                    JPG, PNG, atau WEBP · maksimal satu foto
                  </span>
                </span>
              </label>
            </div>

            <div id="turnstile-widget" />

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

              {{
                loading
                  ? 'Mengirim pengaduan...'
                  : 'Kirim Pengaduan'
              }}
            </button>
          </form>
        </template>

        <!-- Berhasil -->
        <div
          v-else
          class="flex min-h-[440px] flex-col items-center justify-center text-center"
        >
          <div
            class="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"
          >
            <svg
              viewBox="0 0 24 24"
              class="h-8 w-8"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                d="M5 12.5l4 4L19 7"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </div>

          <h2 class="mt-5 text-2xl font-bold text-[#17233d]">
            Pengaduan berhasil dikirim
          </h2>

          <p
            class="mt-3 max-w-md text-sm leading-6 text-slate-500"
          >
            {{ message }}
          </p>

          <button
            type="button"
            class="mt-7 rounded-xl border border-[#17233d] px-5 py-3 font-semibold text-[#17233d] transition hover:bg-[#17233d] hover:text-white"
            @click="success = false"
          >
            Kirim Pengaduan Lain
          </button>
        </div>
      </section>
    </div>
  </div>
</template>
