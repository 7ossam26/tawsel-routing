import { useEffect, useState } from 'react';
import { liveQuery } from 'dexie';
import { localWork, type LocalAction, type PendingEffect } from './local-work';
import { deviceId } from './independent-tasks';
import { StatusNotice } from './components/ui';

export async function assertNoLocalPending() {
  const selection = await localWork.selection.get('active');
  if (selection && await localWork.pending.where('scope').equals(selection.scope).count()) throw new Error('يوجد عمل محفوظ على الهاتف ينتظر المزامنة. راجعه قبل بدء جولة أو تغيير الحساب.');
}
export function useLocalPending() {
  const [state, setState] = useState<{ items: PendingEffect[]; kind: 'company' | 'personal' | null; error: string }>({ items: [], kind: null, error: '' });
  useEffect(() => {
    const subscription = liveQuery(async () => {
      const selection = await localWork.selection.get('active'), partition = selection && await localWork.partitions.get(selection.scope);
      return { items: selection ? await localWork.pending.where('scope').equals(selection.scope).toArray() : [], kind: partition?.identity.kind ?? null };
    }).subscribe({ next: value => setState({ ...value, error: '' }), error: () => setState({ items: [], kind: null, error: 'تعذر قراءة تخزين الهاتف؛ تحقق منه قبل المتابعة.' }) });
    return () => subscription.unsubscribe();
  }, []);
  return state;
}
export function LocalWorkPage() {
  const kind = new URLSearchParams(location.search).get('kind') === 'company' ? 'company' : 'personal';
  const [actions, setActions] = useState<Array<{ action: LocalAction; state: string }>>([]), [error, setError] = useState('');
  useEffect(() => {
    const subscription = liveQuery(async () => {
      const partition = await localWork.active(kind, deviceId());
      if (!partition) throw new Error('افتح الحساب الذي نزّل العمل على هذا الهاتف.');
      const rows = await localWork.actions.where('scope').equals(partition.scope).toArray();
      return Promise.all(rows.sort((a, b) => a.sequence - b.sequence).map(async action => {
        const ack = await localWork.acknowledgements.get([partition.scope, action.actionId]);
        return { action, state: !ack ? 'محفوظ على الهاتف — لم يتأكد وصوله للخادم' : ack.result.receipt.businessStatus === 'accepted' ? 'مقبول من الخادم' : 'وصل للخادم ويحتاج مراجعة' };
      }));
    }).subscribe({ next: setActions, error: value => setError(value instanceof Error ? value.message : 'تعذر قراءة السجل.') });
    return () => subscription.unsubscribe();
  }, [kind]);
  return <main className="tasks-shell" dir="rtl"><h1>الإجراءات المحفوظة على الهاتف</h1><p>المحفوظ محليًا لا يظهر لمتابعة الشركة حتى يستقبله الخادم.</p><a href={'/rounds/current?kind=' + kind}>العودة للجولة</a>{error ? <StatusNotice tone="error" title="تعذر فتح السجل">{error}</StatusNotice> : null}{actions.map(({ action, state }) => <article className="current-stage-card" key={action.actionId}><h2>{state}</h2><p>وقت التسجيل: <bdi>{action.envelope.observation.observedAt ?? 'غير متاح'}</bdi> · دقة ساعة الهاتف غير مؤكدة</p><details><summary>تفاصيل التشخيص</summary><pre dir="ltr">{JSON.stringify({ actionId: action.actionId, operationId: action.envelope.operationId, sequence: action.sequence, dependencies: action.envelope.dependsOnActionIds, schemaVersion: action.envelope.schemaVersion, baseVersions: action.envelope.baseVersions, generation: action.envelope.context.kind === 'device' ? action.envelope.context.deviceGeneration : null }, null, 2)}</pre></details></article>)}{!actions.length && !error ? <p>لا توجد إجراءات محلية لهذا الحساب.</p> : null}</main>;
}
