import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Loader2, Lock, Share2, Search, Filter, BookOpen, SeparatorHorizontal } from 'lucide-react';
import { useDocumentSectionLibrary } from '@/hooks/useDocumentFoundation';
import { DOCUMENT_TYPE_LABELS, type AuditDocumentType } from '@/lib/audit/documentFoundationTypes';

const CATEGORY_LABELS: Record<string, string> = {
  cover: 'Cover',
  front_matter: 'Front Matter',
  body: 'Body',
  appendix: 'Appendix',
};

const CATEGORY_ORDER = ['cover', 'front_matter', 'body', 'appendix'];

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

  const filteredSections = useMemo(() => {
    let sections = allSections;
    if (filterType !== 'all') {
      sections = sections.filter((s) => s.applies_to?.includes(filterType));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      sections = sections.filter(
        (s) => s.label.toLowerCase().includes(q) || s.section_key.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q)
      );
    }
    return sections;
  }, [allSections, filterType, searchQuery]);

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
    (['audit_report', 'audit_plan', 'mgmt_response'] as AuditDocumentType[]).forEach((dt) => {
      map[dt] = allSections.filter((s) => s.applies_to?.includes(dt)).length;
    });
    return map;
  }, [allSections]);

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
      <div>
        <p className="text-xs text-muted-foreground">
          Master catalog of all sections used across audit documents.
          Shared sections (<Share2 className="h-3 w-3 inline" />) appear in multiple document types.
          Mandatory sections (<Lock className="h-3 w-3 inline" />) cannot be disabled.
        </p>
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
          {(['audit_report', 'audit_plan', 'mgmt_response'] as AuditDocumentType[]).map((dt) => (
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
                  .map((section) => (
                    <div
                      key={section.id}
                      className="flex items-center gap-3 p-2 rounded-md border bg-muted/20"
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
                          {section.is_shared && (
                            <Share2 className="h-3 w-3 text-primary shrink-0" />
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
                        {(section.applies_to || []).map((dt: AuditDocumentType) => (
                          <span
                            key={dt}
                            className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${DOC_TYPE_COLORS[dt]}`}
                          >
                            {DOC_TYPE_SHORT[dt]}
                          </span>
                        ))}
                      </div>
                      <Badge variant="outline" className="text-[10px] h-5 shrink-0">
                        {section.display_mode}
                      </Badge>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
