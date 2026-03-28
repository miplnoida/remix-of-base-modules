import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Download, FileSpreadsheet, FileText, FileDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { generateSSBReport } from '@/lib/reportTemplate';

export interface ExportColumn {
  key: string;
  header: string;
  width?: number;
}

interface ExportDropdownProps {
  data: any[];
  columns: ExportColumn[];
  fileName: string;
  title?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export const ExportDropdown: React.FC<ExportDropdownProps> = ({
  data,
  columns,
  fileName,
  title,
  variant = 'outline',
  size = 'sm',
}) => {
  const { toast } = useToast();

  const exportExcel = async () => {
    try {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Data');
      ws.columns = columns.map(c => ({ header: c.header, key: c.key, width: c.width || 18 }));
      ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF009B4C' } };
      data.forEach(row => {
        const mapped: Record<string, any> = {};
        columns.forEach(c => { mapped[c.key] = row[c.key] ?? ''; });
        ws.addRow(mapped);
      });
      ws.eachRow(row => {
        row.eachCell(cell => {
          cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
        });
      });
      const buffer = await wb.xlsx.writeBuffer();
      saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `${fileName}.xlsx`);
      toast({ title: 'Export Successful', description: `Exported ${data.length} records to Excel` });
    } catch {
      toast({ title: 'Export Failed', description: 'Failed to export to Excel', variant: 'destructive' });
    }
  };

  const exportCSV = () => {
    try {
      const escape = (v: any) => {
        if (v === null || v === undefined) return '';
        const s = String(v);
        return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
      };
      const csv = [
        columns.map(c => escape(c.header)).join(','),
        ...data.map(row => columns.map(c => escape(row[c.key])).join(',')),
      ].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      saveAs(blob, `${fileName}.csv`);
      toast({ title: 'Export Successful', description: `Exported ${data.length} records to CSV` });
    } catch {
      toast({ title: 'Export Failed', description: 'Failed to export to CSV', variant: 'destructive' });
    }
  };

  const exportPDF = () => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.setTextColor(0, 155, 76);
      doc.text(title || fileName, 14, 18);
      doc.setFontSize(9);
      doc.setTextColor(128);
      doc.text(`Generated: ${new Date().toLocaleDateString()} | Records: ${data.length}`, 14, 26);

      const headers = columns.map(c => c.header);
      const body = data.map(row => columns.map(c => {
        const v = row[c.key];
        if (v === null || v === undefined) return '-';
        if (typeof v === 'number') return v.toLocaleString();
        return String(v);
      }));

      autoTable(doc, {
        head: [headers],
        body,
        startY: 32,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [0, 155, 76], textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { top: 10, bottom: 15 },
      });

      const pages = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pages; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(150);
        doc.text(`Page ${i} of ${pages}`, doc.internal.pageSize.getWidth() / 2, doc.internal.pageSize.getHeight() - 8, { align: 'center' });
      }

      doc.save(`${fileName}.pdf`);
      toast({ title: 'Export Successful', description: `Exported ${data.length} records to PDF` });
    } catch {
      toast({ title: 'Export Failed', description: 'Failed to export to PDF', variant: 'destructive' });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} disabled={!data || data.length === 0}>
          <Download className="h-4 w-4 mr-2" />Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 bg-background z-50">
        <DropdownMenuLabel>Export Format</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={exportExcel} className="cursor-pointer">
          <FileSpreadsheet className="h-4 w-4 mr-2" />Export as Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportCSV} className="cursor-pointer">
          <FileText className="h-4 w-4 mr-2" />Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportPDF} className="cursor-pointer">
          <FileDown className="h-4 w-4 mr-2" />Export as PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
