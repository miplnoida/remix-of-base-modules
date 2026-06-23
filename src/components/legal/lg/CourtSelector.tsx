import { useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLgCourtsAll } from "@/hooks/legal/useLgCourts";
import { Loader2 } from "lucide-react";

export interface CourtSelectorValue {
  court_code?: string | null;
  court_division_code?: string | null;
  court_venue_code?: string | null;
  presiding_officer_code?: string | null;
  court_case_no?: string | null;
}

interface Props {
  value: CourtSelectorValue;
  onChange: (patch: Partial<CourtSelectorValue>) => void;
  countryCode?: string;
  required?: boolean;
  /** Render with a compact grid (md:grid-cols-2). Default true. */
  grid?: boolean;
}

const NONE = "__none__";

export function CourtSelector({ value, onChange, countryCode, required, grid = true }: Props) {
  const { data, isLoading } = useLgCourtsAll();

  const courts = useMemo(() => {
    const list = data?.courts ?? [];
    return countryCode ? list.filter((c) => !c.country_code || c.country_code === countryCode) : list;
  }, [data, countryCode]);

  const divisions = useMemo(
    () => (data?.divisions ?? []).filter((d) => !value.court_code || d.court_code === value.court_code),
    [data, value.court_code],
  );
  const venues = useMemo(
    () => (data?.venues ?? []).filter((v) => !value.court_code || v.court_code === value.court_code),
    [data, value.court_code],
  );
  const officers = useMemo(
    () => (data?.officers ?? []).filter((o) => !value.court_code || o.court_code === value.court_code),
    [data, value.court_code],
  );

  const selectedCourt = courts.find((c) => c.court_code === value.court_code);
  const hint = selectedCourt?.case_number_format_hint;

  const containerCls = grid ? "grid md:grid-cols-2 gap-3" : "space-y-3";

  return (
    <div className={containerCls}>
      <div>
        <Label>Court {required ? "*" : ""}</Label>
        <Select
          value={value.court_code ?? NONE}
          onValueChange={(v) => {
            const next = v === NONE ? null : v;
            // Clear cascaded fields if court changes
            onChange({
              court_code: next,
              court_division_code: null,
              court_venue_code: null,
              presiding_officer_code: null,
            });
          }}
          disabled={isLoading}
        >
          <SelectTrigger>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <SelectValue placeholder="Select court…" />}
          </SelectTrigger>
          <SelectContent className="max-h-80">
            <SelectItem value={NONE}>— None —</SelectItem>
            {courts.map((c) => (
              <SelectItem key={c.court_code} value={c.court_code}>
                {c.court_name}{c.island ? ` · ${c.island}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Court Reference No.{required ? " *" : ""}</Label>
        <Input
          value={value.court_case_no ?? ""}
          onChange={(e) => onChange({ court_case_no: e.target.value || null })}
          maxLength={50}
          placeholder={hint ?? "Issued by the court (manual entry)"}
        />
        {hint && <p className="text-xs text-muted-foreground mt-1">Format hint: {hint}</p>}
      </div>

      <div>
        <Label>Division</Label>
        <Select
          value={value.court_division_code ?? NONE}
          onValueChange={(v) => onChange({ court_division_code: v === NONE ? null : v })}
          disabled={!value.court_code || divisions.length === 0}
        >
          <SelectTrigger><SelectValue placeholder={value.court_code ? "Select division…" : "Pick a court first"} /></SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>— None —</SelectItem>
            {divisions.map((d) => (
              <SelectItem key={d.division_code} value={d.division_code}>
                {d.division_name}{d.civil_criminal_type ? ` (${d.civil_criminal_type})` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Venue</Label>
        <Select
          value={value.court_venue_code ?? NONE}
          onValueChange={(v) => onChange({ court_venue_code: v === NONE ? null : v })}
          disabled={!value.court_code || venues.length === 0}
        >
          <SelectTrigger><SelectValue placeholder={value.court_code ? "Select venue…" : "Pick a court first"} /></SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>— None —</SelectItem>
            {venues.map((v) => (
              <SelectItem key={v.venue_code} value={v.venue_code}>
                {v.venue_name}{v.island ? ` · ${v.island}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="md:col-span-2">
        <Label>Presiding Officer (Judge / Magistrate)</Label>
        <Select
          value={value.presiding_officer_code ?? NONE}
          onValueChange={(v) => onChange({ presiding_officer_code: v === NONE ? null : v })}
          disabled={!value.court_code || officers.length === 0}
        >
          <SelectTrigger><SelectValue placeholder={value.court_code ? "Select officer…" : "Pick a court first"} /></SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>— None —</SelectItem>
            {officers.map((o) => (
              <SelectItem key={o.officer_code} value={o.officer_code}>
                {o.officer_name}{o.officer_type ? ` · ${o.officer_type}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export default CourtSelector;
