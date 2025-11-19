import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ExportButtonProps {
  data: any[];
  filename?: string;
  columns?: { key: string; label: string }[];
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

export function ExportButton({
  data,
  filename = "export",
  columns,
  variant = "outline",
  size = "sm",
}: ExportButtonProps) {
  const { toast } = useToast();

  // Convert data to CSV
  const convertToCSV = (data: any[], columns?: { key: string; label: string }[]) => {
    if (!data || data.length === 0) return "";

    // Determine headers
    const headers = columns
      ? columns.map((col) => col.label)
      : Object.keys(data[0]);

    // Determine keys to extract
    const keys = columns ? columns.map((col) => col.key) : Object.keys(data[0]);

    // Build CSV rows
    const csvRows = [
      headers.join(","), // Header row
      ...data.map((row) =>
        keys
          .map((key) => {
            const value = row[key];
            // Escape commas and quotes
            if (value === null || value === undefined) return "";
            const stringValue = String(value).replace(/"/g, '""');
            return stringValue.includes(",") ? `"${stringValue}"` : stringValue;
          })
          .join(",")
      ),
    ];

    return csvRows.join("\n");
  };

  // Download file
  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    try {
      const csv = convertToCSV(data, columns);
      downloadFile(csv, `${filename}.csv`, "text/csv");
      toast({
        title: "Export Successful",
        description: `Exported ${data.length} records to CSV`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export data to CSV",
        variant: "destructive",
      });
    }
  };

  const handleExportJSON = () => {
    try {
      const json = JSON.stringify(data, null, 2);
      downloadFile(json, `${filename}.json`, "application/json");
      toast({
        title: "Export Successful",
        description: `Exported ${data.length} records to JSON`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export data to JSON",
        variant: "destructive",
      });
    }
  };

  const handleExportExcel = () => {
    // For Excel, we'll export as CSV with .xlsx extension
    // In a real app, you'd use a library like xlsx or exceljs
    try {
      const csv = convertToCSV(data, columns);
      downloadFile(csv, `${filename}.xlsx`, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      toast({
        title: "Export Successful",
        description: `Exported ${data.length} records to Excel`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export data to Excel",
        variant: "destructive",
      });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} disabled={!data || data.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 bg-background z-50">
        <DropdownMenuLabel>Export Format</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleExportCSV} className="cursor-pointer">
          <FileText className="h-4 w-4 mr-2" />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportExcel} className="cursor-pointer">
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Export as Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportJSON} className="cursor-pointer">
          <FileText className="h-4 w-4 mr-2" />
          Export as JSON
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
