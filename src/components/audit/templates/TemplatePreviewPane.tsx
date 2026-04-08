import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { AuditReportTemplateConfig, AuditPlanTemplateConfig } from '@/lib/audit/documentTemplateDefaults';

interface TemplatePreviewPaneProps {
  templateType: 'audit_report' | 'audit_plan';
  config: AuditReportTemplateConfig | AuditPlanTemplateConfig;
}

export function TemplatePreviewPane({ templateType, config }: TemplatePreviewPaneProps) {
  if (templateType === 'audit_report') {
    return <ReportPreview config={config as AuditReportTemplateConfig} />;
  }
  return <PlanPreview config={config as AuditPlanTemplateConfig} />;
}

function ReportPreview({ config }: { config: AuditReportTemplateConfig }) {
  const enabledSections = [...config.sections].filter((s) => s.enabled).sort((a, b) => a.order - b.order);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="py-2 px-4 bg-muted/40">
        <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Report Preview</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {/* Mini cover page */}
        <div className="bg-[#0E5F3A] text-white px-4 py-3 relative">
          {config.draftRules.showWatermark && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <p className="text-2xl font-bold text-white/10 -rotate-45">{config.draftRules.watermarkText}</p>
            </div>
          )}
          <div className="flex items-center justify-between relative z-10">
            <div>
              {config.branding.showLogo && (
                <div className="w-6 h-6 rounded bg-white/20 mb-1 flex items-center justify-center text-[8px] font-bold">LOGO</div>
              )}
              <p className="text-xs font-bold">{config.branding.orgName}</p>
              <p className="text-[9px] opacity-70">{config.branding.country}</p>
            </div>
            <div className="text-[8px] opacity-60 text-right">
              <p>{config.branding.address}</p>
              <p>Tel: {config.branding.phone}</p>
            </div>
          </div>
        </div>
        <div className="h-0.5 bg-[#F4C430]" />

        {/* Cover content */}
        <div className="px-4 py-4 text-center border-b">
          <p className="text-[9px] text-muted-foreground uppercase tracking-widest mb-1">Internal Audit Department</p>
          <p className="text-sm font-bold">{config.coverPage.reportTitle}</p>
          {config.coverPage.showSubtitle && (
            <Badge variant="outline" className="text-[9px] mt-1">{config.coverPage.subtitleText}</Badge>
          )}
          {config.coverPage.showAuditPeriod && (
            <p className="text-[9px] text-muted-foreground mt-2">Fiscal Year: 2026</p>
          )}
        </div>

        {/* Sections list */}
        <div className="px-4 py-3 space-y-1.5">
          <p className="text-[9px] font-semibold text-muted-foreground uppercase mb-1">Sections</p>
          {enabledSections.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2">
              <span className="text-[9px] font-bold text-white bg-[#0E5F3A] rounded-full h-4 w-4 flex items-center justify-center shrink-0">
                {i + 1}
              </span>
              <span className="text-xs">{s.label}</span>
            </div>
          ))}
        </div>

        <Separator />

        {/* Sign-off preview */}
        <div className="px-4 py-3">
          <p className="text-[9px] font-semibold text-muted-foreground uppercase mb-2">Sign-off</p>
          <div className="space-y-2">
            {config.signOff.signatories.map((sig, i) => (
              <div key={i} className="text-[9px]">
                <p className="font-semibold text-muted-foreground">{sig.label}</p>
                <div className="border-t border-foreground/30 w-20 mt-2 mb-0.5" />
                <p className="font-medium">{sig.defaultName || '(Name)'}</p>
                <p className="text-muted-foreground">{sig.roleTitle}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Confidentiality footer */}
        <div className="px-4 py-2 bg-muted/30 border-t">
          <p className="text-[8px] text-muted-foreground text-center uppercase tracking-wider font-medium">Confidential</p>
        </div>
      </CardContent>
    </Card>
  );
}

function PlanPreview({ config }: { config: AuditPlanTemplateConfig }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="py-2 px-4 bg-muted/40">
        <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Plan Preview</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {/* Mini cover */}
        <div className="bg-[#0E5F3A] text-white px-4 py-3">
          {config.coverPage.showDepartmentLine && (
            <p className="text-[9px] opacity-70 mb-1">Internal Audit Department</p>
          )}
          <p className="text-sm font-bold">{config.coverPage.titleText}</p>
          <p className="text-[9px] opacity-70 mt-1">
            Fiscal Year: {config.coverPage.fiscalYearMode === 'range' ? '2025–2026' : '2026'}
          </p>
        </div>
        <div className="h-0.5 bg-[#F4C430]" />

        {/* Summary */}
        <div className="px-4 py-3">
          <p className="text-xs font-semibold mb-2">{config.planSummary.titleOverride}</p>
          {config.planSummary.splitByType ? (
            <div className="space-y-2">
              {config.planSummary.sections.filter((s) => s.enabled).map((sec) => (
                <div key={sec.key} className="text-[9px] border-l-2 border-[#0E5F3A] pl-2">
                  <p className="font-semibold">{sec.label}</p>
                  <p className="text-muted-foreground">Sample rows…</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[9px] text-muted-foreground">Unified engagement list</p>
          )}
        </div>

        <Separator />

        {/* Resource Plan */}
        <div className="px-4 py-3">
          <p className="text-[9px] font-semibold text-muted-foreground uppercase mb-1">Resource Plan</p>
          {config.resourcePlan.showTotalStaffFirst && (
            <p className="text-[9px]">Total Audit Staff: <span className="font-bold">—</span></p>
          )}
          <div className="flex flex-wrap gap-1 mt-1">
            {config.resourcePlan.dayTypes.map((dt) => (
              <span key={dt} className="text-[8px] px-1.5 py-0.5 bg-muted rounded border">{dt}</span>
            ))}
          </div>
        </div>

        <Separator />

        {/* Governance */}
        <div className="px-4 py-3 space-y-1">
          {config.riskCoverage.enabled && (
            <p className="text-[9px]">✓ Risk Coverage Analysis</p>
          )}
          {config.governance.showBoardLine && (
            <p className="text-[9px]">✓ Board/Audit Committee</p>
          )}
          {config.governance.showApprovedByBlock && (
            <div className="text-[9px] mt-2">
              <p className="text-muted-foreground">{config.governance.preparedByLabel}: ___</p>
              <p className="text-muted-foreground">{config.governance.approvedByLabel}: ___</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
