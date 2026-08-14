<script setup lang="ts">
import { RouterView } from 'vue-router';
import AppLayout from './components/AppLayout.vue';
import { useAuthStore } from './stores/auth';
import { onMounted } from 'vue';

const auth = useAuthStore();

onMounted(() => {
  auth.fetchSession();
});
</script>

<template>
  <AppLayout>
    <RouterView />
  </AppLayout>
</template>
