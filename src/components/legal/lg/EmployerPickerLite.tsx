/**
 * EmployerPickerLite — searchable employer picker for the legal case wizard.
 * On select returns { regno, name, status }. Used to auto-add a RESPONDENT
 * party with party_type = EMPLOYER and external_ref_id = regno.
 */
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Loader2, Search, X } from "lucide-react";
import { useEmployerSearch } from "@/hooks/compliance/useSimulatorData";
import { useDebounce } from "@/hooks/useDebounce";

interface Props {
  value: string | null;       // selected regno
  valueLabel?: string | null;
  onSelect: (employer: { regno: string; name: string; status?: string | null } | null) => void;
  placeholder?: string;
}

export function EmployerPickerLite({ value, valueLabel, onSelect, placeholder }: Props) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const debounced = useDebounce(search, 300);
  const { data: results = [], isLoading } = useEmployerSearch(debounced);

  if (value && !open) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-md border bg-muted/30 px-3 py-2">
        <div className="flex items-center gap-2 text-sm min-w-0">
          <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="font-medium truncate">{valueLabel || value}</span>
          <Badge variant="outline" className="font-mono text-[10px]">{value}</Badge>
        </div>
        <div className="flex gap-1">
          <Button type="button" variant="ghost" size="sm" className="h-7"
            onClick={() => { setOpen(true); setSearch(""); }}>
            <X className="h-3.5 w-3.5 mr-1" /> Change
          </Button>
          <Button type="button" variant="ghost" size="sm" className="h-7 text-destructive"
            onClick={() => onSelect(null)}>
            Clear
          </Button>
        </div>
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
          placeholder={placeholder || "Search by Reg#, name, or trade name…"}
          className="flex-1"
        />
        {open && (
          <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
        )}
      </div>
      {debounced.length >= 2 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg max-h-64 overflow-y-auto">
          {isLoading ? (
            <div className="p-3 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Searching…
            </div>
          ) : results.length > 0 ? (
            results.map((emp: any) => (
              <button
                type="button"
                key={emp.regno}
                className="w-full text-left px-3 py-2 hover:bg-accent text-sm flex items-center justify-between border-b last:border-b-0"
                onClick={() => {
                  onSelect({ regno: emp.regno, name: emp.name || emp.trade_name || "Unnamed", status: emp.status });
                  setOpen(false);
                  setSearch("");
                }}
              >
                <div>
                  <div className="font-medium">{emp.name || emp.trade_name || "Unnamed"}</div>
                  <div className="text-xs text-muted-foreground font-mono">{emp.regno}</div>
                </div>
                {emp.status && <Badge variant="outline" className="text-[10px]">{emp.status}</Badge>}
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
