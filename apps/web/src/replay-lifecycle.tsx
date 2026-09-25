import { useEffect, useState } from 'react';
import { replaySelected, replayErrorMessage } from './replay-runtime';

export function useReplayLifecycle(enabled: boolean) {
  const [message, setMessage] = useState('');
  useEffect(() => {
    if (!enabled) return;
    let disposed = false, running = false;
    const kind = new URLSearchParams(location.search).get('kind') === 'company' ? 'company' : 'personal';
    const channel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel('tawsel-replay');
    const changed = () => window.dispatchEvent(new Event('tawsel:replay-complete'));
    if (channel) channel.onmessage = changed;
    const run = async () => {
      if (running || !navigator.onLine || document.visibilityState === 'hidden') return;
      running = true;
      try {
        const result = await replaySelected(kind);
        if (!disposed && result) {
          setMessage(result.remaining ? result.message || 'يوجد عمل ينتظر المزامنة.' : result.review ? 'وصلت الإجراءات؛ بعضها يحتاج مراجعة.' : '');
          if (result.received) { changed(); channel?.postMessage('received'); }
        }
      } catch (error) { if (!disposed) setMessage(replayErrorMessage(error)); }
      finally { running = false; }
    };
    const wake = () => { void run(); };
    window.addEventListener('online', wake); window.addEventListener('pageshow', wake); window.addEventListener('focus', wake); document.addEventListener('visibilitychange', wake);
    void run();
    return () => { disposed = true; channel?.close(); window.removeEventListener('online', wake); window.removeEventListener('pageshow', wake); window.removeEventListener('focus', wake); document.removeEventListener('visibilitychange', wake); };
  }, [enabled]);
  return message;
}
