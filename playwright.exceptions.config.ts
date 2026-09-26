import { defineConfig } from '@playwright/test';
export default defineConfig({ testDir: './tests/exceptions-browser', workers: 1, timeout: 300000, outputDir: 'output/playwright/phase-30-results', reporter: 'list', use: { launchOptions: { slowMo: Number(process.env.TAWSEL_BROWSER_SLOW_MO ?? 0) }, baseURL: 'http://localhost:5173', viewport: { width: 390, height: 844 }, hasTouch: true, locale: 'ar-EG', timezoneId: 'Africa/Cairo', reducedMotion: 'reduce', trace: 'retain-on-failure', actionTimeout: 20000 }, webServer: [
  { command: 'node --env-file=.env.database.local --import tsx scripts/exceptions-browser-server.ts', url: 'http://127.0.0.1:3030/health', reuseExistingServer: false, timeout: 120000 },
  { command: 'npm run dev -w @tawsel/web -- --host localhost --port 5173', url: 'http://localhost:5173', reuseExistingServer: false, env: { VITE_TAWSEL_API_BASE_URL: 'http://127.0.0.1:3030' } }
] });
