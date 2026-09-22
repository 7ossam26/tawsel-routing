import { readFileSync } from 'node:fs';
import { Ajv2020 } from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import type { components } from '@tawsel/api-client';
import type { ActionEnvelope } from '../commands/kernel.js';
import { validateProtocol } from '../commands/validation.js';

export type Snapshot = components['schemas']['B2bSourceSnapshot'];
export type AssignmentReference = components['schemas']['B2bAssignmentReference'];
export type Task = components['schemas']['B2bTask'];
export const operations = {
  'intake.submitSnapshot': 'SourceSnapshot', 'intake.prepare': 'Prepare', 'assignment.receiveBatch': 'ReceiveBatch',
  'assignment.withdraw': 'Withdraw', 'assignment.reassignBeforeDeparture': 'Reassign', 'intake.setUrgencyBeforeDeparture': 'Urgency'
} as const;
export type Operation = keyof typeof operations;
export class SourceError extends Error {
  constructor(readonly code: components['schemas']['ErrorCode'], readonly statusCode: number, message: string) { super(message); }
}
const ajv = new Ajv2020({ strict: true, allErrors: true });
(addFormats as unknown as (a: Ajv2020) => void)(ajv);
for (const file of ['common.schema.json','b2c-intake.schema.json','action-envelope.v1.schema.json','evidence-receipt.v1.schema.json','action-result.v1.schema.json','b2b-intake.schema.json']) {
  ajv.addSchema(JSON.parse(readFileSync(new URL(`../../../../contracts/${file}`, import.meta.url), 'utf8')));
}
export function conforms(name: string, value: unknown) {
  return ajv.validate(`https://schemas.tawsel.invalid/v1/b2b-intake.schema.json#/$defs/${name}`, value) as boolean;
}
export function validateCommand(operation: Operation, value: unknown): asserts value is ActionEnvelope {
  try { validateProtocol('action-envelope', value); }
  catch { throw new SourceError('validation_failed', 400, 'Invalid action envelope; use the canonical source command.'); }
  const payload = (value as ActionEnvelope).payload;
  if (operation === 'intake.submitSnapshot' && (payload.allocation !== 'exact-outstanding-per-unit' || 'deposit' in payload || 'depositMinor' in payload
    || !payload.shippingDue || !payload.totalDue || (Array.isArray(payload.lines) && payload.lines.some(l => !l || typeof l !== 'object' || !('unitDue' in l))))) {
    throw new SourceError('unsupported_price_allocation', 422, 'Supply exact outstanding unitDue for every line and shippingDue/totalDue; never send an unallocated deposit.');
  }
  if (!conforms(`${operations[operation]}Command`, value)) {
    const detail = ajv.errors?.slice(0, 3).map(e => `${e.instancePath || '/'} ${e.message}`).join('; ');
    throw new SourceError('validation_failed', 400, `Invalid source command: ${detail ?? 'see schema'}`.slice(0, 900));
  }
  if (operation === 'intake.submitSnapshot') validateAllocation(payload as Snapshot);
  if (Array.isArray(payload.items) && new Set((payload.items as AssignmentReference[]).map(i => i.externalId)).size !== payload.items.length) {
    throw new SourceError('validation_failed', 400, 'Each shipment must occur only once in a batch.');
  }
}
export function validateAllocation(snapshot: Snapshot) {
  if (new Set(snapshot.lines.map(l => l.sourceLineId)).size !== snapshot.lines.length) throw new SourceError('validation_failed', 400, 'sourceLineId must be unique within a shipment snapshot.');
  const due = snapshot.lines.reduce((sum, line) => sum + BigInt(line.quantity) * BigInt(line.unitDue.amountMinor), BigInt(snapshot.shippingDue.amountMinor));
  if (due > BigInt(Number.MAX_SAFE_INTEGER) || due !== BigInt(snapshot.totalDue.amountMinor)) {
    throw new SourceError('unsupported_price_allocation', 422, 'totalDue must equal the exact sum of quantity × unitDue plus shippingDue, within safe integer minor units.');
  }
}
