import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from 'sonner';
import { CheckSquare, Calculator, AlertTriangle, DollarSign, FileText } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface Denomination {
  label: string;
  value: number;
  count: number;
  total: number;
}

interface BatchClosingData {
  cashEC: Denomination[];
  cashUS: Denomination[];
  checksTotal: number;
  cardsTotal: number;
  systemTotal: number;
  physicalTotal: number;
  variance: number;
}

const BatchClosing: React.FC = () => {
  const { user } = useAuth();
  const [activeBatch, setActiveBatch] = useState<any>(null);
  const [closingData, setClosingData] = useState<BatchClosingData>({
    cashEC: [
      { label: '$100', value: 100, count: 0, total: 0 },
      { label: '$50', value: 50, count: 0, total: 0 },
      { label: '$20', value: 20, count: 0, total: 0 },
      { label: '$10', value: 10, count: 0, total: 0 },
      { label: '$5', value: 5, count: 0, total: 0 },
      { label: '$2', value: 2, count: 0, total: 0 },
      { label: '$1', value: 1, count: 0, total: 0 },
      { label: '25¢', value: 0.25, count: 0, total: 0 },
      { label: '10¢', value: 0.10, count: 0, total: 0 },
      { label: '5¢', value: 0.05, count: 0, total: 0 },
      { label: '1¢', value: 0.01, count: 0, total: 0 }
    ],
    cashUS: [
      { label: '$100', value: 100, count: 0, total: 0 },
      { label: '$50', value: 50, count: 0, total: 0 },
      { label: '$20', value: 20, count: 0, total: 0 },
      { label: '$10', value: 10, count: 0, total: 0 },
      { label: '$5', value: 5, count: 0, total: 0 },
      { label: '$1', value: 1, count: 0, total: 0 },
      { label: '25¢', value: 0.25, count: 0, total: 0 },
      { label: '10¢', value: 0.10, count: 0, total: 0 },
      { label: '5¢', value: 0.05, count: 0, total: 0 },
      { label: '1¢', value: 0.01, count: 0, total: 0 }
    ],
    checksTotal: 0,
    cardsTotal: 0,
    systemTotal: 15750.00, // Mock system total
    physicalTotal: 0,
    variance: 0
  });
  const [isClosingDialogOpen, setIsClosingDialogOpen] = useState(false);
  const [supervisorOverride, setSupervisorOverride] = useState({
    required: false,
    approved: false,
    reason: ''
  });

  useEffect(() => {
    // Mock active batch for demonstration
    setActiveBatch({
      id: 'BATCH-2024-001',
      batchNumber: 'BATCH-240925-001',
      cashierId: user?.email?.split('@')[0] || 'cashier',
      cashierName: user?.name || 'Current User',
      date: new Date().toISOString().slice(0, 10),
      status: 'open',
      systemTotal: 15750.00
    });
  }, [user]);

  const updateDenomination = (currency: 'cashEC' | 'cashUS', index: number, count: string) => {
    const countNum = parseInt(count) || 0;
    setClosingData(prev => {
      const updated = { ...prev };
      updated[currency][index].count = countNum;
      updated[currency][index].total = countNum * updated[currency][index].value;
      
      // Recalculate totals
      const ecTotal = updated.cashEC.reduce((sum, denom) => sum + denom.total, 0);
      const usTotal = updated.cashUS.reduce((sum, denom) => sum + denom.total, 0);
      updated.physicalTotal = ecTotal + usTotal + updated.checksTotal + updated.cardsTotal;
      updated.variance = updated.physicalTotal - updated.systemTotal;
      
      return updated;
    });
  };

  const updateOtherTotal = (field: 'checksTotal' | 'cardsTotal', value: string) => {
    const amount = parseFloat(value) || 0;
    setClosingData(prev => {
      const updated = { ...prev, [field]: amount };
      const ecTotal = updated.cashEC.reduce((sum, denom) => sum + denom.total, 0);
      const usTotal = updated.cashUS.reduce((sum, denom) => sum + denom.total, 0);
      updated.physicalTotal = ecTotal + usTotal + updated.checksTotal + updated.cardsTotal;
      updated.variance = updated.physicalTotal - updated.systemTotal;
      return updated;
    });
  };

  const handleBatchClosing = () => {
    if (Math.abs(closingData.variance) > 50 && !supervisorOverride.approved) {
      setSupervisorOverride(prev => ({ ...prev, required: true }));
      toast.error('Variance exceeds limit. Supervisor override required.');
      return;
    }

    // Process batch closing
    toast.success('Batch closed successfully');
    setIsClosingDialogOpen(false);
    
    // Update batch status
    setActiveBatch(prev => prev ? { ...prev, status: 'closed' } : null);
  };

  const approveSupervisorOverride = () => {
    if (!supervisorOverride.reason.trim()) {
      toast.error('Please provide a reason for the override');
      return;
    }
    
    setSupervisorOverride(prev => ({ ...prev, approved: true }));
    toast.success('Supervisor override approved');
  };

  const calculateCashTotal = (denominations: Denomination[]) => {
    return denominations.reduce((sum, denom) => sum + denom.total, 0);
  };

  if (!activeBatch) {
    return (
      <div className="p-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>No Active Batch</AlertTitle>
          <AlertDescription>
            No active batch found for today. Please open a batch before proceeding with batch closing operations.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Cashier Batch Closing</h1>
          <p className="text-muted-foreground">Close daily batch with cash counting and reconciliation</p>
        </div>
        <Badge variant={activeBatch.status === 'open' ? 'default' : 'secondary'}>
          {activeBatch.status}
        </Badge>
      </div>

      {/* Batch Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5" />
            Batch Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Batch Number</div>
              <div className="font-semibold">{activeBatch.batchNumber}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Cashier</div>
              <div className="font-semibold">{activeBatch.cashierName}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Date</div>
              <div className="font-semibold">{activeBatch.date}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">System Total</div>
              <div className="font-semibold text-lg">EC$ {activeBatch.systemTotal.toFixed(2)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <div>
                <div className="text-sm text-muted-foreground">Cash EC$</div>
                <div className="font-semibold">EC$ {calculateCashTotal(closingData.cashEC).toFixed(2)}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-blue-600" />
              <div>
                <div className="text-sm text-muted-foreground">Cash US$</div>
                <div className="font-semibold">US$ {calculateCashTotal(closingData.cashUS).toFixed(2)}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-purple-600" />
              <div>
                <div className="text-sm text-muted-foreground">Checks</div>
                <div className="font-semibold">EC$ {closingData.checksTotal.toFixed(2)}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-orange-600" />
              <div>
                <div className="text-sm text-muted-foreground">Variance</div>
                <div className={`font-semibold ${Math.abs(closingData.variance) > 50 ? 'text-red-600' : 'text-green-600'}`}>
                  EC$ {closingData.variance.toFixed(2)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Variance Alert */}
      {Math.abs(closingData.variance) > 50 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Variance Alert</AlertTitle>
          <AlertDescription>
            The variance of EC$ {closingData.variance.toFixed(2)} exceeds the acceptable limit. 
            Supervisor override will be required to close this batch.
          </AlertDescription>
        </Alert>
      )}

      {/* Denomination Counting */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* EC$ Denominations */}
        <Card>
          <CardHeader>
            <CardTitle>EC$ Cash Count</CardTitle>
            <CardDescription>Enter the count for each denomination</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Denomination</TableHead>
                  <TableHead>Count</TableHead>
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {closingData.cashEC.map((denom, index) => (
                  <TableRow key={denom.label}>
                    <TableCell className="font-medium">{denom.label}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        className="w-20"
                        value={denom.count}
                        onChange={(e) => updateDenomination('cashEC', index, e.target.value)}
                      />
                    </TableCell>
                    <TableCell className="font-semibold">EC$ {denom.total.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="border-t pt-4 mt-4">
              <div className="flex justify-between text-lg font-semibold">
                <span>EC$ Total:</span>
                <span>EC$ {calculateCashTotal(closingData.cashEC).toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* US$ Denominations */}
        <Card>
          <CardHeader>
            <CardTitle>US$ Cash Count</CardTitle>
            <CardDescription>Enter the count for each denomination</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Denomination</TableHead>
                  <TableHead>Count</TableHead>
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {closingData.cashUS.map((denom, index) => (
                  <TableRow key={denom.label}>
                    <TableCell className="font-medium">{denom.label}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        className="w-20"
                        value={denom.count}
                        onChange={(e) => updateDenomination('cashUS', index, e.target.value)}
                      />
                    </TableCell>
                    <TableCell className="font-semibold">US$ {denom.total.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="border-t pt-4 mt-4">
              <div className="flex justify-between text-lg font-semibold">
                <span>US$ Total:</span>
                <span>US$ {calculateCashTotal(closingData.cashUS).toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Other Payment Methods */}
      <Card>
        <CardHeader>
          <CardTitle>Other Payment Methods</CardTitle>
          <CardDescription>Enter totals for non-cash payment methods</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="checksTotal">Total Checks</Label>
              <Input
                id="checksTotal"
                type="number"
                step="0.01"
                value={closingData.checksTotal}
                onChange={(e) => updateOtherTotal('checksTotal', e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cardsTotal">Total Cards/EFT</Label>
              <Input
                id="cardsTotal"
                type="number"
                step="0.01"
                value={closingData.cardsTotal}
                onChange={(e) => updateOtherTotal('cardsTotal', e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reconciliation Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Reconciliation Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 border rounded-lg">
                <div className="text-sm text-muted-foreground">System Total</div>
                <div className="text-2xl font-bold">EC$ {closingData.systemTotal.toFixed(2)}</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-sm text-muted-foreground">Physical Count</div>
                <div className="text-2xl font-bold">EC$ {closingData.physicalTotal.toFixed(2)}</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-sm text-muted-foreground">Variance</div>
                <div className={`text-2xl font-bold ${Math.abs(closingData.variance) > 50 ? 'text-red-600' : 'text-green-600'}`}>
                  EC$ {closingData.variance.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Supervisor Override Section */}
            {supervisorOverride.required && !supervisorOverride.approved && (
              <div className="border border-orange-200 rounded-lg p-4 bg-orange-50">
                <h4 className="font-semibold mb-2">Supervisor Override Required</h4>
                <div className="space-y-2">
                  <Label htmlFor="overrideReason">Reason for Override</Label>
                  <Input
                    id="overrideReason"
                    value={supervisorOverride.reason}
                    onChange={(e) => setSupervisorOverride(prev => ({ ...prev, reason: e.target.value }))}
                    placeholder="Enter reason for variance override"
                  />
                  <Button onClick={approveSupervisorOverride} variant="outline" size="sm">
                    Approve Override
                  </Button>
                </div>
              </div>
            )}

            <div className="flex gap-4 pt-4">
              <Dialog open={isClosingDialogOpen} onOpenChange={setIsClosingDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="lg" className="flex items-center gap-2">
                    <CheckSquare className="h-5 w-5" />
                    Close Batch
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Confirm Batch Closing</DialogTitle>
                    <DialogDescription>
                      Are you sure you want to close this batch? This action cannot be undone.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="border rounded-lg p-4">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>System Total:</span>
                          <span>EC$ {closingData.systemTotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Physical Total:</span>
                          <span>EC$ {closingData.physicalTotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-semibold">
                          <span>Variance:</span>
                          <span className={Math.abs(closingData.variance) > 50 ? 'text-red-600' : 'text-green-600'}>
                            EC$ {closingData.variance.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleBatchClosing} className="flex-1">
                        Confirm Close
                      </Button>
                      <Button variant="outline" onClick={() => setIsClosingDialogOpen(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BatchClosing;
