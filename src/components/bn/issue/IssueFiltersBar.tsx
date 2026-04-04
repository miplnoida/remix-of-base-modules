import React from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { X, Search } from 'lucide-react';
import type { IssueFilters } from '@/services/bn/paymentIssueService';

const STATUSES = ['PENDING', 'ISSUING', 'ISSUED', 'FAILED', 'VOIDED', 'REISSUE_PENDING', 'STALE_DATED', 'STOPPED'];
const METHODS = ['CHEQUE', 'DIRECT_DEPOSIT'];
const TARGETS = [
  { value: 'cl_cheques', label: 'Standard' },
  { value: 'cl_cheques_holding', label: 'Holding' },
  { value: 'cl_cheques_survivor', label: 'Survivor' },
];

interface Props {
  filters: IssueFilters;
  onChange: (f: IssueFilters) => void;
}

export const IssueFiltersBar: React.FC<Props> = ({ filters, onChange }) => {
  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search SSN / Claim / Cheque..."
          value={filters.search || ''}
          onChange={(e) => onChange({ ...filters, search: e.target.value || undefined })}
          className="pl-8 w-56"
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
        value={filters.issue_method || '__all'}
        onValueChange={(v) => onChange({ ...filters, issue_method: v === '__all' ? undefined : v as any })}
      >
        <SelectTrigger className="w-40"><SelectValue placeholder="Method" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="__all">All Methods</SelectItem>
          {METHODS.map(m => <SelectItem key={m} value={m}>{m.replace(/_/g, ' ')}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select
        value={filters.target_table || '__all'}
        onValueChange={(v) => onChange({ ...filters, target_table: v === '__all' ? undefined : v as any })}
      >
        <SelectTrigger className="w-40"><SelectValue placeholder="Target" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="__all">All Targets</SelectItem>
          {TARGETS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
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
