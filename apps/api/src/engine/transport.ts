import { EngineError } from './models.js';
import type { EngineConfig } from './config.js';
import { measure } from '../diagnostics/telemetry.js';

/** Share one instance per worker process. Saturation fails fast; no unbounded queue or retries. */
export class EngineTransport {
  private active = 0;
  constructor(private readonly config: EngineConfig) {}
  async json(provider: 'osrm' | 'vroom', url: URL, body?: unknown, cancel?: AbortSignal): Promise<unknown> {
    const started=performance.now();let failed=false;
    if (cancel?.aborted) throw new EngineError('cancelled',provider);
    if (this.active >= this.config.maxConcurrent) { measure('engine',0,true);throw new EngineError('busy',provider); }
    this.active++;
    const deadline = AbortSignal.timeout(this.config.timeoutMs);
    const signal = cancel ? AbortSignal.any([deadline,cancel]) : deadline;
    try {
      const response = await fetch(url, {
        method: body === undefined ? 'GET' : 'POST', redirect:'error', signal,
        headers:{Accept:'application/json',...(body === undefined ? {} : {'Content-Type':'application/json'})},
        ...(body === undefined ? {} : {body:JSON.stringify(body)})
      });
      // OSRM reports NoRoute/NoTable with HTTP 400. Read that bounded JSON so
      // unreachable remains distinguishable from a proxy/server HTTP failure.
      if (!response.ok && !(provider==='osrm' && response.status===400)) { await response.body?.cancel(); throw new EngineError('http_error',provider); }
      const reader = response.body?.getReader();
      if (!reader) throw new EngineError('invalid_response',provider);
      const chunks:Uint8Array[]=[];
      let size=0;
      for (;;) {
        const {done,value}=await reader.read();
        if (done) break;
        size+=value.length;
        if (size>this.config.maxResponseBytes) { await reader.cancel(); throw new EngineError('invalid_response',provider); }
        chunks.push(value);
      }
      let parsed:unknown;
      try { parsed=JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown; }
      catch { throw new EngineError('invalid_response',provider); }
      if(!response.ok) {
        const code=parsed && typeof parsed==='object' && 'code' in parsed ? parsed.code : undefined;
        if(code==='NoRoute') throw new EngineError('no_route',provider);
        if(code==='NoTable') throw new EngineError('no_table',provider);
        throw new EngineError('http_error',provider);
      }
      return parsed;
    } catch (error) {
      failed=true;
      if (cancel?.aborted) throw new EngineError('cancelled',provider);
      if (deadline.aborted) throw new EngineError('timeout',provider);
      if (error instanceof EngineError) throw error;
      throw new EngineError('unavailable',provider);
    } finally { this.active--;measure('engine',performance.now()-started,failed); }
  }
}
