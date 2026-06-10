import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 810,
    proxy: {
      '/api': {
        target: 'https://localhost:7001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    rollupOptions: {
      onwarn(warning, defaultHandler) {
        if (
          warning.message.includes('/*#__PURE__*/') &&
          warning.message.includes('@microsoft/signalr')
        ) {
          return;
        }
        defaultHandler(warning);
      },
    },
  },
});
