import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Gavel, Plus, Eye, FileText, DollarSign } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface CourtOrder {
  orderId: string;
  caseNumber: string;
  partyName: string;
  orderType: string;
  orderDate: string;
  court: string;
  judge: string;
  principal: number;
  interest: number;
  penalties: number;
  courtCosts: number;
  totalOrdered: number;
  dueDate: string;
  installmentSchedule: string;
  status: string;
}

const mockOrders: CourtOrder[] = [
  {
    orderId: "ORD-001",
    caseNumber: "SSB/LGL/001/2024",
    partyName: "ABC Construction Ltd",
    orderType: "Judgment",
    orderDate: "2024-09-15",
    court: "High Court - St Kitts",
    judge: "Hon. Justice Williams",
    principal: 85000,
    interest: 12000,
    penalties: 8500,
    courtCosts: 3500,
    totalOrdered: 109000,
    dueDate: "2024-12-15",
    installmentSchedule: "Monthly - EC$10,000",
    status: "Active"
  },
  {
    orderId: "ORD-002",
    caseNumber: "SSB/LGL/002/2024",
    partyName: "XYZ Services Inc",
    orderType: "Interim Order",
    orderDate: "2024-10-20",
    court: "Magistrate Court - Nevis",
    judge: "Hon. Magistrate Brown",
    principal: 42000,
    interest: 5600,
    penalties: 4200,
    courtCosts: 2100,
    totalOrdered: 53900,
    dueDate: "2025-01-20",
    installmentSchedule: "Lump Sum",
    status: "Active"
  }
];

const CourtOrdersManagement = () => {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const handleAddOrder = () => {
    toast({
      title: "Court Order Recorded",
      description: "Court order has been successfully recorded",
    });
    setIsAddDialogOpen(false);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Court Orders Management"
        subtitle="Record and manage all court orders and judgments"
        breadcrumbs={[
          { label: "Legal Management", href: "/legal/dashboard" },
          { label: "Court Orders & Enforcement", href: "/legal/court-orders" }
        ]}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <Gavel className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockOrders.length}</div>
            <p className="text-xs text-muted-foreground">Active court orders</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Ordered</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              EC${mockOrders.reduce((sum, o) => sum + o.totalOrdered, 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Sum of all orders</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Judgments</CardTitle>
            <Gavel className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {mockOrders.filter(o => o.orderType === "Judgment").length}
            </div>
            <p className="text-xs text-muted-foreground">Final judgments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Interim Orders</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {mockOrders.filter(o => o.orderType === "Interim Order").length}
            </div>
            <p className="text-xs text-muted-foreground">Pending final judgment</p>
          </CardContent>
        </Card>
      </div>

      {/* Actions and Add Order */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Court Orders</h2>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Record Court Order
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Record New Court Order</DialogTitle>
              <DialogDescription>
                Enter court order details and financial breakdown
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Case Number *</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select case" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">SSB/LGL/001/2024</SelectItem>
                      <SelectItem value="2">SSB/LGL/002/2024</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Order Type *</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="judgment">Judgment</SelectItem>
                      <SelectItem value="interim">Interim Order</SelectItem>
                      <SelectItem value="consent">Consent Order</SelectItem>
                      <SelectItem value="variation">Variation Order</SelectItem>
                      <SelectItem value="adjournment">Adjournment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Court *</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select court" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hc-sk">High Court - St Kitts</SelectItem>
                      <SelectItem value="mc-sk">Magistrate Court - St Kitts</SelectItem>
                      <SelectItem value="hc-nv">High Court - Nevis</SelectItem>
                      <SelectItem value="mc-nv">Magistrate Court - Nevis</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Judge *</Label>
                  <Input placeholder="Enter judge name" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Order Date *</Label>
                  <Input type="date" />
                </div>

                <div className="space-y-2">
                  <Label>Due Date *</Label>
                  <Input type="date" />
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-4">Financial Breakdown</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Principal Amount (EC$)</Label>
                    <Input type="number" step="0.01" placeholder="0.00" />
                  </div>

                  <div className="space-y-2">
                    <Label>Interest (EC$)</Label>
                    <Input type="number" step="0.01" placeholder="0.00" />
                  </div>

                  <div className="space-y-2">
                    <Label>Penalties (EC$)</Label>
                    <Input type="number" step="0.01" placeholder="0.00" />
                  </div>

                  <div className="space-y-2">
                    <Label>Court Costs (EC$)</Label>
                    <Input type="number" step="0.01" placeholder="0.00" />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Installment Schedule</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select schedule" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lump">Lump Sum</SelectItem>
                    <SelectItem value="monthly">Monthly Installments</SelectItem>
                    <SelectItem value="quarterly">Quarterly Installments</SelectItem>
                    <SelectItem value="custom">Custom Schedule</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Order Notes</Label>
                <Textarea rows={3} placeholder="Additional order details, conditions, or remarks" />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddOrder}>
                  Record Order
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Court Orders Table */}
      <Card>
        <CardContent className="pt-6">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Case Number</TableHead>
                  <TableHead>Party</TableHead>
                  <TableHead>Order Type</TableHead>
                  <TableHead>Court</TableHead>
                  <TableHead>Judge</TableHead>
                  <TableHead>Order Date</TableHead>
                  <TableHead className="text-right">Total Ordered</TableHead>
                  <TableHead>Installment Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockOrders.map((order) => (
                  <TableRow key={order.orderId}>
                    <TableCell className="font-medium">{order.orderId}</TableCell>
                    <TableCell>{order.caseNumber}</TableCell>
                    <TableCell>{order.partyName}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{order.orderType}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{order.court}</TableCell>
                    <TableCell className="text-sm">{order.judge}</TableCell>
                    <TableCell>{order.orderDate}</TableCell>
                    <TableCell className="text-right font-semibold">
                      EC${order.totalOrdered.toLocaleString()}
                    </TableCell>
                    <TableCell>{order.installmentSchedule}</TableCell>
                    <TableCell>
                      <Badge>{order.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CourtOrdersManagement;
