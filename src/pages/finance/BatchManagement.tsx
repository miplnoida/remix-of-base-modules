import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Lock, Unlock, Eye, CheckCircle } from "lucide-react";

interface Batch {
  id: string;
  batchNo: string;
  cashier: string;
  office: string;
  openedAt: string;
  openingBalance: number;
  receipts: number;
  totalAmount: number;
  status: "open" | "closed" | "locked";
}

export default function BatchManagement() {
  const [batches, setBatches] = useState<Batch[]>([
    {
      id: "1",
      batchNo: "BTH-2025-001",
      cashier: "John Smith",
      office: "Basseterre Main",
      openedAt: "2025-04-23 08:30 AM",
      openingBalance: 500,
      receipts: 45,
      totalAmount: 12500,
      status: "open"
    },
    {
      id: "2",
      batchNo: "BTH-2025-002",
      cashier: "Jane Doe",
      office: "Charlestown",
      openedAt: "2025-04-23 09:00 AM",
      openingBalance: 300,
      receipts: 32,
      totalAmount: 8900,
      status: "closed"
    }
  ]);

  const [showOpenDialog, setShowOpenDialog] = useState(false);
  const [newBatch, setNewBatch] = useState({
    office: "Charlestown",
    openingBalance: ""
  });

  const handleOpenBatch = () => {
    if (!newBatch.office || !newBatch.openingBalance) {
      toast.error("Please fill all required fields");
      return;
    }

    const batch: Batch = {
      id: Date.now().toString(),
      batchNo: `BTH-2025-${String(batches.length + 1).padStart(3, '0')}`,
      cashier: "Current User",
      office: newBatch.office,
      openedAt: new Date().toLocaleString(),
      openingBalance: parseFloat(newBatch.openingBalance),
      receipts: 0,
      totalAmount: 0,
      status: "open"
    };

    setBatches([batch, ...batches]);
    setShowOpenDialog(false);
    setNewBatch({ office: "Charlestown", openingBalance: "" });
    toast.success("Batch opened successfully!");
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      open: "bema-badge-success",
      closed: "bema-badge-warning",
      locked: "bg-gray-200 text-gray-800"
    };
    return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
      {status.toUpperCase()}
    </span>;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Batch Management</h1>
          <p className="text-muted-foreground">
            Manage cashier batches - Open, Close, Lock, and Monitor
          </p>
        </div>
        <Dialog open={showOpenDialog} onOpenChange={setShowOpenDialog}>
          <DialogTrigger asChild>
            <Button className="bema-btn-primary">
              <Plus className="h-4 w-4 mr-2" />
              Open New Batch
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="bema-h2">Open New Cashier Batch</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label className="bema-t1">Office Location *</Label>
                <div className="mt-1 bema-t1">Charlestown</div>
              </div>
              <div>
                <Label className="bema-t1">Opening Balance *</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={newBatch.openingBalance}
                  onChange={(e) => setNewBatch({ ...newBatch, openingBalance: e.target.value })}
                  className="mt-1"
                />
              </div>
              <Button onClick={handleOpenBatch} className="w-full bema-btn-primary">
                <CheckCircle className="h-4 w-4 mr-2" />
                Open Batch
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Active Batches Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bema-card">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="bema-t2 mb-1" style={{ color: "hsl(var(--bema-text-secondary))" }}>Active Batches</p>
              <h3 className="bema-h2" style={{ color: "hsl(var(--bema-primary))" }}>
                {batches.filter(b => b.status === "open").length}
              </h3>
            </div>
          </CardContent>
        </Card>
        <Card className="bema-card">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="bema-t2 mb-1" style={{ color: "hsl(var(--bema-text-secondary))" }}>Today's Collections</p>
              <h3 className="bema-h2" style={{ color: "hsl(var(--bema-success))" }}>
                ${batches.reduce((sum, b) => sum + b.totalAmount, 0).toLocaleString()}
              </h3>
            </div>
          </CardContent>
        </Card>
        <Card className="bema-card">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="bema-t2 mb-1" style={{ color: "hsl(var(--bema-text-secondary))" }}>Total Receipts</p>
              <h3 className="bema-h2" style={{ color: "hsl(var(--bema-accent))" }}>
                {batches.reduce((sum, b) => sum + b.receipts, 0)}
              </h3>
            </div>
          </CardContent>
        </Card>
        <Card className="bema-card">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="bema-t2 mb-1" style={{ color: "hsl(var(--bema-text-secondary))" }}>Closed Batches</p>
              <h3 className="bema-h2" style={{ color: "hsl(var(--bema-warning))" }}>
                {batches.filter(b => b.status === "closed").length}
              </h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Batch List */}
      <Card className="bema-card">
        <CardHeader>
          <CardTitle className="bema-h2">All Batches</CardTitle>
        </CardHeader>
        <CardContent>
          <Table className="bema-table">
            <TableHeader>
              <TableRow>
                <TableHead>Batch #</TableHead>
                <TableHead>Cashier</TableHead>
                <TableHead>Office</TableHead>
                <TableHead>Opened</TableHead>
                <TableHead className="text-right">Opening Balance</TableHead>
                <TableHead className="text-right">Receipts</TableHead>
                <TableHead className="text-right">Total Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batches.map((batch) => (
                <TableRow key={batch.id}>
                  <TableCell className="font-medium">{batch.batchNo}</TableCell>
                  <TableCell>{batch.cashier}</TableCell>
                  <TableCell>{batch.office}</TableCell>
                  <TableCell>{batch.openedAt}</TableCell>
                  <TableCell className="text-right">${batch.openingBalance.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{batch.receipts}</TableCell>
                  <TableCell className="text-right font-semibold">${batch.totalAmount.toLocaleString()}</TableCell>
                  <TableCell>{getStatusBadge(batch.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      {batch.status === "open" && (
                        <Button variant="ghost" size="sm">
                          <Lock className="h-4 w-4" />
                        </Button>
                      )}
                      {batch.status === "closed" && (
                        <Button variant="ghost" size="sm">
                          <Unlock className="h-4 w-4" />
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
    </div>
  );
}
