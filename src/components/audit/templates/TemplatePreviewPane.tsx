import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { AuditReportTemplateConfig, AuditPlanTemplateConfig } from '@/lib/audit/documentTemplateDefaults';
import type { AuditPlanBranding, AuditPlanCoverPageConfig, AuditPlanTocConfig, AuditPlanPaginationConfig } from '@/lib/audit/auditPlanTemplateTypes';
import { useDocumentFoundation } from '@/hooks/useDocumentFoundation';

interface TemplatePreviewPaneProps {
  templateType: 'audit_report' | 'audit_plan';
  config: AuditReportTemplateConfig | AuditPlanTemplateConfig;
  brandingConfig?: AuditPlanBranding;
  coverPageConfig?: AuditPlanCoverPageConfig;
  tocConfig?: AuditPlanTocConfig;
  paginationConfig?: AuditPlanPaginationConfig;
}

export function TemplatePreviewPane({ templateType, config, brandingConfig, coverPageConfig, tocConfig, paginationConfig }: TemplatePreviewPaneProps) {
  if (templateType === 'audit_report') {
    return <ReportPreview config={config as AuditReportTemplateConfig} />;
  }
  return (
    <PlanPreview
      config={config as AuditPlanTemplateConfig}
      branding={brandingConfig}
      coverPage={coverPageConfig}
      toc={tocConfig}
      pagination={paginationConfig}
    />
  );
}

