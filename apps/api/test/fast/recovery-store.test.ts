import { test, expect } from 'vitest';
import { mkdtemp, writeFile, readFile, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { protect, recover } from '../../../../scripts/recovery-store.js';

test('protected backup restores exact bytes; retries are idempotent and a collision cannot replace the backup', async () => {
  const root = await mkdtemp(join(tmpdir(), 'tawsel-store-'));
  const p = (n: string) => join(root, n);
  try {
    await writeFile(p('key'), randomBytes(32)); await writeFile(p('source'), 'private recovery data');
    await protect(p('source'), p('object'), p('key')); await protect(p('source'), p('object'), p('key'));
    expect((await readFile(p('object'))).includes(Buffer.from('private recovery data'))).toBe(false);
    await writeFile(p('source'), 'changed'); await expect(protect(p('source'), p('object'), p('key'))).rejects.toThrow('collision');
    await recover(p('object'), p('restored'), p('key')); expect(await readFile(p('restored'), 'utf8')).toBe('private recovery data');
    await expect(recover(p('object'), p('restored'), p('key'))).rejects.toThrow();
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('missing destination, key loss, wrong key and modified ciphertext fail without publishing plaintext', async () => {
  const root = await mkdtemp(join(tmpdir(), 'tawsel-store-')), p = (n: string) => join(root, n);
  try {
    await writeFile(p('key'), randomBytes(32)); await writeFile(p('wrong'), randomBytes(32)); await writeFile(p('source'), 'private');
    await expect(protect(p('source'), p('missing/object'), p('key'))).rejects.toThrow();
    await mkdir(p('directory')); await expect(protect(p('source'), p('directory'), p('key'))).rejects.toThrow();
    await protect(p('source'), p('object'), p('key'));
    await expect(recover(p('object'), p('plain'), p('absent'))).rejects.toThrow();
    await expect(recover(p('object'), p('plain'), p('wrong'))).rejects.toThrow();
    const corrupt = await readFile(p('object')); corrupt[corrupt.length - 1]! ^= 1; await writeFile(p('object'), corrupt);
    await expect(recover(p('object'), p('plain'), p('key'))).rejects.toThrow();
    await expect(readFile(p('plain'))).rejects.toThrow();
  } finally { await rm(root, { recursive: true, force: true }); }
});
