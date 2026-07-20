import { useMemo, useState } from 'react';
// useNavigate intentionally not imported — actions use window.location for simplicity
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/PageHeader';
import { PermissionWrapper } from '@/components/ui/permission-wrapper';
import { PermissionButton } from '@/components/ui/permission-button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Loader2, ShieldCheck, ShieldAlert, Copy, Link2, AlertTriangle, ExternalLink, Undo2, GitMerge } from 'lucide-react';
import { toast } from 'sonner';
import { useDebounce } from '@/hooks/useDebounce';
import { useUserCode } from '@/hooks/useUserCode';
import {
  getVerificationSettings,
  listVerificationQueue,
  getViolationById,
  findPossibleDuplicates,
  confirmViolation,
  rejectViolation,
  markAsDuplicate,
  linkToExistingCase,
  sendBackViolation,
  mergeViolation,
  type VerificationRow,
} from '@/services/verificationQueueService';
import { violationNotesService } from '@/services/violationNotesService';
import { NoteType } from '@/types/violationNotes';

const MODULE = 'manage_compliance';
const PAGE_SIZE = 25;

const currencyFmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'XCD', minimumFractionDigits: 2 });

function fmtAmount(v: number | null | undefined) {
  return v != null ? currencyFmt.format(Number(v)) : '—';
}

function resolveTotal(r: any): number | null {
  if (r == null) return null;
  const t = r.total_amount;
  if (t != null && Number(t) !== 0) return Number(t);
  const p = Number(r.principal_amount ?? 0) || 0;
  const pen = Number(r.penalty_amount ?? 0) || 0;
  const i = Number(r.interest_amount ?? 0) || 0;
  const sum = p + pen + i;
  if (sum !== 0) return sum;
  return t != null ? Number(t) : null;
}

