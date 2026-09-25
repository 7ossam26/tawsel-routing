// Component suites use simulated browser storage. Real Chromium/PWA evidence
// lives in tests/offline-browser and never imports this fixture.
import { indexedDB, IDBKeyRange } from 'fake-indexeddb';
if (typeof window !== 'undefined') {
  Object.assign(globalThis, { indexedDB, IDBKeyRange });
  Object.assign(window, { indexedDB, IDBKeyRange });
}
