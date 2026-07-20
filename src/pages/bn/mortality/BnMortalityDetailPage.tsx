/**
 * BN Mortality 360 — Detail Workspace  (/bn/mortality/:eventId)
 *
 * Tabbed workspace: Overview · Person Match · Affected Awards · Payments/PAD ·
 * Evidence · Communications · History · Actions.
 *
 * All reads flow through the secure BenefitsQueryClient. All mutations are
 * disabled while actions_enabled=false — the Actions tab shows every command
 * with a specific disabled reason.
 */
import React from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  BnModuleRouteGate,
  type BnModuleAccessContext,
} from '@/components/bn/access/BnModuleRouteGate';
import {
  useMortalityEvent,
  useMortalityAffectedAwards,
  useMortalityEventHistory,
  useMortalityEvidence,
  useMortalityCommunications,
} from '@/hooks/bn/mortality/useMortalityQueries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import BnMortalityActionsPanel from './components/BnMortalityActionsPanel';
import {
  AlertTriangle,
  ChevronLeft,
  FileText,
  History,
  Lock,
  Mail,
  Scale,
  ShieldCheck,
  Users,
  Wallet,
} from 'lucide-react';

function statusBadgeVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (['CLOSED', 'COMPLETED', 'REVERSED', 'CANCELLED', 'DUPLICATE'].includes(status)) return 'secondary';
  if (['REJECTED', 'CONFLICT'].includes(status)) return 'destructive';
  return 'default';
}

function Overview({ eventId }: { eventId: string }) {
  const q = useMortalityEvent(eventId);
  if (q.isLoading) return <Skeleton className="h-40" />;
  if (q.isError) return <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertDescription>{q.error?.message}</AlertDescription></Alert>;
  const e = q.data?.data;
  if (!e) return <Alert><AlertDescription>Event not found.</AlertDescription></Alert>;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Deceased</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-1.5">
          <div><span className="text-muted-foreground">Name:</span> {e.deceased.fullName ?? '—'}</div>
          <div><span className="text-muted-foreground">National ID:</span> {e.deceased.nationalIdMasked ?? '—'}</div>
          <div><span className="text-muted-foreground">DOB:</span> {e.deceased.dateOfBirth ?? '—'}</div>
          <div><span className="text-muted-foreground">Gender:</span> {e.deceased.gender ?? '—'}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Death</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-1.5">
          <div><span className="text-muted-foreground">Date:</span> {e.death.date ?? '—'}</div>
          <div><span className="text-muted-foreground">Time:</span> {e.death.time ?? '—'}</div>
          <div><span className="text-muted-foreground">Place:</span> {e.death.place ?? '—'}</div>
          <div><span className="text-muted-foreground">Cause:</span> {e.death.cause ?? '—'}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Verification</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-1.5">
          <div><span className="text-muted-foreground">Source:</span> {e.verification.source ?? '—'}</div>
          <div><span className="text-muted-foreground">Reference:</span> {e.verification.reference ?? '—'}</div>
          <div><span className="text-muted-foreground">Confidence:</span> {e.verification.confidence ?? '—'}</div>
          <div><span className="text-muted-foreground">Verified at:</span> {e.verification.verifiedAt ? new Date(e.verification.verifiedAt).toLocaleString() : '—'}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Workflow</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-1.5">
          <div><span className="text-muted-foreground">Status:</span> <Badge variant={statusBadgeVariant(e.status)}>{e.status}</Badge></div>
          <div><span className="text-muted-foreground">Assigned:</span> {e.assignedTo ?? 'Unassigned'}</div>
          <div><span className="text-muted-foreground">SLA due:</span> {e.slaDueAt ? new Date(e.slaDueAt).toLocaleString() : '—'}</div>
          <div><span className="text-muted-foreground">Reported:</span> {e.reportedAt ? new Date(e.reportedAt).toLocaleString() : '—'}</div>
        </CardContent>
      </Card>
    </div>
  );
}

