/**
 * DynamicSectionRenderer
 * ----------------------
 * Renders an application payload (raw_application_json) using the
 * catalog-driven bn_field_metadata for a given product version + channel.
 *
 * Sections are derived from `section_code`, fields ordered by `sort_order`.
 * Read-only by default; for editable behaviour pass an `onEditField` handler
 * (Phase C wiring) — the amendment policy gates editability per claim status.
 */
import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';
import { BnEmptyState } from '@/components/bn/shared';
import { formatDateForDisplay } from '@/lib/format-config';

const db = supabase as any;

export interface DynamicSectionRendererProps {
  productVersionId: string;
  channelCode?: string | null; // ONLINE | OFFLINE
  payload: any; // raw_application_json (current OR submitted snapshot)
  highlightFields?: string[]; // field_codes to flag as amended
  onEditField?: (field: FieldMeta) => void;
  title?: string;
}

export interface FieldMeta {
  field_code: string;
  field_label: string;
  field_type: string;
  section_code: string;
  sort_order: number;
  is_required: boolean;
  help_text?: string | null;
  is_internal_only?: boolean | null;
}

function readValue(payload: any, code: string): any {
  if (!payload || typeof payload !== 'object') return undefined;
  if (code in payload) return payload[code];
  // try nested benefit_facts / claimant / application
  for (const k of ['benefit_facts', 'claimant', 'application', 'data']) {
    if (payload[k] && code in payload[k]) return payload[k][code];
  }
  return undefined;
}

function formatValue(field: FieldMeta, value: any): React.ReactNode {
  if (value === undefined || value === null || value === '') return <span className="text-muted-foreground">—</span>;
  switch (field.field_type) {
    case 'DATE':
      try { return formatDateForDisplay(value); } catch { return String(value); }
    case 'BOOLEAN':
    case 'DECLARATION_CHECKBOX':
      return value ? <Badge variant="default">Yes</Badge> : <Badge variant="outline">No</Badge>;
    case 'DOCUMENT_UPLOAD_CHECKLIST':
    case 'MEDICAL_CERTIFICATE_BLOCK':
    case 'BANK_ACCOUNT_CAPTURE':
    case 'CONTRIBUTION_SUMMARY':
    case 'PERSON_SUMMARY':
      return <span className="text-xs text-muted-foreground italic">[{field.field_type.toLowerCase()}]</span>;
    default:
      if (typeof value === 'object') return <pre className="text-xs">{JSON.stringify(value)}</pre>;
      return String(value);
  }
}

export const DynamicSectionRenderer: React.FC<DynamicSectionRendererProps> = ({
  productVersionId,
  channelCode,
  payload,
  highlightFields = [],
  onEditField,
  title,
}) => {
  const { data, isLoading } = useQuery({
    queryKey: ['bn-field-metadata', productVersionId, channelCode],
    enabled: !!productVersionId,
    queryFn: async () => {
      // Resolve screen_template_id for this product+channel (prefer requested channel, fallback to any)
      let templateId: string | null = null;
      if (channelCode) {
        const { data: pcc } = await db
          .from('bn_product_channel_config')
          .select('screen_template_id')
          .eq('product_version_id', productVersionId)
          .eq('channel_code', channelCode)
          .maybeSingle();
        templateId = pcc?.screen_template_id ?? null;
      }
      if (!templateId) {
        const { data: pcc } = await db
          .from('bn_product_channel_config')
          .select('screen_template_id')
          .eq('product_version_id', productVersionId)
          .not('screen_template_id', 'is', null)
          .limit(1)
          .maybeSingle();
        templateId = pcc?.screen_template_id ?? null;
      }
      if (!templateId) return { fields: [] as FieldMeta[] };
      const { data: fields } = await db
        .from('bn_field_metadata')
        .select('field_code, field_label, field_type, section_code, sort_order, is_required, help_text, is_internal_only, is_active')
        .eq('screen_template_id', templateId)
        .order('section_code', { ascending: true })
        .order('sort_order', { ascending: true });
      return { fields: (fields ?? []).filter((f: any) => f.is_active !== false) as FieldMeta[] };
    },
  });

  const sections = useMemo(() => {
    const grouped: Record<string, FieldMeta[]> = {};
    for (const f of (data?.fields ?? [])) {
      grouped[f.section_code] = grouped[f.section_code] || [];
      grouped[f.section_code].push(f);
    }
    return grouped;
  }, [data?.fields]);

  if (isLoading) return <BnEmptyState type="loading" title="Loading form definition…" />;
  if (!data?.fields?.length) {
    return (
      <Card>
        <CardContent className="py-6">
          <p className="text-sm text-muted-foreground">
            No catalog field definition found for this product version. Configure fields under
            Product Catalog → Channel → Screen Template.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {title && <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>}
      {Object.entries(sections).map(([section, fields]) => (
        <Card key={section}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium capitalize">
              {section.replace(/_/g, ' ')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {fields.map((f) => {
                const value = readValue(payload, f.field_code);
                const amended = highlightFields.includes(f.field_code);
                return (
                  <div key={f.field_code} className={`space-y-1 ${amended ? 'p-2 rounded border border-amber-400/60 bg-amber-50/40 dark:bg-amber-900/10' : ''}`}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">
                        {f.field_label}
                        {f.is_required && <span className="text-destructive ml-0.5">*</span>}
                        {f.is_internal_only && <Badge variant="outline" className="ml-2 text-[10px]">Internal</Badge>}
                        {amended && <Badge variant="outline" className="ml-2 text-[10px] border-amber-500 text-amber-700">Amended</Badge>}
                      </p>
                      {onEditField && (
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onEditField(f)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    <div className="text-sm">{formatValue(f, value)}</div>
                    {f.help_text && <p className="text-[11px] text-muted-foreground">{f.help_text}</p>}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default DynamicSectionRenderer;
