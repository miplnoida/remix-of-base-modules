import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useExternalClaimBuckets } from '@/portals/_shared/externalHooks';
import { useClaimantPersona } from '@/hooks/external/useClaimantPersona';
import { auditPortalAction } from '@/services/external/auditPortalAction';

type BucketKey = 'own' | 'submitted' | 'beneficiary' | 'guardian';
const TAB_TO_BUCKET: Record<BucketKey, keyof BucketData> = {
  own: 'own',
  submitted: 'submittedForOthers',
  beneficiary: 'asBeneficiary',
  guardian: 'asGuardianOrPayee',
};

interface BucketData {
  own: any[];
  submittedForOthers: any[];
  asBeneficiary: any[];
  asGuardianOrPayee: any[];
}

function ClaimsTable({ rows }: { rows: any[] }) {
  if (!rows || rows.length === 0)
    return <p className="text-sm text-muted-foreground py-4">No claims in this category.</p>;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Claim #</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Submitted</TableHead>
          <TableHead>Decision</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map(c => (
          <TableRow key={c.id}>
            <TableCell>
              <Link className="text-primary hover:underline font-mono" to={`/claimant/claims/${c.claim_number ?? c.id}`}>
                {c.claim_number ?? c.id.slice(0, 8)}
              </Link>
            </TableCell>
            <TableCell>{c.legacy_benefit_type ?? c.benefit_code ?? '—'}</TableCell>
            <TableCell><Badge>{c.status ?? '—'}</Badge></TableCell>
            <TableCell>{c.submission_date ?? '—'}</TableCell>
            <TableCell>{c.decision_date ?? '—'}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default function ClaimsPage() {
  const [sp, setSp] = useSearchParams();
  const tab = (sp.get('tab') as BucketKey) || 'own';
  const { data, isLoading } = useExternalClaimBuckets();
  const { userId } = useClaimantPersona();

  useEffect(() => {
    auditPortalAction('CLAIMS_TAB_VIEWED', { userId, payload: { tab } });
  }, [tab, userId]);

  const buckets: BucketData = useMemo(
    () => (data as any) ?? { own: [], submittedForOthers: [], asBeneficiary: [], asGuardianOrPayee: [] },
    [data],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Claims</CardTitle>
        <CardDescription>All claims connected to you, grouped by your role.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? <Skeleton className="h-48 w-full" /> : (
          <Tabs value={tab} onValueChange={v => setSp({ tab: v })}>
            <TabsList>
              <TabsTrigger value="own">My Own ({buckets.own.length})</TabsTrigger>
              <TabsTrigger value="submitted">Submitted by Me ({buckets.submittedForOthers.length})</TabsTrigger>
              <TabsTrigger value="guardian">As Guardian/Payee ({buckets.asGuardianOrPayee.length})</TabsTrigger>
              <TabsTrigger value="beneficiary">As Beneficiary ({buckets.asBeneficiary.length})</TabsTrigger>
            </TabsList>
            {(Object.keys(TAB_TO_BUCKET) as BucketKey[]).map(k => (
              <TabsContent key={k} value={k} className="pt-4">
                <ClaimsTable rows={buckets[TAB_TO_BUCKET[k]] as any[]} />
              </TabsContent>
            ))}
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
