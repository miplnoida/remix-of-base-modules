/**
 * LegalReferenceSelector — searchable selector over `bn_legal_reference`.
 * Filters by country_code, status=ACTIVE (default), and optional tags.
 */
import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Scale, ChevronsUpDown, Check } from 'lucide-react';

const db = supabase as any;

export interface LegalReferenceSelectorProps {
  value: string | null | undefined;
  onChange: (id: string | null, row: any | null) => void;
  countryCode: string | null | undefined;
  /** Restrict by tag (e.g. product code, rule code). Optional. */
  tags?: string[];
  /** If true, include DRAFT/SUPERSEDED/REPEALED in the list. Default false. */
  includeNonActive?: boolean;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

const STATUS_BADGE: Record<string, string> = {
  ACTIVE: 'bg-emerald-500/10 text-emerald-700 border-emerald-300',
  DRAFT: 'bg-amber-500/10 text-amber-700 border-amber-300',
  SUPERSEDED: 'bg-muted text-muted-foreground',
  REPEALED: 'bg-destructive/10 text-destructive border-destructive/30',
};

export const LegalReferenceSelector: React.FC<LegalReferenceSelectorProps> = ({
  value, onChange, countryCode, tags, includeNonActive = false, placeholder = 'Select legal reference…', disabled, required, className,
}) => {
  const [open, setOpen] = useState(false);

  const { data: refs = [] } = useQuery({
    queryKey: ['bn-legal-ref-selector', countryCode, includeNonActive, tags?.join(',') || ''],
    enabled: !!countryCode,
    queryFn: async () => {
      let q = db
        .from('bn_legal_reference')
        .select('id, ref_code, short_title, full_reference_text, status, country_code, tags, applicable_products')
        .eq('country_code', countryCode)
        .eq('is_active', true);
      if (!includeNonActive) q = q.eq('status', 'ACTIVE');
      q = q.order('status').order('ref_code');
      const { data, error } = await q;
      if (error) throw error;
      let rows = (data ?? []) as any[];
      if (tags?.length) {
        rows = rows.filter(r =>
          (r.tags ?? []).some((t: string) => tags.includes(t)) ||
          (r.applicable_products ?? []).some((p: string) => tags.includes(p))
        );
      }
      return rows;
    },
  });

  const selected = useMemo(() => refs.find((r: any) => r.id === value) || null, [refs, value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || !countryCode}
          className={`w-full justify-between font-normal ${!selected && required ? 'border-destructive' : ''} ${className ?? ''}`}
        >
          <span className="flex items-center gap-2 min-w-0 truncate">
            <Scale className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            {selected ? (
              <span className="truncate">
                <span className="font-medium">{selected.ref_code}</span>
                <span className="text-muted-foreground"> · {selected.short_title}</span>
              </span>
            ) : (
              <span className="text-muted-foreground">{!countryCode ? 'Pick a country first' : placeholder}</span>
            )}
          </span>
          <ChevronsUpDown className="h-3.5 w-3.5 opacity-50 ml-2" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[420px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search by code, title, act…" />
          <CommandList className="max-h-[320px]">
            <CommandEmpty>No matching legal reference.</CommandEmpty>
            <CommandGroup>
              {value && (
                <CommandItem
                  value="__clear__"
                  onSelect={() => { onChange(null, null); setOpen(false); }}
                  className="text-muted-foreground"
                >
                  Clear selection
                </CommandItem>
              )}
              {refs.map((r: any) => (
                <CommandItem
                  key={r.id}
                  value={`${r.ref_code} ${r.short_title} ${r.full_reference_text ?? ''}`}
                  onSelect={() => { onChange(r.id, r); setOpen(false); }}
                  className="flex items-start gap-2"
                >
                  <Check className={`h-3.5 w-3.5 mt-0.5 ${r.id === value ? 'opacity-100' : 'opacity-0'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs">{r.ref_code}</span>
                      <Badge variant="outline" className={`text-[10px] ${STATUS_BADGE[r.status] || ''}`}>{r.status}</Badge>
                    </div>
                    <div className="text-sm truncate">{r.short_title}</div>
                    {r.full_reference_text && (
                      <div className="text-xs text-muted-foreground truncate">{r.full_reference_text}</div>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default LegalReferenceSelector;
