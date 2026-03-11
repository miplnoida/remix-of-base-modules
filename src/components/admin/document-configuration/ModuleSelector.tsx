import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { Check, ChevronsUpDown, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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

  // Fetch module IDs that have document configurations
  const { data: configuredModuleIds = [] } = useQuery({
    queryKey: ['configured-module-ids'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('module_doc_categories')
        .select('module_id');
      if (error) throw error;
      // Get unique module IDs
      const ids = [...new Set(data.map(d => d.module_id))];
      return ids;
    },
  });

  if (isLoading) return <Skeleton className="h-10 w-full max-w-sm" />;

  const selectedModule = modules.find(m => m.id === value);
  const configuredModules = modules.filter(m => configuredModuleIds.includes(m.id));
  const unconfiguredModules = modules.filter(m => !configuredModuleIds.includes(m.id));

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
            <span className="flex items-center gap-2">
              {selectedModule ? (
                <>
                  {selectedModule.display_name}
                  {configuredModuleIds.includes(selectedModule.id) && (
                    <Badge variant="secondary" className="text-xs h-5">Configured</Badge>
                  )}
                </>
              ) : 'Choose a module…'}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search modules…" />
            <CommandList>
              <CommandEmpty>No module found.</CommandEmpty>
              {configuredModules.length > 0 && (
                <CommandGroup heading="Configured Modules">
                  {configuredModules.map(m => (
                    <CommandItem
                      key={m.id}
                      value={m.display_name}
                      onSelect={() => {
                        onChange(m.id);
                        setOpen(false);
                      }}
                    >
                      <Check className={cn('mr-2 h-4 w-4', value === m.id ? 'opacity-100' : 'opacity-0')} />
                      <FileText className="mr-1.5 h-3.5 w-3.5 text-primary" />
                      {m.display_name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              <CommandGroup heading={configuredModules.length > 0 ? 'Other Modules' : 'All Modules'}>
                {unconfiguredModules.map(m => (
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

      {/* Show configured modules as quick-access chips */}
      {!value && configuredModules.length > 0 && (
        <div className="pt-2">
          <p className="text-xs text-muted-foreground mb-1.5">Modules with document configurations:</p>
          <div className="flex flex-wrap gap-1.5">
            {configuredModules.map(m => (
              <Badge
                key={m.id}
                variant="outline"
                className="cursor-pointer hover:bg-primary/10 transition-colors gap-1"
                onClick={() => onChange(m.id)}
              >
                <FileText className="h-3 w-3" />
                {m.display_name}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
