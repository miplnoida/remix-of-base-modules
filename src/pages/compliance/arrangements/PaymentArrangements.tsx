import { useState } from 'react';
import { ArrangementDetailPanel } from '@/components/compliance/ArrangementDetailPanel';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Eye, Building2, Loader2, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchPaymentArrangements } from '@/services/complianceDataService';

export default function PaymentArrangements() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedArrangementId, setSelectedArrangementId] = useState<string | null>(null);

  const { data: arrangements = [], isLoading } = useQuery({
    queryKey: ['ce_payment_arrangements', statusFilter],
    queryFn: () => fetchPaymentArrangements({ status: statusFilter }),
  });

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
      />

      {/* KPI cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Arrangements</CardTitle>
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
            <div className="text-2xl font-bold text-foreground">{formatCurrency(totalOutstanding)}</div>
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Arrangement #</TableHead>
                  <TableHead>Employer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total Debt</TableHead>
                  <TableHead className="text-right">Installment</TableHead>
                  <TableHead className="text-center">Installments</TableHead>
                  <TableHead>Next Due</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                  <TableHead className="text-center">Breach</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {arrangements.map((arr: any) => {
                  const outstanding = Number(arr.total_debt ?? 0) - Number(arr.total_paid ?? 0);
                  return (
                    <TableRow key={arr.id} className={arr.status === 'DEFAULTED' ? 'bg-destructive/5' : ''}>
                      <TableCell className="font-medium">{arr.arrangement_number}</TableCell>
                      <TableCell>
                        <Button
                          variant="link"
                          className="h-auto p-0 text-left font-normal hover:text-primary"
                          onClick={() => navigate(`/employers/${arr.employer_id}`)}
                        >
                          <Building2 className="h-4 w-4 mr-2 inline" />
                          {arr.employer_name}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(arr.status)}>{arr.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(Number(arr.total_debt) || 0)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(Number(arr.installment_amount) || 0)}</TableCell>
                      <TableCell className="text-center">
                        {arr.installments_paid || 0}/{arr.number_of_installments || 0}
                      </TableCell>
                      <TableCell>{arr.next_due_date || '-'}</TableCell>
                      <TableCell className="text-right font-semibold text-destructive">
                        {formatCurrency(outstanding)}
                      </TableCell>
                      <TableCell className="text-center">
                        {arr.breach_detected ? (
                          <Badge variant="destructive" className="text-xs">⚠</Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => setSelectedArrangementId(arr.id)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
