/**
 * Hook that merges Section Library metadata with per-template section config.
 *
 * Architecture:
 *   Section Library (ia_document_section_library) → reusable metadata
 *   Template Sections (ia_document_template_sections) → per-template overrides
 *
 * This hook produces a unified list of sections for a given document type,
 * with template-level overrides (enabled, required, sort_order, title, TOC, page-break)
 * applied on top of library defaults.
 */
import { useMemo } from 'react';
import { useDocumentSectionLibrary } from '@/hooks/useDocumentFoundation';
import { useTemplateSectionConfigs, type TemplateSectionConfig } from '@/hooks/useTemplateSectionConfig';
import type { AuditDocumentType, DocumentSectionEntry } from '@/lib/audit/documentFoundationTypes';
import type { TemplateSectionRef } from '@/lib/audit/documentTemplateDefaults';

export interface MergedTemplateSection {
  /** Section key from library */
  sectionKey: string;
  /** Display label (template override or library default) */
  label: string;
  /** Whether this section is shown in output */
  enabled: boolean;
  /** Whether this section cannot be disabled */
  required: boolean;
  /** Sort order for this template */
  sortOrder: number;
  /** Include in Table of Contents */
  includeInToc: boolean;
  /** Start on new page */
  startOnNewPage: boolean;
  /** Section display mode from library */
  displayMode: 'narrative' | 'table' | 'auto';
  /** Section category from library */
  category: 'cover' | 'front_matter' | 'body' | 'appendix';
  /** Description from library */
  description: string | null;
  /** Title override (if any) */
  titleOverride: string | null;
  /** Whether there's a DB-level template config row for this section */
  hasTemplateConfig: boolean;
}

/**
 * Returns a merged list of sections for a document type.
 * Library provides metadata; template config provides per-template overrides.
 */
export function useMergedTemplateSections(documentType: AuditDocumentType) {
  const { data: librarySections = [], isLoading: libLoading } = useDocumentSectionLibrary(documentType);
  const { data: templateConfigs = [], isLoading: tmplLoading } = useTemplateSectionConfigs(documentType);

  const sections = useMemo(() => {
    const configMap = new Map<string, TemplateSectionConfig>();
    templateConfigs.forEach((c) => configMap.set(c.section_key, c));

    return librarySections.map((lib): MergedTemplateSection => {
      const tmpl = configMap.get(lib.section_key);
      return {
        sectionKey: lib.section_key,
        label: tmpl?.title_override || lib.label,
        enabled: tmpl ? tmpl.is_enabled : lib.default_enabled,
        required: tmpl ? tmpl.is_required : lib.is_mandatory,
        sortOrder: tmpl ? tmpl.sort_order : lib.default_order,
        includeInToc: tmpl ? tmpl.include_in_toc : lib.default_include_in_toc,
        startOnNewPage: tmpl ? tmpl.start_on_new_page : lib.default_start_on_new_page,
        displayMode: lib.display_mode,
        category: lib.category,
        description: lib.description,
        titleOverride: tmpl?.title_override ?? null,
        hasTemplateConfig: !!tmpl,
      };
    }).sort((a, b) => a.sortOrder - b.sortOrder);
  }, [librarySections, templateConfigs]);

  return {
    sections,
    isLoading: libLoading || tmplLoading,
    librarySections,
    templateConfigs,
  };
}

/**
 * Convert MergedTemplateSections to TemplateSectionRef[] for resolver compatibility.
 */
export function toTemplateSectionRefs(merged: MergedTemplateSection[]): TemplateSectionRef[] {
  return merged.map((s) => ({
    id: s.sectionKey,
    label: s.label,
    enabled: s.enabled,
    order: s.sortOrder,
    labelOverride: s.titleOverride || undefined,
    required: s.required,
    includeInToc: s.includeInToc,
    startOnNewPage: s.startOnNewPage,
  }));
}
