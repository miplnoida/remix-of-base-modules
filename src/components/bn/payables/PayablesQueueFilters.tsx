/**
 * Payables Queue Filters
 */
import React from 'react';
import { BnFilterBar, type FilterConfig } from '@/components/bn/shared';
import { PAYABLE_STATUS_LABELS, type PayableFilters } from '@/services/bn/payablesQueueService';
import { Badge } from '@/components/ui/badge';

interface Props {
  filters: PayableFilters;
  onChange: (f: PayableFilters) => void;
  totalCount: number;
}

export const PayablesQueueFilters: React.FC<Props> = ({ filters, onChange, totalCount }) => {
  const statusFilter: FilterConfig = {
    key: 'status',
    label: 'Status',
    options: Object.entries(PAYABLE_STATUS_LABELS).map(([value, label]) => ({ value, label })),
    value: filters.status?.[0] ?? '',
    onChange: (v) => onChange({ ...filters, status: v ? [v] : undefined }),
  };

  const typeFilter: FilterConfig = {
    key: 'instructionType',
    label: 'Type',
    options: [
      { value: 'PERIODIC', label: 'Periodic' },
      { value: 'LUMP_SUM', label: 'Lump Sum' },
      { value: 'ARREARS', label: 'Arrears' },
      { value: 'ADJUSTMENT', label: 'Adjustment' },
      { value: 'FINAL', label: 'Final' },
    ],
    value: filters.instructionType ?? '',
    onChange: (v) => onChange({ ...filters, instructionType: v || undefined }),
  };

  return (
    <BnFilterBar
      search={filters.search ?? ''}
      onSearchChange={(s) => onChange({ ...filters, search: s || undefined })}
      searchPlaceholder="Search SSN, claim number, payee..."
      filters={[statusFilter, typeFilter]}
      onClearAll={() => onChange({})}
      actions={
        <Badge variant="secondary" className="text-xs">
          {totalCount} record{totalCount !== 1 ? 's' : ''}
        </Badge>
      }
    />
  );
};
