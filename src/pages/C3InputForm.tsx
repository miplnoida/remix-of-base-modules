import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Plus, Save, FileText, Check, Trash2, Printer, X, RotateCcw } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface EmployeeRecord {
  id: string;
  ssn: string;
  name: string;
  weeksWorked: boolean[];
  totalWages: number;
  contribution: number;
  isVerified: boolean;
}

export default function C3InputForm() {
  const navigate = useNavigate();
  const [basicInfo, setBasicInfo] = useState({
    registrationNo: "",
    employerName: "",
    period: "",
    dateReceived: "",
    schedule: "",
    numberOfEmployees: "",
    status: "",
    payment: ""
  });

  const [employees, setEmployees] = useState<EmployeeRecord[]>([
    {
      id: "1",
      ssn: "",
      name: "",
      weeksWorked: new Array(4).fill(false), // 4 weeks in a month
      totalWages: 0,
      contribution: 0,
      isVerified: false
    }
  ]);

  const addEmployeeRow = () => {
    const newEmployee: EmployeeRecord = {
      id: Date.now().toString(),
      ssn: "",
      name: "",
      weeksWorked: new Array(4).fill(false),
      totalWages: 0,
      contribution: 0,
      isVerified: false
    };
    setEmployees([...employees, newEmployee]);
  };

  const removeEmployeeRow = (id: string) => {
    setEmployees(employees.filter(emp => emp.id !== id));
  };

  const updateEmployee = (id: string, field: keyof EmployeeRecord, value: any) => {
    setEmployees(employees.map(emp => 
      emp.id === id ? { ...emp, [field]: value } : emp
    ));
  };

  const updateWeekWorked = (empId: string, weekIndex: number, worked: boolean) => {
    setEmployees(employees.map(emp => 
      emp.id === empId 
        ? { 
            ...emp, 
            weeksWorked: emp.weeksWorked.map((w, i) => i === weekIndex ? worked : w)
          } 
        : emp
    ));
  };

  // Calculate subtotals
  const calculateSubtotals = () => {
    const totalWages = employees.reduce((sum, emp) => sum + emp.totalWages, 0);
    const totalEmployeeContribution = employees.reduce((sum, emp) => sum + emp.contribution, 0);
    const employerLevyContribution = totalWages * 0.03; // 3%
    const severancePayContribution = totalWages * 0.01; // 1%
    
    return {
      totalWages,
      totalEmployeeContribution,
      employerLevyContribution,
      severancePayContribution,
      levyPenalty: 0, // Would be calculated based on business rules
      severancePenalty: 0, // Would be calculated based on business rules
      fines: 0 // Would be calculated based on business rules
    };
  };

  const subtotals = calculateSubtotals();

  const handleSave = () => {
    // Implement save logic
    console.log("Saving C3 data:", { basicInfo, employees });
  };

  const handleVerify = () => {
    // Implement verification logic
    console.log("Verifying C3 data");
  };

  const handlePrint = () => {
    // Implement print logic
    window.print();
  };

  const handleNew = () => {
    // Reset form
    setBasicInfo({
      registrationNo: "",
      employerName: "",
      period: "",
      dateReceived: "",
      schedule: "",
      numberOfEmployees: "",
      status: "",
      payment: ""
    });
    setEmployees([{
      id: "1",
      ssn: "",
      name: "",
      weeksWorked: new Array(4).fill(false),
      totalWages: 0,
      contribution: 0,
      isVerified: false
    }]);
  };

  const handleClose = () => {
    navigate("/c3-management/manage");
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">C3 Input Form</h1>
          <p className="text-muted-foreground">Add new C3 contribution record</p>
        </div>
      </div>

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>Enter the basic details for the C3 record</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="registrationNo">Registration No</Label>
              <Input
                id="registrationNo"
                placeholder="Enter registration number"
                value={basicInfo.registrationNo}
                onChange={(e) => setBasicInfo({ ...basicInfo, registrationNo: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="employerName">Employer Name</Label>
              <Input
                id="employerName"
                placeholder="Enter employer name"
                value={basicInfo.employerName}
                onChange={(e) => setBasicInfo({ ...basicInfo, employerName: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="period">Period</Label>
              <Input
                id="period"
                placeholder="e.g., 2024-01"
                value={basicInfo.period}
                onChange={(e) => setBasicInfo({ ...basicInfo, period: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateReceived">Date Received</Label>
              <Input
                id="dateReceived"
                type="date"
                value={basicInfo.dateReceived}
                onChange={(e) => setBasicInfo({ ...basicInfo, dateReceived: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="schedule">Schedule</Label>
              <Input
                id="schedule"
                placeholder="Enter schedule"
                value={basicInfo.schedule}
                onChange={(e) => setBasicInfo({ ...basicInfo, schedule: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="numberOfEmployees">Number of Employees</Label>
              <Input
                id="numberOfEmployees"
                type="number"
                placeholder="Enter number"
                value={basicInfo.numberOfEmployees}
                onChange={(e) => setBasicInfo({ ...basicInfo, numberOfEmployees: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={basicInfo.status} onValueChange={(value) => setBasicInfo({ ...basicInfo, status: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment">Payment</Label>
              <Input
                id="payment"
                type="number"
                step="0.01"
                placeholder="Enter payment amount"
                value={basicInfo.payment}
                onChange={(e) => setBasicInfo({ ...basicInfo, payment: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Employee Details */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Employee Details</CardTitle>
              <CardDescription>Enter details for each employee</CardDescription>
            </div>
            <Button onClick={addEmployeeRow} variant="outline" size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Row
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SSN</TableHead>
                  <TableHead>Employee Name</TableHead>
                  <TableHead>Week 1</TableHead>
                  <TableHead>Week 2</TableHead>
                  <TableHead>Week 3</TableHead>
                  <TableHead>Week 4</TableHead>
                  <TableHead>Total Wages</TableHead>
                  <TableHead>Contribution</TableHead>
                  <TableHead>Verified</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell>
                      <Input
                        placeholder="SSN"
                        value={employee.ssn}
                        onChange={(e) => updateEmployee(employee.id, "ssn", e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        placeholder="Employee name"
                        value={employee.name}
                        onChange={(e) => updateEmployee(employee.id, "name", e.target.value)}
                      />
                    </TableCell>
                    {[0, 1, 2, 3].map((weekIndex) => (
                      <TableCell key={weekIndex}>
                        <Checkbox
                          checked={employee.weeksWorked[weekIndex]}
                          onCheckedChange={(checked) => 
                            updateWeekWorked(employee.id, weekIndex, checked as boolean)
                          }
                        />
                      </TableCell>
                    ))}
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={employee.totalWages || ""}
                        onChange={(e) => updateEmployee(employee.id, "totalWages", parseFloat(e.target.value) || 0)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={employee.contribution || ""}
                        onChange={(e) => updateEmployee(employee.id, "contribution", parseFloat(e.target.value) || 0)}
                      />
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={employee.isVerified}
                        onCheckedChange={(checked) => updateEmployee(employee.id, "isVerified", checked)}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeEmployeeRow(employee.id)}
                        disabled={employees.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Subtotals */}
      <Card>
        <CardHeader>
          <CardTitle>Subtotals</CardTitle>
          <CardDescription>Calculated totals based on employee data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Total Wages and Employee's Levy + SS Contribution</Label>
              <Input value={`$${(subtotals.totalWages + subtotals.totalEmployeeContribution).toFixed(2)}`} readOnly />
            </div>

            <div className="space-y-2">
              <Label>Employer's 3% Wages for Levy + SS Contribution</Label>
              <Input value={`$${subtotals.employerLevyContribution.toFixed(2)}`} readOnly />
            </div>

            <div className="space-y-2">
              <Label>Employer's 1% of Wages for Sev. Pay Contribution</Label>
              <Input value={`$${subtotals.severancePayContribution.toFixed(2)}`} readOnly />
            </div>

            <div className="space-y-2">
              <Label>Levy Penalty</Label>
              <Input value={`$${subtotals.levyPenalty.toFixed(2)}`} readOnly />
            </div>

            <div className="space-y-2">
              <Label>Severance Penalty</Label>
              <Input value={`$${subtotals.severancePenalty.toFixed(2)}`} readOnly />
            </div>

            <div className="space-y-2">
              <Label>Fines due for the Month</Label>
              <Input value={`$${subtotals.fines.toFixed(2)}`} readOnly />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-3">
            <Button onClick={handleNew} variant="outline" className="gap-2">
              <RotateCcw className="h-4 w-4" />
              New
            </Button>
            <Button onClick={handleSave} className="gap-2">
              <Save className="h-4 w-4" />
              Save
            </Button>
            <Button variant="outline" className="gap-2">
              <FileText className="h-4 w-4" />
              C3 Notes
            </Button>
            <Button onClick={handleVerify} variant="outline" className="gap-2">
              <Check className="h-4 w-4" />
              Verify
            </Button>
            <Button onClick={addEmployeeRow} variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />
              Insert Row
            </Button>
            <Button onClick={handlePrint} variant="outline" className="gap-2">
              <Printer className="h-4 w-4" />
              Print
            </Button>
            <Button onClick={handleClose} variant="outline" className="gap-2">
              <X className="h-4 w-4" />
              Close
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}