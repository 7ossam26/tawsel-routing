import { useEffect, useRef, useState } from 'react';
import { Truck } from 'lucide-react';
import type { components } from '@tawsel/api-client';
import { ActionButton, Field, StatusNotice } from './components/ui';
import { assertNoLocalPending, useLocalPending } from './local-status';
import { localWork } from './local-work';
import { bindSession, exitAccount, recoveryInput } from './account-lifecycle';
import { deviceId } from './independent-tasks';
import { SessionClient } from '@tawsel/api-client/src/session';
import { liveQuery } from 'dexie';
import { scopeKey, sessionScope } from './local-work';
import { RecoveryLimits } from './recovery-limits';

type Kind = 'company' | 'personal';
type Context = components['schemas']['SessionContext'];
const errorCopy: Record<string, string> = {
  login_failed: 'تعذر إكمال الدخول. حاول مرة أخرى من هذه الصفحة.', access_disabled: 'الوصول غير متاح لهذا الحساب. راجع مسؤول الشركة أو استعد حسابك.',
  same_account_required: 'استخدم الحساب نفسه لاستكمال العمل المحفوظ.', session_expired: 'انتهت الجلسة. سجّل الدخول للحساب نفسه؛ بياناتك المحلية لم تُحذف.',
  issuer_unavailable: 'خدمة تسجيل الدخول غير متاحة الآن. حاول لاحقًا.', csrf_invalid: 'حدّث الصفحة ثم حاول مرة أخرى.',
  rate_limited: 'محاولات كثيرة. انتظر دقيقة ثم حاول مرة أخرى.'
};
async function request(path: string, body?: object) {
  let response: Response;
  if (body) {
    const bootstrap = await fetch('/api/session/bootstrap', { credentials: 'same-origin', cache: 'no-store' });
    const start = await bootstrap.json();
    if (!bootstrap.ok) throw new Error(start.error?.message ?? 'تعذر الاتصال. حاول مرة أخرى.');
    response = await fetch(path, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': start.csrfToken }, body: JSON.stringify(body) });
  } else response = await fetch(path, { credentials: 'same-origin', cache: 'no-store' });
  if (response.status === 204) return null;
  const data = await response.json();
  if (!response.ok) throw Object.assign(new Error(data.error?.message ?? 'تعذر الاتصال. حاول مرة أخرى.'), { code: data.error?.code });
  return data;
}
async function send(path: string, body?: object) {
  try { return await request(path, body); }
  catch (failure) {
    if (failure instanceof Error && 'code' in failure) throw failure;
    throw new Error('تعذر الاتصال. تحقق من الإنترنت ثم حاول مرة أخرى؛ بياناتك المحلية لم تُحذف.', { cause: failure });
  }
}

export function AccountShell() {
  const local = useLocalPending();
  const query = new URLSearchParams(window.location.search);
  const path = window.location.pathname;
  const kind: Kind = query.get('kind') === 'personal' || ['/login/independent', '/register', '/verify-email'].includes(path) ? 'personal' : 'company';
  const accountPage = path === '/account';
  const intent = path === '/register' ? 'register' : path.startsWith('/recover') ? 'recover' : 'login';
  const [code, setCode] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState<{ code: string; displayName: string } | null>(null);
  const [error, setError] = useState(errorCopy[query.get('error') ?? ''] ?? '');
  const [errorCode, setErrorCode] = useState(query.get('error') ?? '');
  const [busy, setBusy] = useState(false);
  const [context, setContext] = useState<Context | null>(null);
  const [loading, setLoading] = useState(accountPage);
  const [recovery, setRecovery] = useState<components['schemas']['LoginRequest'] | null>(null);
  const [exitPending, setExitPending] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);
  useEffect(() => {
    if (!context) return;
    const scope = scopeKey(sessionScope(context, deviceId()));
    const subscription = liveQuery(async () => {
      const selected = await localWork.selection.get('active'), partition = await localWork.partitions.get(scope);
      return selected?.scope === scope && !selected.exiting && !partition?.blocked;
    }).subscribe({ next: valid => { if (!valid) { setContext(null); setExitPending(true); } }, error: () => setContext(null) });
    return () => subscription.unsubscribe();
  }, [context]);
  useEffect(() => {
    void recoveryInput(localWork).then(setRecovery);
    void localWork.selection.get('active').then(value => setExitPending(Boolean(value?.exiting)));
    if (!accountPage) return;
    let active = true;
    send(`/api/session/context?kind=${kind}`).then(async data => { await bindSession(localWork, data, deviceId()); if (active) setContext(data); }).catch((failure: Error & { code?: string }) => {
      if (active) { setError(failure.message); setErrorCode(failure.code ?? 'network'); }
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [accountPage, kind]);
  async function act(work: () => Promise<void>) {
    if (busy) return;
    setBusy(true); setError('');
    try { await work(); } catch (failure) { setError(failure instanceof Error ? failure.message : 'تعذر الاتصال. حاول مرة أخرى.'); }
    finally { setBusy(false); }
  }
  async function begin(reauthenticate = false) {
    if (!reauthenticate) await assertNoLocalPending();
    const input = reauthenticate ? await recoveryInput(localWork) : null;
    const result = await new SessionClient().begin(input ?? { kind, ...(company ? { companyCode: company.code } : {}), ...(phone ? { phone } : {}), ...(reauthenticate ? { reauthenticate: true } : {}) }, intent);
    window.location.assign(result.authorizationUrl);
  }
  async function logout() {
    const selected = await localWork.selection.get('active'), partition = selected && await localWork.partitions.get(selected.scope);
    const exitingKind = partition?.identity.kind ?? kind;
    await exitAccount(localWork, () => new SessionClient().logout(exitingKind));
    window.location.assign(`/login?kind=${exitingKind}`);
  }
  const title = accountPage ? 'حسابي' : intent === 'register' ? 'أنشئ حسابك المستقل' : intent === 'recover' ? 'استعادة الحساب' : kind === 'company' ? 'ادخل لحساب الشركة' : 'ادخل لحسابك المستقل';
  return <main className="account-shell"><header className="account-brand"><span className="account-logo"><Truck aria-hidden="true" /></span><strong>توصيل</strong><p>خطوة واضحة ليومك على الطريق</p></header>
    <section className="account-card" aria-labelledby="account-title"><p className="eyebrow">{kind === 'company' ? 'حساب الشركة' : 'حساب مستقل'}</p><h1 id="account-title">{title}</h1>
      {error ? <div ref={errorRef} tabIndex={-1} className="account-error"><StatusNotice tone="error" title="تعذر المتابعة">{error}</StatusNotice></div> : null}
      {accountPage ? <>
        {loading ? <StatusNotice title="جارٍ التحقق من حسابك" /> : context ? <>
          <StatusNotice tone="success" title="أنت مسجّل الدخول">{kind === 'company' ? 'الوصول حسب صلاحياتك الحالية في الشركة.' : 'مساحة حسابك المستقل منفصلة عن حساب الشركة.'}</StatusNotice>
          <dl className="status-list"><div><dt>{kind === 'company' ? 'اسم المستخدم' : 'رقم الهاتف'}</dt><dd><bdi dir="auto">{context.loginIdentifier}</bdi></dd></div><div><dt>بريد الاستعادة</dt><dd>{context.recoveryEmailVerified ? 'تم التحقق منه' : 'راجع جهة تسجيل الدخول'}</dd></div></dl>
          <a className="edit-link" href={`/day?kind=${kind}`}>عمل اليوم وتجهيز الجولة</a>
          <ActionButton busy={busy} onClick={() => void act(logout)}>تسجيل الخروج</ActionButton>
        </> : <>
          {exitPending ? <ActionButton busy={busy} onClick={() => void act(logout)}>إكمال تسجيل الخروج</ActionButton> : recovery || errorCode === 'session_expired' ? <ActionButton busy={busy} onClick={() => void act(() => begin(true))}>الدخول للحساب نفسه</ActionButton> : <ActionButton onClick={() => window.location.reload()}>إعادة المحاولة</ActionButton>}
          {recovery ? <ActionButton variant="quiet" busy={busy} onClick={() => void act(logout)}>تسجيل الخروج</ActionButton> : null}
          <a className="account-link" href={`/recover?kind=${kind}`}>استعادة الحساب</a>
          <a className="account-link" href={`/login?kind=${kind}`}>العودة لصفحة الدخول</a>
        </>}
      </> : <>
        {intent === 'login' ? <nav className="account-paths" aria-label="نوع الحساب"><a aria-current={kind === 'company' ? 'page' : undefined} href="/login/company">حساب الشركة</a><a aria-current={kind === 'personal' ? 'page' : undefined} href="/login/independent">حساب مستقل</a></nav> : null}
        <p className="summary">{intent === 'recover' ? 'استعد كلمة المرور من خلال بريدك المتحقق منه. إذا طابقت البيانات حسابًا فستصلك رسالة بالخطوة التالية.' : kind === 'company' ? 'ابدأ بكود الشركة، ثم أدخل اسم المستخدم وكلمة المرور في صفحة الدخول.' : intent === 'register' ? 'رقم الهاتف للدخول، والبريد لتفعيل الحساب واستعادته. لا يلزم توثيق برسالة نصية.' : 'استخدم رقم هاتفك وكلمة المرور. بريدك مخصص لاستعادة الحساب.'}</p>
        {recovery ? <StatusNotice tone="waiting" title="استكمل الحساب المحفوظ أولًا"><ActionButton busy={busy} onClick={() => void act(() => begin(true))}>الدخول للحساب نفسه</ActionButton><a className="edit-link" href={'/account?kind=' + recovery.kind}>الخروج أو تغيير الحساب</a></StatusNotice> : null}
        <form onSubmit={event => { event.preventDefault(); void act(async () => { if (kind === 'company' && !company) setCompany(await send('/api/session/company', { code })); else { if (recovery) throw new Error('عُد للحساب المحفوظ وسجّل الخروج قبل تغييره.'); await begin(); } }); }}>
          {kind === 'company' ? company ? <div className="account-company"><strong><bdi>{company.displayName}</bdi></strong><ActionButton type="button" variant="quiet" onClick={() => setCompany(null)}>تعديل الكود</ActionButton></div> : <Field id="company-code" label="كود الشركة (مطلوب)" value={code} onChange={e => setCode(e.target.value)} required maxLength={32} autoComplete="organization" dir="ltr" hint="اطلب الكود من مسؤول شركتك." /> : intent !== 'recover' ? <Field id="phone" label="رقم الهاتف" type="tel" inputMode="tel" value={phone} onChange={e => setPhone(e.target.value)} autoComplete="username" dir="ltr" hint="مثال: ‎+201000000000 — البريد ليس اسم الدخول." /> : null}
          <ActionButton type="submit" busy={busy}>{busy ? 'جارٍ المتابعة…' : kind === 'company' && !company ? 'متابعة' : intent === 'register' ? 'إنشاء حساب' : intent === 'recover' ? 'استعادة كلمة المرور' : 'متابعة تسجيل الدخول'}</ActionButton>
        </form>
        <div className="account-secondary">{intent === 'login' ? <><a href={`/recover?kind=${kind}`}>نسيت كلمة المرور؟</a>{kind === 'personal' ? <a href="/register">حساب جديد</a> : null}</> : <a href={`/login?kind=${kind}`}>العودة للدخول</a>}</div>
      </>}
      {local.unreceived || local.error ? <StatusNotice tone="waiting" title="راجع العمل المحفوظ قبل تغيير الحساب">{local.error || `${local.unreceived} إجراء ينتظر الوصول للخادم. لم يُحذف.`}<a className="edit-link" href={'/local-work?kind=' + (local.kind ?? kind)}>مراجعة الإجراءات المحفوظة</a><a className="edit-link" href={'/rounds/current?kind=' + (local.kind ?? kind)}>العودة للجولة</a></StatusNotice> : local.attention ? <StatusNotice tone="info" title="وصل الدليل؛ يمكنك الخروج">بعض النتائج تحتاج مراجعة. يحتفظ الخادم بها بعد الخروج.<a className="edit-link" href={'/sync?kind=' + (local.kind ?? kind)}>مراجعة النتائج</a></StatusNotice> : null}
      <RecoveryLimits kind={local.kind ?? kind} />
    </section><p className="account-footnote">تحتاج إلى اتصال لإتمام الدخول أو الاستعادة.</p></main>;
}
