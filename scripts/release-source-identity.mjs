import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';

const sourcePath=p=>/^(apps\/|packages\/|db\/|scripts\/|identity\/|deploy\/|contracts\/|tests\/|package(?:-lock)?\.json$|.*config\.(?:ts|js|json)$)/.test(p)&&!/(?:\/dist\/|\/ui-dist\/|\.md$|\.zip$|\.png$)/.test(p);
export async function gitSourceIdentity(root,revision='HEAD'){
 const git=(...args)=>execFileSync('git',args,{cwd:root,windowsHide:true,maxBuffer:32*1024*1024});
 const lines=bytes=>bytes.toString('utf8').trim().split('\n').filter(Boolean);
 const committed=lines(git('ls-tree','-r','--name-only',revision)).filter(sourcePath).sort();
 const working=lines(git('ls-files','--cached','--others','--exclude-standard')).filter(sourcePath).sort();
 if(JSON.stringify(committed)!==JSON.stringify(working))throw new Error('UNCOMMITTED_RELEASE_SOURCE');
 try{git('diff','--quiet',revision,'--',...committed);}catch{throw new Error('UNCOMMITTED_RELEASE_SOURCE');}
 const files=committed.map(path=>({path,sha256:createHash('sha256').update(git('show',`${revision}:${path}`)).digest('hex')}));
 return {format:'git-blobs-v1',baseCommit:git('rev-parse',revision).toString().trim(),sourceSha256:createHash('sha256').update(JSON.stringify(files)).digest('hex'),files};
}
