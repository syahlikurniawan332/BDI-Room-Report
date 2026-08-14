import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { cloudflare } from '@cloudflare/vite-plugin';
import path from 'node:path';

export default defineConfig({
  plugins: [cloudflare(), vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src/client'),
      '@shared': path.resolve(__dirname, 'src/shared'),
    },
  },
  build: {
    outDir: 'dist/client',
    emptyOutDir: true,
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
