/**
 * Hook that provides DB-driven section configuration for document rendering/export.
 *
 * Loads merged sections from Section Library + Template Config and converts
 * them into TemplateSectionRef[] for the resolver pipeline.
 *
 * Usage:
 *   const { sectionRefs, isLoading } = useDocumentTemplateSections('audit_report');
 *   // Pass sectionRefs into config before calling resolveReportTemplate()
 */
import { useMemo } from 'react';
import { useMergedTemplateSections, toTemplateSectionRefs } from '@/hooks/useMergedTemplateSections';
import type { AuditDocumentType } from '@/lib/audit/documentFoundationTypes';
import type { TemplateSectionRef } from '@/lib/audit/documentTemplateDefaults';

export function useDocumentTemplateSections(documentType: AuditDocumentType) {
  const { sections, isLoading } = useMergedTemplateSections(documentType);

  const sectionRefs: TemplateSectionRef[] = useMemo(
    () => toTemplateSectionRefs(sections),
    [sections]
  );

  return { sectionRefs, isLoading, mergedSections: sections };
}
