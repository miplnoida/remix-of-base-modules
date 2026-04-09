import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Loader2, Lock, Share2, Search, Filter, BookOpen, SeparatorHorizontal, Settings2, Save } from 'lucide-react';
import { useDocumentSectionLibrary } from '@/hooks/useDocumentFoundation';
import { DOCUMENT_TYPE_LABELS, type AuditDocumentType, type DocumentSectionEntry } from '@/lib/audit/documentFoundationTypes';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

const CATEGORY_LABELS: Record<string, string> = {
  cover: 'Cover',
  front_matter: 'Front Matter',
  body: 'Body',
  appendix: 'Appendix',
};

const CATEGORY_ORDER = ['cover', 'front_matter', 'body', 'appendix'];

const ALL_DOC_TYPES: AuditDocumentType[] = ['audit_report', 'audit_plan', 'mgmt_response'];

const DOC_TYPE_COLORS: Record<AuditDocumentType, string> = {
  audit_report: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  audit_plan: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  mgmt_response: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
};

const DOC_TYPE_SHORT: Record<AuditDocumentType, string> = {
  audit_report: 'Report',
  audit_plan: 'Plan',
  mgmt_response: 'Mgmt Response',
};

export function SectionLibraryViewer() {
  const { data: allSections = [], isLoading } = useDocumentSectionLibrary();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<AuditDocumentType | 'all'>('all');
  const queryClient = useQueryClient();

  // Track pending applies_to changes: sectionId → new applies_to array
  const [pendingChanges, setPendingChanges] = useState<Record<string, AuditDocumentType[]>>({});
  const [saving, setSaving] = useState(false);

  const hasPendingChanges = Object.keys(pendingChanges).length > 0;

  const getEffectiveAppliesTo = useCallback(
    (section: DocumentSectionEntry): AuditDocumentType[] => {
      return pendingChanges[section.id] ?? section.applies_to ?? [];
    },
    [pendingChanges]
  );

  const handleToggleDocType = useCallback(
    (section: DocumentSectionEntry, docType: AuditDocumentType, checked: boolean) => {
      const current = getEffectiveAppliesTo(section);
      const updated = checked
        ? [...new Set([...current, docType])]
        : current.filter((dt) => dt !== docType);

      // Don't allow empty — must have at least one doc type
      if (updated.length === 0) {
        toast.error('A section must be allowed in at least one document type.');
        return;
      }

      setPendingChanges((prev) => ({ ...prev, [section.id]: updated }));
    },
    [getEffectiveAppliesTo]
  );

  const handleSaveChanges = async () => {
    setSaving(true);
    try {
      const entries = Object.entries(pendingChanges);
      for (const [sectionId, appliesTo] of entries) {
        const isShared = appliesTo.length > 1;
        const { error } = await (supabase as any)
          .from('ia_document_section_library')
          .update({ applies_to: appliesTo, is_shared: isShared })
          .eq('id', sectionId);
        if (error) throw error;
      }
      setPendingChanges({});
      queryClient.invalidateQueries({ queryKey: ['ia_document_section_library'] });
      toast.success(`Updated document type assignments for ${entries.length} section(s).`);
    } catch (err: any) {
      toast.error('Failed to save changes', { description: err.message });
    } finally {
      setSaving(false);
    }
  };

  const filteredSections = useMemo(() => {
    let sections = allSections;
    if (filterType !== 'all') {
      sections = sections.filter((s) => {
        const effective = pendingChanges[s.id] ?? s.applies_to;
        return effective?.includes(filterType);
      });
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      sections = sections.filter(
        (s) => s.label.toLowerCase().includes(q) || s.section_key.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q)
      );
    }
    return sections;
  }, [allSections, filterType, searchQuery, pendingChanges]);

  // Group by category
  const grouped = useMemo(() => {
    return CATEGORY_ORDER.reduce<Record<string, typeof filteredSections>>((acc, cat) => {
      const items = filteredSections.filter((s) => s.category === cat);
      if (items.length > 0) acc[cat] = items;
      return acc;
    }, {});
  }, [filteredSections]);

  // Counts per doc type
  const counts = useMemo(() => {
    const map: Record<string, number> = { all: allSections.length };
    ALL_DOC_TYPES.forEach((dt) => {
      map[dt] = allSections.filter((s) => {
        const effective = pendingChanges[s.id] ?? s.applies_to;
        return effective?.includes(dt);
      }).length;
    });
    return map;
  }, [allSections, pendingChanges]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mr-2" />
        <span className="text-sm text-muted-foreground">Loading section library…</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-muted-foreground">
            Master catalog of all reusable sections. Each section declares which document types it is allowed in.
            Use the <Settings2 className="h-3 w-3 inline" /> button to change document type assignments.
            Shared sections (<Share2 className="h-3 w-3 inline" />) appear in multiple document types.
            Mandatory sections (<Lock className="h-3 w-3 inline" />) cannot be disabled in any template.
          </p>
        </div>
        {hasPendingChanges && (
          <Button size="sm" onClick={handleSaveChanges} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
            Save Changes ({Object.keys(pendingChanges).length})
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search sections…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          <button
            onClick={() => setFilterType('all')}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${filterType === 'all' ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted/50 hover:bg-muted border-border'}`}
          >
            All {counts.all}
          </button>
          {ALL_DOC_TYPES.map((dt) => (
            <button
              key={dt}
              onClick={() => setFilterType(filterType === dt ? 'all' : dt)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${filterType === dt ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted/50 hover:bg-muted border-border'}`}
            >
              {DOC_TYPE_SHORT[dt]} {counts[dt]}
            </button>
          ))}
        </div>
      </div>

      {/* Section List */}
      {Object.keys(grouped).length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          No sections match your filters.
        </div>
      ) : (
        Object.entries(grouped).map(([category, sections]) => (
          <Card key={category}>
            <CardHeader className="py-2.5 px-4">
              <CardTitle className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                {CATEGORY_LABELS[category] || category}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3 pt-0">
              <div className="space-y-1.5">
                {sections
                  .sort((a, b) => a.default_order - b.default_order)
                  .map((section) => {
                    const effectiveAppliesTo = getEffectiveAppliesTo(section);
                    const isPending = !!pendingChanges[section.id];

                    return (
                      <div
                        key={section.id}
                        className={`flex items-center gap-3 p-2 rounded-md border ${
                          isPending ? 'border-primary/50 bg-primary/5' : 'bg-muted/20'
                        }`}
                      >
                        <Switch
                          checked={section.default_enabled}
                          disabled
                          className="opacity-70"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium truncate">{section.label}</span>
                            {section.is_mandatory && (
                              <Lock className="h-3 w-3 text-warning shrink-0" />
                            )}
                            {effectiveAppliesTo.length > 1 && (
                              <Share2 className="h-3 w-3 text-primary shrink-0" />
                            )}
                            {isPending && (
                              <Badge variant="outline" className="text-[9px] h-4 border-primary/50 text-primary">
                                modified
                              </Badge>
                            )}
                          </div>
                          {section.description && (
                            <p className="text-[10px] text-muted-foreground truncate">{section.description}</p>
                          )}
                        </div>
                        {/* TOC and Page Break indicators */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {section.default_include_in_toc && (
                            <span className="text-[9px] text-muted-foreground flex items-center gap-0.5" title="Included in TOC by default">
                              <BookOpen className="h-3 w-3" /> TOC
                            </span>
                          )}
                          {section.default_start_on_new_page && (
                            <span className="text-[9px] text-muted-foreground flex items-center gap-0.5" title="Starts on new page by default">
                              <SeparatorHorizontal className="h-3 w-3" /> Page
                            </span>
                          )}
                        </div>
                        {/* Document type tags */}
                        <div className="flex gap-1 shrink-0">
                          {effectiveAppliesTo.map((dt: AuditDocumentType) => (
                            <span
                              key={dt}
                              className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${DOC_TYPE_COLORS[dt]}`}
                            >
                              {DOC_TYPE_SHORT[dt]}
                            </span>
                          ))}
                        </div>
                        {/* Edit applies_to popover */}
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" title="Edit allowed document types">
                              <Settings2 className="h-3.5 w-3.5" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-56 p-3" align="end">
                            <p className="text-xs font-semibold mb-2">Allowed Document Types</p>
                            <p className="text-[10px] text-muted-foreground mb-3">
                              Select which templates can include this section.
                            </p>
                            <div className="space-y-2">
                              {ALL_DOC_TYPES.map((dt) => (
                                <label key={dt} className="flex items-center gap-2 cursor-pointer">
                                  <Checkbox
                                    checked={effectiveAppliesTo.includes(dt)}
                                    onCheckedChange={(checked) => handleToggleDocType(section, dt, !!checked)}
                                  />
                                  <span className="text-xs">{DOCUMENT_TYPE_LABELS[dt]}</span>
                                </label>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                        <Badge variant="outline" className="text-[10px] h-5 shrink-0">
                          {section.display_mode}
                        </Badge>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
