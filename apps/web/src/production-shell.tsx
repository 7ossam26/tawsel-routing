import { CorrectionPage } from './correction-page';
import { BranchPage } from './branch-page';
import { ClosurePage } from './closure-page';
import { ExecutionOptionsPage } from './execution-options';
import { AccountShell } from './account-shell';
import { IndependentTasksPage } from './independent-tasks';
import { LocationReview } from './location-review';
import { CurrentActivityPage } from './current-activity';
import { PreparationFlow } from './preparation-flow';
import { MonitoringPage } from './monitoring-page';
import { LocalWorkPage } from './local-status';
import { useReplayLifecycle } from './replay-lifecycle';
import { ConflictsPage } from './conflicts-page';
import { AccountBoundary } from './account-boundary';
import { UpdateNotice } from './update-notice';
import { ReportingPage } from './reporting-page';
export function ProductionShell({ fixtureRouteRequested = false }: { fixtureRouteRequested?: boolean }) {
  const privatePage = /^\/(reports|sync|local-work|monitoring|execution|rounds|day|prepare|locations|tasks)(\/|$)/.test(location.pathname);
  return <><UpdateNotice />{privatePage && !fixtureRouteRequested ? <AccountBoundary><ConnectedShell /></AccountBoundary> : <ConnectedShell fixtureRouteRequested={fixtureRouteRequested} />}</>;
}
function ConnectedShell({ fixtureRouteRequested = false }: { fixtureRouteRequested?: boolean }) {
  const message = useReplayLifecycle(!fixtureRouteRequested && !window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/monitoring'));
  const kind = new URLSearchParams(location.search).get('kind') === 'company' ? 'company' : 'personal';
  return <>{message ? <aside className="sync-notice" dir="rtl" role="status">{message} <a href={'/local-work?kind=' + kind}>مراجعة المزامنة</a></aside> : null}<ProductionRoutes fixtureRouteRequested={fixtureRouteRequested} /></>;
}
function ProductionRoutes({ fixtureRouteRequested }: { fixtureRouteRequested: boolean }) {
  if (!fixtureRouteRequested && window.location.pathname.startsWith('/reports')) return <ReportingPage />;
  if (!fixtureRouteRequested && window.location.pathname === '/sync') return <ConflictsPage />;
  if (!fixtureRouteRequested && window.location.pathname === '/local-work') return <LocalWorkPage />;
  if (!fixtureRouteRequested && window.location.pathname.startsWith('/monitoring')) return <MonitoringPage />;
  if (!fixtureRouteRequested && window.location.pathname.startsWith('/execution/closure')) return <ClosurePage />;
  if (!fixtureRouteRequested && window.location.pathname.startsWith('/execution/branch')) return <BranchPage />;
  if (!fixtureRouteRequested) return window.location.pathname.startsWith('/execution/correction') ? <CorrectionPage /> : window.location.pathname.startsWith('/execution/options') ? <ExecutionOptionsPage /> : window.location.pathname.startsWith('/rounds/current') ? <CurrentActivityPage /> : window.location.pathname.startsWith('/day') || window.location.pathname.startsWith('/prepare') ? <PreparationFlow /> : window.location.pathname.startsWith('/locations') ? <LocationReview /> : window.location.pathname.startsWith('/tasks') ? <IndependentTasksPage /> : <AccountShell />;
  return (
    <main className="foundation-shell">
      <section className="foundation-card" aria-labelledby="page-title">
        <p className="eyebrow">توصيل</p>
        <h1 id="page-title">مساحة العمل جاهزة</h1>
        <p className="summary">
          هذه واجهة التأسيس التقنية فقط. لا توجد مهام توصيل أو بيانات تشغيل متصلة في هذه المرحلة.
        </p>
        {fixtureRouteRequested ? (
          <p className="status-notice status-notice--waiting" role="status">
            عروض المراجعة غير متاحة في نسخة الإنتاج.
          </p>
        ) : null}
        <dl className="status-list">
          <div>
            <dt>واجهة الويب</dt>
            <dd><span className="status-dot" aria-hidden="true" /> جاهزة محليًا</dd>
          </div>
          <div>
            <dt>قدرات التوصيل</dt>
            <dd>غير متصلة بعد</dd>
          </div>
        </dl>
      </section>
    </main>
  );
}
