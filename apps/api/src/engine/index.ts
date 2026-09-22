import { loadEngineConfig, validateConfig, type EngineConfig } from './config.js';
import { EngineTransport } from './transport.js';
import { optimizationRequest, osrmUrl } from './requests.js';
import { optimizationResponse, routeResponse, tableResponse } from './responses.js';
import { EngineError, type OptimizationInput, type RouteInput, type TableInput } from './models.js';

/** No DB handle or domain writes. Call after committing intake and releasing transactions.
 * Reuse this instance for the worker concurrency bound. P13 owns jobs/fingerprints;
 * P14 owns urgent-group policy, stitching and complete-route validation. */
export class RoutingEngine {
  private readonly config:EngineConfig;
  private readonly transport:EngineTransport;
  constructor(config:EngineConfig=loadEngineConfig()) {
    this.config=validateConfig(config);this.transport=new EngineTransport(this.config);
  }
  private normalize<T>(provider:'osrm'|'vroom',parse:()=>T):T {
    try {return parse();}catch(error){if(error instanceof EngineError)throw new EngineError(error.code,provider);throw error;}
  }
  async route(value:RouteInput,signal?:AbortSignal) {
    const input=structuredClone(value),url=osrmUrl(this.config,'route',input);
    const raw=await this.transport.json('osrm',url,undefined,signal);
    return this.normalize('osrm',()=>routeResponse(input,raw));
  }
  async table(value:TableInput,signal?:AbortSignal) {
    const input=structuredClone(value),url=osrmUrl(this.config,'table',input);
    const raw=await this.transport.json('osrm',url,undefined,signal);
    return this.normalize('osrm',()=>tableResponse(input,raw));
  }
  async optimize(value:OptimizationInput,signal?:AbortSignal) {
    const input=structuredClone(value),{payload}=optimizationRequest(input);
    const raw=await this.transport.json('vroom',new URL(this.config.vroom),payload,signal);
    return this.normalize('vroom',()=>optimizationResponse(input,raw));
  }
}
export { EngineError } from './models.js';
export type { OptimizationInput, OptimizationResult, RouteInput, RouteResult, TableInput, TableResult } from './models.js';
