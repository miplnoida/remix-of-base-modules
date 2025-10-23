import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Search, Printer, Eye, Download } from "lucide-react";

export default function ReceiptSearch() {
  const [searchCriteria, setSearchCriteria] = useState({
    receiptNumber: "",
    payerType: "",
    payerId: "",
    dateFrom: "",
    dateTo: "",
  });

  const receipts = [
    { id: "RCP-2025-001", date: "2025-04-23", payer: "ABC Company Ltd", payerType: "Employer", amount: 2500, cashier: "John Smith", status: "Paid" },
    { id: "RCP-2025-002", date: "2025-04-23", payer: "John Doe", payerType: "IP", amount: 1800, cashier: "Mary Johnson", status: "Paid" },
    { id: "RCP-2025-003", date: "2025-04-23", payer: "XYZ Services", payerType: "Self-Employed", amount: 3200, cashier: "David Brown", status: "Paid" },
    { id: "RCP-2025-004", date: "2025-04-22", payer: "Caribbean Ltd", payerType: "Employer", amount: 4500, cashier: "John Smith", status: "Paid" },
  ];

  const handleSearch = () => {
    toast.success("Search completed - 4 receipts found");
  };

  const handleReprint = (id: string) => {
    toast.success(`Receipt ${id} sent to printer`);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="bema-h1 mb-2" style={{ color: "hsl(var(--bema-text-primary))" }}>Receipt Search & Reprint</h1>
        <p className="bema-t1" style={{ color: "hsl(var(--bema-text-secondary))" }}>Search for receipts and reprint when needed</p>
      </div>

      {/* Search Criteria */}
      <Card className="bema-card">
        <CardHeader>
          <CardTitle className="bema-h2">Search Criteria</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="bema-t1">Receipt Number</Label>
              <Input 
                placeholder="RCP-2025-XXX" 
                value={searchCriteria.receiptNumber}
                onChange={(e) => setSearchCriteria({...searchCriteria, receiptNumber: e.target.value})}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="bema-t1">Payer Type</Label>
              <Select value={searchCriteria.payerType} onValueChange={(val) => setSearchCriteria({...searchCriteria, payerType: val})}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employer">Employer</SelectItem>
                  <SelectItem value="ip">Insured Person</SelectItem>
                  <SelectItem value="self">Self-Employed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="bema-t1">Payer ID</Label>
              <Input 
                placeholder="Enter payer ID" 
                value={searchCriteria.payerId}
                onChange={(e) => setSearchCriteria({...searchCriteria, payerId: e.target.value})}
                className="mt-1"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="bema-t1">Date From</Label>
              <Input 
                type="date" 
                value={searchCriteria.dateFrom}
                onChange={(e) => setSearchCriteria({...searchCriteria, dateFrom: e.target.value})}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="bema-t1">Date To</Label>
              <Input 
                type="date" 
                value={searchCriteria.dateTo}
                onChange={(e) => setSearchCriteria({...searchCriteria, dateTo: e.target.value})}
                className="mt-1"
              />
            </div>
          </div>
          <Button onClick={handleSearch} className="w-full bema-btn-primary">
            <Search className="h-4 w-4 mr-2" />
            Search Receipts
          </Button>
        </CardContent>
      </Card>

      {/* Search Results */}
      <Card className="bema-card">
        <CardHeader>
          <CardTitle className="bema-h2">Search Results ({receipts.length} found)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table className="bema-table">
            <TableHeader>
              <TableRow>
                <TableHead>Receipt #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Payer</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Cashier</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {receipts.map((receipt) => (
                <TableRow key={receipt.id}>
                  <TableCell className="font-medium">{receipt.id}</TableCell>
                  <TableCell>{receipt.date}</TableCell>
                  <TableCell>{receipt.payer}</TableCell>
                  <TableCell>
                    <span className="px-2 py-1 rounded text-xs" style={{ 
                      backgroundColor: "hsl(var(--bema-secondary))",
                      color: "hsl(var(--bema-text-primary))"
                    }}>
                      {receipt.payerType}
                    </span>
                  </TableCell>
                  <TableCell>${receipt.amount.toLocaleString()}</TableCell>
                  <TableCell>{receipt.cashier}</TableCell>
                  <TableCell>
                    <span className="bema-badge-success">{receipt.status}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Receipt Details - {receipt.id}</DialogTitle>
                            <DialogDescription>Full receipt information</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-3 py-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="bema-t2" style={{ color: "hsl(var(--bema-text-secondary))" }}>Receipt Number</p>
                                <p className="bema-t1 font-semibold">{receipt.id}</p>
                              </div>
                              <div>
                                <p className="bema-t2" style={{ color: "hsl(var(--bema-text-secondary))" }}>Date</p>
                                <p className="bema-t1 font-semibold">{receipt.date}</p>
                              </div>
                              <div>
                                <p className="bema-t2" style={{ color: "hsl(var(--bema-text-secondary))" }}>Payer</p>
                                <p className="bema-t1 font-semibold">{receipt.payer}</p>
                              </div>
                              <div>
                                <p className="bema-t2" style={{ color: "hsl(var(--bema-text-secondary))" }}>Amount</p>
                                <p className="bema-t1 font-semibold" style={{ color: "hsl(var(--bema-primary))" }}>${receipt.amount.toLocaleString()}</p>
                              </div>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline">Close</Button>
                            <Button className="bema-btn-primary" onClick={() => handleReprint(receipt.id)}>
                              <Printer className="h-4 w-4 mr-2" />
                              Print
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                      <Button size="sm" className="bema-btn-primary" onClick={() => handleReprint(receipt.id)}>
                        <Printer className="h-4 w-4 mr-1" />
                        Reprint
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
