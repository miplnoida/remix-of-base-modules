import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { FileCheck, Calendar, Plus, ChevronDown, ChevronUp } from "lucide-react";
import { CreateCompliancePlanDialog } from "./CreateCompliancePlanDialog";
import { AddComplianceWaiverDialog } from "./AddComplianceWaiverDialog";

interface Waiver {
  id: string;
  waiverType: string;
  amount: number;
  percent?: number;
  authorizedBy: string;
  date: string;
  reason: string;
}

interface Plan {
  id: string;
  terms: string;
  durationMonths: number;
  startDate: string;
  status: string;
  installments: Array<{
    date: string;
    amount: number;
    paid: boolean;
  }>;
}

interface PlansWaiversSectionProps {
  employerId: string;
  waivers?: Waiver[];
  plans?: Plan[];
  totalAmount?: number;
  isOpen: boolean;
  onToggle: () => void;
}

export function PlansWaiversSection({ 
  employerId, 
  waivers = [], 
  plans = [], 
  totalAmount = 0,
  isOpen,
  onToggle 
}: PlansWaiversSectionProps) {
  const [isCreatePlanOpen, setIsCreatePlanOpen] = useState(false);
  const [isAddWaiverOpen, setIsAddWaiverOpen] = useState(false);

  // Find next payment due from plans
  const getNextPaymentDue = () => {
    const activePlan = plans.find(p => p.status === 'On Track');
    if (!activePlan) return null;
    
    const nextInstallment = activePlan.installments.find(i => !i.paid);
    return nextInstallment ? new Date(nextInstallment.date) : null;
  };

  const nextPaymentDue = getNextPaymentDue();
  const totalWaived = waivers.reduce((sum, w) => sum + w.amount, 0);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      "On Track": "default",
      "Missed": "destructive",
      "Completed": "secondary",
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  return (
    <>
      <Card className="border-2 shadow-lg border-purple-200 bg-gradient-to-br from-purple-50/50 to-background">
        <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={onToggle}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <CardTitle className="flex items-center gap-3 text-lg">
                <FileCheck className="h-6 w-6 text-purple-600" />
                Plans & Waivers
                <Badge className="bg-purple-600/10 text-purple-700 hover:bg-purple-600/20 font-semibold px-3 py-1">
                  {waivers.length} Waivers
                </Badge>
                <Badge className="bg-blue-600/10 text-blue-700 hover:bg-blue-600/20 font-semibold px-3 py-1">
                  {plans.length} Plans
                </Badge>
              </CardTitle>
              {nextPaymentDue && (
                <Badge className="bg-orange-600/10 text-orange-700 hover:bg-orange-600/20 font-semibold px-3 py-1 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Next Due: {nextPaymentDue.toLocaleDateString()}
                </Badge>
              )}
            </div>
            {isOpen ? <ChevronUp className="h-5 w-5 text-purple-600" /> : <ChevronDown className="h-5 w-5 text-purple-600" />}
          </div>
        </CardHeader>

        {isOpen && (
          <CardContent>
            <Tabs defaultValue="waivers" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="waivers">Waivers</TabsTrigger>
                <TabsTrigger value="plans">Payment Plans</TabsTrigger>
              </TabsList>

              <TabsContent value="waivers" className="mt-4 space-y-4">
                <div className="flex justify-between items-center">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Total Waived: </span>
                    <span className="font-semibold text-green-600">
                      ${totalWaived.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <Button size="sm" onClick={() => setIsAddWaiverOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Waiver
                  </Button>
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Amount/Percent</TableHead>
                        <TableHead>Authorized By</TableHead>
                        <TableHead>Reason</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {waivers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                            No waivers applied. Click "Add Waiver" to create one.
                          </TableCell>
                        </TableRow>
                      ) : (
                        waivers.map((waiver) => (
                          <TableRow key={waiver.id}>
                            <TableCell>{new Date(waiver.date).toLocaleDateString()}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{waiver.waiverType}</Badge>
                            </TableCell>
                            <TableCell className="text-right font-semibold text-green-600">
                              {waiver.percent 
                                ? `${waiver.percent}%` 
                                : `$${waiver.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                              }
                            </TableCell>
                            <TableCell>{waiver.authorizedBy}</TableCell>
                            <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                              {waiver.reason}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="plans" className="mt-4 space-y-4">
                <div className="flex justify-end">
                  <Button size="sm" onClick={() => setIsCreatePlanOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Plan
                  </Button>
                </div>

                {plans.length === 0 ? (
                  <div className="border rounded-lg p-8 text-center text-muted-foreground">
                    No payment plans created. Click "Create Plan" to set one up.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {plans.map((plan) => {
                      const totalInstallments = plan.installments.length;
                      const paidInstallments = plan.installments.filter(i => i.paid).length;
                      const progress = (paidInstallments / totalInstallments) * 100;
                      const nextDue = plan.installments.find(i => !i.paid);

                      return (
                        <Card key={plan.id} className="p-4">
                          <div className="space-y-4">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-semibold">{plan.terms}</h4>
                                <p className="text-sm text-muted-foreground mt-1">
                                  Started: {new Date(plan.startDate).toLocaleDateString()} • {plan.durationMonths} months
                                </p>
                              </div>
                              {getStatusBadge(plan.status)}
                            </div>

                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Progress</span>
                                <span className="font-medium">{paidInstallments} of {totalInstallments} paid</span>
                              </div>
                              <Progress value={progress} className="h-2" />
                            </div>

                            {nextDue && (
                              <div className="bg-muted/50 rounded-lg p-3">
                                <p className="text-sm text-muted-foreground">Next Payment Due</p>
                                <div className="flex justify-between items-center mt-1">
                                  <span className="font-semibold">{new Date(nextDue.date).toLocaleDateString()}</span>
                                  <span className="font-semibold">
                                    ${nextDue.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                  </span>
                                </div>
                              </div>
                            )}

                            <div className="border rounded-lg overflow-hidden">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Due Date</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                    <TableHead>Status</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {plan.installments.map((installment, idx) => (
                                    <TableRow key={idx}>
                                      <TableCell>{new Date(installment.date).toLocaleDateString()}</TableCell>
                                      <TableCell className="text-right">
                                        ${installment.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                      </TableCell>
                                      <TableCell>
                                        {installment.paid ? (
                                          <Badge variant="secondary">Paid</Badge>
                                        ) : (
                                          <Badge variant="outline">Pending</Badge>
                                        )}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        )}
      </Card>

      <CreateCompliancePlanDialog
        open={isCreatePlanOpen}
        onOpenChange={setIsCreatePlanOpen}
        employerId={employerId}
        totalAmount={totalAmount}
      />

      <AddComplianceWaiverDialog
        open={isAddWaiverOpen}
        onOpenChange={setIsAddWaiverOpen}
        employerId={employerId}
      />
    </>
  );
}
