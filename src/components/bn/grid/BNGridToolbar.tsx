import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, Search, SlidersHorizontal, X, Plus, Upload } from 'lucide-react';
import type { BNToolbarFilter } from './types';
import type { Table } from '@tanstack/react-table';
import { BNGridColumnPicker } from './BNGridColumnPicker';
import { BNGridExport } from './BNGridExport';
import type { ExportContext } from '@/lib/bn/grid/exporters';

interface Props<T> {
  table: Table<T>;
  search: string;
  onSearchChange: (v: string) => void;
  searchPlaceholder?: string;
  filters?: BNToolbarFilter[];
  onClearAll?: () => void;
  onRefresh?: () => void;
  onCreate?: () => void;
  onImport?: () => void;
  exportContext: ExportContext;
  onResetColumns?: () => void;
  extras?: React.ReactNode;
}

export function BNGridToolbar<T>({
  table, search, onSearchChange, searchPlaceholder, filters = [],
  onClearAll, onRefresh, onCreate, onImport, exportContext, onResetColumns, extras,
}: Props<T>) {
  const activeCount = (search ? 1 : 0) + filters.filter((f) => f.value && f.value !== '__all__').length;
  return (
    <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-b bg-muted/20">
      <div className="relative flex-1 min-w-[200px] max-w-xs">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder ?? 'Quick search...'}
          className="pl-8 h-8"
        />
      </div>

      {filters.map((f) => (
        <Select key={f.key} value={f.value || '__all__'} onValueChange={(v) => f.onChange(v === '__all__' ? '' : v)}>
          <SelectTrigger className="h-8 w-[160px]">
            <SlidersHorizontal className="mr-1.5 h-3 w-3" />
            <SelectValue placeholder={f.label} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All {f.label}</SelectItem>
            {f.options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      ))}

      {activeCount > 0 && (
        <Badge variant="secondary" className="gap-1">
          Filters Applied ({activeCount})
          {onClearAll && (
            <button onClick={onClearAll} className="ml-1 hover:text-destructive" aria-label="Clear filters">
              <X className="h-3 w-3" />
            </button>
          )}
        </Badge>
      )}

      <div className="ml-auto flex items-center gap-1.5">
        {extras}
        {onRefresh && (
          <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={onRefresh}>
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        )}
        {onImport && (
          <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={onImport}>
            <Upload className="h-3.5 w-3.5" /> Import
          </Button>
        )}
        <BNGridColumnPicker table={table} onReset={onResetColumns} />
        <BNGridExport table={table} context={exportContext} />
        {onCreate && (
          <Button size="sm" className="h-8 gap-1.5" onClick={onCreate}>
            <Plus className="h-3.5 w-3.5" /> Create
          </Button>
        )}
      </div>
    </div>
  );
}
