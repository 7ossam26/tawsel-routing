import { useEffect, useState } from 'react';
import { ActionButton, FocusedOverlay, StatusNotice } from './components/ui';
import { proposedResult, ResultFields, type Delivery, type Replacement, type ResultDraft } from './execution-result';

export function ExceptionEditor({ mode, delivery, draftKey, disabled, busy, error, pending, onClose, onSave }: { mode: 'partial' | 'refused'; delivery: Delivery; draftKey: string; disabled: boolean; busy: boolean; error: string; pending: boolean; onClose: () => void; onSave: (result: Replacement) => void }) {
  const [draft, setDraft] = useState<ResultDraft>(() => { try { return JSON.parse(sessionStorage.getItem(draftKey) ?? 'null') ?? { outcome: mode, quantities: {}, unpaid: false }; } catch { return { outcome: mode, quantities: {}, unpaid: false }; } });
  useEffect(() => { document.getElementById('exception-heading')?.focus(); }, []);
  const [draftError, setDraftError] = useState('');
  useEffect(() => { try { sessionStorage.setItem(draftKey, JSON.stringify(draft)); setDraftError(''); } catch { setDraftError('تعذر الاحتفاظ بالمسودة بعد الإغلاق؛ المدخلات ما زالت أمامك.'); } }, [draft, draftKey]);
  const title = mode === 'partial' ? 'اختيار القطع المسلّمة' : 'رفض الاستلام';
  const preview = proposedResult(delivery, draft);
  const body = <>{error || draftError ? <StatusNotice tone="error" title="لم تُقبل النتيجة؛ المدخلات أمامك">{error || draftError}</StatusNotice> : null}{pending ? <StatusNotice tone="waiting" title="الطلب ينتظر التأكيد">ارجع للجولة للتحقق من الطلب نفسه؛ لا تسجّل نتيجة جديدة.</StatusNotice> : null}<ResultFields delivery={delivery} draft={draft} onChange={setDraft} /></>;
  const footer = <><ActionButton variant="quiet" disabled={busy} onClick={onClose}>إلغاء</ActionButton><ActionButton disabled={disabled || !preview.replacement} busy={busy} onClick={() => { if (preview.replacement) onSave(preview.replacement); }}>تأكيد النتيجة والتحصيل</ActionButton></>;
  if (mode === 'refused') return <FocusedOverlay open onOpenChange={open => { if (!open && !busy) onClose(); }} title={title} description="راجع النتيجة ثم أكّدها مرة واحدة. الإلغاء يحتفظ بالاختيار دون حفظ نتيجة." footer={footer} returnFocusId="task-options">{body}</FocusedOverlay>;
  return <main className="tasks-shell exception-page" dir="rtl"><h1 id="exception-heading" tabIndex={-1}>{title}</h1><p>اختر قطعًا كاملة. المبلغ من بيانات المصدر الثابتة.</p>{body}<div className="exception-footer">{footer}</div></main>;
}
