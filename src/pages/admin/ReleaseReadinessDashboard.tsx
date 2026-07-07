import React, { useMemo, useState } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { CheckCircle2, AlertTriangle, XCircle, ShieldCheck, PlayCircle, Download, FileSignature } from 'lucide-react';
import {
  useAttestCheck,
  useLatestReadinessRun,
  useReadinessAdminHealth,
  useReadinessAttestations,
  useReadinessRuns,
  useRunReadinessChecks,
  useExportReport,
  useOverrideCheck,
} from '@/platform/release-readiness/hooks';
import type { CheckResult, CheckStatus } from '@/platform/release-readiness/types';

function statusBadge(s: CheckStatus) {
  const map: Record<CheckStatus, { icon: React.ReactNode; className: string; label: string }> = {
    PASSED: { icon: <CheckCircle2 className="h-3 w-3" />, className: 'bg-green-100 text-green-800', label: 'Passed' },
    ATTESTED: { icon: <ShieldCheck className="h-3 w-3" />, className: 'bg-blue-100 text-blue-800', label: 'Attested' },
    WARNING: { icon: <AlertTriangle className="h-3 w-3" />, className: 'bg-amber-100 text-amber-800', label: 'Warning' },
    FAILED: { icon: <XCircle className="h-3 w-3" />, className: 'bg-red-100 text-red-800', label: 'Failed' },
    UNKNOWN: { icon: <AlertTriangle className="h-3 w-3" />, className: 'bg-muted text-muted-foreground', label: 'Unknown' },
  };
  const m = map[s] ?? map.UNKNOWN;
  return (
    <Badge className={`gap-1 ${m.className}`} variant="secondary">
      {m.icon} {m.label}
    </Badge>
  );
}

