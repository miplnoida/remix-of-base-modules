import React from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { X, Search } from 'lucide-react';
import type { PostIssueFilters } from '@/services/bn/postIssueService';

const STATUSES = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'SKIPPED', 'DEFERRED', 'CANCELLED'];
const TASK_TYPES = [
  { value: 'CL_HEAD_UPDATE', label: 'Claim Header' },
  { value: 'CLAIM_CLOSURE', label: 'Claim Closure' },
  { value: 'CLAIM_CONTINUATION', label: 'Continuation' },
  { value: 'WAGES_CREDITED', label: 'Wages Credited' },
  { value: 'POSTAL_REG_UPDATE', label: 'Postal Reg' },
  { value: 'PENSION_SUPPORT', label: 'Pension Support' },
  { value: 'SURVIVOR_FOLLOWUP', label: 'Survivor' },
  { value: 'HOLDING_FOLLOWUP', label: 'Holding' },
  { value: 'ENTITLEMENT_UPDATE', label: 'Entitlement' },
  { value: 'INSTRUCTION_FINALIZE', label: 'Finalize' },
  { value: 'BATCH_COMPLETION_CHECK', label: 'Batch Check' },
  { value: 'AUDIT_COMPLETION', label: 'Audit' },
];

interface Props {
  filters: PostIssueFilters;
  onChange: (f: PostIssueFilters) => void;
}

export const PostIssueFiltersBar: React.FC<Props> = ({ filters, onChange }) => {
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
        <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="__all">All Statuses</SelectItem>
          {STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select
        value={filters.task_type || '__all'}
        onValueChange={(v) => onChange({ ...filters, task_type: v === '__all' ? undefined : v as any })}
      >
        <SelectTrigger className="w-44"><SelectValue placeholder="Task Type" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="__all">All Types</SelectItem>
          {TASK_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select
        value={filters.is_required === undefined ? '__all' : filters.is_required ? 'true' : 'false'}
        onValueChange={(v) => onChange({
          ...filters,
          is_required: v === '__all' ? undefined : v === 'true',
        })}
      >
        <SelectTrigger className="w-32"><SelectValue placeholder="Required" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="__all">All</SelectItem>
          <SelectItem value="true">Required</SelectItem>
          <SelectItem value="false">Optional</SelectItem>
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
