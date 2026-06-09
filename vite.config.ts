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
});
