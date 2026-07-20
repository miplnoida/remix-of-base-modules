import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useEmployerProfile } from '@/portals/_shared/externalHooks';
import RequestWaiverDialog from '@/components/compliance/RequestWaiverDialog';
import { listWaiverRequests, type WaiverRequest, type WaiverStatus } from '@/services/waiverService';

const STATUS_VARIANT: Record<WaiverStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  PENDING: 'secondary',
  PENDING_APPROVAL: 'secondary',
  APPROVED: 'default',
  APPLIED: 'default',
  REJECTED: 'destructive',
  CANCELLED: 'outline',
};

export default function EmployerWaivers() {
  const qc = useQueryClient();
  const { data: profile, isLoading: profileLoading } = useEmployerProfile();
  const employer = (profile as any)?.employer ?? null;
  const employerId: string | null = employer?.id ?? null;

  const [open, setOpen] = useState(false);

  const listQ = useQuery({
    queryKey: ['employer', 'waivers', employerId],
    queryFn: () => listWaiverRequests({ employerId: employerId! }),
    enabled: !!employerId,
  });

  const rows = useMemo(() => (listQ.data ?? []) as WaiverRequest[], [listQ.data]);

  if (profileLoading) return <Skeleton className="h-40 w-full" />;

  if (!employerId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Waiver Requests</CardTitle>
          <CardDescription>
            Your employer account is not fully linked yet. Please contact the Social Security Board
            to enable waiver requests.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Waiver Requests</CardTitle>
            <CardDescription>
              Request a waiver of penalty, interest or principal on outstanding compliance amounts.
              Each request is routed to the Compliance Authority for review and approval.
            </CardDescription>
          </div>
          <Button onClick={() => setOpen(true)}>New waiver request</Button>
        </CardHeader>
        <CardContent>
          {listQ.isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              You have not submitted any waiver requests yet. Click <strong>New waiver request</strong> to
              start.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Waiver #</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Approved</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono">{r.waiver_number}</TableCell>
                    <TableCell>{r.waiver_type}</TableCell>
                    <TableCell>{r.requested_at?.slice(0, 10) ?? '—'}</TableCell>
                    <TableCell>{r.amount_requested ?? '—'}</TableCell>
                    <TableCell>{r.amount_approved ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[r.status] ?? 'secondary'}>{r.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {open && (
        <RequestWaiverDialog
          open={open}
          onClose={() => setOpen(false)}
          onCreated={() => {
            qc.invalidateQueries({ queryKey: ['employer', 'waivers', employerId] });
          }}
          context={{
            employer_id: employerId,
            source: 'EMPLOYER_RESPONSE',
          }}
        />
      )}
    </div>
  );
}
