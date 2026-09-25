import { connectedIds, installConnectedFetch } from './execution-fixture';
import { localWork } from '../../src/local-work';
// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DriverReviewFixture } from '../../src/fixtures/driver-review-fixture';
import { ProductionShell } from '../../src/production-shell';

beforeEach(() => window.history.replaceState({}, '', '/__fixtures/driver-review'));
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('representative driver fixture', () => {
  it('makes start dominant for ready daily work and keeps readiness visible', () => {
    render(<DriverReviewFixture />);
    expect(screen.getByRole('heading', { name: 'مهامك جاهزة' })).toBeTruthy();
    expect(screen.getByText(/الموقع والبداية والخطة مؤكدة/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'ابدأ الجولة' })).toBeTruthy();
    expect(screen.getAllByRole('button').filter((button) => button.classList.contains('action-button--primary'))).toHaveLength(1);
  });

  it('keeps heading, arrival, and outcome as separate explicit transitions', async () => {
    const user = userEvent.setup();
    render(<DriverReviewFixture />);
    await user.click(screen.getByRole('button', { name: 'ابدأ الجولة' }));
    expect(screen.getByRole('button', { name: 'اتجه للعميل' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'اتجه للعميل' }));
    expect(screen.getByRole('button', { name: 'وصلت' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'سجّل النتيجة' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'وصلت' }));
    expect(screen.getByRole('button', { name: 'سجّل النتيجة' })).toBeTruthy();
  });

  it('cancels without committing and restores the outcome draft and focus', async () => {
    const user = userEvent.setup();
    render(<DriverReviewFixture />);
    await user.click(screen.getByRole('button', { name: 'ابدأ الجولة' }));
    await user.click(screen.getByRole('button', { name: 'اتجه للعميل' }));
    await user.click(screen.getByRole('button', { name: 'وصلت' }));
    const trigger = screen.getByRole('button', { name: 'سجّل النتيجة' });
    await user.click(trigger);
    await user.click(screen.getByRole('radio', { name: 'رفض الاستلام' }));
    await user.click(screen.getByRole('button', { name: 'إلغاء' }));
    expect(screen.queryByText(/تم تأكيد النتيجة/)).toBeNull();
    expect(document.activeElement).toBe(trigger);
    await user.click(trigger);
    expect((screen.getByRole('radio', { name: 'رفض الاستلام' }) as HTMLInputElement).checked).toBe(true);
  });

  it('shows missing pin recovery and blocks a misleading start', async () => {
    const user = userEvent.setup();
    render(<DriverReviewFixture />);
    await user.selectOptions(screen.getByLabelText('الحالة'), 'missing-pin');
    expect(screen.getByRole('button', { name: 'حدّد الموقع' })).toBeTruthy();
    expect(screen.getByText(/المهمة الأخرى الصالحة/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'ابدأ الجولة' })).toBeNull();
  });

  it('shows existing ownership without a second-start control', async () => {
    const user = userEvent.setup();
    render(<DriverReviewFixture />);
    await user.selectOptions(screen.getByLabelText('الحالة'), 'another-device');
    expect(screen.getByText('الجولة تعمل على هاتف آخر')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'انقل التنفيذ لهذا الهاتف' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'ابدأ الجولة' })).toBeNull();
  });

  it.each([
    ['pending', 'محفوظ على الهاتف', /ليست نتيجة مؤكدة/],
    ['rejected', 'لم تُقبل النتيجة', /المسودة محفوظة/]
  ])('keeps %s distinct from accepted success', async (scenario, title, explanation) => {
    const user = userEvent.setup();
    render(<DriverReviewFixture />);
    await user.selectOptions(screen.getByLabelText('الحالة'), scenario);
    expect(screen.getByText(title)).toBeTruthy();
    expect(screen.getByText(explanation)).toBeTruthy();
    expect(screen.queryByText(/تم تأكيد النتيجة/)).toBeNull();
  });

  it('offers all developer states without network toggles', () => {
    render(<DriverReviewFixture />);
    const options = screen.getAllByRole('option').map((option) => option.textContent);
    expect(options).toEqual(expect.arrayContaining(['تحميل', 'فارغ', 'دبوس ناقص', 'هاتف آخر', 'اختيار جزئي', 'قيد المزامنة', 'مرفوض']));
    expect(screen.queryByText(/نجاح الشبكة|فشل الشبكة/)).toBeNull();
  });

  it('shows exact whole-piece partial selection without committing an outcome', async () => {
    const user = userEvent.setup();
    render(<DriverReviewFixture />);
    await user.selectOptions(screen.getByLabelText('الحالة'), 'partial');
    expect(screen.getByText('قطعتان من ٣ · المطلوب ٢٥٠ ج.م')).toBeTruthy();
    expect(screen.getByText(/قطعة واحدة ما زالت معك/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'حفظ النتيجة' })).toBeNull();
  });

  it('keeps production shell free of fixture navigation and data', () => {
    cleanup();
    render(<ProductionShell />);
    expect(screen.queryByText('عرض مطوّر ببيانات ثابتة')).toBeNull();
    expect(screen.queryByText('ابدأ الجولة')).toBeNull();
    expect(document.querySelector('a[href*="__fixtures"]')).toBeNull();
  });
});

