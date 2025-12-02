import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { PageHeader } from '@/components/common/PageHeader';
import { ArrowLeft, FileText, CheckCircle, Clock, Printer, Download, AlertCircle, History, AlertTriangle, Eye } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/utils/formatCurrency';
import { accountsPayableService, VerificationException } from '@/services/accountsPayableService';
import { APBatch, APItem, APBatchStatus } from '@/types/accountsPayable';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const statusConfig: Record<APBatchStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; color: string }> = {
  'DRAFT': { label: 'Draft', variant: 'outline', color: 'text-muted-foreground' },
  'PENDING_VERIFICATION': { label: 'Pending Verification', variant: 'secondary', color: 'text-amber-500' },
  'ACCOUNTS_VERIFIED': { label: 'Accounts Verified', variant: 'secondary', color: 'text-blue-500' },
  'BENEFITS_VERIFIED': { label: 'Benefits Verified', variant: 'default', color: 'text-green-500' },
  'READY_FOR_CHECK_PRINTING': { label: 'Ready for Check Printing', variant: 'default', color: 'text-green-500' },
  'READY_FOR_DIRECT_DEPOSIT': { label: 'Ready for Direct Deposit', variant: 'default', color: 'text-green-500' },
  'CHECKS_PRINTED': { label: 'Checks Printed', variant: 'default', color: 'text-green-600' },
  'DD_FILE_GENERATED': { label: 'DD File Generated', variant: 'default', color: 'text-green-600' },
  'POSTED': { label: 'Posted', variant: 'default', color: 'text-green-700' },
  'REVERSED': { label: 'Reversed', variant: 'destructive', color: 'text-destructive' }
};

