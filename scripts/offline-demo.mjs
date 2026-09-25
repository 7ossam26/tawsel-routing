import { execFileSync } from 'node:child_process';
import { dirname, delimiter, resolve } from 'node:path';
import process from 'node:process';

const env = { ...process.env, VITE_TAWSEL_API_BASE_URL: 'http://127.0.0.1:3029', PATH: dirname(process.execPath) + delimiter + process.env.PATH };
function run(args, cwd = process.cwd()) { execFileSync(process.execPath, args.map(String), { cwd, env, stdio: 'inherit' }); }
run(['node_modules/typescript/bin/tsc', '-p', 'packages/shared/tsconfig.json']);
run(['node_modules/typescript/bin/tsc', '-p', 'packages/api-client/tsconfig.build.json']);
run(['scripts/build-public-client.mjs']);
const web = resolve('apps/web');
run([resolve('node_modules/vite/bin/vite.js'), 'build'], web);
run(['scripts/build-pwa.mjs'], web); run(['scripts/check-production.mjs'], web);
run(['node_modules/@playwright/test/cli.js', 'test', '-c', 'playwright.offline.config.ts']);
