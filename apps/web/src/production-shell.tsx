export function ProductionShell({ fixtureRouteRequested = false }: { fixtureRouteRequested?: boolean }) {
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
