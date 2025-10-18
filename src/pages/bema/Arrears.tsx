import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, TrendingDown, AlertTriangle, CheckCircle, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export default function BemaArrears() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Arrears & Debt Tracking</h1>
          <p className="text-muted-foreground">
            Employer arrears ledger, payment plans & debt recovery
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          New Payment Plan
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
            <DollarSign className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$2.4M</div>
            <p className="text-xs text-muted-foreground">Across 156 employers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Plans</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">43</div>
            <p className="text-xs text-muted-foreground">Payment plans in progress</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Broken Plans</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">7</div>
            <p className="text-xs text-muted-foreground">Require escalation</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recovered (MTD)</CardTitle>
            <TrendingDown className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$187K</div>
            <p className="text-xs text-muted-foreground">+23% vs last month</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="ledger">
        <TabsList>
          <TabsTrigger value="ledger">Arrears Ledger</TabsTrigger>
          <TabsTrigger value="plans">Payment Plans</TabsTrigger>
          <TabsTrigger value="overdue">Overdue</TabsTrigger>
        </TabsList>

        <TabsContent value="ledger" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Employer Arrears Ledger</CardTitle>
              <CardDescription>
                Track outstanding contributions by employer and period
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { employer: "Caribbean Construction Ltd", periods: 6, ss: 45000, levy: 12000, ei: 8000, penalties: 5400, total: 70400 },
                  { employer: "Island Retail Group", periods: 3, ss: 22000, levy: 6000, ei: 4500, penalties: 1950, total: 34450 },
                  { employer: "Tech Solutions Inc", periods: 12, ss: 89000, levy: 24000, ei: 18000, penalties: 15840, total: 146840 },
                ].map((debt, i) => (
                  <div key={i} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{debt.employer}</p>
                        <p className="text-sm text-muted-foreground">{debt.periods} periods outstanding</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-red-600">${debt.total.toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">Total debt</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">SS Contributions</p>
                        <p className="font-medium">${debt.ss.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Levy</p>
                        <p className="font-medium">${debt.levy.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">EI</p>
                        <p className="font-medium">${debt.ei.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Penalties</p>
                        <p className="font-medium text-amber-600">${debt.penalties.toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">View Details</Button>
                      <Button size="sm">Create Payment Plan</Button>
                      <Button variant="destructive" size="sm">Escalate to Legal</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plans">
          <Card>
            <CardHeader>
              <CardTitle>Active Payment Plans</CardTitle>
              <CardDescription>Monitor installment payment schedules</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { employer: "Hotel Paradise", total: 50000, paid: 30000, installments: "6 of 10", nextDue: "2025-02-15", status: "active" },
                  { employer: "Manufacturing Co", total: 35000, paid: 28000, installments: "8 of 10", nextDue: "2025-02-10", status: "active" },
                  { employer: "Retail Store Ltd", total: 25000, paid: 10000, installments: "2 of 5", nextDue: "2025-01-25", status: "broken" },
                ].map((plan, i) => (
                  <div key={i} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{plan.employer}</p>
                        <p className="text-sm text-muted-foreground">{plan.installments} paid</p>
                      </div>
                      <Badge variant={plan.status === "active" ? "default" : "destructive"}>
                        {plan.status}
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium">${plan.paid.toLocaleString()} / ${plan.total.toLocaleString()}</span>
                      </div>
                      <Progress value={(plan.paid / plan.total) * 100} />
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Next installment due: {plan.nextDue}</span>
                      <Button variant="outline" size="sm">View Plan</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="overdue">
          <Card>
            <CardHeader>
              <CardTitle>Overdue Debts</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Overdue arrears requiring immediate action will appear here</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
