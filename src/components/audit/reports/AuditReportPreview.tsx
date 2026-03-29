import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Printer, Download, FileText, Shield, CheckCircle2 } from 'lucide-react';
import { StatusBadge } from '@/components/common';
import { formatDateForDisplay } from '@/lib/format-config';
import { AuditFindingCard } from './AuditFindingCard';
import { generateAuditReportPDF } from './AuditReportPDFExport';
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

const OPINION_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  Satisfactory: { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-300' },
  'Needs Improvement': { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-300' },
  Unsatisfactory: { bg: 'bg-orange-50', text: 'text-orange-800', border: 'border-orange-300' },
  Critical: { bg: 'bg-red-50', text: 'text-red-800', border: 'border-red-300' },
};

export function AuditReportPreview({
  reportData, findings, responses, actions, engagement, departmentName, onClose, onPrint,
}: AuditReportPreviewProps) {
  const isDraft = reportData.status === 'Draft' || reportData.status === 'In Review';
  const isFinal = reportData.status === 'Final';
  const reportDate = reportData.generated_on ? formatDateForDisplay(reportData.generated_on) : new Date().toLocaleDateString();

  const handleExportPDF = () => {
    generateAuditReportPDF({ reportData, findings, responses, actions, engagement, departmentName });
  };

  // Section numbering
  let sectionNum = 0;
  const nextSection = () => ++sectionNum;

  return (
    <div className="min-h-screen bg-muted/30 print:bg-white">
      {/* Fixed Top Bar */}
      <div className="sticky top-0 z-50 bg-background border-b px-4 py-2.5 flex items-center justify-between no-print">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onClose}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Editor
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <span className="text-sm font-medium">Report Preview</span>
          {isDraft && <Badge variant="outline" className="text-amber-600 border-amber-300">DRAFT</Badge>}
          {isFinal && <Badge className="bg-emerald-600 text-white">ISSUED</Badge>}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onPrint}>
            <Printer className="h-4 w-4 mr-1" /> Print
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF}>
            <Download className="h-4 w-4 mr-1" /> Export PDF
          </Button>
        </div>
      </div>

      {/* Report Document */}
      <div className="max-w-[850px] mx-auto my-8 print:my-0 print:max-w-none">
        {/* ─── COVER PAGE ─── */}
        <div className="bg-white dark:bg-background shadow-lg print:shadow-none rounded-lg print:rounded-none overflow-hidden relative min-h-[900px] flex flex-col">
          {/* Draft Watermark */}
          {isDraft && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
              <p className="text-[100px] font-bold text-gray-300/[0.12] -rotate-45 select-none tracking-widest">DRAFT</p>
            </div>
          )}

          {/* Issued Stamp */}
          {isFinal && (
            <div className="absolute top-16 right-8 z-10 pointer-events-none">
              <div className="border-4 border-emerald-600 rounded-lg px-5 py-2 rotate-12 opacity-60">
                <p className="text-emerald-600 font-bold text-lg tracking-wider">ISSUED</p>
                <p className="text-emerald-600 text-[10px] text-center">{reportData.issued_at ? formatDateForDisplay(reportData.issued_at) : reportDate}</p>
              </div>
            </div>
          )}

          <div className="relative z-20 flex-1 flex flex-col">
            {/* Green Header Band */}
            <div className="bg-[#0E5F3A] text-white px-12 py-6">
              <div className="flex items-center justify-between">
                <div>
                  <img src={logo} alt="SSB Logo" className="h-14 mb-2 brightness-0 invert" />
                  <h1 className="text-lg font-bold tracking-wide">SOCIAL SECURITY BOARD</h1>
                  <p className="text-sm opacity-80">ST. KITTS AND NEVIS</p>
                </div>
                <div className="text-right text-xs opacity-70">
                  <p>Bay Road, P.O. Box 79</p>
                  <p>Basseterre, St. Kitts</p>
                  <p>Tel: (869) 465-2521</p>
                </div>
              </div>
            </div>
            {/* Gold Accent */}
            <div className="h-1 bg-[#F4C430]" />

            {/* Cover Content */}
            <div className="flex-1 flex flex-col items-center justify-center px-12 py-16 text-center">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.2em] mb-4">Internal Audit Department</p>
              <h2 className="text-3xl font-bold text-foreground leading-tight mb-4">{reportData.title || 'Audit Report'}</h2>
              
              <div className="flex items-center gap-3 mb-8">
                {reportData.report_type && <Badge variant="outline" className="text-sm px-3 py-1">{reportData.report_type}</Badge>}
              </div>

              <div className="grid grid-cols-2 gap-x-12 gap-y-3 text-sm mt-4 max-w-md">
                <CoverMeta label="Fiscal Year" value={reportData.fiscal_year} />
                <CoverMeta label="Department" value={departmentName || '—'} />
                <CoverMeta label="Report Number" value={reportData.report_number || '—'} />
                <CoverMeta label="Date" value={reportDate} />
                <CoverMeta label="Prepared By" value={reportData.prepared_by || '—'} />
                <CoverMeta label="Version" value={isFinal ? 'Final' : 'Draft'} />
              </div>
            </div>

            {/* Confidentiality Notice */}
            <div className="border-t px-12 py-5 bg-muted/30 print:bg-gray-50">
              <p className="text-[10px] text-muted-foreground text-center font-medium uppercase tracking-wider mb-1">Confidential</p>
              <p className="text-[10px] text-muted-foreground text-center leading-relaxed max-w-lg mx-auto">
                This document is the property of the Social Security Board, St. Kitts and Nevis. It contains confidential information
                intended solely for the use of the addressee. Unauthorized distribution, copying, or disclosure is strictly prohibited.
              </p>
            </div>
          </div>
        </div>

        {/* ─── PAGE BREAK ─── */}
        <PageBreak />

        {/* ─── TABLE OF CONTENTS ─── */}
        <ReportPage isDraft={isDraft}>
          <SectionHeading>Table of Contents</SectionHeading>
          <div className="space-y-1.5 text-sm">
            {buildTOC(reportData, findings, responses, actions).map((item, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 border-b border-dotted border-muted-foreground/20">
                <span className="font-medium">{item}</span>
              </div>
            ))}
          </div>
        </ReportPage>

        <PageBreak />

        {/* ─── REPORT BODY ─── */}
        <ReportPage isDraft={isDraft}>
          <div className="space-y-10">
            {/* Executive Summary */}
            {reportData.executive_summary && (
              <div>
                <SectionHeading number={nextSection()}>Executive Summary</SectionHeading>
                {reportData.overall_assessment && (
                  <div className="mb-4">
                    <OpinionIndicator opinion={reportData.overall_assessment} />
                  </div>
                )}
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{reportData.executive_summary}</p>
              </div>
            )}

            {/* Background */}
            {reportData.background && (
              <div>
                <SectionHeading number={nextSection()}>Audit Background</SectionHeading>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{reportData.background}</p>
              </div>
            )}

            {/* Objective */}
            {reportData.audit_objective && (
              <div>
                <SectionHeading number={nextSection()}>Audit Objective</SectionHeading>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{reportData.audit_objective}</p>
              </div>
            )}

            {/* Scope */}
            {reportData.audit_scope && (
              <div>
                <SectionHeading number={nextSection()}>Scope</SectionHeading>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{reportData.audit_scope}</p>
              </div>
            )}

            {/* Methodology */}
            {reportData.methodology && (
              <div>
                <SectionHeading number={nextSection()}>Methodology</SectionHeading>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{reportData.methodology}</p>
              </div>
            )}

            {/* Risk Overview */}
            {(reportData.risk_rating || findings.length > 0) && (
              <div>
                <SectionHeading number={nextSection()}>Risk Overview</SectionHeading>
                {findings.length > 0 && (
                  <div className="grid grid-cols-4 gap-3 mb-4">
                    {['Critical', 'High', 'Medium', 'Low'].map((level) => {
                      const count = findings.filter((f: any) => f.risk_rating === level).length;
                      const colors: Record<string, string> = {
                        Critical: 'border-red-300 bg-red-50 text-red-800 print:bg-white print:text-red-700',
                        High: 'border-orange-300 bg-orange-50 text-orange-800 print:bg-white print:text-orange-700',
                        Medium: 'border-amber-300 bg-amber-50 text-amber-800 print:bg-white print:text-amber-700',
                        Low: 'border-green-300 bg-green-50 text-green-800 print:bg-white print:text-green-700',
                      };
                      return (
                        <div key={level} className={`rounded-lg border-2 p-3 text-center ${colors[level]}`}>
                          <p className="text-2xl font-bold">{count}</p>
                          <p className="text-xs font-semibold">{level}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
                {reportData.risk_rating && <p className="text-sm leading-relaxed">{reportData.risk_rating}</p>}
              </div>
            )}

            {/* Key Findings Snapshot */}
            {findings.length > 0 && (
              <div>
                <SectionHeading number={nextSection()}>Key Findings Snapshot</SectionHeading>
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#0E5F3A] text-white text-xs">
                        <th className="text-left p-2.5 font-medium">#</th>
                        <th className="text-left p-2.5 font-medium">Finding</th>
                        <th className="text-left p-2.5 font-medium">Risk Rating</th>
                        <th className="text-left p-2.5 font-medium">Impact Area</th>
                        <th className="text-left p-2.5 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {findings.map((f: any, i: number) => (
                        <tr key={f.id} className={`border-t ${i % 2 === 1 ? 'bg-muted/20 print:bg-gray-50' : ''}`}>
                          <td className="p-2.5 font-bold">{i + 1}</td>
                          <td className="p-2.5 font-medium">{f.title || 'Untitled'}</td>
                          <td className="p-2.5"><Badge variant="outline" className="text-xs">{f.risk_rating || '—'}</Badge></td>
                          <td className="p-2.5 text-xs">{f.impact_area || '—'}</td>
                          <td className="p-2.5"><StatusBadge status={f.status || 'Open'} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Detailed Findings */}
            {findings.length > 0 && (
              <div>
                <SectionHeading number={nextSection()}>Detailed Findings</SectionHeading>
                <div className="space-y-5">
                  {findings.map((f: any, i: number) => (
                    <AuditFindingCard key={f.id} finding={f} index={i + 1} responses={responses} actions={actions} />
                  ))}
                </div>
              </div>
            )}

            {/* Management Responses */}
            {responses.length > 0 && (
              <div>
                <SectionHeading number={nextSection()}>Management Responses</SectionHeading>
                <div className="space-y-3">
                  {responses.map((r: any, i: number) => {
                    const finding = findings.find((f: any) => f.id === r.finding_id);
                    return (
                      <div key={r.id} className="border-l-4 border-l-blue-400 pl-4 py-3 print:border-l-2">
                        <p className="text-sm font-semibold">{finding?.title || `Response ${i + 1}`}</p>
                        <p className="text-sm leading-relaxed mt-1">{r.response_text || '—'}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Agreed Action Plan */}
            {actions.length > 0 && (
              <div>
                <SectionHeading number={nextSection()}>Agreed Action Plan</SectionHeading>
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#0E5F3A] text-white text-xs">
                        <th className="text-left p-2.5 font-medium">#</th>
                        <th className="text-left p-2.5 font-medium">Finding</th>
                        <th className="text-left p-2.5 font-medium">Action</th>
                        <th className="text-left p-2.5 font-medium">Owner</th>
                        <th className="text-left p-2.5 font-medium">Due Date</th>
                        <th className="text-left p-2.5 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {actions.map((a: any, i: number) => {
                        const finding = findings.find((f: any) => f.id === a.finding_id);
                        return (
                          <tr key={a.id} className={`border-t ${i % 2 === 1 ? 'bg-muted/20 print:bg-gray-50' : ''}`}>
                            <td className="p-2.5 font-medium">{i + 1}</td>
                            <td className="p-2.5">{finding?.title || '—'}</td>
                            <td className="p-2.5">{a.action_description || '—'}</td>
                            <td className="p-2.5">{a.responsible_person || '—'}</td>
                            <td className="p-2.5">{a.target_date ? formatDateForDisplay(a.target_date) : '—'}</td>
                            <td className="p-2.5"><StatusBadge status={a.status || 'Open'} /></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Conclusion */}
            {(reportData.conclusion || reportData.follow_up_actions) && (
              <div>
                <SectionHeading number={nextSection()}>Conclusion</SectionHeading>
                {reportData.conclusion && <p className="text-sm leading-relaxed whitespace-pre-wrap mb-4">{reportData.conclusion}</p>}
                {reportData.follow_up_actions && (
                  <div className="rounded-lg border bg-muted/20 p-4 print:bg-gray-50">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Follow-up Expectations</p>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{reportData.follow_up_actions}</p>
                  </div>
                )}
              </div>
            )}

            {/* Distribution */}
            {reportData.distribution_list && (
              <div>
                <SectionHeading number={nextSection()}>Distribution</SectionHeading>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{reportData.distribution_list}</p>
              </div>
            )}

            {/* Signatures */}
            <div>
              <SectionHeading number={nextSection()}>Approval & Sign-off</SectionHeading>
              <div className="grid gap-12 mt-8">
                {[
                  { label: 'Prepared By', name: reportData.prepared_by, role: 'Internal Auditor' },
                  { label: 'Reviewed By', name: reportData.reviewed_by, role: 'Manager, Internal Audit' },
                  { label: 'Approved By', name: reportData.approved_by || 'Director, Social Security Board', role: 'Director' },
                ].map((sig) => (
                  <div key={sig.label}>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{sig.label}</p>
                    <div className="mt-8 border-t border-foreground/40 w-72" />
                    <p className="text-sm font-semibold mt-2">{sig.name || '—'}</p>
                    <p className="text-xs text-muted-foreground">{sig.role}</p>
                    <p className="text-xs text-muted-foreground mt-1">Date: _______________</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Page Footer */}
            <div className="pt-10 border-t mt-10 text-center space-y-1 print:mt-0">
              <div className="h-0.5 bg-[#0E5F3A] mb-3" />
              <p className="text-[10px] text-muted-foreground">Social Security Board · Bay Road, P.O. Box 79, Basseterre, St. Kitts</p>
              <p className="text-[10px] text-muted-foreground">Internal Audit Department</p>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">CONFIDENTIAL — For Authorized Recipients Only</p>
              {reportData.report_number && (
                <p className="text-[10px] text-muted-foreground">Ref: {reportData.report_number}</p>
              )}
            </div>
          </div>
        </ReportPage>
      </div>
    </div>
  );
}

// ─── Helper Components ───

function ReportPage({ children, isDraft }: { children: React.ReactNode; isDraft: boolean }) {
  return (
    <div className="bg-white dark:bg-background shadow-lg print:shadow-none rounded-lg print:rounded-none overflow-hidden relative">
      {isDraft && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <p className="text-[100px] font-bold text-gray-300/[0.12] -rotate-45 select-none tracking-widest">DRAFT</p>
        </div>
      )}
      <div className="relative z-20 p-12 print:p-8">{children}</div>
    </div>
  );
}

function PageBreak() {
  return (
    <div className="h-4 print:h-0 print:break-after-page" />
  );
}

function SectionHeading({ children, number }: { children: React.ReactNode; number?: number }) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-3 mb-2">
        {number !== undefined && (
          <span className="text-xs font-bold text-white bg-[#0E5F3A] rounded-full h-6 w-6 flex items-center justify-center shrink-0">{number}</span>
        )}
        <h3 className="text-lg font-bold text-[#0E5F3A]">{children}</h3>
      </div>
      <div className="h-0.5 bg-[#0E5F3A]/20" />
    </div>
  );
}

function CoverMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-left">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="font-semibold text-sm">{value}</p>
    </div>
  );
}

function OpinionIndicator({ opinion }: { opinion: string }) {
  const style = OPINION_STYLES[opinion];
  if (!style) return null;
  return (
    <div className={`inline-flex items-center gap-2 rounded-lg border-2 ${style.border} ${style.bg} px-4 py-2 print:bg-white`}>
      <CheckCircle2 className={`h-4 w-4 ${style.text}`} />
      <span className={`text-sm font-bold ${style.text}`}>Overall Assessment: {opinion}</span>
    </div>
  );
}

function buildTOC(reportData: any, findings: any[], responses: any[], actions: any[]): string[] {
  const items: string[] = [];
  let n = 0;
  if (reportData.executive_summary) items.push(`${++n}. Executive Summary`);
  if (reportData.background) items.push(`${++n}. Audit Background`);
  if (reportData.audit_objective) items.push(`${++n}. Audit Objective`);
  if (reportData.audit_scope) items.push(`${++n}. Scope`);
  if (reportData.methodology) items.push(`${++n}. Methodology`);
  if (reportData.risk_rating || findings.length > 0) items.push(`${++n}. Risk Overview`);
  if (findings.length > 0) {
    items.push(`${++n}. Key Findings Snapshot`);
    items.push(`${++n}. Detailed Findings`);
  }
  if (responses.length > 0) items.push(`${++n}. Management Responses`);
  if (actions.length > 0) items.push(`${++n}. Agreed Action Plan`);
  if (reportData.conclusion || reportData.follow_up_actions) items.push(`${++n}. Conclusion`);
  if (reportData.distribution_list) items.push(`${++n}. Distribution`);
  items.push(`${++n}. Approval & Sign-off`);
  return items;
}