function AffectedAwards({ eventId }: { eventId: string }) {
  const q = useMortalityAffectedAwards(eventId);
  if (q.isLoading) return <Skeleton className="h-40" />;
  if (q.isError) return <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertDescription>{q.error?.message}</AlertDescription></Alert>;
  const rows = q.data?.data ?? [];
  if (rows.length === 0) return <div className="p-6 text-center text-sm text-muted-foreground">No affected awards. Impact analysis runs when Prepare Impact executes.</div>;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Award</TableHead>
          <TableHead>Action</TableHead>
          <TableHead>Current status</TableHead>
          <TableHead>Approval</TableHead>
          <TableHead>Est. PAD</TableHead>
          <TableHead>Integration</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.id ?? r.awardId ?? Math.random()}>
            <TableCell className="font-mono text-xs">{r.awardReference ?? r.awardId?.slice(0, 8) ?? '—'}</TableCell>
            <TableCell><Badge>{r.action}</Badge></TableCell>
            <TableCell><Badge variant="outline">{r.currentAwardStatus ?? '—'}</Badge></TableCell>
            <TableCell className="text-xs">{r.approvalState ?? '—'}</TableCell>
            <TableCell className="text-xs tabular-nums">
              {r.estimatedPadMinor ? `$${(r.estimatedPadMinor / 100).toFixed(2)}` : '—'}
            </TableCell>
            <TableCell className="text-xs">{r.integrationStatus ?? 'PENDING'}</TableCell>
            <TableCell className="text-right">
              {r.award360Route && (
                <Button asChild size="sm" variant="ghost"><Link to={r.award360Route}>Open 360</Link></Button>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function HistoryTab({ eventId }: { eventId: string }) {
  const q = useMortalityEventHistory(eventId);
  if (q.isLoading) return <Skeleton className="h-40" />;
  if (q.isError) return <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertDescription>{q.error?.message}</AlertDescription></Alert>;
  const rows = (q.data?.data ?? []) as any[];
  if (rows.length === 0) return <div className="p-6 text-center text-sm text-muted-foreground">No history yet.</div>;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>When</TableHead>
          <TableHead>Command</TableHead>
          <TableHead>From → To</TableHead>
          <TableHead>Actor</TableHead>
          <TableHead>Notes</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((h, idx) => (
          <TableRow key={h.id ?? idx}>
            <TableCell className="text-xs">{h.occurred_at ? new Date(h.occurred_at).toLocaleString() : '—'}</TableCell>
            <TableCell className="text-xs font-mono">{h.command_name ?? '—'}</TableCell>
            <TableCell className="text-xs">
              <Badge variant="outline" className="text-[10px]">{h.from_status ?? '—'}</Badge>
              {' → '}
              <Badge className="text-[10px]">{h.to_status ?? '—'}</Badge>
            </TableCell>
            <TableCell className="text-xs">{h.actor_display ?? (typeof h.actor_id === 'string' ? h.actor_id.slice(0, 8) : '—')}</TableCell>
            <TableCell className="text-xs">{h.notes ?? '—'}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function EvidenceTab({ eventId }: { eventId: string }) {
  const q = useMortalityEvidence(eventId);
  if (q.isLoading) return <Skeleton className="h-40" />;
  if (q.isError) return <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertDescription>{q.error?.message}</AlertDescription></Alert>;
  const rows = (q.data?.data ?? []) as any[];
  if (rows.length === 0) return <div className="p-6 text-center text-sm text-muted-foreground">No evidence attached.</div>;
  return (
    <ul className="divide-y rounded-md border">
      {rows.map((f, idx) => (
        <li key={f.id ?? idx} className="flex items-center justify-between p-3">
          <div className="flex items-center gap-3">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-sm">{f.file_name ?? f.id ?? 'Document'}</div>
              <div className="text-xs text-muted-foreground">{f.document_type ?? '—'} · {f.uploaded_at ? new Date(f.uploaded_at).toLocaleDateString() : '—'}</div>
            </div>
          </div>
          <Badge variant="outline">{f.verification_status ?? 'UNVERIFIED'}</Badge>
        </li>
      ))}
    </ul>
  );
}

function CommunicationsTab({ eventId }: { eventId: string }) {
  const q = useMortalityCommunications(eventId);
  if (q.isLoading) return <Skeleton className="h-40" />;
  if (q.isError) return <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertDescription>{q.error?.message}</AlertDescription></Alert>;
  const rows = (q.data?.data ?? []) as any[];
  if (rows.length === 0) return <div className="p-6 text-center text-sm text-muted-foreground">No communications sent.</div>;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Sent</TableHead>
          <TableHead>Event</TableHead>
          <TableHead>Channel</TableHead>
          <TableHead>Recipient</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((c) => (
          <TableRow key={c.id}>
            <TableCell className="text-xs">{c.sent_at ? new Date(c.sent_at).toLocaleString() : '—'}</TableCell>
            <TableCell className="text-xs">{c.event_code ?? '—'}</TableCell>
            <TableCell className="text-xs">{c.channel ?? '—'}</TableCell>
            <TableCell className="text-xs">{c.recipient_masked ?? '—'}</TableCell>
            <TableCell><Badge variant="outline">{c.delivery_status ?? '—'}</Badge></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function DetailContent({ ctx, eventId }: { ctx: BnModuleAccessContext; eventId: string }) {
  const eventQuery = useMortalityEvent(eventId);
  const e = eventQuery.data?.data;

  return (
    <div className="p-6 space-y-4 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="icon">
              <Link to="/bn/mortality"><ChevronLeft className="h-4 w-4" /></Link>
            </Button>
            <h1 className="text-2xl font-semibold">Mortality 360</h1>
            {e && <Badge variant={statusBadgeVariant(e.status)}>{e.status}</Badge>}
            {!ctx.actionsEnabled && (
              <Badge variant="secondary" className="gap-1">
                <Lock className="h-3 w-3" /> Read-only pilot
              </Badge>
            )}
          </div>
          <p className="ml-11 mt-1 text-sm text-muted-foreground">
            {e?.eventReference ?? eventId} · {e?.deceased?.fullName ?? '—'}
          </p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="overview" className="gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> Overview</TabsTrigger>
          <TabsTrigger value="awards" className="gap-1.5"><Wallet className="h-3.5 w-3.5" /> Affected awards</TabsTrigger>
          <TabsTrigger value="evidence" className="gap-1.5"><FileText className="h-3.5 w-3.5" /> Evidence</TabsTrigger>
          <TabsTrigger value="comms" className="gap-1.5"><Mail className="h-3.5 w-3.5" /> Communications</TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5"><History className="h-3.5 w-3.5" /> History</TabsTrigger>
          <TabsTrigger value="actions" className="gap-1.5"><Scale className="h-3.5 w-3.5" /> Actions</TabsTrigger>
        </TabsList>
        <div className="mt-4">
          <TabsContent value="overview"><Overview eventId={eventId} /></TabsContent>
          <TabsContent value="awards"><AffectedAwards eventId={eventId} /></TabsContent>
          <TabsContent value="evidence"><EvidenceTab eventId={eventId} /></TabsContent>
          <TabsContent value="comms"><CommunicationsTab eventId={eventId} /></TabsContent>
          <TabsContent value="history"><HistoryTab eventId={eventId} /></TabsContent>
          <TabsContent value="actions">
            <BnMortalityActionsPanel
              ctx={ctx}
              currentStatus={e?.status ?? null}
              currentUserId={null}
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

export default function BnMortalityDetailPage() {
  const { eventId } = useParams<{ eventId: string }>();
  return (
    <BnModuleRouteGate moduleCode="bn_mortality" requiredAction="view">
      {(ctx) => eventId ? <DetailContent ctx={ctx} eventId={eventId} /> : (
        <Alert variant="destructive" className="m-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Missing event id</AlertTitle>
          <AlertDescription>No mortality event id provided in the URL.</AlertDescription>
        </Alert>
      )}
    </BnModuleRouteGate>
  );
}
