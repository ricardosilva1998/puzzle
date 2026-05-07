import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    cssMinify: true,
    minify: 'esbuild',
    sourcemap: false,
  },
  server: {
    port: 5173,
    open: false,
  },
});
