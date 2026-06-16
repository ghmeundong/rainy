import { defineConfig } from 'vite'

export default defineConfig({
  root: './',
  base: '/rainy/',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      input: './index.html',
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('three')) return 'three';
            if (id.includes('jquery')) return 'jquery';
            if (id.includes('jquery.ripples')) return 'jquery-ripples';
            if (id.includes('rainyday')) return 'rainyday';
            return 'vendor';
          }
        }
      }
    }
  },
  server: {
    port: 5173,
    open: true
  }
})
