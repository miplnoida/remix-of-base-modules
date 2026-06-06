import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import {
  FileText, Search, Upload, MessageSquare, Wallet, Landmark, ShieldCheck,
  PiggyBank, FileDown, Users, Scale, Calendar, AlertTriangle, Clock,
  CheckCircle2, CircleDot, ArrowRight, Inbox, Mail, Bell, Sparkles,
  Briefcase, HeartPulse, Baby, Activity, Accessibility, UserMinus, Flower2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import { useClaimantPersona } from '@/hooks/external/useClaimantPersona';
import { usePortalFeatureConfig } from '@/hooks/external/usePortalFeatureConfig';
import {
  useExternalClaims, useExternalAwards, useExternalPayments,
  useExternalContributions, useExternalMessages, useExternalClaimStatus,
} from '@/portals/_shared/externalHooks';
import { useState } from 'react';
import type { Persona } from '@/services/external/portalPersonaService';

/* ─── Persona badges ─────────────────────────────────────────── */

export function PersonaBadgeBar() {
  const { persona } = useClaimantPersona();
  const personas = persona?.personas ?? [];
  if (personas.length === 0) {
    return (
      <Badge variant="outline" className="border-white/40 bg-white/10 text-xs text-primary-foreground">
        Persona not verified
      </Badge>
    );
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {personas.map(p => (
        <Badge key={p} variant="outline" className="border-white/40 bg-white/10 text-xs text-primary-foreground">
          {p.replace(/_/g, ' ')}
        </Badge>
      ))}
    </div>
  );
}

/* ─── Quick action tile ─────────────────────────────────────────── */

type TileProps = {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
  badgeCount?: number;
  disabled?: boolean;
  disabledHint?: string;
  accent?: 'primary' | 'amber' | 'sky' | 'rose' | 'violet' | 'emerald';
};

const ACCENTS: Record<NonNullable<TileProps['accent']>, string> = {
  primary: 'bg-primary/10 text-primary',
  amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  sky: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
  rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  violet: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
};

export function QuickActionTile({
  to, icon: Icon, title, subtitle, badgeCount, disabled, disabledHint, accent = 'primary',
}: TileProps) {
  const content = (
    <Card className={`group h-full transition-all ${disabled ? 'opacity-55' : 'hover:-translate-y-0.5 hover:shadow-md'}`}>
      <CardContent className="flex h-full flex-col gap-3 p-4">
        <div className="flex items-start justify-between">
          <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${ACCENTS[accent]}`}>
            <Icon className="h-5 w-5" />
          </div>
          {typeof badgeCount === 'number' && badgeCount > 0 && (
            <Badge className="h-5 min-w-5 rounded-full px-1.5 text-[10px]">{badgeCount}</Badge>
          )}
        </div>
        <div className="space-y-0.5">
          <p className="text-sm font-semibold leading-tight">{title}</p>
          {subtitle && <p className="text-xs text-muted-foreground leading-snug">{subtitle}</p>}
          {disabled && disabledHint && <p className="text-[11px] text-muted-foreground italic">{disabledHint}</p>}
        </div>
      </CardContent>
    </Card>
  );
  return disabled ? <div>{content}</div> : <Link to={to} className="block h-full">{content}</Link>;
}

/* ─── Attention task card ─────────────────────────────────────────── */

type AttentionTask = {
  id: string;
  title: string;
  reason: string;
  dueDate?: string;
  status: 'urgent' | 'pending' | 'info';
  to: string;
  icon: React.ComponentType<{ className?: string }>;
};

export function AttentionTaskCard({ task }: { task: AttentionTask }) {
  const Icon = task.icon;
  const tone =
    task.status === 'urgent' ? 'border-destructive/40 bg-destructive/5'
    : task.status === 'pending' ? 'border-amber-500/40 bg-amber-500/5'
    : 'border-border bg-muted/30';
  const iconTone =
    task.status === 'urgent' ? 'text-destructive'
    : task.status === 'pending' ? 'text-amber-600 dark:text-amber-400'
    : 'text-muted-foreground';
  return (
    <div className={`flex items-start gap-3 rounded-lg border p-3 ${tone}`}>
      <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${iconTone}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium truncate">{task.title}</p>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="text-[11px] text-muted-foreground hover:text-foreground">Why?</button>
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-xs text-xs">{task.reason}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        {task.dueDate && <p className="text-xs text-muted-foreground">Due {task.dueDate}</p>}
        <Button asChild size="sm" variant="link" className="h-auto p-0 mt-1 text-xs">
          <Link to={task.to}>Take action <ArrowRight className="ml-1 h-3 w-3" /></Link>
        </Button>
      </div>
    </div>
  );
}

/* ─── Claim Journey Tracker ─────────────────────────────────────────── */

const JOURNEY_STAGES = [
  { key: 'SUBMITTED', label: 'Submitted' },
  { key: 'WAITING_EMPLOYER', label: 'Waiting for Employer' },
  { key: 'WAITING_DOCTOR', label: 'Waiting for Doctor' },
  { key: 'UNDER_REVIEW', label: 'Under Review' },
  { key: 'ELIGIBILITY', label: 'Eligibility Check' },
  { key: 'DECISION', label: 'Decision' },
  { key: 'PAYMENT', label: 'Payment' },
];

function stageIndexForStatus(status?: string): number {
  const s = String(status ?? '').toUpperCase();
  if (s.includes('PAID') || s.includes('PAYMENT')) return 6;
  if (s.includes('DECIDED') || s.includes('APPROVED') || s.includes('REJECTED') || s.includes('DECISION')) return 5;
  if (s.includes('ELIGIBIL')) return 4;
  if (s.includes('REVIEW')) return 3;
  if (s.includes('DOCTOR')) return 2;
  if (s.includes('EMPLOYER')) return 1;
  if (s.includes('SUBMIT') || s.includes('PENDING')) return 0;
  return 0;
}

export function ClaimJourneyTracker() {
  const { data: claimsData, isLoading: claimsLoading } = useExternalClaims();
  const claim = (claimsData?.claims ?? [])[0] as any | undefined;
  const { data: statusData } = useExternalClaimStatus(claim?.claim_number);

  if (claimsLoading) return <Skeleton className="h-32 w-full" />;
  if (!claim) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 py-8 text-center">
          <FileText className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No active claims</p>
          <Button asChild size="sm"><Link to="/claimant/apply">Start a new application</Link></Button>
        </CardContent>
      </Card>
    );
  }

  const currentIdx = stageIndexForStatus(statusData?.claim?.status ?? claim.status);
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">My recent claim journey</CardTitle>
            <CardDescription className="font-mono text-xs">{claim.claim_number}</CardDescription>
          </div>
          <Button asChild size="sm" variant="ghost">
            <Link to={`/claimant/claims/${claim.claim_number}`}>View claim <ArrowRight className="ml-1 h-3 w-3" /></Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <div className="absolute left-0 right-0 top-3 h-0.5 bg-muted" />
          <div
            className="absolute left-0 top-3 h-0.5 bg-primary transition-all"
            style={{ width: `${(currentIdx / (JOURNEY_STAGES.length - 1)) * 100}%` }}
          />
          <div className="relative grid grid-cols-7 gap-1">
            {JOURNEY_STAGES.map((s, i) => {
              const done = i < currentIdx;
              const active = i === currentIdx;
              return (
                <div key={s.key} className="flex flex-col items-center gap-1">
                  <div className={`flex h-6 w-6 items-center justify-center rounded-full border-2 ${
                    done ? 'bg-primary border-primary text-primary-foreground'
                    : active ? 'bg-background border-primary text-primary'
                    : 'bg-background border-muted text-muted-foreground'
                  }`}>
                    {done ? <CheckCircle2 className="h-3 w-3" /> : <CircleDot className="h-3 w-3" />}
                  </div>
                  <span className={`text-[10px] text-center leading-tight ${active ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Social Security Summary ─────────────────────────────────────── */

export function SocialSecuritySummaryCard() {
  const { data, isLoading } = useExternalContributions();
  if (isLoading) return <Skeleton className="h-40 w-full" />;
  const rows = (data?.contributions ?? []) as any[];
  const years = rows.length;
  const total = rows.reduce((s, r) => s + Number(r.contributions_paid ?? 0), 0);
  const last = rows[0];
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2"><PiggyBank className="h-4 w-4 text-primary" /> My Social Security</CardTitle>
        <CardDescription>Based on contributions linked to your SSN.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div><p className="text-2xl font-bold">{years}</p><p className="text-[11px] text-muted-foreground">Years</p></div>
          <div><p className="text-2xl font-bold">{total.toFixed(0)}</p><p className="text-[11px] text-muted-foreground">Total Contrib.</p></div>
          <div><p className="text-2xl font-bold">{last?.year_paid ?? '—'}</p><p className="text-[11px] text-muted-foreground">Last Year</p></div>
        </div>
        <div className="flex gap-2">
          <Button asChild size="sm" variant="outline" className="flex-1"><Link to="/claimant/contributions">View History</Link></Button>
          <Button asChild size="sm" variant="outline" className="flex-1"><Link to="/claimant/statements">Download Statement</Link></Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Payment Snapshot ─────────────────────────────────────── */

export function PaymentSnapshotCard() {
  const { data, isLoading } = useExternalPayments();
  const { data: awards } = useExternalAwards();
  if (isLoading) return <Skeleton className="h-40 w-full" />;
  const rows = (data?.payments ?? []) as any[];
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = rows.find(r => r.payment_date && r.payment_date >= today);
  const last = rows.find(r => r.payment_date && r.payment_date < today);
  const activeAwards = (awards?.awards ?? []).filter((a: any) => ['ACTIVE', 'IN_PAYMENT', 'AWARDED'].includes(String(a.status).toUpperCase()));
  const suspended = (awards?.awards ?? []).filter((a: any) => ['SUSPENDED', 'ON_HOLD'].includes(String(a.status).toUpperCase()));

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2"><Wallet className="h-4 w-4 text-primary" /> Benefits & Payments</CardTitle>
        <CardDescription>{activeAwards.length} active · {suspended.length} on hold</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex justify-between"><span className="text-muted-foreground">Next payment</span><span className="font-medium">{upcoming?.payment_date ?? '—'}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Last payment</span><span className="font-medium">{last?.payment_date ?? '—'}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Method</span><span className="font-medium">{last?.payment_method ?? 'EFT'}</span></div>
        {suspended.length > 0 && (
          <div className="flex items-center gap-2 rounded-md bg-amber-500/10 px-2 py-1.5 text-xs text-amber-700 dark:text-amber-300">
            <AlertTriangle className="h-3.5 w-3.5" /> {suspended.length} benefit on hold
          </div>
        )}
        <Button asChild size="sm" variant="outline" className="w-full mt-1"><Link to="/claimant/payments">View payments</Link></Button>
      </CardContent>
    </Card>
  );
}

/* ─── Messages Snapshot ─────────────────────────────────────── */

export function MessageSnapshotCard() {
  const { data, isLoading } = useExternalMessages();
  if (isLoading) return <Skeleton className="h-40 w-full" />;
  const msgs = (data?.messages ?? []) as any[];
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2"><Inbox className="h-4 w-4 text-primary" /> Inbox</CardTitle>
        <CardDescription>{msgs.length} new item{msgs.length === 1 ? '' : 's'}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {msgs.slice(0, 3).map((m, i) => (
          <Link key={i} to="/claimant/comms/inbox" className="flex items-start gap-2 rounded-md p-2 text-xs hover:bg-muted/60">
            <Mail className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-medium truncate">{m.subject ?? 'Notification'}</p>
              <p className="text-muted-foreground truncate">{m.preview ?? m.body ?? ''}</p>
            </div>
          </Link>
        ))}
        {msgs.length === 0 && <p className="text-xs text-muted-foreground">No new messages.</p>}
        <Button asChild size="sm" variant="outline" className="w-full">
          <Link to="/claimant/comms/inbox">Open inbox</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

/* ─── Guided Application Launcher ─────────────────────────────── */

const APPLICANT_OPTIONS = [
  { id: 'self', label: 'Myself', icon: ShieldCheck },
  { id: 'deceased', label: 'Someone deceased', icon: Flower2 },
  { id: 'child', label: 'A child or dependant', icon: Baby },
  { id: 'managed', label: 'Someone I manage', icon: Users },
  { id: 'funeral', label: 'Funeral expenses', icon: Flower2 },
  { id: 'unsure', label: 'Not sure', icon: Search },
];

const BENEFIT_CATEGORIES = [
  { label: 'Sickness', icon: HeartPulse },
  { label: 'Maternity', icon: Baby },
  { label: 'Employment Injury', icon: Activity },
  { label: 'Age Pension', icon: Landmark },
  { label: 'Invalidity', icon: Accessibility },
  { label: 'Survivors', icon: UserMinus },
  { label: 'Funeral Grant', icon: Flower2 },
  { label: 'Non-Contributory Pension', icon: ShieldCheck },
];

export function GuidedApplicationLauncher({ trigger }: { trigger: React.ReactNode }) {
  const [step, setStep] = useState<'who' | 'what'>('who');
  return (
    <Dialog onOpenChange={(o) => { if (!o) setStep('who'); }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{step === 'who' ? 'Who are you applying for?' : 'Choose a benefit category'}</DialogTitle>
          <DialogDescription>
            {step === 'who'
              ? 'Pick the option that best describes the person who will receive the benefit.'
              : 'These categories reflect Social Security benefit families. Pick one to see eligible products.'}
          </DialogDescription>
        </DialogHeader>
        {step === 'who' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {APPLICANT_OPTIONS.map(o => {
              const I = o.icon;
              return (
                <button
                  key={o.id}
                  onClick={() => setStep('what')}
                  className="flex flex-col items-center gap-2 rounded-lg border p-4 text-center hover:border-primary hover:bg-primary/5 transition"
                >
                  <I className="h-6 w-6 text-primary" />
                  <span className="text-sm font-medium">{o.label}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {BENEFIT_CATEGORIES.map(b => {
              const I = b.icon;
              return (
                <Link
                  key={b.label}
                  to="/claimant/apply"
                  className="flex flex-col items-center gap-2 rounded-lg border p-4 text-center hover:border-primary hover:bg-primary/5 transition"
                >
                  <I className="h-6 w-6 text-primary" />
                  <span className="text-xs font-medium">{b.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ─── The Dashboard ─────────────────────────────────────────────── */

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

function buildAttentionTasks(opts: {
  claims: any[]; awards: any[]; msgs: any[]; isPensioner: boolean; isBeneficiary: boolean;
}): AttentionTask[] {
  const tasks: AttentionTask[] = [];
  const returned = opts.claims.find(c => String(c.status ?? '').toUpperCase().includes('RETURN'));
  if (returned) tasks.push({
    id: 'returned', icon: AlertTriangle, status: 'urgent',
    title: 'Claim returned for correction',
    reason: 'Your claim was returned and needs additional information or corrections before it can continue.',
    to: `/claimant/claims/${returned.claim_number}`,
  });
  const empWaiting = opts.claims.find(c => String(c.status ?? '').toUpperCase().includes('EMPLOYER'));
  if (empWaiting) tasks.push({
    id: 'emp', icon: Briefcase, status: 'pending',
    title: 'Waiting for your employer',
    reason: 'Your employer must confirm employment details before the claim can be evaluated.',
    to: `/claimant/claims/${empWaiting.claim_number}`,
  });
  const drWaiting = opts.claims.find(c => String(c.status ?? '').toUpperCase().includes('DOCTOR'));
  if (drWaiting) tasks.push({
    id: 'dr', icon: HeartPulse, status: 'pending',
    title: 'Waiting for doctor response',
    reason: 'A medical report or certificate is required from your treating doctor.',
    to: `/claimant/claims/${drWaiting.claim_number}`,
  });
  if (opts.isPensioner) tasks.push({
    id: 'life', icon: Calendar, status: 'info',
    title: 'Annual life certificate due',
    reason: 'Pensioners must submit a yearly proof-of-life to continue receiving payments.',
    to: '/claimant/compliance/life',
  });
  if (opts.isBeneficiary) tasks.push({
    id: 'school', icon: Calendar, status: 'info',
    title: 'School certificate due',
    reason: 'Survivor or orphan beneficiaries must provide enrolment proof each term.',
    to: '/claimant/compliance/school',
  });
  if (opts.msgs.length > 0) tasks.push({
    id: 'msg', icon: Bell, status: 'info',
    title: `${opts.msgs.length} unread message${opts.msgs.length === 1 ? '' : 's'}`,
    reason: 'You have unread communications from Social Security.',
    to: '/claimant/comms/inbox',
  });
  return tasks;
}

export default function SelfServiceDashboard() {
  const { persona } = useClaimantPersona();
  const { data: features } = usePortalFeatureConfig();
  const { data: claimsData } = useExternalClaims();
  const { data: awardsData } = useExternalAwards();
  const { data: msgsData } = useExternalMessages();

  const personas: Persona[] = persona?.personas ?? [];
  const flags = persona?.flags;
  const f = features ?? ({} as any);

  const isInsured = personas.includes('INSURED_PERSON');
  const isGuardianOrPayee = personas.includes('GUARDIAN') || personas.includes('PAYEE');
  const isRepresentative = personas.includes('REPRESENTATIVE');
  const isPensioner = personas.includes('PENSIONER' as any);
  const isBeneficiary = personas.includes('BENEFICIARY' as any);
  const managerEnabled = (f.peopleIMangeEnabled ?? true) &&
    ((isGuardianOrPayee && (f.guardianPayeeEnabled ?? true)) ||
     (isRepresentative && (f.representativeAccessEnabled ?? true)));

  const claims = (claimsData?.claims ?? []) as any[];
  const msgs = (msgsData?.messages ?? []) as any[];
  const attention = useMemo(
    () => buildAttentionTasks({ claims, awards: awardsData?.awards ?? [], msgs, isPensioner, isBeneficiary }),
    [claims, awardsData, msgs, isPensioner, isBeneficiary],
  );

  const firstName = (persona?.displayName ?? '').split(' ')[0] || 'there';

  return (
    <div className="space-y-6">
      {/* Welcome strip */}
      <div className="rounded-xl border bg-gradient-to-br from-primary/5 via-background to-background p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{greeting()}, {firstName}.</h1>
            <p className="text-sm text-muted-foreground">What would you like to do today?</p>
          </div>
          {attention.length > 0 && (
            <div className="flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs text-amber-700 dark:text-amber-300">
              <AlertTriangle className="h-3.5 w-3.5" />
              {attention.length} item{attention.length === 1 ? '' : 's'} need your attention
            </div>
          )}
        </div>
        <div className="relative mt-4 max-w-xl">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search benefits, claims, payments, documents..."
            className="pl-9 bg-background"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const q = (e.target as HTMLInputElement).value.trim().toLowerCase();
                if (!q) return;
                if (q.includes('claim')) window.location.assign('/claimant/claims');
                else if (q.includes('pay')) window.location.assign('/claimant/payments');
                else if (q.includes('doc')) window.location.assign('/claimant/documents');
                else if (q.includes('benefit') || q.includes('appl')) window.location.assign('/claimant/apply');
                else window.location.assign('/claimant/comms/inbox');
              }
            }}
          />
        </div>
      </div>

      {/* Primary action tiles */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Quick actions</h2>
          <GuidedApplicationLauncher
            trigger={<Button size="sm" variant="ghost" className="h-7 text-xs"><Sparkles className="mr-1 h-3 w-3" /> Guided start</Button>}
          />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <GuidedApplicationLauncher
            trigger={
              <div className="cursor-pointer">
                <QuickActionTile to="#" icon={FileText} title="Apply for a Benefit" subtitle="Guided application wizard" accent="primary" />
              </div>
            }
          />
          <QuickActionTile to="/claimant/claims" icon={Search} title="Track My Claim" subtitle="See status & next steps" badgeCount={claims.length} accent="sky" />
          <QuickActionTile to="/claimant/documents" icon={Upload} title="Upload Documents" subtitle="Submit requested files" accent="violet" />
          <QuickActionTile to="/claimant/comms/inbox" icon={MessageSquare} title="View Messages" subtitle="Official notices & letters" badgeCount={msgs.length} accent="amber" />
          {(f.paymentHistoryEnabled ?? true) && flags?.canViewPayments && (
            <QuickActionTile to="/claimant/payments" icon={Wallet} title="View Payments" subtitle="Upcoming & history" accent="emerald" />
          )}
          {(f.bankUpdateEnabled ?? true) && (
            <QuickActionTile to="/claimant/bank-details" icon={Landmark} title="Update Bank Details" subtitle="EFT account for payments" accent="primary" />
          )}
          {(f.lifeCertificateEnabled ?? true) && (
            <QuickActionTile
              to="/claimant/compliance/life" icon={ShieldCheck} title="Submit Life Certificate"
              subtitle="Annual proof-of-life" accent="rose"
              disabled={!isPensioner && !managerEnabled}
              disabledHint={!isPensioner ? 'Pensioners only' : undefined}
            />
          )}
          {isInsured && (f.contributionHistoryEnabled ?? true) && (
            <>
              <QuickActionTile to="/claimant/contributions" icon={PiggyBank} title="View Contributions" subtitle="Years & wages" accent="emerald" />
              <QuickActionTile to="/claimant/statements" icon={FileDown} title="Download Statement" subtitle="Official PDF" accent="sky" />
            </>
          )}
          {managerEnabled && (
            <QuickActionTile to="/claimant/managed/people" icon={Users} title="People I Manage" subtitle="Guardian / payee / rep" accent="violet" />
          )}
          {(f.appealsEnabled ?? true) && (
            <QuickActionTile to="/claimant/appeals" icon={Scale} title="Appeals & Reconsideration" subtitle="Request review of a decision" accent="amber" />
          )}
        </div>
      </section>

      {/* Things that need your attention */}
      {attention.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Things that need your attention
          </h2>
          <div className="grid gap-2 md:grid-cols-2">
            {attention.map(t => <AttentionTaskCard key={t.id} task={t} />)}
          </div>
        </section>
      )}

      {/* Claim journey + side widgets */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <ClaimJourneyTracker />
          <PaymentSnapshotCard />
        </div>
        <div className="space-y-4">
          <MessageSnapshotCard />
          {isInsured && (f.contributionHistoryEnabled ?? true) && <SocialSecuritySummaryCard />}
        </div>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t bg-background/95 backdrop-blur md:hidden">
        {[
          { to: '/claimant/dashboard', icon: ShieldCheck, label: 'Home' },
          { to: '/claimant/apply', icon: FileText, label: 'Apply' },
          { to: '/claimant/tasks', icon: Clock, label: 'Tasks' },
          { to: '/claimant/claims', icon: Search, label: 'Claims' },
          { to: '/claimant/comms/inbox', icon: MessageSquare, label: 'Messages' },
        ].map(i => {
          const I = i.icon;
          return (
            <Link key={i.to} to={i.to} className="flex flex-col items-center gap-0.5 py-2 text-[10px] text-muted-foreground hover:text-primary">
              <I className="h-4 w-4" />
              {i.label}
            </Link>
          );
        })}
      </nav>
      <div className="h-14 md:hidden" />
    </div>
  );
}
