import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, X, Filter } from 'lucide-react';
import { BN_CATEGORY_LABELS } from '@/types/bn';
import type { ApprovalFilters } from '@/services/bn/approvalConsoleService';

interface Props {
  filters: ApprovalFilters;
  onChange: (filters: ApprovalFilters) => void;
  totalCount: number;
}

const STATUS_OPTIONS = [
  { value: 'DECISION', label: 'Decision' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'PENDING_INFO', label: 'Pending Info' },
];

const PRIORITY_OPTIONS = [
  { value: 'URGENT', label: 'Urgent' },
  { value: 'HIGH', label: 'High' },
  { value: 'NORMAL', label: 'Normal' },
  { value: 'LOW', label: 'Low' },
];

export const ApprovalQueueFilters: React.FC<Props> = ({ filters, onChange, totalCount }) => {
  const [searchValue, setSearchValue] = useState(filters.search || '');

  const handleSearchSubmit = () => {
    onChange({ ...filters, search: searchValue || undefined });
  };

  const clearFilters = () => {
    setSearchValue('');
    onChange({});
  };

  const activeFilterCount = [
    filters.status?.length,
    filters.priority?.length,
    filters.benefitCategory,
    filters.search,
  ].filter(Boolean).length;

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Queue Filters</span>
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="text-xs">{activeFilterCount} active</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{totalCount} cases</span>
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-3 w-3 mr-1" /> Clear
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        {/* Search */}
        <div className="flex items-center gap-1.5">
          <Input
            placeholder="Search claim # or SSN..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit()}
            className="w-48 h-8 text-sm"
          />
          <Button variant="outline" size="sm" onClick={handleSearchSubmit} className="h-8 px-2">
            <Search className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Status */}
        <Select
          value={filters.status?.[0] || 'ALL'}
          onValueChange={(v) => onChange({ ...filters, status: v === 'ALL' ? undefined : [v] })}
        >
          <SelectTrigger className="w-36 h-8 text-sm">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Priority */}
        <Select
          value={filters.priority?.[0] || 'ALL'}
          onValueChange={(v) => onChange({ ...filters, priority: v === 'ALL' ? undefined : [v] })}
        >
          <SelectTrigger className="w-32 h-8 text-sm">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Priorities</SelectItem>
            {PRIORITY_OPTIONS.map((p) => (
              <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Benefit Category */}
        <Select
          value={filters.benefitCategory || 'ALL'}
          onValueChange={(v) => onChange({ ...filters, benefitCategory: v === 'ALL' ? undefined : v })}
        >
          <SelectTrigger className="w-40 h-8 text-sm">
            <SelectValue placeholder="Benefit Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Types</SelectItem>
            {Object.entries(BN_CATEGORY_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
