import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Upload, Download } from "lucide-react";
import { toast } from "sonner";

interface ImportExportSectionProps {
  caseId: string;
  isOpen: boolean;
  onToggle: () => void;
}

export function ImportExportSection({ caseId, isOpen, onToggle }: ImportExportSectionProps) {
  const handleImport = () => {
    // TODO: Implement Excel import with column mapping
    toast.info("Import functionality will be available soon");
  };

  const handleExport = (format: string) => {
    // TODO: Implement export via adapter
    toast.success(`Exporting data as ${format.toUpperCase()}...`);
  };

  return (
    <Card className="border-2 shadow-md">
      <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={onToggle}>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-blue-600" />
            Import/Export
          </CardTitle>
          {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </div>
      </CardHeader>

      {isOpen && (
        <CardContent>
          <div className="space-y-6">
            {/* Import Section */}
            <div className="space-y-3">
              <h4 className="font-semibold text-sm">Import Legacy Data</h4>
              <p className="text-sm text-muted-foreground">
                Upload Excel files from legacy systems (Debt Collection or Litigation format). You'll be able to map columns before importing.
              </p>
              <Button onClick={handleImport} variant="outline" className="w-full">
                <Upload className="h-4 w-4 mr-2" />
                Upload Excel File
              </Button>
            </div>

            {/* Export Section */}
            <div className="space-y-3">
              <h4 className="font-semibold text-sm">Export Financial Data</h4>
              <p className="text-sm text-muted-foreground">
                Export arrears, payments, costs, waivers, and arrangements for this case.
              </p>
              <div className="grid grid-cols-3 gap-2">
                <Button onClick={() => handleExport('csv')} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  CSV
                </Button>
                <Button onClick={() => handleExport('xlsx')} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Excel
                </Button>
                <Button onClick={() => handleExport('pdf')} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  PDF
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
