import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrangementDetailPanel } from '@/components/compliance/ArrangementDetailPanel';
import { PageHeader } from '@/components/shared/PageHeader';
import { ComplianceHelpButton } from '@/components/help/ComplianceHelpButton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Eye, Building2, Loader2, Info, ShieldCheck, ShieldAlert, AlertTriangle, XCircle } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchPaymentArrangements } from '@/services/complianceDataService';
import { useRegnoParam } from '@/hooks/useRegnoParam';
import { EmployerLinkChip, RegnoFilterBanner } from '@/components/compliance/EmployerLinkChip';
import ReferToLegalButton from '@/components/legal/lg/ReferToLegalButton';

export default function PaymentArrangements() {
  const navigate = useNavigate();
  const { regno } = useRegnoParam();
  const [searchParams, setSearchParams] = useSearchParams();
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedArrangementId, setSelectedArrangementId] = useState<string | null>(
    () => searchParams.get('arr'),
  );

  // Keep URL <-> state in sync so a deep link like ?arr=<id> auto-opens the detail
  // and closing the detail cleans the query param.
  useEffect(() => {
    const urlArr = searchParams.get('arr');
    if (urlArr !== selectedArrangementId) {
      setSelectedArrangementId(urlArr);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const { data: allArrangements = [], isLoading } = useQuery({
    queryKey: ['ce_payment_arrangements', statusFilter],
    queryFn: () => fetchPaymentArrangements({ status: statusFilter }),
  });
  const arrangements = regno
    ? allArrangements.filter((a: any) => a.employer_id === regno)
    : allArrangements;

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      DRAFT: 'bg-muted text-muted-foreground',
      ACTIVE: 'bg-success/10 text-success',
      COMPLETED: 'bg-primary/10 text-primary',
      DEFAULTED: 'bg-destructive/10 text-destructive',
      CANCELLED: 'bg-muted text-muted-foreground',
      SUPERSEDED: 'bg-muted text-muted-foreground',
    };
    return colors[status] || 'bg-muted text-muted-foreground';
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'XCD', minimumFractionDigits: 2 }).format(amount);

  /** Render breach indicator with more context than a tiny icon */
  const renderBreachCell = (arr: any) => {
    const missed = arr.missed_payments ?? 0;
    const max = arr.max_missed_before_breach ?? 2;

    if (arr.status === 'DEFAULTED') {
      return (
        <div className="flex items-center gap-1.5 justify-center">
          <XCircle className="h-3.5 w-3.5 text-destructive" />
          <span className="text-xs font-medium text-destructive">Defaulted</span>
        </div>
      );
    }
    if (arr.breach_detected) {
      return (
        <div className="flex items-center gap-1.5 justify-center">
          <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
          <span className="text-xs font-medium text-destructive">Breach</span>
        </div>
      );
    }
    if (missed > 0) {
      return (
        <div className="flex items-center gap-1.5 justify-center">
          <ShieldAlert className="h-3.5 w-3.5 text-warning-foreground" />
          <span className="text-xs font-medium text-warning-foreground">{missed}/{max}</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1 justify-center">
        <ShieldCheck className="h-3.5 w-3.5 text-success" />
        <span className="text-xs text-muted-foreground">OK</span>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (selectedArrangementId) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <PageHeader
          title="Arrangement Detail"
          subtitle="Operational view for compliance officers"
          breadcrumbs={[
            { label: 'Compliance', href: '/compliance/dashboard' },
            { label: 'Payment Arrangements', href: '/compliance/enforcement/arrangements' },
            { label: 'Detail' },
          ]}
        />
        <ArrangementDetailPanel
          arrangementId={selectedArrangementId}
          onBack={() => setSelectedArrangementId(null)}
        />
      </div>
    );
  }

  const activeCount = arrangements.filter((a: any) => a.status === 'ACTIVE').length;
  const defaultedCount = arrangements.filter((a: any) => a.status === 'DEFAULTED').length;
  const breachedCount = arrangements.filter((a: any) => a.breach_detected && a.status !== 'DEFAULTED').length;
  const totalOutstanding = arrangements.reduce(
    (sum: number, a: any) => sum + (Number(a.total_debt ?? 0) - Number(a.total_paid ?? 0)),
    0
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Payment Arrangements"
        subtitle="Monitor active payment arrangements and installment tracking"
        breadcrumbs={[
          { label: 'Compliance', href: '/compliance/dashboard' },
          { label: 'Payment Arrangements' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <ComplianceHelpButton screenKey="arrangements" />
            <ReferToLegalButton
              module="compliance"
              employerId={regno ?? null}
              reasonCode="PAYMENT_ARRANGEMENT_DEFAULT"
              label="Refer Default to Legal"
            />
          </div>
        }
      />


      <RegnoFilterBanner />

      {/* KPI cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{arrangements.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{activeCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Breached</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning-foreground">{breachedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Defaulted</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{defaultedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Outstanding</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-foreground">{formatCurrency(totalOutstanding)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Creation guidance */}
      <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border text-sm text-muted-foreground">
        <Info className="h-4 w-4 shrink-0" />
        <span>
          Payment arrangements are created from individual{' '}
          <Button variant="link" className="h-auto p-0 text-sm" onClick={() => navigate('/compliance/cases')}>
            Compliance Cases
          </Button>
          . Open a case and use the "Create Payment Arrangement" action.
        </span>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter by Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            {['ALL', 'DRAFT', 'ACTIVE', 'COMPLETED', 'DEFAULTED', 'SUPERSEDED'].map((s) => (
              <Button
                key={s}
                variant={statusFilter === s ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter(s)}
              >
                {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Arrangements Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Arrangements</CardTitle>
        </CardHeader>
        <CardContent>
          {arrangements.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No arrangements found</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Arrangement #</TableHead>
                    <TableHead>Employer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total Debt</TableHead>
                    <TableHead className="text-right">Installment</TableHead>
                    <TableHead className="text-center">Progress</TableHead>
                    <TableHead>Next Due</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                    <TableHead className="text-center">Breach Health</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {arrangements.map((arr: any) => {
                    const outstanding = Number(arr.total_debt ?? 0) - Number(arr.total_paid ?? 0);
                    return (
                      <TableRow key={arr.id} className={arr.status === 'DEFAULTED' ? 'bg-destructive/5' : arr.breach_detected ? 'bg-warning/5' : ''}>
                        <TableCell className="font-medium">{arr.arrangement_number}</TableCell>
                        <TableCell>
                          <EmployerLinkChip regno={arr.employer_id} name={arr.employer_name} />
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(arr.status)}>{arr.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(Number(arr.total_debt) || 0)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(Number(arr.installment_amount) || 0)}</TableCell>
                        <TableCell className="text-center">
                          <span className="text-xs">{arr.installments_paid || 0}/{arr.number_of_installments || 0}</span>
                        </TableCell>
                        <TableCell className="text-xs whitespace-nowrap">{arr.next_due_date || '-'}</TableCell>
                        <TableCell className="text-right font-semibold text-destructive">
                          {formatCurrency(outstanding)}
                        </TableCell>
                        <TableCell>{renderBreachCell(arr)}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => setSelectedArrangementId(arr.id)} title="View arrangement details">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
