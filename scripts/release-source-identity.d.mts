export interface GitSourceIdentity {format:'git-blobs-v1';baseCommit:string;sourceSha256:string;files:{path:string;sha256:string}[]}
export function gitSourceIdentity(root:string,revision?:string):Promise<GitSourceIdentity>;
