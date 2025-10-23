import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Settings, Plus, Edit, Database, AlertCircle, CheckCircle } from "lucide-react";

interface FinancialHead {
  id: string;
  code: string;
  name: string;
  category: string;
  glAccount: string;
  fund: string;
  active: boolean;
}

interface Lookup {
  id: string;
  type: string;
  value: string;
  active: boolean;
}

export default function AdminConfiguration() {
  const [financialHeads, setFinancialHeads] = useState<FinancialHead[]>([
    { id: "1", code: "SS-001", name: "SS Contribution", category: "Recurring", glAccount: "2001-100", fund: "Social Security", active: true },
    { id: "2", code: "LEV-001", name: "Severance Levy", category: "Recurring", glAccount: "2001-200", fund: "Levy", active: true },
    { id: "3", code: "PE-001", name: "Public Enterprise", category: "Recurring", glAccount: "2001-300", fund: "PE", active: true },
    { id: "4", code: "LON-001", name: "Loan Payment", category: "One-Time", glAccount: "2001-400", fund: "Loan", active: true },
    { id: "5", code: "RNT-001", name: "Rental", category: "Service-linked", glAccount: "2001-500", fund: "Rental", active: true }
  ]);

  const [lookups, setLookups] = useState<Lookup[]>([
    { id: "1", type: "MOP", value: "Cash", active: true },
    { id: "2", type: "MOP", value: "Cheque", active: true },
    { id: "3", type: "MOP", value: "EFT", active: true },
    { id: "4", type: "MOP", value: "Card", active: true },
    { id: "5", type: "Penalty Reason", value: "NSF - Insufficient Funds", active: true },
    { id: "6", type: "Penalty Reason", value: "Signature Mismatch", active: true },
    { id: "7", type: "Denomination", value: "$100", active: true },
    { id: "8", type: "Denomination", value: "$50", active: true }
  ]);

  const toggleHeadActive = (id: string) => {
    setFinancialHeads(financialHeads.map(h => h.id === id ? { ...h, active: !h.active } : h));
    toast.success("Financial head status updated");
  };

  const toggleLookupActive = (id: string) => {
    setLookups(lookups.map(l => l.id === id ? { ...l, active: !l.active } : l));
    toast.success("Lookup status updated");
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="bema-h1 mb-2" style={{ color: "hsl(var(--bema-text-primary))" }}>Admin Configuration</h1>
        <p className="bema-t1" style={{ color: "hsl(var(--bema-text-secondary))" }}>
          Configure heads, lookups, and system settings for the Finance module
        </p>
      </div>

      <Tabs defaultValue="heads" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="heads">Financial Heads</TabsTrigger>
          <TabsTrigger value="lookups">Lookup Tables</TabsTrigger>
          <TabsTrigger value="logs">System Logs</TabsTrigger>
        </TabsList>

        {/* Financial Heads Tab */}
        <TabsContent value="heads" className="space-y-6">
          <Card className="bema-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="bema-h2">Financial Heads Configuration</CardTitle>
              <Button className="bema-btn-primary" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Head
              </Button>
            </CardHeader>
            <CardContent>
              <Table className="bema-table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>GL Account</TableHead>
                    <TableHead>Fund</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {financialHeads.map((head) => (
                    <TableRow key={head.id}>
                      <TableCell className="font-mono">{head.code}</TableCell>
                      <TableCell className="font-medium">{head.name}</TableCell>
                      <TableCell>
                        <span className="bema-badge-success">{head.category}</span>
                      </TableCell>
                      <TableCell className="font-mono">{head.glAccount}</TableCell>
                      <TableCell>{head.fund}</TableCell>
                      <TableCell>
                        <Switch checked={head.active} onCheckedChange={() => toggleHeadActive(head.id)} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bema-card">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="bema-t2 mb-1" style={{ color: "hsl(var(--bema-text-secondary))" }}>Total Heads</p>
                  <h3 className="bema-h2" style={{ color: "hsl(var(--bema-primary))" }}>
                    {financialHeads.length}
                  </h3>
                </div>
              </CardContent>
            </Card>
            <Card className="bema-card">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="bema-t2 mb-1" style={{ color: "hsl(var(--bema-text-secondary))" }}>Active Heads</p>
                  <h3 className="bema-h2" style={{ color: "hsl(var(--bema-success))" }}>
                    {financialHeads.filter(h => h.active).length}
                  </h3>
                </div>
              </CardContent>
            </Card>
            <Card className="bema-card">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="bema-t2 mb-1" style={{ color: "hsl(var(--bema-text-secondary))" }}>Inactive Heads</p>
                  <h3 className="bema-h2" style={{ color: "hsl(var(--bema-warning))" }}>
                    {financialHeads.filter(h => !h.active).length}
                  </h3>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Lookup Tables Tab */}
        <TabsContent value="lookups" className="space-y-6">
          <Card className="bema-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="bema-h2">Lookup & Reference Management</CardTitle>
              <Button className="bema-btn-primary" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Lookup
              </Button>
            </CardHeader>
            <CardContent>
              <Table className="bema-table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lookups.map((lookup) => (
                    <TableRow key={lookup.id}>
                      <TableCell className="font-medium">{lookup.type}</TableCell>
                      <TableCell>{lookup.value}</TableCell>
                      <TableCell>
                        <Switch checked={lookup.active} onCheckedChange={() => toggleLookupActive(lookup.id)} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Lookup Categories */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bema-card">
              <CardHeader>
                <CardTitle className="bema-h2">Lookup Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <li className="bema-t1 flex justify-between">
                    <span>Payment Methods (MOP)</span>
                    <span className="font-semibold">{lookups.filter(l => l.type === "MOP").length}</span>
                  </li>
                  <li className="bema-t1 flex justify-between">
                    <span>Penalty Reasons</span>
                    <span className="font-semibold">{lookups.filter(l => l.type === "Penalty Reason").length}</span>
                  </li>
                  <li className="bema-t1 flex justify-between">
                    <span>Denominations</span>
                    <span className="font-semibold">{lookups.filter(l => l.type === "Denomination").length}</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
            <Card className="bema-card">
              <CardHeader>
                <CardTitle className="bema-h2">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  <Database className="h-4 w-4 mr-2" />
                  Import Lookup Data
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Settings className="h-4 w-4 mr-2" />
                  Bulk Update Status
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* System Logs Tab */}
        <TabsContent value="logs" className="space-y-6">
          <Card className="bema-card">
            <CardHeader>
              <CardTitle className="bema-h2">Recent System Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <Table className="bema-table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Module</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>2025-04-23 10:30 AM</TableCell>
                    <TableCell>admin@ssb.gov.kn</TableCell>
                    <TableCell>Updated GL Mapping</TableCell>
                    <TableCell>Finance Config</TableCell>
                    <TableCell>
                      <CheckCircle className="h-4 w-4" style={{ color: "hsl(var(--bema-success))" }} />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>2025-04-23 09:15 AM</TableCell>
                    <TableCell>supervisor@ssb.gov.kn</TableCell>
                    <TableCell>Created Financial Head</TableCell>
                    <TableCell>Finance Config</TableCell>
                    <TableCell>
                      <CheckCircle className="h-4 w-4" style={{ color: "hsl(var(--bema-success))" }} />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>2025-04-22 04:45 PM</TableCell>
                    <TableCell>admin@ssb.gov.kn</TableCell>
                    <TableCell>Batch Reopened</TableCell>
                    <TableCell>Batch Management</TableCell>
                    <TableCell>
                      <AlertCircle className="h-4 w-4" style={{ color: "hsl(var(--bema-warning))" }} />
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
