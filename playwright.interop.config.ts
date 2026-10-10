import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./tests/interoperability-browser',workers:1,timeout:240000,outputDir:'.local/interop-browser-results',reporter:'list',use:{baseURL:'http://localhost:5173',trace:'retain-on-failure',actionTimeout:20000},webServer:[
 {command:'node --env-file=.env.database.local --import tsx scripts/exceptions-browser-server.ts',url:'http://127.0.0.1:3030/health',reuseExistingServer:false,timeout:120000,env:{TAWSEL_INTEROP_FIXTURE:'1'}},
 {command:'node ../../node_modules/vite/bin/vite.js preview --host localhost --port 5173',cwd:'apps/web',url:'http://localhost:5173',reuseExistingServer:false,env:{VITE_TAWSEL_API_BASE_URL:'http://127.0.0.1:3030'}}
]});
