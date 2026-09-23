import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import type { AccessSession, AuthenticatedPrincipal, ResourcePolicy, ResourceScope } from '../access/service.js';
import { AccessDenied, withAccess } from '../access/service.js';
import type { ActionEnvelope, Decision } from '../commands/kernel.js';
import { executeCommandInTransaction } from '../commands/kernel.js';
import { lockInvariants } from '../commands/locks.js';
import { validateProtocol } from '../commands/validation.js';
import type { Transaction } from '../db/transaction.js';
import { enqueuePlanning } from '../planning/queue.js';

const ownIntakePolicy: ResourcePolicy = [{ capability: 'execution.own', ownership: 'own-driver' }];
const phonePattern = /^(?:\+[1-9][0-9]{7,14}|01[0125][0-9]{8})$/;

export interface DestinationInput {
  kind: 'address' | 'confirmed-pin';
  addressText?: string;
  coordinates?: { latitude: number; longitude: number };
}
export interface IntakeInput {
  recipientName: string;
  recipientPhone: string;
  destination: DestinationInput;
  collectionAmount?: { amountMinor: number; currency: string; exponent: number };
  instructions?: string;
}
export interface ReviseInput extends IntakeInput { taskId: string; expectedRevision: number }
export interface IndependentTask {
  taskId: string; revision: number; recipientName: string; recipientPhone: string;
  destination: DestinationInput; collectionAmount?: { amountMinor: number; currency: 'EGP'; exponent: 2 };
  instructions?: string; locationReadiness: 'needs-resolution' | 'confirmed'; executionReady: boolean;
  editable: boolean; createdAt: string; updatedAt: string;
}
interface TaskRow extends ResourceScope {
  task_id: string; revision: string; recipient_name: string; recipient_phone: string; instructions: string | null;
  departure_at: Date | null; created_at: Date; updated_at: Date; destination_kind: DestinationInput['kind'];
  address_text: string | null; latitude: number | null; longitude: number | null;
  amount_minor: string | null; currency: 'EGP' | null; exponent: 2 | null;
  execution_confirmed: boolean;
}

export class IntakeError extends Error {
  constructor(readonly code: string, readonly statusCode: number, message: string, readonly fields?: Record<string, string>) { super(message); }
}

function requireEnvelope(value: unknown): asserts value is ActionEnvelope {
  try { validateProtocol('action-envelope', value); }
  catch { throw new IntakeError('validation_failed', 400, 'صيغة أمر المهمة غير صالحة.'); }
}

