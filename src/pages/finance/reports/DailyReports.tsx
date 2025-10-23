import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Download, Printer, FileText, Calendar } from "lucide-react";

export default function DailyReports() {
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedOffice, setSelectedOffice] = useState("all");

  // Mock data
  const batchSummary = [
    { cashier: "John Smith", batch: "BCH-001", transactions: 47, cash: 15750.50, cheque: 8500.00, card: 3200.00, total: 27450.50 },
    { cashier: "Mary Jones", batch: "BCH-002", transactions: 35, cash: 12300.00, cheque: 6750.00, card: 2100.00, total: 21150.00 },
    { cashier: "David Brown", batch: "BCH-003", transactions: 28, cash: 9850.00, cheque: 4200.00, card: 1800.00, total: 15850.00 }
  ];

  const varianceLog = [
    { batch: "BCH-001", cashier: "John Smith", expectedXCD: 15750.50, actualXCD: 15755.00, variance: 4.50, status: "Approved", notes: "Minor counting variance" }
  ];

  const reprintLog = [
    { time: "10:45 AM", cashier: "John Smith", receiptNo: "RCP-2025-001", reason: "Customer lost original", approvedBy: "Supervisor A" },
    { time: "2:30 PM", cashier: "Mary Jones", receiptNo: "RCP-2025-045", reason: "Printer malfunction", approvedBy: "Supervisor B" }
  ];

  const handleGenerateReport = (type: string) => {
    toast.success(`${type} report generated successfully`);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Daily Reports</h1>
        <p className="text-muted-foreground">Comprehensive daily financial reporting</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Report Parameters</CardTitle>
          <CardDescription>Select date and office for report generation</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Report Date</Label>
              <Input 
                type="date"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
              />
            </div>

            <div>
              <Label>Office / Location</Label>
              <Select value={selectedOffice} onValueChange={setSelectedOffice}>
                <SelectTrigger>
                  <SelectValue placeholder="Select office" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Offices</SelectItem>
                  <SelectItem value="basseterre">Basseterre Main</SelectItem>
                  <SelectItem value="sandy-point">Sandy Point</SelectItem>
                  <SelectItem value="nevis">Nevis Office</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end gap-2">
              <Button variant="outline" className="flex-1">
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button className="flex-1">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="summary" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="summary">Batch Summary</TabsTrigger>
          <TabsTrigger value="variance">Variance Log</TabsTrigger>
          <TabsTrigger value="denomination">Denomination</TabsTrigger>
          <TabsTrigger value="activity">Activity Log</TabsTrigger>
        </TabsList>

        <TabsContent value="summary">
          <Card>
            <CardHeader>
              <CardTitle>Daily Batch Summary</CardTitle>
              <CardDescription>All cashier batches for {reportDate}</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cashier</TableHead>
                    <TableHead>Batch #</TableHead>
                    <TableHead>Transactions</TableHead>
                    <TableHead>Cash</TableHead>
                    <TableHead>Cheque</TableHead>
                    <TableHead>Card</TableHead>
                    <TableHead>Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batchSummary.map((batch, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{batch.cashier}</TableCell>
                      <TableCell>{batch.batch}</TableCell>
                      <TableCell>{batch.transactions}</TableCell>
                      <TableCell>${batch.cash.toFixed(2)}</TableCell>
                      <TableCell>${batch.cheque.toFixed(2)}</TableCell>
                      <TableCell>${batch.card.toFixed(2)}</TableCell>
                      <TableCell className="font-bold">${batch.total.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted font-bold">
                    <TableCell colSpan={2}>TOTAL</TableCell>
                    <TableCell>{batchSummary.reduce((s, b) => s + b.transactions, 0)}</TableCell>
                    <TableCell>${batchSummary.reduce((s, b) => s + b.cash, 0).toFixed(2)}</TableCell>
                    <TableCell>${batchSummary.reduce((s, b) => s + b.cheque, 0).toFixed(2)}</TableCell>
                    <TableCell>${batchSummary.reduce((s, b) => s + b.card, 0).toFixed(2)}</TableCell>
                    <TableCell>${batchSummary.reduce((s, b) => s + b.total, 0).toFixed(2)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="variance">
          <Card>
            <CardHeader>
              <CardTitle>Variance Log</CardTitle>
              <CardDescription>Discrepancies and approvals</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Batch</TableHead>
                    <TableHead>Cashier</TableHead>
                    <TableHead>Expected (XCD)</TableHead>
                    <TableHead>Actual (XCD)</TableHead>
                    <TableHead>Variance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {varianceLog.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        No variances detected for this date
                      </TableCell>
                    </TableRow>
                  ) : (
                    varianceLog.map((v, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{v.batch}</TableCell>
                        <TableCell>{v.cashier}</TableCell>
                        <TableCell>${v.expectedXCD.toFixed(2)}</TableCell>
                        <TableCell>${v.actualXCD.toFixed(2)}</TableCell>
                        <TableCell className={v.variance > 0 ? "text-green-600" : "text-destructive"}>
                          ${v.variance.toFixed(2)}
                        </TableCell>
                        <TableCell>{v.status}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{v.notes}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="denomination">
          <Card>
            <CardHeader>
              <CardTitle>Denomination Report</CardTitle>
              <CardDescription>Physical cash breakdown by denomination</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Denomination details will appear here</p>
                <Button variant="outline" className="mt-4" onClick={() => handleGenerateReport('Denomination')}>
                  <FileText className="h-4 w-4 mr-2" />
                  Generate Denomination Report
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>Reprint / Cancellation Log</CardTitle>
              <CardDescription>All reprint and cancellation activities</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Cashier</TableHead>
                    <TableHead>Receipt No</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Approved By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reprintLog.map((log, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{log.time}</TableCell>
                      <TableCell>{log.cashier}</TableCell>
                      <TableCell className="font-mono">{log.receiptNo}</TableCell>
                      <TableCell>{log.reason}</TableCell>
                      <TableCell>{log.approvedBy}</TableCell>
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