const APBatchDetail: React.FC = () => {
  const navigate = useNavigate();
  const { batchId } = useParams();
  const { toast } = useToast();
  const [batch, setBatch] = useState<APBatch | null>(null);
  const [items, setItems] = useState<APItem[]>([]);
  const [exceptions, setExceptions] = useState<VerificationException[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<APItem | null>(null);
  const [showItemDetail, setShowItemDetail] = useState(false);

  useEffect(() => {
    if (batchId) {
      loadBatchData();
    }
  }, [batchId]);

  const loadBatchData = async () => {
    setLoading(true);
    const batchData = await accountsPayableService.getAPBatchById(batchId!);
    const itemsData = await accountsPayableService.getAPItemsByBatchId(batchId!);
    const exceptionsData = await accountsPayableService.runVerificationChecks(batchId!);
    setBatch(batchData || null);
    setItems(itemsData);
    setExceptions(exceptionsData);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4 md:p-6">
        <div className="text-center py-12">Loading batch details...</div>
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="container mx-auto p-4 md:p-6">
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p>Batch not found</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const statusInfo = statusConfig[batch.status];
  const checkItems = items.filter(i => i.paymentMethod === 'CHECK');
  const ddItems = items.filter(i => i.paymentMethod === 'DIRECT_DEPOSIT');
  const errorExceptions = exceptions.filter(e => e.severity === 'ERROR');
  const warningExceptions = exceptions.filter(e => e.severity === 'WARNING');

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-4 md:space-y-6">
      <PageHeader
        title={`AP Batch ${batch.batchNumber}`}
        subtitle="View batch details and manage verification"
        breadcrumbs={[
          { label: 'Finance', href: '/finance' },
          { label: 'Accounts Payable', href: '/finance/accounts-payable' },
          { label: 'Batches', href: '/finance/accounts-payable/batches' },
          { label: batch.batchNumber }
        ]}
      />

      <Button variant="outline" onClick={() => navigate(-1)} className="w-full sm:w-auto">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Batches
      </Button>

      {/* Exception Alert */}
      {(errorExceptions.length > 0 || warningExceptions.length > 0) && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm md:text-base">Verification Exceptions Detected</p>
                <p className="text-xs md:text-sm text-muted-foreground">
                  {errorExceptions.length} errors, {warningExceptions.length} warnings found
                </p>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate(`/finance/accounts-payable/exceptions/${batch.id}`)}
                className="w-full sm:w-auto"
              >
                View Exceptions
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Batch Summary */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-6">
        <Card className="xl:col-span-2">
          <CardHeader className="pb-2 md:pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="min-w-0">
                <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                  <FileText className="h-4 w-4 md:h-5 md:w-5 flex-shrink-0" />
                  <span className="truncate">{batch.batchNumber}</span>
                </CardTitle>
                <CardDescription className="text-xs md:text-sm">
                  Batch Date: {new Date(batch.batchDate).toLocaleDateString()}
                </CardDescription>
              </div>
              <Badge variant={statusInfo.variant} className="text-xs md:text-sm w-fit">
                {statusInfo.label}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 md:space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
              <div className="p-3 md:p-4 bg-muted rounded-lg">
                <p className="text-xs md:text-sm text-muted-foreground truncate">Total Items</p>
                <p className="text-lg md:text-2xl font-bold">{batch.totalItems}</p>
              </div>
              <div className="p-3 md:p-4 bg-muted rounded-lg">
                <p className="text-xs md:text-sm text-muted-foreground truncate">Gross Amount</p>
                <p className="text-lg md:text-2xl font-bold truncate">{formatCurrency(batch.totalAmount)}</p>
              </div>
              <div className="p-3 md:p-4 bg-muted rounded-lg">
                <p className="text-xs md:text-sm text-muted-foreground truncate">Deductions</p>
                <p className="text-lg md:text-2xl font-bold text-destructive truncate">-{formatCurrency(batch.totalDeductions)}</p>
              </div>
              <div className="p-3 md:p-4 bg-green-500/10 rounded-lg">
                <p className="text-xs md:text-sm text-muted-foreground truncate">Net Amount</p>
                <p className="text-lg md:text-2xl font-bold text-green-600 truncate">{formatCurrency(batch.netAmount)}</p>
              </div>
            </div>

            {/* Payment Method Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
              <div className="p-3 md:p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Printer className="h-4 w-4 flex-shrink-0" />
                  <span className="font-medium text-sm md:text-base">Check Payments</span>
                </div>
                <p className="text-base md:text-lg font-bold">{checkItems.length} items</p>
                <p className="text-xs md:text-sm text-muted-foreground truncate">
                  {formatCurrency(checkItems.reduce((s, i) => s + i.netAmount, 0))}
                </p>
              </div>
              <div className="p-3 md:p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Download className="h-4 w-4 flex-shrink-0" />
                  <span className="font-medium text-sm md:text-base">Direct Deposits</span>
                </div>
                <p className="text-base md:text-lg font-bold">{ddItems.length} items</p>
                <p className="text-xs md:text-sm text-muted-foreground truncate">
                  {formatCurrency(ddItems.reduce((s, i) => s + i.netAmount, 0))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Workflow Status */}
        <Card>
          <CardHeader className="pb-2 md:pb-4">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <History className="h-4 w-4 md:h-5 md:w-5" />
              Workflow Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <WorkflowStep
                completed={true}
                title="Created"
                user={batch.createdByName}
                date={batch.createdAt}
              />
              <WorkflowStep
                completed={!!batch.accountsVerifiedAt}
                title="Accounts Verification"
                user={batch.accountsVerifiedByName}
                date={batch.accountsVerifiedAt}
              />
              <WorkflowStep
                completed={!!batch.benefitsVerifiedAt}
                title="Benefits Verification"
                user={batch.benefitsVerifiedByName}
                date={batch.benefitsVerifiedAt}
              />
              {batch.postedAt && (
                <WorkflowStep
                  completed={true}
                  title="Posted"
                  user={batch.postedByName}
                  date={batch.postedAt}
                />
              )}
            </div>

            {/* Action Buttons */}
            <div className="pt-4 border-t space-y-2">
              {batch.status === 'PENDING_VERIFICATION' && (
                <Button className="w-full text-sm" onClick={() => navigate(`/finance/accounts-payable/verify-accounts/${batch.id}`)}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Accounts Verification
                </Button>
              )}
              {batch.status === 'ACCOUNTS_VERIFIED' && (
                <Button className="w-full text-sm" onClick={() => navigate(`/finance/accounts-payable/verify-benefits/${batch.id}`)}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Benefits Verification
                </Button>
              )}
              {['BENEFITS_VERIFIED', 'READY_FOR_CHECK_PRINTING'].includes(batch.status) && checkItems.length > 0 && (
                <Button className="w-full text-sm" onClick={() => navigate(`/finance/accounts-payable/print-checks/${batch.id}`)}>
                  <Printer className="h-4 w-4 mr-2" />
                  Print Checks
                </Button>
              )}
              {['BENEFITS_VERIFIED', 'READY_FOR_DIRECT_DEPOSIT'].includes(batch.status) && ddItems.length > 0 && (
                <Button className="w-full text-sm" variant="outline" onClick={() => navigate(`/finance/accounts-payable/generate-dd/${batch.id}`)}>
                  <Download className="h-4 w-4 mr-2" />
                  Generate DD File
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Items Tabs */}
      <Card>
        <CardContent className="p-0">
          <Tabs defaultValue="all">
            <div className="p-3 md:p-4 border-b overflow-x-auto">
              <TabsList className="w-full sm:w-auto">
                <TabsTrigger value="all" className="text-xs md:text-sm">All ({items.length})</TabsTrigger>
                <TabsTrigger value="checks" className="text-xs md:text-sm">Checks ({checkItems.length})</TabsTrigger>
                <TabsTrigger value="dd" className="text-xs md:text-sm">DD ({ddItems.length})</TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="all" className="m-0">
              <ItemsTable items={items} onViewItem={(item) => { setSelectedItem(item); setShowItemDetail(true); }} />
            </TabsContent>
            <TabsContent value="checks" className="m-0">
              <ItemsTable items={checkItems} onViewItem={(item) => { setSelectedItem(item); setShowItemDetail(true); }} />
            </TabsContent>
            <TabsContent value="dd" className="m-0">
              <ItemsTable items={ddItems} onViewItem={(item) => { setSelectedItem(item); setShowItemDetail(true); }} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Item Detail Dialog */}
      <Dialog open={showItemDetail} onOpenChange={setShowItemDetail}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Item Details - {selectedItem?.claimNumber}</DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <DetailField label="Insured Person" value={selectedItem.insuredPersonName} />
                <DetailField label="SSN" value={selectedItem.insuredPersonSSN} />
                <DetailField label="Benefit Type" value={selectedItem.benefitType} />
                <DetailField label="Payment Method" value={selectedItem.paymentMethod === 'DIRECT_DEPOSIT' ? 'Direct Deposit' : 'Check'} />
                <DetailField label="Gross Amount" value={formatCurrency(selectedItem.grossAmount)} />
                <DetailField label="Net Amount" value={formatCurrency(selectedItem.netAmount)} highlight />
                <DetailField label="Accounting Code" value={selectedItem.accountingCode} />
                <DetailField label="Description" value={selectedItem.accountingDescription} />
                {selectedItem.paymentMethod === 'DIRECT_DEPOSIT' && (
                  <>
                    <DetailField label="Bank Name" value={selectedItem.bankName || '-'} />
                    <DetailField label="Account Number" value={selectedItem.bankAccountNumber || '-'} />
                  </>
                )}
              </div>
              
              {selectedItem.deductions.length > 0 && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <p className="font-medium text-sm mb-2">Deductions</p>
                  {selectedItem.deductions.map((ded) => (
                    <div key={ded.id} className="flex justify-between text-sm">
                      <span className="truncate">{ded.description}</span>
                      <span className="text-destructive ml-2">-{formatCurrency(ded.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground">Accounts Verification</p>
                  <Badge variant={selectedItem.accountsVerificationStatus === 'APPROVED' ? 'default' : selectedItem.accountsVerificationStatus === 'REJECTED' ? 'destructive' : 'secondary'}>
                    {selectedItem.accountsVerificationStatus}
                  </Badge>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground">Benefits Verification</p>
                  <Badge variant={selectedItem.benefitsVerificationStatus === 'APPROVED' ? 'default' : selectedItem.benefitsVerificationStatus === 'REJECTED' ? 'destructive' : 'secondary'}>
                    {selectedItem.benefitsVerificationStatus}
                  </Badge>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const WorkflowStep: React.FC<{ completed: boolean; title: string; user?: string; date?: string }> = ({ completed, title, user, date }) => (
  <div className="flex items-start gap-3">
    {completed ? (
      <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-green-500 flex-shrink-0 mt-0.5" />
    ) : (
      <Clock className="h-4 w-4 md:h-5 md:w-5 text-amber-500 flex-shrink-0 mt-0.5" />
    )}
    <div className="min-w-0">
      <p className="text-xs md:text-sm font-medium">{title}</p>
      {completed && user ? (
        <>
          <p className="text-xs text-muted-foreground truncate">{user}</p>
          <p className="text-xs text-muted-foreground">{date ? new Date(date).toLocaleString() : ''}</p>
        </>
      ) : (
        <p className="text-xs text-amber-500">Pending</p>
      )}
    </div>
  </div>
);

const DetailField: React.FC<{ label: string; value: string; highlight?: boolean }> = ({ label, value, highlight }) => (
  <div>
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className={`font-medium text-sm truncate ${highlight ? 'text-green-600' : ''}`}>{value}</p>
  </div>
);

const ItemsTable: React.FC<{ items: APItem[]; onViewItem: (item: APItem) => void }> = ({ items, onViewItem }) => (
  <ScrollArea className="w-full">
    <div className="min-w-[800px]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Claim #</TableHead>
            <TableHead className="min-w-[150px]">Insured Person</TableHead>
            <TableHead>Benefit</TableHead>
            <TableHead>Method</TableHead>
            <TableHead className="text-right">Gross</TableHead>
            <TableHead className="text-right">Deductions</TableHead>
            <TableHead className="text-right">Net</TableHead>
            <TableHead className="text-center">Accounts</TableHead>
            <TableHead className="text-center">Benefits</TableHead>
            <TableHead className="w-[60px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                No items in this batch
              </TableCell>
            </TableRow>
          ) : (
            items.map((item) => (
              <TableRow key={item.id} className="cursor-pointer hover:bg-muted/50" onClick={() => onViewItem(item)}>
                <TableCell className="font-medium text-xs md:text-sm">{item.claimNumber}</TableCell>
                <TableCell>
                  <div className="min-w-0">
                    <p className="text-xs md:text-sm truncate">{item.insuredPersonName}</p>
                    <p className="text-xs text-muted-foreground">{item.insuredPersonSSN}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">{item.benefitType}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={item.paymentMethod === 'DIRECT_DEPOSIT' ? 'default' : 'secondary'} className="text-xs">
                    {item.paymentMethod === 'DIRECT_DEPOSIT' ? 'DD' : 'Check'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right text-xs md:text-sm">{formatCurrency(item.grossAmount)}</TableCell>
                <TableCell className="text-right text-destructive text-xs md:text-sm">
                  {item.deductions.length > 0 
                    ? `-${formatCurrency(item.deductions.reduce((s, d) => s + d.amount, 0))}` 
                    : '-'}
                </TableCell>
                <TableCell className="text-right font-medium text-xs md:text-sm">{formatCurrency(item.netAmount)}</TableCell>
                <TableCell className="text-center">
                  <Badge 
                    variant={item.accountsVerificationStatus === 'APPROVED' ? 'default' : item.accountsVerificationStatus === 'REJECTED' ? 'destructive' : 'secondary'}
                    className="text-xs"
                  >
                    {item.accountsVerificationStatus === 'PENDING' ? 'Pending' : item.accountsVerificationStatus === 'APPROVED' ? 'OK' : 'Reject'}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <Badge 
                    variant={item.benefitsVerificationStatus === 'APPROVED' ? 'default' : item.benefitsVerificationStatus === 'REJECTED' ? 'destructive' : 'secondary'}
                    className="text-xs"
                  >
                    {item.benefitsVerificationStatus === 'PENDING' ? 'Pending' : item.benefitsVerificationStatus === 'APPROVED' ? 'OK' : 'Reject'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); onViewItem(item); }}>
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
    <ScrollBar orientation="horizontal" />
  </ScrollArea>
);

export default APBatchDetail;
