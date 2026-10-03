// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import Dexie from 'dexie';
import { connectedIds, installConnectedFetch, receiptFixture } from './execution-fixture';
import { CurrentActivityPage } from '../../src/current-activity';
import { AccountShell } from '../../src/account-shell';
import { localWork } from '../../src/local-work';

beforeEach(() => { window.history.replaceState({}, '', '/rounds/current?kind=company'); localStorage.clear(); sessionStorage.clear(); localStorage.setItem('tawsel:device-id', connectedIds.device); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
it.each(['quota', 'abort'])('retains unsaved partial quantities and sends no command when %s prevents the atomic commit', async fault => {
  const posts = installConnectedFetch(), user = userEvent.setup(); render(<CurrentActivityPage />);
  await user.click(await screen.findByText('خيارات المهمة')); await user.click(screen.getByRole('button', { name: 'تسليم بعض القطع' }));
  const input = screen.getByLabelText('القطع المسلّمة — قميص'); await user.clear(input); await user.type(input, '2');
  function fail() { if (fault === 'quota') throw new DOMException('quota fixture', 'QuotaExceededError'); Dexie.currentTransaction!.abort(); }
  localWork.pending.hook('creating', fail);
  try {
    await user.click(screen.getByRole('button', { name: 'تأكيد النتيجة والتحصيل' }));
    await screen.findByText(/لم يُحفظ على الهاتف/);
    expect((input as HTMLInputElement).value).toBe('2'); expect(posts).toHaveLength(0);
    expect(await localWork.actions.count()).toBe(0); expect(await localWork.pending.count()).toBe(0);
    expect(screen.queryByText('محفوظ على الهاتف')).toBeNull(); expect(screen.queryByText('تأكيد من الخادم')).toBeNull();
  } finally { localWork.pending.hook('creating').unsubscribe(fail); }
});
it('continues arrival and full delivery offline across UI reopen while keeping last confirmed progress, and guards logout', async () => {
  const posts = installConnectedFetch({ stage: 'heading' }), user = userEvent.setup(); const view = render(<CurrentActivityPage />);
  await screen.findByRole('button', { name: 'وصلت' });
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false); fireEvent(window, new Event('offline'));
  await user.click(screen.getByRole('button', { name: 'وصلت' })); await screen.findByText('محفوظ على الهاتف');
  await user.click(await screen.findByRole('button', { name: /تأكيد التسليم وتحصيل/ }));
  await waitFor(async () => expect(await localWork.pending.count()).toBe(2));
  expect(posts).toHaveLength(0); expect(screen.queryByText('تأكيد من الخادم')).toBeNull();
  const download = (await localWork.downloads.toArray())[0]!; expect(download.current.currentActivity?.stage).toBe('heading'); expect(download.outcomes.progress.processed).toBe(0);
  view.unmount(); sessionStorage.clear(); render(<CurrentActivityPage />);
  await screen.findByText('محفوظ على الهاتف'); expect(screen.queryByRole('button', { name: /تأكيد التسليم/ })).toBeNull();
  cleanup(); window.history.replaceState({}, '', '/account?kind=company'); render(<AccountShell />);
  await user.click(await screen.findByRole('button', { name: 'تسجيل الخروج' }));
  expect(await screen.findByText(/يوجد عمل محفوظ على الهاتف ينتظر المزامنة/)).toBeTruthy();
  expect(await localWork.pending.count()).toBe(2);
});
it('commits the exact envelope and pending row before the online client sends it', async () => {
  installConnectedFetch(); const original = vi.mocked(fetch).getMockImplementation()!; let checked = false;
  vi.mocked(fetch).mockImplementation(async (input, init) => {
    if (String(input).includes('/outcomes/full')) {
      const body = JSON.parse(String(init?.body)), saved = (await localWork.actions.toArray())[0];
      expect(saved?.bytes).toBe(JSON.stringify(body)); expect(await localWork.pending.count()).toBe(1); checked = true;
    }
    return original(input, init);
  });
  const user = userEvent.setup(); render(<CurrentActivityPage />);
  await user.click(await screen.findByRole('button', { name: /تأكيد التسليم وتحصيل/ }));
  await screen.findByText(/تم تأكيد التسليم والتحصيل من الخادم/); expect(checked).toBe(true);
});

it('stops an initial load before account selection when its response arrives after unmount', async () => {
  installConnectedFetch(); const original = vi.mocked(fetch).getMockImplementation()!;
  let complete!: (response: Response) => void;
  const response = new Promise<Response>(resolve => { complete = resolve; });
  vi.mocked(fetch).mockImplementation((input, init) => String(input).includes('/api/session/context') ? response : original(input, init));
  const select = vi.spyOn(localWork, 'select'), view = render(<CurrentActivityPage />);
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1)); view.unmount();
  await act(async () => { complete(await original('/api/session/context?kind=company')); });
  expect(select).not.toHaveBeenCalled(); expect(fetch).toHaveBeenCalledTimes(1);
});

it('keeps a late server receipt durable after unmount without refreshing the closed view', async () => {
  installConnectedFetch(); const original = vi.mocked(fetch).getMockImplementation()!;
  let complete!: (response: Response) => void, sent: Parameters<typeof receiptFixture>[0] | undefined;
  const response = new Promise<Response>(resolve => { complete = resolve; });
  vi.mocked(fetch).mockImplementation((input, init) => {
    if (String(input).includes('/outcomes/full')) { sent = JSON.parse(String(init?.body)) as Parameters<typeof receiptFixture>[0]; return response; }
    return original(input, init);
  });
  const acknowledge = vi.spyOn(localWork, 'acknowledge'), user = userEvent.setup(), view = render(<CurrentActivityPage />);
  await user.click(await screen.findByRole('button', { name: /تأكيد التسليم وتحصيل/ }));
  await waitFor(() => expect(sent).toBeDefined());
  const saved = (await localWork.actions.toArray())[0]!, requests = vi.mocked(fetch).mock.calls.length;
  expect(saved.bytes).toBe(JSON.stringify(sent)); expect(await localWork.pending.count()).toBe(1);
  view.unmount();
  await act(async () => {
    complete(new Response(JSON.stringify(receiptFixture(sent!)), { headers: { 'Content-Type': 'application/json' } }));
    await waitFor(() => expect(acknowledge).toHaveBeenCalledTimes(1));
    await acknowledge.mock.results[0]!.value;
  });
  expect(fetch).toHaveBeenCalledTimes(requests);
  expect((await localWork.actions.get([saved.scope, saved.actionId]))?.bytes).toBe(saved.bytes);
  expect((await localWork.acknowledgements.get([saved.scope, saved.actionId]))?.result.receipt).toMatchObject({ actionId: sent!.actionId, businessStatus: 'accepted' });
  // Until another mounted view downloads the authoritative revision, preserve the overlay.
  expect(await localWork.pending.count()).toBe(1);
});
