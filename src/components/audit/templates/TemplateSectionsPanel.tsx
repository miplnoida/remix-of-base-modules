/**
 * TemplateSectionsPanel — Shared section configuration panel
 * for all document template editors.
 *
 * Loads eligible sections from Section Library, merges with per-template
 * config from ia_document_template_sections, and provides full editing:
 *   - Visible toggle
 *   - Required toggle  
 *   - Sort order (drag-style up/down)
 *   - Heading override
 *   - Include in TOC
 *   - Start on new page
 *
 * Saves back to ia_document_template_sections via bulk upsert.
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ArrowUp,
  ArrowDown,
  GripVertical,
  Lock,
  BookOpen,
  SeparatorHorizontal,
  Save,
  RotateCcw,
  Loader2,
  ChevronDown,
  ChevronUp,
  Pencil,
  FileText,
  Table2,
  LayoutTemplate,
} from 'lucide-react';
import { useMergedTemplateSections, type MergedTemplateSection } from '@/hooks/useMergedTemplateSections';
import { useBulkUpsertTemplateSections } from '@/hooks/useTemplateSectionConfig';
import { useUserCode } from '@/hooks/useUserCode';
import type { AuditDocumentType } from '@/lib/audit/documentFoundationTypes';
import { toast } from 'sonner';

interface TemplateSectionsPanelProps {
  documentType: AuditDocumentType;
  /** Whether the panel is editable (false for system/locked templates) */
  editable?: boolean;
  /** Called after successful save with the updated sections */
  onSaved?: (sections: MergedTemplateSection[]) => void;
}

const DISPLAY_MODE_ICONS: Record<string, React.ReactNode> = {
  narrative: <FileText className="h-3 w-3" />,
  table: <Table2 className="h-3 w-3" />,
  auto: <LayoutTemplate className="h-3 w-3" />,
};

const CATEGORY_LABELS: Record<string, string> = {
  cover: 'Cover',
  front_matter: 'Front Matter',
  body: 'Body',
  appendix: 'Appendix',
};

