import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TableInfo {
  table_name: string;
  display_name?: string;
}

export interface ColumnInfo {
  column_name: string;
  data_type: string;
  is_nullable: boolean;
}

export function usePublicTables() {
  return useQuery({
    queryKey: ['public-tables'],
    queryFn: async () => {
      // Try the RPC function first
      const { data, error } = await supabase.rpc('get_public_tables' as any);
      
      if (error || !data) {
        console.error('Error fetching tables:', error);
        // Fallback to common tables
        const fallbackTables = [
          'sample_applications',
          'ip_registrations',
          'employer_registrations',
          'bema_registrations',
          'compliance_registrations',
          'bema_c3_submissions',
          'bema_contributors',
          'app_modules',
          'roles',
          'user_profiles',
        ];
        return fallbackTables.map(t => ({ 
          table_name: t, 
          display_name: t 
        })) as TableInfo[];
      }
      
      return (data as any[]).map(t => ({
        table_name: t.table_name,
        display_name: t.table_name
      })) as TableInfo[];
    },
  });
}

export function useTableColumns(tableName: string | null | undefined) {
  return useQuery({
    queryKey: ['table-columns', tableName],
    queryFn: async () => {
      if (!tableName) return [];
      
      const { data, error } = await supabase.rpc('get_table_columns' as any, { 
        p_table_name: tableName 
      });
      
      if (error || !data) {
        console.error('Error fetching columns:', error);
        // Fallback to common columns
        return [
          { column_name: 'id', data_type: 'uuid', is_nullable: false },
          { column_name: 'status', data_type: 'text', is_nullable: true },
          { column_name: 'name', data_type: 'text', is_nullable: true },
          { column_name: 'created_at', data_type: 'timestamp', is_nullable: true },
          { column_name: 'updated_at', data_type: 'timestamp', is_nullable: true },
        ] as ColumnInfo[];
      }
      return (data || []) as ColumnInfo[];
    },
    enabled: !!tableName,
  });
}

// Keep backward compatibility
export function useModuleTables(moduleId: string | undefined) {
  return usePublicTables();
}
