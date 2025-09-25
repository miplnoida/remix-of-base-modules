import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calculator, Lock, Unlock, FileText, AlertTriangle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Denomination {
  value: number;
  count: number;
}

interface BatchSummary {
  batchId: string;
  date: string;
  cashierName: string;
  totalTransactions: number;
  systemTotal: {
    ec: number;
    us: number;
  };
  physicalCount: {
    ec: number;
    us: number;
  };
  status: 'open' | 'balanced' | 'locked';
  variance: {
    ec: number;
    us: number;
  };
}

const BatchManagement = () => {
  const { toast } = useToast();
  const [activeBatch] = useState<BatchSummary>({
    batchId: `BATCH-${new Date().toISOString().split('T')[0]}-001`,
    date: new Date().toISOString().split('T')[0],
    cashierName: 'Current User',
    totalTransactions: 23,
    systemTotal: { ec: 4567.85, us: 1234.50 },
    physicalCount: { ec: 0, us: 0 },
    status: 'open',
    variance: { ec: 0, us: 0 }
  });

  const [denominationsEC, setDenominationsEC] = useState<Denomination[]>([
    { value: 100, count: 0 },
    { value: 50, count: 0 },
    { value: 20, count: 0 },
    { value: 10, count: 0 },
    { value: 5, count: 0 },
    { value: 2, count: 0 },
    { value: 1, count: 0 },
    { value: 0.25, count: 0 },
    { value: 0.10, count: 0 },
    { value: 0.05, count: 0 },
    { value: 0.01, count: 0 }
  ]);

  const [denominationsUS, setDenominationsUS] = useState<Denomination[]>([
    { value: 100, count: 0 },
    { value: 50, count: 0 },
    { value: 20, count: 0 },
    { value: 10, count: 0 },
    { value: 5, count: 0 },
    { value: 1, count: 0 },
    { value: 0.25, count: 0 },
    { value: 0.10, count: 0 },
    { value: 0.05, count: 0 },
    { value: 0.01, count: 0 }
  ]);

  const [isBalancingOpen, setIsBalancingOpen] = useState(false);
  const [cardTotal, setCardTotal] = useState({ ec: 0, us: 0 });
  const [checkTotal, setCheckTotal] = useState({ ec: 0, us: 0 });

  const updateDenomination = (currency: 'EC' | 'US', value: number, count: number) => {
    if (currency === 'EC') {
      setDenominationsEC(prev => 
        prev.map(d => d.value === value ? { ...d, count } : d)
      );
    } else {
      setDenominationsUS(prev => 
        prev.map(d => d.value === value ? { ...d, count } : d)
      );
    }
  };

  const calculateCashTotal = (denominations: Denomination[]) => {
    return denominations.reduce((total, d) => total + (d.value * d.count), 0);
  };

  const cashTotalEC = calculateCashTotal(denominationsEC);
  const cashTotalUS = calculateCashTotal(denominationsUS);

  const totalPhysicalEC = cashTotalEC + cardTotal.ec + checkTotal.ec;
  const totalPhysicalUS = cashTotalUS + cardTotal.us + checkTotal.us;

  const varianceEC = totalPhysicalEC - activeBatch.systemTotal.ec;
  const varianceUS = totalPhysicalUS - activeBatch.systemTotal.us;

  const isBalanced = Math.abs(varianceEC) < 0.01 && Math.abs(varianceUS) < 0.01;

  const performBalancing = () => {
    if (isBalanced) {
      toast({
        title: "Batch Balanced Successfully",
        description: "All amounts match. Batch has been locked.",
      });
      setIsBalancingOpen(false);
    } else {
      toast({
        title: "Balance Variance Detected",
        description: `EC$ variance: ${varianceEC.toFixed(2)}, US$ variance: ${varianceUS.toFixed(2)}`,
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return `${currency}$ ${amount.toFixed(2)}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Batch Management</h1>
            <p className="text-gray-600">End-of-day balancing and reconciliation</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline">
              <FileText className="h-4 w-4 mr-2" />
              Print Reports
            </Button>
            <Dialog open={isBalancingOpen} onOpenChange={setIsBalancingOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Calculator className="h-4 w-4 mr-2" />
                  Start Balancing
                </Button>
              </DialogTrigger>
            </Dialog>
          </div>
        </div>

        {/* Batch Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Active Batch Overview</span>
              <Badge variant={activeBatch.status === 'open' ? 'default' : 'secondary'}>
                {activeBatch.status === 'open' ? <Unlock className="h-4 w-4 mr-1" /> : <Lock className="h-4 w-4 mr-1" />}
                {activeBatch.status.toUpperCase()}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <Label className="text-sm font-medium text-gray-600">Batch ID</Label>
                <p className="font-mono text-lg">{activeBatch.batchId}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">Date</Label>
                <p className="text-lg">{new Date(activeBatch.date).toLocaleDateString()}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">Cashier</Label>
                <p className="text-lg">{activeBatch.cashierName}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">Transactions</Label>
                <p className="text-lg font-semibold">{activeBatch.totalTransactions}</p>
              </div>
            </div>

            <Separator className="my-6" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label className="text-lg font-semibold mb-3 block">System Totals</Label>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>EC$ Total:</span>
                    <span className="font-semibold">{formatCurrency(activeBatch.systemTotal.ec, 'EC')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>US$ Total:</span>
                    <span className="font-semibold">{formatCurrency(activeBatch.systemTotal.us, 'US')}</span>
                  </div>
                </div>
              </div>
              <div>
                <Label className="text-lg font-semibold mb-3 block">Physical Count</Label>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>EC$ Count:</span>
                    <span className="font-semibold">{formatCurrency(totalPhysicalEC, 'EC')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>US$ Count:</span>
                    <span className="font-semibold">{formatCurrency(totalPhysicalUS, 'US')}</span>
                  </div>
                </div>
              </div>
            </div>

            {(Math.abs(varianceEC) > 0.01 || Math.abs(varianceUS) > 0.01) && (
              <>
                <Separator className="my-6" />
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    <span className="font-semibold text-yellow-800">Variance Detected</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span>EC$ Variance: </span>
                      <span className={`font-semibold ${varianceEC >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {varianceEC >= 0 ? '+' : ''}{formatCurrency(varianceEC, 'EC')}
                      </span>
                    </div>
                    <div>
                      <span>US$ Variance: </span>
                      <span className={`font-semibold ${varianceUS >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {varianceUS >= 0 ? '+' : ''}{formatCurrency(varianceUS, 'US')}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Payment Mode Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Payment Mode Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mode</TableHead>
                    <TableHead>Count</TableHead>
                    <TableHead>EC$ Amount</TableHead>
                    <TableHead>US$ Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>Cash</TableCell>
                    <TableCell>15</TableCell>
                    <TableCell>EC$ 2,567.85</TableCell>
                    <TableCell>US$ 834.50</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Check</TableCell>
                    <TableCell>5</TableCell>
                    <TableCell>EC$ 1,500.00</TableCell>
                    <TableCell>US$ 400.00</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Card</TableCell>
                    <TableCell>3</TableCell>
                    <TableCell>EC$ 500.00</TableCell>
                    <TableCell>US$ 0.00</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Check Register</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Check No.</TableHead>
                    <TableHead>Bank</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-mono">001234</TableCell>
                    <TableCell>BON</TableCell>
                    <TableCell>EC$ 500.00</TableCell>
                    <TableCell><Badge variant="default">Cleared</Badge></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-mono">005678</TableCell>
                    <TableCell>FCIB</TableCell>
                    <TableCell>EC$ 1,000.00</TableCell>
                    <TableCell><Badge variant="default">Cleared</Badge></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-mono">002468</TableCell>
                    <TableCell>ACB</TableCell>
                    <TableCell>US$ 400.00</TableCell>
                    <TableCell><Badge variant="warning">Pending</Badge></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Balancing Dialog */}
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Day-End Balancing
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Cash Denominations */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* EC$ Denominations */}
              <Card>
                <CardHeader>
                  <CardTitle>EC$ Cash Count</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {denominationsEC.map((denom) => (
                      <div key={`ec-${denom.value}`} className="flex items-center justify-between">
                        <Label className="text-sm font-medium">
                          EC$ {denom.value >= 1 ? denom.value.toString() : (denom.value * 100).toString() + '¢'}:
                        </Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="0"
                            className="w-20 text-center"
                            value={denom.count || ''}
                            onChange={(e) => updateDenomination('EC', denom.value, parseInt(e.target.value) || 0)}
                          />
                          <span className="text-sm text-gray-600 w-20 text-right">
                            {(denom.value * denom.count).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))}
                    <Separator />
                    <div className="flex justify-between font-semibold">
                      <span>Cash Total:</span>
                      <span>EC$ {cashTotalEC.toFixed(2)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* US$ Denominations */}
              <Card>
                <CardHeader>
                  <CardTitle>US$ Cash Count</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {denominationsUS.map((denom) => (
                      <div key={`us-${denom.value}`} className="flex items-center justify-between">
                        <Label className="text-sm font-medium">
                          US$ {denom.value >= 1 ? denom.value.toString() : (denom.value * 100).toString() + '¢'}:
                        </Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="0"
                            className="w-20 text-center"
                            value={denom.count || ''}
                            onChange={(e) => updateDenomination('US', denom.value, parseInt(e.target.value) || 0)}
                          />
                          <span className="text-sm text-gray-600 w-20 text-right">
                            {(denom.value * denom.count).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))}
                    <Separator />
                    <div className="flex justify-between font-semibold">
                      <span>Cash Total:</span>
                      <span>US$ {cashTotalUS.toFixed(2)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Card and Check Totals */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Card Payment Totals</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>EC$ Card Total:</Label>
                    <Input
                      type="number"
                      step="0.01"
                      className="w-32"
                      value={cardTotal.ec || ''}
                      onChange={(e) => setCardTotal(prev => ({ ...prev, ec: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>US$ Card Total:</Label>
                    <Input
                      type="number"
                      step="0.01"
                      className="w-32"
                      value={cardTotal.us || ''}
                      onChange={(e) => setCardTotal(prev => ({ ...prev, us: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Check Totals</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>EC$ Check Total:</Label>
                    <Input
                      type="number"
                      step="0.01"
                      className="w-32"
                      value={checkTotal.ec || ''}
                      onChange={(e) => setCheckTotal(prev => ({ ...prev, ec: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>US$ Check Total:</Label>
                    <Input
                      type="number"
                      step="0.01"
                      className="w-32"
                      value={checkTotal.us || ''}
                      onChange={(e) => setCheckTotal(prev => ({ ...prev, us: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Summary and Balancing */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {isBalanced ? 
                    <CheckCircle className="h-5 w-5 text-green-600" /> : 
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  }
                  Balancing Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label className="text-sm font-medium text-gray-600 mb-2 block">System vs Physical (EC$)</Label>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>System Total:</span>
                        <span>EC$ {activeBatch.systemTotal.ec.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Physical Count:</span>
                        <span>EC$ {totalPhysicalEC.toFixed(2)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between font-semibold">
                        <span>Variance:</span>
                        <span className={varianceEC >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {varianceEC >= 0 ? '+' : ''}EC$ {varianceEC.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600 mb-2 block">System vs Physical (US$)</Label>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>System Total:</span>
                        <span>US$ {activeBatch.systemTotal.us.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Physical Count:</span>
                        <span>US$ {totalPhysicalUS.toFixed(2)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between font-semibold">
                        <span>Variance:</span>
                        <span className={varianceUS >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {varianceUS >= 0 ? '+' : ''}US$ {varianceUS.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-6">
                  <Button 
                    onClick={performBalancing}
                    className="flex-1"
                    disabled={!isBalanced}
                  >
                    {isBalanced ? (
                      <>
                        <Lock className="h-4 w-4 mr-2" />
                        Lock Batch
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        Force Balance (Supervisor)
                      </>
                    )}
                  </Button>
                  <Button variant="outline" onClick={() => setIsBalancingOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </div>
    </div>
  );
};

export default BatchManagement;