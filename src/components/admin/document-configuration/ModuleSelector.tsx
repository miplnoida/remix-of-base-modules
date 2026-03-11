import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  value: string | null;
  onChange: (moduleId: string) => void;
}

export default function ModuleSelector({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);

  const { data: modules = [], isLoading } = useQuery({
    queryKey: ['app-modules-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_modules')
        .select('id, name, display_name')
        .eq('is_enabled', true)
        .order('display_name', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <Skeleton className="h-10 w-full max-w-sm" />;

  const selectedModule = modules.find(m => m.id === value);

  return (
    <div className="space-y-1.5 max-w-sm">
      <Label>Select Module</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
          >
            {selectedModule ? selectedModule.display_name : 'Choose a module…'}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search modules…" />
            <CommandList>
              <CommandEmpty>No module found.</CommandEmpty>
              <CommandGroup>
                {modules.map(m => (
                  <CommandItem
                    key={m.id}
                    value={m.display_name}
                    onSelect={() => {
                      onChange(m.id);
                      setOpen(false);
                    }}
                  >
                    <Check className={cn('mr-2 h-4 w-4', value === m.id ? 'opacity-100' : 'opacity-0')} />
                    {m.display_name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
