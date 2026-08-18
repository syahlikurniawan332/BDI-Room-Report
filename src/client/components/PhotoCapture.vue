<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref } from 'vue';
import { compressToWebp } from '../lib/image';

export type UploadStatus = 'idle' | 'local' | 'uploading' | 'saved' | 'failed';

const props = defineProps<{
  label?: string;
  previewUrl?: string | null;
  mode?: 'camera' | 'gallery';
  status?: UploadStatus;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  capture: [file: File, capturedAt: string];
  retry: [];
}>();

const videoRef = ref<HTMLVideoElement | null>(null);
const inputRef = ref<HTMLInputElement | null>(null);
const localPreview = ref<string | null>(null);
const streaming = ref(false);
const stream = ref<MediaStream | null>(null);
const locked = ref(false);

const statusLabels: Record<UploadStatus, string> = {
  idle: '',
  local: 'Tersimpan di perangkat',
  uploading: 'Sedang diunggah',
  saved: 'Berhasil disimpan',
  failed: 'Gagal — coba lagi',
};

function stopStream() {
  stream.value?.getTracks().forEach((t) => t.stop());
  stream.value = null;
  streaming.value = false;
}

async function startCamera() {
  if (props.disabled || locked.value) return;

  stopStream();

  try {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Browser tidak mendukung akses kamera.');
    }

    const media = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: {
          ideal: 'environment',
        },
      },
      audio: false,
    });

    stream.value = media;
    streaming.value = true;

    // Tunggu Vue selesai merender elemen <video>
    await nextTick();

    if (!videoRef.value) {
      throw new Error('Elemen video tidak tersedia.');
    }

    videoRef.value.srcObject = media;

    await videoRef.value.play();
  } catch (err) {
    console.error('Camera error:', err);

    stopStream();

    if (err instanceof DOMException) {
      if (err.name === 'NotAllowedError') {
        alert('Izin kamera ditolak. Silakan izinkan akses kamera melalui pengaturan browser.');
        return;
      }

      if (err.name === 'NotFoundError') {
        alert('Kamera tidak ditemukan pada perangkat ini.');
        return;
      }

      if (err.name === 'NotReadableError') {
        alert('Kamera sedang digunakan aplikasi lain atau tidak dapat diakses.');
        return;
      }
    }

    alert(err instanceof Error ? err.message : 'Tidak dapat mengakses kamera.');
  }
}

async function captureFromCamera() {
  const video = videoRef.value;

  if (!video) {
    alert('Kamera belum tersedia.');
    return;
  }

  if (!video.videoWidth || !video.videoHeight) {
    alert('Kamera belum siap. Tunggu sebentar lalu coba lagi.');
    return;
  }

  const canvas = document.createElement('canvas');

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const context = canvas.getContext('2d');

  if (!context) {
    alert('Tidak dapat memproses foto.');
    return;
  }

  context.drawImage(video, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', 0.92);
  });

  if (!blob) {
    alert('Gagal mengambil foto.');
    return;
  }

  stopStream();

  const file = await compressToWebp(blob);

  if (localPreview.value) {
    URL.revokeObjectURL(localPreview.value);
  }

  localPreview.value = URL.createObjectURL(file);
  locked.value = true;

  emit('capture', file, new Date().toISOString());
}

function openGallery() {
  if (props.disabled || locked.value) return;
  inputRef.value?.click();
}

async function onGalleryChange(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  const compressed = await compressToWebp(file);
  localPreview.value = URL.createObjectURL(compressed);
  locked.value = true;
  emit('capture', compressed, new Date().toISOString());
  (event.target as HTMLInputElement).value = '';
}

function retake() {
  if (localPreview.value) URL.revokeObjectURL(localPreview.value);
  localPreview.value = null;
  locked.value = false;
  stopStream();
}

function onRetry() {
  emit('retry');
}

onBeforeUnmount(() => {
  stopStream();
  if (localPreview.value) URL.revokeObjectURL(localPreview.value);
});
</script>

<template>
  <div class="space-y-2">
    <div class="flex items-center justify-between">
      <label v-if="label" class="label mb-0">{{ label }}</label>
      <span
        v-if="status && status !== 'idle'"
        class="text-xs font-medium"
        :class="{
          'text-slate-500': status === 'local',
          'text-blue-600': status === 'uploading',
          'text-green-600': status === 'saved',
          'text-red-600': status === 'failed',
        }"
      >
        {{ statusLabels[status] }}
      </span>
    </div>

    <div
      class="flex min-h-52 flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-4"
    >
      <video
        v-if="streaming && mode !== 'gallery'"
        ref="videoRef"
        autoplay
        playsinline
        muted
        class="mb-3 max-h-64 w-full rounded-lg object-contain"
      />
      <img
        v-else-if="localPreview || previewUrl"
        :src="localPreview || previewUrl || undefined"
        alt="Preview"
        class="mb-3 max-h-64 rounded-lg object-contain"
      />

      <template v-if="mode === 'gallery'">
        <button
          v-if="!locked"
          type="button"
          class="btn-primary min-h-12 px-6 text-base"
          :disabled="disabled"
          @click="openGallery"
        >
          Pilih Foto
        </button>
        <input
          ref="inputRef"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          class="hidden"
          @change="onGalleryChange"
        />
      </template>

      <template v-else>
        <template v-if="!locked">
          <button
            v-if="!streaming"
            type="button"
            class="btn-primary min-h-12 w-full max-w-xs px-6 text-base"
            :disabled="disabled"
            @click="startCamera"
          >
            Buka Kamera
          </button>
          <button
            v-else
            type="button"
            class="btn-primary min-h-12 w-full max-w-xs px-6 text-base"
            @click="captureFromCamera"
          >
            Ambil Foto
          </button>
        </template>
        <button
          v-if="locked && status !== 'uploading'"
          type="button"
          class="btn-secondary mt-2 min-h-12 w-full max-w-xs text-base"
          @click="retake"
        >
          Ambil Ulang
        </button>
      </template>

      <button
        v-if="status === 'failed'"
        type="button"
        class="btn-primary mt-2 min-h-12 w-full max-w-xs text-base"
        @click="onRetry"
      >
        Coba Unggah Lagi
      </button>
    </div>
  </div>
</template>
