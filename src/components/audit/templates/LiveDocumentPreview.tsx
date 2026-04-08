import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Eye } from 'lucide-react';
import type { AuditReportTemplateConfig, AuditPlanTemplateConfig } from '@/lib/audit/documentTemplateDefaults';
import type { ReportTemplateOverride, PlanTemplateOverride } from '@/lib/audit/documentTemplateOverrides';
import { applyReportOverrides, applyPlanOverrides, hasReportOverrides, hasPlanOverrides } from '@/lib/audit/documentTemplateOverrides';
import { resolveReportTemplate, resolvePlanTemplate } from '@/lib/audit/documentTemplateResolver';

interface LiveReportPreviewProps {
  type: 'report';
  baseConfig: AuditReportTemplateConfig;
  overrides?: ReportTemplateOverride | null;
  reportStatus?: string;
}

interface LivePlanPreviewProps {
  type: 'plan';
  baseConfig: AuditPlanTemplateConfig;
  overrides?: PlanTemplateOverride | null;
}

type LiveDocumentPreviewProps = LiveReportPreviewProps | LivePlanPreviewProps;

export function LiveDocumentPreview(props: LiveDocumentPreviewProps) {
  if (props.type === 'report') {
    return <LiveReportPreview {...props} />;
  }
  return <LivePlanPreview {...props} />;
}

function LiveReportPreview({ baseConfig, overrides, reportStatus = 'Draft' }: LiveReportPreviewProps) {
  const effectiveConfig = useMemo(
    () => applyReportOverrides(baseConfig, overrides),
    [baseConfig, overrides]
  );
  const resolved = useMemo(
    () => resolveReportTemplate(effectiveConfig, reportStatus),
    [effectiveConfig, reportStatus]
  );
  const hasOv = hasReportOverrides(overrides);
  const isDraft = reportStatus === 'Draft' || reportStatus === 'In Review';

  return (
    <Card className="overflow-hidden">
      <CardHeader className="py-2 px-4 bg-muted/40">
        <div className="flex items-center gap-2">
          <Eye className="h-3.5 w-3.5 text-muted-foreground" />
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Live Preview
          </CardTitle>
          {hasOv && <Badge variant="outline" className="text-[9px]">Overrides Applied</Badge>}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {/* Cover */}
        <div className="bg-[hsl(var(--primary))] text-primary-foreground px-4 py-3 relative">
          {resolved.showWatermark && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <p className="text-2xl font-bold text-primary-foreground/10 -rotate-45">{resolved.watermarkText}</p>
            </div>
          )}
          <div className="relative z-10">
            {resolved.branding.showLogo && (
              <div className="w-6 h-6 rounded bg-primary-foreground/20 mb-1 flex items-center justify-center text-[8px] font-bold">LOGO</div>
            )}
            <p className="text-xs font-bold">{resolved.branding.orgName}</p>
            <p className="text-[9px] opacity-70">{resolved.branding.country}</p>
          </div>
        </div>
        <div className="h-0.5 bg-[hsl(var(--accent))]" />

        {/* Title */}
        <div className="px-4 py-3 text-center border-b">
          <p className="text-sm font-bold">{resolved.coverPage.reportTitle}</p>
          {resolved.coverPage.showSubtitle && (
            <Badge variant="outline" className="text-[9px] mt-1">{resolved.coverPage.subtitleText}</Badge>
          )}
          {resolved.showIssuedStamp && (
            <Badge className="text-[9px] mt-1 bg-emerald-600">FINAL</Badge>
          )}
        </div>

        {/* Sections */}
        <div className="px-4 py-3 space-y-1.5">
          <p className="text-[9px] font-semibold text-muted-foreground uppercase mb-1">Sections</p>
          {resolved.sections.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2">
              <span className="text-[9px] font-bold text-primary-foreground bg-primary rounded-full h-4 w-4 flex items-center justify-center shrink-0">
                {i + 1}
              </span>
              <span className="text-xs">{s.label}</span>
            </div>
          ))}
        </div>

        <Separator />

        {/* Findings layout hint */}
        <div className="px-4 py-2">
          <p className="text-[9px] text-muted-foreground">
            {resolved.findingsLayout.showManagementResponseAfterRecommendation
              ? '✓ Management responses inline after recommendation'
              : '✓ Management responses in separate section'}
          </p>
        </div>

        <Separator />

        {/* Action plan status */}
        {resolved.actionPlanVisible && (
          <div className="px-4 py-2">
            <p className="text-[9px] text-muted-foreground">
              ✓ Action Plan Summary ({resolved.actionPlanColumns.length} columns)
            </p>
          </div>
        )}

        <Separator />

        {/* Sign-off */}
        <div className="px-4 py-3">
          <p className="text-[9px] font-semibold text-muted-foreground uppercase mb-2">Sign-off</p>
          <div className="space-y-2">
            {resolved.signatories.map((sig, i) => (
              <div key={i} className="text-[9px]">
                <p className="font-semibold text-muted-foreground">{sig.label}</p>
                <div className="border-t border-foreground/30 w-20 mt-2 mb-0.5" />
                <p className="text-muted-foreground">{sig.roleTitle}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2 bg-muted/30 border-t">
          <p className="text-[8px] text-muted-foreground text-center uppercase tracking-wider font-medium">
            {isDraft ? 'Draft — Not for distribution' : 'Confidential'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function LivePlanPreview({ baseConfig, overrides }: LivePlanPreviewProps) {
  const effectiveConfig = useMemo(
    () => applyPlanOverrides(baseConfig, overrides),
    [baseConfig, overrides]
  );
  const resolved = useMemo(
    () => resolvePlanTemplate(effectiveConfig),
    [effectiveConfig]
  );
  const hasOv = hasPlanOverrides(overrides);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="py-2 px-4 bg-muted/40">
        <div className="flex items-center gap-2">
          <Eye className="h-3.5 w-3.5 text-muted-foreground" />
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Live Preview
          </CardTitle>
          {hasOv && <Badge variant="outline" className="text-[9px]">Overrides Applied</Badge>}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {/* Cover */}
        <div className="bg-[hsl(var(--primary))] text-primary-foreground px-4 py-3">
          {resolved.coverPage.showOrgName && (
            <p className="text-[9px] opacity-70 mb-1">Internal Audit Department</p>
          )}
          <p className="text-sm font-bold">{resolved.coverPage.titleText}</p>
          <p className="text-[9px] opacity-70 mt-1">
            Fiscal Year: {resolved.coverPage.fiscalYearMode === 'range' ? '2025–2026' : '2026'}
          </p>
        </div>
        <div className="h-0.5 bg-[hsl(var(--accent))]" />

        {/* Summary */}
        <div className="px-4 py-3">
          <p className="text-xs font-semibold mb-2">{resolved.planSummary.titleOverride}</p>
          {resolved.planSummary.splitByType ? (
            <div className="space-y-2">
              {resolved.planSummary.sections.filter((s) => s.enabled).map((sec) => (
                <div key={sec.key} className="text-[9px] border-l-2 border-primary pl-2">
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

        {/* Governance */}
        <div className="px-4 py-3 space-y-1">
          {resolved.riskCoverage.enabled && (
            <p className="text-[9px]">✓ Risk Coverage Analysis</p>
          )}
          {resolved.governance.showBoardLine && (
            <p className="text-[9px]">✓ Board/Audit Committee</p>
          )}
          {resolved.governance.showApprovedByBlock && (
            <div className="text-[9px] mt-2">
              <p className="text-muted-foreground">{resolved.governance.preparedByLabel}: ___</p>
              <p className="text-muted-foreground">{resolved.governance.approvedByLabel}: ___</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
