/**
 * NewCaseDialog — manual case creation from CaseManagement.
 * Lets a compliance officer search an employer and open a new compliance case.
 *
 * Replaces the old "New Case" button behavior, which navigated to Intake
 * (a list of unassigned cases) rather than creating one.
 */
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { useUserCode } from '@/hooks/useUserCode';
import { useDebounce } from '@/hooks/useDebounce';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

interface EmployerRow {
  employer_id: string;
  employer_name: string | null;
  territory: string | null;
}

const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
const FUNDS = ['SS', 'HSC', 'BOTH'];
const CASE_TYPES = ['MANUAL', 'ESCALATION', 'INSPECTION', 'COMPLAINT'];

function generateCaseNumber(): string {
  const year = new Date().getFullYear();
  const hex = Math.random().toString(16).substring(2, 6).toUpperCase();
  return `CASE-${year}-${hex}`;
}

export const NewCaseDialog = ({ open, onOpenChange }: Props) => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { userCode } = useUserCode();

  const [employerSearch, setEmployerSearch] = useState('');
  const debounced = useDebounce(employerSearch, 300);
  const [employer, setEmployer] = useState<EmployerRow | null>(null);
  const [priority, setPriority] = useState('Medium');
  const [fundType, setFundType] = useState('SS');
  const [caseType, setCaseType] = useState('MANUAL');
  const [summary, setSummary] = useState('');

  useEffect(() => {
    if (!open) {
      setEmployerSearch(''); setEmployer(null);
      setPriority('Medium'); setFundType('SS'); setCaseType('MANUAL'); setSummary('');
    }
  }, [open]);

  const employersQ = useQuery({
    queryKey: ['new-case-employer-search', debounced],
    enabled: open && debounced.trim().length >= 2 && !employer,
    queryFn: async () => {
      const q = debounced.trim();
      const { data, error } = await (supabase.from('ce_employer_profile_view') as any)
        .select('employer_id, employer_name, territory')
        .or(`employer_name.ilike.%${q}%,employer_id.ilike.%${q}%`)
        .limit(15);
      if (error) throw error;
      return (data ?? []) as EmployerRow[];
    },
  });

  const createMut = useMutation({
    mutationFn: async () => {
      if (!employer) throw new Error('Please select an employer.');
      if (!summary.trim()) throw new Error('Please enter a case summary.');
      const now = new Date().toISOString();
      const caseNumber = generateCaseNumber();
      const { data, error } = await (supabase.from('ce_cases') as any)
        .insert({
          case_number: caseNumber,
          employer_id: employer.employer_id,
          employer_name: employer.employer_name,
          territory: employer.territory,
          status: 'OPEN',
          priority,
          case_type: caseType,
          fund_type: fundType,
          summary: summary.trim(),
          total_amount: 0,
          opened_date: now.slice(0, 10),
          created_by: userCode || 'UNKNOWN',
          updated_by: userCode || 'UNKNOWN',
          created_at: now,
          updated_at: now,
        })
        .select('id, case_number')
        .single();
      if (error) throw error;
      // Best-effort history row; do not block on failure.
      try {
        await (supabase.from('ce_case_history') as any).insert({
          case_id: (data as any).id,
          action: 'Case Created',
          from_status: null,
          to_status: 'OPEN',
          notes: 'Manually created from Case Management',
          performed_by: userCode || 'UNKNOWN',
          performed_at: now,
        });
      } catch { /* shielded */ }
      return data as { id: string; case_number: string };
    },
    onSuccess: (row) => {
      toast.success(`Case ${row.case_number} created`);
      qc.invalidateQueries({ queryKey: ['ce_cases'] });
      onOpenChange(false);
      navigate(`/compliance/cases/${row.id}`);
    },
    onError: (e: any) =>
      toast.error(e?.message || 'Failed to create case', {
        style: { backgroundColor: 'hsl(var(--destructive))', color: 'white' } as React.CSSProperties,
        classNames: { toast: '!bg-destructive', title: '!text-white', description: '!text-white !opacity-100' },
      }),
  });

  const employerList = useMemo(() => employersQ.data ?? [], [employersQ.data]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>New Compliance Case</DialogTitle>
          <DialogDescription>
            Open a new case against an employer. The case will appear in the Case Management list and
            in Intake until an officer is assigned.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="text-xs">Employer</Label>
            {employer ? (
              <div className="flex items-center justify-between rounded-md border p-2 text-sm">
                <div>
                  <div className="font-medium">{employer.employer_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {employer.employer_id} {employer.territory ? `· ${employer.territory}` : ''}
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setEmployer(null)}>Change</Button>
              </div>
            ) : (
              <>
                <Input
                  placeholder="Search by employer name or number (min 2 chars)"
                  value={employerSearch}
                  onChange={(e) => setEmployerSearch(e.target.value)}
                />
                {employersQ.isLoading && (
                  <div className="text-xs text-muted-foreground py-2 flex items-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin" /> Searching…
                  </div>
                )}
                {!employersQ.isLoading && debounced.trim().length >= 2 && employerList.length === 0 && (
                  <div className="text-xs text-muted-foreground py-2">No employers found.</div>
                )}
                {employerList.length > 0 && (
                  <div className="mt-1 max-h-48 overflow-auto rounded border divide-y">
                    {employerList.map((e) => (
                      <button
                        type="button"
                        key={e.employer_id}
                        className="w-full text-left p-2 text-sm hover:bg-muted"
                        onClick={() => setEmployer(e)}
                      >
                        <div className="font-medium">{e.employer_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {e.employer_id} {e.territory ? `· ${e.territory}` : ''}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Fund</Label>
              <Select value={fundType} onValueChange={setFundType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FUNDS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Case Type</Label>
              <Select value={caseType} onValueChange={setCaseType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CASE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs">Summary</Label>
            <Textarea
              rows={3}
              placeholder="Reason for opening this case…"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            disabled={!employer || !summary.trim() || createMut.isPending}
            onClick={() => createMut.mutate()}
          >
            {createMut.isPending ? 'Creating…' : 'Create Case'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
