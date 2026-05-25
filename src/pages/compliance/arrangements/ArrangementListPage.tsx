/**
 * Generic arrangement list page used by Pending Approval, Active, and All views.
 * Permission-gated; approval actions visible only on PENDING_APPROVAL.
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/shared/PageHeader';
import { PermissionWrapper } from '@/components/ui/permission-wrapper';
import { PermissionButton } from '@/components/ui/permission-button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle2, XCircle, ExternalLink, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { approveArrangement, rejectArrangement } from '@/services/arrangementWorkflowService';
import { useUserCode } from '@/hooks/useUserCode';
import { isComplianceFeatureEnabled, type ComplianceFeatureKey } from '@/lib/compliance/featureToggles';

const MODULE = 'manage_compliance';

interface Props {
  title: string;
  subtitle: string;
  statuses: string[];
  showApprovalActions?: boolean;
  featureKey: ComplianceFeatureKey;
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-muted text-muted-foreground',
  PENDING_APPROVAL: 'bg-amber-500/15 text-amber-700 border-amber-300',
  ACTIVE: 'bg-green-500/15 text-green-700 border-green-300',
  COMPLETED: 'bg-emerald-500/15 text-emerald-700 border-emerald-300',
  DEFAULTED: 'bg-destructive/10 text-destructive border-destructive/30',
  SUPERSEDED: 'bg-muted text-muted-foreground',
};

export default function ArrangementListPage({ title, subtitle, statuses, showApprovalActions, featureKey }: Props) {
  const enabled = isComplianceFeatureEnabled(featureKey);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { userCode } = useUserCode();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['ce_arrangements_list', statuses.join(',')],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ce_payment_arrangements')
        .select('*')
        .in('status', statuses)
        .order('created_at', { ascending: false }).limit(500);
      if (error) throw error;
      return data || [];
    },
  });

  const approveMut = useMutation({
    mutationFn: (id: string) => approveArrangement(id, userCode || 'system'),
    onSuccess: () => { toast.success('Arrangement approved & activated'); qc.invalidateQueries({ queryKey: ['ce_arrangements_list'] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const rejectMut = useMutation({
    mutationFn: (id: string) => rejectArrangement(id, userCode || 'system'),
    onSuccess: () => { toast.success('Returned to draft'); qc.invalidateQueries({ queryKey: ['ce_arrangements_list'] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <PermissionWrapper moduleName={MODULE}>
      <div className="container mx-auto p-6 space-y-4">
        <PageHeader title={title} subtitle={subtitle} />
        {!enabled ? (
          <Card><CardContent className="py-10 text-center text-muted-foreground">{title} is disabled in feature toggles.</CardContent></Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Arrangement #</TableHead>
                      <TableHead>Employer</TableHead>
                      <TableHead className="text-right">Total Debt</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                      <TableHead>Next Due</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.length === 0 && (
                      <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No arrangements found.</TableCell></TableRow>
                    )}
                    {rows.map((a: any) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">{a.arrangement_number}</TableCell>
                        <TableCell>{a.employer_name || a.employer_id}</TableCell>
                        <TableCell className="text-right">{Number(a.total_debt).toLocaleString('en-US', { style: 'currency', currency: 'XCD' })}</TableCell>
                        <TableCell className="text-right">{Number(a.total_paid || 0).toLocaleString('en-US', { style: 'currency', currency: 'XCD' })}</TableCell>
                        <TableCell className="text-xs">{a.next_due_date || '—'}</TableCell>
                        <TableCell><Badge variant="outline" className={STATUS_COLORS[a.status]}>{a.status}</Badge></TableCell>
                        <TableCell className="text-right space-x-2">
                          {showApprovalActions && a.status === 'PENDING_APPROVAL' && (
                            <>
                              <PermissionButton moduleName={MODULE} actionName="approve" size="sm" variant="default"
                                disabled={approveMut.isPending} onClick={() => approveMut.mutate(a.id)}>
                                <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
                              </PermissionButton>
                              <PermissionButton moduleName={MODULE} actionName="approve" size="sm" variant="outline"
                                disabled={rejectMut.isPending} onClick={() => rejectMut.mutate(a.id)}>
                                <XCircle className="h-4 w-4 mr-1" /> Reject
                              </PermissionButton>
                            </>
                          )}
                          <button onClick={() => navigate(`/compliance/enforcement/arrangements?arr=${a.id}`)} className="text-primary hover:underline text-xs inline-flex items-center">
                            Open <ExternalLink className="h-3 w-3 ml-1" />
                          </button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </PermissionWrapper>
  );
}
