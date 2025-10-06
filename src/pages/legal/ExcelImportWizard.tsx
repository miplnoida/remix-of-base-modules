import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

type ImportType = 'arrears' | 'payments' | 'costs';

interface ExcelImportWizardProps {
  open: boolean;
  onClose: () => void;
  type: ImportType;
  caseId?: string;
}

interface ImportRow {
  [key: string]: string | number;
}

export function ExcelImportWizard({ open, onClose, type, caseId }: ExcelImportWizardProps) {
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<'upload' | 'map' | 'preview' | 'confirm'>('upload');
  const [previewData, setPreviewData] = useState<ImportRow[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});

  const getImportConfig = () => {
    switch (type) {
      case 'arrears':
        return {
          title: 'Import Periodized Arrears',
          description: 'Upload Excel file with employer arrears by period',
          requiredColumns: ['EmployerRegNo', 'PeriodFrom', 'PeriodTo', 'Amount', 'Type', 'IsEstimated'],
          sampleData: [
            { EmployerRegNo: 'EMP-001', PeriodFrom: '2023-01', PeriodTo: '2023-03', Amount: '15000', Type: 'Arrears', IsEstimated: 'N' },
            { EmployerRegNo: 'EMP-001', PeriodFrom: '2023-04', PeriodTo: '2023-06', Amount: '12000', Type: 'Current', IsEstimated: 'Y' }
          ]
        };
      case 'payments':
        return {
          title: 'Import Payments',
          description: 'Upload Excel file with payment records',
          requiredColumns: ['EmployerRegNo', 'PaymentDate', 'Amount', 'AppliedPeriodFrom', 'AppliedPeriodTo'],
          sampleData: [
            { EmployerRegNo: 'EMP-001', PaymentDate: '2024-01-15', Amount: '5000', AppliedPeriodFrom: '2023-01', AppliedPeriodTo: '2023-03' }
          ]
        };
      case 'costs':
        return {
          title: 'Import Court Costs',
          description: 'Upload Excel file with court costs by stage',
          requiredColumns: ['CaseNumber', 'Stage', 'Amount', 'Date'],
          sampleData: [
            { CaseNumber: 'SSB/LGL/2024/001', Stage: 'Filing', Amount: '500', Date: '2024-01-15' }
          ]
        };
    }
  };

  const config = getImportConfig();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      // In real app, parse Excel here
      // For now, use sample data
      setPreviewData(config.sampleData);
      setStep('map');
    }
  };

  const handleColumnMap = (sourceColumn: string, targetColumn: string) => {
    setColumnMapping(prev => ({ ...prev, [sourceColumn]: targetColumn }));
  };

  const handlePreview = () => {
    setStep('preview');
  };

  const handleImport = () => {
    setStep('confirm');
    setTimeout(() => {
      toast.success(`Successfully imported ${previewData.length} records`);
      onClose();
      // Reset state
      setStep('upload');
      setFile(null);
      setPreviewData([]);
      setColumnMapping({});
    }, 1500);
  };

  const handleCancel = () => {
    setStep('upload');
    setFile(null);
    setPreviewData([]);
    setColumnMapping({});
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            {config.title}
          </DialogTitle>
          <DialogDescription>{config.description}</DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Required Columns</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {config.requiredColumns.map(col => (
                    <code key={col} className="px-2 py-1 bg-muted rounded text-sm">
                      {col}
                    </code>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <Input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <Label htmlFor="file-upload" className="cursor-pointer">
                <div className="flex flex-col items-center gap-3">
                  <Upload className="h-12 w-12 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Click to upload Excel file</p>
                    <p className="text-sm text-muted-foreground">or drag and drop</p>
                  </div>
                  <p className="text-xs text-muted-foreground">.xlsx, .xls, or .csv files</p>
                </div>
              </Label>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Sample Format</CardTitle>
                <CardDescription>Your Excel file should follow this structure</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      {config.requiredColumns.map(col => (
                        <TableHead key={col}>{col}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {config.sampleData.map((row, idx) => (
                      <TableRow key={idx}>
                        {config.requiredColumns.map(col => (
                          <TableCell key={col} className="font-mono text-xs">
                            {row[col]}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        {step === 'map' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Column Mapping</CardTitle>
                <CardDescription>Map your Excel columns to required fields</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {config.requiredColumns.map(reqCol => (
                  <div key={reqCol} className="grid grid-cols-2 gap-4 items-center">
                    <Label className="text-right font-medium">{reqCol}</Label>
                    <Select
                      value={columnMapping[reqCol] || reqCol}
                      onValueChange={(value) => handleColumnMap(reqCol, value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={`Select column for ${reqCol}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.keys(previewData[0] || {}).map(col => (
                          <SelectItem key={col} value={col}>{col}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleCancel}>Cancel</Button>
              <Button onClick={handlePreview}>Preview Import</Button>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Preview Import
                </CardTitle>
                <CardDescription>
                  Review {previewData.length} record{previewData.length !== 1 ? 's' : ''} before importing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      {config.requiredColumns.map(col => (
                        <TableHead key={col}>{col}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.slice(0, 10).map((row, idx) => (
                      <TableRow key={idx}>
                        {config.requiredColumns.map(col => (
                          <TableCell key={col} className="text-sm">
                            {row[col]}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {previewData.length > 10 && (
                  <p className="text-sm text-muted-foreground mt-4 text-center">
                    ... and {previewData.length - 10} more record{previewData.length - 10 !== 1 ? 's' : ''}
                  </p>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleCancel}>Cancel</Button>
              <Button onClick={handleImport}>Import {previewData.length} Records</Button>
            </div>
          </div>
        )}

        {step === 'confirm' && (
          <div className="py-8 text-center space-y-4">
            <CheckCircle className="h-16 w-16 text-green-600 mx-auto" />
            <div>
              <h3 className="text-lg font-semibold">Import Successful</h3>
              <p className="text-sm text-muted-foreground">
                {previewData.length} record{previewData.length !== 1 ? 's' : ''} imported successfully
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
