import { defineConfig } from '@playwright/test';

const port = Number(process.env.TAWSEL_BROWSER_PORT ?? 5173);

export default defineConfig({
  testDir: './tests/browser',
  outputDir: './output/playwright/phase-04-results',
  reporter: [['list'], ['html', { outputFolder: './output/playwright/phase-04-report', open: 'never' }]],
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    locale: 'ar-EG',
    timezoneId: 'Africa/Cairo',
    reducedMotion: 'reduce',
    trace: 'retain-on-failure'
  },
  webServer: {
    command: `npm run dev -w @tawsel/web -- --port ${port}`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: { VITE_TAWSEL_API_BASE_URL: 'http://127.0.0.1:3001' }
  }
});
