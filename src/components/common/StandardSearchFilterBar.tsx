import React, { useState, useEffect } from 'react';
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

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col gap-3">
          {/* Row: Search + Filters + Reset — all on one line on desktop */}
          <div className="flex flex-col lg:flex-row items-end gap-3">
            {/* Search */}
            <div className="w-full lg:flex-1 lg:min-w-[220px] space-y-1">
              <Label className="text-xs text-muted-foreground">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={searchPlaceholder}
                  value={localSearch}
                  onChange={(e) => setLocalSearch(e.target.value)}
                  className="pl-10 pr-8 h-10"
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

            {/* Filters */}
            {filters.map((filter) => (
              <div
                key={filter.key}
                className={`w-full space-y-1 ${
                  filterCount <= 2
                    ? 'sm:w-[200px]'
                    : filterCount <= 4
                    ? 'sm:w-[180px]'
                    : 'sm:w-[170px]'
                }`}
              >
                <Label className="text-xs text-muted-foreground">{filter.label}</Label>
                {filter.type === 'select' && filter.options ? (
                  <Select
                    value={filterValues[filter.key] || 'all'}
                    onValueChange={(v) => onFilterChange?.(filter.key, v)}
                  >
                    <SelectTrigger className="h-10 w-full">
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
                    className="h-10 w-full"
                  />
                )}
              </div>
            ))}

            {/* Reset */}
            {onReset && (
              <div className="flex-shrink-0 space-y-1">
                <Label className="text-xs text-transparent select-none hidden lg:block">Reset</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setLocalSearch('');
                    onSearchChange('');
                    onReset();
                  }}
                  disabled={!localSearch && !hasActiveFilters}
                  className="h-10 px-3 whitespace-nowrap"
                >
                  <RotateCcw className="h-4 w-4 mr-1.5" />
                  Reset
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
