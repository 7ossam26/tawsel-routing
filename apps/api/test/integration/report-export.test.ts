import {afterEach,beforeEach,expect,test} from 'vitest';
import {randomUUID} from 'node:crypto';
import Fastify from 'fastify';
import ExcelJS from 'exceljs';
import {createTestDatabase} from '../support/database.js';
import {prepareAccessFixture,principals} from '../support/access-fixture.js';
import {outcomeCompanyFixture} from '../support/outcome-fixture.js';
import {send} from '../support/provisioning-fixture.js';
import {money} from '../../src/outcomes/arithmetic.js';
import {Outcomes} from '../../src/outcomes/service.js';
import {Reporting} from '../../src/reporting/service.js';
import {ReportExports,ReportExportStore} from '../../src/reporting/export.js';
import {reportingRoutes} from '../../src/reporting/routes.js';
import type {AuthConfig} from '../../src/auth/config.js';

let db:Awaited<ReturnType<typeof createTestDatabase>>;
const closers:(()=>Promise<unknown>)[]=[];
beforeEach(async()=>{db=await createTestDatabase();await prepareAccessFixture(db.pool);});
afterEach(async()=>{for(const close of closers.splice(0).reverse())await close();await db?.close();});

async function fixture(){
 const f=await outcomeCompanyFixture(db,[{recipientName:'=HYPERLINK("https://evil.invalid","اسم")'},{recipientName:'عميل آمن'}]);closers.push(()=>f.close());
 const grant=await send(f.app,f.source.token,f.source.command('role.defineCapabilities',{externalId:'role',sourceRevision:2,name:'Driver',capabilities:['execution.own','correction.own','reports.read','reports.export']}));expect(grant.statusCode,grant.body).toBe(200);
 const result=await new Outcomes(db.pool).command(f.principal,f.make(0,'outcome.recordFull',{reportedCollection:money(35000)}));expect(result.receipt.businessStatus).toBe('accepted');return f;
}

test('real XLSX preserves the authorized report rows, exact minor units and formula-looking text',async()=>{
 const f=await fixture(),reporting=new Reporting(db.pool),report=await reporting.workday(f.principal,f.round.workdayId),exports=new ReportExports(db.pool);
 const status=await exports.create(f.principal,'company',report.workdayId,{snapshotId:report.snapshotId});expect(status).toMatchObject({status:'ready',snapshotId:report.snapshotId});expect(status.fileName).toMatch(/\.xlsx$/);expect(status.bytes).toBeGreaterThan(1000);
 expect((await exports.create(f.principal,'company',report.workdayId,{snapshotId:report.snapshotId})).exportId).toBe(status.exportId);
 await expect(exports.download(f.principal,'personal',status.exportId)).rejects.toMatchObject({statusCode:404});
 const download=await exports.download(f.principal,'company',status.exportId);expect(download.buffer.subarray(0,2).toString()).toBe('PK');
 const workbook=new ExcelJS.Workbook();await workbook.xlsx.load(download.buffer as unknown as ExcelJS.Buffer);
 const meta=workbook.getWorksheet('بيانات التقرير')!,summary=workbook.getWorksheet('الملخص')!,collections=workbook.getWorksheet('التحصيل')!,attempts=workbook.getWorksheet('المحاولات')!;
 expect(meta.getCell('B3').value).toBe(report.snapshotId);expect(attempts.rowCount-1).toBe(report.attempts.length);expect(collections.getCell('C2').value).toBe(report.collections[0]!.reportedMinor);
 const formulaRow=[...Array(attempts.rowCount-1)].map((_,index)=>attempts.getRow(index+2)).find(row=>String(row.getCell(7).value).startsWith('='))!,formulaCell=formulaRow.getCell(7);expect(formulaCell.value).toBe('=HYPERLINK("https://evil.invalid","اسم")');expect(formulaCell.type).toBe(ExcelJS.ValueType.String);expect((formulaCell.value as {formula?:string}).formula).toBeUndefined();
 const values=new Map<string,unknown>();summary.eachRow((row,index)=>{if(index>1)values.set(String(row.getCell(1).value),row.getCell(2).value);});expect(values.get('الشحنات')).toBe(report.counts.shipments);expect(values.get('المحاولات ذات النتيجة')).toBe(report.counts.processedAttempts);expect(values.get('مع المندوب')).toBe(report.pieces!.held);
});

