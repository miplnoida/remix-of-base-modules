import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Printer, Download, Eye, RotateCcw } from "lucide-react";
import { toast } from "sonner";

interface Receipt {
  id: string;
  receiptNo: string;
  date: string;
  payer: string;
  payerType: string;
  amount: number;
  head: string;
  method: string;
  batchNo: string;
}

export default function ReceiptSearch() {
  const [searchTerm, setSearchTerm] = useState("");
  const [headFilter, setHeadFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");

  const receipts: Receipt[] = [
    {
      id: "1",
      receiptNo: "RCP-2025-12345",
      date: "2025-04-23",
      payer: "ABC Corporation",
      payerType: "Employer",
      amount: 2500,
      head: "SS Contribution",
      method: "Cheque",
      batchNo: "BTH-2025-001"
    },
    {
      id: "2",
      receiptNo: "RCP-2025-12346",
      date: "2025-04-23",
      payer: "John Smith",
      payerType: "Insured Person",
      amount: 350,
      head: "Levy",
      method: "Cash",
      batchNo: "BTH-2025-001"
    },
    {
      id: "3",
      receiptNo: "RCP-2025-12347",
      date: "2025-04-23",
      payer: "XYZ Industries",
      payerType: "Employer",
      amount: 4800,
      head: "SS Contribution",
      method: "EFT",
      batchNo: "BTH-2025-002"
    }
  ];

  const filteredReceipts = receipts.filter(receipt => {
    const matchesSearch = searchTerm === "" || 
      receipt.receiptNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      receipt.payer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesHead = headFilter === "all" || receipt.head === headFilter;
    const matchesMethod = methodFilter === "all" || receipt.method === methodFilter;
    return matchesSearch && matchesHead && matchesMethod;
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="bema-h1 mb-2" style={{ color: "hsl(var(--bema-text-primary))" }}>Receipt Search</h1>
        <p className="bema-t1" style={{ color: "hsl(var(--bema-text-secondary))" }}>
          Search, view, and reprint payment receipts
        </p>
      </div>

      <Card className="bema-card">
        <CardHeader>
          <CardTitle className="bema-h2">Search Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label className="bema-t1">Receipt # / Payer Name</Label>
              <Input
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="bema-t1">Head</Label>
              <Select value={headFilter} onValueChange={setHeadFilter}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Heads</SelectItem>
                  <SelectItem value="SS Contribution">SS Contribution</SelectItem>
                  <SelectItem value="Levy">Levy</SelectItem>
                  <SelectItem value="PE">PE</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="bema-t1">Payment Method</Label>
              <Select value={methodFilter} onValueChange={setMethodFilter}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Cheque">Cheque</SelectItem>
                  <SelectItem value="EFT">EFT</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="bema-t1">Date Range</Label>
              <Input type="date" className="mt-1" />
            </div>
          </div>
          <Button className="w-full bema-btn-primary">
            <Search className="h-4 w-4 mr-2" />
            Search Receipts
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bema-card">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="bema-t2 mb-1" style={{ color: "hsl(var(--bema-text-secondary))" }}>Receipts Found</p>
              <h3 className="bema-h2" style={{ color: "hsl(var(--bema-primary))" }}>
                {filteredReceipts.length}
              </h3>
            </div>
          </CardContent>
        </Card>
        <Card className="bema-card">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="bema-t2 mb-1" style={{ color: "hsl(var(--bema-text-secondary))" }}>Total Amount</p>
              <h3 className="bema-h2" style={{ color: "hsl(var(--bema-success))" }}>
                ${filteredReceipts.reduce((sum, r) => sum + r.amount, 0).toLocaleString()}
              </h3>
            </div>
          </CardContent>
        </Card>
        <Card className="bema-card">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="bema-t2 mb-1" style={{ color: "hsl(var(--bema-text-secondary))" }}>Reprints</p>
              <h3 className="bema-h2" style={{ color: "hsl(var(--bema-warning))" }}>0</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bema-card">
        <CardHeader>
          <CardTitle className="bema-h2">Receipt Results</CardTitle>
        </CardHeader>
        <CardContent>
          <Table className="bema-table">
            <TableHeader>
              <TableRow>
                <TableHead>Receipt #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Payer</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Head</TableHead>
                <TableHead>Method</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Batch #</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReceipts.map((receipt) => (
                <TableRow key={receipt.id}>
                  <TableCell className="font-medium">{receipt.receiptNo}</TableCell>
                  <TableCell>{receipt.date}</TableCell>
                  <TableCell>{receipt.payer}</TableCell>
                  <TableCell>
                    <span className="bema-badge-success">{receipt.payerType}</span>
                  </TableCell>
                  <TableCell>{receipt.head}</TableCell>
                  <TableCell>{receipt.method}</TableCell>
                  <TableCell className="text-right font-semibold">${receipt.amount.toLocaleString()}</TableCell>
                  <TableCell>{receipt.batchNo}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Printer className="h-4 w-4" />
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
