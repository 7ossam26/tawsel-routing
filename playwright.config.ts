import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  outputDir: './output/playwright/phase-04-results',
  reporter: [['list'], ['html', { outputFolder: './output/playwright/phase-04-report', open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:5173',
    locale: 'ar-EG',
    timezoneId: 'Africa/Cairo',
    reducedMotion: 'reduce',
    trace: 'retain-on-failure'
  },
  webServer: {
    command: 'npm run dev -w @tawsel/web',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: false,
    timeout: 120_000,
    env: { VITE_TAWSEL_API_BASE_URL: 'http://127.0.0.1:3001' }
  }
});
