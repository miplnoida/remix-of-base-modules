import { useState } from 'react';
import { EmployerComplianceSummaryCard } from '@/components/compliance/EmployerComplianceSummaryCard';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, Plus, HandshakeIcon, Building2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchPaymentArrangements } from '@/services/complianceDataService';

export default function PaymentArrangements() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedArrangement, setSelectedArrangement] = useState<any>(null);
  const [newArrangement, setNewArrangement] = useState({ employerId: '', employerName: '', totalDebt: '', installmentAmount: '', numberOfInstallments: '', frequency: 'MONTHLY', startDate: '' });

  const { data: arrangements = [], isLoading } = useQuery({
    queryKey: ['ce_payment_arrangements', statusFilter],
    queryFn: () => fetchPaymentArrangements({ status: statusFilter }),
  });

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = { DRAFT: 'bg-muted text-muted-foreground', ACTIVE: 'bg-success/10 text-success', COMPLETED: 'bg-primary/10 text-primary', DEFAULTED: 'bg-destructive/10 text-destructive', CANCELLED: 'bg-muted text-muted-foreground' };
    return colors[status] || 'bg-muted text-muted-foreground';
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'XCD', minimumFractionDigits: 2 }).format(amount);

  const handleCreateArrangement = () => {
    if (!newArrangement.employerId || !newArrangement.totalDebt || !newArrangement.installmentAmount) {
      toast({ title: 'Missing Information', description: 'Please fill in all required fields', variant: 'destructive' });
      return;
    }
    toast({ title: 'Arrangement Created', description: `Payment arrangement created for ${newArrangement.employerName}` });
    setCreateDialogOpen(false);
    setNewArrangement({ employerId: '', employerName: '', totalDebt: '', installmentAmount: '', numberOfInstallments: '', frequency: 'MONTHLY', startDate: '' });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const activeCount = arrangements.filter((a: any) => a.status === 'ACTIVE').length;
  const defaultedCount = arrangements.filter((a: any) => a.status === 'DEFAULTED').length;
  const totalOutstanding = arrangements.reduce((sum: number, a: any) => sum + (Number(a.outstanding_balance) || 0), 0);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader title="Payment Arrangements" subtitle="Manage payment arrangements and installment tracking" breadcrumbs={[{ label: 'Compliance', href: '/compliance/dashboard' }, { label: 'Payment Arrangements' }]} />

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-muted-foreground">Total Arrangements</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-foreground">{arrangements.length}</div></CardContent></Card>
        <Card><CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-green-600">{activeCount}</div></CardContent></Card>
        <Card><CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-muted-foreground">Defaulted</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-red-600">{defaultedCount}</div></CardContent></Card>
        <Card><CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-muted-foreground">Total Outstanding</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-foreground">{formatCurrency(totalOutstanding)}</div></CardContent></Card>
      </div>

      <div className="flex justify-end"><Button onClick={() => setCreateDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />Create Arrangement</Button></div>

      <Card>
        <CardHeader><CardTitle>Filter by Status</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            {['ALL', 'ACTIVE', 'COMPLETED', 'DEFAULTED'].map(s => (
              <Button key={s} variant={statusFilter === s ? 'default' : 'outline'} size="sm" onClick={() => setStatusFilter(s)}>{s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}</Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Payment Arrangements</CardTitle></CardHeader>
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
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {arrangements.map((arr: any) => (
                  <TableRow key={arr.id}>
                    <TableCell className="font-medium">{arr.arrangement_number}</TableCell>
                    <TableCell>
                      <Button variant="link" className="h-auto p-0 text-left font-normal hover:text-primary" onClick={() => navigate(`/employers/${arr.employer_id}`)}>
                        <Building2 className="h-4 w-4 mr-2 inline" />{arr.employer_name}
                      </Button>
                    </TableCell>
                    <TableCell><Badge className={getStatusColor(arr.status)}>{arr.status}</Badge></TableCell>
                    <TableCell className="text-right">{formatCurrency(Number(arr.total_debt_amount) || 0)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(Number(arr.installment_amount) || 0)}</TableCell>
                    <TableCell className="text-center">{arr.installments_paid || 0}/{arr.number_of_installments || 0}</TableCell>
                    <TableCell>{arr.next_due_date || '-'}</TableCell>
                    <TableCell className="text-right font-semibold text-red-600">{formatCurrency(Number(arr.outstanding_balance) || 0)}</TableCell>
                    <TableCell className="text-right"><Button variant="ghost" size="sm" onClick={() => { setSelectedArrangement(arr); setViewDialogOpen(true); }}><Eye className="h-4 w-4" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Create Payment Arrangement</DialogTitle><DialogDescription>Set up a new payment arrangement for an employer</DialogDescription></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label htmlFor="employer">Employer *</Label><Input id="employer" placeholder="Search and select employer..." value={newArrangement.employerName} onChange={(e) => setNewArrangement(prev => ({ ...prev, employerName: e.target.value, employerId: 'EMP-' + Math.random().toString(36).substr(2, 9) }))} /></div>
              <div className="space-y-2"><Label htmlFor="totalDebt">Total Debt (EC$) *</Label><Input id="totalDebt" type="number" placeholder="0.00" value={newArrangement.totalDebt} onChange={(e) => setNewArrangement(prev => ({ ...prev, totalDebt: e.target.value }))} /></div>
              <div className="space-y-2"><Label htmlFor="installment">Installment Amount (EC$) *</Label><Input id="installment" type="number" placeholder="0.00" value={newArrangement.installmentAmount} onChange={(e) => setNewArrangement(prev => ({ ...prev, installmentAmount: e.target.value }))} /></div>
              <div className="space-y-2"><Label htmlFor="numInstallments">Number of Installments *</Label><Input id="numInstallments" type="number" placeholder="12" value={newArrangement.numberOfInstallments} onChange={(e) => setNewArrangement(prev => ({ ...prev, numberOfInstallments: e.target.value }))} /></div>
              <div className="space-y-2"><Label htmlFor="frequency">Payment Frequency *</Label><Select value={newArrangement.frequency} onValueChange={(v) => setNewArrangement(prev => ({ ...prev, frequency: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="WEEKLY">Weekly</SelectItem><SelectItem value="BIWEEKLY">Bi-Weekly</SelectItem><SelectItem value="MONTHLY">Monthly</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label htmlFor="startDate">Start Date *</Label><Input id="startDate" type="date" value={newArrangement.startDate} onChange={(e) => setNewArrangement(prev => ({ ...prev, startDate: e.target.value }))} /></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button><Button onClick={handleCreateArrangement}><HandshakeIcon className="h-4 w-4 mr-2" />Create Arrangement</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Payment Arrangement Details</DialogTitle><DialogDescription>{selectedArrangement?.arrangement_number}</DialogDescription></DialogHeader>
          {selectedArrangement && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-muted-foreground">Employer</Label><p className="font-medium">{selectedArrangement.employer_name}</p></div>
                <div><Label className="text-muted-foreground">Status</Label><div className="mt-1"><Badge className={getStatusColor(selectedArrangement.status)}>{selectedArrangement.status}</Badge></div></div>
                <div><Label className="text-muted-foreground">Total Debt</Label><p className="font-medium text-lg">{formatCurrency(Number(selectedArrangement.total_debt_amount) || 0)}</p></div>
                <div><Label className="text-muted-foreground">Outstanding Balance</Label><p className="font-medium text-lg text-red-600">{formatCurrency(Number(selectedArrangement.outstanding_balance) || 0)}</p></div>
                <div><Label className="text-muted-foreground">Installment Amount</Label><p className="font-medium">{formatCurrency(Number(selectedArrangement.installment_amount) || 0)}</p></div>
                <div><Label className="text-muted-foreground">Frequency</Label><p className="font-medium">{selectedArrangement.frequency}</p></div>
                <div><Label className="text-muted-foreground">Start Date</Label><p className="font-medium">{selectedArrangement.start_date || '-'}</p></div>
                <div><Label className="text-muted-foreground">Next Due Date</Label><p className="font-medium">{selectedArrangement.next_due_date || 'N/A'}</p></div>
              </div>
              <div>
                <Label className="text-muted-foreground">Payment Progress</Label>
                <Card className="mt-2"><CardContent className="pt-4">
                  <div className="flex justify-between items-center mb-2"><span className="text-sm">Installments Paid</span><span className="font-semibold">{selectedArrangement.installments_paid || 0}/{selectedArrangement.number_of_installments || 0}</span></div>
                  <div className="w-full bg-muted rounded-full h-2"><div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${((selectedArrangement.installments_paid || 0) / (selectedArrangement.number_of_installments || 1)) * 100}%` }} /></div>
                </CardContent></Card>
              </div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setViewDialogOpen(false)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
