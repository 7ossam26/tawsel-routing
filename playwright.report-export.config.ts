import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./tests/report-export-browser',workers:1,timeout:120000,expect:{timeout:15000},outputDir:'output/playwright/phase-37-results',reporter:'list',use:{baseURL:'http://localhost:5174',viewport:{width:1366,height:900},locale:'ar-EG',timezoneId:'Africa/Cairo',reducedMotion:'reduce',trace:'retain-on-failure',actionTimeout:20000},webServer:[
 {command:'node --env-file=.env.database.local --import tsx scripts/report-export-browser-server.ts',url:'http://127.0.0.1:3037/__fixture/info',reuseExistingServer:false,timeout:60000},
 {command:'node --import tsx scripts/report-export-web-server.ts',url:'http://localhost:5174',reuseExistingServer:false,timeout:60000,env:{VITE_TAWSEL_API_BASE_URL:'http://127.0.0.1:3037'}}
]});
