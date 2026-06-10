/**
 * CompliantEmployerPicker — searchable employer selector for compliance forms.
 *
 * Same UX as the picker on C3 Management → C3 Contribution: type to search by
 * registration number, name, or trade name; pick one and the parent receives
 * { regno, name }.
 *
 * Issue #5 fix — replaces the free-text "Employer ID" input on Manual
 * Violation Entry so admins can't mistype a non-existent employer ID.
 */
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Building2, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEmployerSearch } from '@/hooks/compliance/useSimulatorData';
import { useDebounce } from '@/hooks/useDebounce';

interface Props {
  value: string | null;                 // selected regno
  valueLabel?: string | null;           // last known display name (for restoring)
  onSelect: (regno: string | null, name: string) => void;
  placeholder?: string;
}

export function CompliantEmployerPicker({ value, valueLabel, onSelect, placeholder }: Props) {
  const [search, setSearch] = useState('');
  const debounced = useDebounce(search, 300);
  const { data: results, isLoading } = useEmployerSearch(debounced);
  const [open, setOpen] = useState(false);

  // Show selected chip when a value is committed and not editing
  if (value && !open) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-md border bg-muted/30 px-3 py-2">
        <div className="flex items-center gap-2 text-sm">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{valueLabel || value}</span>
          <Badge variant="outline" className="font-mono text-[10px]">{value}</Badge>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7"
          onClick={() => { setOpen(true); setSearch(''); }}
        >
          <X className="h-3.5 w-3.5 mr-1" /> Change
        </Button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          autoFocus={open}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={placeholder || 'Search by Reg#, name, or trade name…'}
          className="flex-1"
        />
        {value && (
          <Button type="button" variant="ghost" size="sm" onClick={() => { setOpen(false); }}>
            Cancel
          </Button>
        )}
      </div>

      {debounced.length >= 2 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg max-h-64 overflow-y-auto">
          {isLoading ? (
            <div className="p-3 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Searching…
            </div>
          ) : results && results.length > 0 ? (
            results.map((emp: any) => (
              <button
                type="button"
                key={emp.regno}
                className="w-full text-left px-3 py-2 hover:bg-accent text-sm flex items-center justify-between border-b last:border-b-0"
                onClick={() => {
                  const name = emp.name || emp.trade_name || '';
                  onSelect(emp.regno, name);
                  setOpen(false);
                  setSearch('');
                }}
              >
                <div>
                  <div className="font-medium">{emp.name || emp.trade_name || 'Unnamed'}</div>
                  <div className="text-xs text-muted-foreground font-mono">{emp.regno}</div>
                </div>
                {emp.status && (
                  <Badge variant="outline" className="text-[10px]">{emp.status}</Badge>
                )}
              </button>
            ))
          ) : (
            <div className="p-3 text-center text-sm text-muted-foreground">No employers match “{debounced}”.</div>
          )}
        </div>
      )}
      {debounced.length > 0 && debounced.length < 2 && (
        <div className="mt-1 text-[11px] text-muted-foreground">Type at least 2 characters to search.</div>
      )}
    </div>
  );
}