const clean = (value: string | undefined) => value?.trim();
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function validateIntakeInput(value: unknown, allowedExtra: readonly string[] = []): IntakeInput {
  const input = value as Partial<IntakeInput> | null;
  const fields: Record<string, string> = {};
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new IntakeError('validation_failed', 400, 'صيغة بيانات المهمة غير صالحة.');
  const allowed = new Set(['recipientName', 'recipientPhone', 'destination', 'collectionAmount', 'instructions', ...allowedExtra]);
  if (Object.keys(input).some(key => !allowed.has(key))) fields.form = 'تحتوي المهمة على حقول غير مدعومة.';
  const name = clean(input?.recipientName);
  const phone = clean(input?.recipientPhone);
  if (!name) fields.recipientName = 'اسم المستلم مطلوب.';
  else if (name.length > 200) fields.recipientName = 'اسم المستلم أطول من الحد المسموح.';
  if (!phone) fields.recipientPhone = 'رقم الهاتف مطلوب.';
  else if (!phonePattern.test(phone)) fields.recipientPhone = 'اكتب رقمًا مصريًا صحيحًا أو رقمًا دوليًا مع كود الدولة.';
  const destination = input?.destination;
  if (!destination || (destination.kind !== 'address' && destination.kind !== 'confirmed-pin')) {
    fields.destination = 'اكتب العنوان أو أكّد دبوس الموقع.';
  } else if (destination.kind === 'address') {
    if (Object.keys(destination).some(key => !['kind', 'addressText'].includes(key))) fields.destination = 'بيانات العنوان تحتوي على حقول غير مدعومة.';
    const address = clean(destination.addressText);
    if (!address) fields.destination = 'العنوان المكتوب مطلوب.';
    else if (address.length > 500) fields.destination = 'العنوان أطول من الحد المسموح.';
    if (destination.coordinates !== undefined) fields.destination = 'العنوان غير المحسوم لا يقبل إحداثيات مؤكدة.';
  } else {
    if (Object.keys(destination).some(key => !['kind', 'coordinates', 'addressText'].includes(key))) fields.destination = 'بيانات الدبوس تحتوي على حقول غير مدعومة.';
    const point = destination.coordinates;
    if (!point || !Number.isFinite(point.latitude) || point.latitude < -90 || point.latitude > 90
      || !Number.isFinite(point.longitude) || point.longitude < -180 || point.longitude > 180) {
      fields.destination = 'إحداثيات الدبوس غير صالحة.';
    }
    if (destination.addressText !== undefined && (!clean(destination.addressText) || clean(destination.addressText)!.length > 500)) {
      fields.destination = 'وصف الدبوس غير صالح.';
    }
  }
  const amount = input?.collectionAmount;
  if (amount !== undefined && (typeof amount !== 'object' || Array.isArray(amount)
    || Object.keys(amount).some(key => !['amountMinor', 'currency', 'exponent'].includes(key))
    || !Number.isSafeInteger(amount.amountMinor) || amount.amountMinor <= 0 || amount.currency !== 'EGP' || amount.exponent !== 2)) {
    fields.collectionAmount = 'أدخل مبلغ تحصيل صحيحًا بالجنيه والقروش، أو اتركه فارغًا.';
  }
  const instructions = clean(input?.instructions);
  if (input?.instructions !== undefined && (!instructions || instructions.length > 1000)) fields.instructions = 'التعليمات يجب ألا تتجاوز 1000 حرف.';
  if (Object.keys(fields).length) throw new IntakeError('validation_failed', 400, 'راجع الحقول الموضحة.', fields);
  const pinLabel = clean(destination!.addressText);
  const validDestination: DestinationInput = destination!.kind === 'address'
    ? { kind: 'address', addressText: clean(destination!.addressText)! }
    : { kind: 'confirmed-pin', coordinates: { ...destination!.coordinates! }, ...(pinLabel ? { addressText: pinLabel } : {}) };
  return { recipientName: name!, recipientPhone: phone!, destination: validDestination,
    ...(amount ? { collectionAmount: { ...amount } } : {}), ...(instructions ? { instructions } : {}) };
}

export function validateReviseInput(value: unknown): ReviseInput {
  const input = value as Partial<ReviseInput> | null;
  const parsed = validateIntakeInput(value, ['taskId', 'expectedRevision']);
  if (!input || typeof input.taskId !== 'string' || !uuid.test(input.taskId)) throw new IntakeError('validation_failed', 400, 'معرّف المهمة غير صالح.', { taskId: 'معرّف المهمة غير صالح.' });
  if (!Number.isSafeInteger(input.expectedRevision) || Number(input.expectedRevision) < 1) throw new IntakeError('validation_failed', 400, 'نسخة المهمة غير صالحة.', { expectedRevision: 'أعد تحميل المهمة ثم حاول مرة أخرى.' });
  return { ...parsed, taskId: input.taskId, expectedRevision: Number(input.expectedRevision) };
}

export function requirePredepartureEditable(row: Pick<TaskRow, 'departure_at'>): void {
  if (row.departure_at) throw new IntakeError('departed_edit_forbidden', 409, 'لا يمكن تعديل المهمة بعد بدء الجولة.');
}

