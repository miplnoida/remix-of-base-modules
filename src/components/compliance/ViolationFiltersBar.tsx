import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';

export interface ViolationFilterState {
  search: string;
  status: string;
  priority: string;
  fund: string;
  violationTypeId: string;
  severity: string;
  source: string;
  assignedOfficer: string;
  month: string;
}

export const VIOLATION_STATUSES = ['OPEN', 'UNDER_REVIEW', 'IN_PROGRESS', 'ESCALATED', 'RESOLVED', 'CLOSED', 'CANCELLED'];
export const VIOLATION_PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];
export const VIOLATION_SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
export const VIOLATION_SOURCES = ['MANUAL', 'DETECTION_RULE', 'MANUAL_PENALTY', 'INSPECTION'];

interface Props {
  value: ViolationFilterState;
  onChange: (next: ViolationFilterState) => void;
  showSource?: boolean;
}

export function useViolationTypeOptions() {
  return useQuery({
    queryKey: ['ce_violation_types_active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ce_violation_types')
        .select('id, code, name, category, applicable_funds, severity_default')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });
}

export function useOfficerOptions() {
  return useQuery({
    queryKey: ['ce_officer_options'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ce_inspectors')
        .select('id, inspector_code, full_name, user_code')
        .order('full_name', { ascending: true })
        .limit(500);
      if (error) return [];
      return data ?? [];
    },
    staleTime: 60_000,
  });
}

export function ViolationFiltersBar({ value, onChange, showSource = true }: Props) {
  const { data: types = [] } = useViolationTypeOptions();
  const { data: officers = [] } = useOfficerOptions();
  const set = (patch: Partial<ViolationFilterState>) => onChange({ ...value, ...patch });

  return (
    <div className="grid gap-3 md:grid-cols-4 lg:grid-cols-5">
      <div className="relative md:col-span-2 lg:col-span-2">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search violation #, employer, summary..."
          value={value.search}
          onChange={(e) => set({ search: e.target.value })}
          className="pl-9"
        />
      </div>
      <Select value={value.status} onValueChange={(v) => set({ status: v })}>
        <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All Statuses</SelectItem>
          {VIOLATION_STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={value.priority} onValueChange={(v) => set({ priority: v })}>
        <SelectTrigger><SelectValue placeholder="Priority" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All Priorities</SelectItem>
          {VIOLATION_PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={value.severity} onValueChange={(v) => set({ severity: v })}>
        <SelectTrigger><SelectValue placeholder="Severity" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All Severities</SelectItem>
          {VIOLATION_SEVERITIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={value.fund} onValueChange={(v) => set({ fund: v })}>
        <SelectTrigger><SelectValue placeholder="Fund" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All Funds</SelectItem>
          <SelectItem value="SS">Social Security</SelectItem>
          <SelectItem value="LV">Levy</SelectItem>
          <SelectItem value="EI">Employment Injury</SelectItem>
          <SelectItem value="SV">Severance</SelectItem>
          <SelectItem value="PE">Pension</SelectItem>
        </SelectContent>
      </Select>
      <Select value={value.violationTypeId} onValueChange={(v) => set({ violationTypeId: v })}>
        <SelectTrigger><SelectValue placeholder="Violation Type" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All Types</SelectItem>
          {types.map((t: any) => (
            <SelectItem key={t.id} value={t.id}>{t.code} — {t.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={value.assignedOfficer} onValueChange={(v) => set({ assignedOfficer: v })}>
        <SelectTrigger><SelectValue placeholder="Assigned Officer" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All Officers</SelectItem>
          <SelectItem value="UNASSIGNED">Unassigned</SelectItem>
          {officers.map((o: any) => (
            <SelectItem key={o.id} value={o.user_code || o.id}>
              {o.full_name || o.inspector_code}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {showSource && (
        <Select value={value.source} onValueChange={(v) => set({ source: v })}>
          <SelectTrigger><SelectValue placeholder="Source" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Sources</SelectItem>
            {VIOLATION_SOURCES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>)}
          </SelectContent>
        </Select>
      )}
      <Input
        type="month"
        value={value.month}
        onChange={(e) => set({ month: e.target.value })}
        placeholder="Period"
      />
    </div>
  );
}

export const emptyViolationFilterState: ViolationFilterState = {
  search: '',
  status: 'ALL',
  priority: 'ALL',
  fund: 'ALL',
  violationTypeId: 'ALL',
  severity: 'ALL',
  source: 'ALL',
  assignedOfficer: 'ALL',
  month: '',
};
