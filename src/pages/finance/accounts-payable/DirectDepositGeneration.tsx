import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageHeader } from '@/components/common/PageHeader';
import { ArrowLeft, Download, FileText, AlertCircle, CheckCircle, Upload, Eye, Building2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/utils/formatCurrency';
import { accountsPayableService } from '@/services/accountsPayableService';
import { APBatch, APItem, DDFile } from '@/types/accountsPayable';

const DirectDepositGeneration: React.FC = () => {
  const navigate = useNavigate();
  const { batchId } = useParams();
  const { toast } = useToast();
  const [batch, setBatch] = useState<APBatch | null>(null);
  const [items, setItems] = useState<APItem[]>([]);
  const [ddFiles, setDDFiles] = useState<DDFile[]>([]);
  const [fileFormat, setFileFormat] = useState<'ACH' | 'CSV' | 'XML'>('ACH');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (batchId) {
      loadData();
    }
  }, [batchId]);

  const loadData = async () => {
    setLoading(true);
    const batchData = await accountsPayableService.getAPBatchById(batchId!);
    const itemsData = await accountsPayableService.getAPItemsByBatchId(batchId!);
    const filesData = await accountsPayableService.getDDFiles();
    
    setBatch(batchData || null);
    setItems(itemsData.filter(i => i.paymentMethod === 'DIRECT_DEPOSIT'));
    setDDFiles(filesData.filter(f => f.batchId === batchId));
    setLoading(false);
  };

  const handleGenerateFile = async () => {
    setGenerating(true);
    try {
      const file = await accountsPayableService.generateDDFile(batchId!, fileFormat);
      await loadData();
      toast({
        title: "DD File Generated",
        description: `${file.fileName} has been generated with ${file.totalRecords} records.`,
      });
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: "Failed to generate DD file. Please try again.",
        variant: "destructive"
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = (file: DDFile) => {
    // Simulate file download
    toast({
      title: "Download Started",
      description: `Downloading ${file.fileName}...`,
    });
  };

  const totalAmount = items.reduce((s, i) => s + i.netAmount, 0);
  const bankGroups = items.reduce((acc, item) => {
    const bank = item.bankName || 'Unknown';
    if (!acc[bank]) acc[bank] = { count: 0, amount: 0 };
    acc[bank].count++;
    acc[bank].amount += item.netAmount;
    return acc;
  }, {} as Record<string, { count: number; amount: number }>);

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
        title="Direct Deposit File Generation"
        subtitle={`Generate DD file for batch ${batch.batchNumber}`}
        breadcrumbs={[
          { label: 'Finance', href: '/finance' },
          { label: 'Accounts Payable', href: '/finance/accounts-payable' },
          { label: batch.batchNumber, href: `/finance/accounts-payable/batch/${batch.id}` },
          { label: 'Direct Deposit' }
        ]}
      />

      <Button variant="outline" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Generation Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              File Generation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">File Format</label>
              <Select value={fileFormat} onValueChange={(v: any) => setFileFormat(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACH">ACH Format</SelectItem>
                  <SelectItem value="CSV">CSV Format</SelectItem>
                  <SelectItem value="XML">XML Format</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span>Total Records:</span>
                <span className="font-medium">{items.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Total Amount:</span>
                <span className="font-medium">{formatCurrency(totalAmount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Banks:</span>
                <span className="font-medium">{Object.keys(bankGroups).length}</span>
              </div>
            </div>

            <Button 
              className="w-full" 
              onClick={handleGenerateFile}
              disabled={generating || items.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              {generating ? 'Generating...' : 'Generate DD File'}
            </Button>
          </CardContent>
        </Card>

        {/* Bank Summary */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Bank Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(bankGroups).map(([bank, data]) => (
                <div key={bank} className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{bank}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">Records</p>
                      <p className="font-medium">{data.count}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Amount</p>
                      <p className="font-medium">{formatCurrency(data.amount)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Generated Files */}
      {ddFiles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Generated Files</CardTitle>
            <CardDescription>Previously generated DD files for this batch</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {ddFiles.map((file) => (
                <div key={file.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{file.fileName}</p>
                      <p className="text-sm text-muted-foreground">
                        {file.totalRecords} records • {formatCurrency(file.totalAmount)} • {file.fileFormat}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm">{file.generatedByName}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(file.generatedAt).toLocaleString()}
                      </p>
                    </div>
                    <Badge variant={file.status === 'UPLOADED_TO_BANK' ? 'default' : 'secondary'}>
                      {file.status.replace(/_/g, ' ')}
                    </Badge>
                    <Button variant="outline" size="sm" onClick={() => handleDownload(file)}>
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* DD Items Table */}
      <Card>
        <CardHeader>
          <CardTitle>Direct Deposit Items</CardTitle>
          <CardDescription>{items.length} items to be included in DD file</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Claim #</TableHead>
                <TableHead>Payee Name</TableHead>
                <TableHead>Bank</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Benefit Type</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">No DD items found</TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.claimNumber}</TableCell>
                    <TableCell>{item.insuredPersonName}</TableCell>
                    <TableCell>{item.bankName || '-'}</TableCell>
                    <TableCell>{item.bankAccountNumber || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.benefitType}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(item.netAmount)}</TableCell>
                    <TableCell>
                      {item.ddBatchReference ? (
                        <Badge variant="default" className="flex items-center gap-1 w-fit">
                          <CheckCircle className="h-3 w-3" />
                          Included
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Pending</Badge>
                      )}
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
};

export default DirectDepositGeneration;
