import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Eye, DollarSign, Download, FileText } from "lucide-react";

interface Invoice {
  id: string;
  invoiceNo: string;
  payer: string;
  payerId: string;
  head: string;
  amount: number;
  dueDate: string;
  status: "pending" | "paid" | "overdue";
  origin: string;
}

export default function InvoiceManagement() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [invoices] = useState<Invoice[]>([
    {
      id: "1",
      invoiceNo: "INV-2025-001",
      payer: "ABC Corporation",
      payerId: "EMP-12345",
      head: "Rental",
      amount: 1500,
      dueDate: "2025-05-15",
      status: "pending",
      origin: "Rental Module"
    },
    {
      id: "2",
      invoiceNo: "INV-2025-002",
      payer: "John Smith",
      payerId: "IP-67890",
      head: "Loan",
      amount: 250,
      dueDate: "2025-04-30",
      status: "paid",
      origin: "Loans Module"
    },
    {
      id: "3",
      invoiceNo: "INV-2025-003",
      payer: "XYZ Industries",
      payerId: "EMP-54321",
      head: "Letter Fee",
      amount: 50,
      dueDate: "2025-04-20",
      status: "overdue",
      origin: "Services"
    }
  ]);

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: "bema-badge-warning",
      paid: "bema-badge-success",
      overdue: "bg-red-100 text-red-800"
    };
    return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
      {status.toUpperCase()}
    </span>;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="bema-h1 mb-2" style={{ color: "hsl(var(--bema-text-primary))" }}>Invoice Management</h1>
          <p className="bema-t1" style={{ color: "hsl(var(--bema-text-secondary))" }}>
            Create, track, and manage invoices for services and collections
          </p>
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
              <DialogTitle className="bema-h2">Create New Invoice</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label className="bema-t1">Payer ID *</Label>
                <Input placeholder="Enter payer ID" className="mt-1" />
              </div>
              <div>
                <Label className="bema-t1">Financial Head *</Label>
                <Select>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select head" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Rental">Rental</SelectItem>
                    <SelectItem value="Loan">Loan Payment</SelectItem>
                    <SelectItem value="Letter">Letter Fee</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="bema-t1">Amount *</Label>
                <Input type="number" placeholder="0.00" className="mt-1" />
              </div>
              <div>
                <Label className="bema-t1">Due Date *</Label>
                <Input type="date" className="mt-1" />
              </div>
              <div>
                <Label className="bema-t1">Remarks</Label>
                <Textarea placeholder="Optional notes" className="mt-1" />
              </div>
              <Button className="w-full bema-btn-primary">
                <FileText className="h-4 w-4 mr-2" />
                Generate Invoice
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bema-card">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="bema-t2 mb-1" style={{ color: "hsl(var(--bema-text-secondary))" }}>Total Invoices</p>
              <h3 className="bema-h2" style={{ color: "hsl(var(--bema-primary))" }}>
                {invoices.length}
              </h3>
            </div>
          </CardContent>
        </Card>
        <Card className="bema-card">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="bema-t2 mb-1" style={{ color: "hsl(var(--bema-text-secondary))" }}>Total Amount</p>
              <h3 className="bema-h2" style={{ color: "hsl(var(--bema-success))" }}>
                ${invoices.reduce((sum, inv) => sum + inv.amount, 0).toLocaleString()}
              </h3>
            </div>
          </CardContent>
        </Card>
        <Card className="bema-card">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="bema-t2 mb-1" style={{ color: "hsl(var(--bema-text-secondary))" }}>Pending</p>
              <h3 className="bema-h2" style={{ color: "hsl(var(--bema-warning))" }}>
                {invoices.filter(inv => inv.status === "pending").length}
              </h3>
            </div>
          </CardContent>
        </Card>
        <Card className="bema-card">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="bema-t2 mb-1" style={{ color: "hsl(var(--bema-text-secondary))" }}>Overdue</p>
              <h3 className="bema-h2 text-red-600">
                {invoices.filter(inv => inv.status === "overdue").length}
              </h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bema-card">
        <CardHeader>
          <CardTitle className="bema-h2">Invoice Registry</CardTitle>
        </CardHeader>
        <CardContent>
          <Table className="bema-table">
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Payer</TableHead>
                <TableHead>Payer ID</TableHead>
                <TableHead>Head</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Origin</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">{invoice.invoiceNo}</TableCell>
                  <TableCell>{invoice.payer}</TableCell>
                  <TableCell>{invoice.payerId}</TableCell>
                  <TableCell>{invoice.head}</TableCell>
                  <TableCell className="text-right font-semibold">${invoice.amount.toLocaleString()}</TableCell>
                  <TableCell>{invoice.dueDate}</TableCell>
                  <TableCell>
                    <span className="bema-badge-success">{invoice.origin}</span>
                  </TableCell>
                  <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      {invoice.status !== "paid" && (
                        <Button variant="ghost" size="sm">
                          <DollarSign className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="sm">
                        <Download className="h-4 w-4" />
                      </Button>
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
