import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { PageHeader } from '@/components/common/PageHeader';
import { Search, Filter, FileText, Plus, Eye, CheckCircle, DollarSign, Users, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/utils/formatCurrency';
import { accountsPayableService } from '@/services/accountsPayableService';
import { PendingPayable } from '@/types/accountsPayable';

const PendingPayables: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [payables, setPayables] = useState<PendingPayable[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBenefitType, setFilterBenefitType] = useState<string>('all');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState<string>('all');
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedPayable, setSelectedPayable] = useState<PendingPayable | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPayables();
  }, []);

  const loadPayables = async () => {
    setLoading(true);
    const data = await accountsPayableService.getPendingPayables();
    setPayables(data);
    setLoading(false);
  };

  const filteredPayables = payables.filter(p => {
    const matchesSearch = 
      p.insuredPersonName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.insuredPersonSSN.includes(searchTerm) ||
      p.claimNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBenefitType = filterBenefitType === 'all' || p.benefitType === filterBenefitType;
    const matchesPaymentMethod = filterPaymentMethod === 'all' || p.paymentMethod === filterPaymentMethod;
    return matchesSearch && matchesBenefitType && matchesPaymentMethod;
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredPayables.map(p => p.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, id]);
    } else {
      setSelectedIds(selectedIds.filter(i => i !== id));
    }
  };

  const handleViewDetail = (payable: PendingPayable) => {
    setSelectedPayable(payable);
    setShowDetailDialog(true);
  };

  const handleCreateBatch = () => {
    if (selectedIds.length === 0) {
      toast({
        title: "No Items Selected",
        description: "Please select at least one payable item to create a batch.",
        variant: "destructive"
      });
      return;
    }
    navigate('/finance/accounts-payable/create-batch', { state: { selectedIds } });
  };

  const totalSelectedAmount = filteredPayables
    .filter(p => selectedIds.includes(p.id))
    .reduce((sum, p) => sum + p.netPayableAmount, 0);

  const benefitTypes = [...new Set(payables.map(p => p.benefitType))];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Pending Payables"
        subtitle="Approved benefit claims awaiting AP batch creation"
        breadcrumbs={[
          { label: 'Finance', href: '/finance' },
          { label: 'Accounts Payable', href: '/finance/accounts-payable' },
          { label: 'Pending Payables' }
        ]}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Pending</p>
                <p className="text-2xl font-bold">{payables.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <DollarSign className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="text-2xl font-bold">{formatCurrency(payables.reduce((s, p) => s + p.netPayableAmount, 0))}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <CheckCircle className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Selected Items</p>
                <p className="text-2xl font-bold">{selectedIds.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <DollarSign className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Selected Total</p>
                <p className="text-2xl font-bold">{formatCurrency(totalSelectedAmount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex flex-col md:flex-row gap-4 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, SSN, or claim..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterBenefitType} onValueChange={setFilterBenefitType}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Benefit Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {benefitTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterPaymentMethod} onValueChange={setFilterPaymentMethod}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Payment Method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  <SelectItem value="CHECK">Check</SelectItem>
                  <SelectItem value="DIRECT_DEPOSIT">Direct Deposit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleCreateBatch} disabled={selectedIds.length === 0}>
              <Plus className="h-4 w-4 mr-2" />
              Create AP Batch ({selectedIds.length})
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Payables Table */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Payable Items</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedIds.length === filteredPayables.length && filteredPayables.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>Claim #</TableHead>
                <TableHead>Insured Person</TableHead>
                <TableHead>SSN</TableHead>
                <TableHead>Benefit Type</TableHead>
                <TableHead>Payment Method</TableHead>
                <TableHead className="text-right">Gross Amount</TableHead>
                <TableHead className="text-right">Deductions</TableHead>
                <TableHead className="text-right">Net Amount</TableHead>
                <TableHead>Approved Date</TableHead>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-8">Loading...</TableCell>
                </TableRow>
              ) : filteredPayables.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-8">No pending payables found</TableCell>
                </TableRow>
              ) : (
                filteredPayables.map((payable) => (
                  <TableRow key={payable.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.includes(payable.id)}
                        onCheckedChange={(checked) => handleSelectOne(payable.id, !!checked)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{payable.claimNumber}</TableCell>
                    <TableCell>{payable.insuredPersonName}</TableCell>
                    <TableCell>{payable.insuredPersonSSN}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{payable.benefitType}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={payable.paymentMethod === 'DIRECT_DEPOSIT' ? 'default' : 'secondary'}>
                        {payable.paymentMethod === 'DIRECT_DEPOSIT' ? 'DD' : 'Check'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(payable.payableAmount)}</TableCell>
                    <TableCell className="text-right text-destructive">
                      {payable.deductions.length > 0 ? `-${formatCurrency(payable.deductions.reduce((s, d) => s + d.amount, 0))}` : '-'}
                    </TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(payable.netPayableAmount)}</TableCell>
                    <TableCell>{new Date(payable.approvalDate).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => handleViewDetail(payable)}>
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

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Payable Detail - {selectedPayable?.claimNumber}</DialogTitle>
          </DialogHeader>
          {selectedPayable && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground">Insured Person</label>
                  <p className="font-medium">{selectedPayable.insuredPersonName}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">SSN</label>
                  <p className="font-medium">{selectedPayable.insuredPersonSSN}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Benefit Type</label>
                  <p className="font-medium">{selectedPayable.benefitType}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Payment Method</label>
                  <p className="font-medium">{selectedPayable.paymentMethod === 'DIRECT_DEPOSIT' ? 'Direct Deposit' : 'Check'}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Gross Amount</label>
                  <p className="font-medium">{formatCurrency(selectedPayable.payableAmount)}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Net Amount</label>
                  <p className="font-medium text-green-600">{formatCurrency(selectedPayable.netPayableAmount)}</p>
                </div>
                {selectedPayable.paymentMethod === 'DIRECT_DEPOSIT' && (
                  <>
                    <div>
                      <label className="text-sm text-muted-foreground">Bank Name</label>
                      <p className="font-medium">{selectedPayable.bankName}</p>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Account Number</label>
                      <p className="font-medium">{selectedPayable.bankAccountNumber}</p>
                    </div>
                  </>
                )}
              </div>
              
              {selectedPayable.deductions.length > 0 && (
                <div>
                  <label className="text-sm text-muted-foreground">Deductions</label>
                  <div className="mt-2 space-y-2">
                    {selectedPayable.deductions.map((ded) => (
                      <div key={ded.id} className="flex justify-between p-2 bg-muted rounded">
                        <span>{ded.description}</span>
                        <span className="text-destructive">-{formatCurrency(ded.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="text-sm text-muted-foreground">Payment Reason</label>
                <p className="font-medium">{selectedPayable.paymentReason}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground">Approved By</label>
                  <p className="font-medium">{selectedPayable.approvedBy}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Approval Date</label>
                  <p className="font-medium">{new Date(selectedPayable.approvalDate).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PendingPayables;
