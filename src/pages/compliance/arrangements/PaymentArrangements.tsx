import { useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Eye, Plus, HandshakeIcon, Building2 } from 'lucide-react';
import { MOCK_ARRANGEMENTS } from '@/services/mockData/complianceData';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

export default function PaymentArrangements() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedArrangement, setSelectedArrangement] = useState<any>(null);

  const [newArrangement, setNewArrangement] = useState({
    employerId: '',
    employerName: '',
    totalDebt: '',
    installmentAmount: '',
    numberOfInstallments: '',
    frequency: 'MONTHLY',
    startDate: '',
  });

  const filteredArrangements = statusFilter === 'ALL'
    ? MOCK_ARRANGEMENTS
    : MOCK_ARRANGEMENTS.filter(a => a.status === statusFilter);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      DRAFT: 'bg-muted text-muted-foreground',
      ACTIVE: 'bg-success/10 text-success',
      COMPLETED: 'bg-primary/10 text-primary',
      DEFAULTED: 'bg-destructive/10 text-destructive',
      CANCELLED: 'bg-muted text-muted-foreground',
    };
    return colors[status] || 'bg-muted text-muted-foreground';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'XCD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const handleCreateArrangement = () => {
    if (!newArrangement.employerId || !newArrangement.totalDebt || !newArrangement.installmentAmount) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Arrangement Created',
      description: `Payment arrangement created for ${newArrangement.employerName}`,
    });

    setCreateDialogOpen(false);
    setNewArrangement({
      employerId: '',
      employerName: '',
      totalDebt: '',
      installmentAmount: '',
      numberOfInstallments: '',
      frequency: 'MONTHLY',
      startDate: '',
    });
  };

  const handleViewArrangement = (arrangement: any) => {
    setSelectedArrangement(arrangement);
    setViewDialogOpen(true);
  };

  const handleViewEmployerProfile = (employerId: string) => {
    navigate(`/employers/${employerId}`);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Payment Arrangements"
        subtitle="Manage payment arrangements and installment tracking"
        breadcrumbs={[
          { label: 'Compliance', href: '/compliance/dashboard' },
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

      {/* Actions */}
      <div className="flex justify-end">
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Arrangement
        </Button>
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
              All
            </Button>
            <Button
              variant={statusFilter === 'ACTIVE' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('ACTIVE')}
            >
              Active
            </Button>
            <Button
              variant={statusFilter === 'COMPLETED' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('COMPLETED')}
            >
              Completed
            </Button>
            <Button
              variant={statusFilter === 'DEFAULTED' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('DEFAULTED')}
            >
              Defaulted
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Arrangements Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Arrangements</CardTitle>
        </CardHeader>
        <CardContent>
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
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredArrangements.map((arrangement) => (
                <TableRow key={arrangement.id}>
                  <TableCell className="font-medium">{arrangement.arrangementNumber}</TableCell>
                  <TableCell>
                    <Button
                      variant="link"
                      className="h-auto p-0 text-left font-normal hover:text-primary"
                      onClick={() => handleViewEmployerProfile(arrangement.employerId)}
                    >
                      <Building2 className="h-4 w-4 mr-2 inline" />
                      {arrangement.employerName}
                    </Button>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(arrangement.status)}>
                      {arrangement.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(arrangement.totalDebtAmount)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(arrangement.installmentAmount)}</TableCell>
                  <TableCell className="text-center">
                    {arrangement.installmentsPaid}/{arrangement.numberOfInstallments}
                  </TableCell>
                  <TableCell>{arrangement.nextDueDate || '-'}</TableCell>
                  <TableCell className="text-right font-semibold text-red-600">
                    {formatCurrency(arrangement.outstandingBalance)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewArrangement(arrangement)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Arrangement Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Payment Arrangement</DialogTitle>
            <DialogDescription>
              Set up a new payment arrangement for an employer
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="employer">Employer *</Label>
                <Input
                  id="employer"
                  placeholder="Search and select employer..."
                  value={newArrangement.employerName}
                  onChange={(e) => setNewArrangement(prev => ({ 
                    ...prev, 
                    employerName: e.target.value,
                    employerId: 'EMP-' + Math.random().toString(36).substr(2, 9)
                  }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="totalDebt">Total Debt (EC$) *</Label>
                <Input
                  id="totalDebt"
                  type="number"
                  placeholder="0.00"
                  value={newArrangement.totalDebt}
                  onChange={(e) => setNewArrangement(prev => ({ ...prev, totalDebt: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="installment">Installment Amount (EC$) *</Label>
                <Input
                  id="installment"
                  type="number"
                  placeholder="0.00"
                  value={newArrangement.installmentAmount}
                  onChange={(e) => setNewArrangement(prev => ({ ...prev, installmentAmount: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="numInstallments">Number of Installments *</Label>
                <Input
                  id="numInstallments"
                  type="number"
                  placeholder="12"
                  value={newArrangement.numberOfInstallments}
                  onChange={(e) => setNewArrangement(prev => ({ ...prev, numberOfInstallments: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="frequency">Payment Frequency *</Label>
                <Select
                  value={newArrangement.frequency}
                  onValueChange={(value) => setNewArrangement(prev => ({ ...prev, frequency: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WEEKLY">Weekly</SelectItem>
                    <SelectItem value="BIWEEKLY">Bi-Weekly</SelectItem>
                    <SelectItem value="MONTHLY">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={newArrangement.startDate}
                  onChange={(e) => setNewArrangement(prev => ({ ...prev, startDate: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateArrangement}>
              <HandshakeIcon className="h-4 w-4 mr-2" />
              Create Arrangement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Arrangement Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Payment Arrangement Details</DialogTitle>
            <DialogDescription>
              {selectedArrangement?.arrangementNumber}
            </DialogDescription>
          </DialogHeader>

          {selectedArrangement && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Employer</Label>
                  <Button
                    variant="link"
                    className="h-auto p-0 font-medium"
                    onClick={() => handleViewEmployerProfile(selectedArrangement.employerId)}
                  >
                    <Building2 className="h-4 w-4 mr-2" />
                    {selectedArrangement.employerName}
                  </Button>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <div className="mt-1">
                    <Badge className={getStatusColor(selectedArrangement.status)}>
                      {selectedArrangement.status}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Total Debt</Label>
                  <p className="font-medium text-lg">{formatCurrency(selectedArrangement.totalDebtAmount)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Outstanding Balance</Label>
                  <p className="font-medium text-lg text-red-600">{formatCurrency(selectedArrangement.outstandingBalance)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Installment Amount</Label>
                  <p className="font-medium">{formatCurrency(selectedArrangement.installmentAmount)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Frequency</Label>
                  <p className="font-medium">{selectedArrangement.frequency}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Start Date</Label>
                  <p className="font-medium">{selectedArrangement.startDate}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Next Due Date</Label>
                  <p className="font-medium">{selectedArrangement.nextDueDate || 'N/A'}</p>
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground">Payment Progress</Label>
                <Card className="mt-2">
                  <CardContent className="pt-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm">Installments Paid</span>
                      <span className="font-semibold">
                        {selectedArrangement.installmentsPaid}/{selectedArrangement.numberOfInstallments}
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ 
                          width: `${(selectedArrangement.installmentsPaid / selectedArrangement.numberOfInstallments) * 100}%` 
                        }}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {selectedArrangement.terms && (
                <div>
                  <Label className="text-muted-foreground">Terms & Conditions</Label>
                  <Card className="mt-2">
                    <CardContent className="pt-4">
                      <p className="text-sm">{selectedArrangement.terms}</p>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
