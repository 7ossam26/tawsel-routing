import {writeFile} from 'node:fs/promises';
import {deviceDemo} from '../apps/api/test/support/device-demo.js';
import {assertDeviceDemo,assertDeviceNotifications} from '../tests/erp-conformance/devices.js';
const report=await deviceDemo();assertDeviceDemo(report);assertDeviceNotifications(report.notifications,report.view.owner.accountId);
await writeFile(new URL('../.local/phase-20-demo.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log('PASS: two sessions → view existing round → lost takeover response → API restart → confirmed snapshot → new-owner arrival/outcome → durable former-phone evidence. Report: .local/phase-20-demo.json');
