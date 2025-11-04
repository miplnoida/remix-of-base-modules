import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Download, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";

interface ImportExportSectionProps {
  caseId: string;
  isOpen: boolean;
  onToggle: () => void;
}

export function ImportExportSection({ caseId, isOpen, onToggle }: ImportExportSectionProps) {
  const handleExport = (format: 'csv' | 'xlsx') => {
    // TODO: Implement export functionality
    toast.success(`Exporting to ${format.toUpperCase()}...`);
  };

  return (
    <Card className="border-2 shadow-md">
      <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={onToggle}>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-blue-600" />
            Import/Export
          </CardTitle>
          {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </div>
      </CardHeader>

      {isOpen && (
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 border rounded-lg bg-muted/50">
              <h4 className="font-semibold mb-3">Export Financial Data</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Export all financial records including arrears, payments, costs, waivers, and arrangements.
              </p>
              <div className="flex gap-2">
                <Button onClick={() => handleExport('csv')} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export as CSV
                </Button>
                <Button onClick={() => handleExport('xlsx')} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export as Excel
                </Button>
              </div>
            </div>

            <div className="text-xs text-muted-foreground">
              <p><strong>Note:</strong> Exported files include all sections with current totals and calculations.</p>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
