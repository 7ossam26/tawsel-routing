export interface ArtifactEntry {path:string;bytes:number;sha256:string;source?:string}
export function sha256(bytes:string|Uint8Array):string;
export function releasePath(root:string,path:string):string;
export function verifyArtifacts(root:string,entries:ArtifactEntry[]):Promise<Set<string>>;
export function verifyRelease(root:string):Promise<{
  artifacts:number;
  sourceSha256:string;
  consumerRuntimeSha256:string;
  versions:Record<string,string>;
  status:string;
}>;
