/**
 * OM-5 — React Query hooks for canonical Document Templates.
 */
import { useQuery } from '@tanstack/react-query';
import { documentTemplateService } from './templateService';
import type { DocumentTemplateFilters } from './templateTypes';

export function useDocumentTemplates(filters: DocumentTemplateFilters = {}) {
  return useQuery({
    queryKey: ['document-templates', filters],
    queryFn: () => documentTemplateService.getDocumentTemplates(filters),
    staleTime: 30_000,
  });
}

export function useDocumentTemplateCompatibilityRows() {
  return useQuery({
    queryKey: ['document-templates', 'compatibility'],
    queryFn: () => documentTemplateService.getTemplateCompatibilityRows(),
    staleTime: 60_000,
  });
}