function VerificationQueueInner() {
  // navigation handled via the module-level navigate helper
  const queryClient = useQueryClient();
  const { userCode } = useUserCode();

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 350);
  const [priority, setPriority] = useState('ALL');
  const [fund, setFund] = useState('ALL');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const settingsQ = useQuery({ queryKey: ['ce-verification-settings'], queryFn: getVerificationSettings });

  const listQ = useQuery({
    queryKey: ['ce-verification-queue', { search: debouncedSearch, priority, fund, page }],
    queryFn: () => listVerificationQueue({ search: debouncedSearch || undefined, priority, fund, page, pageSize: PAGE_SIZE }),
    enabled: settingsQ.data?.enabled !== false,
  });

  const totalPages = useMemo(() => {
    if (!listQ.data) return 1;
    return Math.max(1, Math.ceil(listQ.data.totalCount / PAGE_SIZE));
  }, [listQ.data]);

  return (
    <div className="p-6 space-y-4">
      <PageHeader
        title="Verification Queue"
        subtitle="Review detected possible violations before they become confirmed."
      />

      {settingsQ.data && !settingsQ.data.enabled && (
        <Alert>
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Verification Queue is disabled</AlertTitle>
          <AlertDescription>
            Detection currently produces {settingsQ.data.disabledFallback === 'CONFIRM' ? 'confirmed violations' : 'case-intake records'} automatically.
            To enable officer review, turn on <strong>compliance.verification_queue.enabled</strong> in Compliance settings.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Possible Violations Awaiting Review</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Input
              placeholder="Search number, employer, summary…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="max-w-sm"
            />
            <Select value={priority} onValueChange={(v) => { setPriority(v); setPage(1); }}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Priority" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All priorities</SelectItem>
                <SelectItem value="Critical">Critical</SelectItem>
                <SelectItem value="High">High</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="Low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={fund} onValueChange={(v) => { setFund(v); setPage(1); }}>
              <SelectTrigger className="w-32"><SelectValue placeholder="Fund" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All funds</SelectItem>
                <SelectItem value="SS">Social Security</SelectItem>
                <SelectItem value="SEV">Severance</SelectItem>
                <SelectItem value="EI">Employment Injury</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Violation #</TableHead>
                  <TableHead>Employer</TableHead>
                  <TableHead>Fund</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {listQ.isLoading && (
                  <TableRow><TableCell colSpan={9} className="text-center py-10"><Loader2 className="h-5 w-5 animate-spin inline" /></TableCell></TableRow>
                )}
                {listQ.data && listQ.data.rows.length === 0 && (
                  <TableRow><TableCell colSpan={9} className="text-center py-10 text-muted-foreground">No possible violations awaiting verification.</TableCell></TableRow>
                )}
                {listQ.data?.rows.map((r) => (
                  <TableRow key={r.id} className="cursor-pointer" onClick={() => setSelectedId(r.id)}>
                    <TableCell className="font-mono text-xs">{r.violation_number}</TableCell>
                    <TableCell>
                      <div className="font-medium">{r.employer_name ?? '—'}</div>
                      <div className="text-xs text-muted-foreground">{r.employer_id ?? '—'}</div>
                    </TableCell>
                    <TableCell>{r.fund_type ?? '—'}</TableCell>
                    <TableCell className="text-xs">{r.period_from ?? '—'}{r.period_to && r.period_to !== r.period_from ? ` → ${r.period_to}` : ''}</TableCell>
                    <TableCell className="text-xs">{r.violation_type_name ?? r.violation_type_code ?? '—'}</TableCell>
                    <TableCell className="text-xs">{r.source_type ?? '—'}</TableCell>
                    <TableCell className="text-right">{fmtAmount(resolveTotal(r))}</TableCell>
                    <TableCell><Badge variant="outline">{r.priority ?? '—'}</Badge></TableCell>
                    <TableCell><Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setSelectedId(r.id); }}>Review</Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {listQ.data ? `${listQ.data.totalCount} total` : ''}
            </span>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</Button>
              <span>Page {page} / {totalPages}</span>
              <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <ReviewDialog
        violationId={selectedId}
        onClose={() => setSelectedId(null)}
        onCompleted={() => {
          setSelectedId(null);
          queryClient.invalidateQueries({ queryKey: ['ce-verification-queue'] });
        }}
        userCode={userCode}
      />
    </div>
  );
}

interface ReviewDialogProps {
  violationId: string | null;
  onClose: () => void;
  onCompleted: () => void;
  userCode: string | null;
}

function ReviewDialog({ violationId, onClose, onCompleted, userCode }: ReviewDialogProps) {
  const [notes, setNotes] = useState('');
  const [duplicateMaster, setDuplicateMaster] = useState<string>('');
  const [mergeTarget, setMergeTarget] = useState<string>('');
  const [caseId, setCaseId] = useState('');
  const [action, setAction] = useState<'confirm' | 'reject' | 'duplicate' | 'link-case' | 'send-back' | 'merge' | null>(null);

  const detailQ = useQuery({
    queryKey: ['ce-verification-detail', violationId],
    queryFn: () => violationId ? getViolationById(violationId) : null,
    enabled: !!violationId,
  });

  const dupsQ = useQuery({
    queryKey: ['ce-verification-duplicates', violationId],
    queryFn: () => detailQ.data ? findPossibleDuplicates(detailQ.data) : Promise.resolve([]),
    enabled: !!detailQ.data,
  });

  const notesQ = useQuery({
    queryKey: ['ce-violation-notes', violationId],
    queryFn: () => violationId ? violationNotesService.getByViolationId(violationId) : Promise.resolve([]),
    enabled: !!violationId,
  });

  const performer = userCode || 'SYSTEM';

  const confirmMut = useMutation({
    mutationFn: () => confirmViolation(violationId!, performer, notes),
    onSuccess: () => { toast.success('Violation confirmed.'); onCompleted(); reset(); },
    onError: (e: any) => toast.error(e?.message ?? 'Failed to confirm'),
  });
  const rejectMut = useMutation({
    mutationFn: () => rejectViolation(violationId!, performer, notes),
    onSuccess: () => { toast.success('Possible violation rejected.'); onCompleted(); reset(); },
    onError: (e: any) => toast.error(e?.message ?? 'Failed to reject'),
  });
  const dupMut = useMutation({
    mutationFn: () => markAsDuplicate(violationId!, duplicateMaster, performer, notes),
    onSuccess: () => { toast.success('Marked as duplicate.'); onCompleted(); reset(); },
    onError: (e: any) => toast.error(e?.message ?? 'Failed to mark duplicate'),
  });
  const caseMut = useMutation({
    mutationFn: () => linkToExistingCase(violationId!, caseId, performer, notes),
    onSuccess: () => { toast.success('Linked to case.'); onCompleted(); reset(); },
    onError: (e: any) => toast.error(e?.message ?? 'Failed to link case'),
  });
  const sendBackMut = useMutation({
    mutationFn: () => sendBackViolation(violationId!, performer, notes),
    onSuccess: () => { toast.success('Sent back to originator.'); onCompleted(); reset(); },
    onError: (e: any) => toast.error(e?.message ?? 'Failed to send back'),
  });
  const mergeMut = useMutation({
    mutationFn: () => mergeViolation(violationId!, mergeTarget, performer, notes),
    onSuccess: () => { toast.success('Violation merged.'); onCompleted(); reset(); },
    onError: (e: any) => toast.error(e?.message ?? 'Failed to merge'),
  });
  const noteMut = useMutation({
    mutationFn: () => violationNotesService.create({
      violationId: violationId!,
      noteType: NoteType.INSPECTOR_COMMENT,
      noteText: notes,
    }),
    onSuccess: () => { toast.success('Note added.'); setNotes(''); notesQ.refetch(); },
    onError: (e: any) => toast.error(e?.message ?? 'Failed to add note'),
  });

  function reset() {
    setNotes(''); setDuplicateMaster(''); setMergeTarget(''); setCaseId(''); setAction(null);
  }

  const v = detailQ.data;
  const open = !!violationId;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { onClose(); reset(); } }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Review Possible Violation</DialogTitle>
          <DialogDescription>{v?.violation_number}</DialogDescription>
        </DialogHeader>

        {detailQ.isLoading && <div className="py-8 text-center"><Loader2 className="h-5 w-5 animate-spin inline" /></div>}

        {v && (
          <Tabs defaultValue="review">
            <TabsList>
              <TabsTrigger value="review">Review</TabsTrigger>
              <TabsTrigger value="duplicates">Possible Duplicates {dupsQ.data ? `(${dupsQ.data.length})` : ''}</TabsTrigger>
              <TabsTrigger value="notes">Notes {notesQ.data ? `(${notesQ.data.length})` : ''}</TabsTrigger>
            </TabsList>

            <TabsContent value="review" className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Field label="Employer">{v.employer_name ?? '—'} <span className="text-muted-foreground text-xs">({v.employer_id ?? '—'})</span></Field>
                <Field label="Fund">{v.fund_type ?? '—'}</Field>
                <Field label="Period">{v.period_from ?? '—'}{v.period_to && v.period_to !== v.period_from ? ` → ${v.period_to}` : ''}</Field>
                <Field label="Type">{v.violation_type_name ?? v.violation_type_code ?? '—'}</Field>
                <Field label="Source">{v.source_type ?? '—'}</Field>
                <Field label="Matched Rule">{v.source_rule_id ? <span className="font-mono text-xs">{v.source_rule_id}</span> : '—'}</Field>
                <Field label="Principal">{fmtAmount(v.principal_amount)}</Field>
                <Field label="Penalty">{fmtAmount(v.penalty_amount)}</Field>
                <Field label="Interest">{fmtAmount(v.interest_amount)}</Field>
                <Field label="Total">{fmtAmount(resolveTotal(v))}</Field>
                <Field label="Discovered">{v.discovered_date} · {v.discovered_by ?? '—'}</Field>
                <Field label="Priority">{v.priority ?? '—'}</Field>
              </div>
              <Field label="Summary">{v.summary}</Field>
              {v.description && <Field label="Description"><span className="whitespace-pre-wrap">{v.description}</span></Field>}

              {dupsQ.data && dupsQ.data.length > 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>{dupsQ.data.length} possible duplicate(s) detected</AlertTitle>
                  <AlertDescription>Review them in the <strong>Possible Duplicates</strong> tab before confirming.</AlertDescription>
                </Alert>
              )}

              <div className="border-t pt-3 space-y-2">
                <label className="text-sm font-medium">Decision notes (required)</label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Reason / supporting evidence reference…" />

                {action === 'duplicate' && (
                  <div>
                    <label className="text-sm font-medium">Master violation ID</label>
                    <Input value={duplicateMaster} onChange={(e) => setDuplicateMaster(e.target.value)} placeholder="UUID of existing violation" />
                    {dupsQ.data && dupsQ.data.length > 0 && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Suggestions:&nbsp;
                        {dupsQ.data.slice(0, 5).map((d) => (
                          <button key={d.id} type="button" className="underline mr-2" onClick={() => setDuplicateMaster(d.id)}>{d.violation_number}</button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {action === 'link-case' && (
                  <div>
                    <label className="text-sm font-medium">Case ID</label>
                    <Input value={caseId} onChange={(e) => setCaseId(e.target.value)} placeholder="UUID of existing case" />
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="duplicates">
              {dupsQ.isLoading && <div className="py-6 text-center"><Loader2 className="h-5 w-5 animate-spin inline" /></div>}
              {dupsQ.data && dupsQ.data.length === 0 && (
                <p className="text-sm text-muted-foreground py-4">No possible duplicates found within the configured window.</p>
              )}
              {dupsQ.data && dupsQ.data.length > 0 && (
                <div className="space-y-2">
                  {dupsQ.data.map((d) => (
                    <Card key={d.id}>
                      <CardContent className="p-3 grid grid-cols-2 gap-2 text-sm">
                        <Field label="Violation #"><span className="font-mono">{d.violation_number}</span></Field>
                        <Field label="Status"><Badge variant="outline">{d.status}</Badge></Field>
                        <Field label="Employer">{d.employer_name ?? '—'}</Field>
                        <Field label="Fund / Period">{d.fund_type ?? '—'} · {d.period_from ?? '—'}</Field>
                        <Field label="Type">{d.violation_type_name ?? d.violation_type_code ?? '—'}</Field>
                        <Field label="Total">{fmtAmount(resolveTotal(d))}</Field>
                        <div className="col-span-2 flex justify-end">
                          <Button size="sm" variant="outline" onClick={() => { setDuplicateMaster(d.id); setAction('duplicate'); }}>
                            <Copy className="h-3 w-3 mr-1" /> Mark current as duplicate of this
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="notes">
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {notesQ.data && notesQ.data.length === 0 && <p className="text-sm text-muted-foreground">No notes yet.</p>}
                {notesQ.data?.map((n) => (
                  <Card key={n.id}>
                    <CardContent className="p-3 text-sm">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>{n.authorName} · {n.noteType}</span>
                        <span>{new Date(n.createdAt).toLocaleString()}</span>
                      </div>
                      <div className="whitespace-pre-wrap">{n.noteText}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <div className="mt-3 space-y-2">
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Add a note…" />
                <PermissionButton
                  moduleName={MODULE}
                  actionName="edit"
                  size="sm"
                  disabled={!notes.trim() || noteMut.isPending}
                  onClick={() => noteMut.mutate()}
                >
                  Add note
                </PermissionButton>
              </div>
            </TabsContent>
          </Tabs>
        )}

        <DialogFooter className="gap-2 flex-wrap">
          <Button variant="outline" onClick={() => { onClose(); reset(); }}>Close</Button>
          {v && (
            <>
              <Button variant="outline" onClick={() => navigate(`/compliance/violations/${v.id}`)}>
                <ExternalLink className="h-3 w-3 mr-1" /> Open full record
              </Button>
              <PermissionButton
                moduleName={MODULE}
                actionName="edit"
                variant="outline"
                disabled={!notes.trim() || !caseId || caseMut.isPending}
                onClick={() => { setAction('link-case'); caseMut.mutate(); }}
              >
                <Link2 className="h-3 w-3 mr-1" /> Link to case
              </PermissionButton>
              <PermissionButton
                moduleName={MODULE}
                actionName="edit"
                variant="outline"
                disabled={!notes.trim() || !duplicateMaster || dupMut.isPending}
                onClick={() => dupMut.mutate()}
              >
                <Copy className="h-3 w-3 mr-1" /> Mark duplicate
              </PermissionButton>
              <PermissionButton
                moduleName={MODULE}
                actionName="edit"
                variant="destructive"
                disabled={!notes.trim() || rejectMut.isPending}
                onClick={() => rejectMut.mutate()}
              >
                <ShieldAlert className="h-3 w-3 mr-1" /> Reject
              </PermissionButton>
              <PermissionButton
                moduleName={MODULE}
                actionName="edit"
                disabled={!notes.trim() || confirmMut.isPending}
                onClick={() => confirmMut.mutate()}
              >
                <ShieldCheck className="h-3 w-3 mr-1" /> Confirm Violation
              </PermissionButton>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const navigate = (path: string) => { window.location.assign(path); };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm">{children}</div>
    </div>
  );
}

export default function VerificationQueue() {
  return (
    <PermissionWrapper moduleName={MODULE}>
      <VerificationQueueInner />
    </PermissionWrapper>
  );
}
