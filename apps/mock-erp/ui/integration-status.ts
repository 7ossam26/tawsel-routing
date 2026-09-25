import type { components } from '@tawsel/api-client';
type Status = components['schemas']['ConsumerStatus'];
export type ApplicationState = 'applied' | 'received' | 'failed' | 'empty';
export function applicationState(status: Status): ApplicationState {
  const checkpoint = status.checkpoint;
  if (checkpoint.lastError) return 'failed';
  if (checkpoint.pendingCount > 0 || checkpoint.receivedHigh > checkpoint.appliedThrough) return 'received';
  if (checkpoint.appliedThrough > 0) return 'applied';
  return 'empty';
}
export const applicationCopy: Record<ApplicationState, string> = {
  applied: 'طُبق في ERP', received: 'استلمه ERP — ينتظر التطبيق', failed: 'تعذر التطبيق في ERP', empty: 'لا أحداث مستلمة'
};
