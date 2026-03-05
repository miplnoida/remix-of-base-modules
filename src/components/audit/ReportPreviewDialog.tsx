import React from 'react';
import { Button } from '@/components/ui/button';
import { Download, Send, Printer } from 'lucide-react';
import { StandardModal } from '@/components/common/StandardModal';
import logo from '@/assets/stkitts-logo.png';

interface ReportPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportData: {
    title: string;
    fiscalYear: string;
    reportDate: string;
    auditPeriod: string;
    preparedBy: string;
    background?: string;
    keyHighlights?: string;
    overallAssessment?: string;
    objective?: string;
    scope?: string;
    methodology?: string;
    limitations?: string;
    findings: Array<{
      id: string;
      findingId: string;
      title: string;
      riskRating: string;
      impactArea: string;
      condition: string;
      criteria: string;
      cause: string;
      effect: string;
    }>;
    responses: Array<{
      findingTitle: string;
      responseText: string;
      actionPlan: string;
      responsiblePerson: string;
      targetDate: string;
    }>;
    conclusion?: string;
    followUpActions?: string;
    reviewedBy?: string;
    distributionList?: string;
  };
  onSubmit: () => void;
}

export function ReportPreviewDialog({ 
  open, 
  onOpenChange, 
  reportData,
  onSubmit 
}: ReportPreviewDialogProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <StandardModal
      open={open}
      onOpenChange={onOpenChange}
      title="Audit Report Preview"
      mode="view"
      size="5xl"
      footer={
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" />Print
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />Download PDF
          </Button>
          <Button size="sm" onClick={onSubmit}>
            <Send className="w-4 h-4 mr-2" />Submit for Approval
          </Button>
        </div>
      }
    >
      <div className="bg-white p-12 text-foreground" id="report-content">
        {/* Report Header */}
        <div className="text-center mb-8 border-b-2 border-primary pb-6">
          <img src={logo} alt="Social Security Board Logo" className="h-20 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-primary mb-2">SOCIAL SECURITY BOARD</h1>
          <h2 className="text-xl font-semibold mb-1">ST. KITTS AND NEVIS</h2>
          <h3 className="text-lg font-semibold text-muted-foreground">INTERNAL AUDIT DEPARTMENT</h3>
        </div>

        {/* Report Title */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold mb-4">{reportData.title}</h2>
          <div className="text-sm space-y-1">
            <p><strong>Fiscal Year:</strong> {reportData.fiscalYear}</p>
            <p><strong>Report Date:</strong> {reportData.reportDate}</p>
            <p><strong>Audit Period:</strong> {reportData.auditPeriod}</p>
          </div>
        </div>

        {/* Executive Summary */}
        {(reportData.background || reportData.keyHighlights || reportData.overallAssessment) && (
          <div className="mb-8">
            <h3 className="text-xl font-bold mb-4 text-primary border-b pb-2">EXECUTIVE SUMMARY</h3>
            {reportData.background && (<div className="mb-4"><h4 className="font-semibold mb-2">Background</h4><p className="text-sm leading-relaxed">{reportData.background}</p></div>)}
            {reportData.keyHighlights && (<div className="mb-4"><h4 className="font-semibold mb-2">Key Highlights</h4><p className="text-sm leading-relaxed">{reportData.keyHighlights}</p></div>)}
            {reportData.overallAssessment && (<div className="mb-4"><h4 className="font-semibold mb-2">Overall Assessment</h4><p className="text-sm leading-relaxed">{reportData.overallAssessment}</p></div>)}
          </div>
        )}

        {/* Scope & Methodology */}
        {(reportData.objective || reportData.scope || reportData.methodology) && (
          <div className="mb-8">
            <h3 className="text-xl font-bold mb-4 text-primary border-b pb-2">SCOPE & METHODOLOGY</h3>
            {reportData.objective && (<div className="mb-4"><h4 className="font-semibold mb-2">Audit Objective</h4><p className="text-sm leading-relaxed">{reportData.objective}</p></div>)}
            {reportData.scope && (<div className="mb-4"><h4 className="font-semibold mb-2">Scope</h4><p className="text-sm leading-relaxed">{reportData.scope}</p></div>)}
            {reportData.methodology && (<div className="mb-4"><h4 className="font-semibold mb-2">Methodology</h4><p className="text-sm leading-relaxed">{reportData.methodology}</p></div>)}
            {reportData.limitations && (<div className="mb-4"><h4 className="font-semibold mb-2">Limitations</h4><p className="text-sm leading-relaxed">{reportData.limitations}</p></div>)}
          </div>
        )}

        {/* Findings */}
        {reportData.findings.length > 0 && (
          <div className="mb-8">
            <h3 className="text-xl font-bold mb-4 text-primary border-b pb-2">DETAILED FINDINGS</h3>
            {reportData.findings.map((finding, index) => (
              <div key={finding.id} className="mb-6 border-l-4 border-l-red-500 pl-4">
                <div className="mb-3">
                  <h4 className="font-bold text-lg">Finding {index + 1}: {finding.title}</h4>
                  <p className="text-sm text-muted-foreground">{finding.findingId}</p>
                  <div className="flex gap-2 mt-2">
                    <span className={`text-xs px-2 py-1 rounded ${finding.riskRating === 'High' ? 'bg-red-100 text-red-800' : finding.riskRating === 'Medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>Risk: {finding.riskRating}</span>
                    <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800">{finding.impactArea}</span>
                  </div>
                </div>
                <div className="space-y-3 text-sm">
                  <div><strong>Condition:</strong><p className="mt-1">{finding.condition}</p></div>
                  <div><strong>Criteria:</strong><p className="mt-1">{finding.criteria}</p></div>
                  <div><strong>Cause:</strong><p className="mt-1">{finding.cause}</p></div>
                  <div><strong>Effect:</strong><p className="mt-1">{finding.effect}</p></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Management Responses */}
        {reportData.responses.length > 0 && (
          <div className="mb-8">
            <h3 className="text-xl font-bold mb-4 text-primary border-b pb-2">MANAGEMENT RESPONSES & ACTION PLANS</h3>
            {reportData.responses.map((response, index) => (
              <div key={index} className="mb-6 border-l-4 border-l-blue-500 pl-4">
                <h4 className="font-bold mb-2">{response.findingTitle}</h4>
                <div className="space-y-3 text-sm">
                  <div><strong>Management Response:</strong><p className="mt-1">{response.responseText}</p></div>
                  <div><strong>Action Plan:</strong><p className="mt-1 whitespace-pre-line">{response.actionPlan}</p></div>
                  <div className="flex gap-4 text-sm">
                    <div><strong>Responsible Person:</strong> {response.responsiblePerson}</div>
                    <div><strong>Target Date:</strong> {response.targetDate}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Conclusion */}
        {(reportData.conclusion || reportData.followUpActions) && (
          <div className="mb-8">
            <h3 className="text-xl font-bold mb-4 text-primary border-b pb-2">CONCLUSION & NEXT STEPS</h3>
            {reportData.conclusion && (<div className="mb-4"><h4 className="font-semibold mb-2">Overall Conclusion</h4><p className="text-sm leading-relaxed">{reportData.conclusion}</p></div>)}
            {reportData.followUpActions && (<div className="mb-4"><h4 className="font-semibold mb-2">Follow-up Actions</h4><p className="text-sm leading-relaxed">{reportData.followUpActions}</p></div>)}
          </div>
        )}

        {/* Signatures */}
        <div className="mt-12 space-y-8">
          <div>
            <p className="font-semibold mb-1">Prepared By:</p>
            <p className="text-sm">{reportData.preparedBy}</p>
            <div className="border-t border-foreground w-64 mt-8"></div>
            <p className="text-sm mt-1">Internal Auditor</p>
          </div>
          {reportData.reviewedBy && (
            <div>
              <p className="font-semibold mb-1">Reviewed By:</p>
              <p className="text-sm">{reportData.reviewedBy}</p>
              <div className="border-t border-foreground w-64 mt-8"></div>
              <p className="text-sm mt-1">Manager, Internal Audit</p>
            </div>
          )}
          <div>
            <p className="font-semibold mb-1">Approved By:</p>
            <p className="text-sm">Director, Social Security Board</p>
            <div className="border-t border-foreground w-64 mt-8"></div>
            <p className="text-sm mt-1">Date: _______________</p>
          </div>
        </div>

        {reportData.distributionList && (
          <div className="mt-8 pt-8 border-t">
            <h4 className="font-semibold mb-2">Distribution List:</h4>
            <p className="text-sm whitespace-pre-line">{reportData.distributionList}</p>
          </div>
        )}

        <div className="mt-12 pt-6 border-t text-center text-xs text-muted-foreground">
          <p>Social Security Board | St. Kitts and Nevis</p>
          <p>Internal Audit Department</p>
          <p>Confidential - For Internal Use Only</p>
        </div>
      </div>
    </StandardModal>
  );
}