function normalizePhone(phone: string): string { return phone.startsWith('0') ? `+20${phone.slice(1)}` : phone; }
function taskFrom(row: TaskRow): IndependentTask {
  const confirmed = row.destination_kind === 'confirmed-pin';
  const destination: DestinationInput = confirmed
    ? { kind: 'confirmed-pin', coordinates: { latitude: row.latitude!, longitude: row.longitude! }, ...(row.address_text ? { addressText: row.address_text } : {}) }
    : { kind: 'address', addressText: row.address_text! };
  return {
    taskId: row.task_id, revision: Number(row.revision), recipientName: row.recipient_name, recipientPhone: row.recipient_phone,
    destination, ...(row.amount_minor === null ? {} : { collectionAmount: { amountMinor: Number(row.amount_minor), currency: 'EGP', exponent: 2 } }),
    ...(row.instructions ? { instructions: row.instructions } : {}), locationReadiness: row.execution_confirmed ? 'confirmed' : 'needs-resolution',
    executionReady: row.execution_confirmed, editable: row.departure_at === null, createdAt: row.created_at.toISOString(), updatedAt: row.updated_at.toISOString()
  };
}
const selectTask = `SELECT t.*,s.kind AS destination_kind,s.address_text,s.latitude,s.longitude,
  a.amount_minor,a.currency,a.exponent,
  CASE WHEN l.task_id IS NOT NULL THEN l.source_revision=t.revision ELSE s.kind='confirmed-pin' END AS execution_confirmed FROM tawsel.b2c_tasks t
  JOIN tawsel.task_source_addresses s USING (tenant_id,task_id)
  LEFT JOIN tawsel.task_locations l USING (tenant_id,task_id)
  LEFT JOIN tawsel.task_collection_amounts a USING (tenant_id,task_id)`;

function requirePersonalDriver(access: AccessSession) {
  const context = access.context;
  if (context.tenantKind !== 'personal' || context.principalKind !== 'account' || !context.driverId) throw new AccessDenied();
  access.requireCapability(ownIntakePolicy);
  return { tenantId: context.tenantId, accountId: context.sourceId, driverId: context.driverId };
}
function assertDeviceCommand(access: AccessSession, command: ActionEnvelope) {
  const owner = requirePersonalDriver(access);
  if (command.context.kind !== 'device') throw new AccessDenied();
  access.assertScope({ tenantId: command.context.tenantId, accountId: command.context.accountId });
  return owner;
}

async function writeSnapshot(tx: Transaction, tenantId: string, taskId: string, input: IntakeInput) {
  await tx.query(`INSERT INTO tawsel.task_source_addresses (tenant_id,task_id,kind,address_text,latitude,longitude)
    VALUES ($1,$2,$3,$4,$5,$6)`, [tenantId, taskId, input.destination.kind, input.destination.addressText ?? null,
    input.destination.coordinates?.latitude ?? null, input.destination.coordinates?.longitude ?? null]);
  if (input.collectionAmount) await tx.query(`INSERT INTO tawsel.task_collection_amounts
    (tenant_id,task_id,amount_minor,currency,exponent) VALUES ($1,$2,$3,$4,$5)`,
  [tenantId, taskId, input.collectionAmount.amountMinor, input.collectionAmount.currency, input.collectionAmount.exponent]);
}
async function replaceSnapshot(tx: Transaction, tenantId: string, taskId: string, input: IntakeInput) {
  await tx.query('DELETE FROM tawsel.task_collection_amounts WHERE tenant_id=$1 AND task_id=$2', [tenantId, taskId]);
  await tx.query('DELETE FROM tawsel.task_source_addresses WHERE tenant_id=$1 AND task_id=$2', [tenantId, taskId]);
  await writeSnapshot(tx, tenantId, taskId, input);
}
async function loadTask(tx: Transaction, tenantId: string, taskId: string, lock = false): Promise<TaskRow | undefined> {
  return (await tx.query<TaskRow>(`${selectTask} WHERE t.tenant_id=$1 AND t.task_id=$2${lock ? ' FOR UPDATE OF t' : ''}`, [tenantId, taskId])).rows[0];
}

