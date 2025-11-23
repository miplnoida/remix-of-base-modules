import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface ExportColumn {
  header: string;
  key: string;
  width?: number;
  formula?: string; // Excel formula for this column
}

export interface ExportData {
  [key: string]: any;
}

/**
 * Export tabular data to Excel with formula support
 */
export const exportToExcel = async (
  data: ExportData[],
  columns: ExportColumn[],
  fileName: string,
  sheetName: string = 'Sheet1'
) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  // Set columns with headers and widths
  worksheet.columns = columns.map(col => ({
    header: col.header,
    key: col.key,
    width: col.width || 15,
  }));

  // Style header row
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF009B4C' }, // Primary green
  };
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

  // Add data rows
  data.forEach((row, rowIndex) => {
    const excelRow = worksheet.addRow(row);
    
    // Apply formulas if defined
    columns.forEach((col, colIndex) => {
      if (col.formula) {
        const cell = excelRow.getCell(colIndex + 1);
        // Replace {row} placeholder with actual row number (Excel is 1-indexed, +1 for header)
        const formula = col.formula.replace(/{row}/g, String(rowIndex + 2));
        cell.value = { formula };
      }
    });
  });

  // Add borders to all cells
  worksheet.eachRow((row, rowNumber) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });
  });

  // Generate Excel file
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
  saveAs(blob, `${fileName}.xlsx`);
};

/**
 * Export report to PDF
 */
export const exportToPDF = (
  title: string,
  columns: ExportColumn[],
  data: ExportData[],
  fileName: string,
  additionalInfo?: { label: string; value: string }[]
) => {
  const doc = new jsPDF();
  
  // Add title
  doc.setFontSize(18);
  doc.setTextColor(0, 155, 76); // Primary green
  doc.text(title, 14, 20);

  // Add additional info if provided
  let yPosition = 30;
  if (additionalInfo && additionalInfo.length > 0) {
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    additionalInfo.forEach((info) => {
      doc.text(`${info.label}: ${info.value}`, 14, yPosition);
      yPosition += 6;
    });
    yPosition += 5;
  }

  // Prepare table data
  const headers = columns.map(col => col.header);
  const tableData = data.map(row => 
    columns.map(col => {
      const value = row[col.key];
      // Format values for display
      if (value === null || value === undefined) return '-';
      if (typeof value === 'number') return value.toLocaleString();
      return String(value);
    })
  );

  // Add table
  autoTable(doc, {
    head: [headers],
    body: tableData,
    startY: yPosition,
    theme: 'grid',
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [0, 155, 76], // Primary green
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // Light gray
    },
    margin: { top: 10, bottom: 10 },
  });

  // Add footer with date
  const pageCount = (doc as any).internal.getNumberOfPages();
  doc.setFontSize(8);
  doc.setTextColor(128);
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.text(
      `Generated on ${new Date().toLocaleDateString()} - Page ${i} of ${pageCount}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }

  // Save PDF
  doc.save(`${fileName}.pdf`);
};

/**
 * Format currency values for export
 */
export const formatCurrency = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return '-';
  return `XCD ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

/**
 * Format date values for export
 */
export const formatDate = (date: string | Date | null | undefined): string => {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US');
};
