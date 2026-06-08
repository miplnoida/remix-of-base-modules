import { useQuery } from '@tanstack/react-query';
import { listDataSources, listDataFields } from '@/services/bn/dataDictionaryService';

export function useDataSources() {
  return useQuery({
    queryKey: ['bn', 'data-source-registry'],
    queryFn: listDataSources,
    staleTime: 5 * 60_000,
  });
}

export function useDataFields() {
  return useQuery({
    queryKey: ['bn', 'data-field-registry'],
    queryFn: listDataFields,
    staleTime: 5 * 60_000,
  });
}