export default function ReleaseReadinessDashboard() {
  const [releaseTag, setReleaseTag] = useState('v1.0.0');
  const [notes, setNotes] = useState('');
  const [attestOpen, setAttestOpen] = useState<null | CheckResult>(null);
  const [attestNotes, setAttestNotes] = useState('');
  const [attestEvidence, setAttestEvidence] = useState('');

  const runsQuery = useReadinessRuns();
  const latestQuery = useLatestReadinessRun(releaseTag);
  const attestationsQuery = useReadinessAttestations(releaseTag);
  const adminHealth = useReadinessAdminHealth();
  const runChecks = useRunReadinessChecks();
  const attest = useAttestCheck();
  const override = useOverrideCheck();
  const exportRun = useExportReport();

  const latest = latestQuery.data;
  const results = useMemo<CheckResult[]>(() => (latest?.check_results as any) ?? [], [latest]);

  const handleRun = () => {
    if (!releaseTag) return toast.error('Enter a release tag');
    runChecks.mutate(
      { releaseTag, notes: notes || undefined },
      {
        onSuccess: () => toast.success('Readiness checks executed'),
        onError: (e: any) => toast.error(`Run failed: ${e.message}`),
      },
    );
  };

  const handleAttest = () => {
    if (!attestOpen) return;
    attest.mutate(
      {
        release_tag: releaseTag,
        check_code: attestOpen.check_code,
        attested_status: 'ATTESTED',
        evidence_url: attestEvidence || undefined,
        notes: attestNotes || undefined,
      },
      {
        onSuccess: () => {
          toast.success('Attestation recorded');
          setAttestOpen(null);
          setAttestNotes('');
          setAttestEvidence('');
        },
        onError: (e: any) => toast.error(`Attestation failed: ${e.message}`),
      },
    );
  };

  const handleExport = async () => {
    if (!latest) return;
    const content = await exportRun.mutateAsync(latest);
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `release-readiness-${latest.release_tag}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Report downloaded');
  };

  const handleOverride = (r: CheckResult) => {
    const reason = window.prompt(`Override reason for ${r.check_name}:`);
    if (!reason) return;
    override.mutate(
      { releaseTag, checkCode: r.check_code, reason },
      {
        onSuccess: () => toast.success('Check overridden'),
        onError: (e: any) => toast.error(`Override failed: ${e.message}`),
      },
    );
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="Release Readiness Dashboard"
        subtitle="Aggregate route, table, permission, menu, audit, workflow, reference, migration and typecheck checks before shipping a release."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Administration' },
          { label: 'Governance' },
          { label: 'Release Readiness' },
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle>Run Checks</CardTitle>
          <CardDescription>Executes all readiness checks against the current environment and records a run.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <Label>Release Tag</Label>
              <Input value={releaseTag} onChange={(e) => setReleaseTag(e.target.value)} placeholder="v1.0.0" />
            </div>
            <div className="md:col-span-2">
              <Label>Notes (optional)</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Release-specific context" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleRun} disabled={runChecks.isPending} className="gap-2">
              <PlayCircle className="h-4 w-4" /> {runChecks.isPending ? 'Running…' : 'Run All Checks'}
            </Button>
            <Button variant="outline" onClick={handleExport} disabled={!latest} className="gap-2">
              <Download className="h-4 w-4" /> Export Report
            </Button>
          </div>
        </CardContent>
      </Card>

      {latest && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Latest Run — {latest.release_tag}</CardTitle>
                <CardDescription>Ran {new Date(latest.run_at).toLocaleString()}</CardDescription>
              </div>
              {statusBadge(latest.overall_status)}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-4 text-center">
              <div className="rounded-md border p-3">
                <div className="text-2xl font-semibold text-green-700">{latest.passed_count}</div>
                <div className="text-xs text-muted-foreground">Passed / Attested</div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-2xl font-semibold text-amber-700">{latest.warning_count}</div>
                <div className="text-xs text-muted-foreground">Warnings</div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-2xl font-semibold text-red-700">{latest.failed_count}</div>
                <div className="text-xs text-muted-foreground">Failed</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="checks">
        <TabsList>
          <TabsTrigger value="checks">Checks</TabsTrigger>
          <TabsTrigger value="attestations">Attestations</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="health">Health</TabsTrigger>
        </TabsList>

        <TabsContent value="checks" className="space-y-2">
          {!results.length && (
            <Card><CardContent className="py-8 text-center text-muted-foreground">No run yet. Click "Run All Checks" above.</CardContent></Card>
          )}
          {results.map((r) => (
            <Card key={r.check_code}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{r.check_name}</CardTitle>
                    <CardDescription>{r.category} · {r.check_code}</CardDescription>
                  </div>
                  {statusBadge(r.status)}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{r.summary}</p>
                {r.details && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {r.details.map((d, i) => (
                      <Badge key={i} variant="outline">{d.label}: {d.value}</Badge>
                    ))}
                  </div>
                )}
                {r.issues && r.issues.length > 0 && (
                  <ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground">
                    {r.issues.slice(0, 5).map((i, idx) => <li key={idx}>{i}</li>)}
                  </ul>
                )}
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => setAttestOpen(r)}>
                    <FileSignature className="h-3 w-3" /> Attest
                  </Button>
                  {r.status === 'FAILED' && (
                    <Button size="sm" variant="ghost" onClick={() => handleOverride(r)}>Override</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="attestations">
          <Card>
            <CardHeader><CardTitle>Attestations for {releaseTag}</CardTitle></CardHeader>
            <CardContent>
              {attestationsQuery.data?.length ? (
                <div className="space-y-2">
                  {attestationsQuery.data.map((a) => (
                    <div key={a.id} className="flex items-start justify-between rounded border p-3">
                      <div>
                        <div className="font-medium text-sm">{a.check_code}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(a.attested_at).toLocaleString()} · {a.notes ?? 'no notes'}
                        </div>
                        {a.evidence_url && <a className="text-xs text-primary underline" href={a.evidence_url}>Evidence</a>}
                      </div>
                      {statusBadge(a.attested_status)}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No attestations recorded for this release.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader><CardTitle>Recent Runs</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {runsQuery.data?.map((r) => (
                  <div key={r.id} className="flex items-center justify-between rounded border p-3">
                    <div>
                      <div className="font-medium text-sm">{r.release_tag}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(r.run_at).toLocaleString()} · P{r.passed_count} / W{r.warning_count} / F{r.failed_count}
                      </div>
                    </div>
                    {statusBadge(r.overall_status)}
                  </div>
                )) ?? <p className="text-muted-foreground text-sm">No runs yet.</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="health">
          <Card>
            <CardHeader><CardTitle>Admin Access Health</CardTitle></CardHeader>
            <CardContent>
              {adminHealth.isLoading && <p>Checking…</p>}
              {adminHealth.data && (
                <div className="flex items-start gap-2">
                  {adminHealth.data.ok ? statusBadge('PASSED') : statusBadge('FAILED')}
                  <p className="text-sm">{adminHealth.data.message}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!attestOpen} onOpenChange={(o) => !o && setAttestOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Attest — {attestOpen?.check_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Evidence URL (optional)</Label>
              <Input value={attestEvidence} onChange={(e) => setAttestEvidence(e.target.value)} placeholder="Link to CI run, screenshot, PR…" />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={attestNotes} onChange={(e) => setAttestNotes(e.target.value)} rows={3}
                placeholder="e.g. tsgo passed locally, 0 errors, build 3.2MB" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAttestOpen(null)}>Cancel</Button>
            <Button onClick={handleAttest} disabled={attest.isPending}>Record Attestation</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
