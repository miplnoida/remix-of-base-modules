import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Save, ChevronDown, ChevronUp, Palette, Type, LayoutGrid, Hash, Table2, ShieldCheck, Loader2, Upload, Image as ImageIcon, X, Sparkles, Check } from 'lucide-react';
import { useDocumentFoundation, useDocumentFoundationMutation } from '@/hooks/useDocumentFoundation';
import { useUserCode } from '@/hooks/useUserCode';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  DEFAULT_FOUNDATION,
  type DocumentFoundationConfig,
} from '@/lib/audit/documentFoundationTypes';
import {
  FOUNDATION_PRESETS,
  FOUNDATION_PRESET_METADATA,
} from '@/lib/audit/documentFoundationPresets';

const FONT_OPTIONS = [
  { label: 'Arial', value: 'Arial, Helvetica, sans-serif' },
  { label: 'Times New Roman', value: 'Times New Roman, Times, serif' },
  { label: 'Calibri', value: 'Calibri, Candara, sans-serif' },
  { label: 'Cambria', value: 'Cambria, Georgia, serif' },
  { label: 'Georgia', value: 'Georgia, Times New Roman, serif' },
  { label: 'Verdana', value: 'Verdana, Geneva, sans-serif' },
  { label: 'Tahoma', value: 'Tahoma, Geneva, sans-serif' },
  { label: 'Trebuchet MS', value: 'Trebuchet MS, Lucida Grande, sans-serif' },
  { label: 'Garamond', value: 'Garamond, Baskerville, serif' },
  { label: 'Palatino', value: 'Palatino Linotype, Book Antiqua, serif' },
  { label: 'Century Gothic', value: 'Century Gothic, CenturyGothic, sans-serif' },
  { label: 'Book Antiqua', value: 'Book Antiqua, Palatino, serif' },
  { label: 'Courier New', value: 'Courier New, Courier, monospace' },
  { label: 'Lucida Sans', value: 'Lucida Sans Unicode, Lucida Grande, sans-serif' },
  { label: 'Segoe UI', value: 'Segoe UI, Tahoma, sans-serif' },
];

const SECTIONS = [
  { key: 'branding', label: 'Branding & Logo', icon: Palette },
  { key: 'colors', label: 'Color Palette', icon: Palette },
  { key: 'typography', label: 'Typography', icon: Type },
  { key: 'pageLayout', label: 'Page Layout', icon: LayoutGrid },
  { key: 'pagination', label: 'Pagination & Page Numbering', icon: Hash },
  { key: 'tableStyle', label: 'Table Style', icon: Table2 },
  { key: 'draftRules', label: 'Watermark, Draft & Final Rules', icon: ShieldCheck },
] as const;

