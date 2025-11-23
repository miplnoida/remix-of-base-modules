import React from 'react';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet, FileText, Download } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { exportToExcel, exportToPDF, ExportColumn, ExportData } from '@/utils/exportUtils';
import { useToast } from '@/hooks/use-toast';

interface ExportActionsProps {
  reportTitle: string;
  fileName: string;
  data: ExportData[];
  columns: ExportColumn[];
  additionalInfo?: { label: string; value: string }[];
  className?: string;
}

export const ExportActions: React.FC<ExportActionsProps> = ({
  reportTitle,
  fileName,
  data,
  columns,
  additionalInfo,
  className,
}) => {
  const { toast } = useToast();

  const handleExcelExport = async () => {
    try {
      await exportToExcel(data, columns, fileName, reportTitle);
      toast({
        title: 'Export Successful',
        description: 'Report has been exported to Excel with formulas.',
      });
    } catch (error) {
      console.error('Excel export error:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to export report to Excel.',
        variant: 'destructive',
      });
    }
  };

  const handlePDFExport = () => {
    try {
      exportToPDF(reportTitle, columns, data, fileName, additionalInfo);
      toast({
        title: 'Export Successful',
        description: 'Report has been exported to PDF.',
      });
    } catch (error) {
      console.error('PDF export error:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to export report to PDF.',
        variant: 'destructive',
      });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className={className}>
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleExcelExport}>
          <FileSpreadsheet className="h-4 w-4 mr-2 text-green-600" />
          Export to Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handlePDFExport}>
          <FileText className="h-4 w-4 mr-2 text-red-600" />
          Export to PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
