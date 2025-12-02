import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { PageHeader } from '@/components/common/PageHeader';
import { ArrowLeft, AlertTriangle, AlertCircle, Info, Search, RefreshCw, CheckCircle, XCircle, FileText, Download } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/utils/formatCurrency';
import { accountsPayableService, VerificationException } from '@/services/accountsPayableService';
import { APBatch } from '@/types/accountsPayable';

const severityConfig = {
  ERROR: { label: 'Error', icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10', variant: 'destructive' as const },
  WARNING: { label: 'Warning', icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-500/10', variant: 'secondary' as const },
  INFO: { label: 'Info', icon: Info, color: 'text-blue-500', bg: 'bg-blue-500/10', variant: 'outline' as const }
};

const categoryLabels: Record<string, string> = {
  AMOUNT: 'Amount Issue',
  DUPLICATE: 'Duplicate Detection',
  ELIGIBILITY: 'Eligibility Check',
  CALCULATION: 'Calculation Error',
  BANK: 'Bank Details',
  OVERPAYMENT: 'Overpayment Related',
  DOCUMENT: 'Documentation'
};

const APVerificationExceptions: React.FC = () => {
  const navigate = useNavigate();
  const { batchId } = useParams();
  const { toast } = useToast();
  const [batch, setBatch] = useState<APBatch | null>(null);
  const [exceptions, setExceptions] = useState<VerificationException[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedException, setSelectedException] = useState<VerificationException | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');

  useEffect(() => {
    if (batchId) {
      loadData();
    }
  }, [batchId]);

  const loadData = async () => {
    setLoading(true);
    const batchData = await accountsPayableService.getAPBatchById(batchId!);
    const exceptionsData = await accountsPayableService.runVerificationChecks(batchId!);
    setBatch(batchData || null);
    setExceptions(exceptionsData);
    setLoading(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
    toast({
      title: 'Verification Complete',
      description: `Found ${exceptions.length} exceptions`
    });
  };

  const handleResolveException = () => {
    toast({
      title: 'Exception Acknowledged',
      description: 'Resolution recorded and item flagged for review'
    });
    setShowDetailDialog(false);
    setResolutionNotes('');
  };

  const filteredExceptions = exceptions.filter(exc => {
    const matchesSearch = 
      exc.claimNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exc.insuredPersonName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exc.ruleName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSeverity = severityFilter === 'all' || exc.severity === severityFilter;
    const matchesCategory = categoryFilter === 'all' || exc.category === categoryFilter;
    return matchesSearch && matchesSeverity && matchesCategory;
  });

  const errorCount = exceptions.filter(e => e.severity === 'ERROR').length;
  const warningCount = exceptions.filter(e => e.severity === 'WARNING').length;
  const infoCount = exceptions.filter(e => e.severity === 'INFO').length;

  if (loading) {
    return (
      <div className="container mx-auto p-4 md:p-6">
        <div className="text-center py-12">Running verification checks...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-4 md:space-y-6">
      <PageHeader
        title="Verification Exception Report"
        subtitle={batch ? `Batch ${batch.batchNumber} - Automated rule checks` : 'Loading...'}
        breadcrumbs={[
          { label: 'Finance', href: '/finance' },
          { label: 'Accounts Payable', href: '/finance/accounts-payable' },
          { label: batch?.batchNumber || 'Batch', href: `/finance/accounts-payable/batch/${batchId}` },
          { label: 'Exceptions' }
        ]}
      />

      <div className="flex flex-col sm:flex-row gap-2">
        <Button variant="outline" onClick={() => navigate(-1)} className="w-full sm:w-auto">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button variant="outline" onClick={handleRefresh} disabled={refreshing} className="w-full sm:w-auto">
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Re-Run Checks
        </Button>
        <Button variant="outline" className="w-full sm:w-auto">
          <Download className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Card>
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-muted rounded-lg">
                <FileText className="h-4 w-4 md:h-5 md:w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs md:text-sm text-muted-foreground">Total Exceptions</p>
                <p className="text-xl md:text-2xl font-bold">{exceptions.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-destructive/30">
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-destructive/10 rounded-lg">
                <XCircle className="h-4 w-4 md:h-5 md:w-5 text-destructive" />
              </div>
              <div className="min-w-0">
                <p className="text-xs md:text-sm text-muted-foreground">Errors</p>
                <p className="text-xl md:text-2xl font-bold text-destructive">{errorCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-amber-500/30">
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <AlertTriangle className="h-4 w-4 md:h-5 md:w-5 text-amber-500" />
              </div>
              <div className="min-w-0">
                <p className="text-xs md:text-sm text-muted-foreground">Warnings</p>
                <p className="text-xl md:text-2xl font-bold text-amber-500">{warningCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-500/30">
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Info className="h-4 w-4 md:h-5 md:w-5 text-blue-500" />
              </div>
              <div className="min-w-0">
                <p className="text-xs md:text-sm text-muted-foreground">Info</p>
                <p className="text-xl md:text-2xl font-bold text-blue-500">{infoCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rules Applied Info */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base md:text-lg flex items-center gap-2">
            <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-green-500" />
            Automated Verification Rules Applied
          </CardTitle>
          <CardDescription className="text-xs md:text-sm">
            System automatically checks against configured benefit rules
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="text-xs">Maximum Amount Limits</Badge>
            <Badge variant="outline" className="text-xs">Duplicate Payment Detection</Badge>
            <Badge variant="outline" className="text-xs">Bank Details Validation</Badge>
            <Badge variant="outline" className="text-xs">Overpayment Offset Verification</Badge>
            <Badge variant="outline" className="text-xs">Benefit Type Calculations</Badge>
            <Badge variant="outline" className="text-xs">Large Payment Threshold</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="p-3 md:p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by claim, name, or rule..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-full md:w-[150px]">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severity</SelectItem>
                <SelectItem value="ERROR">Errors</SelectItem>
                <SelectItem value="WARNING">Warnings</SelectItem>
                <SelectItem value="INFO">Info</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="AMOUNT">Amount Issues</SelectItem>
                <SelectItem value="DUPLICATE">Duplicates</SelectItem>
                <SelectItem value="CALCULATION">Calculations</SelectItem>
                <SelectItem value="BANK">Bank Details</SelectItem>
                <SelectItem value="OVERPAYMENT">Overpayments</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Exceptions Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base md:text-lg">Exception Details</CardTitle>
          <CardDescription className="text-xs md:text-sm">
            {filteredExceptions.length} exceptions found
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="w-full">
            <div className="min-w-[900px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">Severity</TableHead>
                    <TableHead className="min-w-[120px]">Claim #</TableHead>
                    <TableHead className="min-w-[150px]">Insured Person</TableHead>
                    <TableHead>Benefit</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="min-w-[200px]">Rule / Issue</TableHead>
                    <TableHead>Expected</TableHead>
                    <TableHead>Actual</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExceptions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8">
                        <CheckCircle className="h-8 w-8 mx-auto text-green-500 mb-2" />
                        <p className="text-muted-foreground">No exceptions found</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredExceptions.map((exc) => {
                      const config = severityConfig[exc.severity];
                      const Icon = config.icon;
                      return (
                        <TableRow key={exc.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setSelectedException(exc); setShowDetailDialog(true); }}>
                          <TableCell>
                            <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full ${config.bg}`}>
                              <Icon className={`h-3 w-3 ${config.color}`} />
                              <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium text-xs md:text-sm">{exc.claimNumber}</TableCell>
                          <TableCell className="text-xs md:text-sm">{exc.insuredPersonName}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">{exc.benefitType}</Badge>
                          </TableCell>
                          <TableCell className="text-xs">{categoryLabels[exc.category] || exc.category}</TableCell>
                          <TableCell>
                            <div className="min-w-0">
                              <p className="font-medium text-xs md:text-sm">{exc.ruleName}</p>
                              <p className="text-xs text-muted-foreground truncate max-w-[200px]">{exc.description}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{exc.expectedValue || '-'}</TableCell>
                          <TableCell className="text-xs font-medium">{exc.actualValue || '-'}</TableCell>
                          <TableCell>
                            <Button size="sm" variant="ghost">View</Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedException && (
                <>
                  {React.createElement(severityConfig[selectedException.severity].icon, {
                    className: `h-5 w-5 ${severityConfig[selectedException.severity].color}`
                  })}
                  {selectedException.ruleName}
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedException && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm">{selectedException.description}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Claim Number</p>
                  <p className="font-medium text-sm">{selectedException.claimNumber}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Insured Person</p>
                  <p className="font-medium text-sm">{selectedException.insuredPersonName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Benefit Type</p>
                  <p className="font-medium text-sm">{selectedException.benefitType}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Category</p>
                  <p className="font-medium text-sm">{categoryLabels[selectedException.category]}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 border rounded-lg">
                  <p className="text-xs text-muted-foreground">Expected</p>
                  <p className="font-medium text-sm">{selectedException.expectedValue || 'N/A'}</p>
                </div>
                <div className="p-3 border rounded-lg">
                  <p className="text-xs text-muted-foreground">Actual</p>
                  <p className="font-medium text-sm text-destructive">{selectedException.actualValue || 'N/A'}</p>
                </div>
              </div>
              
              <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Recommendation</p>
                <p className="text-sm">{selectedException.recommendation}</p>
              </div>
              
              <div>
                <p className="text-xs text-muted-foreground mb-1">Resolution Notes</p>
                <Textarea
                  placeholder="Add notes about how this exception was resolved..."
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  rows={3}
                />
              </div>
              
              <div className="text-xs text-muted-foreground">
                Detected: {new Date(selectedException.detectedAt).toLocaleString()}
                {selectedException.autoDetected && ' • Auto-detected by system'}
              </div>
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowDetailDialog(false)} className="w-full sm:w-auto">
              Close
            </Button>
            <Button onClick={handleResolveException} className="w-full sm:w-auto">
              <CheckCircle className="h-4 w-4 mr-2" />
              Mark as Reviewed
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default APVerificationExceptions;