function rejected(command: ActionEnvelope, code: 'stale_revision' | 'departed_edit_forbidden', title: string): Decision {
  const problem = { type: `https://schemas.tawsel.invalid/problems/${code.replaceAll('_', '-')}`, title, code, status: 409 as const,
    correlationId: randomUUID(), actionId: command.actionId, retryable: false };
  return { status: 'rejected', problem, response: { status: 409, body: problem }, summary: { code }, audit: { code } };
}

export class IndependentIntakeService {
  constructor(readonly pool: Pool) {}

  async create(principal: AuthenticatedPrincipal, envelope: ActionEnvelope) {
    requireEnvelope(envelope);
    if (envelope.operationId !== 'task.createIndependent') throw new IntakeError('validation_failed', 400, 'نوع العملية غير صالح.');
    const input = validateIntakeInput(envelope.payload);
    return withAccess(this.pool, principal, async (access, tx) => {
      const owner = assertDeviceCommand(access, envelope);
      return executeCommandInTransaction(tx, access.commandScope, envelope, {
        async authorize() { assertDeviceCommand(access, envelope); },
        async writeDomain(tx, command) {
          const taskId = randomUUID();
          await lockInvariants(tx, owner.tenantId, [{ kind: 'driver', id: owner.driverId }, { kind: 'task', id: taskId }]);
          await tx.query(`INSERT INTO tawsel.b2c_tasks
            (tenant_id,task_id,driver_id,recipient_name,recipient_phone,recipient_phone_normalized,instructions)
            VALUES ($1,$2,$3,$4,$5,$6,$7)`, [owner.tenantId, taskId, owner.driverId, input.recipientName,
            input.recipientPhone, normalizePhone(input.recipientPhone), input.instructions ?? null]);
          await writeSnapshot(tx, owner.tenantId, taskId, input);
          await tx.query(`INSERT INTO tawsel.task_intake_events
            (tenant_id,task_id,event_id,event_type,revision,source_id,action_id) VALUES ($1,$2,$3,'task.independentCreated',1,$4,$5)`,
          [owner.tenantId, taskId, randomUUID(), owner.accountId, command.actionId]);
          await enqueuePlanning(tx, owner.tenantId, owner.driverId, owner.accountId, command.actionId);
          const task = taskFrom((await loadTask(tx, owner.tenantId, taskId))!);
          return { status: 'accepted' as const, response: { status: 201, body: { task } }, summary: { taskId, revision: 1 },
            audit: { taskId, fields: Object.keys(input).sort() }, resourceVersions: { resourceRevision: 1 }, intents: [] };
        },
        async writeProgress() { /* Intake has no execution progress transition. */ }
      });
    });
  }

