import { defineConfig } from '@playwright/test';
export default defineConfig({testDir:'./tests/current-browser',workers:1,timeout:120000,outputDir:'output/playwright/phase-16-results',reporter:'list',use:{baseURL:'http://localhost:5178',viewport:{width:390,height:844},hasTouch:true,locale:'ar-EG',timezoneId:'Africa/Cairo',reducedMotion:'reduce',trace:'retain-on-failure',actionTimeout:15000},webServer:[
 {command:'node --env-file=.env.database.local --import tsx scripts/current-browser-server.ts',url:'http://127.0.0.1:3016/health',reuseExistingServer:false},
 {command:`npm run ${process.env.TAWSEL_CURRENT_PRODUCTION_CHECK==='1'?'preview':'dev'} -w @tawsel/web -- --host localhost --port 5178`,url:'http://localhost:5178',reuseExistingServer:false,env:{VITE_TAWSEL_API_BASE_URL:'http://127.0.0.1:3016'}}
]});