test('frozen export survives report drift, while creation and every download reauthorize current scope',async()=>{
 const f=await fixture(),reports=new Reporting(db.pool),before=await reports.workday(f.principal,f.round.workdayId),exports=new ReportExports(db.pool),created=await exports.create(f.principal,'company',before.workdayId,{snapshotId:before.snapshotId});
 expect((await new Outcomes(db.pool).command(f.principal,f.make(1,'outcome.recordNoAnswer',{},1))).receipt.businessStatus).toBe('accepted');
 const after=await reports.workday(f.principal,f.round.workdayId);expect(after.snapshotId).not.toBe(before.snapshotId);await expect(exports.create(f.principal,'company',before.workdayId,{snapshotId:before.snapshotId})).rejects.toMatchObject({code:'snapshot_changed'});
 const frozen=await exports.download(f.principal,'company',created.exportId),workbook=new ExcelJS.Workbook();await workbook.xlsx.load(frozen.buffer as unknown as ExcelJS.Buffer);expect(workbook.getWorksheet('بيانات التقرير')!.getCell('B3').value).toBe(before.snapshotId);const attempts=workbook.getWorksheet('المحاولات')!,safeRow=[...Array(attempts.rowCount-1)].map((_,index)=>attempts.getRow(index+2)).find(row=>row.getCell(7).value==='عميل آمن');expect(safeRow?.getCell(8).value).toBe('لم تنتهِ');
 await expect(exports.status(principals.personal,'company',created.exportId)).rejects.toMatchObject({statusCode:404});
 await expect(reports.exportSnapshot(f.principal,before.workdayId,{snapshotId:after.snapshotId,branchId:randomUUID()})).rejects.toMatchObject({statusCode:403});
 const revoke=await send(f.app,f.source.token,f.source.command('role.defineCapabilities',{externalId:'role',sourceRevision:3,name:'Driver',capabilities:['execution.own','correction.own','reports.read']}));expect(revoke.statusCode,revoke.body).toBe(200);await expect(exports.download(f.principal,'company',created.exportId)).rejects.toMatchObject({statusCode:403});
});

test('HTTP creation returns a real workbook; expired bytes are removed with an explicit retry state',async()=>{
 const f=await fixture(),report=await new Reporting(db.pool).workday(f.principal,f.round.workdayId);let now=Date.parse('2026-09-26T00:00:00.000Z');const exports=new ReportExports(db.pool,new ReportExportStore(()=>now,1000)),app=Fastify({ajv:{customOptions:{removeAdditional:false}}});closers.push(()=>app.close());
 const config={origin:'http://localhost',encryptionKey:Buffer.alloc(32,1),sessionSeconds:3600,issuers:{}} as AuthConfig;await app.register(scope=>reportingRoutes(scope,db.pool,config,(_r,_kind,work)=>work(f.principal),new Reporting(db.pool),exports));
 const created=await app.inject({method:'POST',url:`/api/v1/reports/workdays/${report.workdayId}/exports?kind=company`,payload:{snapshotId:report.snapshotId,filters:{}}});expect(created.statusCode,created.body).toBe(201);const status=created.json() as {exportId:string};
 const download=await app.inject({url:`/api/v1/report-exports/${status.exportId}/download?kind=company`});expect(download.statusCode,download.body).toBe(200);expect(download.headers['content-type']).toContain('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');expect(download.rawPayload.subarray(0,2).toString()).toBe('PK');
 now+=1001;const expired=await app.inject({url:`/api/v1/report-exports/${status.exportId}?kind=company`});expect(expired.statusCode,expired.body).toBe(200);expect(expired.json()).toMatchObject({status:'expired',downloadUrl:null});const gone=await app.inject({url:`/api/v1/report-exports/${status.exportId}/download?kind=company`});expect(gone.statusCode,gone.body).toBe(410);expect(gone.json()).toMatchObject({code:'export_expired'});
});
