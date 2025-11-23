import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Calculator, TrendingUp, DollarSign, Users, Plus, Trash2, Download, Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface EmployeeEntry {
  id: string;
  name: string;
  ssn: string;
  salary: number;
  ageGroup: string;
  weeksWorked: number;
  overtimeHours: number;
  holidayPay: number;
}

const C3Simulation = () => {
  const { toast } = useToast();
  const [employees, setEmployees] = useState<EmployeeEntry[]>([
    {
      id: "1",
      name: "",
      ssn: "",
      salary: 3000,
      ageGroup: "16-62",
      weeksWorked: 4,
      overtimeHours: 0,
      holidayPay: 0
    }
  ]);

  const [employerInfo, setEmployerInfo] = useState({
    employerName: "",
    employerRegNo: "",
    period: ""
  });

  // Calculation logic based on St. Kitts & Nevis rules
  const calculateContributions = (employee: EmployeeEntry) => {
    const monthlyCap = 6500;
    const totalGrossSalary = employee.salary + employee.overtimeHours + employee.holidayPay;
    const insurableEarnings = Math.min(totalGrossSalary, monthlyCap);
    
    // Rates based on age group (16-62: 5%/5%/1%, otherwise 0%/0%/1%)
    const isWorking = employee.ageGroup === "16-62";
    const employeeSSCRate = isWorking ? 0.05 : 0.0;
    const employerSSCRate = isWorking ? 0.05 : 0.0;
    const injuryRate = 0.01; // Always applicable
    
    const employeeSSC = insurableEarnings * employeeSSCRate;
    const employerSSC = insurableEarnings * employerSSCRate;
    const injuryContribution = insurableEarnings * injuryRate;
    
    // Levy calculation
    const levyContribution = insurableEarnings * 0.02;
    
    // Severance
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

  const addEmployee = () => {
    const newEmployee: EmployeeEntry = {
      id: Date.now().toString(),
      name: "",
      ssn: "",
      salary: 3000,
      ageGroup: "16-62",
      weeksWorked: 4,
      overtimeHours: 0,
      holidayPay: 0
    };
    setEmployees([...employees, newEmployee]);
  };

  const removeEmployee = (id: string) => {
    if (employees.length > 1) {
      setEmployees(employees.filter(emp => emp.id !== id));
    } else {
      toast({
        title: "Cannot Remove",
        description: "At least one employee entry is required",
        variant: "destructive"
      });
    }
  };

  const updateEmployee = (id: string, field: keyof EmployeeEntry, value: any) => {
    setEmployees(employees.map(emp => 
      emp.id === id ? { ...emp, [field]: value } : emp
    ));
  };

  const calculateTotals = () => {
    const totals = employees.reduce((acc, emp) => {
      const calc = calculateContributions(emp);
      return {
        totalEmployeeSSC: acc.totalEmployeeSSC + calc.employeeSSC,
        totalEmployerSSC: acc.totalEmployerSSC + calc.employerSSC,
        totalInjury: acc.totalInjury + calc.injuryContribution,
        totalLevy: acc.totalLevy + calc.levyContribution,
        totalSeverance: acc.totalSeverance + calc.severanceContribution,
        grandTotal: acc.grandTotal + calc.grandTotal
      };
    }, {
      totalEmployeeSSC: 0,
      totalEmployerSSC: 0,
      totalInjury: 0,
      totalLevy: 0,
      totalSeverance: 0,
      grandTotal: 0
    });
    return totals;
  };

  const handleSaveSimulation = () => {
    toast({
      title: "Simulation Saved",
      description: "C3 simulation has been saved successfully",
    });
  };

  const handleExportToExcel = () => {
    toast({
      title: "Export Initiated",
      description: "Exporting simulation data to Excel",
    });
  };

  const totals = calculateTotals();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="C3 Simulation"
        subtitle="Interactive calculation tool for C3 contributions with batch employee entry"
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

      <Tabs defaultValue="batch-entry" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="batch-entry">Batch Entry</TabsTrigger>
          <TabsTrigger value="quick-calc">Quick Calculator</TabsTrigger>
          <TabsTrigger value="breakdown">Component Breakdown</TabsTrigger>
          <TabsTrigger value="examples">Examples</TabsTrigger>
        </TabsList>

        <TabsContent value="batch-entry" className="space-y-6">
          {/* Employer Information */}
          <Card>
            <CardHeader>
              <CardTitle>Employer Information</CardTitle>
              <CardDescription>Enter employer details for this C3 simulation</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="employer-name">Employer Name</Label>
                  <Input
                    id="employer-name"
                    value={employerInfo.employerName}
                    onChange={(e) => setEmployerInfo({...employerInfo, employerName: e.target.value})}
                    placeholder="Enter employer name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="employer-regno">Registration Number</Label>
                  <Input
                    id="employer-regno"
                    value={employerInfo.employerRegNo}
                    onChange={(e) => setEmployerInfo({...employerInfo, employerRegNo: e.target.value})}
                    placeholder="e.g., EMP-12345"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="period">Period</Label>
                  <Input
                    id="period"
                    type="month"
                    value={employerInfo.period}
                    onChange={(e) => setEmployerInfo({...employerInfo, period: e.target.value})}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Employee Entry Form */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Employee Entries</CardTitle>
                  <CardDescription>Add employee details for contribution calculation</CardDescription>
                </div>
                <Button onClick={addEmployee} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Employee
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {employees.map((employee, index) => (
                  <Card key={employee.id} className="p-4">
                    <div className="flex items-start justify-between mb-4">
                      <h4 className="font-semibold">Employee #{index + 1}</h4>
                      {employees.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeEmployee(employee.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label>Employee Name</Label>
                        <Input
                          value={employee.name}
                          onChange={(e) => updateEmployee(employee.id, 'name', e.target.value)}
                          placeholder="Full name"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>SSN</Label>
                        <Input
                          value={employee.ssn}
                          onChange={(e) => updateEmployee(employee.id, 'ssn', e.target.value)}
                          placeholder="XXX-XX-XXXX"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Monthly Salary (EC$)</Label>
                        <Input
                          type="number"
                          value={employee.salary}
                          onChange={(e) => updateEmployee(employee.id, 'salary', parseFloat(e.target.value) || 0)}
                          placeholder="3000"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Age Group</Label>
                        <Select
                          value={employee.ageGroup}
                          onValueChange={(value) => updateEmployee(employee.id, 'ageGroup', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="under-16">Under 16</SelectItem>
                            <SelectItem value="16-62">16-62 (Working Age)</SelectItem>
                            <SelectItem value="over-62">Over 62</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Weeks Worked</Label>
                        <Input
                          type="number"
                          value={employee.weeksWorked}
                          onChange={(e) => updateEmployee(employee.id, 'weeksWorked', parseFloat(e.target.value) || 0)}
                          placeholder="4"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Overtime (EC$)</Label>
                        <Input
                          type="number"
                          value={employee.overtimeHours}
                          onChange={(e) => updateEmployee(employee.id, 'overtimeHours', parseFloat(e.target.value) || 0)}
                          placeholder="0"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Holiday Pay (EC$)</Label>
                        <Input
                          type="number"
                          value={employee.holidayPay}
                          onChange={(e) => updateEmployee(employee.id, 'holidayPay', parseFloat(e.target.value) || 0)}
                          placeholder="0"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Total Contribution</Label>
                        <div className="h-10 flex items-center px-3 bg-muted rounded-md">
                          <span className="font-semibold text-primary">
                            EC${calculateContributions(employee).grandTotal.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Calculation Summary Table */}
          <Card>
            <CardHeader>
              <CardTitle>Calculation Summary</CardTitle>
              <CardDescription>Detailed breakdown of all employees</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>SSN</TableHead>
                      <TableHead className="text-right">Insurable Earnings</TableHead>
                      <TableHead className="text-right">Employee SSC</TableHead>
                      <TableHead className="text-right">Employer SSC</TableHead>
                      <TableHead className="text-right">Injury</TableHead>
                      <TableHead className="text-right">Levy</TableHead>
                      <TableHead className="text-right">Severance</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.map((employee) => {
                      const calc = calculateContributions(employee);
                      return (
                        <TableRow key={employee.id}>
                          <TableCell className="font-medium">{employee.name || `Employee #${employee.id}`}</TableCell>
                          <TableCell>{employee.ssn}</TableCell>
                          <TableCell className="text-right">EC${calc.insurableEarnings.toFixed(2)}</TableCell>
                          <TableCell className="text-right">EC${calc.employeeSSC.toFixed(2)}</TableCell>
                          <TableCell className="text-right">EC${calc.employerSSC.toFixed(2)}</TableCell>
                          <TableCell className="text-right">EC${calc.injuryContribution.toFixed(2)}</TableCell>
                          <TableCell className="text-right">EC${calc.levyContribution.toFixed(2)}</TableCell>
                          <TableCell className="text-right">EC${calc.severanceContribution.toFixed(2)}</TableCell>
                          <TableCell className="text-right font-semibold">EC${calc.grandTotal.toFixed(2)}</TableCell>
                        </TableRow>
                      );
                    })}
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell colSpan={3}>TOTALS</TableCell>
                      <TableCell className="text-right">EC${totals.totalEmployeeSSC.toFixed(2)}</TableCell>
                      <TableCell className="text-right">EC${totals.totalEmployerSSC.toFixed(2)}</TableCell>
                      <TableCell className="text-right">EC${totals.totalInjury.toFixed(2)}</TableCell>
                      <TableCell className="text-right">EC${totals.totalLevy.toFixed(2)}</TableCell>
                      <TableCell className="text-right">EC${totals.totalSeverance.toFixed(2)}</TableCell>
                      <TableCell className="text-right text-primary text-lg">EC${totals.grandTotal.toFixed(2)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={handleExportToExcel}>
              <Download className="h-4 w-4 mr-2" />
              Export to Excel
            </Button>
            <Button onClick={handleSaveSimulation}>
              <Save className="h-4 w-4 mr-2" />
              Save Simulation
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="quick-calc" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Contribution Calculator</CardTitle>
              <CardDescription>Calculate contributions for a single employee</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="quick-salary">Monthly Salary (EC$)</Label>
                  <Input
                    id="quick-salary"
                    type="number"
                    defaultValue="3000"
                    placeholder="Enter monthly salary"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quick-age">Age Group</Label>
                  <Select defaultValue="16-62">
                    <SelectTrigger id="quick-age">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="under-16">Under 16</SelectItem>
                      <SelectItem value="16-62">16-62 (Working Age)</SelectItem>
                      <SelectItem value="over-62">Over 62</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="pt-6 border-t">
                <h4 className="font-semibold mb-4">Contribution Breakdown</h4>
                <div className="space-y-3">
                  <div className="flex justify-between p-3 bg-muted rounded-lg">
                    <span>Employee SSC (5%):</span>
                    <span className="font-semibold">EC$150.00</span>
                  </div>
                  <div className="flex justify-between p-3 bg-muted rounded-lg">
                    <span>Employer SSC (5%):</span>
                    <span className="font-semibold">EC$150.00</span>
                  </div>
                  <div className="flex justify-between p-3 bg-muted rounded-lg">
                    <span>Employment Injury (1%):</span>
                    <span className="font-semibold">EC$30.00</span>
                  </div>
                  <div className="flex justify-between p-3 bg-muted rounded-lg">
                    <span>Levy (2%):</span>
                    <span className="font-semibold">EC$60.00</span>
                  </div>
                  <div className="flex justify-between p-3 bg-muted rounded-lg">
                    <span>Severance (1%):</span>
                    <span className="font-semibold">EC$30.00</span>
                  </div>
                  <div className="flex justify-between p-3 bg-primary/10 rounded-lg border-2 border-primary">
                    <span className="font-bold text-lg">Total to SSB:</span>
                    <span className="font-bold text-lg text-primary">EC$420.00</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="breakdown" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Six Contribution Components</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Badge variant="outline">SSC</Badge>
                  Social Security Contributions
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Mandatory for employees aged 16-62 years. Both employee and employer contribute 5% each on insurable earnings up to EC$6,500 per month.
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
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Badge variant="outline">SSF</Badge>
                  Social Security Penalties
                </h3>
                <p className="text-sm text-muted-foreground">
                  Penalties of 5% per month on late submissions after grace period.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Badge variant="outline">LVC</Badge>
                  Housing & Social Development Levy
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Supports housing and social development programs. Calculated as percentage of insurable earnings.
                </p>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <div className="flex justify-between">
                    <span>Levy Rate:</span>
                    <span className="font-medium">2%</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Badge variant="outline">LVF</Badge>
                  Levy Penalties
                </h3>
                <p className="text-sm text-muted-foreground">
                  Penalties on late levy contributions following same structure as SSF.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Badge variant="outline">PEC</Badge>
                  Severance Contributions
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Protection for employees in case of termination. Paid by employer.
                </p>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <div className="flex justify-between">
                    <span>Severance Rate:</span>
                    <span className="font-medium">1%</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Badge variant="outline">PEF</Badge>
                  Severance Penalties
                </h3>
                <p className="text-sm text-muted-foreground">
                  Penalties on late severance contributions.
                </p>
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
                { salary: 2000, scenario: "Below Cap Earnings", age: "16-62" },
                { salary: 5000, scenario: "Mid-Range Earnings", age: "16-62" },
                { salary: 6500, scenario: "At Monthly Cap", age: "16-62" },
                { salary: 10000, scenario: "Above Cap (Capped at EC$6,500)", age: "16-62" },
                { salary: 3000, scenario: "Under Age 16", age: "under-16" },
                { salary: 3000, scenario: "Over Age 62", age: "over-62" }
              ].map((example, idx) => {
                const testEmployee: EmployeeEntry = {
                  id: idx.toString(),
                  name: example.scenario,
                  ssn: "",
                  salary: example.salary,
                  ageGroup: example.age,
                  weeksWorked: 4,
                  overtimeHours: 0,
                  holidayPay: 0
                };
                const calc = calculateContributions(testEmployee);
                return (
                  <div key={idx} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold">{example.scenario}</h4>
                      <Badge>EC${example.salary.toLocaleString()} | {example.age}</Badge>
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
