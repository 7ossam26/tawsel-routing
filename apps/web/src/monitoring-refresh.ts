import type { components } from '@tawsel/api-client';
import type { MonitoringClient, MonitoringRead } from '@tawsel/api-client/src/monitoring';

export type Snapshot = components['schemas']['MonitoringSnapshot'];
export type RefreshPhase = 'loading' | 'refreshing' | 'fresh' | 'stale' | 'error';
export type RefreshState = {
  phase: RefreshPhase;
  data: Snapshot | null;
  error: string;
  refreshedAt: string | null;
  revision: number;
  scopeKey: string | null;
  inFlight: boolean;
};
type Listener = (state: RefreshState) => void;
type Environment = Pick<Document, 'visibilityState' | 'addEventListener' | 'removeEventListener'> & {
  onlineTarget: Pick<Window, 'addEventListener' | 'removeEventListener'>;
};

/** Polls one visible view with one cancellable request and rejects late regressions. */
export class MonitoringRefreshController {
  private state: RefreshState = { phase: 'loading', data: null, error: '', refreshedAt: null, revision: 0, scopeKey: null, inFlight: false };
  private listener: Listener | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private ageTimer: ReturnType<typeof setInterval> | null = null;
  private request: AbortController | null = null;
  private epoch = 0;
  private failures = 0;
  private stopped = true;
  private lastSuccess = 0;
  private etag: string | undefined;
  private readonly visible = () => { if (this.environment.visibilityState === 'visible') void this.refresh(true); };
  private readonly online = () => { void this.refresh(true); };

  constructor(
    private readonly client: Pick<MonitoringClient, 'driver'>,
    private readonly driverId: string,
    private readonly branchId?: string,
    private readonly pollMs = 1_000,
    private readonly staleMs = 10_000,
    private readonly clock: () => number = Date.now,
    private readonly environment: Environment = { get visibilityState() { return document.visibilityState; }, addEventListener: document.addEventListener.bind(document), removeEventListener: document.removeEventListener.bind(document), onlineTarget: window }
  ) {}

  subscribe(listener: Listener) { this.listener = listener; listener(this.state); return () => { if (this.listener === listener) this.listener = null; }; }
  start() {
    if (!this.stopped) return;
    this.stopped = false;
    this.environment.addEventListener('visibilitychange', this.visible);
    this.environment.onlineTarget.addEventListener('online', this.online);
    this.ageTimer = setInterval(() => this.updateAge(), Math.min(1_000, this.staleMs));
    void this.refresh(true);
  }
  stop() {
    this.stopped = true; this.epoch++; this.request?.abort(); this.request = null;
    if (this.timer) clearTimeout(this.timer); if (this.ageTimer) clearInterval(this.ageTimer);
    this.timer = null; this.ageTimer = null;
    this.environment.removeEventListener('visibilitychange', this.visible);
    this.environment.onlineTarget.removeEventListener('online', this.online);
  }
  async refresh(full = false) {
    if (this.stopped) return;
    if (full && this.request) this.request.abort();
    else if (this.request) return;
    if (this.timer) clearTimeout(this.timer); this.timer = null;
    const epoch = ++this.epoch, request = new AbortController(); this.request = request;
    this.patch({ inFlight: true, phase: this.state.data ? 'refreshing' : 'loading', error: '' });
    try {
      const result = await this.client.driver(this.driverId, { ...(this.branchId ? { branchId: this.branchId } : {}), limit: 100, ...(full || !this.etag ? {} : { etag: this.etag }), signal: request.signal });
      if (this.stopped || epoch !== this.epoch) return;
      this.accept(result);
      this.failures = 0;
    } catch (failure) {
      if (this.stopped || epoch !== this.epoch || (failure instanceof DOMException && failure.name === 'AbortError')) return;
      this.failures++;
      const message = failure instanceof Error ? failure.message : 'تعذر جلب بيانات أحدث.';
      this.patch({ error: message, phase: this.state.data && this.clock() - this.lastSuccess >= this.staleMs ? 'stale' : 'error' });
    } finally {
      if (!this.stopped && epoch === this.epoch) {
        this.request = null; this.patch({ inFlight: false });
        const delay = this.failures ? Math.min(this.pollMs * 2 ** this.failures, 10_000) : this.pollMs;
        this.timer = setTimeout(() => void this.refresh(false), delay);
      }
    }
  }
  private accept(result: MonitoringRead<Snapshot>) {
    const sameScope = this.state.scopeKey === null || this.state.scopeKey === result.scopeKey;
    if (sameScope && result.revision < this.state.revision) return;
    if (result.status === 304 && (!this.state.data || !sameScope)) throw new Error('تعذر مطابقة النسخة المؤكدة.');
    this.lastSuccess = this.clock(); this.etag = result.etag;
    this.patch({
      data: result.status === 200 ? result.data : this.state.data,
      refreshedAt: result.refreshedAt,
      revision: result.revision,
      scopeKey: result.scopeKey,
      phase: 'fresh', error: ''
    });
  }
  private updateAge() {
    if (!this.state.data || !this.lastSuccess) return;
    const phase = this.clock() - this.lastSuccess >= this.staleMs ? 'stale' : 'fresh';
    if (phase !== this.state.phase) this.patch({ phase });
  }
  private patch(change: Partial<RefreshState>) { this.state = { ...this.state, ...change }; this.listener?.(this.state); }
}
