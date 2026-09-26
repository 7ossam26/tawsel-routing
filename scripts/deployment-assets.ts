import { constants } from 'node:fs';
import { copyFile, mkdir, readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

/** Append immutable assets. Never delete an old release or overwrite a collision. */
export async function retainAssets(source: string, destination: string): Promise<number> {
  let count = 0;
  async function copy(relative: string) {
    const from = join(source, relative), to = join(destination, relative);
    await mkdir(resolve(to, '..'), { recursive: true });
    try { await copyFile(from, to, constants.COPYFILE_EXCL); count++; }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      if (!(await readFile(from)).equals(await readFile(to))) throw new Error('Immutable asset collision; release refused', { cause: error });
    }
  }
  async function walk(relative: string) {
    for (const entry of await readdir(join(source, relative), { withFileTypes: true })) {
      const name = join(relative, entry.name);
      if (entry.isDirectory()) await walk(name);
      else if (entry.isFile()) await copy(name);
      else throw new Error('Unexpected asset type');
    }
  }
  await walk('assets');
  for (const name of await readdir(source)) if (/^workbox-[\w-]+\.js$/.test(name)) await copy(name);
  return count;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [, , source, destination] = process.argv;
  if (!source || !destination) throw new Error('Usage: deployment-assets.ts <built web directory> <retained volume>');
  console.log(`Retained ${await retainAssets(source, destination)} new immutable assets; existing assets preserved.`);
}
