import { validateProtocol } from './validation.js';
import type { ActionEnvelope } from './kernel.js';
import { DeviceError } from '../devices/models.js';

const readers: Record<string, (value: unknown) => ActionEnvelope> = {
  '1.0.0/1.0.0': value => { validateProtocol('action-envelope', value); return value as ActionEnvelope; }
};
/** Retained public v1 semantics, without defaulting unknown payloads to v1. */
export function readQueuedAction(value: unknown): ActionEnvelope {
  const version = value as Partial<ActionEnvelope> | null;
  const reader = readers[`${version?.schemaVersion}/${version?.payloadVersion}`];
  if (!reader) throw new DeviceError('unsupported_schema_version', 400, 'نسخة الإجراء غير مدعومة. احتفظ بالأصل وأعد المحاولة بنسخة متوافقة؛ لم نؤكد استلامه.');
  return reader(value);
}
