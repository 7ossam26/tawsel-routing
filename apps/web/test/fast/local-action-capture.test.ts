import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LocalWork, scopeKey } from '../../src/local-work';
import type { components } from '@tawsel/api-client';
import { downloadedFixture, headingFixture, localIds } from './local-work-fixture';

describe('simulated IndexedDB (fake-indexeddb); real Dexie transactions', () => {
  let db: LocalWork;
  beforeEach(async () => { db = new LocalWork(`p33-test-${crypto.randomUUID()}`); await db.select(downloadedFixture().session, localIds.device); });
  afterEach(async () => { await db.delete(); });
  it('reopens the authorized started download with recipient context; other account/kind/device cannot select it', async () => {
    const downloaded = downloadedFixture(); await db.saveDownload(downloaded); db.close(); await db.open();
    expect((await db.downloaded('personal', localIds.device))?.current.targets[0]?.recipientName).toBe('عميل محفوظ');
    expect(await db.downloaded('company', localIds.device)).toBeNull(); expect(await db.downloaded('personal', crypto.randomUUID())).toBeNull();
    const other = structuredClone(downloaded.session); other.access.sourceId = crypto.randomUUID(); await db.select(other, localIds.device);
    expect(await db.downloaded('personal', localIds.device)).toBeNull();
  });
  it('refuses drafts, ended rounds, missing takeover download and stale snapshot versions', async () => {
    const value = downloadedFixture(); value.ownership.roundState = 'ended'; await expect(db.saveDownload(value)).rejects.toThrow();
    value.ownership.roundState = 'active'; value.ownership.snapshotRequired = true; await expect(db.saveDownload(value)).rejects.toThrow();
    value.ownership.snapshotRequired = false; value.current.revision = 4; await db.saveDownload(value);
    value.current.revision = 3; await expect(db.saveDownload(value)).rejects.toThrow('أقدم');
    expect((await db.downloaded('personal', localIds.device))?.current.revision).toBe(4);
  });
  it('uses collision-free full identity tuples and revokes cached access after explicit server denial', async () => {
    expect(scopeKey({ kind: 'company', tenantId: 'a:b', accountId: 'c', deviceId: 'd' })).not.toBe(scopeKey({ kind: 'company', tenantId: 'a', accountId: 'b:c', deviceId: 'd' }));
    await db.saveDownload(downloadedFixture()); await db.blockSelected(); expect(await db.downloaded('personal', localIds.device)).toBeNull();
    expect(await db.downloads.count()).toBe(1);
  });
  it('commits immutable bytes and pending projection together; saved changes never replace confirmed state', async () => {
    const download = downloadedFixture(); await db.saveDownload(download);
    const first = await db.capture(download.scope, headingFixture(), '/rounds/current?kind=personal');
    const arrival = headingFixture(); arrival.operationId = 'current.recordArrival'; arrival.payload.expectedActivityRevision = 1; arrival.payload.expectedCurrentAttemptId = localIds.attempt;
    const second = await db.capture(download.scope, arrival, '/rounds/current?kind=personal');
    expect(second.sequence).toBe(first.sequence + 1); expect(second.envelope.dependsOnActionIds).toEqual([first.actionId]);
    expect(second.envelope.baseVersions).toMatchObject({ resourceRevision: 1, sourceRevision: 1, locationRevision: 1, deviceGeneration: 1 });
    expect(second.envelope.observation).toEqual(arrival.observation);
    expect((await db.preview(download)).currentActivity?.stage).toBe('arrived');
    expect((await db.downloads.get([download.scope, download.roundId]))?.current.currentActivity).toBeNull();
    db.close(); await db.open();
    expect((await db.actions.get([download.scope, second.actionId]))?.bytes).toBe(JSON.stringify(second.envelope));
    expect((await db.pendingFor(download.scope)).map(value => value.actionId)).toEqual([first.actionId, second.actionId]);
    expect(await db.capture(download.scope, second.envelope, second.href)).toEqual(second);
    await expect(db.capture(download.scope, { ...second.envelope, payload: { ...second.envelope.payload, expectedPinRevision: 2 } }, second.href)).rejects.toThrow('مختلف');
  });
  it.each(['quota', 'abort'])('rolls back envelope, pending and counter after a %s fault between writes', async fault => {
    const download = downloadedFixture(); await db.saveDownload(download);
    function fail() { if (fault === 'quota') throw new DOMException('Injected simulated quota failure', 'QuotaExceededError'); Dexie.currentTransaction!.abort(); }
    db.pending.hook('creating', fail);
    await expect(db.capture(download.scope, headingFixture(), '/rounds/current')).rejects.toThrow();
    expect(await db.actions.count()).toBe(0); expect(await db.pending.count()).toBe(0); expect(await db.counters.count()).toBe(0);
    db.pending.hook('creating').unsubscribe(fail);
    expect((await db.capture(download.scope, headingFixture(), '/rounds/current')).sequence).toBe(1);
  });
  it('blocks deliberate switch/logout while pending and rejects foreign capture', async () => {
    const download = downloadedFixture(); await db.saveDownload(download); await db.capture(download.scope, headingFixture(), '/rounds/current');
    const other = structuredClone(download.session); other.access.sourceId = crypto.randomUUID();
    await expect(db.select(other, localIds.device)).rejects.toThrow('حساب آخر'); await expect(db.exit()).rejects.toThrow('ينتظر');
    const foreign = headingFixture(); if (foreign.context.kind === 'device') foreign.context.accountId = other.access.sourceId;
    await expect(db.capture(download.scope, foreign, '/rounds/current')).rejects.toThrow('آخر');
    expect(await db.actions.count()).toBe(1);
  });
  it('serializes competing tab captures against the durable projection, not a stale React state', async () => {
    const download = downloadedFixture(); await db.saveDownload(download); const tab = new LocalWork(db.name);
    try {
      const values = await Promise.allSettled([db.capture(download.scope, headingFixture(), '/rounds/current'), tab.capture(download.scope, headingFixture(), '/rounds/current')]);
      expect(values.filter(value => value.status === 'fulfilled')).toHaveLength(1);
      expect(await db.actions.count()).toBe(1); expect(await db.pending.count()).toBe(1);
    } finally { tab.close(); }
  });
  it('retains pending evidence when receipt storage aborts, then removes the overlay only after a confirmed covering download', async () => {
    const download = downloadedFixture(); await db.saveDownload(download); const action = await db.capture(download.scope, headingFixture(), '/rounds/current');
    const result: components['schemas']['ActionResult'] = { operationId: action.envelope.operationId, retention: 'compacted', summary: {}, receipt: { schemaVersion: '1.0.0', actionId: action.actionId, receiptId: crypto.randomUUID(), evidenceStatus: 'received', businessStatus: 'accepted', receivedAt: '2026-09-25T08:03:00Z', committedAt: '2026-09-25T08:03:01Z', resourceVersions: { resourceRevision: 1, deviceGeneration: 1 } } };
    function abortReceipt() { Dexie.currentTransaction!.abort(); }
    db.acknowledgements.hook('creating', abortReceipt);
    await expect(db.acknowledge(download.scope, result)).rejects.toThrow();
    expect(await db.pending.count()).toBe(1); expect(await db.acknowledgements.count()).toBe(0);
    db.acknowledgements.hook('creating').unsubscribe(abortReceipt);
    await db.acknowledge(download.scope, result); expect(await db.pending.count()).toBe(1);
    const confirmed = structuredClone(download); confirmed.current = await db.preview(download); confirmed.downloadedAt = '2026-09-25T08:04:00Z';
    await db.saveDownload(confirmed); expect(await db.pending.count()).toBe(0);
    expect((await db.actions.get([download.scope, action.actionId]))?.bytes).toBe(action.bytes);
    expect((await db.acknowledgements.toArray())[0]?.result.receipt.committedAt).toBe('2026-09-25T08:03:01Z');
  });
  it('does not rewrite legacy uncertain bytes or execute an unsupported stored payload version', async () => {
    const download = downloadedFixture(); await db.saveDownload(download);
    const legacy = headingFixture(); if (legacy.context.kind === 'device') legacy.context.deviceSequence = 90;
    const imported = await db.capture(download.scope, legacy, '/rounds/current', false, true);
    expect(imported.bytes).toBe(JSON.stringify(legacy));
    // Simulates an on-disk envelope written by a newer application, not API input.
    const newer = { ...legacy, payloadVersion: '2.0.0' } as unknown as typeof legacy;
    await db.actions.update([download.scope, legacy.actionId], { envelope: newer });
    await expect(db.preview(download)).rejects.toThrow('غير مدعومة');
    expect(await db.actions.count()).toBe(1); expect(await db.pending.count()).toBe(1);
  });
});
