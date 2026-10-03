import { defineConfig } from '@playwright/test';
import { browserFixtureConfig } from './scripts/browser-fixture-config.js';
const browser = browserFixtureConfig();
export default defineConfig({ testDir: './tests/preparation-browser', workers: 1, timeout: 180000, outputDir: 'output/playwright/phase-28-results', reporter: 'list', use: { baseURL: browser.origin, viewport: { width: 390, height: 844 }, hasTouch: true, locale: 'ar-EG', timezoneId: 'Africa/Cairo', reducedMotion: 'reduce', trace: 'retain-on-failure', actionTimeout: 20000 }, webServer: [
  { command: 'node --env-file=.env.database.local --import tsx scripts/preparation-browser-server.ts', url: 'http://127.0.0.1:3028/health', reuseExistingServer: false, timeout: 90000 },
  { command: `npm run dev -w @tawsel/web -- --host localhost --port ${browser.port}`, url: browser.origin, reuseExistingServer: false, timeout: 60000, env: { VITE_TAWSEL_API_BASE_URL: 'http://127.0.0.1:3028' } }
] });
