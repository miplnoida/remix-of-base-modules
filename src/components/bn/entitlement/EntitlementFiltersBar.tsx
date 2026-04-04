import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, X, Filter } from 'lucide-react';
import { ENTITLEMENT_STATUS_LABELS } from '@/services/bn/entitlementService';
import type { EntitlementFilters } from '@/services/bn/entitlementService';

interface Props {
  filters: EntitlementFilters;
  onChange: (filters: EntitlementFilters) => void;
  totalCount: number;
}

export const EntitlementFiltersBar: React.FC<Props> = ({ filters, onChange, totalCount }) => {
  const [searchValue, setSearchValue] = useState(filters.search || '');

  const handleSearchSubmit = () => onChange({ ...filters, search: searchValue || undefined });
  const clearFilters = () => { setSearchValue(''); onChange({}); };

  const activeCount = [filters.status?.length, filters.search].filter(Boolean).length;

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Entitlement Filters</span>
          {activeCount > 0 && <Badge variant="secondary" className="text-xs">{activeCount} active</Badge>}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{totalCount} entitlements</span>
          {activeCount > 0 && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-3 w-3 mr-1" /> Clear
            </Button>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-1.5">
          <Input
            placeholder="Search SSN or claim #..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit()}
            className="w-48 h-8 text-sm"
          />
          <Button variant="outline" size="sm" onClick={handleSearchSubmit} className="h-8 px-2">
            <Search className="h-3.5 w-3.5" />
          </Button>
        </div>
        <Select
          value={filters.status?.[0] || 'ALL'}
          onValueChange={(v) => onChange({ ...filters, status: v === 'ALL' ? undefined : [v] })}
        >
          <SelectTrigger className="w-36 h-8 text-sm">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            {Object.entries(ENTITLEMENT_STATUS_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
