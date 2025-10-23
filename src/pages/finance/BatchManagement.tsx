import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Play, Lock, Eye, Calculator, AlertTriangle } from "lucide-react";

export default function BatchManagement() {
  const [openBatchDialog, setOpenBatchDialog] = useState(false);
  const [closeBatchDialog, setCloseBatchDialog] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<any>(null);

  const activeBatches = [
    { id: "BCH-2025-001-0423", cashier: "John Smith", office: "Basseterre Main", opened: "2025-04-23 08:30 AM", receipts: 12, totalXCD: 15750.50, totalUSD: 2340.00, status: "Open" },
    { id: "BCH-2025-002-0423", cashier: "Mary Johnson", office: "Charlestown", opened: "2025-04-23 09:00 AM", receipts: 8, totalXCD: 9200.00, totalUSD: 1100.00, status: "Open" },
    { id: "BCH-2025-003-0423", cashier: "David Brown", office: "Cayon", opened: "2025-04-23 08:45 AM", receipts: 15, totalXCD: 18400.00, totalUSD: 3200.00, status: "Open" },
  ];

  const closedBatches = [
    { id: "BCH-2025-001-0422", cashier: "John Smith", office: "Basseterre Main", opened: "2025-04-22 08:30 AM", closed: "2025-04-22 04:30 PM", receipts: 47, totalXCD: 32450.00, totalUSD: 5600.00, variance: 0, status: "Closed" },
    { id: "BCH-2025-002-0422", cashier: "Mary Johnson", office: "Charlestown", opened: "2025-04-22 09:00 AM", closed: "2025-04-22 04:15 PM", receipts: 35, totalXCD: 28900.00, totalUSD: 4200.00, variance: -25.50, status: "Closed" },
  ];

  const handleOpenBatch = () => {
    toast.success("Batch opened successfully!");
    setOpenBatchDialog(false);
  };

  const handleCloseBatch = () => {
    toast.success("Batch closed successfully!");
    setCloseBatchDialog(false);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="bema-h1 mb-2" style={{ color: "hsl(var(--bema-text-primary))" }}>Batch Management</h1>
          <p className="bema-t1" style={{ color: "hsl(var(--bema-text-secondary))" }}>Manage cashier batches - open, close, and reconcile</p>
        </div>
        <Dialog open={openBatchDialog} onOpenChange={setOpenBatchDialog}>
          <DialogTrigger asChild>
            <Button className="bema-btn-primary">
              <Play className="h-4 w-4 mr-2" />
              Open New Batch
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Open New Cashier Batch</DialogTitle>
              <DialogDescription>Start a new cashier session</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Office Location *</Label>
                <Select>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select office" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basseterre">Basseterre Main Office</SelectItem>
                    <SelectItem value="charlestown">Charlestown Branch</SelectItem>
                    <SelectItem value="cayon">Cayon Office</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Opening Cash (XCD)</Label>
                  <Input type="number" placeholder="0.00" className="mt-1" />
                </div>
                <div>
                  <Label>Opening Cash (USD)</Label>
                  <Input type="number" placeholder="0.00" className="mt-1" />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenBatchDialog(false)}>Cancel</Button>
              <Button className="bema-btn-primary" onClick={handleOpenBatch}>Open Batch</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bema-card">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="bema-t2 mb-1" style={{ color: "hsl(var(--bema-text-secondary))" }}>Active Batches</p>
              <h3 className="bema-h2" style={{ color: "hsl(var(--bema-primary))" }}>{activeBatches.length}</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="bema-card">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="bema-t2 mb-1" style={{ color: "hsl(var(--bema-text-secondary))" }}>Today's Collections</p>
              <h3 className="bema-h2" style={{ color: "hsl(var(--bema-success))" }}>$43,350</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="bema-card">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="bema-t2 mb-1" style={{ color: "hsl(var(--bema-text-secondary))" }}>Total Receipts</p>
              <h3 className="bema-h2" style={{ color: "hsl(var(--bema-accent))" }}>35</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="bema-card">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="bema-t2 mb-1" style={{ color: "hsl(var(--bema-text-secondary))" }}>Variances</p>
              <h3 className="bema-h2" style={{ color: "hsl(var(--bema-warning))" }}>$-25.50</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Batch Tabs */}
      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">Active Batches</TabsTrigger>
          <TabsTrigger value="closed">Closed Batches</TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <Card className="bema-card">
            <CardHeader>
              <CardTitle className="bema-h2">Active Cashier Batches</CardTitle>
              <CardDescription>Currently open batches across all offices</CardDescription>
            </CardHeader>
            <CardContent>
              <Table className="bema-table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Batch ID</TableHead>
                    <TableHead>Cashier</TableHead>
                    <TableHead>Office</TableHead>
                    <TableHead>Opened At</TableHead>
                    <TableHead>Receipts</TableHead>
                    <TableHead>Total (XCD)</TableHead>
                    <TableHead>Total (USD)</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeBatches.map((batch) => (
                    <TableRow key={batch.id}>
                      <TableCell className="font-medium">{batch.id}</TableCell>
                      <TableCell>{batch.cashier}</TableCell>
                      <TableCell>{batch.office}</TableCell>
                      <TableCell>{batch.opened}</TableCell>
                      <TableCell>{batch.receipts}</TableCell>
                      <TableCell>${batch.totalXCD.toLocaleString()}</TableCell>
                      <TableCell>${batch.totalUSD.toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button size="sm" className="bema-btn-primary" onClick={() => setSelectedBatch(batch)}>
                                <Lock className="h-4 w-4 mr-1" />
                                Close
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-3xl">
                              <DialogHeader>
                                <DialogTitle>Close Batch & Reconciliation</DialogTitle>
                                <DialogDescription>Count physical cash and reconcile with system totals</DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="p-4 rounded-lg" style={{ backgroundColor: "hsl(var(--bema-secondary) / 0.3)" }}>
                                    <p className="bema-t2 mb-2" style={{ color: "hsl(var(--bema-text-secondary))" }}>System Total (XCD)</p>
                                    <p className="bema-h2" style={{ color: "hsl(var(--bema-primary))" }}>${batch.totalXCD.toFixed(2)}</p>
                                  </div>
                                  <div className="p-4 rounded-lg" style={{ backgroundColor: "hsl(var(--bema-secondary) / 0.3)" }}>
                                    <p className="bema-t2 mb-2" style={{ color: "hsl(var(--bema-text-secondary))" }}>System Total (USD)</p>
                                    <p className="bema-h2" style={{ color: "hsl(var(--bema-primary))" }}>${batch.totalUSD.toFixed(2)}</p>
                                  </div>
                                </div>
                                <div>
                                  <Label>Physical Cash Count (XCD)</Label>
                                  <Input type="number" placeholder="Enter physical total" className="mt-1" />
                                </div>
                                <div>
                                  <Label>Physical Cash Count (USD)</Label>
                                  <Input type="number" placeholder="Enter physical total" className="mt-1" />
                                </div>
                              </div>
                              <DialogFooter>
                                <Button variant="outline">Cancel</Button>
                                <Button className="bema-btn-primary" onClick={handleCloseBatch}>
                                  <Lock className="h-4 w-4 mr-2" />
                                  Close Batch
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="closed">
          <Card className="bema-card">
            <CardHeader>
              <CardTitle className="bema-h2">Closed Batches History</CardTitle>
              <CardDescription>Previously closed batches</CardDescription>
            </CardHeader>
            <CardContent>
              <Table className="bema-table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Batch ID</TableHead>
                    <TableHead>Cashier</TableHead>
                    <TableHead>Office</TableHead>
                    <TableHead>Opened</TableHead>
                    <TableHead>Closed</TableHead>
                    <TableHead>Receipts</TableHead>
                    <TableHead>Total (XCD)</TableHead>
                    <TableHead>Variance</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {closedBatches.map((batch) => (
                    <TableRow key={batch.id}>
                      <TableCell className="font-medium">{batch.id}</TableCell>
                      <TableCell>{batch.cashier}</TableCell>
                      <TableCell>{batch.office}</TableCell>
                      <TableCell>{batch.opened}</TableCell>
                      <TableCell>{batch.closed}</TableCell>
                      <TableCell>{batch.receipts}</TableCell>
                      <TableCell>${batch.totalXCD.toLocaleString()}</TableCell>
                      <TableCell>
                        {batch.variance === 0 ? (
                          <span className="bema-badge-success">$0.00</span>
                        ) : (
                          <span className="bema-badge-warning">${batch.variance}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
