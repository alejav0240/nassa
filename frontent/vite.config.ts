import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('.', import.meta.url)),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy: {
        '/api': {
          target: process.env.VITE_DEV_API_URL || 'http://127.0.0.1:8000',
          changeOrigin: true,
          ...(process.env.API_KEY ? { headers: { 'X-API-Key': process.env.API_KEY } } : {}),
        },
      },
      // Required when the dev server is accessed through the current Cloudflare tunnel.
      allowedHosts: ['calendars-works-logan-dylan.trycloudflare.com'],
    },
  };
});
