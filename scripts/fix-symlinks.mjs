import { existsSync, readdirSync, rmSync, symlinkSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const NM = join(ROOT, 'node_modules', '@quenetiq');
const DIST = join(ROOT, 'dist', 'quenetiq');

if (!existsSync(NM)) process.exit(0);

for (const name of readdirSync(NM)) {
  const distPath = join(DIST, name);
  const nmPath = join(NM, name);
  if (existsSync(distPath) && nmPath !== distPath) {
    rmSync(nmPath, { recursive: true, force: true });
    symlinkSync(distPath, nmPath);
  }
}
