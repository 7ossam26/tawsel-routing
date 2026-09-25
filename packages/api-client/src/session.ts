import type { components } from './schema.js';
type S = components['schemas'];

/** Cookie/CSRF session adapter. An expected account only restricts a subsequent
 * verified OIDC callback; it never authenticates or authorizes the caller. */
export class SessionClient {
  constructor(private readonly fetcher: typeof fetch = (...args) => globalThis.fetch(...args)) {}
  async request(path: string, body?: object) {
    const headers: Record<string, string> = {};
    if (body) {
      const start = await this.request('/api/session/bootstrap') as S['BootstrapResponse'];
      headers['X-CSRF-Token'] = start.csrfToken; headers['Content-Type'] = 'application/json';
    }
    const response = await this.fetcher(path, { credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(30000), headers, ...(body ? { method: 'POST', body: JSON.stringify(body) } : {}) });
    if (response.status === 204) return null;
    const value = await response.json();
    if (!response.ok) throw Object.assign(new Error(value.error?.message ?? 'تعذر الاتصال؛ البيانات المحلية محفوظة.'), { code: value.error?.code, status: response.status });
    return value;
  }
  context(kind: S['AccountKind']): Promise<S['SessionContext']> { return this.request('/api/session/context?kind=' + kind); }
  begin(input: S['LoginRequest'], intent: 'login' | 'recover' | 'register' = 'login'): Promise<S['RedirectResponse']> { return this.request('/api/session/' + intent, input); }
  logout(kind: S['AccountKind']): Promise<null> { return this.request('/api/session/logout', { kind }); }
}
