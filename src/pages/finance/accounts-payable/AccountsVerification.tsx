import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { PageHeader } from '@/components/common/PageHeader';
import { ArrowLeft, CheckCircle, XCircle, AlertCircle, Eye, FileText } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/utils/formatCurrency';
import { accountsPayableService } from '@/services/accountsPayableService';
import { APBatch, APItem } from '@/types/accountsPayable';

const AccountsVerification: React.FC = () => {
  const navigate = useNavigate();
  const { batchId } = useParams();
  const { toast } = useToast();
  const [batch, setBatch] = useState<APBatch | null>(null);
  const [items, setItems] = useState<APItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<APItem | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [verificationNotes, setVerificationNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (batchId) {
      loadData();
    }
  }, [batchId]);

  const loadData = async () => {
    setLoading(true);
    const batchData = await accountsPayableService.getAPBatchById(batchId!);
    const itemsData = await accountsPayableService.getAPItemsByBatchId(batchId!);
    setBatch(batchData || null);
    setItems(itemsData);
    setLoading(false);
  };

  const handleVerifyItem = async (itemId: string, action: 'APPROVED' | 'REJECTED') => {
    setSubmitting(true);
    try {
      await accountsPayableService.verifyAPItem(itemId, 'ACCOUNTS', action, verificationNotes);
      await loadData();
      setShowDetailDialog(false);
      setVerificationNotes('');
      toast({
        title: action === 'APPROVED' ? 'Item Approved' : 'Item Rejected',
        description: `Accounts verification ${action.toLowerCase()} for item.`
      });
    } catch (error) {
      toast({
        title: 'Verification Failed',
        description: 'Failed to verify item. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveAll = async () => {
    setSubmitting(true);
    try {
      const pendingItems = items.filter(i => i.accountsVerificationStatus === 'PENDING');
      for (const item of pendingItems) {
        await accountsPayableService.verifyAPItem(item.id, 'ACCOUNTS', 'APPROVED', 'Bulk approved');
      }
      await loadData();
      toast({
        title: 'All Items Approved',
        description: `${pendingItems.length} items have been approved.`
      });
    } catch (error) {
      toast({
        title: 'Verification Failed',
        description: 'Failed to approve items. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const pendingCount = items.filter(i => i.accountsVerificationStatus === 'PENDING').length;
  const approvedCount = items.filter(i => i.accountsVerificationStatus === 'APPROVED').length;
  const rejectedCount = items.filter(i => i.accountsVerificationStatus === 'REJECTED').length;

  if (loading) {
    return <div className="container mx-auto p-6 text-center py-12">Loading...</div>;
  }

  if (!batch) {
    return (
      <div className="container mx-auto p-6 text-center py-12">
        <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p>Batch not found</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Accounts Verification"
        subtitle={`Verify AP items for batch ${batch.batchNumber}`}
        breadcrumbs={[
          { label: 'Finance', href: '/finance' },
          { label: 'Accounts Payable', href: '/finance/accounts-payable' },
          { label: batch.batchNumber, href: `/finance/accounts-payable/batch/${batch.id}` },
          { label: 'Accounts Verification' }
        ]}
      />

      <Button variant="outline" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Items</p>
                <p className="text-2xl font-bold">{items.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <AlertCircle className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{pendingCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Approved</p>
                <p className="text-2xl font-bold">{approvedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-destructive/10 rounded-lg">
                <XCircle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Rejected</p>
                <p className="text-2xl font-bold">{rejectedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Verification Checklist */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Verification Checklist</CardTitle>
              <CardDescription>
                As Accounts Verification Officer, verify:
              </CardDescription>
            </div>
            {pendingCount > 0 && (
              <Button onClick={handleApproveAll} disabled={submitting}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve All Pending
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <ul className="list-disc list-inside space-y-2 text-sm mb-4">
            <li>Amounts match approved claim</li>
            <li>No duplicate payments</li>
            <li>Bank account details are valid</li>
            <li>Payee name matches records</li>
            <li>AP coding is correct</li>
          </ul>
        </CardContent>
      </Card>

      {/* Items Table */}
      <Card>
        <CardHeader>
          <CardTitle>AP Items to Verify</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Claim #</TableHead>
                <TableHead>Insured Person</TableHead>
                <TableHead>Benefit Type</TableHead>
                <TableHead>Payment Method</TableHead>
                <TableHead className="text-right">Net Amount</TableHead>
                <TableHead>Accounting Code</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-32">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.claimNumber}</TableCell>
                  <TableCell>
                    <div>
                      <p>{item.insuredPersonName}</p>
                      <p className="text-xs text-muted-foreground">{item.insuredPersonSSN}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{item.benefitType}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={item.paymentMethod === 'DIRECT_DEPOSIT' ? 'default' : 'secondary'}>
                      {item.paymentMethod === 'DIRECT_DEPOSIT' ? 'DD' : 'Check'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(item.netAmount)}</TableCell>
                  <TableCell>
                    <span className="text-xs">{item.accountingCode}</span>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={
                        item.accountsVerificationStatus === 'APPROVED' ? 'default' : 
                        item.accountsVerificationStatus === 'REJECTED' ? 'destructive' : 
                        'secondary'
                      }
                    >
                      {item.accountsVerificationStatus}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {item.accountsVerificationStatus === 'PENDING' ? (
                      <div className="flex gap-1">
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => { setSelectedItem(item); setShowDetailDialog(true); }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="text-green-600"
                          onClick={() => handleVerifyItem(item.id, 'APPROVED')}
                          disabled={submitting}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="text-destructive"
                          onClick={() => { setSelectedItem(item); setShowDetailDialog(true); }}
                          disabled={submitting}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => { setSelectedItem(item); setShowDetailDialog(true); }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Verify Item - {selectedItem?.claimNumber}</DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground">Insured Person</label>
                  <p className="font-medium">{selectedItem.insuredPersonName}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">SSN</label>
                  <p className="font-medium">{selectedItem.insuredPersonSSN}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Benefit Type</label>
                  <p className="font-medium">{selectedItem.benefitType}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Payment Method</label>
                  <p className="font-medium">{selectedItem.paymentMethod === 'DIRECT_DEPOSIT' ? 'Direct Deposit' : 'Check'}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Gross Amount</label>
                  <p className="font-medium">{formatCurrency(selectedItem.grossAmount)}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Net Amount</label>
                  <p className="font-medium text-green-600">{formatCurrency(selectedItem.netAmount)}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Accounting Code</label>
                  <p className="font-medium">{selectedItem.accountingCode}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Description</label>
                  <p className="font-medium">{selectedItem.accountingDescription}</p>
                </div>
                {selectedItem.paymentMethod === 'DIRECT_DEPOSIT' && (
                  <>
                    <div>
                      <label className="text-sm text-muted-foreground">Bank Name</label>
                      <p className="font-medium">{selectedItem.bankName}</p>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Account Number</label>
                      <p className="font-medium">{selectedItem.bankAccountNumber}</p>
                    </div>
                  </>
                )}
              </div>

              {selectedItem.deductions.length > 0 && (
                <div>
                  <label className="text-sm text-muted-foreground">Deductions</label>
                  <div className="mt-2 space-y-2">
                    {selectedItem.deductions.map((ded) => (
                      <div key={ded.id} className="flex justify-between p-2 bg-muted rounded">
                        <span>{ded.description}</span>
                        <span className="text-destructive">-{formatCurrency(ded.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedItem.accountsVerificationStatus === 'PENDING' && (
                <div>
                  <label className="text-sm text-muted-foreground">Verification Notes</label>
                  <Textarea
                    placeholder="Add notes (required for rejection)..."
                    value={verificationNotes}
                    onChange={(e) => setVerificationNotes(e.target.value)}
                    rows={3}
                    className="mt-1"
                  />
                </div>
              )}

              {selectedItem.accountsVerificationNotes && (
                <div>
                  <label className="text-sm text-muted-foreground">Previous Notes</label>
                  <p className="p-2 bg-muted rounded">{selectedItem.accountsVerificationNotes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailDialog(false)}>Close</Button>
            {selectedItem?.accountsVerificationStatus === 'PENDING' && (
              <>
                <Button 
                  variant="destructive" 
                  onClick={() => handleVerifyItem(selectedItem.id, 'REJECTED')}
                  disabled={submitting || !verificationNotes.trim()}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
                <Button 
                  onClick={() => handleVerifyItem(selectedItem.id, 'APPROVED')}
                  disabled={submitting}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AccountsVerification;
