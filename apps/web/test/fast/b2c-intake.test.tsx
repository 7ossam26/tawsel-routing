// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProductionShell } from '../../src/production-shell';

const context = { kind: 'personal', access: { tenantId: '90000000-0000-4000-8000-000000000002', tenantKind: 'personal', principalKind: 'account', sourceId: '90000000-0000-4000-8000-000000000003', branchIds: [], driverId: '90000000-0000-4000-8000-000000000006', effectiveCapabilities: ['execution.own'] }, expiresAt: '2026-09-23T00:00:00Z', recoveryEmailVerified: true, loginIdentifier: '+201012345678', phoneOwnershipVerified: false };
const response = (data: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } }));

beforeEach(() => {
  window.history.replaceState({}, '', '/tasks/new');
  sessionStorage.clear(); localStorage.clear();
  Object.defineProperty(globalThis.crypto, 'randomUUID', { configurable: true, value: vi.fn(() => '90000000-0000-4000-8000-000000000099') });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('independent intake client fixture', () => {
  it('keeps missing required errors beside essential fields without sending a command', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockImplementation((input) => String(input).includes('/context') ? response(context) : response({ items: [] }));
    render(<ProductionShell />);
    await screen.findByRole('heading', { name: 'أضف بيانات التوصيل' });
    await userEvent.click(screen.getByRole('button', { name: 'حفظ المهمة' }));
    expect(screen.getByText('اسم المستلم مطلوب.')).toBeTruthy();
    expect(screen.getByText('رقم الهاتف مطلوب.')).toBeTruthy();
    expect(screen.getByText('العنوان مطلوب حتى يمكن حفظ المهمة.')).toBeTruthy();
    // The account boundary also revalidates context. Missing required fields
    // must prevent every write, regardless of the number of safe read requests.
    expect(fetch.mock.calls.filter(([, init]) => init?.method === 'POST')).toHaveLength(0);
  });

  it('retains input across a lost response, retry and list/back navigation while reusing the action ID', async () => {
    const commands: Record<string, unknown>[] = [];
    let attempts = 0;
    vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
      const url = String(input);
      if (url.includes('/context')) return response(context);
      if (url.includes('/tasks?')) return response({ items: [] });
      if (url.includes('/bootstrap')) return response({ csrfToken: 'csrf' });
      if (url.endsWith('/independent/tasks') && init?.method === 'POST') {
        commands.push(JSON.parse(String(init.body))); attempts += 1;
        if (attempts === 1) return Promise.reject(new Error('lost response'));
        return response({ receipt: { businessStatus: 'accepted' }, response: { status: 201, body: {} } }, 201);
      }
      throw new Error(`Unexpected ${url}`);
    });
    const user = userEvent.setup(); render(<ProductionShell />);
    await screen.findByRole('heading', { name: 'أضف بيانات التوصيل' });
    await user.type(screen.getByLabelText('اسم المستلم (مطلوب)'), 'منى أحمد');
    await user.type(screen.getByLabelText('رقم الهاتف (مطلوب)'), '01012345678');
    await user.type(screen.getByLabelText('العنوان المكتوب (مطلوب)'), '١٢ شارع التحرير');
    await user.click(screen.getByRole('button', { name: 'حفظ المهمة' }));
    await screen.findByText(/المدخلات ما زالت محفوظة/);
    expect((screen.getByLabelText('اسم المستلم (مطلوب)') as HTMLInputElement).value).toBe('منى أحمد');
    await user.click(screen.getByRole('button', { name: 'الرجوع بدون حذف المدخلات' }));
    await user.click(screen.getByRole('button', { name: 'إضافة مهمة' }));
    expect((screen.getByLabelText('العنوان المكتوب (مطلوب)') as HTMLTextAreaElement).value).toBe('١٢ شارع التحرير');
    await user.click(screen.getByRole('button', { name: 'حفظ المهمة' }));
    await waitFor(() => expect(commands).toHaveLength(2));
    expect(commands[1]).toEqual(commands[0]);
  });

  it('shows a saved API task after reload and clearly labels unresolved location before edit', async () => {
    const tasks: Record<string, unknown>[] = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
      const url = String(input);
      if (url.includes('/context')) return response(context);
      if (url.includes('/tasks?')) return response({ items: tasks });
      if (url.includes('/bootstrap')) return response({ csrfToken: 'csrf' });
      if (url.endsWith('/independent/tasks') && init?.method === 'POST') {
        const body = JSON.parse(String(init.body));
        const task = { taskId: '90000000-0000-4000-8000-000000000005', revision: 1, ...body.payload,
          locationReadiness: 'needs-resolution', executionReady: false, editable: true,
          createdAt: '2026-09-22T20:00:00Z', updatedAt: '2026-09-22T20:00:00Z' };
        tasks.push(task); return response({ receipt: { businessStatus: 'accepted' }, response: { status: 201, body: { task } } }, 201);
      }
      throw new Error(`Unexpected ${url}`);
    });
    const user = userEvent.setup(); render(<ProductionShell />);
    await screen.findByRole('heading', { name: 'أضف بيانات التوصيل' });
    await user.type(screen.getByLabelText('اسم المستلم (مطلوب)'), 'سارة علي');
    await user.type(screen.getByLabelText('رقم الهاتف (مطلوب)'), '01112345678');
    await user.type(screen.getByLabelText('العنوان المكتوب (مطلوب)'), '٥ شارع النيل');
    await user.click(screen.getByRole('button', { name: 'حفظ المهمة' }));
    await screen.findByText('سارة علي');
    expect(screen.getByText('الموقع يحتاج تحديد')).toBeTruthy();
    expect(screen.getByText(/لن يصبح وقفة قابلة للتنفيذ/)).toBeTruthy();
    cleanup(); render(<ProductionShell />);
    expect(await screen.findByText('سارة علي')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'تصحيح البيانات' }));
    expect((screen.getByLabelText('اسم المستلم (مطلوب)') as HTMLInputElement).value).toBe('سارة علي');
  });
});