function ReportPreview({ config }: { config: AuditReportTemplateConfig }) {
  // Use Foundation for all formatting
  const { data: foundation } = useDocumentFoundation();
  const f = foundation;

  const sections = config.sectionRefs || config.sections || [];
  const enabledSections = [...sections].filter((s) => s.enabled).sort((a, b) => a.order - b.order);

  const primaryColor = f?.colorPalette.primary || '#1E3A5F';
  const goldColor = f?.colorPalette.gold || '#C4A756';

  return (
    <Card className="overflow-hidden">
      <CardHeader className="py-2 px-4 bg-muted/40">
        <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Report Preview</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {/* Mini cover page — uses Foundation branding */}
        <div className="text-white px-4 py-3 relative" style={{ backgroundColor: primaryColor }}>
          {f?.draftRules.showWatermark && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <p className="text-2xl font-bold text-white/10 -rotate-45">{f.draftRules.watermarkText}</p>
            </div>
          )}
          <div className="flex items-center justify-between relative z-10">
            <div>
              {f?.branding.showLogo && (
                <div className="w-6 h-6 rounded bg-white/20 mb-1 flex items-center justify-center text-[8px] font-bold">LOGO</div>
              )}
              <p className="text-xs font-bold">{f?.branding.orgName || 'Organization'}</p>
              <p className="text-[9px] opacity-70">{f?.branding.country || ''}</p>
            </div>
            <div className="text-[8px] opacity-60 text-right">
              <p>{f?.branding.address || ''}</p>
              <p>Tel: {f?.branding.phone || ''}</p>
            </div>
          </div>
        </div>
        <div className="h-0.5" style={{ backgroundColor: goldColor }} />

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
              <span
                className="text-[9px] font-bold text-white rounded-full h-4 w-4 flex items-center justify-center shrink-0"
                style={{ backgroundColor: primaryColor }}
              >
                {i + 1}
              </span>
              <span className="text-xs">{s.labelOverride || s.label}</span>
            </div>
          ))}
        </div>

        <Separator />

        {/* Sign-off preview — from Foundation */}
        <div className="px-4 py-3">
          <p className="text-[9px] font-semibold text-muted-foreground uppercase mb-2">Sign-off (from Foundation)</p>
          <div className="space-y-2">
            {(f?.signOff || []).map((sig, i) => (
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
          <p className="text-[8px] text-muted-foreground text-center uppercase tracking-wider font-medium">
            {f?.branding.confidentialLabel || 'Confidential'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function PlanPreview({
  config,
  branding,
  coverPage,
  toc,
  pagination,
}: {
  config: AuditPlanTemplateConfig;
  branding?: AuditPlanBranding;
  coverPage?: AuditPlanCoverPageConfig;
  toc?: AuditPlanTocConfig;
  pagination?: AuditPlanPaginationConfig;
}) {
  // Use Foundation for formatting
  const { data: foundation } = useDocumentFoundation();
  const f = foundation;

  const primaryColor = f?.colorPalette.primary || branding?.colorPalette.primary || '#1E3A5F';
  const secondaryColor = f?.colorPalette.secondary || branding?.colorPalette.secondary || '#4A7FB5';
  const accentColor = f?.colorPalette.accent || branding?.colorPalette.accent || '#E8F0FE';
  const textColor = f?.colorPalette.text || branding?.colorPalette.text || '#1A1A1A';

  const titleText = coverPage?.titleText || config.coverPage.titleText;
  const orgName = f?.branding.orgName || branding?.orgName || '';
  const showOrgName = coverPage?.showOrgName ?? true;
  const showEntity = coverPage?.showAuditableEntity ?? true;
  const showPeriod = coverPage?.showPeriodCovered ?? true;
  const showVersion = coverPage?.showVersionNumber ?? true;
  const showIssueDate = coverPage?.showIssueDate ?? true;
  const showConfLabel = coverPage?.showConfidentialLabel ?? true;
  const confidentialLabel = f?.branding.confidentialLabel || branding?.confidentialLabel || 'CONFIDENTIAL';
  const fiscalMode = coverPage?.fiscalYearMode || config.coverPage.fiscalYearMode;
  const coverStyle = coverPage?.coverStyle || 'minimal';
  const logoMode = branding?.logoMode || 'cover_only';
  const logoSize = branding?.logoSize || 'medium';
  const logoAlign = branding?.logoAlignment || 'center';
  const showWatermark = f?.draftRules.showWatermark ?? branding?.showWatermark ?? false;
  const watermarkText = f?.draftRules.watermarkText || branding?.watermarkText || 'DRAFT';
  const hasLogo = logoMode !== 'none';
  const hasCustomLogo = branding?.logoSource && branding.logoSource !== 'default' && branding.logoSource.length > 10;

  const logoSizePx = logoSize === 'small' ? 24 : logoSize === 'large' ? 40 : 32;
  const logoJustify = logoAlign === 'left' ? 'justify-start' : logoAlign === 'right' ? 'justify-end' : 'justify-center';

  return (
    <Card className="overflow-hidden">
      <CardHeader className="py-2 px-4 bg-muted/40">
        <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Plan Preview</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {/* Mini cover */}
        <div
          className="px-4 py-4 relative"
          style={{
            backgroundColor: coverStyle === 'formal' ? primaryColor : '#FFFFFF',
            color: coverStyle === 'formal' ? '#FFFFFF' : textColor,
          }}
        >
          {showWatermark && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <p
                className="text-2xl font-bold -rotate-45 select-none"
                style={{ color: coverStyle === 'formal' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)' }}
              >
                {watermarkText}
              </p>
            </div>
          )}

          {coverStyle === 'modern' && (
            <div
              className="absolute left-0 top-0 bottom-0 w-1.5"
              style={{ backgroundColor: primaryColor }}
            />
          )}

          <div className={`relative z-10 ${coverStyle === 'formal' ? 'text-center' : coverStyle === 'modern' ? 'pl-3' : 'text-center'}`}>
            {hasLogo && (
              <div className={`flex ${coverStyle === 'modern' ? 'justify-start' : logoJustify} mb-2`}>
                {hasCustomLogo ? (
                  <img
                    src={branding!.logoSource}
                    alt="Logo"
                    style={{ width: logoSizePx, height: logoSizePx }}
                    className="object-contain rounded"
                  />
                ) : (
                  <div
                    className="rounded flex items-center justify-center text-[7px] font-bold"
                    style={{
                      width: logoSizePx,
                      height: logoSizePx,
                      backgroundColor: coverStyle === 'formal' ? 'rgba(255,255,255,0.2)' : accentColor,
                      color: coverStyle === 'formal' ? '#FFFFFF' : primaryColor,
                    }}
                  >
                    LOGO
                  </div>
                )}
              </div>
            )}

            {showOrgName && orgName && (
              <p className="text-[9px] uppercase tracking-widest mb-1 opacity-70">{orgName}</p>
            )}

            <p
              className="text-sm font-bold"
              style={{ color: coverStyle === 'formal' ? '#FFFFFF' : primaryColor }}
            >
              {titleText}
            </p>

            <div className={`mt-2 space-y-0.5 text-[9px] ${coverStyle === 'formal' ? 'opacity-80' : 'text-muted-foreground'}`}>
              {showEntity && <p>Entity: Sample Department</p>}
              {showPeriod && (
                <p>Period: {fiscalMode === 'range' ? '2025–2026' : '2026'}</p>
              )}
              {showVersion && <p>Version: 1.0</p>}
              {showIssueDate && <p>Issue Date: April 2026</p>}
            </div>

            {showConfLabel && (
              <div className="mt-2">
                <Badge
                  variant="outline"
                  className="text-[8px] tracking-wider"
                  style={{
                    borderColor: coverStyle === 'formal' ? 'rgba(255,255,255,0.3)' : primaryColor,
                    color: coverStyle === 'formal' ? '#FFFFFF' : primaryColor,
                  }}
                >
                  {confidentialLabel}
                </Badge>
              </div>
            )}
          </div>
        </div>

        <div className="h-0.5" style={{ backgroundColor: secondaryColor }} />

        {/* TOC Preview */}
        {toc?.enabled && (
          <>
            <div className="px-4 py-3">
              <p className="text-xs font-semibold mb-2" style={{ color: primaryColor }}>
                {toc.title}
              </p>
              <div className="space-y-0.5">
                {[
                  { label: 'Executive Summary', page: '1' },
                  { label: 'Audit Objective', page: '2' },
                  { label: 'Risk Assessment', page: '4' },
                  { label: 'Resource Plan', page: '6' },
                ].map((entry, i) => (
                  <div key={i} className="flex items-baseline text-[9px]">
                    <span>{entry.label}</span>
                    {toc.showLeaderDots && (
                      <span className="flex-1 mx-1 border-b border-dotted border-muted-foreground/40 min-w-[16px]" />
                    )}
                    {!toc.showLeaderDots && <span className="flex-1" />}
                    {toc.showPageNumbers && (
                      <span className="text-muted-foreground tabular-nums">{entry.page}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <Separator />
          </>
        )}

        {/* Summary */}
        <div className="px-4 py-3">
          <p className="text-xs font-semibold mb-2" style={{ color: primaryColor }}>
            {config.planSummary.titleOverride}
          </p>
          {config.planSummary.splitByType ? (
            <div className="space-y-2">
              {config.planSummary.sections.filter((s) => s.enabled).map((sec) => (
                <div key={sec.key} className="text-[9px] border-l-2 pl-2" style={{ borderColor: primaryColor }}>
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

        {/* Foundation formatting info */}
        {f && (
          <div className="px-4 py-2 border-t bg-muted/20">
            <p className="text-[8px] text-muted-foreground uppercase tracking-wider mb-1">Foundation Palette</p>
            <div className="flex gap-1">
              {Object.entries(f.colorPalette).map(([key, color]) => (
                <div
                  key={key}
                  className="w-5 h-5 rounded border border-border"
                  style={{ backgroundColor: color }}
                  title={`${key}: ${color}`}
                />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
