import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/cairo/arabic-400.css';
import '@fontsource/cairo/arabic-600.css';
import '@fontsource/cairo/arabic-700.css';
import '@fontsource/cairo/arabic-800.css';
import '@fontsource/cairo/latin-400.css';
import '@fontsource/cairo/latin-600.css';
import '@fontsource/cairo/latin-700.css';
import '@fontsource/cairo/latin-800.css';
import './styles.css';

function App() {
  return (
    <main className="shell">
      <section className="card" aria-labelledby="page-title">
        <p className="eyebrow">توصيل</p>
        <h1 id="page-title">مساحة العمل جاهزة</h1>
        <p className="summary">
          هذه واجهة التأسيس التقنية فقط. لا توجد مهام توصيل أو بيانات تشغيل في هذه المرحلة.
        </p>
        <dl className="status-list">
          <div>
            <dt>واجهة الويب</dt>
            <dd><span className="status-dot" aria-hidden="true" /> جاهزة محليًا</dd>
          </div>
          <div>
            <dt>قدرات التوصيل</dt>
            <dd>غير مضافة بعد</dd>
          </div>
        </dl>
      </section>
    </main>
  );
}

const root = document.getElementById('root');
if (!root) {
  throw new Error('Application root element is missing');
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
);