export function FoundationSettingsEditor() {
  const { data: foundation, isLoading } = useDocumentFoundation();
  const mutation = useDocumentFoundationMutation();
  const { userCode } = useUserCode();
  const [draft, setDraft] = useState<DocumentFoundationConfig>(DEFAULT_FOUNDATION);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ branding: true });
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [presetOpen, setPresetOpen] = useState(false);

  const applyPreset = (key: string) => {
    const preset = FOUNDATION_PRESETS[key];
    if (!preset) return;
    // Apply colors, typography, and table style from preset while preserving branding text & logo
    setDraft((d) => ({
      ...d,
      colorPalette: { ...preset.colorPalette },
      typography: { ...preset.typography },
      tableStyle: { ...preset.tableStyle },
    }));
    const meta = FOUNDATION_PRESET_METADATA.find((m) => m.key === key);
    toast.success(`Applied "${meta?.name ?? key}" preset`, { description: 'Colors, typography, and table styles updated. Save to persist.' });
    setPresetOpen(false);
  };

  useEffect(() => {
    if (foundation) setDraft(foundation);
  }, [foundation]);

  const toggleSection = (key: string) =>
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleSave = () => {
    mutation.mutate(
      { config: draft, updatedBy: userCode || 'system' },
      {
        onSuccess: () => toast.success('Organization document foundation saved'),
        onError: (e) => toast.error('Failed to save foundation', { description: String(e) }),
      }
    );
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type', { description: 'Please upload PNG, JPG, SVG, or WebP.' });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File too large', { description: 'Maximum file size is 2 MB.' });
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'png';
      const filePath = `logos/org-logo-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('audit-assets')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('audit-assets')
        .getPublicUrl(filePath);

      setDraft((d) => ({
        ...d,
        branding: { ...d.branding, logoSource: urlData.publicUrl },
      }));
      toast.success('Logo uploaded successfully');
    } catch (err: any) {
      toast.error('Logo upload failed', { description: err.message });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveLogo = () => {
    setDraft((d) => ({
      ...d,
      branding: { ...d.branding, logoSource: 'default' },
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mr-2" />
        <span className="text-sm text-muted-foreground">Loading foundation settings…</span>
      </div>
    );
  }

  const hasCustomLogo = draft.branding.logoSource && draft.branding.logoSource !== 'default';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">
            Global formatting and output defaults inherited by <strong>all</strong> audit document types.
            Controls branding, typography, page layout, table styling, and watermark rules only.
            Section visibility, ordering, and sign-off configuration are managed per document template.
          </p>
        </div>
        <Button size="sm" onClick={handleSave} disabled={mutation.isPending}>
          {mutation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
          Save Foundation
        </Button>
      </div>

      {/* Branding */}
      <SettingsCard sectionKey="branding" open={openSections.branding} onToggle={toggleSection} title="Branding & Logo" icon={Palette}>
        <div className="grid gap-4">
          <div className="flex items-center justify-between">
            <Label>Show Logo</Label>
            <Switch checked={draft.branding.showLogo} onCheckedChange={(v) => setDraft((d) => ({ ...d, branding: { ...d.branding, showLogo: v } }))} />
          </div>

          {/* Logo Upload */}
          {draft.branding.showLogo && (
            <div className="space-y-3">
              <Label className="text-xs font-medium">Organization Logo</Label>
              <div className="flex items-start gap-4">
                {/* Preview */}
                <div className="w-32 h-20 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted/30 overflow-hidden">
                  {hasCustomLogo ? (
                    <img
                      src={draft.branding.logoSource}
                      alt="Organization logo"
                      className="max-w-full max-h-full object-contain"
                    />
                  ) : (
                    <div className="text-center">
                      <ImageIcon className="h-6 w-6 text-muted-foreground mx-auto" />
                      <span className="text-[10px] text-muted-foreground">No logo</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml,image/webp"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 mr-1" />
                    )}
                    {hasCustomLogo ? 'Replace Logo' : 'Upload Logo'}
                  </Button>
                  {hasCustomLogo && (
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={handleRemoveLogo}>
                      <X className="h-3 w-3 mr-1" /> Remove
                    </Button>
                  )}
                  <p className="text-[10px] text-muted-foreground">PNG, JPG, SVG or WebP. Max 2 MB.</p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Logo Size</Label>
              <Select value={draft.branding.logoSize} onValueChange={(v: any) => setDraft((d) => ({ ...d, branding: { ...d.branding, logoSize: v } }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Small</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="large">Large</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Logo Alignment</Label>
              <Select value={draft.branding.logoAlignment} onValueChange={(v: any) => setDraft((d) => ({ ...d, branding: { ...d.branding, logoAlignment: v } }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Left</SelectItem>
                  <SelectItem value="center">Center</SelectItem>
                  <SelectItem value="right">Right</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Organization Name</Label>
            <Input value={draft.branding.orgName} onChange={(e) => setDraft((d) => ({ ...d, branding: { ...d.branding, orgName: e.target.value } }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Country</Label>
              <Input value={draft.branding.country} onChange={(e) => setDraft((d) => ({ ...d, branding: { ...d.branding, country: e.target.value } }))} />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={draft.branding.phone} onChange={(e) => setDraft((d) => ({ ...d, branding: { ...d.branding, phone: e.target.value } }))} />
            </div>
          </div>
          <div>
            <Label>Address</Label>
            <Input value={draft.branding.address} onChange={(e) => setDraft((d) => ({ ...d, branding: { ...d.branding, address: e.target.value } }))} />
          </div>
          <div>
            <Label>Confidential Label</Label>
            <Input value={draft.branding.confidentialLabel} onChange={(e) => setDraft((d) => ({ ...d, branding: { ...d.branding, confidentialLabel: e.target.value } }))} />
          </div>
        </div>
      </SettingsCard>

      {/* Color Palette */}
      <SettingsCard sectionKey="colors" open={openSections.colors} onToggle={toggleSection} title="Color Palette" icon={Palette}>
        <div className="grid grid-cols-2 gap-4">
          {Object.entries(draft.colorPalette).map(([key, value]) => (
            <div key={key} className="flex items-center gap-3">
              <input
                type="color"
                value={value}
                onChange={(e) => setDraft((d) => ({ ...d, colorPalette: { ...d.colorPalette, [key]: e.target.value } }))}
                className="w-8 h-8 rounded border cursor-pointer"
              />
              <div>
                <Label className="text-xs capitalize">{key.replace(/([A-Z])/g, ' $1')}</Label>
                <p className="text-[10px] text-muted-foreground font-mono">{value}</p>
              </div>
            </div>
          ))}
        </div>
      </SettingsCard>

      {/* Typography */}
      <SettingsCard sectionKey="typography" open={openSections.typography} onToggle={toggleSection} title="Typography" icon={Type}>
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Body Font</Label>
              <Select value={draft.typography.fontFamily} onValueChange={(v) => setDraft((d) => ({ ...d, typography: { ...d.typography, fontFamily: v } }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FONT_OPTIONS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      <span style={{ fontFamily: f.value }}>{f.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Heading Font</Label>
              <Select value={draft.typography.headingFont} onValueChange={(v) => setDraft((d) => ({ ...d, typography: { ...d.typography, headingFont: v } }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FONT_OPTIONS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      <span style={{ fontFamily: f.value }}>{f.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-3">
            <div>
              <Label className="text-xs">Base Size (pt)</Label>
              <Input type="number" value={draft.typography.baseFontSize} onChange={(e) => setDraft((d) => ({ ...d, typography: { ...d.typography, baseFontSize: Number(e.target.value) } }))} />
            </div>
            <div>
              <Label className="text-xs">H1 (pt)</Label>
              <Input type="number" value={draft.typography.h1Size} onChange={(e) => setDraft((d) => ({ ...d, typography: { ...d.typography, h1Size: Number(e.target.value) } }))} />
            </div>
            <div>
              <Label className="text-xs">H2 (pt)</Label>
              <Input type="number" value={draft.typography.h2Size} onChange={(e) => setDraft((d) => ({ ...d, typography: { ...d.typography, h2Size: Number(e.target.value) } }))} />
            </div>
            <div>
              <Label className="text-xs">H3 (pt)</Label>
              <Input type="number" value={draft.typography.h3Size} onChange={(e) => setDraft((d) => ({ ...d, typography: { ...d.typography, h3Size: Number(e.target.value) } }))} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Line Height</Label>
              <Input type="number" step="0.1" value={draft.typography.lineHeight} onChange={(e) => setDraft((d) => ({ ...d, typography: { ...d.typography, lineHeight: Number(e.target.value) } }))} />
            </div>
            <div>
              <Label className="text-xs">Heading Color</Label>
              <div className="flex gap-2 items-center">
                <input type="color" value={draft.typography.headingColor} onChange={(e) => setDraft((d) => ({ ...d, typography: { ...d.typography, headingColor: e.target.value } }))} className="w-8 h-8 rounded border cursor-pointer" />
                <span className="text-xs font-mono text-muted-foreground">{draft.typography.headingColor}</span>
              </div>
            </div>
            <div>
              <Label className="text-xs">Body Color</Label>
              <div className="flex gap-2 items-center">
                <input type="color" value={draft.typography.bodyColor} onChange={(e) => setDraft((d) => ({ ...d, typography: { ...d.typography, bodyColor: e.target.value } }))} className="w-8 h-8 rounded border cursor-pointer" />
                <span className="text-xs font-mono text-muted-foreground">{draft.typography.bodyColor}</span>
              </div>
            </div>
          </div>
        </div>
      </SettingsCard>

      {/* Page Layout */}
      <SettingsCard sectionKey="pageLayout" open={openSections.pageLayout} onToggle={toggleSection} title="Page Layout" icon={LayoutGrid}>
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Page Size</Label>
              <Select value={draft.pageLayout.pageSize} onValueChange={(v: any) => setDraft((d) => ({ ...d, pageLayout: { ...d.pageLayout, pageSize: v } }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="letter">US Letter</SelectItem>
                  <SelectItem value="a4">A4</SelectItem>
                  <SelectItem value="legal">Legal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Orientation</Label>
              <Select value={draft.pageLayout.orientation} onValueChange={(v: any) => setDraft((d) => ({ ...d, pageLayout: { ...d.pageLayout, orientation: v } }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="portrait">Portrait</SelectItem>
                  <SelectItem value="landscape">Landscape</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Margins (inches)</Label>
            <div className="grid grid-cols-4 gap-3">
              {(['top', 'bottom', 'left', 'right'] as const).map((side) => (
                <div key={side}>
                  <Label className="text-xs capitalize">{side}</Label>
                  <Input
                    type="number"
                    step="0.25"
                    min="0.25"
                    value={draft.pageLayout.margins[side]}
                    onChange={(e) => setDraft((d) => ({
                      ...d,
                      pageLayout: { ...d.pageLayout, margins: { ...d.pageLayout.margins, [side]: Number(e.target.value) } },
                    }))}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </SettingsCard>

      {/* Pagination */}
      <SettingsCard sectionKey="pagination" open={openSections.pagination} onToggle={toggleSection} title="Pagination" icon={Hash}>
        <div className="grid gap-4">
          <div className="flex items-center justify-between">
            <Label>Show Page Numbers</Label>
            <Switch checked={draft.pagination.showPageNumbers} onCheckedChange={(v) => setDraft((d) => ({ ...d, pagination: { ...d.pagination, showPageNumbers: v } }))} />
          </div>
          <div className="flex items-center justify-between">
            <Label>Hide on Cover Page</Label>
            <Switch checked={draft.pagination.hideOnCover} onCheckedChange={(v) => setDraft((d) => ({ ...d, pagination: { ...d.pagination, hideOnCover: v } }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Position</Label>
              <Select value={draft.pagination.position} onValueChange={(v: any) => setDraft((d) => ({ ...d, pagination: { ...d.pagination, position: v } }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bottom-center">Bottom Center</SelectItem>
                  <SelectItem value="bottom-right">Bottom Right</SelectItem>
                  <SelectItem value="top-right">Top Right</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Body Style</Label>
              <Select value={draft.pagination.bodyStyle} onValueChange={(v: any) => setDraft((d) => ({ ...d, pagination: { ...d.pagination, bodyStyle: v } }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="arabic">Arabic (1, 2, 3)</SelectItem>
                  <SelectItem value="roman">Roman (i, ii, iii)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Label>Page Break Between Sections</Label>
            <Switch checked={draft.pagination.pageBreakBetweenSections} onCheckedChange={(v) => setDraft((d) => ({ ...d, pagination: { ...d.pagination, pageBreakBetweenSections: v } }))} />
          </div>
        </div>
      </SettingsCard>

      {/* Table Style */}
      <SettingsCard sectionKey="tableStyle" open={openSections.tableStyle} onToggle={toggleSection} title="Table Style" icon={Table2}>
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Header Background</Label>
              <div className="flex gap-2 items-center">
                <input type="color" value={draft.tableStyle.headerBackground} onChange={(e) => setDraft((d) => ({ ...d, tableStyle: { ...d.tableStyle, headerBackground: e.target.value } }))} className="w-8 h-8 rounded border cursor-pointer" />
                <span className="text-xs font-mono text-muted-foreground">{draft.tableStyle.headerBackground}</span>
              </div>
            </div>
            <div>
              <Label className="text-xs">Header Text Color</Label>
              <div className="flex gap-2 items-center">
                <input type="color" value={draft.tableStyle.headerTextColor} onChange={(e) => setDraft((d) => ({ ...d, tableStyle: { ...d.tableStyle, headerTextColor: e.target.value } }))} className="w-8 h-8 rounded border cursor-pointer" />
                <span className="text-xs font-mono text-muted-foreground">{draft.tableStyle.headerTextColor}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Label>Striped Rows</Label>
            <Switch checked={draft.tableStyle.stripedRows} onCheckedChange={(v) => setDraft((d) => ({ ...d, tableStyle: { ...d.tableStyle, stripedRows: v } }))} />
          </div>
          <div className="flex items-center justify-between">
            <Label>Repeat Header on Page Break</Label>
            <Switch checked={draft.tableStyle.repeatHeaderOnPageBreak} onCheckedChange={(v) => setDraft((d) => ({ ...d, tableStyle: { ...d.tableStyle, repeatHeaderOnPageBreak: v } }))} />
          </div>
          <div className="flex items-center justify-between">
            <Label>Bold Total Rows</Label>
            <Switch checked={draft.tableStyle.boldTotalRows} onCheckedChange={(v) => setDraft((d) => ({ ...d, tableStyle: { ...d.tableStyle, boldTotalRows: v } }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Font Size</Label>
              <Select value={draft.tableStyle.fontSize} onValueChange={(v: any) => setDraft((d) => ({ ...d, tableStyle: { ...d.tableStyle, fontSize: v } }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Small</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Cell Padding (pt)</Label>
              <Input type="number" min={2} max={16} value={draft.tableStyle.cellPadding} onChange={(e) => setDraft((d) => ({ ...d, tableStyle: { ...d.tableStyle, cellPadding: Number(e.target.value) } }))} />
            </div>
          </div>
        </div>
      </SettingsCard>

      {/* Sign-off signatories are now managed per document template in the Sections panel */}

      {/* Draft & Final Rules */}
      <SettingsCard sectionKey="draftRules" open={openSections.draftRules} onToggle={toggleSection} title="Draft & Final Rules" icon={ShieldCheck}>
        <div className="space-y-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase">Draft Rules</p>
          <div className="flex items-center justify-between">
            <Label>Show Watermark on Drafts</Label>
            <Switch checked={draft.draftRules.showWatermark} onCheckedChange={(v) => setDraft((d) => ({ ...d, draftRules: { ...d.draftRules, showWatermark: v } }))} />
          </div>
          {draft.draftRules.showWatermark && (
            <div>
              <Label>Watermark Text</Label>
              <Input value={draft.draftRules.watermarkText} onChange={(e) => setDraft((d) => ({ ...d, draftRules: { ...d.draftRules, watermarkText: e.target.value } }))} />
            </div>
          )}
          <p className="text-xs font-semibold text-muted-foreground uppercase pt-2">Final / Issued</p>
          <div className="flex items-center justify-between">
            <Label>Show Issued Stamp on Final</Label>
            <Switch checked={draft.draftRules.showIssuedStamp} onCheckedChange={(v) => setDraft((d) => ({ ...d, draftRules: { ...d.draftRules, showIssuedStamp: v } }))} />
          </div>
        </div>
      </SettingsCard>
    </div>
  );
}

// ─── Collapsible Settings Card ───

function SettingsCard({
  sectionKey,
  open,
  onToggle,
  title,
  icon: Icon,
  children,
}: {
  sectionKey: string;
  open: boolean;
  onToggle: (key: string) => void;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <Collapsible open={open} onOpenChange={() => onToggle(sectionKey)}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer py-3 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-semibold">{title}</CardTitle>
              </div>
              {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 pb-4 px-4">{children}</CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
