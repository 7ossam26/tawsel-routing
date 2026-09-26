import {AsyncLocalStorage} from 'node:async_hooks';
export type CommitInterval={beforeMs:number;afterMs:number};
const observer=new AsyncLocalStorage<(interval:CommitInterval)=>void>();
/** Local instrumentation only. Interval bounds the COMMIT acknowledgement; no wall-clock fiction. */
export const observeCommits=<T>(work:()=>Promise<T>,capture:(interval:CommitInterval)=>void)=>observer.run(capture,work);
export function committed(interval:CommitInterval){try{observer.getStore()?.(interval);}catch{/* Evidence capture cannot change the command result. */}}
