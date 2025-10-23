import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { AlertCircle, RotateCcw, DollarSign, FileWarning } from "lucide-react";

interface Reversal {
  id: string;
  receiptNo: string;
  payer: string;
  amount: number;
  reason: string;
  status: "pending" | "approved" | "completed";
  requestedDate: string;
}

export default function ReversalsAndPenalties() {
  const [reversals, setReversals] = useState<Reversal[]>([
    {
      id: "1",
      receiptNo: "RCP-2025-001",
      payer: "ABC Company",
      amount: 2500,
      reason: "NSF - Insufficient Funds",
      status: "pending",
      requestedDate: "2025-04-23"
    },
    {
      id: "2",
      receiptNo: "RCP-2025-045",
      payer: "XYZ Corp",
      amount: 1200,
      reason: "Signature Mismatch",
      status: "approved",
      requestedDate: "2025-04-22"
    }
  ]);

  const [showReversalDialog, setShowReversalDialog] = useState(false);
  const [newReversal, setNewReversal] = useState({
    receiptNo: "",
    reason: "",
    notes: ""
  });

  const handleRequestReversal = () => {
    if (!newReversal.receiptNo || !newReversal.reason) {
      toast.error("Please fill all required fields");
      return;
    }

    const reversal: Reversal = {
      id: Date.now().toString(),
      receiptNo: newReversal.receiptNo,
      payer: "Sample Payer",
      amount: 0,
      reason: newReversal.reason,
      status: "pending",
      requestedDate: new Date().toISOString().split('T')[0]
    };

    setReversals([reversal, ...reversals]);
    setShowReversalDialog(false);
    setNewReversal({ receiptNo: "", reason: "", notes: "" });
    toast.success("Reversal request submitted successfully!");
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: "bema-badge-warning",
      approved: "bg-blue-100 text-blue-800",
      completed: "bema-badge-success"
    };
    return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
      {status.toUpperCase()}
    </span>;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="bema-h1 mb-2" style={{ color: "hsl(var(--bema-text-primary))" }}>Reversal & Penalties</h1>
          <p className="bema-t1" style={{ color: "hsl(var(--bema-text-secondary))" }}>
            Handle bounced cheques, payment reversals, and penalty management
          </p>
        </div>
        <Dialog open={showReversalDialog} onOpenChange={setShowReversalDialog}>
          <DialogTrigger asChild>
            <Button className="bema-btn-primary">
              <RotateCcw className="h-4 w-4 mr-2" />
              Request Reversal
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="bema-h2">Request Payment Reversal</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label className="bema-t1">Receipt Number *</Label>
                <Input
                  placeholder="RCP-2025-..."
                  value={newReversal.receiptNo}
                  onChange={(e) => setNewReversal({ ...newReversal, receiptNo: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="bema-t1">Reason for Reversal *</Label>
                <Select value={newReversal.reason} onValueChange={(val) => setNewReversal({ ...newReversal, reason: val })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select reason" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NSF - Insufficient Funds">NSF - Insufficient Funds</SelectItem>
                    <SelectItem value="Signature Mismatch">Signature Mismatch</SelectItem>
                    <SelectItem value="Account Closed">Account Closed</SelectItem>
                    <SelectItem value="Stop Payment">Stop Payment</SelectItem>
                    <SelectItem value="Duplicate Entry">Duplicate Entry</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="bema-t1">Additional Notes</Label>
                <Textarea
                  placeholder="Provide additional details..."
                  value={newReversal.notes}
                  onChange={(e) => setNewReversal({ ...newReversal, notes: e.target.value })}
                  className="mt-1"
                  rows={4}
                />
              </div>
              <Button onClick={handleRequestReversal} className="w-full bema-btn-primary">
                <FileWarning className="h-4 w-4 mr-2" />
                Submit Reversal Request
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bema-card">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="bema-t2 mb-1" style={{ color: "hsl(var(--bema-text-secondary))" }}>Pending Reversals</p>
              <h3 className="bema-h2" style={{ color: "hsl(var(--bema-warning))" }}>
                {reversals.filter(r => r.status === "pending").length}
              </h3>
            </div>
          </CardContent>
        </Card>
        <Card className="bema-card">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="bema-t2 mb-1" style={{ color: "hsl(var(--bema-text-secondary))" }}>Total Amount</p>
              <h3 className="bema-h2 text-red-600">
                ${reversals.reduce((sum, r) => sum + r.amount, 0).toLocaleString()}
              </h3>
            </div>
          </CardContent>
        </Card>
        <Card className="bema-card">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="bema-t2 mb-1" style={{ color: "hsl(var(--bema-text-secondary))" }}>Bounced Cheques</p>
              <h3 className="bema-h2" style={{ color: "hsl(var(--bema-warning))" }}>
                {reversals.filter(r => r.reason.includes("NSF")).length}
              </h3>
            </div>
          </CardContent>
        </Card>
        <Card className="bema-card">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="bema-t2 mb-1" style={{ color: "hsl(var(--bema-text-secondary))" }}>Penalties Applied</p>
              <h3 className="bema-h2" style={{ color: "hsl(var(--bema-accent))" }}>$150</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reversal List */}
      <Card className="bema-card">
        <CardHeader>
          <CardTitle className="bema-h2">Recent Reversals & Bounced Cheques</CardTitle>
        </CardHeader>
        <CardContent>
          <Table className="bema-table">
            <TableHeader>
              <TableRow>
                <TableHead>Receipt #</TableHead>
                <TableHead>Payer</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Requested Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reversals.map((reversal) => (
                <TableRow key={reversal.id}>
                  <TableCell className="font-medium">{reversal.receiptNo}</TableCell>
                  <TableCell>{reversal.payer}</TableCell>
                  <TableCell className="text-right font-semibold text-red-600">${reversal.amount.toLocaleString()}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" style={{ color: "hsl(var(--bema-warning))" }} />
                      {reversal.reason}
                    </div>
                  </TableCell>
                  <TableCell>{reversal.requestedDate}</TableCell>
                  <TableCell>{getStatusBadge(reversal.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {reversal.status === "pending" && (
                        <Button variant="ghost" size="sm">
                          Approve
                        </Button>
                      )}
                      {reversal.status === "approved" && (
                        <Button variant="ghost" size="sm">
                          <DollarSign className="h-4 w-4 mr-1" />
                          Apply Penalty
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Penalty Schedule Reference */}
      <Card className="bema-card">
        <CardHeader>
          <CardTitle className="bema-h2">Penalty Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="bema-h2 mb-3" style={{ color: "hsl(var(--bema-primary))" }}>Bounced Cheque Penalties</h3>
              <ul className="space-y-2">
                <li className="bema-t1">NSF Fee: $50.00</li>
                <li className="bema-t1">Processing Fee: $25.00</li>
                <li className="bema-t1">Late Payment Penalty: 2% per month</li>
              </ul>
            </div>
            <div>
              <h3 className="bema-h2 mb-3" style={{ color: "hsl(var(--bema-primary))" }}>Other Penalties</h3>
              <ul className="space-y-2">
                <li className="bema-t1">Late Filing: $100.00</li>
                <li className="bema-t1">Incorrect Information: $75.00</li>
                <li className="bema-t1">Repeated Offenses: $200.00</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
