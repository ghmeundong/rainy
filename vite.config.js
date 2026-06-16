import { defineConfig } from 'vite'

export default defineConfig({
  root: './',
  base: '/rainy/',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: './index.html'
    }
  },
  server: {
    port: 5173,
    open: true
  }
})
