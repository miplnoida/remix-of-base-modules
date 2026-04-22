// ============================================
// EmployerMasterSearch
// Validated employer lookup against er_master.
// Used by Direct Selection and Exception flows so that NO employer
// is ever entered as free text.
// ============================================
import { useEffect, useMemo, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Building2, Loader2, CheckCircle2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useDebounce } from '@/hooks/useDebounce';

export interface EmployerMasterRecord {
  regno: string;
  name: string | null;
  trade_name: string | null;
  status: string | null;
  sector_code: string | null;
  activity_type: string | null;
  office_code: string | null;
  phone: string | null;
  email: string | null;
}

interface Props {
  onSelect: (emp: EmployerMasterRecord) => void;
  selected?: EmployerMasterRecord | null;
  placeholder?: string;
  /** Disable the search box (e.g. once an employer is locked-in). */
  disabled?: boolean;
}

function statusInfo(s: string | null) {
  if (s === 'A') return { label: 'Active', variant: 'default' as const };
  if (s === 'I') return { label: 'Inactive', variant: 'secondary' as const };
  if (s === 'D') return { label: 'Deregistered', variant: 'destructive' as const };
  return { label: s || 'Unknown', variant: 'outline' as const };
}

export function EmployerMasterSearch({ onSelect, selected, placeholder, disabled }: Props) {
  const [query, setQuery] = useState('');
  const debounced = useDebounce(query, 300);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: results = [], isLoading } = useQuery({
    queryKey: ['employer-master-search', debounced],
    queryFn: async (): Promise<EmployerMasterRecord[]> => {
      if (!debounced || debounced.length < 2) return [];
      const term = debounced.replace(/[%,]/g, ' ').trim();
      const { data } = await supabase
        .from('er_master')
        .select('regno, name, trade_name, status, sector_code, activity_type, office_code, phone, email')
        .or(
          [
            `regno.ilike.%${term}%`,
            `name.ilike.%${term}%`,
            `trade_name.ilike.%${term}%`,
            `phone.ilike.%${term}%`,
            `email.ilike.%${term}%`,
            `sector_code.ilike.%${term}%`,
          ].join(','),
        )
        .limit(25);
      return (data as EmployerMasterRecord[]) || [];
    },
    enabled: debounced.length >= 2,
    staleTime: 30_000,
  });

  // Close popover when clicking outside
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const showResults = open && debounced.length >= 2 && !disabled;

  const helper = useMemo(() => {
    if (selected) {
      const s = statusInfo(selected.status);
      return (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <CheckCircle2 className="h-3.5 w-3.5 text-success" />
          <span className="font-mono">{selected.regno}</span>
          <span>·</span>
          <span className="truncate">{selected.name || selected.trade_name}</span>
          <Badge variant={s.variant} className="ml-1 text-[10px]">{s.label}</Badge>
        </div>
      );
    }
    return (
      <p className="text-[11px] text-muted-foreground">
        Search by registration number, employer name, trade name, sector, phone or email.
        Minimum 2 characters. Free-text entry is not allowed.
      </p>
    );
  }, [selected]);

  return (
    <div className="space-y-2" ref={containerRef}>
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          disabled={disabled}
          placeholder={placeholder || 'Search Employer Master…'}
          className="pl-8 h-9"
        />
        {showResults && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 rounded-md border bg-popover shadow-lg">
            {isLoading ? (
              <div className="p-3 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Searching Employer Master…
              </div>
            ) : results.length === 0 ? (
              <div className="p-3 text-center text-sm text-muted-foreground">
                No matching employer found in master data.
              </div>
            ) : (
              <ScrollArea className="max-h-72">
                <div className="divide-y">
                  {results.map(emp => {
                    const s = statusInfo(emp.status);
                    return (
                      <button
                        key={emp.regno}
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-accent text-sm"
                        onClick={() => {
                          onSelect(emp);
                          setOpen(false);
                          setQuery('');
                        }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <span className="font-mono text-[11px] text-muted-foreground">{emp.regno}</span>
                              <span className="font-medium truncate">{emp.name || emp.trade_name || '—'}</span>
                            </div>
                            <div className="mt-0.5 ml-5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                              {emp.trade_name && emp.trade_name !== emp.name && <span>“{emp.trade_name}”</span>}
                              {emp.sector_code && <span>Sector {emp.sector_code}</span>}
                              {emp.activity_type && <span>{emp.activity_type}</span>}
                              {emp.office_code && <span>Office {emp.office_code}</span>}
                            </div>
                          </div>
                          <Badge variant={s.variant} className="shrink-0 text-[10px]">{s.label}</Badge>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </div>
        )}
      </div>
      {helper}
    </div>
  );
}
