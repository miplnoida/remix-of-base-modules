/**
 * ClaimSnapshotsPanel — Point-in-time captures of person, employer,
 * and contribution data taken at application submission. These do NOT
 * change when the underlying master records change later.
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, AlertTriangle, XCircle, User, Building2, Wallet } from 'lucide-react';
import { useBnClaimWorkspace } from '@/hooks/bn/useBnClaimIntake';

import { formatAuditTimestamp, formatNumber } from '@/lib/culture/culture';
const statusIcon = (s: string) =>
  s === 'PASS' ? <CheckCircle2 className="h-4 w-4 text-success" />
  : s === 'WARN' ? <AlertTriangle className="h-4 w-4 text-warning" />
  : <XCircle className="h-4 w-4 text-destructive" />;

interface Props {
  claimId: string;
}

export function ClaimSnapshotsPanel({ claimId }: Props) {
  const { data, isLoading, error } = useBnClaimWorkspace(claimId);

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Unable to load claim snapshots</AlertTitle>
        <AlertDescription>{(error as Error).message}</AlertDescription>
      </Alert>
    );
  }
  if (!data) return null;

  const { application, person, employer, contribution, validations } = data;

  return (
    <div className="space-y-4">
      {application && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              Application Details
              <Badge variant="outline">{application.application_channel}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm grid sm:grid-cols-2 gap-2">
            <div><span className="text-muted-foreground">Submitted by:</span> {application.submitted_by_user_id ?? '—'} ({application.submitted_by_type})</div>
            <div><span className="text-muted-foreground">Submitted at:</span> {formatAuditTimestamp(application.submitted_at)}</div>
            <div><span className="text-muted-foreground">Declaration:</span> {application.declaration_accepted ? 'Accepted' : 'Not accepted'}</div>
            <div><span className="text-muted-foreground">Source IP:</span> {application.source_ip ?? '—'}</div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4" /> Claimant Snapshot</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {person ? (
            <div className="grid sm:grid-cols-2 gap-2">
              <div><span className="text-muted-foreground">Name:</span> {person.full_name ?? '—'}</div>
              <div><span className="text-muted-foreground">SSN:</span> {person.ssn ?? '—'}</div>
              <div><span className="text-muted-foreground">DOB:</span> {person.date_of_birth ?? '—'}</div>
              <div><span className="text-muted-foreground">Status:</span> {person.person_status ?? '—'}</div>
              <div><span className="text-muted-foreground">Phone:</span> {person.phone ?? '—'}</div>
              <div><span className="text-muted-foreground">Email:</span> {person.email ?? '—'}</div>
            </div>
          ) : <p className="text-muted-foreground">No person snapshot captured.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><Building2 className="h-4 w-4" /> Employer Snapshot</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {employer ? (
            <div className="grid sm:grid-cols-2 gap-2">
              <div><span className="text-muted-foreground">Name:</span> {employer.employer_name ?? '—'}</div>
              <div><span className="text-muted-foreground">Reg No:</span> {employer.employer_regno ?? '—'}</div>
              <div><span className="text-muted-foreground">Status:</span> {employer.employer_status ?? '—'}</div>
            </div>
          ) : <p className="text-muted-foreground">No employer linked to this claim.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><Wallet className="h-4 w-4" /> Contribution Snapshot</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {contribution ? (
            <div className="grid sm:grid-cols-2 gap-2">
              <div><span className="text-muted-foreground">Period:</span> {contribution.period_from ?? '—'} → {contribution.period_to ?? '—'}</div>
              <div><span className="text-muted-foreground">Total weeks:</span> {contribution.total_weeks}</div>
              <div><span className="text-muted-foreground">Total wages:</span> {Number(contribution.total_wages ?? 0).toFixed(2)}</div>
              <div><span className="text-muted-foreground">Avg weekly wage:</span> {Number(contribution.average_weekly_wage ?? 0).toFixed(2)}</div>
            </div>
          ) : <p className="text-muted-foreground">No contribution snapshot captured.</p>}
        </CardContent>
      </Card>

      {validations.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Intake Validations</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {validations.map(v => (
                <li key={v.id} className="flex items-start gap-2">
                  {statusIcon(v.status)}
                  <div>
                    <div className="font-medium">{v.check_code}</div>
                    {v.message && <div className="text-muted-foreground">{v.message}</div>}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
