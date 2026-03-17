import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export interface ReportColumn {
  header: string;
  key: string;
  width?: number;
}

export async function exportReportToExcel(
  data: any[],
  columns: ReportColumn[],
  filename: string,
  sheetName = 'Report'
) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(sheetName);

  ws.columns = columns.map(col => ({
    header: col.header,
    key: col.key,
    width: col.width || 20,
  }));

  // Style header row
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE8F5E9' },
  };

  data.forEach(row => {
    const mapped: Record<string, any> = {};
    columns.forEach(col => {
      mapped[col.key] = row[col.key] ?? '';
    });
    ws.addRow(mapped);
  });

  const buffer = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buffer], { type: 'application/octet-stream' }), `${filename}.xlsx`);
}
