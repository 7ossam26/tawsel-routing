import { readConfig } from '../apps/mock-erp/src/config.js';
const config = readConfig();
if (config.host !== '127.0.0.1' || !config.native?.privateTestOnly || config.port === 0) throw new Error('Managed private mock requires native test mode and a fixed IPv4 loopback port');
await import('../apps/mock-erp/src/main.js');
