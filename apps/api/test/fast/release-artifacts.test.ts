import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {afterEach,expect,test} from 'vitest';
import {releasePath,sha256,verifyArtifacts} from '../../../../scripts/verify-erp-release.mjs';

const directories:string[]=[];
afterEach(async()=>{for(const path of directories.splice(0))await rm(path,{recursive:true,force:true});});
async function artifact(){
 const root=await mkdtemp(join(tmpdir(),'tawsel-release-verifier-'));directories.push(root);
 await mkdir(join(root,'contracts'));const path='contracts/example.json',bytes=Buffer.from('{"version":"1.0.0"}\n');
 await writeFile(join(root,path),bytes);return {root,entry:{path,bytes:bytes.length,sha256:sha256(bytes)}};
}
test('accepts exact bytes and rejects changed content of the same size',async()=>{
 const {root,entry}=await artifact();expect(await verifyArtifacts(root,[entry])).toEqual(new Set([entry.path]));
 await writeFile(join(root,entry.path),'{"version":"2.0.0"}\n');
 await expect(verifyArtifacts(root,[entry])).rejects.toThrow('digest/size mismatch');
});
test('rejects missing files, wrong size and invalid digest',async()=>{
 const {root,entry}=await artifact();
 await expect(verifyArtifacts(root,[{...entry,path:'missing.json'}])).rejects.toThrow();
 await expect(verifyArtifacts(root,[{...entry,bytes:entry.bytes+1}])).rejects.toThrow('digest/size mismatch');
 await expect(verifyArtifacts(root,[{...entry,sha256:'bad'}])).rejects.toThrow('digest/size mismatch');
});
test('rejects duplicate paths and recursive manifest hashing',async()=>{
 const {root,entry}=await artifact();
 await expect(verifyArtifacts(root,[entry,entry])).rejects.toThrow('Duplicate');
 await expect(verifyArtifacts(root,[{...entry,path:'docs/erp/release-manifest.json'}])).rejects.toThrow('self-digest');
});
test.each(['../secret','contracts/../../secret','/absolute','C:/secret','contracts\\secret','contracts//example','./example','contracts/./example',''])('rejects unsafe manifest path %s',path=>{
 expect(()=>releasePath(join(tmpdir(),'bundle'),path)).toThrow('Unsafe manifest path');
});