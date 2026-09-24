import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./tests/source-browser',workers:1,timeout:180000,outputDir:'./output/playwright/phase-27-results',reporter:'list',use:{baseURL:'http://localhost:5191',locale:'ar-EG',timezoneId:'Africa/Cairo',reducedMotion:'reduce',viewport:{width:390,height:844},trace:'off',actionTimeout:15000},webServer:[
 {command:'node --env-file=.env.database.local --import tsx scripts/source-browser-server.ts',url:'http://127.0.0.1:5191/health',reuseExistingServer:false,timeout:60000},
 {command:'npm run dev -w @tawsel/web -- --host localhost',url:'http://localhost:5173',reuseExistingServer:false,env:{VITE_TAWSEL_API_BASE_URL:'http://127.0.0.1:3001'}}
]});
