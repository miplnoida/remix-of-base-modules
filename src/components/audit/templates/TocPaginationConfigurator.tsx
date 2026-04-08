import React from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Hash } from 'lucide-react';
import type { AuditPlanTocConfig, AuditPlanPaginationConfig, NumberingStyle, PageNumberPosition } from '@/lib/audit/auditPlanTemplateTypes';

interface TocPaginationConfiguratorProps {
  toc: AuditPlanTocConfig;
  pagination: AuditPlanPaginationConfig;
  onTocChange: (toc: AuditPlanTocConfig) => void;
  onPaginationChange: (pagination: AuditPlanPaginationConfig) => void;
}

const NUMBERING_STYLE_OPTIONS: { value: NumberingStyle; label: string; example: string }[] = [
  { value: 'arabic', label: 'Arabic', example: '1, 2, 3…' },
  { value: 'roman', label: 'Roman', example: 'i, ii, iii…' },
  { value: 'alpha', label: 'Alphabetic', example: 'A, B, C…' },
  { value: 'none', label: 'None', example: 'Hidden' },
];

const PAGE_POSITION_OPTIONS: { value: PageNumberPosition; label: string }[] = [
  { value: 'bottom-center', label: 'Bottom Center' },
  { value: 'bottom-right', label: 'Bottom Right' },
  { value: 'top-right', label: 'Top Right' },
];

