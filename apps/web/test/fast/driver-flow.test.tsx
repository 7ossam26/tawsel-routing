// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DriverReviewFixture } from '../../src/fixtures/driver-review-fixture';
import { ProductionShell } from '../../src/production-shell';

beforeEach(() => window.history.replaceState({}, '', '/__fixtures/driver-review'));
afterEach(() => cleanup());

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
