import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      input: {
        newtab: 'index.html',
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
