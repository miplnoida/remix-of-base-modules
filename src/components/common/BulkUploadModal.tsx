import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { StandardModal } from './StandardModal';
import { Upload, Download, FileSpreadsheet, AlertTriangle, CheckCircle, X, Loader2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export interface BulkUploadField {
  key: string;
  label: string;
  required?: boolean;
  type?: 'string' | 'number' | 'date';
  validate?: (value: any, row: Record<string, any>) => string | null;
  /** Lookup values for validation (e.g. department names) */
  allowedValues?: string[];
}

interface ValidationError {
  row: number;
  field: string;
  message: string;
}

interface BulkUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  fields: BulkUploadField[];
  onImport: (data: Record<string, any>[]) => Promise<void> | void;
  templateName?: string;
}

type Step = 'upload' | 'preview' | 'errors' | 'importing' | 'done';

export const BulkUploadModal: React.FC<BulkUploadModalProps> = ({
  open,
  onOpenChange,
  title,
  fields,
  onImport,
  templateName = 'template',
}) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>('upload');
  const [parsedData, setParsedData] = useState<Record<string, any>[]>([]);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [importing, setImporting] = useState(false);
  const [importedCount, setImportedCount] = useState(0);

  const reset = useCallback(() => {
    setStep('upload');
    setParsedData([]);
    setErrors([]);
    setImporting(false);
    setImportedCount(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleClose = (o: boolean) => {
    if (!o) reset();
    onOpenChange(o);
  };

  // Download Excel template
  const downloadTemplate = async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Template');
    ws.columns = fields.map(f => ({
      header: f.label + (f.required ? ' *' : ''),
      key: f.key,
      width: Math.max(f.label.length + 4, 18),
    }));
    // Style header
    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF009B4C' } };
    ws.getRow(1).eachCell(cell => {
      cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
    });
    // Add sample row
    const sampleRow: Record<string, string> = {};
    fields.forEach(f => {
      if (f.type === 'date') sampleRow[f.key] = '2026-01-15';
      else if (f.type === 'number') sampleRow[f.key] = '0';
      else sampleRow[f.key] = `Sample ${f.label}`;
    });
    ws.addRow(sampleRow);

    const buffer = await wb.xlsx.writeBuffer();
    saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `${templateName}.xlsx`);
  };

  // Parse uploaded file
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const wb = new ExcelJS.Workbook();
      const buffer = await file.arrayBuffer();
      await wb.xlsx.load(buffer);
      const ws = wb.worksheets[0];
      if (!ws || ws.rowCount < 2) {
        toast({ title: 'Empty File', description: 'The uploaded file has no data rows.', variant: 'destructive' });
        return;
      }

      // Read headers from row 1
      const headerRow = ws.getRow(1);
      const headers: string[] = [];
      headerRow.eachCell((cell, colNum) => {
        headers[colNum] = String(cell.value || '').replace(/\s*\*$/, '').trim();
      });

      // Map header labels to field keys
      const labelToKey: Record<string, string> = {};
      fields.forEach(f => { labelToKey[f.label.toLowerCase()] = f.key; });

      const rows: Record<string, any>[] = [];
      for (let r = 2; r <= ws.rowCount; r++) {
        const row = ws.getRow(r);
        const record: Record<string, any> = {};
        let hasData = false;
        headers.forEach((header, colIdx) => {
          const key = labelToKey[header.toLowerCase()] || header;
          let val = row.getCell(colIdx).value;
          if (val !== null && val !== undefined && String(val).trim() !== '') hasData = true;
          // Handle ExcelJS date objects
          if (val instanceof Date) val = val.toISOString().slice(0, 10);
          // Handle rich text
          if (typeof val === 'object' && val !== null && 'richText' in val) {
            val = (val as any).richText?.map((t: any) => t.text).join('') || '';
          }
          record[key] = val;
        });
        if (hasData) rows.push(record);
      }

      if (rows.length === 0) {
        toast({ title: 'No Data', description: 'No valid data rows found in the file.', variant: 'destructive' });
        return;
      }

      // Validate
      const validationErrors: ValidationError[] = [];
      rows.forEach((row, idx) => {
        fields.forEach(f => {
          const val = row[f.key];
          // Required check
          if (f.required && (val === null || val === undefined || String(val).trim() === '')) {
            validationErrors.push({ row: idx + 2, field: f.label, message: `${f.label} is required` });
          }
          // Type check
          if (val !== null && val !== undefined && String(val).trim() !== '') {
            if (f.type === 'number' && isNaN(Number(val))) {
              validationErrors.push({ row: idx + 2, field: f.label, message: `${f.label} must be a number` });
            }
            if (f.type === 'date') {
              const d = new Date(val);
              if (isNaN(d.getTime())) {
                validationErrors.push({ row: idx + 2, field: f.label, message: `${f.label} must be a valid date` });
              }
            }
          }
          // Allowed values check
          if (f.allowedValues && val && !f.allowedValues.includes(String(val).trim())) {
            validationErrors.push({ row: idx + 2, field: f.label, message: `${f.label} must be one of: ${f.allowedValues.join(', ')}` });
          }
          // Custom validation
          if (f.validate) {
            const err = f.validate(val, row);
            if (err) validationErrors.push({ row: idx + 2, field: f.label, message: err });
          }
        });
      });

      // Check duplicates (by first required field)
      const firstReqField = fields.find(f => f.required);
      if (firstReqField) {
        const seen = new Set<string>();
        rows.forEach((row, idx) => {
          const val = String(row[firstReqField.key] || '').trim().toLowerCase();
          if (val && seen.has(val)) {
            validationErrors.push({ row: idx + 2, field: firstReqField.label, message: `Duplicate value: ${row[firstReqField.key]}` });
          }
          seen.add(val);
        });
      }

      setParsedData(rows);
      setErrors(validationErrors);
      setStep(validationErrors.length > 0 ? 'errors' : 'preview');
    } catch (err) {
      toast({ title: 'Parse Error', description: 'Failed to read the uploaded file. Please use the template format.', variant: 'destructive' });
    }
  };

  // Download error report
  const downloadErrorReport = async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Errors');
    ws.columns = [
      { header: 'Row Number', key: 'row', width: 12 },
      { header: 'Field Name', key: 'field', width: 25 },
      { header: 'Error Message', key: 'message', width: 50 },
    ];
    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDC2626' } };
    errors.forEach(e => ws.addRow(e));
    const buffer = await wb.xlsx.writeBuffer();
    saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `${templateName}_errors.xlsx`);
  };

  const handleImport = async () => {
    setStep('importing');
    setImporting(true);
    try {
      await onImport(parsedData);
      setImportedCount(parsedData.length);
      setStep('done');
      toast({ title: 'Import Successful', description: `${parsedData.length} records imported successfully.` });
    } catch (err) {
      toast({ title: 'Import Failed', description: 'An error occurred during import.', variant: 'destructive' });
      setStep('preview');
    } finally {
      setImporting(false);
    }
  };

  const renderFooter = () => {
    if (step === 'upload') return null;
    if (step === 'done') return (
      <Button onClick={() => handleClose(false)}>Close</Button>
    );
    if (step === 'importing') return (
      <Button disabled><Loader2 className="h-4 w-4 mr-2 animate-spin" />Importing...</Button>
    );
    if (step === 'errors') return (
      <>
        <Button variant="outline" onClick={downloadErrorReport}>
          <Download className="h-4 w-4 mr-2" />Download Error Report
        </Button>
        <Button variant="outline" onClick={reset}>Upload Again</Button>
        {parsedData.length > errors.length && (
          <Button onClick={handleImport}>
            Import Valid Rows ({parsedData.length - new Set(errors.map(e => e.row)).size} records)
          </Button>
        )}
      </>
    );
    // preview
    return (
      <>
        <Button variant="outline" onClick={reset}>Back</Button>
        <Button onClick={handleImport}>
          <Upload className="h-4 w-4 mr-2" />Import {parsedData.length} Records
        </Button>
      </>
    );
  };

  return (
    <StandardModal
      open={open}
      onOpenChange={handleClose}
      title={title}
      size="4xl"
      mode="create"
      footer={renderFooter()}
    >
      {step === 'upload' && (
        <div className="space-y-6">
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
            <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">Upload Excel File</p>
            <p className="text-sm text-muted-foreground mb-4">
              Upload an .xlsx file with your data. Download the template first to ensure correct format.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button variant="outline" onClick={downloadTemplate}>
                <Download className="h-4 w-4 mr-2" />Download Template
              </Button>
              <Button onClick={() => fileInputRef.current?.click()}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />Select File
              </Button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
          <div className="text-sm text-muted-foreground space-y-1">
            <p className="font-medium">Required fields:</p>
            <div className="flex flex-wrap gap-2">
              {fields.filter(f => f.required).map(f => (
                <Badge key={f.key} variant="outline">{f.label}</Badge>
              ))}
            </div>
          </div>
        </div>
      )}

      {step === 'preview' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-green-700 font-medium">{parsedData.length} records ready to import</span>
          </div>
          <div className="rounded-md border max-h-[400px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  {fields.slice(0, 6).map(f => (
                    <TableHead key={f.key}>{f.label}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {parsedData.slice(0, 20).map((row, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                    {fields.slice(0, 6).map(f => (
                      <TableCell key={f.key} className="max-w-[200px] truncate">
                        {row[f.key] !== null && row[f.key] !== undefined ? String(row[f.key]) : '-'}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {parsedData.length > 20 && (
            <p className="text-sm text-muted-foreground">Showing first 20 of {parsedData.length} records</p>
          )}
        </div>
      )}

      {step === 'errors' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <span className="text-destructive font-medium">{errors.length} validation errors found</span>
          </div>
          <div className="rounded-md border max-h-[400px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">Row</TableHead>
                  <TableHead className="w-40">Field</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {errors.map((err, i) => (
                  <TableRow key={i}>
                    <TableCell>{err.row}</TableCell>
                    <TableCell className="font-medium">{err.field}</TableCell>
                    <TableCell className="text-destructive">{err.message}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {step === 'importing' && (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-lg font-medium">Importing records...</p>
          <p className="text-sm text-muted-foreground">Please wait while your data is being imported.</p>
        </div>
      )}

      {step === 'done' && (
        <div className="flex flex-col items-center justify-center py-12">
          <CheckCircle className="h-12 w-12 text-green-600 mb-4" />
          <p className="text-lg font-medium text-green-700">Import Complete!</p>
          <p className="text-sm text-muted-foreground">{importedCount} records have been imported successfully.</p>
        </div>
      )}
    </StandardModal>
  );
};
