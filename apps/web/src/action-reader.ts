import type { LocalAction, LocalEnvelope } from './local-work.js';

/** Explicit released readers. No default version, mutation or new action ID.
 * A future translator must preserve the original envelope/hash/receipt identity. */
const readers: Record<string, (action: LocalAction) => LocalEnvelope> = {
  '1.0.0/1.0.0': action => action.envelope
};
export function readLocalAction(action: LocalAction): LocalEnvelope {
  const reader = readers[`${action.envelope.schemaVersion}/${action.envelope.payloadVersion}`];
  if (!reader) throw new Error('صيغة الإجراء المحفوظ غير مدعومة. احتفظ بالبيانات وافتح نسخة متوافقة؛ لم يُرسل الإجراء.');
  if (action.bytes !== JSON.stringify(action.envelope)) throw new Error('تعذر التحقق من الإجراء المحفوظ. لم يُرسل أو يُحذف؛ يحتاج مراجعة الدعم.');
  return reader(action);
}
