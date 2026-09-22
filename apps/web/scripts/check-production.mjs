import { readFile, readdir } from 'node:fs/promises';
import { extname, join } from 'node:path';
import process from 'node:process';
import { fileURLToPath, URL } from 'node:url';

const forbidden = ['FIXTURE_ONLY_TAWSEL_DRIVER_REVIEW', 'عرض مطوّر ببيانات ثابتة', '__fixtures/driver-review'];

async function filesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await filesUnder(path));
    else if (['.html', '.js', '.css'].includes(extname(entry.name))) files.push(path);
  }
  return files;
}

for (const path of await filesUnder(fileURLToPath(new URL('../dist', import.meta.url)))) {
  const content = await readFile(path, 'utf8');
  for (const marker of forbidden) {
    if (content.includes(marker)) throw new Error(`Fixture marker leaked into production output: ${marker} in ${path}`);
  }
}

process.stdout.write('Production fixture isolation: PASS\n');
