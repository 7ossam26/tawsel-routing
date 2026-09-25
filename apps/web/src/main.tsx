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
import { ProductionShell } from './production-shell';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Application root element is missing');
}

const root = createRoot(rootElement);

async function renderApplication() {
  const isFixtureRoute = window.location.pathname.startsWith('/__fixtures/');

  if (import.meta.env.DEV && isFixtureRoute) {
    const { DriverReviewFixture } = await import('./fixtures/driver-review-fixture');
    root.render(
      <StrictMode>
        <DriverReviewFixture />
      </StrictMode>
    );
    return;
  }

  root.render(
    <StrictMode>
      <ProductionShell fixtureRouteRequested={isFixtureRoute} />
    </StrictMode>
  );
}

void renderApplication();

// Updates wait for the normal worker lifecycle; never force activation/reload.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  void navigator.serviceWorker.register('/sw.js').catch(() => undefined);
}
