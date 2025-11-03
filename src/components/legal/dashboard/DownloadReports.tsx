import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import { useState } from 'react';

interface DownloadReportsProps {
  onExport: (type: string, format: 'csv' | 'xlsx' | 'pdf') => void;
}

export function DownloadReports({ onExport }: DownloadReportsProps) {
  const [caseloadFormat, setCaseloadFormat] = useState<'csv' | 'xlsx' | 'pdf'>('xlsx');
  const [financialFormat, setFinancialFormat] = useState<'csv' | 'xlsx' | 'pdf'>('xlsx');
  const [funnelFormat, setFunnelFormat] = useState<'csv' | 'xlsx' | 'pdf'>('pdf');
  const [hearingFormat, setHearingFormat] = useState<'csv' | 'xlsx' | 'pdf'>('xlsx');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-foreground">
          Download Reports
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Caseload Report */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <FileSpreadsheet className="h-4 w-4" />
              Caseload (filtered)
            </div>
            <Select value={caseloadFormat} onValueChange={(v) => setCaseloadFormat(v as any)}>
              <SelectTrigger className="w-full" aria-label="Select caseload format">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="xlsx">Excel</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
              </SelectContent>
            </Select>
            <Button
              className="w-full"
              onClick={() => onExport('caseload', caseloadFormat)}
              aria-label="Download caseload report"
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>

          {/* Financial Report */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <FileSpreadsheet className="h-4 w-4" />
              Financial (filtered)
            </div>
            <Select value={financialFormat} onValueChange={(v) => setFinancialFormat(v as any)}>
              <SelectTrigger className="w-full" aria-label="Select financial format">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="xlsx">Excel</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
              </SelectContent>
            </Select>
            <Button
              className="w-full"
              onClick={() => onExport('financial', financialFormat)}
              aria-label="Download financial report"
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>

          {/* Enforcement Funnel */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <FileText className="h-4 w-4" />
              Enforcement Funnel
            </div>
            <Select value={funnelFormat} onValueChange={(v) => setFunnelFormat(v as any)}>
              <SelectTrigger className="w-full" aria-label="Select funnel format">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="xlsx">Excel</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
              </SelectContent>
            </Select>
            <Button
              className="w-full"
              onClick={() => onExport('enforcement-funnel', funnelFormat)}
              aria-label="Download enforcement funnel report"
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>

          {/* Hearing Schedule */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <FileSpreadsheet className="h-4 w-4" />
              Hearing Schedule
            </div>
            <Select value={hearingFormat} onValueChange={(v) => setHearingFormat(v as any)}>
              <SelectTrigger className="w-full" aria-label="Select hearing schedule format">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="xlsx">Excel</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
              </SelectContent>
            </Select>
            <Button
              className="w-full"
              onClick={() => onExport('hearing-schedule', hearingFormat)}
              aria-label="Download hearing schedule"
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