  async revise(principal: AuthenticatedPrincipal, envelope: ActionEnvelope) {
    requireEnvelope(envelope);
    if (envelope.operationId !== 'task.reviseIndependent') throw new IntakeError('validation_failed', 400, 'نوع العملية غير صالح.');
    const input = validateReviseInput(envelope.payload);
    if (envelope.resources.taskId !== input.taskId || envelope.baseVersions.resourceRevision !== input.expectedRevision) {
      throw new IntakeError('validation_failed', 400, 'سياق نسخة المهمة غير متطابق.');
    }
    return withAccess(this.pool, principal, async (access, tx) => {
      const owner = assertDeviceCommand(access, envelope);
      return executeCommandInTransaction(tx, access.commandScope, envelope, {
        async authorize() { assertDeviceCommand(access, envelope); },
        async writeDomain(tx, command) {
          await lockInvariants(tx, owner.tenantId, [{ kind: 'driver', id: owner.driverId }, { kind: 'task', id: input.taskId }]);
          const row = access.requireResource(ownIntakePolicy, await loadTask(tx, owner.tenantId, input.taskId, true));
          if (row.departure_at) return rejected(command, 'departed_edit_forbidden', 'لا يمكن تعديل المهمة بعد بدء الجولة.');
          if (Number(row.revision) !== input.expectedRevision) return rejected(command, 'stale_revision', 'تغيّرت المهمة؛ أعد تحميل النسخة الحالية.');
          const next = input.expectedRevision + 1;
          await tx.query(`UPDATE tawsel.b2c_tasks SET revision=$3,recipient_name=$4,recipient_phone=$5,
            recipient_phone_normalized=$6,instructions=$7,updated_at=clock_timestamp()
            WHERE tenant_id=$1 AND task_id=$2`, [owner.tenantId, input.taskId, next, input.recipientName,
            input.recipientPhone, normalizePhone(input.recipientPhone), input.instructions ?? null]);
          await replaceSnapshot(tx, owner.tenantId, input.taskId, input);
          await tx.query(`INSERT INTO tawsel.task_intake_events
            (tenant_id,task_id,event_id,event_type,revision,source_id,action_id) VALUES ($1,$2,$3,'task.independentRevised',$4,$5,$6)`,
          [owner.tenantId, input.taskId, randomUUID(), next, owner.accountId, command.actionId]);
          await enqueuePlanning(tx, owner.tenantId, owner.driverId, owner.accountId, command.actionId);
          const task = taskFrom((await loadTask(tx, owner.tenantId, input.taskId))!);
          return { status: 'accepted' as const, response: { status: 200, body: { task } }, summary: { taskId: input.taskId, revision: next },
            audit: { taskId: input.taskId, revision: next, fields: Object.keys(input).sort() }, resourceVersions: { resourceRevision: next }, intents: [] };
        },
        async writeProgress() { /* Intake has no execution progress transition. */ }
      });
    });
  }

  async get(principal: AuthenticatedPrincipal, taskId: string): Promise<IndependentTask> {
    if (!uuid.test(taskId)) throw new IntakeError('validation_failed', 400, 'معرّف المهمة غير صالح.');
    return withAccess(this.pool, principal, async (access, tx) => {
      const owner = requirePersonalDriver(access);
      return taskFrom(access.requireResource(ownIntakePolicy, await loadTask(tx, owner.tenantId, taskId)));
    });
  }

  async list(principal: AuthenticatedPrincipal, limit: number, cursor?: string): Promise<{ items: IndependentTask[]; nextCursor?: string }> {
    if (!Number.isInteger(limit) || limit < 1 || limit > 50) throw new IntakeError('validation_failed', 400, 'حد الصفحة غير صالح.');
    let after: [string, string] | undefined;
    if (cursor) {
      try {
        const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as unknown;
        if (!Array.isArray(parsed) || parsed.length !== 2 || typeof parsed[0] !== 'string' || Number.isNaN(Date.parse(parsed[0]))
          || typeof parsed[1] !== 'string' || !uuid.test(parsed[1])) throw new Error();
        after = [parsed[0], parsed[1]];
      } catch { throw new IntakeError('validation_failed', 400, 'مؤشر الصفحة غير صالح.'); }
    }
    return withAccess(this.pool, principal, async (access, tx) => {
      requirePersonalDriver(access);
      const predicate = access.sqlPredicate(ownIntakePolicy, 't', 1);
      const values = [...predicate.values];
      let page = '';
      if (after) { page = ` AND (t.created_at,t.task_id) < ($${values.length + 1}::timestamptz,$${values.length + 2}::uuid)`; values.push(...after); }
      values.push(limit + 1);
      const rows = (await tx.query<TaskRow>(`${selectTask} WHERE ${predicate.text}${page}
        ORDER BY t.created_at DESC,t.task_id DESC LIMIT $${values.length}`, values)).rows;
      const hasMore = rows.length > limit;
      const visible = rows.slice(0, limit);
      const last = visible.at(-1);
      return { items: visible.map(taskFrom), ...(hasMore && last ? { nextCursor: Buffer.from(JSON.stringify([last.created_at.toISOString(), last.task_id])).toString('base64url') } : {}) };
    });
  }
}
