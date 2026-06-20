/**
 * LegalReferenceLibrary — Legal Module admin screen for managing the
 * shared legal_reference master under the Legal jurisdiction (default SKN).
 * Also shows how those references are wired to Legal use-cases (cases,
 * hearings, payment arrangements, fees, templates).
 */
import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/common/PageHeader';
import LegalReferenceManagement from '@/components/legal-reference/LegalReferenceManagement';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { listModuleLegalReferences } from '@/services/legal-reference/moduleMappingService';
import { LEGAL_DEFAULT_COUNTRY } from '@/services/legal-reference/types';

const COUNTRY_CODE =
  (import.meta as any).env?.VITE_LEGAL_COUNTRY_CODE ||
  (import.meta as any).env?.VITE_DEFAULT_COUNTRY_CODE ||
  LEGAL_DEFAULT_COUNTRY;

const CATEGORIES: { key: string; label: string }[] = [
  { key: 'CASE', label: 'Cases' },
  { key: 'HEARING', label: 'Court & Hearings' },
  { key: 'ORDER', label: 'Payment Arrangements' },
  { key: 'FEE', label: 'Legal Fees' },
  { key: 'TEMPLATE', label: 'Templates' },
];

const LegalReferenceLibrary: React.FC = () => {
  const { data: mappings = [] } = useQuery({
    queryKey: ['legal-module-mappings', COUNTRY_CODE],
    queryFn: () => listModuleLegalReferences({ moduleCode: 'LEGAL', countryCode: COUNTRY_CODE }),
  });

  const grouped = useMemo(() => {
    const m = new Map<string, typeof mappings>();
    for (const cat of CATEGORIES) m.set(cat.key, []);
    for (const r of mappings) {
      const k = (r.entity_type ?? '').toUpperCase();
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(r);
    }
    return m;
  }, [mappings]);

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Legal References"
        subtitle={`Acts, regulations and policies cited by Legal cases, notices, orders and settlements (Jurisdiction: ${COUNTRY_CODE})`}
        breadcrumbs={[{ label: 'Legal' }, { label: 'Legal Admin' }, { label: 'Legal References' }]}
        actions={
          <a
            href="/legal/admin/legal-references/verification"
            className="text-sm text-primary hover:underline"
          >
            Verification report →
          </a>
        }
      />


      <Card>
        <CardHeader>
          <CardTitle className="text-base">Legal Usage by Category — {COUNTRY_CODE}</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={CATEGORIES[0].key}>
            <TabsList className="flex flex-wrap">
              {CATEGORIES.map((c) => (
                <TabsTrigger key={c.key} value={c.key}>
                  {c.label}
                  <Badge variant="outline" className="ml-2 text-[10px]">
                    {grouped.get(c.key)?.length ?? 0}
                  </Badge>
                </TabsTrigger>
              ))}
            </TabsList>
            {CATEGORIES.map((c) => {
              const rows = grouped.get(c.key) ?? [];
              return (
                <TabsContent key={c.key} value={c.key} className="mt-4 space-y-2">
                  {rows.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No references linked to this category yet.</p>
                  ) : (
                    rows.map((r) => (
                      <div key={r.id} className="flex flex-wrap items-start gap-3 border rounded-md p-3">
                        <div className="flex-1 min-w-[280px]">
                          <div className="font-medium text-sm">
                            {r.legal_reference?.short_title ?? r.legal_reference_id}
                          </div>
                          <div className="text-xs text-muted-foreground font-mono">
                            {r.legal_reference?.ref_code}
                            {r.legal_reference?.section ? ` · § ${r.legal_reference.section}` : ''}
                            {r.legal_reference?.act_name ? ` · ${r.legal_reference.act_name}` : ''}
                          </div>
                          {r.usage_context && (
                            <div className="text-xs mt-1">{r.usage_context}</div>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge variant="outline" className="text-[10px]">{r.entity_id}</Badge>
                          {r.is_default && <Badge className="text-[10px]">Default</Badge>}
                          {r.is_required && <Badge variant="destructive" className="text-[10px]">Required</Badge>}
                        </div>
                      </div>
                    ))
                  )}
                </TabsContent>
              );
            })}
          </Tabs>
        </CardContent>
      </Card>

      <LegalReferenceManagement
        countryCode={COUNTRY_CODE}
        defaultTag="legal"
        title={`Legal Reference Library — ${COUNTRY_CODE}`}
        subtitle="Reusable legal citations available to Legal cases, hearings, orders, fees and templates"
      />
    </div>
  );
};

export default LegalReferenceLibrary;
