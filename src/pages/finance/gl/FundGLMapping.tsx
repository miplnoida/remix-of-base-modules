import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Save, Edit, Trash2, Plus, Lock } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function FundGLMapping() {
  const [isEditing, setIsEditing] = useState(false);
  const [mappings, setMappings] = useState([
    {
      id: 1,
      head: "Social Security Contribution",
      fund: "Social Security Fund",
      glDebit: "1100-001",
      glCredit: "2200-001",
      active: true,
      editable: false
    },
    {
      id: 2,
      head: "Education Levy",
      fund: "Levy Fund",
      glDebit: "1100-002",
      glCredit: "2200-002",
      active: true,
      editable: false
    },
    {
      id: 3,
      head: "Public Enterprise",
      fund: "PE Fund",
      glDebit: "1100-003",
      glCredit: "2200-003",
      active: true,
      editable: false
    },
    {
      id: 4,
      head: "Rental Income",
      fund: "Rental Fund",
      glDebit: "1100-004",
      glCredit: "4100-001",
      active: true,
      editable: false
    },
    {
      id: 5,
      head: "Loan Repayment",
      fund: "Loan Repayment",
      glDebit: "1100-005",
      glCredit: "1300-001",
      active: true,
      editable: false
    }
  ]);

  const [newMapping, setNewMapping] = useState({
    head: "",
    fund: "",
    glDebit: "",
    glCredit: ""
  });

  const handleSaveMapping = () => {
    if (!newMapping.head || !newMapping.fund || !newMapping.glDebit || !newMapping.glCredit) {
      toast.error("Please fill in all fields");
      return;
    }

    setMappings([...mappings, {
      id: mappings.length + 1,
      ...newMapping,
      active: true,
      editable: false
    }]);

    setNewMapping({ head: "", fund: "", glDebit: "", glCredit: "" });
    toast.success("GL mapping added successfully");
  };

  const handleEditMapping = (id: number) => {
    setMappings(mappings.map(m => 
      m.id === id ? { ...m, editable: !m.editable } : m
    ));
  };

  const handleToggleActive = (id: number) => {
    setMappings(mappings.map(m => 
      m.id === id ? { ...m, active: !m.active } : m
    ));
    toast.info("Mapping status updated");
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Fund to GL Mapping</h1>
        <p className="text-muted-foreground">Configure payment head to General Ledger account mappings</p>
      </div>

      <Card className="border-amber-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-amber-500" />
            Admin Access Only
          </CardTitle>
          <CardDescription>
            Only Finance Officers and Administrators can modify GL mappings
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add New GL Mapping</CardTitle>
          <CardDescription>Create a new mapping between payment head and GL accounts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Payment Head</Label>
              <Select value={newMapping.head} onValueChange={(v) => setNewMapping({...newMapping, head: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select payment head" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Penalty">Penalty</SelectItem>
                  <SelectItem value="Interest">Interest</SelectItem>
                  <SelectItem value="Service Fee">Service Fee</SelectItem>
                  <SelectItem value="Late Fee">Late Fee</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Fund Category</Label>
              <Select value={newMapping.fund} onValueChange={(v) => setNewMapping({...newMapping, fund: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select fund" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Social Security Fund">Social Security Fund</SelectItem>
                  <SelectItem value="Levy Fund">Levy Fund</SelectItem>
                  <SelectItem value="PE Fund">PE Fund</SelectItem>
                  <SelectItem value="Rental Fund">Rental Fund</SelectItem>
                  <SelectItem value="Other Revenue">Other Revenue</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>GL Debit Account</Label>
              <Input 
                placeholder="e.g., 1100-006"
                value={newMapping.glDebit}
                onChange={(e) => setNewMapping({...newMapping, glDebit: e.target.value})}
              />
            </div>

            <div>
              <Label>GL Credit Account</Label>
              <Input 
                placeholder="e.g., 4200-001"
                value={newMapping.glCredit}
                onChange={(e) => setNewMapping({...newMapping, glCredit: e.target.value})}
              />
            </div>
          </div>

          <Button onClick={handleSaveMapping} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add GL Mapping
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current GL Mappings</CardTitle>
          <CardDescription>Active mappings used in financial transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Payment Head</TableHead>
                <TableHead>Fund Category</TableHead>
                <TableHead>GL Debit</TableHead>
                <TableHead>GL Credit</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mappings.map((mapping) => (
                <TableRow key={mapping.id}>
                  <TableCell className="font-medium">{mapping.head}</TableCell>
                  <TableCell>{mapping.fund}</TableCell>
                  <TableCell>
                    {mapping.editable ? (
                      <Input defaultValue={mapping.glDebit} className="w-32" />
                    ) : (
                      <span className="font-mono">{mapping.glDebit}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {mapping.editable ? (
                      <Input defaultValue={mapping.glCredit} className="w-32" />
                    ) : (
                      <span className="font-mono">{mapping.glCredit}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={mapping.active ? "default" : "secondary"}>
                      {mapping.active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleEditMapping(mapping.id)}
                      >
                        {mapping.editable ? <Save className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleToggleActive(mapping.id)}
                      >
                        {mapping.active ? <Lock className="h-4 w-4" /> : <Lock className="h-4 w-4 text-muted-foreground" />}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>GL Chart Reference</CardTitle>
          <CardDescription>Common GL account codes used in the system</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2">Asset Accounts (1000-1999)</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>1100 - Cash & Bank Accounts</li>
                <li>1200 - Accounts Receivable</li>
                <li>1300 - Loans Receivable</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Liability Accounts (2000-2999)</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>2200 - Contribution Payable</li>
                <li>2300 - Benefits Payable</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Revenue Accounts (4000-4999)</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>4100 - Rental Income</li>
                <li>4200 - Fee Income</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Expense Accounts (5000-5999)</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>5100 - Benefit Disbursements</li>
                <li>5200 - Administrative Expenses</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
