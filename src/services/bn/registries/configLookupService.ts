/**
 * configLookupService — fetches reusable library records used as references
 * across BN configuration screens. All loaders return LookupRecord[] shaped
 * results so they plug straight into <ReferenceLookup/>.
 */
import { supabase } from '@/integrations/supabase/client';
import type { LookupRecord } from '@/components/bn/smart/ReferenceLookup';

type Loader = () => Promise<LookupRecord[]>;

async function fetchTable(table: string, codeCol: string, nameCol: string, badgeCol?: string): Promise<LookupRecord[]> {
  const cols = ['id', codeCol, nameCol, badgeCol].filter(Boolean).join(',');
  const { data, error } = await supabase.from(table as any).select(cols).limit(1000);
  if (error) {
    console.warn(`[configLookupService] ${table} fetch failed:`, error.message);
    return [];
  }
  return (data ?? []).map((row: any) => ({
    id: row.id,
    code: row[codeCol],
    name: row[nameCol] ?? row[codeCol] ?? '(unnamed)',
    badge: badgeCol ? row[badgeCol] : undefined,
  }));
}

export const configLookupLoaders: Record<string, Loader> = {
  formulas: () => fetchTable('bn_formula_template', 'template_code', 'template_name'),
  documents: () => fetchTable('bn_doc_requirement', 'document_code', 'document_name', 'document_category'),
  serviceDocs: () => fetchTable('bn_service_doc_type', 'doc_code', 'doc_name'),
  workbaskets: () => fetchTable('bn_workbasket', 'workbasket_code', 'workbasket_name'),
  escalations: () => fetchTable('bn_escalation_policy', 'policy_code', 'policy_name'),
  reasonCodes: () => fetchTable('bn_reason_code', 'reason_code', 'reason_label', 'category'),
  screens: () => fetchTable('bn_screen_template', 'template_code', 'template_name'),
  workflows: () => fetchTable('workflow_definitions', 'workflow_code', 'workflow_name'),
  commTemplates: () => fetchTable('notification_templates', 'template_code', 'template_name'),
  ruleGroups: () => fetchTable('bn_rule_group', 'group_code', 'group_name'),
  countries: () => fetchTable('bn_country', 'country_code', 'country_name'),
  schemes: () => fetchTable('bn_scheme', 'scheme_code', 'scheme_name'),
  branches: () => fetchTable('bn_branch', 'branch_code', 'branch_name'),
  medicalFacilities: () => fetchTable('bn_medical_facility', 'facility_code', 'facility_name'),
};

export type ConfigLookupKey = keyof typeof configLookupLoaders;
