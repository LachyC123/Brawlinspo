import { defineConfig } from 'vite';
import { resolve } from 'path';

// Base is './' so the build works from any subdirectory (GitHub Pages project
// pages, itch.io zips, etc.).
//
// The dev/build HTML template is `dev.html` (it references /src/main.ts). The
// production `index.html` at the repo root is a BUILT artifact, committed so
// that GitHub Pages' "Deploy from a branch" mode serves the working game
// directly. See scripts/publish-root.mjs and the README.
export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      input: resolve(__dirname, 'dev.html'),
    },
  },
  server: {
    host: true,
    port: 5173,
    open: '/dev.html',
  },
});
