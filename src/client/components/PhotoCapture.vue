<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{
  label?: string;
  accept?: string;
  previewUrl?: string | null;
}>();

const emit = defineEmits<{
  capture: [file: File, capturedAt: string];
}>();

const inputRef = ref<HTMLInputElement | null>(null);
const localPreview = ref<string | null>(null);

function openPicker() {
  inputRef.value?.click();
}

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  localPreview.value = URL.createObjectURL(file);
  emit('capture', file, new Date().toISOString());
  input.value = '';
}
</script>

<template>
  <div class="space-y-2">
    <label v-if="label" class="label">{{ label }}</label>
    <div
      class="flex min-h-48 flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-4"
    >
      <img
        v-if="localPreview || previewUrl"
        :src="localPreview || previewUrl || undefined"
        alt="Preview"
        class="mb-3 max-h-64 rounded-lg object-contain"
      />
      <button type="button" class="btn-primary" @click="openPicker">
        {{ localPreview || previewUrl ? 'Ambil Ulang Foto' : 'Ambil / Pilih Foto' }}
      </button>
      <input
        ref="inputRef"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        class="hidden"
        @change="onFileChange"
      />
    </div>
  </div>
</template>
