import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Calculator, Lock, Receipt, AlertTriangle, Plus, User, CheckCircle, Clock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/contexts/AuthContext";
import { Separator } from "@/components/ui/separator";

interface Denomination {
  value: number;
  count: number;
  total: number;
}

interface BatchSummary {
  id: string;
  cashierId: string;
  cashierName: string;
  date: Date;
  status: 'open' | 'balanced' | 'closed';
  systemTotal: number;
  physicalTotal: number;
  variance: number;
  ecTotal: number;
  usTotal: number;
  transactionCount: number;
}

const BatchManagement: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeBatch, setActiveBatch] = useState<BatchSummary | null>(null);
  const [createBatchOpen, setCreateBatchOpen] = useState(false);
  
  const [ecDenominations, setEcDenominations] = useState<Denomination[]>([
    { value: 100, count: 0, total: 0 },
    { value: 50, count: 0, total: 0 },
    { value: 20, count: 0, total: 0 },
    { value: 10, count: 0, total: 0 },
    { value: 5, count: 0, total: 0 },
    { value: 2, count: 0, total: 0 },
    { value: 1, count: 0, total: 0 },
    { value: 0.25, count: 0, total: 0 },
    { value: 0.10, count: 0, total: 0 },
    { value: 0.05, count: 0, total: 0 },
    { value: 0.02, count: 0, total: 0 },
    { value: 0.01, count: 0, total: 0 }
  ]);

  const [usDenominations, setUsDenominations] = useState<Denomination[]>([
    { value: 100, count: 0, total: 0 },
    { value: 50, count: 0, total: 0 },
    { value: 20, count: 0, total: 0 },
    { value: 10, count: 0, total: 0 },
    { value: 5, count: 0, total: 0 },
    { value: 1, count: 0, total: 0 },
    { value: 0.25, count: 0, total: 0 },
    { value: 0.10, count: 0, total: 0 },
    { value: 0.05, count: 0, total: 0 },
    { value: 0.01, count: 0, total: 0 }
  ]);

  const [cardTotal, setCardTotal] = useState('');
  const [checkTotal, setCheckTotal] = useState('');
  const [balancingOpen, setBalancingOpen] = useState(false);
  
  useEffect(() => {
    // Check if user has an active batch on component mount
    const checkActiveBatch = () => {
      // In a real application, this would be an API call
      // For demo purposes, let's create a sample batch for cashiers
      if (user && (user.permissions?.includes('cashier_operations') || user.permissions?.includes('cashier_supervisor'))) {
        const today = new Date();
        const batchId = `BATCH-${user.email?.split('@')[0]?.toUpperCase() || 'USER'}-${today.toISOString().slice(0, 10).replace(/-/g, '')}`;
        
        const sampleBatch: BatchSummary = {
          id: batchId,
          cashierId: user.email?.split('@')[0] || "unknown",
          cashierName: user.name || "Unknown User",
          date: today,
          status: "open",
          systemTotal: 12750.50,
          physicalTotal: 0,
          variance: 0,
          ecTotal: 11200.50,
          usTotal: 1550.00,
          transactionCount: 25
        };
        setActiveBatch(sampleBatch);
      }
    };
    
    checkActiveBatch();
  }, [user]);

  const createNewBatch = () => {
    if (!user) {
      toast({
        title: "Error",
        description: "User information not available.",
        variant: "destructive"
      });
      return;
    }

    const today = new Date();
    const batchId = `BATCH-${user.email?.split('@')[0]?.toUpperCase() || 'USER'}-${today.toISOString().slice(0, 10).replace(/-/g, '')}`;
    
    const newBatch: BatchSummary = {
      id: batchId,
      cashierId: user.email?.split('@')[0] || "unknown",
      cashierName: user.name || "Unknown User",
      date: today,
      status: "open",
      systemTotal: 0,
      physicalTotal: 0,
      variance: 0,
      ecTotal: 0,
      usTotal: 0,
      transactionCount: 0
    };

    setActiveBatch(newBatch);
    setCreateBatchOpen(false);
    
    toast({
      title: "Batch Created",
      description: `Batch ${batchId} has been created and is now active.`,
    });
  };

  const updateDenomination = (currency: 'EC' | 'US', index: number, count: string) => {
    const countNum = parseInt(count) || 0;
    
    if (currency === 'EC') {
      const updated = [...ecDenominations];
      updated[index].count = countNum;
      updated[index].total = countNum * updated[index].value;
      setEcDenominations(updated);
    } else {
      const updated = [...usDenominations];
      updated[index].count = countNum;
      updated[index].total = countNum * updated[index].value;
      setUsDenominations(updated);
    }
  };

  const calculateCashTotal = (denominations: Denomination[]) => {
    return denominations.reduce((sum, denom) => sum + denom.total, 0);
  };

  const performBalancing = () => {
    const ecCashTotal = calculateCashTotal(ecDenominations);
    const usCashTotal = calculateCashTotal(usDenominations);
    const totalPhysical = ecCashTotal + usCashTotal + parseFloat(cardTotal || '0') + parseFloat(checkTotal || '0');
    const variance = totalPhysical - (activeBatch?.systemTotal || 0);

    if (Math.abs(variance) < 0.01) {
      toast({
        title: "Batch Balanced Successfully",
        description: "Physical count matches system total. Batch ready for closure.",
      });
    } else {
      toast({
        title: "Variance Detected",
        description: `Variance: $${variance.toFixed(2)}. Please verify counts or contact supervisor.`,
        variant: "destructive"
      });
    }
    setBalancingOpen(false);
  };

  const formatCurrency = (amount: number, currency: string = '$') => {
    return `${currency}${Math.abs(amount).toFixed(2)}`;
  };

  const getDenominationLabel = (value: number) => {
    if (value >= 1) {
      return `$${value}`;
    } else {
      return `${(value * 100).toFixed(0)}¢`;
    }
  };

  // Sample payment mode data
  const paymentModeData = [
    { mode: 'Cash', count: 15, ecAmount: 8750.50, usAmount: 950.00 },
    { mode: 'Check', count: 8, ecAmount: 2100.00, usAmount: 600.00 },
    { mode: 'Card', count: 2, ecAmount: 350.00, usAmount: 0.00 }
  ];

  // Sample check register data
  const checkRegister = [
    { checkNo: '001234', bank: 'RBC', amount: 500.00, currency: 'XCD', status: 'cleared' },
    { checkNo: '005678', bank: 'FCB', amount: 800.00, currency: 'XCD', status: 'pending' },
    { checkNo: '009876', bank: 'BON', amount: 600.00, currency: 'US$', status: 'cleared' }
  ];

  if (!activeBatch) {
    return (
      <div className="p-6 space-y-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            No active batch found. You must create a batch before processing any payments.
          </AlertDescription>
        </Alert>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Batch Management - No Active Batch
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <AlertTriangle className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Active Batch</h3>
              <p className="text-muted-foreground mb-6">
                You need to create a batch before you can start processing payments.
              </p>
              <Dialog open={createBatchOpen} onOpenChange={setCreateBatchOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Batch
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Batch</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="bg-muted p-4 rounded-lg">
                      <h4 className="font-medium mb-2">Batch Details</h4>
                      <div className="space-y-1 text-sm">
                        <div>Cashier: {user?.name || "Unknown"}</div>
                        <div>Date: {new Date().toLocaleDateString()}</div>
                        <div>Time: {new Date().toLocaleTimeString()}</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={createNewBatch} className="flex-1">
                        Create Batch
                      </Button>
                      <Button variant="outline" onClick={() => setCreateBatchOpen(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Batch Management</h1>
          <p className="text-muted-foreground">End-of-day balancing and reconciliation</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Receipt className="h-4 w-4 mr-2" />
            Print Reports
          </Button>
          <Dialog open={balancingOpen} onOpenChange={setBalancingOpen}>
            <DialogTrigger asChild>
              <Button disabled={!activeBatch || activeBatch.status === 'closed'}>
                <Calculator className="h-4 w-4 mr-2" />
                Start Balancing
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Day-End Balancing - {activeBatch.id}
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* EC$ Denominations */}
                  <Card>
                    <CardHeader>
                      <CardTitle>EC$ Cash Count</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {ecDenominations.map((denom, index) => (
                          <div key={index} className="flex items-center justify-between">
                            <Label className="text-sm font-medium">
                              {getDenominationLabel(denom.value)}:
                            </Label>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                min="0"
                                className="w-20 text-center"
                                value={denom.count || ''}
                                onChange={(e) => updateDenomination('EC', index, e.target.value)}
                              />
                              <span className="text-sm text-muted-foreground w-20 text-right">
                                EC$ {denom.total.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        ))}
                        <Separator />
                        <div className="flex justify-between font-semibold">
                          <span>EC$ Cash Total:</span>
                          <span>EC$ {calculateCashTotal(ecDenominations).toFixed(2)}</span>
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
                        {usDenominations.map((denom, index) => (
                          <div key={index} className="flex items-center justify-between">
                            <Label className="text-sm font-medium">
                              {getDenominationLabel(denom.value)}:
                            </Label>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                min="0"
                                className="w-20 text-center"
                                value={denom.count || ''}
                                onChange={(e) => updateDenomination('US', index, e.target.value)}
                              />
                              <span className="text-sm text-muted-foreground w-20 text-right">
                                US$ {denom.total.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        ))}
                        <Separator />
                        <div className="flex justify-between font-semibold">
                          <span>US$ Cash Total:</span>
                          <span>US$ {calculateCashTotal(usDenominations).toFixed(2)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Card and Check Totals */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="cardTotal">Total Card Payments</Label>
                    <Input
                      id="cardTotal"
                      type="number"
                      step="0.01"
                      value={cardTotal}
                      onChange={(e) => setCardTotal(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="checkTotal">Total Check Payments</Label>
                    <Input
                      id="checkTotal"
                      type="number"
                      step="0.01"
                      value={checkTotal}
                      onChange={(e) => setCheckTotal(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {/* Variance Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle>Balancing Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm text-muted-foreground">System Total</Label>
                        <div className="text-xl font-bold">${activeBatch.systemTotal.toFixed(2)}</div>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Physical Count</Label>
                        <div className="text-xl font-bold">
                          ${(calculateCashTotal(ecDenominations) + calculateCashTotal(usDenominations) + 
                            parseFloat(cardTotal || '0') + parseFloat(checkTotal || '0')).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setBalancingOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={performBalancing}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Balance Batch
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Active Batch Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Active Batch Overview</span>
            <div className="flex items-center gap-2">
              <Badge variant={activeBatch.status === 'open' ? 'default' : 'secondary'}>
                {activeBatch.status === 'open' ? (
                  <Clock className="h-4 w-4 mr-1" />
                ) : (
                  <Lock className="h-4 w-4 mr-1" />
                )}
                {activeBatch.status.toUpperCase()}
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Batch ID</Label>
              <p className="font-mono text-lg">{activeBatch.id}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Date</Label>
              <p className="text-lg">{activeBatch.date.toLocaleDateString()}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Cashier</Label>
              <p className="text-lg">{activeBatch.cashierName}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Transactions</Label>
              <p className="text-lg font-semibold">{activeBatch.transactionCount}</p>
            </div>
          </div>

          <Separator className="my-6" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <Label className="text-lg font-semibold mb-3 block">System Total</Label>
              <div className="text-2xl font-bold text-blue-600">
                ${activeBatch.systemTotal.toFixed(2)}
              </div>
            </div>
            <div className="text-center">
              <Label className="text-lg font-semibold mb-3 block">EC$ Collections</Label>
              <div className="text-xl font-semibold">
                EC$ {activeBatch.ecTotal.toFixed(2)}
              </div>
            </div>
            <div className="text-center">
              <Label className="text-lg font-semibold mb-3 block">US$ Collections</Label>
              <div className="text-xl font-semibold">
                US$ {activeBatch.usTotal.toFixed(2)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Mode Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                {paymentModeData.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.mode}</TableCell>
                    <TableCell>{item.count}</TableCell>
                    <TableCell>EC$ {item.ecAmount.toFixed(2)}</TableCell>
                    <TableCell>US$ {item.usAmount.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
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
                {checkRegister.map((check, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-mono">{check.checkNo}</TableCell>
                    <TableCell>{check.bank}</TableCell>
                    <TableCell>{check.currency} {check.amount.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={check.status === 'cleared' ? 'default' : 'secondary'}>
                        {check.status === 'cleared' ? (
                          <CheckCircle className="h-3 w-3 mr-1" />
                        ) : (
                          <Clock className="h-3 w-3 mr-1" />
                        )}
                        {check.status.charAt(0).toUpperCase() + check.status.slice(1)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BatchManagement;