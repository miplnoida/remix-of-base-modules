/**
 * Convert Finding To Violation
 *
 * Lists inspection findings that have NOT yet been converted to a violation
 * and lets a permitted user convert them. The conversion:
 *
 * - Uses a configured violation type from `ce_violation_types`.
 * - Creates a `ce_violations` row linked back to the inspection.
 * - Copies finding evidence (`ce_inspection_evidence` rows) onto the new
 *   violation by setting their `finding_id` (and keeping the inspection link).
 * - Marks the finding as converted and stores the violation id.
 * - Sends to Verification Queue (status PENDING_VERIFICATION) when feature
 *   `violations.verificationQueue` is on; otherwise creates a confirmed
 *   violation (status OPEN).
 */
import { useMemo, useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PermissionWrapper } from '@/components/ui/permission-wrapper';
import { PermissionButton } from '@/components/ui/permission-button';
import { ArrowRightLeft, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useUserCode } from '@/hooks/useUserCode';
import { isComplianceFeatureEnabled } from '@/lib/compliance/featureToggles';

const PERMISSION = 'manage_compliance';

export default function ConvertFindingToViolationPage() {
  if (
    !isComplianceFeatureEnabled('inspections.convertFinding') ||
    !isComplianceFeatureEnabled('inspections')
  ) {
    return (
      <div className="container mx-auto p-6">
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <AlertCircle className="mx-auto h-8 w-8 mb-2" />
          Convert Finding To Violation is disabled.
        </CardContent></Card>
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
  const [search, setSearch] = useState('');
  const [target, setTarget] = useState<any | null>(null);

  const findingsQ = useQuery({
    queryKey: ['unconverted-findings'],
    queryFn: async () => {
      // NOTE: `fund_type` lives on ce_violations, NOT ce_inspections — including it in
      // the embedded select previously caused PostgREST to error and return zero rows.
      // Also treat NULL violation_created as "not converted".
      const { data, error } = await (supabase.from('ce_inspection_findings') as any)
        .select(
          'id, title, description, finding_type, category, severity, recommended_action, created_at, ' +
            'violation_created, violation_id, inspection_id, ' +
            'ce_inspections(inspection_number, employer_id, employer_name, territory)',
        )
        .or('violation_created.is.null,violation_created.eq.false')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) {
        toast.error(error.message || 'Failed to load findings');
        throw error;
      }
      return data ?? [];
    },
  });

  const violationTypesQ = useQuery({
    queryKey: ['violation-types-active'],
    queryFn: async () => {
      const { data } = await supabase
        .from('ce_violation_types')
        .select('id, code, name, category, default_severity')
        .eq('is_active', true)
        .order('name');
      return data ?? [];
    },
  });

  const convert = useMutation({
    mutationFn: async (args: {
      finding: any;
      violationTypeId: string;
      summary: string;
      severity: string;
      principalAmount: number;
      duplicateJustification?: string | null;
      duplicateOfViolationId?: string | null;
    }) => convertFinding({ ...args, userCode: userCode || 'SYSTEM' }),
    onSuccess: (newId: string) => {
      const usingQueue = isComplianceFeatureEnabled('violations.verificationQueue');
      toast.success(
        usingQueue
          ? 'Violation created and sent to Verification Queue'
          : 'Confirmed violation created',
      );
      qc.invalidateQueries({ queryKey: ['unconverted-findings'] });
      setTarget(null);
    },
    onError: (e: any) => toast.error(e.message || 'Conversion failed'),
  });

  const rows = useMemo(() => {
    const all = (findingsQ.data ?? []) as any[];
    if (!search.trim()) return all;
    const s = search.toLowerCase();
    return all.filter(
      (r) =>
        r.title?.toLowerCase().includes(s) ||
        r.description?.toLowerCase().includes(s) ||
        r.ce_inspections?.employer_name?.toLowerCase().includes(s) ||
        r.ce_inspections?.inspection_number?.toLowerCase().includes(s),
    );
  }, [findingsQ.data, search]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <ArrowRightLeft className="h-6 w-6" /> Convert Finding To Violation
        </h1>
        <p className="text-muted-foreground text-sm">
          Promote unconverted inspection findings into violations using configured violation types.
          Evidence stays linked to the originating finding and inspection.
        </p>
      </div>

      <div className="max-w-md">
        <Label className="text-xs">Search</Label>
        <Input
          placeholder="Title, employer, inspection #"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Unconverted Findings</CardTitle>
          <CardDescription>{rows.length} record(s)</CardDescription>
        </CardHeader>
        <CardContent>
          {findingsQ.isLoading ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No findings awaiting conversion.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Finding</TableHead>
                  <TableHead>Type / Severity</TableHead>
                  <TableHead>Inspection</TableHead>
                  <TableHead>Employer</TableHead>
                  <TableHead>Recommended</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell>
                      <div className="font-medium">{f.title || '(no title)'}</div>
                      <div className="text-xs text-muted-foreground line-clamp-1">{f.description}</div>
                    </TableCell>
                    <TableCell>
                      <div><Badge variant="outline">{f.finding_type ?? '—'}</Badge></div>
                      <div className="text-xs mt-1">
                        <Badge variant="secondary">{f.severity ?? 'Medium'}</Badge>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {f.ce_inspections?.inspection_number ?? '—'}
                    </TableCell>
                    <TableCell className="text-xs">
                      {f.ce_inspections?.employer_name ?? f.ce_inspections?.employer_id ?? '—'}
                    </TableCell>
                    <TableCell className="text-xs max-w-[220px]">
                      <span className="line-clamp-2">{f.recommended_action ?? '—'}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <PermissionButton
                        moduleName={PERMISSION}
                        actionName="create"
                        size="sm"
                        onClick={() => setTarget(f)}
                      >
                        Convert
                      </PermissionButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {target && (
        <ConvertDialog
          finding={target}
          violationTypes={violationTypesQ.data ?? []}
          onClose={() => setTarget(null)}
          onSubmit={(payload) =>
            convert.mutate({
              finding: target,
              violationTypeId: payload.violationTypeId,
              summary: payload.summary,
              severity: payload.severity,
              principalAmount: payload.principalAmount,
              duplicateJustification: payload.duplicateJustification,
              duplicateOfViolationId: payload.duplicateOfViolationId,
            })
          }
          busy={convert.isPending}
        />
      )}
    </div>
  );
}

function ConvertDialog({
  finding, violationTypes, onClose, onSubmit, busy,
}: {
  finding: any;
  violationTypes: any[];
  onClose: () => void;
  onSubmit: (p: {
    violationTypeId: string;
    summary: string;
    severity: string;
    principalAmount: number;
    duplicateJustification?: string | null;
    duplicateOfViolationId?: string | null;
  }) => void;
  busy: boolean;
}) {
  const [violationTypeId, setViolationTypeId] = useState<string>('');
  const [summary, setSummary] = useState<string>(finding.title || finding.description?.slice(0, 200) || '');
  const [severity, setSeverity] = useState<string>(finding.severity || 'Medium');
  const [principalAmount, setPrincipalAmount] = useState<number>(0);
  const [duplicateJustification, setDuplicateJustification] = useState<string>('');
  const usingQueue = isComplianceFeatureEnabled('violations.verificationQueue');

  const employerId = finding?.ce_inspections?.employer_id ?? null;

  // Look for an existing open violation of the same type for the same employer.
  const duplicateQ = useQuery({
    queryKey: ['violation-duplicate-check', employerId, violationTypeId],
    enabled: !!employerId && !!violationTypeId,
    queryFn: async () => {
      const { data, error } = await (supabase.from('ce_violations') as any)
        .select('id, violation_number, status, created_at')
        .eq('employer_id', employerId)
        .eq('violation_type_id', violationTypeId)
        .in('status', ['OPEN', 'PENDING_VERIFICATION', 'UNDER_REVIEW'])
        .order('created_at', { ascending: false })
        .limit(1);
      if (error) throw error;
      return (data ?? [])[0] ?? null;
    },
  });

  const duplicate = duplicateQ.data as { id: string; violation_number: string; status: string } | null | undefined;
  const justificationRequired = !!duplicate;
  const justificationOk = !justificationRequired || duplicateJustification.trim().length >= 10;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Convert Finding → Violation</DialogTitle>
          <DialogDescription>
            {usingQueue
              ? 'Will be sent to the Verification Queue for confirmation.'
              : 'Will be created as a confirmed violation (Verification Queue disabled).'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Violation Type</Label>
            <Select value={violationTypeId} onValueChange={setViolationTypeId}>
              <SelectTrigger><SelectValue placeholder="Select a configured type" /></SelectTrigger>
              <SelectContent>
                {violationTypes.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.code} · {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {duplicate && (
            <div className="rounded-md border border-amber-400 bg-amber-50 p-3 text-sm text-amber-900 space-y-2">
              <div className="font-medium">
                Possible duplicate detected
              </div>
              <div className="text-xs">
                An active violation already exists for this employer and violation type:{' '}
                <span className="font-mono">{duplicate.violation_number}</span> ({duplicate.status}).
                You may proceed, but please record why a new violation is justified.
              </div>
              <div>
                <Label className="text-xs">Justification (required, min 10 chars)</Label>
                <Textarea
                  rows={2}
                  value={duplicateJustification}
                  onChange={(e) => setDuplicateJustification(e.target.value)}
                  placeholder="e.g. New offence period, different fund, repeat violation after remediation…"
                />
              </div>
            </div>
          )}

          <div>
            <Label className="text-xs">Summary</Label>
            <Textarea rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Severity</Label>
              <Select value={severity} onValueChange={setSeverity}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['Low', 'Medium', 'High', 'Critical'].map((s) =>
                    <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Principal Amount (optional)</Label>
              <Input type="number" min={0} value={principalAmount}
                onChange={(e) => setPrincipalAmount(Number(e.target.value))} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={busy || !violationTypeId || !summary.trim() || !justificationOk}
            onClick={() => onSubmit({
              violationTypeId,
              summary,
              severity,
              principalAmount,
              duplicateJustification: duplicate ? duplicateJustification.trim() : null,
              duplicateOfViolationId: duplicate?.id ?? null,
            })}>
            {busy ? 'Converting…' : (usingQueue ? 'Convert & Send to Queue' : 'Create Confirmed Violation')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Conversion logic ----------
async function convertFinding(args: {
  finding: any;
  violationTypeId: string;
  summary: string;
  severity: string;
  principalAmount: number;
  userCode: string;
}): Promise<string> {
  const insp = args.finding.ce_inspections ?? {};
  const usingQueue = isComplianceFeatureEnabled('violations.verificationQueue');
  const status = usingQueue ? 'PENDING_VERIFICATION' : 'OPEN';

  const violationNumber = `V-${Date.now().toString().slice(-8)}-${Math.floor(Math.random() * 900 + 100)}`;

  const { data: vio, error: vErr } = await (supabase.from('ce_violations') as any)
    .insert({
      violation_number: violationNumber,
      employer_id: insp.employer_id ?? null,
      employer_name: insp.employer_name ?? null,
      territory: insp.territory ?? null,
      violation_type_id: args.violationTypeId,
      fund_type: insp.fund_type ?? null,
      status,
      severity: args.severity,
      summary: args.summary,
      description: args.finding.description,
      principal_amount: args.principalAmount || 0,
      total_amount: args.principalAmount || 0,
      source_type: 'INSPECTION_FINDING',
      inspection_id: args.finding.inspection_id ?? null,
      created_by: args.userCode,
      updated_by: args.userCode,
    })
    .select('id')
    .single();
  if (vErr) throw vErr;
  const violationId = (vio as any).id as string;

  // Mark finding converted
  const { error: fErr } = await (supabase.from('ce_inspection_findings') as any)
    .update({
      violation_created: true,
      violation_id: violationId,
      updated_by: args.userCode,
      updated_at: new Date().toISOString(),
    })
    .eq('id', args.finding.id);
  if (fErr) throw fErr;

  // Carry finding evidence forward — ensure rows reference the finding so the
  // violation detail view can show them. (ce_inspection_evidence already has
  // inspection_id + finding_id; we just make sure finding_id is set.)
  await (supabase.from('ce_inspection_evidence') as any)
    .update({
      finding_id: args.finding.id,
      updated_by: args.userCode,
      updated_at: new Date().toISOString(),
    })
    .eq('inspection_id', args.finding.inspection_id)
    .is('finding_id', null);

  return violationId;
}
