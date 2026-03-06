import React, { useState, useEffect, useMemo } from 'react';
import { Search, X, RotateCcw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { useIsMobile } from '@/hooks/use-mobile';

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
  /** Max filters on first row (desktop). Remaining wrap to row 2. */
  maxFiltersFirstRow?: number;
}

// Desktop breakpoint
const LG = 1024;
const MD = 768;

export const StandardSearchFilterBar: React.FC<StandardSearchFilterBarProps> = ({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search...',
  filters = [],
  filterValues = {},
  onFilterChange,
  onReset,
  debounceMs = 300,
  maxFiltersFirstRow,
}) => {
  const [localSearch, setLocalSearch] = useState(searchValue);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : LG);

  useEffect(() => {
    setLocalSearch(searchValue);
  }, [searchValue]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== searchValue) onSearchChange(localSearch);
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [localSearch, debounceMs, onSearchChange, searchValue]);

  useEffect(() => {
    const onResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const hasActiveFilters = Object.entries(filterValues).some(
    ([, v]) => v && v !== '' && v !== 'all'
  );

  const isDesktop = windowWidth >= LG;
  const isTablet = windowWidth >= MD && windowWidth < LG;

  const filterCount = filters.length;

  // Layout: deterministic 12-col grid for desktop
  const layout = useMemo(() => {
    const searchCols = filterCount >= 3 ? 3 : 4;
    const resetCols = 1;
    const maxRow1 = maxFiltersFirstRow ?? Math.floor((12 - searchCols - resetCols) / 2);
    const needsMultiRow = filterCount > maxRow1;

    if (needsMultiRow) {
      const row1Filters = filters.slice(0, maxRow1);
      const row2Filters = filters.slice(maxRow1);
      const row2FilterCols = Math.min(3, Math.floor((12 - resetCols) / Math.max(row2Filters.length, 1)));
      const row2ResetCols = Math.max(12 - row2Filters.length * row2FilterCols, 1);

      return { multiRow: true, searchCols, row1Filters, row2Filters, row2FilterCols, row2ResetCols };
    }

    return { multiRow: false, searchCols, resetCols: Math.max(12 - searchCols - filterCount * 2, 1) };
  }, [filterCount, filters, maxFiltersFirstRow]);

  // --- Reusable sub-renders ---

  const renderFilter = (filter: StandardFilterField) => (
    <div key={filter.key} className="space-y-1 min-w-0">
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

  const resetBtn = onReset ? (
    <div className="space-y-1 flex flex-col justify-end min-w-0">
      {isDesktop && <Label className="text-xs text-transparent select-none">Reset</Label>}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => { setLocalSearch(''); onSearchChange(''); onReset(); }}
        disabled={!localSearch && !hasActiveFilters}
        className="h-9 px-3 whitespace-nowrap"
      >
        <RotateCcw className="h-4 w-4 mr-1.5" />
        Reset
      </Button>
    </div>
  ) : null;

  const searchField = (
    <div className="space-y-1 min-w-0">
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

  // --- Grid template helpers ---
  // Desktop uses fractional units matching the 12-col plan
  const fr = (n: number) => `${n}fr`;

  // Multi-row
  if (layout.multiRow) {
    const { searchCols, row1Filters, row2Filters, row2FilterCols, row2ResetCols } = layout;

    // Desktop grid templates
    const row1DesktopTemplate = [fr(searchCols), ...row1Filters.map(() => fr(2))].join(' ');
    const row2DesktopTemplate = [...row2Filters.map(() => fr(row2FilterCols)), fr(row2ResetCols)].join(' ');

    const row1Style: React.CSSProperties = isDesktop
      ? { display: 'grid', gridTemplateColumns: row1DesktopTemplate, gap: '0.75rem' }
      : isTablet
        ? { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }
        : { display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem' };

    const row2Style: React.CSSProperties = isDesktop
      ? { display: 'grid', gridTemplateColumns: row2DesktopTemplate, gap: '0.75rem' }
      : isTablet
        ? { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }
        : { display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem' };

    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3">
            <div style={row1Style}>
              {searchField}
              {row1Filters.map((f) => renderFilter(f))}
            </div>
            <div style={row2Style}>
              {row2Filters.map((f) => renderFilter(f))}
              {resetBtn && <div className="flex justify-end">{resetBtn}</div>}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Single-row
  const { searchCols, resetCols } = layout as { multiRow: false; searchCols: number; resetCols: number };

  const parts = [fr(searchCols), ...filters.map(() => fr(2))];
  if (onReset) parts.push(fr(resetCols));
  const singleDesktopTemplate = parts.join(' ');

  const gridStyle: React.CSSProperties = isDesktop
    ? { display: 'grid', gridTemplateColumns: singleDesktopTemplate, gap: '0.75rem' }
    : isTablet
      ? { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }
      : { display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem' };

  return (
    <Card>
      <CardContent className="p-4">
        <div style={gridStyle}>
          {searchField}
          {filters.map((f) => renderFilter(f))}
          {resetBtn && <div className="flex justify-end">{resetBtn}</div>}
        </div>
      </CardContent>
    </Card>
  );
};
