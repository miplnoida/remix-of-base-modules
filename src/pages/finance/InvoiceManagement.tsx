import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, DollarSign, FileText, Eye } from "lucide-react";

export default function InvoiceManagement() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const pendingInvoices = [
    { id: "INV-2025-001", date: "2025-04-20", payer: "ABC Company", type: "Rental", amount: 1200, dueDate: "2025-05-20", status: "Pending" },
    { id: "INV-2025-002", date: "2025-04-21", payer: "John Doe", type: "ID Card", amount: 50, dueDate: "2025-05-21", status: "Pending" },
  ];

  const paidInvoices = [
    { id: "INV-2025-003", date: "2025-04-18", payer: "XYZ Services", type: "Loan", amount: 5000, dueDate: "2025-05-18", paidDate: "2025-04-22", status: "Paid" },
  ];

  const overdueInvoices = [
    { id: "INV-2025-004", date: "2025-03-15", payer: "Caribbean Ltd", type: "Rental", amount: 2500, dueDate: "2025-04-15", status: "Overdue" },
  ];

  const handleCreateInvoice = () => {
    toast.success("Invoice created successfully");
    setShowCreateDialog(false);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="bema-h1 mb-2" style={{ color: "hsl(var(--bema-text-primary))" }}>Invoice Management</h1>
          <p className="bema-t1" style={{ color: "hsl(var(--bema-text-secondary))" }}>Create, track, and manage invoices for services and rentals</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="bema-btn-primary">
              <Plus className="h-4 w-4 mr-2" />
              Create Invoice
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Invoice</DialogTitle>
              <DialogDescription>Generate invoice for services or rentals</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Payer ID *</Label>
                <Input placeholder="Enter payer ID" className="mt-1" />
              </div>
              <div>
                <Label>Invoice Type *</Label>
                <Select>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rental">Property Rental</SelectItem>
                    <SelectItem value="loan">Loan Fee</SelectItem>
                    <SelectItem value="card">ID Card</SelectItem>
                    <SelectItem value="letter">Letter Fee</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Amount *</Label>
                  <Input type="number" placeholder="0.00" className="mt-1" />
                </div>
                <div>
                  <Label>Due Date *</Label>
                  <Input type="date" className="mt-1" />
                </div>
              </div>
              <div>
                <Label>Description</Label>
                <Input placeholder="Invoice description" className="mt-1" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
              <Button className="bema-btn-primary" onClick={handleCreateInvoice}>Create Invoice</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bema-card">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="bema-t2 mb-1" style={{ color: "hsl(var(--bema-text-secondary))" }}>Total Invoices</p>
              <h3 className="bema-h2" style={{ color: "hsl(var(--bema-primary))" }}>{pendingInvoices.length + paidInvoices.length + overdueInvoices.length}</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="bema-card">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="bema-t2 mb-1" style={{ color: "hsl(var(--bema-text-secondary))" }}>Pending</p>
              <h3 className="bema-h2" style={{ color: "hsl(var(--bema-accent))" }}>{pendingInvoices.length}</h3>
              <p className="bema-t2 mt-1" style={{ color: "hsl(var(--bema-text-secondary))" }}>$1,250 total</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bema-card">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="bema-t2 mb-1" style={{ color: "hsl(var(--bema-text-secondary))" }}>Paid</p>
              <h3 className="bema-h2" style={{ color: "hsl(var(--bema-success))" }}>{paidInvoices.length}</h3>
              <p className="bema-t2 mt-1" style={{ color: "hsl(var(--bema-text-secondary))" }}>$5,000 total</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bema-card">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="bema-t2 mb-1" style={{ color: "hsl(var(--bema-text-secondary))" }}>Overdue</p>
              <h3 className="bema-h2" style={{ color: "hsl(var(--bema-warning))" }}>{overdueInvoices.length}</h3>
              <p className="bema-t2 mt-1" style={{ color: "hsl(var(--bema-warning))" }}>$2,500 total</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoice Tabs */}
      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="paid">Paid</TabsTrigger>
          <TabsTrigger value="overdue">Overdue</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Card className="bema-card">
            <CardHeader>
              <CardTitle className="bema-h2">Pending Invoices</CardTitle>
              <CardDescription>Awaiting payment</CardDescription>
            </CardHeader>
            <CardContent>
              <Table className="bema-table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Payer</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.id}</TableCell>
                      <TableCell>{invoice.date}</TableCell>
                      <TableCell>{invoice.payer}</TableCell>
                      <TableCell>{invoice.type}</TableCell>
                      <TableCell>${invoice.amount.toLocaleString()}</TableCell>
                      <TableCell>{invoice.dueDate}</TableCell>
                      <TableCell>
                        <span className="bema-badge-warning">{invoice.status}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          <Button size="sm" className="bema-btn-primary">
                            <DollarSign className="h-4 w-4 mr-1" />
                            Record Payment
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="paid">
          <Card className="bema-card">
            <CardHeader>
              <CardTitle className="bema-h2">Paid Invoices</CardTitle>
              <CardDescription>Completed payments</CardDescription>
            </CardHeader>
            <CardContent>
              <Table className="bema-table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Payer</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Paid Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paidInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.id}</TableCell>
                      <TableCell>{invoice.date}</TableCell>
                      <TableCell>{invoice.payer}</TableCell>
                      <TableCell>{invoice.type}</TableCell>
                      <TableCell>${invoice.amount.toLocaleString()}</TableCell>
                      <TableCell>{invoice.paidDate}</TableCell>
                      <TableCell>
                        <span className="bema-badge-success">{invoice.status}</span>
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

        <TabsContent value="overdue">
          <Card className="bema-card border" style={{ borderColor: "hsl(var(--bema-warning))" }}>
            <CardHeader>
              <CardTitle className="bema-h2">Overdue Invoices</CardTitle>
              <CardDescription>Require immediate attention</CardDescription>
            </CardHeader>
            <CardContent>
              <Table className="bema-table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Payer</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overdueInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.id}</TableCell>
                      <TableCell>{invoice.date}</TableCell>
                      <TableCell>{invoice.payer}</TableCell>
                      <TableCell>{invoice.type}</TableCell>
                      <TableCell>${invoice.amount.toLocaleString()}</TableCell>
                      <TableCell>{invoice.dueDate}</TableCell>
                      <TableCell>
                        <span className="bema-badge-warning">{invoice.status}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          <Button size="sm" className="bema-btn-primary">
                            <DollarSign className="h-4 w-4 mr-1" />
                            Record Payment
                          </Button>
                        </div>
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
