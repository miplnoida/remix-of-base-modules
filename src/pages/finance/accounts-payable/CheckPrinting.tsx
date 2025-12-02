import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { PageHeader } from '@/components/common/PageHeader';
import { ArrowLeft, Printer, Eye, AlertCircle, CheckCircle, FileText, RotateCcw } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/utils/formatCurrency';
import { accountsPayableService } from '@/services/accountsPayableService';
import { APBatch, APItem, CheckPrintJob } from '@/types/accountsPayable';

const CheckPrinting: React.FC = () => {
  const navigate = useNavigate();
  const { batchId } = useParams();
  const { toast } = useToast();
  const [batch, setBatch] = useState<APBatch | null>(null);
  const [items, setItems] = useState<APItem[]>([]);
  const [printJobs, setPrintJobs] = useState<CheckPrintJob[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [checkStartNumber, setCheckStartNumber] = useState<number>(10001);
  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [previewItem, setPreviewItem] = useState<APItem | null>(null);

  useEffect(() => {
    if (batchId) {
      loadData();
    }
  }, [batchId]);

  const loadData = async () => {
    setLoading(true);
    const batchData = await accountsPayableService.getAPBatchById(batchId!);
    const itemsData = await accountsPayableService.getAPItemsByBatchId(batchId!);
    const jobsData = await accountsPayableService.getCheckPrintJobs();
    
    setBatch(batchData || null);
    setItems(itemsData.filter(i => i.paymentMethod === 'CHECK'));
    setPrintJobs(jobsData.filter(j => j.batchId === batchId));
    setLoading(false);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(items.filter(i => !i.checkNumber).map(i => i.id));
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

  const handlePrintChecks = async () => {
    if (selectedIds.length === 0) {
      toast({
        title: "No Items Selected",
        description: "Please select items to print checks for.",
        variant: "destructive"
      });
      return;
    }

    setPrinting(true);
    try {
      const job = await accountsPayableService.createCheckPrintJob(batchId!, checkStartNumber);
      await loadData();
      toast({
        title: "Checks Printed Successfully",
        description: `Printed ${job.totalChecks} checks (${job.checkStartNumber} - ${job.checkEndNumber})`,
      });
    } catch (error) {
      toast({
        title: "Print Failed",
        description: "Failed to print checks. Please try again.",
        variant: "destructive"
      });
    } finally {
      setPrinting(false);
    }
  };

  const unprintedItems = items.filter(i => !i.checkNumber);
  const printedItems = items.filter(i => i.checkNumber);
  const totalAmount = items.reduce((s, i) => s + i.netAmount, 0);

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
        title="Check Printing"
        subtitle={`Print checks for batch ${batch.batchNumber}`}
        breadcrumbs={[
          { label: 'Finance', href: '/finance' },
          { label: 'Accounts Payable', href: '/finance/accounts-payable' },
          { label: batch.batchNumber, href: `/finance/accounts-payable/batch/${batch.id}` },
          { label: 'Check Printing' }
        ]}
      />

      <Button variant="outline" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Print Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Printer className="h-5 w-5" />
              Print Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Starting Check Number</Label>
              <Input
                type="number"
                value={checkStartNumber}
                onChange={(e) => setCheckStartNumber(parseInt(e.target.value) || 0)}
                min={1}
              />
            </div>

            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span>Selected Items:</span>
                <span className="font-medium">{selectedIds.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Check Range:</span>
                <span className="font-medium">
                  {checkStartNumber} - {checkStartNumber + selectedIds.length - 1}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Total Amount:</span>
                <span className="font-medium">
                  {formatCurrency(items.filter(i => selectedIds.includes(i.id)).reduce((s, i) => s + i.netAmount, 0))}
                </span>
              </div>
            </div>

            <Button 
              className="w-full" 
              onClick={handlePrintChecks}
              disabled={printing || selectedIds.length === 0}
            >
              <Printer className="h-4 w-4 mr-2" />
              {printing ? 'Printing...' : `Print ${selectedIds.length} Checks`}
            </Button>
          </CardContent>
        </Card>

        {/* Summary & History */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Batch Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Total Checks</p>
                <p className="text-xl font-bold">{items.length}</p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Unprinted</p>
                <p className="text-xl font-bold text-amber-500">{unprintedItems.length}</p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Printed</p>
                <p className="text-xl font-bold text-green-500">{printedItems.length}</p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="text-xl font-bold">{formatCurrency(totalAmount)}</p>
              </div>
            </div>

            {printJobs.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Print History</h4>
                <div className="space-y-2">
                  {printJobs.map((job) => (
                    <div key={job.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">Checks {job.checkStartNumber} - {job.checkEndNumber}</p>
                        <p className="text-sm text-muted-foreground">
                          {job.totalChecks} checks • {formatCurrency(job.totalAmount)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm">{job.printedByName}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(job.printedAt).toLocaleString()}
                        </p>
                      </div>
                      <Badge variant={job.status === 'COMPLETED' ? 'default' : 'secondary'}>
                        {job.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Check Items Table */}
      <Card>
        <CardHeader>
          <CardTitle>Check Items</CardTitle>
          <CardDescription>Select items to print checks for</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedIds.length === unprintedItems.length && unprintedItems.length > 0}
                    onCheckedChange={handleSelectAll}
                    disabled={unprintedItems.length === 0}
                  />
                </TableHead>
                <TableHead>Check #</TableHead>
                <TableHead>Claim #</TableHead>
                <TableHead>Payee Name</TableHead>
                <TableHead>Benefit Type</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">No check items found</TableCell>
                </TableRow>
              ) : (
                items.map((item, index) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      {!item.checkNumber && (
                        <Checkbox
                          checked={selectedIds.includes(item.id)}
                          onCheckedChange={(checked) => handleSelectOne(item.id, !!checked)}
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      {item.checkNumber ? (
                        <Badge variant="outline">{item.checkNumber}</Badge>
                      ) : (
                        <span className="text-muted-foreground">
                          {selectedIds.includes(item.id) ? checkStartNumber + selectedIds.indexOf(item.id) : '-'}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{item.claimNumber}</TableCell>
                    <TableCell>{item.insuredPersonName}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.benefitType}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(item.netAmount)}</TableCell>
                    <TableCell>
                      {item.checkNumber ? (
                        <Badge variant="default" className="flex items-center gap-1 w-fit">
                          <CheckCircle className="h-3 w-3" />
                          Printed
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Unprinted</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => { setPreviewItem(item); setShowPreviewDialog(true); }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {item.checkNumber && (
                          <Button size="sm" variant="ghost" title="Reprint">
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Check Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Check Preview</DialogTitle>
          </DialogHeader>
          {previewItem && (
            <div className="border-2 border-dashed rounded-lg p-6 bg-muted/30">
              <div className="text-center mb-4">
                <h3 className="text-lg font-bold">Social Security Board</h3>
                <p className="text-sm text-muted-foreground">St. Kitts & Nevis</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-medium">{new Date().toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Check #</p>
                  <p className="font-medium">{previewItem.checkNumber || 'TBD'}</p>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm text-muted-foreground">Pay to the Order of</p>
                <p className="text-xl font-bold border-b pb-2">{previewItem.insuredPersonName}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-muted-foreground">Amount</p>
                  <p className="text-2xl font-bold">{formatCurrency(previewItem.netAmount)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Reference</p>
                  <p className="font-medium">{previewItem.claimNumber}</p>
                </div>
              </div>

              <div className="text-center pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  For: {previewItem.benefitType} - {previewItem.description}
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreviewDialog(false)}>Close</Button>
            <Button onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CheckPrinting;
