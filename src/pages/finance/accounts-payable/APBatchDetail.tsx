import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageHeader } from '@/components/common/PageHeader';
import { ArrowLeft, FileText, CheckCircle, Clock, Printer, Download, Send, AlertCircle, History, User } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/utils/formatCurrency';
import { accountsPayableService } from '@/services/accountsPayableService';
import { APBatch, APItem, APBatchStatus } from '@/types/accountsPayable';

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (batchId) {
      loadBatchData();
    }
  }, [batchId]);

  const loadBatchData = async () => {
    setLoading(true);
    const batchData = await accountsPayableService.getAPBatchById(batchId!);
    const itemsData = await accountsPayableService.getAPItemsByBatchId(batchId!);
    setBatch(batchData || null);
    setItems(itemsData);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">Loading batch details...</div>
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="container mx-auto p-6">
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

  return (
    <div className="container mx-auto p-6 space-y-6">
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

      <Button variant="outline" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Batches
      </Button>

      {/* Batch Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {batch.batchNumber}
                </CardTitle>
                <CardDescription>Batch Date: {new Date(batch.batchDate).toLocaleDateString()}</CardDescription>
              </div>
              <Badge variant={statusInfo.variant} className="text-sm">
                {statusInfo.label}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Total Items</p>
                <p className="text-2xl font-bold">{batch.totalItems}</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Gross Amount</p>
                <p className="text-2xl font-bold">{formatCurrency(batch.totalAmount)}</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Deductions</p>
                <p className="text-2xl font-bold text-destructive">-{formatCurrency(batch.totalDeductions)}</p>
              </div>
              <div className="p-4 bg-green-500/10 rounded-lg">
                <p className="text-sm text-muted-foreground">Net Amount</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(batch.netAmount)}</p>
              </div>
            </div>

            {/* Payment Method Breakdown */}
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Printer className="h-4 w-4" />
                  <span className="font-medium">Check Payments</span>
                </div>
                <p className="text-lg font-bold">{checkItems.length} items</p>
                <p className="text-sm text-muted-foreground">
                  {formatCurrency(checkItems.reduce((s, i) => s + i.netAmount, 0))}
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Download className="h-4 w-4" />
                  <span className="font-medium">Direct Deposits</span>
                </div>
                <p className="text-lg font-bold">{ddItems.length} items</p>
                <p className="text-sm text-muted-foreground">
                  {formatCurrency(ddItems.reduce((s, i) => s + i.netAmount, 0))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Workflow Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Workflow Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm font-medium">Created</p>
                  <p className="text-xs text-muted-foreground">{batch.createdByName}</p>
                  <p className="text-xs text-muted-foreground">{new Date(batch.createdAt).toLocaleString()}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {batch.accountsVerifiedAt ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <Clock className="h-5 w-5 text-amber-500" />
                )}
                <div>
                  <p className="text-sm font-medium">Accounts Verification</p>
                  {batch.accountsVerifiedAt ? (
                    <>
                      <p className="text-xs text-muted-foreground">{batch.accountsVerifiedByName}</p>
                      <p className="text-xs text-muted-foreground">{new Date(batch.accountsVerifiedAt).toLocaleString()}</p>
                    </>
                  ) : (
                    <p className="text-xs text-amber-500">Pending</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                {batch.benefitsVerifiedAt ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <Clock className="h-5 w-5 text-amber-500" />
                )}
                <div>
                  <p className="text-sm font-medium">Benefits Verification</p>
                  {batch.benefitsVerifiedAt ? (
                    <>
                      <p className="text-xs text-muted-foreground">{batch.benefitsVerifiedByName}</p>
                      <p className="text-xs text-muted-foreground">{new Date(batch.benefitsVerifiedAt).toLocaleString()}</p>
                    </>
                  ) : (
                    <p className="text-xs text-amber-500">Pending</p>
                  )}
                </div>
              </div>

              {batch.postedAt && (
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-sm font-medium">Posted</p>
                    <p className="text-xs text-muted-foreground">{batch.postedByName}</p>
                    <p className="text-xs text-muted-foreground">{new Date(batch.postedAt).toLocaleString()}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="pt-4 border-t space-y-2">
              {batch.status === 'PENDING_VERIFICATION' && (
                <Button className="w-full" onClick={() => navigate(`/finance/accounts-payable/verify-accounts/${batch.id}`)}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Accounts Verification
                </Button>
              )}
              {batch.status === 'ACCOUNTS_VERIFIED' && (
                <Button className="w-full" onClick={() => navigate(`/finance/accounts-payable/verify-benefits/${batch.id}`)}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Benefits Verification
                </Button>
              )}
              {['BENEFITS_VERIFIED', 'READY_FOR_CHECK_PRINTING'].includes(batch.status) && checkItems.length > 0 && (
                <Button className="w-full" onClick={() => navigate(`/finance/accounts-payable/print-checks/${batch.id}`)}>
                  <Printer className="h-4 w-4 mr-2" />
                  Print Checks
                </Button>
              )}
              {['BENEFITS_VERIFIED', 'READY_FOR_DIRECT_DEPOSIT'].includes(batch.status) && ddItems.length > 0 && (
                <Button className="w-full" variant="outline" onClick={() => navigate(`/finance/accounts-payable/generate-dd/${batch.id}`)}>
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
            <div className="p-4 border-b">
              <TabsList>
                <TabsTrigger value="all">All Items ({items.length})</TabsTrigger>
                <TabsTrigger value="checks">Checks ({checkItems.length})</TabsTrigger>
                <TabsTrigger value="dd">Direct Deposits ({ddItems.length})</TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="all" className="m-0">
              <ItemsTable items={items} />
            </TabsContent>
            <TabsContent value="checks" className="m-0">
              <ItemsTable items={checkItems} />
            </TabsContent>
            <TabsContent value="dd" className="m-0">
              <ItemsTable items={ddItems} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

const ItemsTable: React.FC<{ items: APItem[] }> = ({ items }) => (
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>Claim #</TableHead>
        <TableHead>Insured Person</TableHead>
        <TableHead>Benefit Type</TableHead>
        <TableHead>Method</TableHead>
        <TableHead className="text-right">Gross</TableHead>
        <TableHead className="text-right">Deductions</TableHead>
        <TableHead className="text-right">Net</TableHead>
        <TableHead>Accounts</TableHead>
        <TableHead>Benefits</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {items.length === 0 ? (
        <TableRow>
          <TableCell colSpan={9} className="text-center py-8">No items found</TableCell>
        </TableRow>
      ) : (
        items.map((item) => (
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
            <TableCell className="text-right">{formatCurrency(item.grossAmount)}</TableCell>
            <TableCell className="text-right text-destructive">
              {item.deductions.length > 0 
                ? `-${formatCurrency(item.deductions.reduce((s, d) => s + d.amount, 0))}` 
                : '-'}
            </TableCell>
            <TableCell className="text-right font-medium">{formatCurrency(item.netAmount)}</TableCell>
            <TableCell>
              <Badge variant={item.accountsVerificationStatus === 'APPROVED' ? 'default' : item.accountsVerificationStatus === 'REJECTED' ? 'destructive' : 'secondary'}>
                {item.accountsVerificationStatus}
              </Badge>
            </TableCell>
            <TableCell>
              <Badge variant={item.benefitsVerificationStatus === 'APPROVED' ? 'default' : item.benefitsVerificationStatus === 'REJECTED' ? 'destructive' : 'secondary'}>
                {item.benefitsVerificationStatus}
              </Badge>
            </TableCell>
          </TableRow>
        ))
      )}
    </TableBody>
  </Table>
);

export default APBatchDetail;
