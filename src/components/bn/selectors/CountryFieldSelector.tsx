/**
 * CountryFieldSelector — form-field country picker backed by `bn_country`.
 *
 * This is distinct from the global `CountrySelector` (top-bar switcher for
 * the active Country Pack). Use this component inside Product/Rule/Formula
 * editors etc. where the user picks a country for the row being edited.
 *
 * Default KN is allowed only when no value is provided AND `defaultToKN`
 * is true — never hardcoded into the row.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { Globe, ChevronsUpDown, Check } from 'lucide-react';

const db = supabase as any;

export interface CountryFieldSelectorProps {
  value: string | null | undefined;
  onChange: (code: string | null, row: any | null) => void;
  /** When value is empty and this is true, pre-select 'KN' once on mount. */
  defaultToKN?: boolean;
  includeInactive?: boolean;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

export const CountryFieldSelector: React.FC<CountryFieldSelectorProps> = ({
  value, onChange, defaultToKN = false, includeInactive = false, placeholder = 'Select country…', disabled, required, className,
}) => {
  const [open, setOpen] = useState(false);

  const { data: countries = [] } = useQuery({
    queryKey: ['bn-country-selector', includeInactive],
    queryFn: async () => {
      let q = db.from('bn_country').select('country_code, country_name, currency_code, is_active').order('country_name');
      if (!includeInactive) q = q.eq('is_active', true);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  // Optional one-shot KN default
  useEffect(() => {
    if (!defaultToKN || value) return;
    const kn = countries.find((c: any) => c.country_code === 'KN');
    if (kn) onChange('KN', kn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultToKN, countries.length]);

  const selected = useMemo(() => countries.find((c: any) => c.country_code === value) || null, [countries, value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          disabled={disabled}
          className={`w-full justify-between font-normal ${!selected && required ? 'border-destructive' : ''} ${className ?? ''}`}
        >
          <span className="flex items-center gap-2 min-w-0 truncate">
            <Globe className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            {selected ? (
              <span className="truncate">
                <span className="font-medium">{selected.country_name}</span>
                <span className="text-muted-foreground"> ({selected.country_code} · {selected.currency_code})</span>
              </span>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </span>
          <ChevronsUpDown className="h-3.5 w-3.5 opacity-50 ml-2" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search country…" />
          <CommandList className="max-h-[320px]">
            <CommandEmpty>No country.</CommandEmpty>
            <CommandGroup>
              {countries.map((c: any) => (
                <CommandItem
                  key={c.country_code}
                  value={`${c.country_code} ${c.country_name}`}
                  onSelect={() => { onChange(c.country_code, c); setOpen(false); }}
                >
                  <Check className={`h-3.5 w-3.5 mr-2 ${c.country_code === value ? 'opacity-100' : 'opacity-0'}`} />
                  <span className="flex-1">{c.country_name}</span>
                  <span className="text-xs text-muted-foreground">{c.country_code} · {c.currency_code}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default CountryFieldSelector;
