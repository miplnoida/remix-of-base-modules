/**
 * InsuredPersonPickerLite — searchable insured-person picker for the legal case wizard.
 * Returns { id, ssn, name } and is used to auto-add an INSURED_PERSON / RESPONDENT party.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, Loader2, Search, X } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";

interface Props {
  value: string | null;       // selected ip_master.id (UUID)
  valueLabel?: string | null;
  onSelect: (person: { id: string; ssn: string; name: string } | null) => void;
  placeholder?: string;
}

function useInsuredPersonSearch(term: string) {
  return useQuery({
    queryKey: ["lg-wizard-ip-search", term],
    enabled: term.length >= 2,
    queryFn: async () => {
      const sb = supabase as any;
      const safe = term.replace(/[%_]/g, "");
      const { data, error } = await sb
        .from("ip_master")
        .select("id, ssn, firstname, surname")
        .or(`ssn.ilike.%${safe}%,firstname.ilike.%${safe}%,surname.ilike.%${safe}%`)
        .limit(20);
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; ssn: string; firstname: string | null; surname: string | null }>;
    },
  });
}

export function InsuredPersonPickerLite({ value, valueLabel, onSelect, placeholder }: Props) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const debounced = useDebounce(search, 300);
  const { data: results = [], isLoading } = useInsuredPersonSearch(debounced);

  if (value && !open) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-md border bg-muted/30 px-3 py-2">
        <div className="flex items-center gap-2 text-sm min-w-0">
          <User className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="font-medium truncate">{valueLabel || value}</span>
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
          placeholder={placeholder || "Search by SSN, first or surname…"}
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
            results.map((p) => {
              const name = [p.firstname, p.surname].filter(Boolean).join(" ") || "Unnamed";
              return (
                <button
                  type="button"
                  key={p.id}
                  className="w-full text-left px-3 py-2 hover:bg-accent text-sm flex items-center justify-between border-b last:border-b-0"
                  onClick={() => {
                    onSelect({ id: p.id, ssn: p.ssn, name });
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  <div>
                    <div className="font-medium">{name}</div>
                    <div className="text-xs text-muted-foreground font-mono">SSN {p.ssn}</div>
                  </div>
                  <Badge variant="outline" className="text-[10px]">IP</Badge>
                </button>
              );
            })
          ) : (
            <div className="p-3 text-center text-sm text-muted-foreground">No insured persons match “{debounced}”.</div>
          )}
        </div>
      )}
      {debounced.length > 0 && debounced.length < 2 && (
        <div className="mt-1 text-[11px] text-muted-foreground">Type at least 2 characters to search.</div>
      )}
    </div>
  );
}
