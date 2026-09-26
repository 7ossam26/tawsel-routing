import {readFile} from 'node:fs/promises';
import ExcelJS from 'exceljs';

const path=process.argv[2];if(!path)throw new Error('Workbook path required');const workbook=new ExcelJS.Workbook(),bytes=await readFile(path);await workbook.xlsx.load(bytes as unknown as Parameters<typeof workbook.xlsx.load>[0]);const attempts=workbook.getWorksheet('المحاولات');if(!attempts)throw new Error('Attempts worksheet missing');
const rows=[...Array(Math.max(0,attempts.rowCount-1))].map((_,index)=>{const row=attempts.getRow(index+2),name=row.getCell(7);return {taskId:row.getCell(2).value,recipientName:name.value,recipientCellType:name.type,outcome:row.getCell(8).value,collectionMinor:row.getCell(10).value,currency:row.getCell(11).value,exponent:row.getCell(12).value};});
console.log(JSON.stringify({snapshotId:workbook.getWorksheet('بيانات التقرير')?.getCell('B3').value,outcomeFilter:workbook.getWorksheet('بيانات التقرير')?.getCell('B13').value,sheets:workbook.worksheets.map(sheet=>({name:sheet.name,rows:sheet.rowCount})),rows}));
