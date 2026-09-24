import type { components } from '@tawsel/api-client';
import { Field } from './components/ui';

export type Delivery = components['schemas']['CurrentTarget']['delivery'];
export type Replacement = components['schemas']['CorrectionReplacement'];
export type ResultDraft = { outcome: Replacement['outcome']; quantities: Record<string, string>; unpaid: boolean };
export const resultNames = { full: 'تسليم كامل', partial: 'تسليم جزئي', refused: 'رفض الاستلام', 'no-answer': 'لم يرد العميل' };
export const amountLabel = (amount: { amountMinor: number } | null) => amount ? new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP' }).format(amount.amountMinor / 100) : 'بدون تحصيل';
const money = (amountMinor: number) => ({ amountMinor, currency: 'EGP' as const, exponent: 2 as const });

/** Preview uses only the server's frozen integer allocation. The command API
 * validates the same quantities, permissions and exact amount under its locks. */
export function proposedResult(delivery: Delivery, draft: ResultDraft): { replacement?: Replacement; error?: string; remainder: number; amount: number | null } {
  const lines = delivery.lines ?? [], remainder = lines.reduce((n, l) => n + l.quantity, 0);
  const action = draft.outcome === 'refused' ? 'refusal' : draft.outcome;
  if (!delivery.allowedActions.includes(action)) return { error: 'هذه النتيجة غير متاحة في بيانات المصدر الحالية.', remainder: 0, amount: null };
  if (draft.outcome === 'no-answer') return { replacement: { outcome: 'no-answer' }, remainder, amount: null };
  if (draft.outcome === 'full') return { replacement: { outcome: 'full', ...(delivery.fullCollection ? { reportedCollection: delivery.fullCollection } : {}) }, remainder: 0, amount: delivery.fullCollection?.amountMinor ?? null };
  if (draft.outcome === 'refused') {
    if (delivery.kind === 'personal') return { replacement: { outcome: 'refused' }, remainder: 0, amount: null };
    const amount = draft.unpaid ? 0 : delivery.shippingDue!.amountMinor;
    if (draft.unpaid && !delivery.shippingDue?.amountMinor) return { error: 'لا توجد رسوم شحن مستحقة لرفض دفعها.', remainder, amount: null };
    return { replacement: { outcome: 'refused', shippingPayment: draft.unpaid ? 'refused' : 'collected', reportedCollection: money(amount) }, remainder, amount };
  }
  if (!lines.length) return { error: 'بنود الشحنة غير محمّلة؛ عد للجولة وحدّث بيانات المهمة.', remainder: 0, amount: null };
  let count = 0, due = BigInt(delivery.shippingDue?.amountMinor ?? 0);
  const pieces = lines.map(line => ({ sourceLineId: line.sourceLineId, delivered: Number(draft.quantities[line.sourceLineId] ?? 0) }));
  if (pieces.some((p, i) => !/^\d+$/.test(draft.quantities[p.sourceLineId] ?? '0') || !Number.isSafeInteger(p.delivered) || p.delivered > lines[i]!.quantity)) return { error: 'أدخل عددًا صحيحًا من صفر إلى الكمية المتاحة لكل بند.', remainder, amount: null };
  for (const [i, piece] of pieces.entries()) { count += piece.delivered; due += BigInt(piece.delivered) * BigInt(lines[i]!.unitDue.amountMinor); }
  if (!count || count === remainder) return { error: 'اختر بعض القطع للتسليم الجزئي؛ للصفر اختر الرفض، وللكل اختر التسليم الكامل.', remainder: remainder - count, amount: null };
  if (due > BigInt(Number.MAX_SAFE_INTEGER)) return { error: 'تعذر حساب المبلغ؛ حدّث بيانات المهمة.', remainder: remainder - count, amount: null };
  return { replacement: { outcome: 'partial', pieces, reportedCollection: money(Number(due)) }, remainder: remainder - count, amount: Number(due) };
}

export function ResultFields({ delivery, draft, onChange, choose = false }: { delivery: Delivery; draft: ResultDraft; onChange: (draft: ResultDraft) => void; choose?: boolean }) {
  const preview = proposedResult(delivery, draft);
  return <div className="result-fields">
    {choose ? <fieldset className="result-choices"><legend>النتيجة الصحيحة</legend>{delivery.allowedActions.map(action => { const outcome = action === 'refusal' ? 'refused' : action; return <label key={outcome}><input type="radio" name="replacement" checked={draft.outcome === outcome} onChange={() => onChange({ ...draft, outcome })} />{resultNames[outcome]}</label>; })}</fieldset> : null}
    {draft.outcome === 'partial' && delivery.kind === 'company' ? <div>{delivery.lines?.map(line => <div className="piece-row" key={line.sourceLineId}><Field id={`piece-${line.sourceLineId}`} label={`القطع المسلّمة — ${line.description}`} type="number" min={0} max={line.quantity} step={1} inputMode="numeric" value={draft.quantities[line.sourceLineId] ?? '0'} onChange={event => onChange({ ...draft, quantities: { ...draft.quantities, [line.sourceLineId]: event.target.value } })} /><p>المتاح {line.quantity} · القطعة {amountLabel(line.unitDue)}</p></div>)}</div> : null}
    {draft.outcome === 'refused' && delivery.kind === 'company' ? <fieldset className="result-choices"><legend>دفع الشحن</legend><label><input type="radio" name="shipping" checked={!draft.unpaid} onChange={() => onChange({ ...draft, unpaid: false })} />{delivery.shippingDue?.amountMinor ? `تحصيل الشحن ${amountLabel(delivery.shippingDue)}` : 'لا يوجد شحن مستحق'}</label>{delivery.shippingDue?.amountMinor ? <label><input type="radio" name="shipping" checked={draft.unpaid} onChange={() => onChange({ ...draft, unpaid: true })} />رفض العميل دفع الشحن صراحةً</label> : null}</fieldset> : null}
    {preview.error ? <p role="status" className="task-blocker">{preview.error}</p> : <div className="collection-due collection-due--preview"><span>المبلغ المطلوب عند التأكيد</span><strong>{preview.amount === null ? 'بدون تحصيل' : amountLabel(money(preview.amount))}</strong></div>}
    {delivery.kind === 'company' && preview.remainder > 0 ? <p className="task-blocker">المتبقي معك للإرجاع: {preview.remainder} قطعة.{draft.outcome === 'partial' ? ' الباقي المرفوض لا يُعاد للعميل.' : ''}</p> : null}
    {draft.outcome === 'refused' && draft.unpaid && delivery.kind === 'company' ? <p>شحن غير مدفوع: {amountLabel(delivery.shippingDue)}. هذا رفض دفع صريح، وليس عدم رد.</p> : null}
    {draft.outcome === 'no-answer' ? <p>لا يتضمن عدم الرد تحصيلًا أو رفض دفع الشحن.</p> : null}
  </div>;
}
