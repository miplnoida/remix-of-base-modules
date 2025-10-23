import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Download, FileSpreadsheet, Settings, Database, CheckCircle } from "lucide-react";

export default function GLExport() {
  const glMappings = [
    { head: "SS Contribution", fund: "Social Security", debitGL: "1001-100", creditGL: "2001-100", active: true },
    { head: "Severance Levy", fund: "Levy", debitGL: "1001-200", creditGL: "2001-200", active: true },
    { head: "Public Enterprise", fund: "PE", debitGL: "1001-300", creditGL: "2001-300", active: true }
  ];

  const batches = [
    { batchNo: "BTH-2025-001", date: "2025-04-23", totalAmount: 12500, status: "Ready" },
    { batchNo: "BTH-2025-002", date: "2025-04-23", totalAmount: 8900, status: "Exported" }
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="bema-h1 mb-2" style={{ color: "hsl(var(--bema-text-primary))" }}>GL & SAGE Export</h1>
        <p className="bema-t1" style={{ color: "hsl(var(--bema-text-secondary))" }}>
          Manage GL mappings and export financial data to SAGE
        </p>
      </div>

      <Tabs defaultValue="export" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="export">Batch Export</TabsTrigger>
          <TabsTrigger value="mapping">GL Mapping</TabsTrigger>
        </TabsList>

        <TabsContent value="export" className="space-y-6">
          <Card className="bema-card">
            <CardHeader>
              <CardTitle className="bema-h2">Export Parameters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="bema-t1">Date From</Label>
                  <Input type="date" className="mt-1" />
                </div>
                <div>
                  <Label className="bema-t1">Date To</Label>
                  <Input type="date" className="mt-1" />
                </div>
                <div>
                  <Label className="bema-t1">Fund Type</Label>
                  <Select defaultValue="all">
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Funds</SelectItem>
                      <SelectItem value="ss">Social Security</SelectItem>
                      <SelectItem value="levy">Levy</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-4">
                <Button onClick={() => toast.success("Exported to SAGE!")} className="flex-1 bema-btn-primary">
                  <Database className="h-4 w-4 mr-2" />
                  Export to SAGE
                </Button>
                <Button variant="outline" className="flex-1">
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Export to Excel
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bema-card">
            <CardHeader>
              <CardTitle className="bema-h2">Batches Ready for Export</CardTitle>
            </CardHeader>
            <CardContent>
              <Table className="bema-table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Batch #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Total Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batches.map((batch, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{batch.batchNo}</TableCell>
                      <TableCell>{batch.date}</TableCell>
                      <TableCell className="text-right">${batch.totalAmount.toLocaleString()}</TableCell>
                      <TableCell>
                        {batch.status === "Ready" ? (
                          <span className="bema-badge-warning">Ready</span>
                        ) : (
                          <span className="bema-badge-success">Exported</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mapping" className="space-y-6">
          <Card className="bema-card">
            <CardHeader>
              <CardTitle className="bema-h2">Head to GL Account Mapping</CardTitle>
            </CardHeader>
            <CardContent>
              <Table className="bema-table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Financial Head</TableHead>
                    <TableHead>Fund</TableHead>
                    <TableHead>Debit GL</TableHead>
                    <TableHead>Credit GL</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {glMappings.map((mapping, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{mapping.head}</TableCell>
                      <TableCell>
                        <span className="bema-badge-success">{mapping.fund}</span>
                      </TableCell>
                      <TableCell className="font-mono">{mapping.debitGL}</TableCell>
                      <TableCell className="font-mono">{mapping.creditGL}</TableCell>
                      <TableCell>
                        <CheckCircle className="h-4 w-4" style={{ color: "hsl(var(--bema-success))" }} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          <Settings className="h-4 w-4" />
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
