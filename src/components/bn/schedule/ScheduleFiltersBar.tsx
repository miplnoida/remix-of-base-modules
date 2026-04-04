/**
 * Schedule Filters Bar
 */
import React from 'react';
import { BnFilterBar, type FilterConfig } from '@/components/bn/shared';
import { SCHEDULE_STATUS_LABELS, type ScheduleFilters } from '@/services/bn/scheduleService';
import { Badge } from '@/components/ui/badge';

interface Props {
  filters: ScheduleFilters;
  onChange: (f: ScheduleFilters) => void;
  totalCount: number;
}

export const ScheduleFiltersBar: React.FC<Props> = ({ filters, onChange, totalCount }) => {
  const statusFilter: FilterConfig = {
    key: 'status',
    label: 'Status',
    options: Object.entries(SCHEDULE_STATUS_LABELS).map(([value, label]) => ({ value, label })),
    value: filters.status?.[0] ?? '',
    onChange: (v) => onChange({ ...filters, status: v ? [v] : undefined }),
  };

  const freqFilter: FilterConfig = {
    key: 'frequency',
    label: 'Frequency',
    options: [
      { value: 'WEEKLY', label: 'Weekly' },
      { value: 'FORTNIGHTLY', label: 'Fortnightly' },
      { value: 'MONTHLY', label: 'Monthly' },
      { value: 'ONE_TIME', label: 'One-Time' },
    ],
    value: filters.frequency ?? '',
    onChange: (v) => onChange({ ...filters, frequency: v || undefined }),
  };

  return (
    <BnFilterBar
      search={filters.search ?? ''}
      onSearchChange={(s) => onChange({ ...filters, search: s || undefined })}
      searchPlaceholder="Search SSN, claim number..."
      filters={[statusFilter, freqFilter]}
      onClearAll={() => onChange({})}
      actions={
        <Badge variant="secondary" className="text-xs">
          {totalCount} row{totalCount !== 1 ? 's' : ''}
        </Badge>
      }
    />
  );
};
