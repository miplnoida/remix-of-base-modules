import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Eye, FileDown, FileText, Printer, ChevronRight } from 'lucide-react';
import type { AuditReportTemplateConfig, AuditPlanTemplateConfig, TemplateSectionRef } from '@/lib/audit/documentTemplateDefaults';
import type { ReportTemplateOverride, PlanTemplateOverride } from '@/lib/audit/documentTemplateOverrides';
import { applyReportOverrides, applyPlanOverrides, hasReportOverrides, hasPlanOverrides } from '@/lib/audit/documentTemplateOverrides';
import { resolveReportTemplate, resolvePlanTemplate } from '@/lib/audit/documentTemplateResolver';
import { buildRenderPlan, type RenderPlan } from '@/lib/audit/auditPlanRenderEngine';
import { exportAuditPlanPdf } from '@/lib/audit/auditPlanPdfExport';
import { exportAuditPlanDocx } from '@/lib/audit/auditPlanDocxExport';
import { getSectionZone } from '@/lib/audit/auditPlanPaginationEngine';
import { useDocumentTemplateSections } from '@/hooks/useDocumentTemplateSections';

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
  planData?: Record<string, any>;
  outputMode?: 'draft' | 'final';
  /** Show export buttons */
  showExport?: boolean;
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
        <div className="px-4 py-3 text-center border-b">
          <p className="text-sm font-bold">{resolved.coverPage.reportTitle}</p>
          {resolved.coverPage.showSubtitle && (
            <Badge variant="outline" className="text-[9px] mt-1">{resolved.coverPage.subtitleText}</Badge>
          )}
          {resolved.showIssuedStamp && (
            <Badge className="text-[9px] mt-1 bg-emerald-600">FINAL</Badge>
          )}
        </div>
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
        <div className="px-4 py-2">
          <p className="text-[9px] text-muted-foreground">
            {resolved.findingsLayout.showManagementResponseAfterRecommendation
              ? '✓ Management responses inline after recommendation'
              : '✓ Management responses in separate section'}
          </p>
        </div>
        <Separator />
        {resolved.actionPlanVisible && (
          <div className="px-4 py-2">
            <p className="text-[9px] text-muted-foreground">
              ✓ Action Plan Summary ({resolved.actionPlanColumns.length} columns)
            </p>
          </div>
        )}
        <Separator />
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
        <div className="px-4 py-2 bg-muted/30 border-t">
          <p className="text-[8px] text-muted-foreground text-center uppercase tracking-wider font-medium">
            {isDraft ? 'Draft — Not for distribution' : 'Confidential'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function LivePlanPreview({
  baseConfig,
  overrides,
  planData = {},
  outputMode,
  showExport = false,
}: LivePlanPreviewProps) {
  const [exporting, setExporting] = useState(false);
  const { sectionRefs: dbPlanSections } = useDocumentTemplateSections('audit_plan');

  const effectiveConfig = useMemo(
    () => applyPlanOverrides(baseConfig, overrides),
    [baseConfig, overrides]
  );

  // Convert DB section refs to plan overrides format
  const dbSectionOverrides = useMemo(() => {
    if (!dbPlanSections || dbPlanSections.length === 0) return undefined;
    return dbPlanSections.map((s) => ({
      id: s.id,
      enabled: s.enabled,
      required: s.required,
      order: s.order,
      label: s.labelOverride || s.label,
      inToc: s.includeInToc,
      startNewPage: s.startOnNewPage,
    }));
  }, [dbPlanSections]);

  const renderPlan = useMemo(
    () => buildRenderPlan({
      templateConfig: effectiveConfig,
      planData,
      outputMode,
      dbSectionOverrides,
    }),
    [effectiveConfig, planData, outputMode, dbSectionOverrides]
  );

  const hasOv = hasPlanOverrides(overrides);
  const { mapped, pages, tocEntries, showWatermark, watermarkText } = renderPlan;
  const branding = mapped.resolved.branding;
  const primaryColor = branding.colorPalette.primary;
  const secondaryColor = branding.colorPalette.secondary;
  const accentColor = branding.colorPalette.accent;
  const textColor = branding.colorPalette.text;

  // Section counts by zone
  const frontMatterCount = pages.filter((p) => getSectionZone(p.sectionId) === 'front_matter').length;
  const bodyCount = pages.filter((p) => getSectionZone(p.sectionId) === 'body').length;
  const appendixCount = pages.filter((p) => getSectionZone(p.sectionId) === 'appendix').length;

  const handleExport = async (format: 'pdf' | 'docx') => {
    setExporting(true);
    try {
      if (format === 'pdf') {
        await exportAuditPlanPdf(renderPlan, { planData, filename: 'Audit_Plan' });
      } else {
        await exportAuditPlanDocx(renderPlan, { planData, filename: 'Audit_Plan' });
      }
    } finally {
      setExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="py-2 px-4 bg-muted/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="h-3.5 w-3.5 text-muted-foreground" />
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Live Preview
            </CardTitle>
            {hasOv && <Badge variant="outline" className="text-[9px]">Overrides</Badge>}
            <Badge variant={renderPlan.outputMode === 'draft' ? 'secondary' : 'default'} className="text-[9px]">
              {renderPlan.outputMode === 'draft' ? 'Draft' : 'Final'}
            </Badge>
          </div>
          {showExport && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost" size="sm" className="h-6 px-2 text-[9px]"
                onClick={() => handleExport('pdf')} disabled={exporting}
              >
                <FileDown className="h-3 w-3 mr-1" />PDF
              </Button>
              <Button
                variant="ghost" size="sm" className="h-6 px-2 text-[9px]"
                onClick={() => handleExport('docx')} disabled={exporting}
              >
                <FileText className="h-3 w-3 mr-1" />DOCX
              </Button>
              <Button
                variant="ghost" size="sm" className="h-6 px-2 text-[9px]"
                onClick={handlePrint}
              >
                <Printer className="h-3 w-3 mr-1" />Print
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      <ScrollArea className="max-h-[600px]">
        <CardContent className="p-0 relative">
          {/* Watermark overlay */}
          {showWatermark && watermarkText && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
              <p className="text-3xl font-bold -rotate-45 opacity-[0.06]" style={{ color: primaryColor }}>
                {watermarkText}
              </p>
            </div>
          )}

          {/* ── Cover Page ── */}
          <div className="relative z-10 px-4 py-4" style={{ backgroundColor: primaryColor }}>
            {branding.logoMode !== 'none' && (
              <div
                className="w-8 h-8 rounded mb-2 flex items-center justify-center text-[7px] font-bold"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.15)',
                  color: 'rgba(255,255,255,0.8)',
                  marginLeft: branding.logoAlignment === 'center' ? 'auto' : branding.logoAlignment === 'right' ? 'auto' : '0',
                  marginRight: branding.logoAlignment === 'center' ? 'auto' : branding.logoAlignment === 'left' ? 'auto' : '0',
                }}
              >
                LOGO
              </div>
            )}
            <p className="text-sm font-bold text-white">{mapped.cover.titleText}</p>
            {mapped.cover.showOrgName && branding.orgName && (
              <p className="text-[9px] text-white/70 mt-0.5">{branding.orgName}</p>
            )}
            {mapped.cover.showPeriodCovered && (
              <p className="text-[9px] text-white/60 mt-1">
                Fiscal Year: {mapped.cover.fiscalYearDisplay}
              </p>
            )}
            {mapped.cover.showConfidentialLabel && mapped.cover.confidentialLabel && (
              <p className="text-[7px] text-white/40 mt-2 italic">{mapped.cover.confidentialLabel}</p>
            )}
          </div>
          {/* Accent bar */}
          <div className="h-1" style={{ backgroundColor: secondaryColor }} />

          {/* ── TOC ── */}
          {mapped.toc.enabled && tocEntries.length > 0 && (
            <>
              <div className="px-4 py-3">
                <p className="text-xs font-bold mb-2" style={{ color: primaryColor }}>
                  {mapped.toc.title}
                </p>
                <div className="space-y-1">
                  {tocEntries.map((entry) => (
                    <div key={entry.id} className="flex items-center gap-1 text-[9px]" style={{ paddingLeft: `${(entry.depth - 1) * 12}px` }}>
                      {entry.sectionNumber && (
                        <span className="font-semibold text-muted-foreground w-4 shrink-0">{entry.sectionNumber}.</span>
                      )}
                      <span className="flex-1 truncate">{entry.label}</span>
                      {mapped.toc.showLeaderDots && (
                        <span className="text-muted-foreground/40 flex-shrink-0 mx-1">{'·'.repeat(6)}</span>
                      )}
                      {entry.pageNumber && (
                        <span className="text-muted-foreground font-mono text-[8px] shrink-0">{entry.pageNumber}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* ── Section list by zone ── */}
          <div className="px-4 py-3 space-y-3">
            {/* Front Matter */}
            {frontMatterCount > 0 && (
              <div>
                <p className="text-[8px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Front Matter</p>
                {pages.filter((p) => getSectionZone(p.sectionId) === 'front_matter' && p.sectionId !== 'cover_page').map((page) => (
                  <SectionPreviewRow key={page.key} page={page} primaryColor={primaryColor} />
                ))}
              </div>
            )}

            {/* Body Sections */}
            {bodyCount > 0 && (
              <div>
                <p className="text-[8px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Body Sections</p>
                {pages.filter((p) => getSectionZone(p.sectionId) === 'body').map((page) => (
                  <SectionPreviewRow key={page.key} page={page} primaryColor={primaryColor} />
                ))}
              </div>
            )}

            {/* Appendix */}
            {appendixCount > 0 && (
              <div>
                <p className="text-[8px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Appendices</p>
                {pages.filter((p) => getSectionZone(p.sectionId) === 'appendix').map((page) => (
                  <SectionPreviewRow key={page.key} page={page} primaryColor={primaryColor} />
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* ── Approval Block ── */}
          {mapped.approval.signatories.length > 0 && (
            <>
              <div className="px-4 py-3">
                <p className="text-[8px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Approval & Sign-off</p>
                <div className="space-y-2">
                  {mapped.approval.signatories.map((sig, i) => (
                    <div key={i} className="text-[9px]">
                      <p className="font-semibold" style={{ color: primaryColor }}>{sig.label}</p>
                      {mapped.approval.showSignatureLine && (
                        <div className="border-t border-foreground/20 w-24 mt-3 mb-0.5" />
                      )}
                      <p className="text-muted-foreground">{sig.roleTitle}</p>
                      {mapped.approval.showDateField && (
                        <p className="text-muted-foreground/60 text-[8px]">Date: ___________</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* ── Quick Stats ── */}
          <div className="px-4 py-2 space-y-1">
            {mapped.riskCoverage.enabled && <p className="text-[9px] text-muted-foreground">✓ Risk Coverage Analysis</p>}
            {mapped.governance.showBoardLine && <p className="text-[9px] text-muted-foreground">✓ Board/Audit Committee</p>}
            <p className="text-[9px] text-muted-foreground">
              ✓ {pages.length} sections · {mapped.pagination.position.replace('-', ' ')} page numbers
            </p>
            <p className="text-[9px] text-muted-foreground">
              ✓ {mapped.typography.fontFamily} {mapped.typography.baseFontSize}pt · {mapped.pageLayout.pageSize.toUpperCase()} {mapped.pageLayout.orientation}
            </p>
          </div>

          {/* ── Footer ── */}
          <div className="px-4 py-2 border-t" style={{ backgroundColor: accentColor }}>
            <p className="text-[7px] text-center uppercase tracking-wider font-medium" style={{ color: primaryColor, opacity: 0.6 }}>
              {showWatermark ? `${watermarkText} — Not for distribution` : 'Confidential'}
            </p>
          </div>
        </CardContent>
      </ScrollArea>
    </Card>
  );
}

function SectionPreviewRow({ page, primaryColor }: { page: import('@/lib/audit/auditPlanRenderEngine').RenderPage; primaryColor: string }) {
  return (
    <div className="flex items-center gap-2 py-0.5">
      {page.sectionNumber ? (
        <span
          className="text-[8px] font-bold text-white rounded-full h-4 w-4 flex items-center justify-center shrink-0"
          style={{ backgroundColor: primaryColor }}
        >
          {page.sectionNumber}
        </span>
      ) : (
        <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
      )}
      <span className="text-[10px] flex-1">{page.label}</span>
      <div className="flex items-center gap-1">
        {page.pageBreakBefore && (
          <Badge variant="outline" className="text-[7px] px-1 py-0 h-3.5">break</Badge>
        )}
        {page.mandatory && (
          <Badge variant="secondary" className="text-[7px] px-1 py-0 h-3.5">req</Badge>
        )}
        {!page.pageNumberHidden && page.pageNumber && (
          <span className="text-[8px] text-muted-foreground font-mono">{page.pageNumber}</span>
        )}
      </div>
    </div>
  );
}
