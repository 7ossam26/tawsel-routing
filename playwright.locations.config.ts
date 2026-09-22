import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./tests/location-browser',workers:1,timeout:120000,outputDir:'output/playwright/phase-11-results',reporter:'list',use:{baseURL:'http://localhost:5177',locale:'ar-EG',timezoneId:'Africa/Cairo',reducedMotion:'reduce',trace:'retain-on-failure',launchOptions:{args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']},actionTimeout:15000},webServer:[
 {command:'node --env-file=.env.database.local --import tsx scripts/location-browser-server.ts',url:'http://127.0.0.1:3011/health',reuseExistingServer:false},
 {command:`npm run ${process.env.TAWSEL_MAP_PRODUCTION_CHECK==='1'?'preview':'dev'} -w @tawsel/web -- --host localhost --port 5177`,url:'http://localhost:5177',reuseExistingServer:false,env:{VITE_TAWSEL_API_BASE_URL:'http://127.0.0.1:3011'}}
]});
