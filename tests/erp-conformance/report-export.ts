import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import type {components} from '../../packages/api-client/src/schema.js';

type Status=components['schemas']['ReportExportStatus'];
type Capture={evidenceClass:string;workdayId:string;export:Status;downloadStatus:number;revokedDownloadStatus:number;fileName:string;snapshotId:string;sheets:{name:string;rows:number}[];formulaText:{value:unknown;type:string}};
function check(condition:unknown,message:string):asserts condition{if(!condition)throw new Error(message);}
export function verifyReportExport(capture:Capture){
 const item=capture.export;check(item.status==='ready','captured export must be ready');check(item.snapshotId===capture.snapshotId,'workbook and response snapshot must match');check(item.fileName===capture.fileName&&item.fileName.endsWith('.xlsx'),'download must retain the declared XLSX filename');check(item.bytes>1000&&item.bytes<=4*1024*1024,'artifact bytes must be non-empty and bounded');check(item.downloadUrl?.includes(item.exportId),'download URL must name the authenticated export job');check(Date.parse(item.expiresAt)>Date.parse(item.createdAt),'export must have a bounded future expiry');
 check(capture.downloadStatus===200,'authorized browser download must succeed');check(capture.revokedDownloadStatus===403,'current export revocation must deny download');check(capture.formulaText.type==='string'&&typeof capture.formulaText.value==='string'&&capture.formulaText.value.startsWith('='),'formula-looking recipient text must remain literal text');
 for(const name of ['بيانات التقرير','الملخص','التحصيل','المحاولات','سجل النتائج','التوقيت','الإرجاع'])check(capture.sheets.some(sheet=>sheet.name===name),'missing workbook sheet '+name);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const path=process.argv[2];if(!path)throw new Error('Pass the public Phase 37 browser evidence JSON.');verifyReportExport(JSON.parse(await readFile(path,'utf8')) as Capture);console.log('PASS: public report-export response/workbook evidence; not a commercial ERP, Keycloak or physical-device claim.');}
