import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  base: './',
  root: resolve(__dirname, 'src/renderer'),
  build: {
    outDir: resolve(__dirname, 'dist/renderer'),
    emptyOutDir: true,
    target: 'esnext',
    rollupOptions: {
      input: resolve(__dirname, 'src/renderer/index.html'),
      output: {
        format: 'iife',
        inlineDynamicImports: true,
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
      },
      external: [],
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src/renderer'),
      '@shared': resolve(__dirname, 'src/shared')
    }
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
