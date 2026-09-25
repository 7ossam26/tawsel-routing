import type { components } from './schema.js';
type S = components['schemas'];
export class SyncClient {
  constructor(private readonly kind: 'personal' | 'company', private readonly fetcher: typeof fetch = (...args) => globalThis.fetch(...args)) {}
  private async request(path: string, body?: unknown) {
    const headers: Record<string, string> = {};
    if (body !== undefined) {
      const bootstrap = await this.fetcher('/api/session/bootstrap', { credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(30000) });
      if (!bootstrap.ok) throw Object.assign(new Error('سجّل الدخول للحساب نفسه لإكمال المزامنة.'), { status: bootstrap.status });
      headers['X-CSRF-Token'] = (await bootstrap.json() as { csrfToken: string }).csrfToken; headers['Content-Type'] = 'application/json';
    }
    const response = await this.fetcher(path, { method: body === undefined ? 'GET' : 'POST', credentials: 'same-origin', cache: 'no-store', headers, signal: AbortSignal.timeout(30000), ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    const value = await response.json();
    if (!response.ok) throw Object.assign(new Error(value.error?.message ?? 'تعذر تأكيد المزامنة.'), { status: response.status, code: value.error?.code });
    return value;
  }
  session(): Promise<S['SessionContext']> { return this.request('/api/session/context?kind=' + this.kind); }
  submit(actions: S['ActionEnvelope'][]): Promise<S['SyncBatchResult']> { return this.request('/api/v1/sync/actions?kind=' + this.kind, { actions }); }
  conflicts(deviceId: string, afterActionId?: string): Promise<S['SyncConflicts']> { return this.request(`/api/v1/sync/conflicts?kind=${this.kind}&deviceId=${encodeURIComponent(deviceId)}${afterActionId ? '&afterActionId=' + encodeURIComponent(afterActionId) : ''}`); }
}
