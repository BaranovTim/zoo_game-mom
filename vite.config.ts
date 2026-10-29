import { defineConfig } from 'vite';

export default defineConfig({
  // Относительные пути, чтобы та же сборка работала в Capacitor (телефоны) и Tauri (ПК).
  base: './',
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 2000,
  },
});
