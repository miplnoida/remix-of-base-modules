import React, { useState, useEffect, useMemo } from 'react';
import { Search, X, RotateCcw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';

export interface StandardFilterField {
  key: string;
  label: string;
  type: 'select' | 'date';
  options?: { value: string; label: string }[];
  placeholder?: string;
}

interface StandardSearchFilterBarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  filters?: StandardFilterField[];
  filterValues?: Record<string, string>;
  onFilterChange?: (key: string, value: string) => void;
  onReset?: () => void;
  debounceMs?: number;
}

export const StandardSearchFilterBar: React.FC<StandardSearchFilterBarProps> = ({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search...',
  filters = [],
  filterValues = {},
  onFilterChange,
  onReset,
  debounceMs = 300,
}) => {
  const [localSearch, setLocalSearch] = useState(searchValue);

  useEffect(() => {
    setLocalSearch(searchValue);
  }, [searchValue]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== searchValue) onSearchChange(localSearch);
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [localSearch, debounceMs]);

  const hasActiveFilters = Object.entries(filterValues).some(
    ([, v]) => v && v !== '' && v !== 'all'
  );

  const filterCount = filters.length;

  // Compute grid layout
  const layout = useMemo(() => {
    const searchCols = filterCount >= 3 ? 3 : 4;
    const filterCols = 2;
    const resetCols = 1;
    const totalNeeded = searchCols + (filterCount * filterCols) + resetCols;
    const multiRow = totalNeeded > 12;

    if (multiRow) {
      // Split: row1 gets search + as many filters as fit, row2 gets rest + reset
      const row1FilterSlots = Math.floor((12 - searchCols) / filterCols);
      const row1Filters = filters.slice(0, row1FilterSlots);
      const row2Filters = filters.slice(row1FilterSlots);
      // Row2: distribute remaining filters evenly, reset gets leftover
      const row2FilterTotal = row2Filters.length;
      const row2UsedCols = row2FilterTotal * filterCols;
      // Give remaining cols to reset area or distribute
      const row2ResetSpan = 12 - row2UsedCols;
      // If row2 filters are few, give them more space
      const row2EachCols = row2FilterTotal <= 2 ? 3 : 2;
      const row2ResetActual = 12 - (row2FilterTotal * row2EachCols);

      return {
        multiRow: true,
        searchCols,
        row1Filters,
        row2Filters,
        row2EachCols,
        row2ResetCols: Math.max(row2ResetActual, 1),
      };
    }

    return {
      multiRow: false,
      searchCols,
      filterCols,
      resetCols: 12 - searchCols - (filterCount * filterCols), // remaining for reset
    };
  }, [filterCount, filters]);

  const renderFilter = (filter: StandardFilterField, colSpan: number) => (
    <div key={filter.key} className={`space-y-1 lg:col-span-${colSpan}`}>
      <Label className="text-xs text-muted-foreground">{filter.label}</Label>
      {filter.type === 'select' && filter.options ? (
        <Select
          value={filterValues[filter.key] || 'all'}
          onValueChange={(v) => onFilterChange?.(filter.key, v)}
        >
          <SelectTrigger className="h-9 w-full">
            <SelectValue placeholder={filter.placeholder || 'Select...'} />
          </SelectTrigger>
          <SelectContent>
            {filter.options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Input
          type="date"
          value={filterValues[filter.key] || ''}
          onChange={(e) => onFilterChange?.(filter.key, e.target.value)}
          className="h-9 w-full"
        />
      )}
    </div>
  );

  const resetButton = (
    <div className="space-y-1 flex flex-col justify-end">
      <Label className="text-xs text-transparent select-none hidden lg:block">Reset</Label>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          setLocalSearch('');
          onSearchChange('');
          onReset?.();
        }}
        disabled={!localSearch && !hasActiveFilters}
        className="h-9 px-3 whitespace-nowrap"
      >
        <RotateCcw className="h-4 w-4 mr-1.5" />
        Reset
      </Button>
    </div>
  );

  const searchField = (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">Search</Label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={searchPlaceholder}
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          className="pl-10 pr-8 h-9"
        />
        {localSearch && (
          <button
            onClick={() => { setLocalSearch(''); onSearchChange(''); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );

  // Build dynamic grid style for desktop using inline style for col-span
  // (Tailwind purges dynamic class names, so we use inline gridColumn)
  if (layout.multiRow) {
    const { searchCols, row1Filters, row2Filters, row2EachCols, row2ResetCols } = layout;
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3">
            {/* Row 1 */}
            <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-3">
              <div style={{ gridColumn: `span ${searchCols}` }} className="col-span-1 md:col-span-6 lg:col-auto">
                {searchField}
              </div>
              {row1Filters.map((f) => (
                <div key={f.key} style={{ gridColumn: 'span 2' }} className="col-span-1 md:col-span-3 lg:col-auto">
                  {renderFilter(f, 2)}
                </div>
              ))}
            </div>
            {/* Row 2 */}
            <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-3">
              {row2Filters.map((f) => (
                <div key={f.key} style={{ gridColumn: `span ${row2EachCols}` }} className="col-span-1 md:col-span-3 lg:col-auto">
                  {renderFilter(f, row2EachCols)}
                </div>
              ))}
              {onReset && (
                <div style={{ gridColumn: `span ${row2ResetCols}` }} className="col-span-1 md:col-span-3 lg:col-auto flex justify-end">
                  {resetButton}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Single row layout
  const { searchCols, resetCols } = layout as { multiRow: false; searchCols: number; filterCols: number; resetCols: number };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-3">
          <div style={{ gridColumn: `span ${searchCols}` }} className="col-span-1 md:col-span-6 lg:col-auto">
            {searchField}
          </div>
          {filters.map((f) => (
            <div key={f.key} style={{ gridColumn: 'span 2' }} className="col-span-1 md:col-span-3 lg:col-auto">
              {renderFilter(f, 2)}
            </div>
          ))}
          {onReset && (
            <div style={{ gridColumn: `span ${Math.max(resetCols, 1)}` }} className="col-span-1 md:col-span-3 lg:col-auto flex justify-end">
              {resetButton}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
