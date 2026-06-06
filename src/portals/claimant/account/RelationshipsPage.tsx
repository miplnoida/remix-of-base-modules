import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useClaimantPersona } from '@/hooks/external/useClaimantPersona';
import { supabase } from '@/integrations/supabase/client';
import { auditPortalAction } from '@/services/external/auditPortalAction';

interface LinkRow {
  id: string;
  ssn: string;
  relationship_type: string;
  verification_status: string;
  is_primary: boolean;
  verified_at: string | null;
  verified_by: string | null;
  notes: string | null;
  created_at: string;
}

interface AuditRow {
  id: string;
  event_type: string;
  target_ssn: string | null;
  payload: any;
  created_at: string;
}

function statusVariant(s: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (s === 'VERIFIED') return 'default';
  if (s === 'PENDING') return 'secondary';
  if (s === 'REJECTED' || s === 'REVOKED') return 'destructive';
  return 'outline';
}

export default function RelationshipsPage() {
  const { userId } = useClaimantPersona();
  const [links, setLinks] = useState<LinkRow[] | null>(null);
  const [audit, setAudit] = useState<AuditRow[] | null>(null);

  useEffect(() => {
    if (!userId) return;
    auditPortalAction('RELATIONSHIPS_VIEWED', { userId });
    (async () => {
      const db = supabase as any;
      const [{ data: l }, { data: a }] = await Promise.all([
        db.from('external_user_person_link')
          .select('id, ssn, relationship_type, verification_status, is_primary, verified_at, verified_by, notes, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
        db.from('external_persona_audit')
          .select('id, event_type, target_ssn, payload, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(50),
      ]);
      setLinks(l ?? []);
      setAudit(a ?? []);
    })();
  }, [userId]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Relationships</CardTitle>
          <CardDescription>
            People you are linked to in the system. SELF means you are the insured person. Other links allow you to act on someone else's behalf.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!links ? (
            <Skeleton className="h-32 w-full" />
          ) : links.length === 0 ? (
            <p className="text-sm text-muted-foreground">No relationships on file yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SSN</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Primary</TableHead>
                  <TableHead>Verified</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {links.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono">{r.ssn}</TableCell>
                    <TableCell><Badge variant="outline">{r.relationship_type}</Badge></TableCell>
                    <TableCell><Badge variant={statusVariant(r.verification_status)}>{r.verification_status}</Badge></TableCell>
                    <TableCell>{r.is_primary ? 'Yes' : '—'}</TableCell>
                    <TableCell>{r.verified_at ? new Date(r.verified_at).toLocaleDateString() : '—'}</TableCell>
                    <TableCell>{new Date(r.created_at).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
          <CardDescription>Audit events on your portal account.</CardDescription>
        </CardHeader>
        <CardContent>
          {!audit ? (
            <Skeleton className="h-24 w-full" />
          ) : audit.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Target SSN</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {audit.map(r => (
                  <TableRow key={r.id}>
                    <TableCell>{new Date(r.created_at).toLocaleString()}</TableCell>
                    <TableCell><Badge variant="outline">{r.event_type}</Badge></TableCell>
                    <TableCell className="font-mono text-xs">{r.target_ssn ?? '—'}</TableCell>
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
