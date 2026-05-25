import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { PermissionWrapper } from '@/components/ui/permission-wrapper';
import { PermissionButton } from '@/components/ui/permission-button';
import { useUserCode } from '@/hooks/useUserCode';
import { toast } from 'sonner';
import { Pencil, Plus, Gavel, AlertCircle } from 'lucide-react';
import {
  listRules,
  upsertRule,
  toggleRule,
  type LegalHandoffRule,
  type IntegrationMode,
} from '@/services/legalHandoffService';
import { isComplianceFeatureEnabled } from '@/lib/compliance/featureToggles';

const PERMISSION = 'manage_compliance';
const MODES: IntegrationMode[] = ['DISABLED', 'MANUAL', 'INTEGRATED'];
const FUNDS = ['SS', 'ST', 'HC', 'EC'];
const SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const EVIDENCE_OPTIONS = [
  'NOTICES',
  'DELIVERY_PROOF',
  'CASE_SUMMARY',
  'PAYMENT_HISTORY',
  'INSPECTION_EVIDENCE',
  'EMPLOYER_RESPONSES',
];

function empty(): Partial<LegalHandoffRule> {
  return {
    code: '',
    name: '',
    description: '',
    enabled: true,
    integration_mode: 'MANUAL',
    required_notice_count: 1,
    days_after_final_notice: 14,
    min_outstanding_amount: 1000,
    min_severity: null,
    require_repeat_default: false,
    require_arrangement_breach: false,
    required_evidence: ['NOTICES', 'DELIVERY_PROOF'],
    employer_response_window_days: 14,
    applicable_funds: [],
    notes: '',
    sort_order: 0,
  };
}

export default function LegalHandoffRulesPage() {
  if (!isComplianceFeatureEnabled('admin.legalHandoffRules')) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <AlertCircle className="mx-auto h-8 w-8 mb-2" />
            Legal Handoff Rules are disabled. Enable from Administration → Feature Toggles.
          </CardContent>
        </Card>
      </div>
    );
  }
  return (
    <PermissionWrapper moduleName={PERMISSION}>
      <Inner />
    </PermissionWrapper>
  );
}

