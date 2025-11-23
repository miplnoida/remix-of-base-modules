import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, Eye, CheckCircle, XCircle } from "lucide-react";

interface PaymentPlan {
  planId: string;
  caseNumber: string;
  partyName: string;
  planType: "Court-Ordered" | "Voluntary Agreement";
  totalAmount: number;
  installmentAmount: number;
  frequency: string;
  startDate: string;
  numberOfInstallments: number;
  installmentsPaid: number;
  totalPaid: number;
  outstanding: number;
  nextDueDate: string;
  status: string;
}

const mockPaymentPlans: PaymentPlan[] = [
  {
    planId: "PLAN-001",
    caseNumber: "SSB/LGL/001/2024",
    partyName: "ABC Construction Ltd",
    planType: "Court-Ordered",
    totalAmount: 109000,
    installmentAmount: 10000,
    frequency: "Monthly",
    startDate: "2024-10-01",
    numberOfInstallments: 11,
    installmentsPaid: 2,
    totalPaid: 20000,
    outstanding: 89000,
    nextDueDate: "2024-12-01",
    status: "Active - Current"
  },
  {
    planId: "PLAN-002",
    caseNumber: "SSB/LGL/002/2024",
    partyName: "XYZ Services Inc",
    planType: "Voluntary Agreement",
    totalAmount: 53900,
    installmentAmount: 5000,
    frequency: "Monthly",
    startDate: "2024-11-01",
    numberOfInstallments: 11,
    installmentsPaid: 0,
    totalPaid: 0,
    outstanding: 53900,
    nextDueDate: "2024-12-01",
    status: "Active - Current"
  },
  {
    planId: "PLAN-003",
    caseNumber: "SSB/LGL/004/2024",
    partyName: "Quick Shop Ltd",
    planType: "Court-Ordered",
    totalAmount: 32000,
    installmentAmount: 4000,
    frequency: "Monthly",
    startDate: "2024-08-01",
    numberOfInstallments: 8,
    installmentsPaid: 3,
    totalPaid: 12000,
    outstanding: 20000,
    nextDueDate: "2024-11-01",
    status: "Defaulted"
  }
];

const LegalPaymentPlans = () => {
  const activePlans = mockPaymentPlans.filter(p => p.status.includes("Active")).length;
  const defaultedPlans = mockPaymentPlans.filter(p => p.status === "Defaulted").length;
  const totalOutstanding = mockPaymentPlans.reduce((sum, p) => sum + p.outstanding, 0);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Payment Plans"
        subtitle="Court-ordered installment plans and voluntary agreements"
        breadcrumbs={[
          { label: "Legal Management", href: "/legal/dashboard" },
          { label: "Court Orders & Enforcement", href: "/legal/court-orders" },
          { label: "Payment Plans" }
        ]}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Plans</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activePlans}</div>
            <p className="text-xs text-muted-foreground">Current and compliant</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Defaulted Plans</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{defaultedPlans}</div>
            <p className="text-xs text-muted-foreground">Missed payments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">EC${totalOutstanding.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Across all plans</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0%</div>
            <p className="text-xs text-muted-foreground">Plans fully paid</p>
          </CardContent>
        </Card>
      </div>

      {/* Payment Plans Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Plans ({mockPaymentPlans.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plan ID</TableHead>
                  <TableHead>Case Number</TableHead>
                  <TableHead>Party Name</TableHead>
                  <TableHead>Plan Type</TableHead>
                  <TableHead className="text-right">Total Amount</TableHead>
                  <TableHead>Installment</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                  <TableHead>Next Due</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockPaymentPlans.map((plan) => (
                  <TableRow key={plan.planId}>
                    <TableCell className="font-medium">{plan.planId}</TableCell>
                    <TableCell>{plan.caseNumber}</TableCell>
                    <TableCell>{plan.partyName}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{plan.planType}</Badge>
                    </TableCell>
                    <TableCell className="text-right">EC${plan.totalAmount.toLocaleString()}</TableCell>
                    <TableCell>
                      {plan.frequency}: EC${plan.installmentAmount.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="text-sm">
                          {plan.installmentsPaid}/{plan.numberOfInstallments}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          ({Math.round((plan.installmentsPaid / plan.numberOfInstallments) * 100)}%)
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      EC${plan.outstanding.toLocaleString()}
                    </TableCell>
                    <TableCell>{plan.nextDueDate}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={
                          plan.status === "Defaulted" ? "destructive" :
                          plan.status.includes("Active") ? "default" : "secondary"
                        }
                      >
                        {plan.status}
                      </Badge>
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

export default LegalPaymentPlans;