export function TemplateSectionsPanel({
  documentType,
  editable = true,
  onSaved,
}: TemplateSectionsPanelProps) {
  const { sections: dbSections, isLoading } = useMergedTemplateSections(documentType);
  const bulkUpsert = useBulkUpsertTemplateSections();
  const { userCode } = useUserCode();

  // Local draft state for editing
  const [draft, setDraft] = useState<MergedTemplateSection[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const persistSections = useCallback((nextDraft: MergedTemplateSection[], silent = false) => {
    const rows = nextDraft.map((s) => ({
      template_type: documentType,
      section_key: s.sectionKey,
      is_enabled: s.enabled,
      is_required: s.required,
      sort_order: s.sortOrder,
      title_override: s.titleOverride,
      include_in_toc: s.includeInToc,
      start_on_new_page: s.startOnNewPage,
    }));

    bulkUpsert.mutate(
      { templateType: documentType, sections: rows, updatedBy: userCode || 'system' },
      {
        onSuccess: () => {
          if (!silent) {
            toast.success('Section configuration saved');
          }
          setIsDirty(false);
          onSaved?.(nextDraft);
        },
        onError: (e) => toast.error('Failed to save sections', { description: String(e) }),
      }
    );
  }, [bulkUpsert, documentType, onSaved, userCode]);

  // Load from DB
  useEffect(() => {
    if (dbSections.length > 0) {
      setDraft(dbSections);
      setIsDirty(false);
    }
  }, [dbSections]);

  const sorted = useMemo(() => [...draft].sort((a, b) => a.sortOrder - b.sortOrder), [draft]);
  const enabledCount = draft.filter((s) => s.enabled).length;

  const updateSection = useCallback((
    sectionKey: string,
    updates: Partial<MergedTemplateSection>,
    options?: { persist?: boolean }
  ) => {
    const nextDraft = draft.map((s) => (s.sectionKey === sectionKey ? { ...s, ...updates } : s));
    setDraft(nextDraft);
    setIsDirty(true);
    if (options?.persist) {
      persistSections(nextDraft, true);
    }
  }, [draft, persistSections]);

  const moveSection = useCallback((sectionKey: string, direction: 'up' | 'down') => {
    setDraft((prev) => {
      const arr = [...prev].sort((a, b) => a.sortOrder - b.sortOrder);
      const idx = arr.findIndex((s) => s.sectionKey === sectionKey);
      if (idx < 0) return prev;
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= arr.length) return prev;
      // Swap sort orders
      const result = arr.map((s, i) => {
        if (i === idx) return { ...s, sortOrder: swapIdx + 1 };
        if (i === swapIdx) return { ...s, sortOrder: idx + 1 };
        return { ...s, sortOrder: i + 1 };
      });
      return result;
    });
    setIsDirty(true);
  }, []);

  const handleSave = useCallback(() => {
    persistSections(draft);
  }, [draft, persistSections]);

  const handleReset = useCallback(() => {
    setDraft(dbSections);
    setIsDirty(false);
    setExpandedSection(null);
  }, [dbSections]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-4 w-4 animate-spin mr-2 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading sections…</span>
      </div>
    );
  }

  if (draft.length === 0) {
    return (
      <Alert>
        <AlertDescription>
          No sections are configured for this document type in the Section Library.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold">Sections Configuration</CardTitle>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {enabledCount} of {draft.length} sections enabled · Sections are defined in the Section Library
            </p>
          </div>
          {editable && (
            <div className="flex items-center gap-2">
              {isDirty && (
                <Button variant="ghost" size="sm" onClick={handleReset} className="h-7 text-xs">
                  <RotateCcw className="h-3 w-3 mr-1" /> Reset
                </Button>
              )}
              <Button
                size="sm"
                onClick={handleSave}
                disabled={!isDirty || bulkUpsert.isPending}
                className="h-7 text-xs"
              >
                {bulkUpsert.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                ) : (
                  <Save className="h-3 w-3 mr-1" />
                )}
                Save Sections
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-3 pt-0">
        <div className="space-y-1">
          {sorted.map((section, idx) => {
            const isExpanded = expandedSection === section.sectionKey;
            return (
              <div
                key={section.sectionKey}
                className={`rounded-md border transition-colors ${
                  section.enabled ? 'bg-muted/30' : 'bg-muted/10 opacity-60'
                }`}
              >
                {/* Compact row */}
                <div className="flex items-center gap-2 p-2">
                  <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />

                  {/* Label + metadata */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium truncate">
                        {section.titleOverride || section.label}
                      </span>
                      {section.titleOverride && (
                        <Pencil className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
                      )}
                      {section.required && (
                        <Badge variant="secondary" className="text-[8px] h-4 px-1 gap-0.5">
                          <Lock className="h-2 w-2" /> Required
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[9px] text-muted-foreground">
                        {CATEGORY_LABELS[section.category] || section.category}
                      </span>
                      <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                        {DISPLAY_MODE_ICONS[section.displayMode]}
                        {section.displayMode}
                      </span>
                      {section.includeInToc && (
                        <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                          <BookOpen className="h-2.5 w-2.5" /> TOC
                        </span>
                      )}
                      {section.startOnNewPage && (
                        <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                          <SeparatorHorizontal className="h-2.5 w-2.5" /> New Page
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Reorder */}
                  {editable && (
                    <div className="flex items-center gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        disabled={idx === 0}
                        onClick={() => moveSection(section.sectionKey, 'up')}
                      >
                        <ArrowUp className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        disabled={idx === sorted.length - 1}
                        onClick={() => moveSection(section.sectionKey, 'down')}
                      >
                        <ArrowDown className="h-3 w-3" />
                      </Button>
                    </div>
                  )}

                  {/* Expand */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setExpandedSection(isExpanded ? null : section.sectionKey)}
                  >
                    {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </Button>

                  {/* Visible toggle */}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <Switch
                            checked={section.enabled}
                            disabled={!editable || section.required}
                            onCheckedChange={(v) => updateSection(section.sectionKey, { enabled: v }, { persist: true })}
                          />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="text-xs">
                        {section.required
                          ? 'This section is required and cannot be disabled'
                          : section.enabled
                          ? 'Click to hide this section'
                          : 'Click to show this section'}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                {/* Expanded detail panel */}
                {isExpanded && (
                  <div className="px-4 pb-3 pt-1 border-t border-border/50 space-y-3">
                    {section.description && (
                      <p className="text-[10px] text-muted-foreground italic">{section.description}</p>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      {/* Heading Override */}
                      <div>
                        <label className="text-[10px] font-medium text-muted-foreground block mb-1">
                          Heading Override
                        </label>
                        <Input
                          value={section.titleOverride || ''}
                          onChange={(e) =>
                            updateSection(section.sectionKey, {
                              titleOverride: e.target.value || null,
                              label: e.target.value || section.label,
                            })
                          }
                          placeholder={section.label}
                          className="h-7 text-xs"
                          disabled={!editable}
                        />
                        <span className="text-[9px] text-muted-foreground">
                          Library default: {section.label}
                        </span>
                      </div>

                      {/* Sort Order */}
                      <div>
                        <label className="text-[10px] font-medium text-muted-foreground block mb-1">
                          Sort Order
                        </label>
                        <Input
                          type="number"
                          value={section.sortOrder}
                          onChange={(e) =>
                            updateSection(section.sectionKey, { sortOrder: parseInt(e.target.value) || 1 })
                          }
                          className="h-7 text-xs w-20"
                          min={1}
                          disabled={!editable}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      {/* Required */}
                      <label className="flex items-center gap-2 text-xs cursor-pointer">
                        <Switch
                          checked={section.required}
                          onCheckedChange={(v) => {
                            const updates: Partial<MergedTemplateSection> = { required: v };
                            if (v) updates.enabled = true; // required implies enabled
                            updateSection(section.sectionKey, updates);
                          }}
                          disabled={!editable}
                          className="scale-75"
                        />
                        <span>Required</span>
                      </label>

                      {/* Include in TOC */}
                      <label className="flex items-center gap-2 text-xs cursor-pointer">
                        <Switch
                          checked={section.includeInToc}
                          onCheckedChange={(v) => updateSection(section.sectionKey, { includeInToc: v })}
                          disabled={!editable}
                          className="scale-75"
                        />
                        <span className="flex items-center gap-1">
                          <BookOpen className="h-3 w-3" /> Include in TOC
                        </span>
                      </label>

                      {/* Start on New Page */}
                      <label className="flex items-center gap-2 text-xs cursor-pointer">
                        <Switch
                          checked={section.startOnNewPage}
                          onCheckedChange={(v) => updateSection(section.sectionKey, { startOnNewPage: v })}
                          disabled={!editable}
                          className="scale-75"
                        />
                        <span className="flex items-center gap-1">
                          <SeparatorHorizontal className="h-3 w-3" /> Start on New Page
                        </span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
