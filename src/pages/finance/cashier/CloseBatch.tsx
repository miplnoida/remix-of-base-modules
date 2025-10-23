import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Lock, AlertTriangle, CheckCircle, Calculator } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function CloseBatch() {
  const [denominationXCD, setDenominationXCD] = useState({
    hundred: 0,
    fifty: 0,
    twenty: 0,
    ten: 0,
    five: 0,
    two: 0,
    one: 0,
    coins: 0
  });

  const [denominationUSD, setDenominationUSD] = useState({
    hundred: 0,
    fifty: 0,
    twenty: 0,
    ten: 0,
    five: 0,
    one: 0
  });

  const [varianceNotes, setVarianceNotes] = useState("");
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);

  // Mock batch data
  const batchData = {
    batchNumber: "BCH-2025-001-0423",
    cashier: "John Smith",
    office: "Basseterre Main",
    openedAt: "2025-04-23 08:30 AM",
    systemTotalXCD: 15750.50,
    systemTotalUSD: 2340.00,
    totalTransactions: 47,
    cashTransactions: 23,
    chequeTransactions: 15,
    cardTransactions: 9
  };

  const calculateDenominationTotal = (denom: any, isUSD = false) => {
    return Object.entries(denom).reduce((total, [key, value]) => {
      const multipliers: any = {
        hundred: 100,
        fifty: 50,
        twenty: 20,
        ten: 10,
        five: 5,
        two: 2,
        one: 1,
        coins: 1
      };
      return total + (value as number) * (multipliers[key] || 0);
    }, 0);
  };

  const physicalTotalXCD = calculateDenominationTotal(denominationXCD);
  const physicalTotalUSD = calculateDenominationTotal(denominationUSD, true);
  
  const varianceXCD = physicalTotalXCD - batchData.systemTotalXCD;
  const varianceUSD = physicalTotalUSD - batchData.systemTotalUSD;
  
  const hasVariance = Math.abs(varianceXCD) > 0.01 || Math.abs(varianceUSD) > 0.01;

  const handleCloseBatch = () => {
    if (hasVariance) {
      setShowApprovalDialog(true);
    } else {
      toast.success("Batch closed successfully - no variance detected");
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Close Batch & Reconciliation</h1>
        <p className="text-muted-foreground">Reconcile physical cash with system totals</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Batch Summary</CardTitle>
          <CardDescription>Current batch details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Batch Number</p>
              <p className="font-semibold">{batchData.batchNumber}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Cashier</p>
              <p className="font-semibold">{batchData.cashier}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Office</p>
              <p className="font-semibold">{batchData.office}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Opened At</p>
              <p className="font-semibold">{batchData.openedAt}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 p-4 bg-muted rounded-lg">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Total Transactions</p>
              <p className="text-2xl font-bold">{batchData.totalTransactions}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">System Total (XCD)</p>
              <p className="text-2xl font-bold">${batchData.systemTotalXCD.toFixed(2)}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">System Total (USD)</p>
              <p className="text-2xl font-bold">${batchData.systemTotalUSD.toFixed(2)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>XCD Denomination Entry</CardTitle>
            <CardDescription>Count and enter physical XCD cash</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Denomination</TableHead>
                  <TableHead>Count</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(denominationXCD).map(([key, value]) => (
                  <TableRow key={key}>
                    <TableCell className="font-medium">
                      ${key === 'coins' ? 'Coins' : key.charAt(0).toUpperCase() + key.slice(1)}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        value={value}
                        onChange={(e) => setDenominationXCD({
                          ...denominationXCD,
                          [key]: parseInt(e.target.value) || 0
                        })}
                        className="w-24"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      ${(value * (key === 'coins' ? 1 : parseInt(key === 'hundred' ? '100' : key === 'fifty' ? '50' : key === 'twenty' ? '20' : key === 'ten' ? '10' : key === 'five' ? '5' : key === 'two' ? '2' : '1'))).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="mt-4 p-4 bg-muted rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-semibold">Physical Total (XCD):</span>
                <span className="text-xl font-bold">${physicalTotalXCD.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-sm">System Total:</span>
                <span className="text-sm">${batchData.systemTotalXCD.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center mt-1 pt-2 border-t">
                <span className="font-semibold">Variance:</span>
                <span className={`font-bold ${Math.abs(varianceXCD) < 0.01 ? 'text-green-600' : 'text-destructive'}`}>
                  ${varianceXCD.toFixed(2)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>USD Denomination Entry</CardTitle>
            <CardDescription>Count and enter physical USD cash</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Denomination</TableHead>
                  <TableHead>Count</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(denominationUSD).map(([key, value]) => (
                  <TableRow key={key}>
                    <TableCell className="font-medium">
                      ${key.charAt(0).toUpperCase() + key.slice(1)}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        value={value}
                        onChange={(e) => setDenominationUSD({
                          ...denominationUSD,
                          [key]: parseInt(e.target.value) || 0
                        })}
                        className="w-24"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      ${(value * parseInt(key === 'hundred' ? '100' : key === 'fifty' ? '50' : key === 'twenty' ? '20' : key === 'ten' ? '10' : key === 'five' ? '5' : '1')).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="mt-4 p-4 bg-muted rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-semibold">Physical Total (USD):</span>
                <span className="text-xl font-bold">${physicalTotalUSD.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-sm">System Total:</span>
                <span className="text-sm">${batchData.systemTotalUSD.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center mt-1 pt-2 border-t">
                <span className="font-semibold">Variance:</span>
                <span className={`font-bold ${Math.abs(varianceUSD) < 0.01 ? 'text-green-600' : 'text-destructive'}`}>
                  ${varianceUSD.toFixed(2)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {hasVariance && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Variance Detected
            </CardTitle>
            <CardDescription>Explain the variance and request approval</CardDescription>
          </CardHeader>
          <CardContent>
            <Label>Variance Notes / Explanation</Label>
            <Textarea
              placeholder="Provide detailed explanation for the variance..."
              value={varianceNotes}
              onChange={(e) => setVarianceNotes(e.target.value)}
              rows={4}
              className="mt-2"
            />
          </CardContent>
        </Card>
      )}

      <div className="flex gap-4">
        <Button 
          onClick={handleCloseBatch}
          className="flex-1"
          disabled={hasVariance && !varianceNotes}
        >
          <Lock className="h-4 w-4 mr-2" />
          Close Batch
        </Button>
        <Button variant="outline" className="flex-1">
          <Calculator className="h-4 w-4 mr-2" />
          Recalculate
        </Button>
      </div>

      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supervisor Approval Required</DialogTitle>
            <DialogDescription>
              Variance detected. Supervisor approval is required to close this batch.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm"><strong>XCD Variance:</strong> ${varianceXCD.toFixed(2)}</p>
              <p className="text-sm"><strong>USD Variance:</strong> ${varianceUSD.toFixed(2)}</p>
              <p className="text-sm mt-2"><strong>Notes:</strong> {varianceNotes}</p>
            </div>
            <div>
              <Label>Supervisor PIN / Password</Label>
              <Input type="password" placeholder="Enter supervisor credentials" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApprovalDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              setShowApprovalDialog(false);
              toast.success("Batch closed with supervisor approval");
            }}>
              Approve & Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
