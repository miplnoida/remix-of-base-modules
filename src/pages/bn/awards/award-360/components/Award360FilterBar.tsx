/**
 * BN-AWARD360-B1 — Award 360 filter bar.
 * Provides search + a small set of tab-supplied filter controls.
 */
import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X } from 'lucide-react';

export interface Award360FilterOption {
  value: string;
  label: string;
}

export interface Award360SelectFilter {
  kind: 'select';
  key: string;
  label: string;
  value: string;
  options: Award360FilterOption[];
  onChange: (v: string) => void;
}

export interface Award360DateFilter {
  kind: 'date';
  key: string;
  label: string;
  value: string | undefined;
  onChange: (v: string | undefined) => void;
}

export interface Award360ToggleFilter {
  kind: 'toggle';
  key: string;
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}

export type Award360FilterControl =
  | Award360SelectFilter
  | Award360DateFilter
  | Award360ToggleFilter;

export interface Award360FilterBarProps {
  search: string;
  onSearch: (v: string) => void;
  searchPlaceholder?: string;
  filters?: Award360FilterControl[];
  onReset?: () => void;
}

export const Award360FilterBar: React.FC<Award360FilterBarProps> = ({
  search,
  onSearch,
  searchPlaceholder = 'Search…',
  filters = [],
  onReset,
}) => (
  <div className="flex flex-wrap items-end gap-2 rounded-md border bg-muted/30 p-3">
    <div className="flex min-w-[220px] flex-1 flex-col gap-1">
      <label className="text-[11px] uppercase text-muted-foreground">Search</label>
      <Input value={search} onChange={(e) => onSearch(e.target.value)} placeholder={searchPlaceholder} />
    </div>
    {filters.map((f) => {
      if (f.kind === 'select') {
        return (
          <div key={f.key} className="flex min-w-[160px] flex-col gap-1">
            <label className="text-[11px] uppercase text-muted-foreground">{f.label}</label>
            <Select value={f.value} onValueChange={f.onChange}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {f.options.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      }
      if (f.kind === 'date') {
        return (
          <div key={f.key} className="flex min-w-[150px] flex-col gap-1">
            <label className="text-[11px] uppercase text-muted-foreground">{f.label}</label>
            <Input
              type="date"
              value={f.value ?? ''}
              onChange={(e) => f.onChange(e.target.value || undefined)}
            />
          </div>
        );
      }
      return (
        <label key={f.key} className="flex items-center gap-2 pb-2 text-sm">
          <input type="checkbox" checked={f.value} onChange={(e) => f.onChange(e.target.checked)} />
          <span>{f.label}</span>
        </label>
      );
    })}
    {onReset ? (
      <Button variant="ghost" size="sm" onClick={onReset} className="ml-auto">
        <X className="mr-1 h-3 w-3" /> Reset
      </Button>
    ) : null}
  </div>
);
