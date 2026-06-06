/**
 * ReferenceLookup — pick a record from a library (formula, document, workbasket,
 * escalation policy, reason code, screen template, workflow template, comm
 * template). The selected record is shown as a preview chip.
 */
import * as React from 'react';
import { SmartSelect } from './SmartSelect';
import { Badge } from '@/components/ui/badge';

export interface LookupRecord {
  id: string;
  code?: string | null;
  name: string;
  badge?: string;
}

interface Props {
  label: string;
  records: LookupRecord[];
  value: string | null;
  onChange: (id: string | null) => void;
  loading?: boolean;
  helpText?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  /** Optional anchor link to the source library, e.g. "/bn/config/formulas" */
  libraryHref?: string;
}

export function ReferenceLookup({
  label,
  records,
  value,
  onChange,
  loading,
  helpText,
  placeholder,
  required,
  disabled,
  libraryHref,
}: Props) {
  const options = React.useMemo(
    () => records.map((r) => ({
      value: r.id,
      label: r.code ? `${r.code} — ${r.name}` : r.name,
      searchText: `${r.code ?? ''} ${r.name}`,
    })),
    [records],
  );
  const selected = records.find((r) => r.id === value);

  return (
    <div className="space-y-1.5">
      <SmartSelect
        label={label}
        options={options}
        value={value ?? ''}
        onValueChange={(v) => onChange(v || null)}
        placeholder={placeholder ?? `Select from library…`}
        helpText={helpText}
        required={required}
        loading={loading}
        disabled={disabled}
      />
      {selected && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="secondary" className="font-mono">{selected.code ?? selected.id.slice(0, 8)}</Badge>
          <span className="truncate">{selected.name}</span>
          {selected.badge && <Badge variant="outline">{selected.badge}</Badge>}
        </div>
      )}
      {!loading && records.length === 0 && libraryHref && (
        <p className="text-xs text-muted-foreground">
          No records in this library yet. <a href={libraryHref} className="text-primary underline">Open library</a>.
        </p>
      )}
    </div>
  );
}
