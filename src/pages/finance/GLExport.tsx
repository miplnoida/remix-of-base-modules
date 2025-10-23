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
import { Download, Settings, Database, FileText, CheckCircle } from "lucide-react";

export default function GLExport() {
  const [showMappingDialog, setShowMappingDialog] = useState(false);

  const glMappings = [
    { id: "1", head: "SS Contribution", fund: "Social Security", glDebit: "1001", glCredit: "2001", mapped: true },
    { id: "2", head: "Severance Levy", fund: "Levy", glDebit: "1002", glCredit: "2002", mapped: true },
    { id: "3", head: "Public Enterprise", fund: "PE", glDebit: "1003", glCredit: "2003", mapped: true },
    { id: "4", head: "Loan Installment", fund: "Loan", glDebit: "1004", glCredit: "2004", mapped: true },
    { id: "5", head: "Property Rental", fund: "Rental", glDebit: "1005", glCredit: "2005", mapped: true },
  ];

  const exportHistory = [
    { id: "EXP-2025-001", date: "2025-04-22", period: "April 2025", batches: "5", amount: 125000, status: "Completed" },
    { id: "EXP-2025-002", date: "2025-03-31", period: "March 2025", batches: "12", amount: 485000, status: "Completed" },
  ];

  const handleExport = () => {
    toast.success("GL export file generated successfully!");
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="bema-h1 mb-2" style={{ color: "hsl(var(--bema-text-primary))" }}>GL & SAGE Export</h1>
        <p className="bema-t1" style={{ color: "hsl(var(--bema-text-secondary))" }}>General Ledger mapping and SAGE accounting export</p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bema-card">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="bema-t2 mb-1" style={{ color: "hsl(var(--bema-text-secondary))" }}>GL Mappings</p>
              <h3 className="bema-h2" style={{ color: "hsl(var(--bema-primary))" }}>{glMappings.length}</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="bema-card">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="bema-t2 mb-1" style={{ color: "hsl(var(--bema-text-secondary))" }}>Unmapped Heads</p>
              <h3 className="bema-h2" style={{ color: "hsl(var(--bema-warning))" }}>0</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="bema-card">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="bema-t2 mb-1" style={{ color: "hsl(var(--bema-text-secondary))" }}>Ready to Export</p>
              <h3 className="bema-h2" style={{ color: "hsl(var(--bema-success))" }}>8 Batches</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="bema-card">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="bema-t2 mb-1" style={{ color: "hsl(var(--bema-text-secondary))" }}>Last Export</p>
              <h3 className="bema-h2" style={{ color: "hsl(var(--bema-text-primary))" }}>Apr 22</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="export" className="space-y-4">
        <TabsList>
          <TabsTrigger value="export">SAGE Export</TabsTrigger>
          <TabsTrigger value="mapping">GL Mapping</TabsTrigger>
          <TabsTrigger value="history">Export History</TabsTrigger>
        </TabsList>

        <TabsContent value="export">
          <Card className="bema-card">
            <CardHeader>
              <CardTitle className="bema-h2">Generate SAGE Export</CardTitle>
              <CardDescription>Export financial data to SAGE accounting system</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="bema-t1">Export Period</Label>
                  <Select>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="current">Current Month</SelectItem>
                      <SelectItem value="last">Last Month</SelectItem>
                      <SelectItem value="custom">Custom Range</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="bema-t1">Fund Type</Label>
                  <Select>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="All funds" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Funds</SelectItem>
                      <SelectItem value="ss">Social Security</SelectItem>
                      <SelectItem value="levy">Levy</SelectItem>
                      <SelectItem value="loan">Loan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="p-4 rounded-lg" style={{ backgroundColor: "hsl(var(--bema-secondary) / 0.5)" }}>
                <h4 className="bema-h2 mb-3">Export Summary</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="bema-t2" style={{ color: "hsl(var(--bema-text-secondary))" }}>Batches</p>
                    <p className="bema-t1 font-semibold">8</p>
                  </div>
                  <div>
                    <p className="bema-t2" style={{ color: "hsl(var(--bema-text-secondary))" }}>Receipts</p>
                    <p className="bema-t1 font-semibold">156</p>
                  </div>
                  <div>
                    <p className="bema-t2" style={{ color: "hsl(var(--bema-text-secondary))" }}>Total Amount</p>
                    <p className="bema-t1 font-semibold">$125,000</p>
                  </div>
                  <div>
                    <p className="bema-t2" style={{ color: "hsl(var(--bema-text-secondary))" }}>GL Lines</p>
                    <p className="bema-t1 font-semibold">312</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <Button className="flex-1 bema-btn-primary" onClick={handleExport}>
                  <Download className="h-4 w-4 mr-2" />
                  Export to SAGE (CSV)
                </Button>
                <Button variant="outline" className="flex-1">
                  <FileText className="h-4 w-4 mr-2" />
                  Preview Export
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mapping">
          <Card className="bema-card">
            <CardHeader>
              <CardTitle className="bema-h2 flex items-center justify-between">
                GL Account Mappings
                <Dialog open={showMappingDialog} onOpenChange={setShowMappingDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Settings className="h-4 w-4 mr-2" />
                      Configure Mapping
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Configure GL Mapping</DialogTitle>
                      <DialogDescription>Map financial heads to GL accounts</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <Label>Financial Head</Label>
                        <Select>
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Select head" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ss">SS Contribution</SelectItem>
                            <SelectItem value="levy">Levy</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>GL Debit Account</Label>
                          <Input placeholder="e.g., 1001" className="mt-1" />
                        </div>
                        <div>
                          <Label>GL Credit Account</Label>
                          <Input placeholder="e.g., 2001" className="mt-1" />
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowMappingDialog(false)}>Cancel</Button>
                      <Button className="bema-btn-primary">Save Mapping</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardTitle>
              <CardDescription>Current GL account assignments for all financial heads</CardDescription>
            </CardHeader>
            <CardContent>
              <Table className="bema-table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Financial Head</TableHead>
                    <TableHead>Fund Type</TableHead>
                    <TableHead>GL Debit</TableHead>
                    <TableHead>GL Credit</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {glMappings.map((mapping) => (
                    <TableRow key={mapping.id}>
                      <TableCell className="font-medium">{mapping.head}</TableCell>
                      <TableCell>{mapping.fund}</TableCell>
                      <TableCell>{mapping.glDebit}</TableCell>
                      <TableCell>{mapping.glCredit}</TableCell>
                      <TableCell>
                        <span className="bema-badge-success flex items-center gap-1 w-fit">
                          <CheckCircle className="h-3 w-3" />
                          Mapped
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card className="bema-card">
            <CardHeader>
              <CardTitle className="bema-h2">Export History</CardTitle>
              <CardDescription>Previous SAGE exports</CardDescription>
            </CardHeader>
            <CardContent>
              <Table className="bema-table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Export ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Batches</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exportHistory.map((exp) => (
                    <TableRow key={exp.id}>
                      <TableCell className="font-medium">{exp.id}</TableCell>
                      <TableCell>{exp.date}</TableCell>
                      <TableCell>{exp.period}</TableCell>
                      <TableCell>{exp.batches}</TableCell>
                      <TableCell>${exp.amount.toLocaleString()}</TableCell>
                      <TableCell>
                        <span className="bema-badge-success">{exp.status}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-1" />
                          Re-download
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
