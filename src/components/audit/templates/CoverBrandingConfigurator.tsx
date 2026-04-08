import React, { useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import {
  Upload,
  Image as ImageIcon,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import type {
  AuditPlanBranding,
  AuditPlanCoverPageConfig,
  LogoMode,
  LogoSize,
  LogoAlignment,
  CoverStyle,
} from '@/lib/audit/auditPlanTemplateTypes';

// ─── Validation ───

export interface CoverBrandingValidation {
  valid: boolean;
  errors: string[];
}

export function validateCoverBranding(
  branding: AuditPlanBranding,
  coverPage: AuditPlanCoverPageConfig
): CoverBrandingValidation {
  const errors: string[] = [];

  if (coverPage.titleText.trim().length === 0) {
    errors.push('Cover title is required.');
  }
  if (coverPage.titleText.length > 120) {
    errors.push('Cover title must be 120 characters or fewer.');
  }
  if (branding.orgName.length > 100) {
    errors.push('Organization name must be 100 characters or fewer.');
  }
  if (branding.confidentialLabel.length > 80) {
    errors.push('Confidential label must be 80 characters or fewer.');
  }
  if (branding.showWatermark && branding.watermarkText.trim().length === 0) {
    errors.push('Watermark text is required when watermark is enabled.');
  }
  if (branding.watermarkText.length > 40) {
    errors.push('Watermark text must be 40 characters or fewer.');
  }

  // Validate hex colors
  const hexPattern = /^#[0-9A-Fa-f]{6}$/;
  if (!hexPattern.test(branding.colorPalette.primary)) {
    errors.push('Primary color must be a valid hex color (e.g. #1E3A5F).');
  }
  if (!hexPattern.test(branding.colorPalette.secondary)) {
    errors.push('Secondary color must be a valid hex color.');
  }

  return { valid: errors.length === 0, errors };
}

// ─── Props ───

interface CoverBrandingConfiguratorProps {
  branding: AuditPlanBranding;
  coverPage: AuditPlanCoverPageConfig;
  onBrandingChange: (branding: AuditPlanBranding) => void;
  onCoverPageChange: (coverPage: AuditPlanCoverPageConfig) => void;
}

// ─── Component ───

export function CoverBrandingConfigurator({
  branding,
  coverPage,
  onBrandingChange,
  onCoverPageChange,
}: CoverBrandingConfiguratorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const validation = validateCoverBranding(branding, coverPage);

  const updateBranding = <K extends keyof AuditPlanBranding>(
    key: K,
    value: AuditPlanBranding[K]
  ) => {
    onBrandingChange({ ...branding, [key]: value });
  };

  const updateCover = <K extends keyof AuditPlanCoverPageConfig>(
    key: K,
    value: AuditPlanCoverPageConfig[K]
  ) => {
    onCoverPageChange({ ...coverPage, [key]: value });
  };

  const updatePalette = (key: string, value: string) => {
    onBrandingChange({
      ...branding,
      colorPalette: { ...branding.colorPalette, [key]: value },
    });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // For now, convert to data URL. In production, upload to storage bucket.
    const reader = new FileReader();
    reader.onload = () => {
      updateBranding('logoSource', reader.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const hasCustomLogo = branding.logoSource !== 'default' && branding.logoSource.length > 10;

  return (
    <TooltipProvider delayDuration={300}>
      <div className="space-y-5">
        {/* Validation */}
        {!validation.valid && (
          <div className="p-2.5 rounded-md bg-destructive/10 border border-destructive/20 space-y-1">
            {validation.errors.map((e, i) => (
              <p key={i} className="text-xs text-destructive flex items-center gap-1.5">
                <AlertCircle className="h-3 w-3 shrink-0" /> {e}
              </p>
            ))}
          </div>
        )}

        {/* ─── Logo ─── */}
        <div>
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
            Logo
          </Label>
          <div className="flex items-start gap-4">
            {/* Logo preview / upload */}
            <div
              className="w-20 h-20 rounded-md border-2 border-dashed border-border flex items-center justify-center bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors shrink-0 overflow-hidden"
              onClick={() => fileInputRef.current?.click()}
            >
              {hasCustomLogo ? (
                <img
                  src={branding.logoSource}
                  alt="Logo"
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <div className="text-center">
                  <ImageIcon className="h-6 w-6 mx-auto text-muted-foreground/50" />
                  <p className="text-[9px] text-muted-foreground mt-1">Upload</p>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/svg+xml"
              className="hidden"
              onChange={handleLogoUpload}
            />

            <div className="flex-1 space-y-3">
              {/* Logo placement */}
              <div>
                <Label className="text-xs">Placement</Label>
                <Select
                  value={branding.logoMode}
                  onValueChange={(v) => updateBranding('logoMode', v as LogoMode)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cover_only">Cover page only</SelectItem>
                    <SelectItem value="cover_and_header">Cover + page headers</SelectItem>
                    <SelectItem value="none">No logo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-3">
                {/* Logo size */}
                <div className="flex-1">
                  <Label className="text-xs">Size</Label>
                  <Select
                    value={branding.logoSize}
                    onValueChange={(v) => updateBranding('logoSize', v as LogoSize)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">Small</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="large">Large</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Logo alignment */}
                <div className="flex-1">
                  <Label className="text-xs">Alignment</Label>
                  <Select
                    value={branding.logoAlignment}
                    onValueChange={(v) => updateBranding('logoAlignment', v as LogoAlignment)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="left">Left</SelectItem>
                      <SelectItem value="center">Center</SelectItem>
                      <SelectItem value="right">Right</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {hasCustomLogo && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7 text-destructive hover:text-destructive"
                  onClick={() => updateBranding('logoSource', 'default')}
                >
                  <Trash2 className="h-3 w-3 mr-1" /> Remove logo
                </Button>
              )}
            </div>
          </div>
        </div>

        <Separator />

        {/* ─── Cover Content ─── */}
        <div>
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
            Cover Content
          </Label>
          <div className="grid gap-3">
            {/* Organization name */}
            <div>
              <Label className="text-xs">Organization Name</Label>
              <Input
                value={branding.orgName}
                onChange={(e) => updateBranding('orgName', e.target.value)}
                placeholder="e.g. Social Security Board"
                className="h-8 text-sm"
                maxLength={100}
              />
            </div>

            {/* Title */}
            <div>
              <Label className="text-xs">Document Title</Label>
              <Input
                value={coverPage.titleText}
                onChange={(e) => updateCover('titleText', e.target.value)}
                placeholder="Internal Audit Plan"
                className="h-8 text-sm"
                maxLength={120}
              />
            </div>

            {/* Cover style */}
            <div>
              <Label className="text-xs">Cover Style</Label>
              <Select
                value={coverPage.coverStyle}
                onValueChange={(v) => updateCover('coverStyle', v as CoverStyle)}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minimal">Minimal — clean, white background</SelectItem>
                  <SelectItem value="formal">Formal — centered, bordered layout</SelectItem>
                  <SelectItem value="modern">Modern — left-aligned, accent bar</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Fiscal year mode */}
            <div>
              <Label className="text-xs">Fiscal Year Display</Label>
              <Select
                value={coverPage.fiscalYearMode}
                onValueChange={(v) => updateCover('fiscalYearMode', v as 'single' | 'range')}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single Year (e.g. 2026)</SelectItem>
                  <SelectItem value="range">Year Range (e.g. 2025–2026)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Separator />

        {/* ─── Cover Element Visibility ─── */}
        <div>
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
            Cover Elements
          </Label>
          <div className="space-y-2.5">
            <ToggleRow label="Organization Name" checked={coverPage.showOrgName} onChange={(v) => updateCover('showOrgName', v)} />
            <ToggleRow label="Auditable Entity" checked={coverPage.showAuditableEntity} onChange={(v) => updateCover('showAuditableEntity', v)} />
            <ToggleRow label="Period Covered" checked={coverPage.showPeriodCovered} onChange={(v) => updateCover('showPeriodCovered', v)} />
            <ToggleRow label="Version Number" checked={coverPage.showVersionNumber} onChange={(v) => updateCover('showVersionNumber', v)} />
            <ToggleRow label="Issue Date" checked={coverPage.showIssueDate} onChange={(v) => updateCover('showIssueDate', v)} />
            <ToggleRow label="Confidential / Internal Use Label" checked={coverPage.showConfidentialLabel} onChange={(v) => updateCover('showConfidentialLabel', v)} />
          </div>
        </div>

        {/* Confidential label text */}
        {coverPage.showConfidentialLabel && (
          <div>
            <Label className="text-xs">Confidential Label Text</Label>
            <Input
              value={branding.confidentialLabel}
              onChange={(e) => updateBranding('confidentialLabel', e.target.value)}
              placeholder="CONFIDENTIAL"
              className="h-8 text-sm"
              maxLength={80}
            />
          </div>
        )}

        <Separator />

        {/* ─── Watermark ─── */}
        <div>
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
            Watermark
          </Label>
          <div className="space-y-3">
            <ToggleRow label="Show Watermark" checked={branding.showWatermark} onChange={(v) => updateBranding('showWatermark', v)} />
            {branding.showWatermark && (
              <div>
                <Label className="text-xs">Watermark Text</Label>
                <Input
                  value={branding.watermarkText}
                  onChange={(e) => updateBranding('watermarkText', e.target.value)}
                  placeholder="DRAFT"
                  className="h-8 text-sm"
                  maxLength={40}
                />
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* ─── Color Palette ─── */}
        <div>
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
            Color Palette
          </Label>
          <div className="grid grid-cols-2 gap-3">
            <ColorInput label="Primary" value={branding.colorPalette.primary} onChange={(v) => updatePalette('primary', v)} />
            <ColorInput label="Secondary" value={branding.colorPalette.secondary} onChange={(v) => updatePalette('secondary', v)} />
            <ColorInput label="Accent / Background" value={branding.colorPalette.accent} onChange={(v) => updatePalette('accent', v)} />
            <ColorInput label="Table Header" value={branding.colorPalette.tableHeader} onChange={(v) => updatePalette('tableHeader', v)} />
            <ColorInput label="Table Stripe" value={branding.colorPalette.tableStripe} onChange={(v) => updatePalette('tableStripe', v)} />
            <ColorInput label="Body Text" value={branding.colorPalette.text} onChange={(v) => updatePalette('text', v)} />
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">
            Tip: Use navy/slate/gray tones for a professional, print-friendly palette.
          </p>
        </div>
      </div>
    </TooltipProvider>
  );
}

// ─── Helpers ───

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <Label className="text-xs font-normal">{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="relative shrink-0">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-7 h-7 rounded border border-border cursor-pointer appearance-none bg-transparent [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded [&::-webkit-color-swatch]:border-0"
        />
      </div>
      <div className="flex-1 min-w-0">
        <Label className="text-[10px] text-muted-foreground block leading-none mb-0.5">{label}</Label>
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-6 text-[10px] font-mono px-1.5 uppercase"
          maxLength={7}
        />
      </div>
    </div>
  );
}
