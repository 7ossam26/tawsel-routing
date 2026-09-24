import {cp,copyFile,mkdir} from 'node:fs/promises';
const root=new URL('../',import.meta.url);
await mkdir(new URL('packages/api-client/dist',root),{recursive:true});
await copyFile(new URL('packages/api-client/src/schema.d.ts',root),new URL('packages/api-client/dist/schema.d.ts',root));
// Build output only. Canonical ownership remains contracts/; never edit copies.
await cp(new URL('contracts/',root),new URL('packages/api-client/dist/contracts/',root),{recursive:true});