export function TocPaginationConfigurator({
  toc,
  pagination,
  onTocChange,
  onPaginationChange,
}: TocPaginationConfiguratorProps) {
  const updateToc = (patch: Partial<AuditPlanTocConfig>) => onTocChange({ ...toc, ...patch });
  const updatePag = (patch: Partial<AuditPlanPaginationConfig>) => onPaginationChange({ ...pagination, ...patch });

  return (
    <div className="space-y-6">
      {/* ─── TOC Section ─── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <BookOpen className="h-4 w-4 text-muted-foreground" />
          <h4 className="text-sm font-semibold">Table of Contents</h4>
        </div>

        <div className="grid gap-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="toc-enabled">Enable TOC</Label>
            <Switch
              id="toc-enabled"
              checked={toc.enabled}
              onCheckedChange={(v) => updateToc({ enabled: v })}
            />
          </div>

          {toc.enabled && (
            <>
              <div>
                <Label htmlFor="toc-title">TOC Title</Label>
                <Input
                  id="toc-title"
                  value={toc.title}
                  onChange={(e) => updateToc({ title: e.target.value })}
                  placeholder="Table of Contents"
                  maxLength={60}
                />
              </div>

              <div>
                <Label htmlFor="toc-depth">Heading Depth</Label>
                <Select
                  value={String(toc.depth)}
                  onValueChange={(v) => updateToc({ depth: Number(v) as 1 | 2 | 3 })}
                >
                  <SelectTrigger id="toc-depth">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Depth 1 — H1 only</SelectItem>
                    <SelectItem value="2">Depth 2 — H1 + H2</SelectItem>
                    <SelectItem value="3">Depth 3 — H1 + H2 + H3</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="toc-dots">Leader Dots</Label>
                  <p className="text-xs text-muted-foreground">Dotted line between title and page number</p>
                </div>
                <Switch
                  id="toc-dots"
                  checked={toc.showLeaderDots}
                  onCheckedChange={(v) => updateToc({ showLeaderDots: v })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="toc-pages">Show Page Numbers in TOC</Label>
                  <p className="text-xs text-muted-foreground">Display page references alongside entries</p>
                </div>
                <Switch
                  id="toc-pages"
                  checked={toc.showPageNumbers}
                  onCheckedChange={(v) => updateToc({ showPageNumbers: v })}
                />
              </div>

              {/* TOC Preview */}
              <div className="rounded-md border bg-muted/30 p-3">
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-2">Preview</p>
                <TocMiniPreview toc={toc} />
              </div>
            </>
          )}
        </div>
      </div>

      <Separator />

      {/* ─── Pagination Section ─── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Hash className="h-4 w-4 text-muted-foreground" />
          <h4 className="text-sm font-semibold">Page Numbering</h4>
        </div>

        <div className="grid gap-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="pag-enabled">Show Page Numbers</Label>
            <Switch
              id="pag-enabled"
              checked={pagination.showPageNumbers}
              onCheckedChange={(v) => updatePag({ showPageNumbers: v })}
            />
          </div>

          {pagination.showPageNumbers && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="pag-cover">Hide on Cover Page</Label>
                  <p className="text-xs text-muted-foreground">Suppresses page number on the first page</p>
                </div>
                <Switch
                  id="pag-cover"
                  checked={pagination.hideOnCover}
                  onCheckedChange={(v) => updatePag({ hideOnCover: v })}
                />
              </div>

              <div>
                <Label htmlFor="pag-position">Position</Label>
                <Select
                  value={pagination.position}
                  onValueChange={(v) => updatePag({ position: v as PageNumberPosition })}
                >
                  <SelectTrigger id="pag-position">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_POSITION_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator className="my-1" />

              {/* Numbering styles per document zone */}
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Numbering Styles by Zone</p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Front matter */}
                <div>
                  <Label className="text-xs">Front Matter</Label>
                  <p className="text-[10px] text-muted-foreground mb-1">Cover, TOC, Document Control</p>
                  <Select
                    value={pagination.frontMatterStyle}
                    onValueChange={(v) => updatePag({ frontMatterStyle: v as NumberingStyle })}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {NUMBERING_STYLE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label} <span className="text-muted-foreground ml-1">({opt.example})</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Body */}
                <div>
                  <Label className="text-xs">Body</Label>
                  <p className="text-[10px] text-muted-foreground mb-1">Main content sections</p>
                  <Select
                    value={pagination.bodyStyle}
                    onValueChange={(v) => updatePag({ bodyStyle: v as 'arabic' | 'roman' })}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="arabic">Arabic (1, 2, 3…)</SelectItem>
                      <SelectItem value="roman">Roman (I, II, III…)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Appendix */}
                <div>
                  <Label className="text-xs">Appendices</Label>
                  <p className="text-[10px] text-muted-foreground mb-1">Supplementary material</p>
                  <Select
                    value={pagination.appendixStyle}
                    onValueChange={(v) => updatePag({ appendixStyle: v as NumberingStyle })}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {NUMBERING_STYLE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label} <span className="text-muted-foreground ml-1">({opt.example})</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}

          <Separator className="my-1" />

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="pag-break">Page Breaks Between Sections</Label>
              <p className="text-xs text-muted-foreground">Force new page for each major section</p>
            </div>
            <Switch
              id="pag-break"
              checked={pagination.pageBreakBetweenSections}
              onCheckedChange={(v) => updatePag({ pageBreakBetweenSections: v })}
            />
          </div>

          {/* Numbering preview */}
          {pagination.showPageNumbers && (
            <div className="rounded-md border bg-muted/30 p-3">
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-2">Numbering Preview</p>
              <PaginationMiniPreview pagination={pagination} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Mini Preview: TOC ───

function TocMiniPreview({ toc }: { toc: AuditPlanTocConfig }) {
  const sampleEntries = [
    { label: 'Executive Summary', page: '1', depth: 1 },
    { label: 'Audit Objective', page: '2', depth: 1 },
    { label: 'Scope Details', page: '2', depth: 2 },
    { label: 'Risk Assessment Summary', page: '4', depth: 1 },
    { label: 'Risk Matrix', page: '4', depth: 2 },
    { label: 'Control Gaps', page: '5', depth: 3 },
  ].filter((e) => e.depth <= toc.depth);

  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold mb-1.5">{toc.title}</p>
      {sampleEntries.map((entry, i) => (
        <div
          key={i}
          className="flex items-baseline text-[10px]"
          style={{ paddingLeft: (entry.depth - 1) * 12 }}
        >
          <span className="shrink-0">{entry.label}</span>
          {toc.showLeaderDots && (
            <span className="flex-1 mx-1 border-b border-dotted border-muted-foreground/40 min-w-[20px]" />
          )}
          {!toc.showLeaderDots && <span className="flex-1" />}
          {toc.showPageNumbers && (
            <span className="shrink-0 text-muted-foreground tabular-nums">{entry.page}</span>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Mini Preview: Pagination ───

function PaginationMiniPreview({ pagination }: { pagination: AuditPlanPaginationConfig }) {
  const zones = [
    {
      zone: 'Front Matter',
      style: pagination.frontMatterStyle,
      pages: pagination.frontMatterStyle === 'none' ? ['—'] : formatPageNumbers(pagination.frontMatterStyle, [1, 2, 3]),
    },
    {
      zone: 'Body',
      style: pagination.bodyStyle,
      pages: formatPageNumbers(pagination.bodyStyle, [1, 2, 3, 4, 5]),
    },
    {
      zone: 'Appendices',
      style: pagination.appendixStyle,
      pages: pagination.appendixStyle === 'none' ? ['—'] : formatPageNumbers(pagination.appendixStyle, [1, 2]),
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {zones.map((z) => (
        <div key={z.zone} className="text-center">
          <p className="text-[9px] font-semibold text-muted-foreground mb-1">{z.zone}</p>
          <div className="flex justify-center gap-1 flex-wrap">
            {z.pages.map((p, i) => (
              <Badge key={i} variant="outline" className="text-[9px] px-1 py-0 h-4 font-mono">
                {p}
              </Badge>
            ))}
          </div>
        </div>
      ))}
      <div className="col-span-3 text-center mt-1">
        <span className="text-[9px] text-muted-foreground">Position: </span>
        <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4">
          {pagination.position.replace('-', ' ')}
        </Badge>
        {pagination.hideOnCover && (
          <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 ml-1">
            Cover hidden
          </Badge>
        )}
      </div>
    </div>
  );
}

function formatPageNumbers(style: string, numbers: number[]): string[] {
  switch (style) {
    case 'roman':
      return numbers.map(toRoman);
    case 'alpha':
      return numbers.map((n) => String.fromCharCode(64 + n));
    case 'arabic':
      return numbers.map(String);
    default:
      return numbers.map(String);
  }
}

function toRoman(num: number): string {
  const vals = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
  const syms = ['M', 'CM', 'D', 'CD', 'C', 'XC', 'L', 'XL', 'X', 'IX', 'V', 'IV', 'I'];
  let result = '';
  for (let i = 0; i < vals.length; i++) {
    while (num >= vals[i]) {
      result += syms[i];
      num -= vals[i];
    }
  }
  return result.toLowerCase();
}
