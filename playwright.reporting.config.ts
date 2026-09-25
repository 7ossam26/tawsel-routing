import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./tests/reporting-browser',workers:1,timeout:240000,expect:{timeout:15000},outputDir:'output/playwright/phase-36-results',reporter:'list',use:{baseURL:'http://localhost:5173',viewport:{width:1366,height:900},locale:'ar-EG',timezoneId:'Africa/Cairo',reducedMotion:'reduce',trace:'retain-on-failure',actionTimeout:20000},webServer:[
 {command:'node --env-file=.env.database.local --import tsx scripts/reporting-browser-server.ts',url:'http://127.0.0.1:3036/__fixture/info',reuseExistingServer:false,timeout:120000},
 {command:'npm run dev -w @tawsel/web -- --host localhost --port 5173',url:'http://localhost:5173',reuseExistingServer:false,timeout:60000,env:{VITE_TAWSEL_API_BASE_URL:'http://127.0.0.1:3036'}}
]});
