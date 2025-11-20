import { useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Eye, AlertTriangle, CheckCircle, Plus } from 'lucide-react';
import { MOCK_ARRANGEMENTS } from '@/services/mockData/complianceData';

export default function PaymentArrangements() {
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const filteredArrangements = statusFilter === 'ALL'
    ? MOCK_ARRANGEMENTS
    : MOCK_ARRANGEMENTS.filter(a => a.status === statusFilter);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      DRAFT: 'bg-gray-100 text-gray-800',
      ACTIVE: 'bg-green-100 text-green-800',
      COMPLETED: 'bg-teal-100 text-teal-800',
      DEFAULTED: 'bg-red-100 text-red-800',
      CANCELLED: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'XCD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Payment Arrangements"
        subtitle="Manage payment arrangements and installment tracking"
        breadcrumbs={[
          { label: 'Compliance', href: '/compliance' },
          { label: 'Payment Arrangements' }
        ]}
      />

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Arrangements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{MOCK_ARRANGEMENTS.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {MOCK_ARRANGEMENTS.filter(a => a.status === 'ACTIVE').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Defaulted
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {MOCK_ARRANGEMENTS.filter(a => a.status === 'DEFAULTED').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Outstanding
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {formatCurrency(MOCK_ARRANGEMENTS.reduce((sum, a) => sum + a.outstandingBalance, 0))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Filter by Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={statusFilter === 'ALL' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('ALL')}
            >
              All Arrangements
            </Button>
            {['ACTIVE', 'DEFAULTED', 'COMPLETED', 'DRAFT'].map(status => (
              <Button
                key={status}
                variant={statusFilter === status ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter(status)}
              >
                {status}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Arrangements Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Payment Arrangements ({filteredArrangements.length})</CardTitle>
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Create Arrangement
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Arrangement #</TableHead>
                <TableHead>Employer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Total Debt</TableHead>
                <TableHead>Down Payment</TableHead>
                <TableHead>Installments</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Next Due</TableHead>
                <TableHead>Outstanding</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredArrangements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground">
                    No arrangements found
                  </TableCell>
                </TableRow>
              ) : (
                filteredArrangements.map((arr) => (
                  <TableRow key={arr.id}>
                    <TableCell className="font-medium">{arr.arrangementNumber}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{arr.employerName}</div>
                        <div className="text-xs text-muted-foreground">
                          Case: {arr.caseId}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getStatusColor(arr.status)}>
                        {arr.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(arr.totalDebtAmount)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {arr.downPaymentPaid ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-yellow-600" />
                        )}
                        {formatCurrency(arr.downPaymentAmount)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {arr.installmentsPaid} / {arr.numberOfInstallments}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 min-w-[60px]">
                          <div
                            className={`h-2 rounded-full ${
                              arr.status === 'DEFAULTED' ? 'bg-red-600' : 'bg-green-600'
                            }`}
                            style={{
                              width: `${(arr.installmentsPaid / arr.numberOfInstallments) * 100}%`,
                            }}
                          />
                        </div>
                        <div className="text-xs text-muted-foreground min-w-[40px]">
                          {Math.round((arr.installmentsPaid / arr.numberOfInstallments) * 100)}%
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {arr.nextDueDate ? (
                        <div className="text-sm">
                          {new Date(arr.nextDueDate).toLocaleDateString()}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(arr.outstandingBalance)}
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
