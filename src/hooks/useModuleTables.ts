import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface TableInfo {
  table_name: string;
  display_name: string;
}

interface ColumnInfo {
  column_name: string;
  data_type: string;
  is_nullable: boolean;
}

export function useModuleTables(moduleId: string | undefined) {
  return useQuery({
    queryKey: ['module-tables', moduleId],
    queryFn: async () => {
      if (!moduleId) return [];
      
      // First try to get tables mapped to this module
      const { data: mappedTables, error: mappedError } = await supabase
        .rpc('get_module_tables', { _module_id: moduleId });
      
      if (!mappedError && mappedTables && mappedTables.length > 0) {
        return mappedTables as TableInfo[];
      }
      
      // Fallback: get all public tables
      const { data: allTables, error: allError } = await supabase
        .rpc('get_all_public_tables');
      
      if (allError) throw allError;
      
      return (allTables || []).map((t: { table_name: string }) => ({
        table_name: t.table_name,
        display_name: t.table_name
      })) as TableInfo[];
    },
    enabled: !!moduleId
  });
}

export function useTableColumns(tableName: string | undefined) {
  return useQuery({
    queryKey: ['table-columns', tableName],
    queryFn: async () => {
      if (!tableName) return [];
      
      const { data, error } = await supabase
        .rpc('get_table_columns', { _table_name: tableName });
      
      if (error) throw error;
      
      return (data || []) as ColumnInfo[];
    },
    enabled: !!tableName
  });
}