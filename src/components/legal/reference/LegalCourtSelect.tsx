/**
 * Court / Judge / Venue / Division / Fee-Rule dependent selectors.
 *
 * All four share the same shape and behavior:
 *   - Backed by `useLegalReferenceData` companions in the same hook module.
 *   - When the parent value changes, the child auto-clears (caller decides
 *     via the `onChange` callback; we surface `disabled` when no parent).
 *   - Historical values are preserved via legacy badges (same pattern as
 *     LegalReferenceSelect).
 */
import * as React from 'react';
import { AlertCircle } from 'lucide-react';
import { SearchableSelect, type SearchableSelectOption } from '@/components/ui/searchable-select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  useLegalCourts,
  useLegalCourtOfficers,
  useLegalCourtVenues,
  useLegalCourtDivisions,
  useLegalFeeRules,
} from '@/hooks/legal/useLegalReferenceData';

interface BaseProps {
  value: string | null | undefined;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

function LegacyHint({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="flex items-center gap-1 text-xs text-muted-foreground">
      <AlertCircle className="h-3 w-3" />
      <span>Legacy value — not in current master.</span>
      <Badge variant="outline" className="ml-1 h-4 px-1 text-[10px]">
        LEGACY
      </Badge>
    </div>
  );
}

/** Court selector (parent for Judge / Venue / Division). */
export function LegalCourtSelect({ value, onChange, disabled, placeholder = 'Select court', className, required }: BaseProps) {
  const { data, isLoading } = useLegalCourts();
  const rows = data ?? [];
  const known = rows.some((r) => r.court_code === value);
  const options: SearchableSelectOption[] = rows.map((r) => ({
    value: r.court_code,
    label: r.court_name,
    searchText: `${r.court_type ?? ''} ${r.island ?? ''}`,
  }));
  if (value && !known) options.unshift({ value, label: `${value} (legacy)` });
  return (
    <div className={cn('space-y-1', className)}>
      <SearchableSelect
        options={options}
        value={value ?? ''}
        onValueChange={onChange}
        placeholder={isLoading ? 'Loading…' : `${placeholder}${required ? ' *' : ''}`}
        disabled={disabled || isLoading}
      />
      <LegacyHint show={!!value && !known} />
    </div>
  );
}

/** Judge selector — depends on `courtCode`. Disabled until a court is chosen. */
export function LegalJudgeSelect({
  courtCode,
  value,
  onChange,
  disabled,
  placeholder = 'Select judge / officer',
  className,
  required,
  officerTypeFilter,
}: BaseProps & { courtCode: string | null | undefined; officerTypeFilter?: string[] }) {
  const { data, isLoading } = useLegalCourtOfficers(courtCode ?? null);
  const rows = (data ?? []).filter((r) => !officerTypeFilter || (r.officer_type && officerTypeFilter.includes(r.officer_type)));
  const known = rows.some((r) => r.officer_code === value);
  const options: SearchableSelectOption[] = rows.map((r) => ({
    value: r.officer_code,
    label: r.officer_name,
    searchText: r.officer_type ?? undefined,
  }));
  if (value && !known) options.unshift({ value, label: `${value} (legacy)` });
  return (
    <div className={cn('space-y-1', className)}>
      <SearchableSelect
        options={options}
        value={value ?? ''}
        onValueChange={onChange}
        placeholder={!courtCode ? 'Select a court first' : isLoading ? 'Loading…' : `${placeholder}${required ? ' *' : ''}`}
        disabled={disabled || !courtCode || isLoading}
      />
      <LegacyHint show={!!value && !!courtCode && !known} />
    </div>
  );
}

/** Venue selector — depends on `courtCode`. */
export function LegalVenueSelect({
  courtCode,
  value,
  onChange,
  disabled,
  placeholder = 'Select venue',
  className,
  required,
}: BaseProps & { courtCode: string | null | undefined }) {
  const { data, isLoading } = useLegalCourtVenues(courtCode ?? null);
  const rows = data ?? [];
  const known = rows.some((r) => r.venue_code === value);
  const options: SearchableSelectOption[] = rows.map((r) => ({
    value: r.venue_code,
    label: r.venue_name,
    searchText: r.island ?? undefined,
  }));
  if (value && !known) options.unshift({ value, label: `${value} (legacy)` });
  return (
    <div className={cn('space-y-1', className)}>
      <SearchableSelect
        options={options}
        value={value ?? ''}
        onValueChange={onChange}
        placeholder={!courtCode ? 'Select a court first' : isLoading ? 'Loading…' : `${placeholder}${required ? ' *' : ''}`}
        disabled={disabled || !courtCode || isLoading}
      />
      <LegacyHint show={!!value && !!courtCode && !known} />
    </div>
  );
}

/** Division selector — depends on `courtCode`. */
export function LegalDivisionSelect({
  courtCode,
  value,
  onChange,
  disabled,
  placeholder = 'Select division',
  className,
  required,
}: BaseProps & { courtCode: string | null | undefined }) {
  const { data, isLoading } = useLegalCourtDivisions(courtCode ?? null);
  const rows = data ?? [];
  const known = rows.some((r) => r.division_code === value);
  const options: SearchableSelectOption[] = rows.map((r) => ({
    value: r.division_code,
    label: r.division_name,
    searchText: r.civil_criminal_type ?? undefined,
  }));
  if (value && !known) options.unshift({ value, label: `${value} (legacy)` });
  return (
    <div className={cn('space-y-1', className)}>
      <SearchableSelect
        options={options}
        value={value ?? ''}
        onValueChange={onChange}
        placeholder={!courtCode ? 'Select a court first' : isLoading ? 'Loading…' : `${placeholder}${required ? ' *' : ''}`}
        disabled={disabled || !courtCode || isLoading}
      />
      <LegacyHint show={!!value && !!courtCode && !known} />
    </div>
  );
}

/** Fee-Rule selector — depends on `feeHeadCode`. Value = `lg_fee_rule.rule_code`. */
export function LegalFeeRuleSelect({
  feeHeadCode,
  value,
  onChange,
  disabled,
  placeholder = 'Select fee rule',
  className,
  required,
}: BaseProps & { feeHeadCode: string | null | undefined }) {
  const { data, isLoading } = useLegalFeeRules(feeHeadCode ?? null);
  const rows = data ?? [];
  const known = rows.some((r) => r.rule_code === value);
  const options: SearchableSelectOption[] = rows.map((r) => ({
    value: r.rule_code,
    label: `${r.rule_name}${r.default_amount != null ? ` — ${r.currency_code ?? ''} ${r.default_amount}` : ''}`,
    searchText: r.rule_code,
  }));
  if (value && !known) options.unshift({ value, label: `${value} (legacy)` });
  return (
    <div className={cn('space-y-1', className)}>
      <SearchableSelect
        options={options}
        value={value ?? ''}
        onValueChange={onChange}
        placeholder={
          !feeHeadCode ? 'Select a fee head first' : isLoading ? 'Loading…' : `${placeholder}${required ? ' *' : ''}`
        }
        disabled={disabled || !feeHeadCode || isLoading}
      />
      <LegacyHint show={!!value && !!feeHeadCode && !known} />
    </div>
  );
}
