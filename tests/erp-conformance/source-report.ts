/** Public HTTP/report/XLSX proof. No Tawsel server or database dependency. */
import {createHash} from 'node:crypto';
import ExcelJS from 'exceljs';
import {ReportingClient} from '@tawsel/api-client/reporting';
import {publicValidator} from '@tawsel/api-client/validation';
import type {components} from '@tawsel/api-client';
type S=components['schemas'];

export async function verifySourceReport(fetcher:typeof fetch,roundId:string,taskIds:string[]){
 const client=new ReportingClient('company',fetcher),validate=publicValidator();
 const days=await client.list();
 if(days.items.length!==1)throw new Error('Expected one dedicated conformance workday');
 const report=await client.workday(days.items[0]!.workdayId,{roundId});
 if(!validate('reporting.schema.json#/$defs/Workday',report))throw new Error('Report violates released schema');
 if(report.counts.shipments!==2||report.counts.processedShipments!==2||report.counts.partialShipments!==1||report.counts.noAnswerShipments!==1||report.counts.fullShipments!==0)throw new Error('Report confused processed and delivered shipments');
 if(report.collections.length!==1||report.collections[0]!.reportedMinor!=='15000'||report.collections[0]!.currency!=='EGP'||report.collections[0]!.exponent!==2)throw new Error('Report lost exact reported money');
 if(report.pieces?.delivered!==1||report.pieces.held!==5)throw new Error('Report lost remaining custody');
 if(JSON.stringify(report.attempts.map(a=>a.taskId).sort())!==JSON.stringify([...taskIds].sort()))throw new Error('Report merged same-address tasks');
 const status=await client.requestExcel(report.workdayId,report.snapshotId,{roundId});
 if(!validate('report-export.schema.json#/$defs/Status',status)||status.snapshotId!==report.snapshotId||status.status!=='ready')throw new Error('Export does not match authorized report snapshot');
 const download=await client.downloadExcel(status.exportId),bytes=Buffer.from(await download.blob.arrayBuffer());
 const workbook=new ExcelJS.Workbook();await workbook.xlsx.load(bytes as unknown as Parameters<typeof workbook.xlsx.load>[0]);
 const sheet=workbook.getWorksheet('المحاولات');if(!sheet||sheet.rowCount!==3)throw new Error('Expected two actual exported attempts');
 const rows=[2,3].map(index=>{const row=sheet.getRow(index);return {taskId:row.getCell(2).value,outcome:row.getCell(8).value,reportedMinor:row.getCell(10).value,currency:row.getCell(11).value,exponent:row.getCell(12).value};});
 if(workbook.getWorksheet('بيانات التقرير')?.getCell('B3').value!==report.snapshotId||JSON.stringify(rows.map(r=>r.taskId).sort())!==JSON.stringify([...taskIds].sort()))throw new Error('Workbook differs from report identity');
 const partial=rows.find(r=>r.taskId===taskIds[0]);
 if(partial?.reportedMinor!=='15000'||partial.currency!=='EGP'||String(partial.exponent)!=='2')throw new Error('Workbook lost exact minor units');
 for(const worksheet of workbook.worksheets)worksheet.eachRow(row=>row.eachCell(cell=>{if(cell.type===ExcelJS.ValueType.Formula)throw new Error('Unexpected executable formula');}));
 return {report:report as S['ReportWorkday'],export:{snapshotId:status.snapshotId,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),rows,formulaCells:0}};
}
