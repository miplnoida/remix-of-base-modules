import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, FileText, Download, Eye } from "lucide-react";

export default function InvoiceRegistry() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [serviceFilter, setServiceFilter] = useState("all");

  // Mock invoice data
  const invoices = [
    {
      id: "INV-2025-0001",
      service: "Rental",
      payerName: "ABC Corporation",
      amount: 5000.00,
      balance: 0.00,
      status: "paid",
      createdDate: "2025-04-01",
      dueDate: "2025-04-30",
      paidDate: "2025-04-15"
    },
    {
      id: "INV-2025-0002",
      service: "Loan Repayment",
      payerName: "John Doe",
      amount: 2500.00,
      balance: 1500.00,
      status: "partial",
      createdDate: "2025-04-05",
      dueDate: "2025-05-05",
      paidDate: null
    },
    {
      id: "INV-2025-0003",
      service: "ID Card Replacement",
      payerName: "Jane Smith",
      amount: 150.00,
      balance: 150.00,
      status: "pending",
      createdDate: "2025-04-20",
      dueDate: "2025-05-20",
      paidDate: null
    },
    {
      id: "INV-2025-0004",
      service: "Pension Letter",
      payerName: "Robert Johnson",
      amount: 75.00,
      balance: 75.00,
      status: "overdue",
      createdDate: "2025-03-15",
      dueDate: "2025-04-15",
      paidDate: null
    }
  ];

  const getStatusBadge = (status: string) => {
    const variants: any = {
      paid: "default",
      partial: "secondary",
      pending: "outline",
      overdue: "destructive"
    };
    return <Badge variant={variants[status]}>{status.toUpperCase()}</Badge>;
  };

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = inv.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         inv.payerName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || inv.status === statusFilter;
    const matchesService = serviceFilter === "all" || inv.service === serviceFilter;
    return matchesSearch && matchesStatus && matchesService;
  });

  const totalInvoices = filteredInvoices.length;
  const totalAmount = filteredInvoices.reduce((sum, inv) => sum + inv.amount, 0);
  const totalBalance = filteredInvoices.reduce((sum, inv) => sum + inv.balance, 0);
  const paidAmount = totalAmount - totalBalance;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Invoice Registry</h1>
        <p className="text-muted-foreground">Track all invoices and payment activity</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Invoices</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalInvoices}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Amount</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalAmount.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Amount Paid</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${paidAmount.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Outstanding Balance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">${totalBalance.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter & Search</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by ID or payer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>

            <Select value={serviceFilter} onValueChange={setServiceFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by service" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Services</SelectItem>
                <SelectItem value="Rental">Rental</SelectItem>
                <SelectItem value="Loan Repayment">Loan Repayment</SelectItem>
                <SelectItem value="ID Card Replacement">ID Card Replacement</SelectItem>
                <SelectItem value="Pension Letter">Pension Letter</SelectItem>
              </SelectContent>
            </Select>

            <Button>
              <Download className="h-4 w-4 mr-2" />
              Export to CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invoice Records</CardTitle>
          <CardDescription>All invoice activity by service and user</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice ID</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Payer Name</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    No invoices found matching your filters
                  </TableCell>
                </TableRow>
              ) : (
                filteredInvoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.id}</TableCell>
                    <TableCell>{invoice.service}</TableCell>
                    <TableCell>{invoice.payerName}</TableCell>
                    <TableCell>${invoice.amount.toFixed(2)}</TableCell>
                    <TableCell className={invoice.balance > 0 ? "text-destructive font-semibold" : "text-green-600"}>
                      ${invoice.balance.toFixed(2)}
                    </TableCell>
                    <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                    <TableCell>{invoice.createdDate}</TableCell>
                    <TableCell>{invoice.dueDate}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <FileText className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
