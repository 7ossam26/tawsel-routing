import {test,expect} from 'vitest';
import {execFileSync} from 'node:child_process';
import {mkdtemp,writeFile,mkdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {gitSourceIdentity} from '../../../../scripts/release-source-identity.mjs';

test('immutable source bytes survive CRLF checkout and documentation commits while source drift is rejected',async()=>{
 const root=await mkdtemp(join(tmpdir(),'tawsel-source-identity-'));
 const git=(...args:string[])=>execFileSync('git',args,{cwd:root,encoding:'utf8',windowsHide:true});
 try{
  git('init');git('config','user.email','fixture@example.invalid');git('config','user.name','Source fixture');
  git('config','core.autocrlf','true');await mkdir(join(root,'scripts'));
  await writeFile(join(root,'scripts','example.mjs'),'export const value = 1;\r\n');
  await writeFile(join(root,'README.md'),'Initial documentation\n');git('add','.');git('commit','-m','fixture source');
  const original=await gitSourceIdentity(root);
  await writeFile(join(root,'README.md'),'Derived documentation\n');git('add','README.md');git('commit','-m','documentation');
  const derived=await gitSourceIdentity(root);
  expect(derived.baseCommit).not.toBe(original.baseCommit);
  expect(derived.files).toEqual(original.files);expect(derived.sourceSha256).toBe(original.sourceSha256);
  await writeFile(join(root,'scripts','example.mjs'),'export const value = 2;\r\n');
  await expect(gitSourceIdentity(root)).rejects.toThrow('UNCOMMITTED_RELEASE_SOURCE');
  git('add','.');git('commit','-m','source change');
  expect((await gitSourceIdentity(root)).sourceSha256).not.toBe(original.sourceSha256);
  await writeFile(join(root,'scripts','new.mjs'),'export const added = true;\n');
  await expect(gitSourceIdentity(root)).rejects.toThrow('UNCOMMITTED_RELEASE_SOURCE');
 }finally{await rm(root,{recursive:true,force:true});}
});
