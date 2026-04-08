import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Download, Printer, AlertTriangle, CheckCircle2, Clock, XCircle } from 'lucide-react';
import logo from '@/assets/stkitts-logo.png';
import type { MgmtResponseReportData } from '@/lib/audit/managementResponseReportMapper';
import { generateManagementResponsePDF } from './ManagementResponseReportPDFExport';

interface Props {
  data: MgmtResponseReportData;
  onClose: () => void;
}

const RISK_STYLES: Record<string, string> = {
  Critical: 'bg-red-100 text-red-800 border-red-200',
  High: 'bg-orange-100 text-orange-800 border-orange-200',
  Medium: 'bg-amber-100 text-amber-800 border-amber-200',
  Low: 'bg-emerald-100 text-emerald-800 border-emerald-200',
};

const STATUS_STYLES: Record<string, string> = {
  Open: 'bg-blue-100 text-blue-800',
  'In Progress': 'bg-amber-100 text-amber-800',
  Completed: 'bg-emerald-100 text-emerald-800',
  Closed: 'bg-muted text-muted-foreground',
  Overdue: 'bg-red-100 text-red-800',
};

export function ManagementResponseReportPreview({ data, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto print:static print:z-auto">
      {/* Action Bar */}
      <div className="sticky top-0 z-10 bg-background border-b px-4 py-2 flex items-center justify-between print:hidden">
        <Button variant="ghost" size="sm" onClick={onClose}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Close Preview
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-1" /> Print
          </Button>
          <Button size="sm" onClick={() => generateManagementResponsePDF(data)}>
            <Download className="h-4 w-4 mr-1" /> Export PDF
          </Button>
        </div>
      </div>

      {/* Report Content */}
      <div className="max-w-[1100px] mx-auto p-8 print:p-0 print:max-w-none">
        {/* Cover / Header */}
        <div className="border-b-4 border-primary pb-6 mb-8">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <img src={logo} alt="Logo" className="h-14 w-14 object-contain" />
              <div>
                <h1 className="text-lg font-bold text-primary uppercase tracking-wide">Social Security Board</h1>
                <p className="text-xs text-muted-foreground">St. Kitts and Nevis · Internal Audit Department</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-right">
              Bay Road, P.O. Box 79<br />Basseterre, St. Kitts<br />Tel: (869) 465-2521
            </p>
          </div>

          <div className="mt-8 text-center">
            <h2 className="text-2xl font-bold text-primary">Management Response Report</h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 text-sm">
            {[
              ['Audit Name', data.auditName],
              ['Department', data.department],
              ['Audit Period', data.auditPeriod],
              ['Report Date', data.reportDate],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-xs font-medium text-muted-foreground">{label}</p>
                <p className="font-semibold">{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <SummaryCard icon={AlertTriangle} label="Total Findings" value={data.summary.totalFindings} color="text-primary" />
          <SummaryCard icon={Clock} label="Open" value={data.summary.openFindings} color="text-amber-600" />
          <SummaryCard icon={CheckCircle2} label="Closed" value={data.summary.closedFindings} color="text-emerald-600" />
          <SummaryCard icon={XCircle} label="Overdue Actions" value={data.summary.overdueActions} color="text-destructive" />
        </div>

        {/* Main Table */}
        <div className="overflow-x-auto border rounded-lg">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-primary text-primary-foreground">
                <th className="p-2.5 text-left text-xs font-semibold w-[50px]">#</th>
                <th className="p-2.5 text-left text-xs font-semibold">Finding</th>
                <th className="p-2.5 text-left text-xs font-semibold w-[80px]">Risk</th>
                <th className="p-2.5 text-left text-xs font-semibold">Recommendation</th>
                <th className="p-2.5 text-left text-xs font-semibold">Management Response</th>
                <th className="p-2.5 text-left text-xs font-semibold">Agreed Action</th>
                <th className="p-2.5 text-left text-xs font-semibold w-[100px]">Owner</th>
                <th className="p-2.5 text-left text-xs font-semibold w-[90px]">Target Date</th>
                <th className="p-2.5 text-left text-xs font-semibold w-[80px]">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-muted-foreground">
                    No findings recorded for this audit.
                  </td>
                </tr>
              ) : (
                data.rows.map((row, i) => (
                  <tr key={row.findingId} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/30'}>
                    <td className="p-2.5 text-xs font-mono font-semibold text-muted-foreground">{row.findingRef}</td>
                    <td className="p-2.5 text-xs font-medium">{row.findingTitle}</td>
                    <td className="p-2.5">
                      <Badge variant="outline" className={`text-[10px] ${RISK_STYLES[row.riskRating] || ''}`}>
                        {row.riskRating}
                      </Badge>
                    </td>
                    <td className="p-2.5 text-xs">{row.recommendation}</td>
                    <td className="p-2.5 text-xs">{row.managementResponse}</td>
                    <td className="p-2.5 text-xs">{row.agreedAction}</td>
                    <td className="p-2.5 text-xs font-medium">{row.responsibleOwner}</td>
                    <td className="p-2.5 text-xs">{row.targetDate}</td>
                    <td className="p-2.5">
                      <Badge variant="outline" className={`text-[10px] ${STATUS_STYLES[row.status] || ''}`}>
                        {row.status}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Confidentiality */}
        <div className="mt-8 pt-4 border-t text-center">
          <p className="text-[10px] text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            <strong>CONFIDENTIAL</strong> — This document is the property of the Social Security Board, St. Kitts and Nevis.
            It contains confidential information intended solely for the use of the addressee. Unauthorized distribution, copying, or disclosure is strictly prohibited.
          </p>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <Icon className={`h-5 w-5 ${color}`} />
        <div>
          <p className="text-xl font-bold tabular-nums">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
