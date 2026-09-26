/** Local rehearsal storage adapter. A filesystem on this host is NOT off-host protection. */
import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from 'node:crypto';
import { readFile, open, link, unlink } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const magic = Buffer.from('TAWSEL-BACKUP-1\n');
const digest = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
async function key(path: string) {
  const bytes = await readFile(path);
  if (bytes.length !== 32) throw new Error('Recovery key must contain exactly 32 bytes');
  return bytes;
}
export async function readProtected(path: string, keyPath: string): Promise<Buffer> {
  const bytes = await readFile(path);
  if (!bytes.subarray(0, magic.length).equals(magic) || bytes.length < magic.length + 28) throw new Error('Invalid protected object');
  const offset = magic.length;
  const decipher = createDecipheriv('aes-256-gcm', await key(keyPath), bytes.subarray(offset, offset + 12));
  decipher.setAAD(magic); decipher.setAuthTag(bytes.subarray(offset + 12, offset + 28));
  return Buffer.concat([decipher.update(bytes.subarray(offset + 28)), decipher.final()]);
}
async function publish(path: string, bytes: Buffer) {
  // fsync before atomic, no-overwrite publication. Never advertise a partial object.
  const temporary = `${path}.${randomUUID()}.partial`;
  const file = await open(temporary, 'wx', 0o600);
  try {
    await file.writeFile(bytes); await file.sync(); await file.close();
    await link(temporary, path);
  } finally { await file.close(); await unlink(temporary).catch(() => {}); }
}
export async function protect(source: string, destination: string, keyPath: string) {
  const bytes = await readFile(source);
  // PostgreSQL retries an archive command. Identical existing data is success;
  // collisions/corruption/wrong keys are failures and can never overwrite history.
  try {
    const existing = await readProtected(destination, keyPath);
    if (digest(existing) !== digest(bytes)) throw new Error('Protected object collision');
    return;
  } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', await key(keyPath), iv);
  cipher.setAAD(magic);
  const encrypted = Buffer.concat([cipher.update(bytes), cipher.final()]);
  await publish(destination, Buffer.concat([magic, iv, cipher.getAuthTag(), encrypted]));
}
export async function recover(source: string, destination: string, keyPath: string) {
  // Authentication completes before any plaintext is made visible.
  await publish(destination, await readProtected(source, keyPath));
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [mode, source, destination, keyPath] = process.argv.slice(2);
  try {
    if (!source || !destination || !keyPath || !['archive', 'restore'].includes(mode ?? '')) throw new Error('Invalid arguments');
    await (mode === 'archive' ? protect : recover)(source, destination, keyPath);
  } catch {
    // PostgreSQL logs this and increments pg_stat_archiver.failed_count.
    console.error(JSON.stringify({ service: 'tawsel-backup', status: 'failed', operation: mode === 'archive' ? 'archive' : 'restore' }));
    process.exitCode = 1;
  }
}
