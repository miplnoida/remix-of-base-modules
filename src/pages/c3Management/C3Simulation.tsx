import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Calculator, TrendingUp, DollarSign, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const C3Simulation = () => {
  const [employeeSalary, setEmployeeSalary] = useState<string>("3000");
  const [employerSalary, setEmployerSalary] = useState<string>("3000");

  // Calculation logic based on St. Kitts & Nevis rules
  const calculateContributions = (salary: number) => {
    const monthlyCap = 6500; // EC$6,500 monthly cap
    const insurableEarnings = Math.min(salary, monthlyCap);
    
    // Rates: 5% employee, 5% employer, 1% injury (for ages 16-62)
    const employeeSSC = insurableEarnings * 0.05;
    const employerSSC = insurableEarnings * 0.05;
    const injuryContribution = insurableEarnings * 0.01;
    
    // Levy calculation (example rate)
    const levyContribution = insurableEarnings * 0.02;
    
    // Severance (example rate)
    const severanceContribution = insurableEarnings * 0.01;
    
    return {
      insurableEarnings,
      employeeSSC,
      employerSSC,
      injuryContribution,
      levyContribution,
      severanceContribution,
      totalEmployeeDeduction: employeeSSC,
      totalEmployerCost: employerSSC + injuryContribution + levyContribution + severanceContribution,
      grandTotal: employeeSSC + employerSSC + injuryContribution + levyContribution + severanceContribution
    };
  };

  const employeeCalc = calculateContributions(parseFloat(employeeSalary) || 0);
  const employerCalc = calculateContributions(parseFloat(employerSalary) || 0);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="C3 Simulation"
        subtitle="Interactive calculation tool for C3 contributions"
        breadcrumbs={[
          { label: "C3 Management", href: "/c3-management/dashboard" },
          { label: "C3 Simulation" }
        ]}
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Social Security</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">10%</div>
            <p className="text-xs text-muted-foreground">Combined Rate (5% + 5%)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Employment Injury</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">1%</div>
            <p className="text-xs text-muted-foreground">Employer Only</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Levy</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">2%</div>
            <p className="text-xs text-muted-foreground">Example Rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Cap</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">EC$6,500</div>
            <p className="text-xs text-muted-foreground">Insurable Earnings Limit</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="calculator" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="calculator">Calculator</TabsTrigger>
          <TabsTrigger value="breakdown">Detailed Breakdown</TabsTrigger>
          <TabsTrigger value="examples">Examples</TabsTrigger>
        </TabsList>

        <TabsContent value="calculator" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Employee Calculation */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Employee Contribution Calculator
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="employee-salary">Monthly Salary (EC$)</Label>
                  <Input
                    id="employee-salary"
                    type="number"
                    value={employeeSalary}
                    onChange={(e) => setEmployeeSalary(e.target.value)}
                    placeholder="Enter monthly salary"
                  />
                </div>

                <div className="space-y-3 pt-4 border-t">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Insurable Earnings:</span>
                    <span className="font-medium">EC${employeeCalc.insurableEarnings.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Employee SSC (5%):</span>
                    <span className="font-medium">EC${employeeCalc.employeeSSC.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between pt-3 border-t">
                    <span className="font-semibold">Total Employee Deduction:</span>
                    <span className="font-bold text-lg text-primary">EC${employeeCalc.totalEmployeeDeduction.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Employer Calculation */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Employer Contribution Calculator
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="employer-salary">Monthly Salary (EC$)</Label>
                  <Input
                    id="employer-salary"
                    type="number"
                    value={employerSalary}
                    onChange={(e) => setEmployerSalary(e.target.value)}
                    placeholder="Enter monthly salary"
                  />
                </div>

                <div className="space-y-3 pt-4 border-t">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Insurable Earnings:</span>
                    <span className="font-medium">EC${employerCalc.insurableEarnings.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Employer SSC (5%):</span>
                    <span className="font-medium">EC${employerCalc.employerSSC.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Injury (1%):</span>
                    <span className="font-medium">EC${employerCalc.injuryContribution.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Levy (2%):</span>
                    <span className="font-medium">EC${employerCalc.levyContribution.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Severance (1%):</span>
                    <span className="font-medium">EC${employerCalc.severanceContribution.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between pt-3 border-t">
                    <span className="font-semibold">Total Employer Cost:</span>
                    <span className="font-bold text-lg text-primary">EC${employerCalc.totalEmployerCost.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Combined Summary */}
          <Card className="bg-accent/20">
            <CardHeader>
              <CardTitle>Combined Contribution Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">Employee Deduction</p>
                  <p className="text-3xl font-bold text-primary">EC${employeeCalc.totalEmployeeDeduction.toFixed(2)}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">Employer Cost</p>
                  <p className="text-3xl font-bold text-primary">EC${employerCalc.totalEmployerCost.toFixed(2)}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">Grand Total to SSB</p>
                  <p className="text-3xl font-bold text-primary">EC${employeeCalc.grandTotal.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="breakdown" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Contribution Component Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Badge variant="outline">SSC</Badge>
                  Social Security Contributions
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Social Security Contributions are mandatory for all employees aged 16-62 years. Both employee and employer contribute 5% each on insurable earnings up to EC$6,500 per month.
                </p>
                <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span>Employee Rate:</span>
                    <span className="font-medium">5%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Employer Rate:</span>
                    <span className="font-medium">5%</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="font-semibold">Total Combined:</span>
                    <span className="font-bold">10%</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Badge variant="outline">SSF</Badge>
                  Social Security Penalties
                </h3>
                <p className="text-sm text-muted-foreground">
                  Penalties of 5% per month are applied on late submissions. Calculated on outstanding amounts after grace period expires.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Badge variant="outline">LVC</Badge>
                  Housing & Social Development Levy
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  The Levy supports housing and social development programs. Calculated as a percentage of insurable earnings.
                </p>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <div className="flex justify-between">
                    <span>Levy Rate (Example):</span>
                    <span className="font-medium">2%</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Badge variant="outline">PEC</Badge>
                  Severance Contributions
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Severance contributions provide protection for employees in case of termination. Paid by employer.
                </p>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <div className="flex justify-between">
                    <span>Severance Rate (Example):</span>
                    <span className="font-medium">1%</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Badge variant="outline">INJ</Badge>
                  Employment Injury Insurance
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Employment Injury Insurance protects employees who suffer work-related injuries. Fully paid by employer.
                </p>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <div className="flex justify-between">
                    <span>Injury Rate:</span>
                    <span className="font-medium">1%</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="examples" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Example Scenarios</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {[
                { salary: 2000, scenario: "Below Cap Earnings" },
                { salary: 5000, scenario: "Mid-Range Earnings" },
                { salary: 6500, scenario: "At Monthly Cap" },
                { salary: 10000, scenario: "Above Cap (Capped at EC$6,500)" }
              ].map((example) => {
                const calc = calculateContributions(example.salary);
                return (
                  <div key={example.salary} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold">{example.scenario}</h4>
                      <Badge>EC${example.salary.toLocaleString()}</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Insurable Earnings:</p>
                        <p className="font-medium">EC${calc.insurableEarnings.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Employee Deduction:</p>
                        <p className="font-medium">EC${calc.totalEmployeeDeduction.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Employer Cost:</p>
                        <p className="font-medium">EC${calc.totalEmployerCost.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Total to SSB:</p>
                        <p className="font-medium text-primary">EC${calc.grandTotal.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default C3Simulation;
