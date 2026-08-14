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
  <div class="mx-auto max-w-2xl space-y-4">
    <div class="card">
      <h1 class="text-xl font-bold">Pengaduan Kebersihan</h1>
      <p class="mt-1 text-sm text-slate-600">Form anonim untuk masyarakat. Tanpa login.</p>

      <form v-if="!success" class="mt-6 space-y-4" @submit.prevent="submit">
        <div>
          <label class="label" for="area">Area</label>
          <select id="area" v-model="areaId" class="input" required>
            <option value="">Pilih area...</option>
            <option v-for="area in areas" :key="area.id" :value="area.id">{{ area.name }}</option>
          </select>
        </div>
        <div>
          <label class="label" for="text">Isi Pengaduan</label>
          <textarea id="text" v-model="complaintText" class="input min-h-32" required />
        </div>
        <div>
          <label class="label" for="photo">Foto (opsional, maks 1)</label>
          <input id="photo" type="file" accept="image/jpeg,image/png,image/webp" class="input" @change="onPhotoChange" />
        </div>
        <div id="turnstile-widget" />
        <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
        <button type="submit" class="btn-primary" :disabled="loading">
          {{ loading ? 'Mengirim...' : 'Kirim Pengaduan' }}
        </button>
      </form>

      <div v-else class="mt-6 rounded-lg bg-green-50 p-4 text-green-800">
        {{ message }}
        <button class="btn-secondary mt-4" @click="success = false">Kirim Pengaduan Lain</button>
      </div>
    </div>
  </div>
</template>
