import React from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { X, Search } from 'lucide-react';
import type { BatchFilters } from '@/services/bn/batchOperationsService';

interface Props {
  filters: BatchFilters;
  onChange: (f: BatchFilters) => void;
}

const STATUSES = ['OPEN', 'VALIDATED', 'APPROVED', 'RELEASED', 'ISSUED', 'PARTIALLY_ISSUED', 'CANCELLED', 'REOPENED'];
const METHODS = ['CHEQUE', 'DIRECT_DEPOSIT', 'MIXED'];

export const BatchFiltersBar: React.FC<Props> = ({ filters, onChange }) => {
  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search batch #..."
          value={filters.search || ''}
          onChange={(e) => onChange({ ...filters, search: e.target.value || undefined })}
          className="pl-8 w-48"
        />
      </div>

      <Select
        value={filters.status || '__all'}
        onValueChange={(v) => onChange({ ...filters, status: v === '__all' ? undefined : v as any })}
      >
        <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="__all">All Statuses</SelectItem>
          {STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select
        value={filters.payment_method || '__all'}
        onValueChange={(v) => onChange({ ...filters, payment_method: v === '__all' ? undefined : v as any })}
      >
        <SelectTrigger className="w-40"><SelectValue placeholder="Method" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="__all">All Methods</SelectItem>
          {METHODS.map(m => <SelectItem key={m} value={m}>{m.replace(/_/g, ' ')}</SelectItem>)}
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={() => onChange({})} className="gap-1 text-xs">
          <X className="h-3.5 w-3.5" /> Clear
        </Button>
      )}
    </div>
  );
};
