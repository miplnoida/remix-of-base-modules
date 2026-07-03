/**
 * LegalReferenceSelect — the ONE selector every Legal form should use for
 * reference-data fields. Wraps SearchableSelect and consumes the unified
 * `useLegalReferenceData` hook, so:
 *
 *  - No component ever queries `core_reference_value` directly.
 *  - Retired values are non-selectable but historic rows still render.
 *  - Free-text legacy values (stored before the master existed) are shown
 *    with a muted "Legacy" badge so users know they need mapping.
 *
 * Usage:
 *   <LegalReferenceSelect
 *     groupCode={LG_REF.PRIORITY}
 *     value={form.priority}
 *     onChange={(v) => setForm({ ...form, priority: v })}
 *     placeholder="Select priority"
 *   />
 */
import * as React from 'react';
import { AlertCircle } from 'lucide-react';
import { SearchableSelect, type SearchableSelectOption } from '@/components/ui/searchable-select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  useLegalReferenceData,
  type LegalReferenceGroupCode,
} from '@/hooks/legal/useLegalReferenceData';

export interface LegalReferenceSelectProps {
  groupCode: LegalReferenceGroupCode;
  value: string | null | undefined;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  className?: string;
  /** Show retired values as (retired) suffix, still non-selectable. */
  showRetired?: boolean;
  /** Adds a required (*) indicator to the placeholder for form clarity. */
  required?: boolean;
  /** Optional wrapper id for label htmlFor. */
  id?: string;
}

export function LegalReferenceSelect({
  groupCode,
  value,
  onChange,
  placeholder = 'Select…',
  searchPlaceholder,
  emptyMessage,
  disabled,
  className,
  showRetired,
  required,
  id,
}: LegalReferenceSelectProps) {
  const { options, allOptions, isLoading, resolveOption } = useLegalReferenceData(groupCode, {
    includeInactive: showRetired,
  });

  const current = resolveOption(value);

  // Build the option list; ensure the current value (even if legacy/retired)
  // remains visible so the trigger label renders correctly.
  const selectOptions: SearchableSelectOption[] = React.useMemo(() => {
    const seen = new Set<string>();
    const out: SearchableSelectOption[] = [];
    for (const o of options) {
      seen.add(o.value);
      out.push({ value: o.value, label: o.label, searchText: o.description ?? undefined });
    }
    if (current && !seen.has(current.value)) {
      const suffix = current.isLegacy ? ' (legacy)' : ' (retired)';
      out.unshift({
        value: current.value,
        label: `${current.label}${suffix}`,
        searchText: current.description ?? undefined,
      });
    }
    // Also surface retired values inline when showRetired requested.
    if (showRetired) {
      for (const o of allOptions) {
        if (o.isActive || seen.has(o.value)) continue;
        seen.add(o.value);
        out.push({ value: `__retired__:${o.value}`, label: `${o.label} (retired)` });
      }
    }
    return out;
  }, [options, allOptions, showRetired, current]);

  return (
    <div className={cn('space-y-1', className)} id={id}>
      <SearchableSelect
        options={selectOptions}
        value={value ?? ''}
        onValueChange={(v) => {
          // Guard: prevent selecting a "__retired__:" pseudo-option.
          if (v.startsWith('__retired__:')) return;
          onChange(v);
        }}
        placeholder={isLoading ? 'Loading…' : `${placeholder}${required ? ' *' : ''}`}
        searchPlaceholder={searchPlaceholder}
        emptyMessage={emptyMessage ?? 'No matching values.'}
        disabled={disabled || isLoading}
      />
      {current?.isLegacy && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <AlertCircle className="h-3 w-3" />
          <span>Legacy value — not in current master.</span>
          <Badge variant="outline" className="ml-1 h-4 px-1 text-[10px]">
            LEGACY
          </Badge>
        </div>
      )}
    </div>
  );
}

/**
 * Read-only display helper — resolves a stored code to a labelled badge,
 * marking legacy values so list/detail views stay honest about data quality.
 */
export function LegalReferenceValueBadge({
  groupCode,
  value,
  className,
  emptyLabel = '—',
}: {
  groupCode: LegalReferenceGroupCode;
  value: string | null | undefined;
  className?: string;
  emptyLabel?: string;
}) {
  const { resolveOption } = useLegalReferenceData(groupCode);
  const opt = resolveOption(value);
  if (!opt) return <span className={cn('text-muted-foreground', className)}>{emptyLabel}</span>;
  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      <span>{opt.label}</span>
      {opt.isLegacy && (
        <Badge variant="outline" className="h-4 px-1 text-[10px]" title="Not in current master">
          LEGACY
        </Badge>
      )}
      {!opt.isActive && !opt.isLegacy && (
        <Badge variant="secondary" className="h-4 px-1 text-[10px]">
          RETIRED
        </Badge>
      )}
    </span>
  );
}
