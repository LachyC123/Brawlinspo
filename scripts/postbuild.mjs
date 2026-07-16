/**
 * Vite builds from `dev.html`, so the emitted HTML is `dist/dev.html`. Rename
 * it to `dist/index.html` so the `dist/` output is a conventional, directly
 * deployable static site.
 */
import { renameSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const from = resolve(root, 'dist/dev.html');
const to = resolve(root, 'dist/index.html');
if (existsSync(from)) {
  renameSync(from, to);
  console.log('Renamed dist/dev.html -> dist/index.html');
}
