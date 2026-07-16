/**
 * Publishes the production build to the repository root so GitHub Pages'
 * "Deploy from a branch" mode serves the working game directly (no Pages
 * settings change required).
 *
 * Vite builds from `dev.html` into `dist/` (so the output HTML is
 * `dist/dev.html`). This script renames it to `index.html` and copies the
 * built `index.html` + `assets/` to the repo root, alongside a `.nojekyll`
 * marker so GitHub serves the files as-is instead of running them through
 * Jekyll.
 *
 * Run via `npm run publish:root` (which builds first).
 */
import { cpSync, rmSync, renameSync, existsSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'dist');

if (!existsSync(dist)) {
  console.error('dist/ not found — run the build first (npm run build).');
  process.exit(1);
}

// Vite emits the HTML under the input template's name (dev.html).
const builtHtml = resolve(dist, 'dev.html');
const distIndex = resolve(dist, 'index.html');
if (existsSync(builtHtml)) renameSync(builtHtml, distIndex);
if (!existsSync(distIndex)) {
  console.error('Built index.html not found in dist/.');
  process.exit(1);
}

// Refresh the committed root assets from the fresh build.
const rootAssets = resolve(root, 'assets');
rmSync(rootAssets, { recursive: true, force: true });
cpSync(resolve(dist, 'assets'), rootAssets, { recursive: true });
cpSync(distIndex, resolve(root, 'index.html'));

// Ensure GitHub Pages serves the files statically (no Jekyll processing).
writeFileSync(resolve(root, '.nojekyll'), '');

console.log('Published production build to repo root (index.html + assets/).');
