import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Printer, Download, FileText, Shield } from 'lucide-react';
import { StatusBadge } from '@/components/common';
import { formatDateForDisplay } from '@/lib/format-config';
import { AuditFindingCard } from './AuditFindingCard';
import logo from '@/assets/stkitts-logo.png';

interface AuditReportPreviewProps {
  reportData: any;
  findings: any[];
  responses: any[];
  actions: any[];
  engagement?: any;
  departmentName?: string;
  onClose: () => void;
  onPrint: () => void;
}

export function AuditReportPreview({
  reportData,
  findings,
  responses,
  actions,
  engagement,
  departmentName,
  onClose,
  onPrint,
}: AuditReportPreviewProps) {
  const isDraft = reportData.status === 'Draft' || reportData.status === 'In Review';

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Fixed Top Bar */}
      <div className="sticky top-0 z-50 bg-background border-b px-4 py-2.5 flex items-center justify-between no-print">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onClose}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Editor
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <span className="text-sm font-medium">Report Preview</span>
          {isDraft && <Badge variant="outline" className="text-amber-600 border-amber-300">DRAFT</Badge>}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onPrint}>
            <Printer className="h-4 w-4 mr-1" /> Print
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-1" /> Export PDF
          </Button>
        </div>
      </div>

      {/* Report Content */}
      <div className="max-w-[850px] mx-auto my-8 bg-white dark:bg-background shadow-lg rounded-lg overflow-hidden relative">
        {/* Draft Watermark */}
        {isDraft && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <p className="text-[80px] font-bold text-muted-foreground/10 -rotate-45 select-none">DRAFT</p>
          </div>
        )}

        <div className="relative z-20 p-12 space-y-10" id="report-preview-content">
          {/* Cover Header */}
          <div className="text-center pb-8 border-b-2 border-primary">
            <img src={logo} alt="SSB Logo" className="h-16 mx-auto mb-3" />
            <h1 className="text-xl font-bold text-primary">SOCIAL SECURITY BOARD</h1>
            <h2 className="text-base font-semibold text-muted-foreground">ST. KITTS AND NEVIS</h2>
            <p className="text-sm text-muted-foreground mt-1">INTERNAL AUDIT DEPARTMENT</p>
            <div className="w-24 h-0.5 bg-primary/30 mx-auto mt-4" />
          </div>

          {/* Report Title Block */}
          <div className="text-center space-y-3">
            <h2 className="text-2xl font-bold">{reportData.title || 'Audit Report'}</h2>
            <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
              {reportData.report_type && <Badge variant="outline">{reportData.report_type}</Badge>}
              <StatusBadge status={reportData.status || 'Draft'} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 text-sm max-w-xl mx-auto">
              <MetaItem label="Fiscal Year" value={reportData.fiscal_year} />
              <MetaItem label="Department" value={departmentName || '—'} />
              <MetaItem label="Prepared By" value={reportData.prepared_by || '—'} />
              <MetaItem label="Date" value={reportData.generated_on ? formatDateForDisplay(reportData.generated_on) : new Date().toLocaleDateString()} />
            </div>
          </div>

          {/* Confidentiality Notice */}
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Confidential</p>
            <p className="text-xs text-muted-foreground mt-1">
              This document is the property of the Social Security Board, St. Kitts and Nevis. It contains confidential information
              intended solely for the use of the addressee. Unauthorized distribution, copying, or disclosure is strictly prohibited.
            </p>
          </div>

          {/* Table of Contents */}
          <div>
            <SectionHeading>Table of Contents</SectionHeading>
            <div className="space-y-1.5 text-sm">
              {[
                '1. Executive Summary',
                '2. Audit Background',
                '3. Audit Objective',
                '4. Scope',
                '5. Methodology',
                '6. Risk Overview',
                '7. Detailed Findings',
                '8. Management Responses',
                '9. Agreed Action Plan',
                '10. Conclusion',
                '11. Distribution',
                '12. Approval & Sign-off',
              ].map((item) => (
                <div key={item} className="flex items-center justify-between py-1 border-b border-dotted border-muted-foreground/20">
                  <span>{item}</span>
                  <span className="text-muted-foreground">—</span>
                </div>
              ))}
            </div>
          </div>

          {/* 1. Executive Summary */}
          {reportData.executive_summary && (
            <div>
              <SectionHeading number="1">Executive Summary</SectionHeading>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{reportData.executive_summary}</p>
            </div>
          )}

          {/* 2. Background */}
          {reportData.background && (
            <div>
              <SectionHeading number="2">Audit Background</SectionHeading>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{reportData.background}</p>
            </div>
          )}

          {/* 3. Objective */}
          {reportData.audit_objective && (
            <div>
              <SectionHeading number="3">Audit Objective</SectionHeading>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{reportData.audit_objective}</p>
            </div>
          )}

          {/* 4. Scope */}
          {reportData.audit_scope && (
            <div>
              <SectionHeading number="4">Scope</SectionHeading>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{reportData.audit_scope}</p>
            </div>
          )}

          {/* 5. Methodology */}
          {reportData.methodology && (
            <div>
              <SectionHeading number="5">Methodology</SectionHeading>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{reportData.methodology}</p>
            </div>
          )}

          {/* 6. Risk Overview */}
          {(reportData.risk_rating || findings.length > 0) && (
            <div>
              <SectionHeading number="6">Risk Overview</SectionHeading>
              {findings.length > 0 && (
                <div className="grid grid-cols-4 gap-3 mb-4">
                  {['Critical', 'High', 'Medium', 'Low'].map((level) => {
                    const count = findings.filter((f: any) => f.risk_rating === level).length;
                    const colors: Record<string, string> = {
                      Critical: 'bg-red-100 text-red-800 border-red-200',
                      High: 'bg-orange-100 text-orange-800 border-orange-200',
                      Medium: 'bg-amber-100 text-amber-800 border-amber-200',
                      Low: 'bg-green-100 text-green-800 border-green-200',
                    };
                    return (
                      <div key={level} className={`rounded-lg border p-3 text-center ${colors[level]}`}>
                        <p className="text-2xl font-bold">{count}</p>
                        <p className="text-xs font-medium">{level}</p>
                      </div>
                    );
                  })}
                </div>
              )}
              {reportData.risk_rating && <p className="text-sm leading-relaxed">{reportData.risk_rating}</p>}
            </div>
          )}

          {/* 7. Detailed Findings */}
          {findings.length > 0 && (
            <div>
              <SectionHeading number="7">Detailed Findings</SectionHeading>
              <div className="space-y-5">
                {findings.map((f: any, i: number) => (
                  <AuditFindingCard key={f.id} finding={f} index={i + 1} responses={responses} actions={actions} />
                ))}
              </div>
            </div>
          )}

          {/* 8. Management Responses Summary */}
          {responses.length > 0 && (
            <div>
              <SectionHeading number="8">Management Responses</SectionHeading>
              <div className="space-y-3">
                {responses.map((r: any, i: number) => {
                  const finding = findings.find((f: any) => f.id === r.finding_id);
                  return (
                    <div key={r.id} className="border-l-4 border-l-blue-400 pl-4 py-2">
                      <p className="text-sm font-semibold">{finding?.title || `Response ${i + 1}`}</p>
                      <p className="text-sm leading-relaxed mt-1">{r.response_text || '—'}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 9. Agreed Action Plan */}
          {actions.length > 0 && (
            <div>
              <SectionHeading number="9">Agreed Action Plan</SectionHeading>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left p-2.5 border text-xs font-semibold">#</th>
                      <th className="text-left p-2.5 border text-xs font-semibold">Finding</th>
                      <th className="text-left p-2.5 border text-xs font-semibold">Action</th>
                      <th className="text-left p-2.5 border text-xs font-semibold">Owner</th>
                      <th className="text-left p-2.5 border text-xs font-semibold">Due Date</th>
                      <th className="text-left p-2.5 border text-xs font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {actions.map((a: any, i: number) => {
                      const finding = findings.find((f: any) => f.id === a.finding_id);
                      return (
                        <tr key={a.id} className="border-b">
                          <td className="p-2.5 border font-medium">{i + 1}</td>
                          <td className="p-2.5 border">{finding?.title || '—'}</td>
                          <td className="p-2.5 border">{a.action_description || '—'}</td>
                          <td className="p-2.5 border">{a.responsible_person || '—'}</td>
                          <td className="p-2.5 border">{a.target_date ? formatDateForDisplay(a.target_date) : '—'}</td>
                          <td className="p-2.5 border"><StatusBadge status={a.status || 'Open'} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 10. Conclusion */}
          {(reportData.conclusion || reportData.follow_up_actions) && (
            <div>
              <SectionHeading number="10">Conclusion</SectionHeading>
              {reportData.conclusion && <p className="text-sm leading-relaxed whitespace-pre-wrap mb-4">{reportData.conclusion}</p>}
              {reportData.follow_up_actions && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Follow-up Expectations</p>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{reportData.follow_up_actions}</p>
                </div>
              )}
            </div>
          )}

          {/* 11. Distribution */}
          {reportData.distribution_list && (
            <div>
              <SectionHeading number="11">Distribution</SectionHeading>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{reportData.distribution_list}</p>
            </div>
          )}

          {/* 12. Signatures */}
          <div>
            <SectionHeading number="12">Approval & Sign-off</SectionHeading>
            <div className="grid gap-10 mt-6">
              {[
                { label: 'Prepared By', name: reportData.prepared_by, role: 'Internal Auditor' },
                { label: 'Reviewed By', name: reportData.reviewed_by, role: 'Manager, Internal Audit' },
                { label: 'Approved By', name: reportData.approved_by || 'Director, Social Security Board', role: 'Director' },
              ].map((sig) => (
                <div key={sig.label}>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{sig.label}</p>
                  <p className="text-sm font-medium mt-1">{sig.name || '—'}</p>
                  <div className="border-t border-foreground/30 w-64 mt-8" />
                  <p className="text-xs text-muted-foreground mt-1">{sig.role}</p>
                  <p className="text-xs text-muted-foreground">Date: _______________</p>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="pt-8 border-t text-center space-y-1">
            <p className="text-xs text-muted-foreground">Social Security Board · St. Kitts and Nevis</p>
            <p className="text-xs text-muted-foreground">Internal Audit Department</p>
            <p className="text-xs text-muted-foreground font-medium">CONFIDENTIAL — For Authorized Recipients Only</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionHeading({ children, number }: { children: React.ReactNode; number?: string }) {
  return (
    <h3 className="text-lg font-bold text-primary border-b-2 border-primary/20 pb-2 mb-4">
      {number && <span className="text-muted-foreground mr-2">{number}.</span>}
      {children}
    </h3>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium text-sm">{value}</p>
    </div>
  );
}
