import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileSpreadsheet, FileText, Printer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { exportToExcel, exportToPDF, ExportColumn, ExportData } from "@/utils/exportUtils";

interface ExportActionsProps {
  reportTitle: string;
  fileName: string;
  data: ExportData[];
  columns: ExportColumn[];
  additionalInfo?: { label: string; value: string }[];
  className?: string;
}

export function ExportActions({
  reportTitle,
  fileName,
  data,
  columns,
  additionalInfo,
  className = "",
}: ExportActionsProps) {
  const { toast } = useToast();

  const handleExcelExport = async () => {
    try {
      await exportToExcel(data, columns, fileName, reportTitle);
      toast({
        title: "Export Successful",
        description: "Report exported to Excel with formulas preserved.",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export to Excel.",
        variant: "destructive",
      });
    }
  };

  const handlePDFExport = () => {
    try {
      exportToPDF(reportTitle, columns, data, fileName, additionalInfo);
      toast({
        title: "Export Successful",
        description: "Report exported to PDF.",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export to PDF.",
        variant: "destructive",
      });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className={`no-print flex gap-2 ${className}`}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Export
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 bg-background border shadow-lg z-50">
          <DropdownMenuLabel>Export Options</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleExcelExport} className="cursor-pointer">
            <FileSpreadsheet className="h-4 w-4 mr-2 text-green-600" />
            Excel (with formulas)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handlePDFExport} className="cursor-pointer">
            <FileText className="h-4 w-4 mr-2 text-red-600" />
            PDF (data only)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Button variant="outline" onClick={handlePrint}>
        <Printer className="h-4 w-4 mr-2" />
        Print
      </Button>
    </div>
  );
}
