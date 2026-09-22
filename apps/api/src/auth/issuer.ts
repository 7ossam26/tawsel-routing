import * as oidc from 'openid-client';
import type { AccountKind, AuthConfig } from './config.js';

/** All destinations originate in validated server configuration, never a request. */
export class Issuers {
  private clients = new Map<AccountKind, Promise<oidc.Configuration>>();
  constructor(readonly config: AuthConfig) {}
  async client(kind: AccountKind) {
    let pending = this.clients.get(kind);
    if (!pending) {
      const entry = this.config.issuers[kind];
      pending = oidc.discovery(new URL(entry.issuer), entry.clientId, entry.clientSecret, undefined, {
        timeout: 5,
        execute: [oidc.enableNonRepudiationChecks, ...(entry.issuer.startsWith('http:') ? [oidc.allowInsecureRequests] : [])]
      });
      this.clients.set(kind, pending);
      pending.catch(() => this.clients.delete(kind));
    }
    return pending;
  }
}
