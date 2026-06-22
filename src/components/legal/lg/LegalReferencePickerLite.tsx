/**
 * LegalReferencePickerLite — multi-select picker for SKN core_legal_reference rows.
 * Used in the Legal Case creation wizard to attach starting legal references.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Loader2, Search, X } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";

interface RefRow {
  id: string;
  ref_code: string;
  short_title: string | null;
  section: string | null;
  country_code: string | null;
}

interface Props {
  countryCode?: string;
  value: string[];
  onChange: (ids: string[], rows: RefRow[]) => void;
}

function useLegalRefSearch(country: string, term: string) {
  return useQuery({
    queryKey: ["lg-wizard-legal-ref-search", country, term],
    queryFn: async () => {
      const sb = supabase as any;
      let q = sb.from("core_legal_reference")
        .select("id, ref_code, short_title, section, country_code")
        .eq("is_active", true)
        .eq("country_code", country)
        .order("ref_code", { ascending: true })
        .limit(30);
      if (term && term.length >= 2) {
        const safe = term.replace(/[%_]/g, "");
        q = q.or(`ref_code.ilike.%${safe}%,short_title.ilike.%${safe}%,section.ilike.%${safe}%`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as RefRow[];
    },
  });
}

export function LegalReferencePickerLite({ countryCode = "KN", value, onChange }: Props) {
  const [search, setSearch] = useState("");
  const debounced = useDebounce(search, 300);
  const { data: results = [], isLoading } = useLegalRefSearch(countryCode, debounced);
  const [selectedRows, setSelectedRows] = useState<RefRow[]>([]);

  const toggle = (row: RefRow) => {
    const next = value.includes(row.id) ? value.filter((id) => id !== row.id) : [...value, row.id];
    const nextRows = value.includes(row.id)
      ? selectedRows.filter((r) => r.id !== row.id)
      : [...selectedRows, row];
    setSelectedRows(nextRows);
    onChange(next, nextRows);
  };

  const remove = (id: string) => {
    const nextRows = selectedRows.filter((r) => r.id !== id);
    setSelectedRows(nextRows);
    onChange(value.filter((v) => v !== id), nextRows);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search SKN legal references by code, title, or section…"
          className="flex-1"
        />
      </div>

      {selectedRows.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedRows.map((r) => (
            <Badge key={r.id} variant="secondary" className="gap-1 pl-2 pr-1 py-1">
              <BookOpen className="h-3 w-3" />
              <span className="font-mono text-[10px]">{r.ref_code}</span>
              {r.short_title && <span className="truncate max-w-[180px]">— {r.short_title}</span>}
              <button type="button" onClick={() => remove(r.id)} className="ml-1 hover:bg-muted rounded">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <div className="rounded-md border max-h-56 overflow-y-auto bg-card">
        {isLoading ? (
          <div className="p-3 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : results.length === 0 ? (
          <div className="p-3 text-center text-sm text-muted-foreground">
            No SKN legal references found.
          </div>
        ) : (
          results.map((r) => {
            const checked = value.includes(r.id);
            return (
              <button
                type="button"
                key={r.id}
                onClick={() => toggle(r)}
                className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between border-b last:border-b-0 hover:bg-accent ${
                  checked ? "bg-primary/5" : ""
                }`}
              >
                <div className="min-w-0">
                  <div className="font-medium truncate">
                    {r.short_title || r.ref_code}
                  </div>
                  <div className="text-xs text-muted-foreground font-mono">
                    {r.ref_code}{r.section ? ` · §${r.section}` : ""}
                  </div>
                </div>
                <Badge variant={checked ? "default" : "outline"} className="text-[10px] ml-2">
                  {checked ? "Selected" : "Add"}
                </Badge>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
