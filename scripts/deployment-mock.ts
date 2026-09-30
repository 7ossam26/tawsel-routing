import { readConfig } from '../apps/mock-erp/src/config.js';
const config = readConfig();
if (!config.native || config.port === 0 || (config.native.mode === 'public-test' ? config.host !== '0.0.0.0' : config.host !== '127.0.0.1' || !config.native.privateTestOnly)) throw new Error('Managed mock requires an explicit native mode and fixed listener');
await import('../apps/mock-erp/src/main.js');