function Inner() {
  const qc = useQueryClient();
  const { userCode } = useUserCode();
  const [editor, setEditor] = useState<{ open: boolean; rule: Partial<LegalHandoffRule> | null }>({ open: false, rule: null });

  const { data: rules = [], isLoading } = useQuery({ queryKey: ['legal-handoff-rules'], queryFn: listRules });

  const saveMut = useMutation({
    mutationFn: (r: Partial<LegalHandoffRule>) => upsertRule(r as any, userCode || 'SYSTEM'),
    onSuccess: () => {
      toast.success('Rule saved');
      qc.invalidateQueries({ queryKey: ['legal-handoff-rules'] });
      setEditor({ open: false, rule: null });
    },
    onError: (e: any) => toast.error(e.message || 'Save failed'),
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) => toggleRule(id, enabled, userCode || 'SYSTEM'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['legal-handoff-rules'] }),
  });

  const startEdit = (r?: LegalHandoffRule) => setEditor({ open: true, rule: r ? { ...r } : empty() });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Gavel className="h-6 w-6 text-primary" />
            Legal Handoff Rules
          </h1>
          <p className="text-sm text-muted-foreground">
            Eligibility rules used to recommend cases for legal escalation. The first matching enabled rule applies.
          </p>
        </div>
        <PermissionButton moduleName={PERMISSION} actionName="manage" onClick={() => startEdit()}>
          <Plus className="h-4 w-4 mr-2" /> New Rule
        </PermissionButton>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configured Rules</CardTitle>
          <CardDescription>{rules.length} rule(s)</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading…</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Notices</TableHead>
                  <TableHead>Days After Final</TableHead>
                  <TableHead>Min Amount</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Enabled</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.code}</TableCell>
                    <TableCell>{r.name}</TableCell>
                    <TableCell><Badge variant="outline">{r.integration_mode}</Badge></TableCell>
                    <TableCell>{r.required_notice_count}</TableCell>
                    <TableCell>{r.days_after_final_notice}</TableCell>
                    <TableCell>${Number(r.min_outstanding_amount).toLocaleString()}</TableCell>
                    <TableCell>{r.min_severity || '—'}</TableCell>
                    <TableCell>
                      <Switch
                        checked={r.enabled}
                        onCheckedChange={(v) => toggleMut.mutate({ id: r.id, enabled: v })}
                      />
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => startEdit(r)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {rules.length === 0 && (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No rules configured</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={editor.open} onOpenChange={(o) => !o && setEditor({ open: false, rule: null })}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editor.rule?.id ? 'Edit Rule' : 'New Rule'}</DialogTitle>
            <DialogDescription>Configure eligibility thresholds and integration mode.</DialogDescription>
          </DialogHeader>
          {editor.rule && (
            <div className="grid grid-cols-2 gap-4">
              <Field label="Code">
                <Input value={editor.rule.code || ''}
                  onChange={(e) => setEditor((s) => ({ ...s, rule: { ...s.rule!, code: e.target.value } }))} />
              </Field>
              <Field label="Name">
                <Input value={editor.rule.name || ''}
                  onChange={(e) => setEditor((s) => ({ ...s, rule: { ...s.rule!, name: e.target.value } }))} />
              </Field>
              <Field label="Description" full>
                <Textarea value={editor.rule.description || ''}
                  onChange={(e) => setEditor((s) => ({ ...s, rule: { ...s.rule!, description: e.target.value } }))} />
              </Field>
              <Field label="Integration Mode">
                <Select value={editor.rule.integration_mode}
                  onValueChange={(v) => setEditor((s) => ({ ...s, rule: { ...s.rule!, integration_mode: v as IntegrationMode } }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MODES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Min Severity">
                <Select value={editor.rule.min_severity || 'none'}
                  onValueChange={(v) => setEditor((s) => ({ ...s, rule: { ...s.rule!, min_severity: v === 'none' ? null : v } }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Any</SelectItem>
                    {SEVERITIES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Required Notice Count">
                <Input type="number" value={editor.rule.required_notice_count ?? 0}
                  onChange={(e) => setEditor((s) => ({ ...s, rule: { ...s.rule!, required_notice_count: Number(e.target.value) } }))} />
              </Field>
              <Field label="Days After Final Notice">
                <Input type="number" value={editor.rule.days_after_final_notice ?? 0}
                  onChange={(e) => setEditor((s) => ({ ...s, rule: { ...s.rule!, days_after_final_notice: Number(e.target.value) } }))} />
              </Field>
              <Field label="Min Outstanding Amount">
                <Input type="number" value={editor.rule.min_outstanding_amount ?? 0}
                  onChange={(e) => setEditor((s) => ({ ...s, rule: { ...s.rule!, min_outstanding_amount: Number(e.target.value) } }))} />
              </Field>
              <Field label="Employer Response Window (days)">
                <Input type="number" value={editor.rule.employer_response_window_days ?? 0}
                  onChange={(e) => setEditor((s) => ({ ...s, rule: { ...s.rule!, employer_response_window_days: Number(e.target.value) } }))} />
              </Field>
              <Field label="Require Repeat Default">
                <Switch checked={!!editor.rule.require_repeat_default}
                  onCheckedChange={(v) => setEditor((s) => ({ ...s, rule: { ...s.rule!, require_repeat_default: v } }))} />
              </Field>
              <Field label="Require Arrangement Breach">
                <Switch checked={!!editor.rule.require_arrangement_breach}
                  onCheckedChange={(v) => setEditor((s) => ({ ...s, rule: { ...s.rule!, require_arrangement_breach: v } }))} />
              </Field>
              <Field label="Applicable Funds (comma-separated)" full>
                <Input value={(editor.rule.applicable_funds || []).join(',')}
                  placeholder={FUNDS.join(',')}
                  onChange={(e) => setEditor((s) => ({ ...s, rule: { ...s.rule!, applicable_funds: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) } }))} />
              </Field>
              <Field label="Required Evidence (comma-separated)" full>
                <Input value={(editor.rule.required_evidence || []).join(',')}
                  placeholder={EVIDENCE_OPTIONS.join(',')}
                  onChange={(e) => setEditor((s) => ({ ...s, rule: { ...s.rule!, required_evidence: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) } }))} />
              </Field>
              <Field label="Enabled">
                <Switch checked={!!editor.rule.enabled}
                  onCheckedChange={(v) => setEditor((s) => ({ ...s, rule: { ...s.rule!, enabled: v } }))} />
              </Field>
              <Field label="Sort Order">
                <Input type="number" value={editor.rule.sort_order ?? 0}
                  onChange={(e) => setEditor((s) => ({ ...s, rule: { ...s.rule!, sort_order: Number(e.target.value) } }))} />
              </Field>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditor({ open: false, rule: null })}>Cancel</Button>
            <PermissionButton moduleName={PERMISSION} actionName="manage" action={editor.rule?.id ? 'edit' : 'create'}
              onClick={() => editor.rule && saveMut.mutate(editor.rule)} disabled={saveMut.isPending}>
              Save
            </PermissionButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? 'col-span-2 space-y-1' : 'space-y-1'}>
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
