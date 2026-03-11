import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';

interface Props {
  value: string | null;
  onChange: (moduleId: string) => void;
}

export default function ModuleSelector({ value, onChange }: Props) {
  const { data: modules = [], isLoading } = useQuery({
    queryKey: ['app-modules-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_modules')
        .select('id, name, display_name')
        .eq('is_enabled', true)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <Skeleton className="h-10 w-full max-w-sm" />;

  return (
    <div className="space-y-1.5 max-w-sm">
      <Label>Select Module</Label>
      <Select value={value || ''} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Choose a module…" />
        </SelectTrigger>
        <SelectContent>
          {modules.map(m => (
            <SelectItem key={m.id} value={m.id}>
              {m.display_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
