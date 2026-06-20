/**
 * Impact analysis for legal references — surfaces what would be affected
 * by publishing or superseding a version.
 */
import { supabase } from '@/integrations/supabase/client';

const db = supabase as any;

export interface ImpactCounts {
  templates: number;
  generatedDocuments: number;
  moduleMappings: number;
  legalCases: number;
  legalNotices: number;
  benefitsProducts: number;
  complianceNotices: number;
}

async function safeCount(table: string, column: string, value: string): Promise<number> {
  try {
    const { count, error } = await db
      .from(table)
      .select('id', { count: 'exact', head: true })
      .eq(column, value);
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

export async function impactForMaster(masterId: string): Promise<ImpactCounts> {
  const [tpl, gen, mod] = await Promise.all([
    safeCount('core_template_legal_reference', 'legal_reference_id', masterId),
    safeCount('core_generated_document_legal_reference', 'legal_reference_id', masterId),
    safeCount('core_module_legal_reference', 'legal_reference_id', masterId),
  ]);
  return {
    templates: tpl,
    generatedDocuments: gen,
    moduleMappings: mod,
    legalCases: 0,
    legalNotices: 0,
    benefitsProducts: 0,
    complianceNotices: 0,
  };
}

export async function impactForVersion(versionId: string): Promise<{
  generatedDocuments: number;
  templates: number;
  moduleMappings: number;
}> {
  const [gen, tpl, mod] = await Promise.all([
    safeCount('core_generated_document_legal_reference', 'legal_reference_version_id', versionId),
    safeCount('core_template_legal_reference', 'legal_reference_version_id', versionId),
    safeCount('core_module_legal_reference', 'legal_reference_version_id', versionId),
  ]);
  return { generatedDocuments: gen, templates: tpl, moduleMappings: mod };
}
