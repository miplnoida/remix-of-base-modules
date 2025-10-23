import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Download, Printer, BarChart3 } from "lucide-react";

export default function DailyReports() {
  const collectionsByHead = [
    { head: "SS Contribution", fund: "Social Security", cash: 15000, cheque: 8000, eft: 5000, card: 2000, total: 30000 },
    { head: "Severance Levy", fund: "Levy", cash: 5000, cheque: 3000, eft: 2000, card: 1000, total: 11000 },
    { head: "Public Enterprise", fund: "PE", cash: 2000, cheque: 1500, eft: 1000, card: 500, total: 5000 },
  ];

  const totalCash = collectionsByHead.reduce((sum, row) => sum + row.cash, 0);
  const totalCheque = collectionsByHead.reduce((sum, row) => sum + row.cheque, 0);
  const totalEFT = collectionsByHead.reduce((sum, row) => sum + row.eft, 0);
  const totalCard = collectionsByHead.reduce((sum, row) => sum + row.card, 0);
  const grandTotal = collectionsByHead.reduce((sum, row) => sum + row.total, 0);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="bema-h1 mb-2" style={{ color: "hsl(var(--bema-text-primary))" }}>Daily Financial Reports</h1>
        <p className="bema-t1" style={{ color: "hsl(var(--bema-text-secondary))" }}>Generate and view daily financial reports and summaries</p>
      </div>

      <Card className="bema-card">
        <CardHeader>
          <CardTitle className="bema-h2">Report Parameters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="bema-t1">Report Date</Label>
              <Input type="date" defaultValue={new Date().toISOString().split('T')[0]} className="mt-1" />
            </div>
            <div>
              <Label className="bema-t1">Office</Label>
              <Select defaultValue="all">
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Offices</SelectItem>
                  <SelectItem value="basseterre">Basseterre Main</SelectItem>
                  <SelectItem value="charlestown">Charlestown</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="bema-t1">Report Type</Label>
              <Select defaultValue="collections">
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="collections">Collections Summary</SelectItem>
                  <SelectItem value="batches">Batch Summary</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-4">
            <Button className="flex-1 bema-btn-primary" onClick={() => toast.success("Report generated!")}>
              <BarChart3 className="h-4 w-4 mr-2" />
              Generate Report
            </Button>
            <Button variant="outline" className="flex-1">
              <Download className="h-4 w-4 mr-2" />
              Export to Excel
            </Button>
            <Button variant="outline" className="flex-1">
              <Printer className="h-4 w-4 mr-2" />
              Print Report
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="bema-card">
        <CardHeader>
          <CardTitle className="bema-h2">Daily Collections Summary - April 23, 2025</CardTitle>
        </CardHeader>
        <CardContent>
          <Table className="bema-table">
            <TableHeader>
              <TableRow>
                <TableHead>Financial Head</TableHead>
                <TableHead>Fund</TableHead>
                <TableHead className="text-right">Cash</TableHead>
                <TableHead className="text-right">Cheque</TableHead>
                <TableHead className="text-right">EFT</TableHead>
                <TableHead className="text-right">Card</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {collectionsByHead.map((row, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{row.head}</TableCell>
                  <TableCell>{row.fund}</TableCell>
                  <TableCell className="text-right">${row.cash.toLocaleString()}</TableCell>
                  <TableCell className="text-right">${row.cheque.toLocaleString()}</TableCell>
                  <TableCell className="text-right">${row.eft.toLocaleString()}</TableCell>
                  <TableCell className="text-right">${row.card.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-semibold">${row.total.toLocaleString()}</TableCell>
                </TableRow>
              ))}
              <TableRow style={{ backgroundColor: "hsl(var(--bema-secondary))" }}>
                <TableCell colSpan={2} className="font-bold">GRAND TOTAL</TableCell>
                <TableCell className="text-right font-bold">${totalCash.toLocaleString()}</TableCell>
                <TableCell className="text-right font-bold">${totalCheque.toLocaleString()}</TableCell>
                <TableCell className="text-right font-bold">${totalEFT.toLocaleString()}</TableCell>
                <TableCell className="text-right font-bold">${totalCard.toLocaleString()}</TableCell>
                <TableCell className="text-right font-bold" style={{ color: "hsl(var(--bema-primary))" }}>
                  ${grandTotal.toLocaleString()}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bema-card">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="bema-t2 mb-1" style={{ color: "hsl(var(--bema-text-secondary))" }}>Total Collections</p>
              <h3 className="bema-h2" style={{ color: "hsl(var(--bema-primary))" }}>${grandTotal.toLocaleString()}</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="bema-card">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="bema-t2 mb-1" style={{ color: "hsl(var(--bema-text-secondary))" }}>Total Receipts</p>
              <h3 className="bema-h2" style={{ color: "hsl(var(--bema-accent))" }}>156</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="bema-card">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="bema-t2 mb-1" style={{ color: "hsl(var(--bema-text-secondary))" }}>Batches Closed</p>
              <h3 className="bema-h2" style={{ color: "hsl(var(--bema-success))" }}>8</h3>
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
    </div>
  );
}
