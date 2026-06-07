/**
 * Lightweight multi-select with chip display. Wraps the existing
 * SearchableSelect for keyboard-friendly single-choice add, then renders
 * selected entries as removable chips. Used in ApprovalPoliciesTab to
 * configure allowed/blocked statuses and rule codes without forcing the
 * configurator to type comma-separated values.
 */
import * as React from 'react';
import { X } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SearchableSelect, type SearchableSelectOption } from '@/components/ui/searchable-select';

interface Props {
  label?: string;
  hint?: string;
  options: SearchableSelectOption[];
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
  emptyMessage?: string;
}

export function MultiSelectChips({
  label,
  hint,
  options,
  value,
  onChange,
  disabled,
  placeholder = 'Add…',
  emptyMessage = 'No matches.',
}: Props) {
  const [draft, setDraft] = React.useState<string>('');

  const available = options.filter((o) => !value.includes(o.value));

  const labelFor = (v: string) =>
    options.find((o) => o.value === v)?.label ?? v;

  const add = (v: string) => {
    if (!v) return;
    if (value.includes(v)) return;
    onChange([...value, v]);
    setDraft('');
  };

  const remove = (v: string) => {
    onChange(value.filter((x) => x !== v));
  };

  return (
    <div>
      {label && (
        <Label className="text-xs">
          {label} {hint && <span className="text-muted-foreground">({hint})</span>}
        </Label>
      )}
      <div className="mt-1 space-y-2">
        <SearchableSelect
          options={available}
          value={draft}
          onValueChange={(v) => add(v)}
          placeholder={placeholder}
          searchPlaceholder="Type to filter…"
          emptyMessage={emptyMessage}
          disabled={disabled || available.length === 0}
        />
        {value.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {value.map((v) => (
              <Badge key={v} variant="secondary" className="gap-1 pr-1 font-mono text-xs">
                <span>{labelFor(v)}</span>
                {!disabled && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4"
                    onClick={() => remove(v)}
                    aria-label={`Remove ${v}`}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default MultiSelectChips;
