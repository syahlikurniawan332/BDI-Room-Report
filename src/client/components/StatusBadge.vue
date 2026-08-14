<script setup lang="ts">
import { computed } from 'vue';
import { statusBadgeClass, REPORT_STATUS_LABELS, COMPLAINT_STATUS_LABELS } from '../lib/utils';

const props = defineProps<{ status: string; label?: string }>();

const displayLabel = computed(() => {
  if (props.label) return props.label;
  return (
    REPORT_STATUS_LABELS[props.status as keyof typeof REPORT_STATUS_LABELS] ??
    COMPLAINT_STATUS_LABELS[props.status as keyof typeof COMPLAINT_STATUS_LABELS] ??
    props.status
  );
});
</script>

<template>
  <span class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium" :class="statusBadgeClass(status)">
    {{ displayLabel }}
  </span>
</template>
