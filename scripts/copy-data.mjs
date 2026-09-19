/**
 * Copy the generated data snapshots next to the compiled server.
 *
 * `tsc` only emits JavaScript, and the two JSON files are read at runtime relative to `dist/index.js`, so a
 * build that skipped this step would ship a server whose recipe tools throw ENOENT.
 */
import { copyFileSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const from = join(here, '..', 'src', 'data');
const to = join(here, '..', 'dist', 'data');

mkdirSync(to, { recursive: true });
const files = readdirSync(from).filter((f) => f.endsWith('.json'));
for (const f of files) copyFileSync(join(from, f), join(to, f));
console.log(`copied ${files.length} data file(s) to dist/data`);
