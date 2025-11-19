import React from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileSpreadsheet } from 'lucide-react';

interface ReportLayoutProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  filterPanel: React.ReactNode;
  summaryMetrics: React.ReactNode;
  chartArea: React.ReactNode;
  tableArea: React.ReactNode;
  onExportCSV?: () => void;
  onExportPDF?: () => void;
}

export function ReportLayout({
  title,
  subtitle,
  breadcrumbs,
  filterPanel,
  summaryMetrics,
  chartArea,
  tableArea,
  onExportCSV,
  onExportPDF
}: ReportLayoutProps) {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title={title}
        subtitle={subtitle}
        breadcrumbs={breadcrumbs}
      />

      {/* Filter Panel */}
      {filterPanel}

      {/* Export Actions */}
      <div className="flex justify-end gap-2">
        {onExportCSV && (
          <Button variant="outline" size="sm" onClick={onExportCSV}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        )}
        {onExportPDF && (
          <Button variant="outline" size="sm" onClick={onExportPDF}>
            <Download className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
        )}
      </div>

      {/* Summary Metrics */}
      {summaryMetrics}

      {/* Chart Area */}
      {chartArea}

      {/* Table Area */}
      {tableArea}
    </div>
  );
}
