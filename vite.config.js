import { defineConfig } from 'vite'
import path from 'path'
import viteImagemin from 'vite-plugin-imagemin';

const __dirname = path.resolve();

export default defineConfig({
  root: './',
  base: '/rainy/',
  publicDir: 'public',
  plugins: [
    viteImagemin({
      gifsicle: { optimizationLevel: 7, interlaced: false },
      optipng: { optimizationLevel: 7 },
      mozjpeg: { quality: 80 },
      pngquant: { quality: [0.8, 0.9], speed: 4 },
      webp: {
        quality: 80 // PNG/JPG를 빌드할 때 퀄리티 80짜리 WebP로 자동 전환
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@services': path.resolve(__dirname, './src/services'),
      '@components': path.resolve(__dirname, './src/components'),
      '@utils': path.resolve(__dirname, './src/utils'),
    }
  },
  define: {
    'import.meta.env.VITE_API_URL': JSON.stringify(
      process.env.VITE_API_URL || 'http://localhost:8787'
    ),
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1000,
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
    },
    minify: 'terser',
    terserOptions: {
      mangle: true,
      format: {
        comments: false,
      },
    },
  },
  server: {
    port: 5173,
    open: true
  }
})
