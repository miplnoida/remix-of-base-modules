import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useOfficeCodes } from "@/hooks/compliance/useOfficeCodes";

interface OfficeSelectProps {
  value: string;
  onChange: (value: string) => void;
  allowNone?: boolean;
  noneLabel?: string;
  error?: boolean;
  placeholder?: string;
}

export function OfficeSelect({ value, onChange, allowNone, noneLabel = "— None —", error, placeholder = "Select office" }: OfficeSelectProps) {
  const { data: offices = [] } = useOfficeCodes();

  return (
    <Select value={value || (allowNone ? "none" : "")} onValueChange={v => onChange(v === "none" ? "" : v)}>
      <SelectTrigger className={error ? "border-destructive" : ""}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {allowNone && <SelectItem value="none">{noneLabel}</SelectItem>}
        {offices.map(o => (
          <SelectItem key={o.code} value={o.code}>{o.code} – {o.description}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
