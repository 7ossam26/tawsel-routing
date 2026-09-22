import { randomUUID } from 'node:crypto';
import type { components } from '@tawsel/api-client';
export type Candidate = components['schemas']['LocationCandidate'];
export class LocationError extends Error {
  constructor(readonly code: string, readonly statusCode: number, message: string) { super(message); }
}
export interface GeocoderOptions { baseUrl?: string; timeoutMs?: number; cacheEntries?: number; ttlMs?: number; fetcher?: typeof fetch }
/** Private configured origin only, no user-supplied URLs or redirects. Candidate
 * tokens are scoped to tenant/account/task/source revision and expire with cache. */
export class Nominatim {
  private cache = new Map<string, { expires: number; items: Candidate[] }>();
  private pending = 0;
  constructor(private options: GeocoderOptions = {}) {
    const url = new URL(options.baseUrl ?? process.env.TAWSEL_NOMINATIM_URL ?? 'http://127.0.0.1:8080');
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.hostname === 'nominatim.openstreetmap.org') throw new Error('Configure a private Nominatim origin');
    this.base = url;
  }
  private base: URL;
  private prune() { for (const [key,value] of this.cache) if(value.expires<=Date.now()) this.cache.delete(key); }
  candidate(scope: string, id: string): Candidate {
    this.prune();
    for(const [key,value] of this.cache) if(key.startsWith(scope+'\n')) {
      const item=value.items.find(c=>c.id===id); if(item) return structuredClone(item);
    }
    throw new LocationError('stale_revision',409,'انتهت صلاحية نتيجة البحث؛ ابحث مجددًا أو حدّد الموقع يدويًا.');
  }
  async search(scope: string, query: string): Promise<Candidate[]> {
    if(typeof query!=='string' || query.trim().length<2 || query.length>200 || /https?:\/\//i.test(query)) throw new LocationError('validation_failed',400,'اكتب عنوانًا من حرفين إلى ٢٠٠ حرف.');
    this.prune(); const key=scope+'\n'+query.trim(); const cached=this.cache.get(key);
    if(cached) return structuredClone(cached.items);
    if(this.pending>=8) throw new LocationError('dependency_unavailable',503,'البحث مشغول؛ حاول مجددًا أو حدّد الموقع يدويًا.');
    this.pending++;
    try {
      const url=new URL('search',this.base);
      url.search=new URLSearchParams({q:query.trim(),format:'jsonv2',countrycodes:'eg',viewbox:'24.7,31.8,36.9,21.7',bounded:'1',limit:'5',addressdetails:'1','accept-language':'ar,en'}).toString();
      const response=await (this.options.fetcher??fetch)(url,{signal:AbortSignal.timeout(this.options.timeoutMs??4000),redirect:'error',headers:{Accept:'application/json','User-Agent':'Tawsel-private-location/1.0'}});
      if(!response.ok) throw new Error('provider');
      // Bound response memory even if the private provider is misconfigured.
      const reader=response.body?.getReader(); if(!reader) throw new Error('body');
      const chunks: Uint8Array[]=[]; let size=0;
      for(;;) {const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>262144){await reader.cancel();throw new Error('oversize');}chunks.push(value);}
      const raw: unknown=JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if(!Array.isArray(raw) || raw.length>5) throw new Error('shape');
      const items: Candidate[]=raw.map((r: Record<string,unknown>)=>{
        const latitude=Number(r.lat),longitude=Number(r.lon);
        if(!Number.isFinite(latitude)||!Number.isFinite(longitude)||latitude<21.7||latitude>31.8||longitude<24.7||longitude>36.9||typeof r.display_name!=='string'||!r.display_name||r.display_name.length>500)throw new Error('coordinates');
        return {id:randomUUID(),label:r.display_name,type:String(r.addresstype??r.type??'place').slice(0,100),source:'nominatim',coordinates:{latitude,longitude}};
      });
      while(this.cache.size>=(this.options.cacheEntries??128)) this.cache.delete(this.cache.keys().next().value!);
      this.cache.set(key,{expires:Date.now()+(this.options.ttlMs??300000),items}); return structuredClone(items);
    } catch { throw new LocationError('dependency_unavailable',503,'تعذر البحث عن العنوان. يمكنك المحاولة مجددًا أو تحديد الموقع يدويًا.'); }
    finally {this.pending--;}
  }
}
