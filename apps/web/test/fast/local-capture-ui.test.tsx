// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import Dexie from 'dexie';
import { connectedIds, installConnectedFetch } from './execution-fixture';
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
