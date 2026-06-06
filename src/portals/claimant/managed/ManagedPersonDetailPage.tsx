import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { auditPortalAction } from '@/services/external/auditPortalAction';
import { useClaimantPersona } from '@/hooks/external/useClaimantPersona';

interface PersonRow {
  ssn: string;
  firstname: string | null;
  middle_name: string | null;
  surname: string | null;
  dob: string | null;
  gender: string | null;
}

interface AwardRow {
  id: string;
  award_number: string | null;
  benefit_code: string | null;
  status: string | null;
  start_date: string | null;
  base_amount: number | null;
}

interface ClaimRow {
  id: string;
  claim_number: string | null;
  status: string | null;
  submission_date: string | null;
  legacy_benefit_type: string | null;
}

export default function ManagedPersonDetailPage() {
  const { ssn } = useParams<{ ssn: string }>();
  const { userId, persona } = useClaimantPersona();
  const [person, setPerson] = useState<PersonRow | null | undefined>(undefined);
  const [awards, setAwards] = useState<AwardRow[]>([]);
  const [claims, setClaims] = useState<ClaimRow[]>([]);

  const relationship = persona?.managedPersons.find(p => p.ssn === ssn)?.relationship;

  useEffect(() => {
    if (!ssn) return;
    auditPortalAction('MANAGED_PERSON_VIEWED', { userId, targetSsn: ssn });
    (async () => {
      const db = supabase as any;
      const [{ data: ip }, { data: aw }, { data: cl }] = await Promise.all([
        db.from('ip_master').select('ssn, firstname, middle_name, surname, dob, gender').eq('ssn', ssn).maybeSingle(),
        db.from('bn_award').select('id, award_number, benefit_code, status, start_date, base_amount').eq('ssn', ssn),
        db.from('bn_claim').select('id, claim_number, status, submission_date, legacy_benefit_type').eq('ssn', ssn).order('submission_date', { ascending: false }).limit(50),
      ]);
      setPerson(ip ?? null);
      setAwards(aw ?? []);
      setClaims(cl ?? []);
    })();
  }, [ssn, userId]);

  if (!ssn) return <p className="text-sm text-destructive">Missing person.</p>;
  if (!persona?.managedPersons.some(p => p.ssn === ssn)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access denied</CardTitle>
          <CardDescription>You don't have a verified link to manage this person.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {person === undefined ? <Skeleton className="h-6 w-40" /> : (
              <>
                {[person?.firstname, person?.middle_name, person?.surname].filter(Boolean).join(' ') || 'Unknown person'}
                {relationship && <Badge variant="outline">{relationship}</Badge>}
              </>
            )}
          </CardTitle>
          <CardDescription>SSN <span className="font-mono">{ssn}</span></CardDescription>
        </CardHeader>
        <CardContent className="text-sm">
          {person === undefined ? <Skeleton className="h-12 w-full" /> : !person ? (
            <p className="text-muted-foreground">No master record on file.</p>
          ) : (
            <dl className="grid grid-cols-2 gap-y-2">
              <dt className="text-muted-foreground">Date of birth</dt><dd>{person.dob ?? '—'}</dd>
              <dt className="text-muted-foreground">Gender</dt><dd>{person.gender ?? '—'}</dd>
            </dl>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Awards / pensions</CardTitle></CardHeader>
        <CardContent>
          {awards.length === 0 ? <p className="text-sm text-muted-foreground">No awards on file.</p> : (
            <Table>
              <TableHeader><TableRow><TableHead>Award #</TableHead><TableHead>Benefit</TableHead><TableHead>Status</TableHead><TableHead>Start</TableHead><TableHead>Rate</TableHead></TableRow></TableHeader>
              <TableBody>
                {awards.map(a => (
                  <TableRow key={a.id}>
                    <TableCell className="font-mono">{a.award_number ?? a.id.slice(0,8)}</TableCell>
                    <TableCell>{a.benefit_code ?? '—'}</TableCell>
                    <TableCell><Badge>{a.status}</Badge></TableCell>
                    <TableCell>{a.start_date ?? '—'}</TableCell>
                    <TableCell>{a.base_amount ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Claims</CardTitle></CardHeader>
        <CardContent>
          {claims.length === 0 ? <p className="text-sm text-muted-foreground">No claims on file.</p> : (
            <Table>
              <TableHeader><TableRow><TableHead>Claim #</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead><TableHead>Submitted</TableHead></TableRow></TableHeader>
              <TableBody>
                {claims.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono">{c.claim_number ?? c.id.slice(0,8)}</TableCell>
                    <TableCell>{c.legacy_benefit_type ?? '—'}</TableCell>
                    <TableCell><Badge>{c.status}</Badge></TableCell>
                    <TableCell>{c.submission_date ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
