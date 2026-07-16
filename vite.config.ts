import { defineConfig } from 'vite';

// Base is set to './' so the production build works when hosted from a
// subdirectory (GitHub Pages project pages, itch.io HTML5 zips, etc.).
export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 1500,
  },
  server: {
    host: true,
    port: 5173,
  },
});
