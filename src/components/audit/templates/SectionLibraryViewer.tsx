import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Loader2, Lock, Share2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDocumentSectionLibrary } from '@/hooks/useDocumentFoundation';
import { DOCUMENT_TYPE_LABELS, type AuditDocumentType } from '@/lib/audit/documentFoundationTypes';

const DOC_TYPES: AuditDocumentType[] = ['audit_report', 'audit_plan', 'mgmt_response'];

const CATEGORY_LABELS: Record<string, string> = {
  cover: 'Cover',
  front_matter: 'Front Matter',
  body: 'Body',
  appendix: 'Appendix',
};

const CATEGORY_ORDER = ['cover', 'front_matter', 'body', 'appendix'];

export function SectionLibraryViewer() {
  const { data: allSections = [], isLoading } = useDocumentSectionLibrary();
  const [activeType, setActiveType] = React.useState<AuditDocumentType>('audit_report');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mr-2" />
        <span className="text-sm text-muted-foreground">Loading section library…</span>
      </div>
    );
  }

  // Filter sections for the active document type
  const filteredSections = allSections.filter((s) =>
    s.applies_to?.includes(activeType)
  );

  // Group by category
  const grouped = CATEGORY_ORDER.reduce<Record<string, typeof filteredSections>>((acc, cat) => {
    const items = filteredSections.filter((s) => s.category === cat);
    if (items.length > 0) acc[cat] = items;
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-muted-foreground">
          Master list of sections available across all audit document types. Shared sections (<Share2 className="h-3 w-3 inline" />) appear in multiple document types.
          Mandatory sections (<Lock className="h-3 w-3 inline" />) cannot be disabled.
        </p>
      </div>

      <Tabs value={activeType} onValueChange={(v) => setActiveType(v as AuditDocumentType)}>
        <TabsList>
          {DOC_TYPES.map((dt) => (
            <TabsTrigger key={dt} value={dt} className="text-xs">
              {DOCUMENT_TYPE_LABELS[dt]}
              <Badge variant="secondary" className="ml-1.5 text-[10px] h-4 px-1">
                {allSections.filter((s) => s.applies_to?.includes(dt)).length}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>

        {DOC_TYPES.map((dt) => (
          <TabsContent key={dt} value={dt} className="mt-4 space-y-4">
            {dt === activeType && Object.entries(grouped).map(([category, sections]) => (
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
                          <Badge variant="outline" className="text-[10px] h-5 shrink-0">
                            {section.display_mode}
                          </Badge>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