describe('connected ordinary delivery flow', () => {
  beforeEach(() => { window.history.replaceState({}, '', '/rounds/current?kind=company'); sessionStorage.clear(); localStorage.clear(); localStorage.setItem('tawsel:device-id', connectedIds.device); Object.defineProperty(globalThis.crypto, 'randomUUID', { configurable: true, value: vi.fn(() => connectedIds.action) }); });

  it('keeps one dominant full action while exceptions and scheduling stay in discoverable context', async () => {
    installConnectedFetch(); const user = userEvent.setup(); render(<ProductionShell />);
    await screen.findByRole('button', { name: /تأكيد التسليم وتحصيل/ });
    expect(screen.getAllByRole('button').filter(button => button.classList.contains('action-button--primary'))).toHaveLength(1);
    expect(screen.getByText('خيارات المهمة').closest('details')!.open).toBe(false);
    await user.click(screen.getByText('خيارات المهمة'));
    expect(screen.getByRole('button', { name: 'تسليم بعض القطع' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'التأجيل والأولوية والسجل' }).getAttribute('href')).toContain(`taskId=${connectedIds.task}`);
    expect(screen.getAllByRole('button').filter(button => button.classList.contains('action-button--primary'))).toHaveLength(1);
  });

  it('disables task selection while an outcome is uncertain, keeping its target bound', async () => {
    installConnectedFetch({ loseFirstOutcome: true }); const user = userEvent.setup(); render(<ProductionShell />);
    await user.click(await screen.findByRole('button', { name: /تأكيد التسليم وتحصيل/ }));
    await screen.findByText('إجراء ينتظر التأكيد');
    const list = screen.getByRole('list', { name: 'قائمة المحطات المتاحة' });
    expect(list.querySelector('button')).toBeNull();
    expect(screen.queryByRole('button', { name: 'تسليم بعض القطع' })).toBeNull();
    expect((await localWork.actions.toArray())[0]?.envelope.resources.taskId).toBe(connectedIds.task);
  });

  it('uses the server amount in one full delivery-plus-collection command', async () => {
    const posts = installConnectedFetch(); const user = userEvent.setup(); render(<ProductionShell />);
    expect((await screen.findAllByText(/٣٥٠٫٠٠/)).length).toBeGreaterThan(0);
    await user.click(screen.getByRole('button', { name: /تأكيد التسليم وتحصيل/ }));
    await waitFor(() => expect(posts).toHaveLength(1));
    expect(posts[0]!.body).toMatchObject({ operationId: 'outcome.recordFull', actionId: connectedIds.action, payload: { taskId: connectedIds.task, attemptId: connectedIds.attempt, reportedCollection: { amountMinor: 35000 } } });
    expect(await screen.findByText(/تم تأكيد التسليم والتحصيل من الخادم/)).toBeTruthy();
  });

  it('records no-answer before arrival without an arrival, fee-refusal or call-count field', async () => {
    const posts = installConnectedFetch({ stage: 'heading' }); const user = userEvent.setup(); render(<ProductionShell />);
    await user.click(await screen.findByRole('button', { name: 'لم يرد العميل' }));
    await waitFor(() => expect(posts).toHaveLength(1));
    expect(posts[0]!.url).toContain('/outcomes/no-answer');
    expect(posts[0]!.body).toMatchObject({ operationId: 'outcome.recordNoAnswer', payload: { expectedCurrentAttemptId: connectedIds.attempt } });
    expect(JSON.stringify(posts[0]!.body)).not.toMatch(/arrival|shippingPayment|callCount|reportedCollection/);
  });

  it('retains the exact action and payload after a lost accepted response', async () => {
    const posts = installConnectedFetch({ loseFirstOutcome: true }); const user = userEvent.setup(); render(<ProductionShell />);
    await user.click(await screen.findByRole('button', { name: /تأكيد التسليم وتحصيل/ }));
    expect(await screen.findByText('إجراء ينتظر التأكيد')).toBeTruthy();
    expect((await localWork.actions.toArray())[0]?.actionId).toBe(connectedIds.action);
    expect((await localWork.pending.toArray())[0]?.actionId).toBe(connectedIds.action);
    await user.click(screen.getByRole('button', { name: 'تحقّق وأعد إرسال الطلب نفسه' }));
    await waitFor(() => expect(posts).toHaveLength(2));
    expect(posts[1]).toEqual(posts[0]);
  });

  it('keeps external handlers as links with feedback and zero business POSTs', async () => {
    const posts = installConnectedFetch(); const user = userEvent.setup(); render(<ProductionShell />);
    const call = await screen.findByRole('link', { name: /اتصال بـ/ }); call.addEventListener('click', event => event.preventDefault());
    await user.click(call);
    expect(await screen.findByText(/لم نسجّل اتجاهًا أو وصولًا أو نجاح تواصل/)).toBeTruthy(); expect(posts).toEqual([]);
  });

  it('shows ownership denial as failure and never as successful continuation', async () => {
    const other = '29000000-0000-4000-8000-000000000099'; installConnectedFetch({ ownerDevice: other, rejectTakeover: true }); const user = userEvent.setup(); render(<ProductionShell />);
    await user.click(await screen.findByRole('button', { name: 'انقل التنفيذ لهذا الهاتف' }));
    expect(await screen.findByText('انتقلت الملكية لهاتف آخر')).toBeTruthy();
    expect(screen.queryByText(/اكتمل نقل التنفيذ/)).toBeNull();
    expect((screen.getByRole('button', { name: /تأكيد التسليم وتحصيل/ }) as HTMLButtonElement).disabled).toBe(true);
  });
});
