import React, { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Building2, Loader2 } from 'lucide-react';
import { useEmployerSearch } from '@/hooks/compliance/useSimulatorData';
import { useDebounce } from '@/hooks/useDebounce';

interface Props {
  selectedRegNo: string | null;
  onSelect: (regno: string, name: string, status: string) => void;
}

export default function EmployerSelector({ selectedRegNo, onSelect }: Props) {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const { data: results, isLoading } = useEmployerSearch(debouncedSearch);
  const [showDropdown, setShowDropdown] = useState(false);

  const statusColor = (s: string | null) => {
    if (s === 'A') return 'default';
    if (s === 'I') return 'secondary';
    if (s === 'D') return 'destructive';
    return 'outline';
  };

  const statusLabel = (s: string | null) => {
    if (s === 'A') return 'Active';
    if (s === 'I') return 'Inactive';
    if (s === 'D') return 'Deregistered';
    return s || 'Unknown';
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by Reg#, name, or trade name..."
          value={search}
          onChange={e => { setSearch(e.target.value); setShowDropdown(true); }}
          onFocus={() => setShowDropdown(true)}
          className="flex-1"
        />
      </div>

      {showDropdown && debouncedSearch.length >= 2 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg max-h-64 overflow-y-auto">
          {isLoading ? (
            <div className="p-3 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Searching...
            </div>
          ) : results && results.length > 0 ? (
            results.map((emp: any) => (
              <button
                key={emp.regno}
                className="w-full text-left px-3 py-2 hover:bg-accent text-sm flex items-center justify-between border-b last:border-b-0"
                onClick={() => {
                  onSelect(emp.regno, emp.name || emp.trade_name || '', emp.status || '');
                  setShowDropdown(false);
                  setSearch(`${emp.regno} — ${emp.name || emp.trade_name || ''}`);
                }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <span className="font-mono text-xs text-muted-foreground">{emp.regno}</span>
                    <span className="ml-2 truncate">{emp.name || emp.trade_name}</span>
                  </div>
                </div>
                <Badge variant={statusColor(emp.status)} className="shrink-0 text-xs">
                  {statusLabel(emp.status)}
                </Badge>
              </button>
            ))
          ) : (
            <div className="p-3 text-center text-sm text-muted-foreground">No employers found</div>
          )}
        </div>
      )}
    </div>
  );
}
