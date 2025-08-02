import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Save, X, Trash2, Printer, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface EmployeeEntry {
  ssn: string;
  name: string;
  weeks: boolean[];
  totalWages: number;
  contribution: number;
  isVerified: boolean;
}

interface C3InputFormProps {
  type?: string;
}

export default function C3InputForm({ type = "employer" }: C3InputFormProps) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    regNo: "",
    employerName: "",
    period: "",
    dateReceived: "",
    schedule: "",
    numberOfEmployees: "",
    status: "pending",
    payment: ""
  });

  const [employees, setEmployees] = useState<EmployeeEntry[]>([
    {
      ssn: "",
      name: "",
      weeks: new Array(4).fill(false),
      totalWages: 0,
      contribution: 0,
      isVerified: false
    }
  ]);

  const [notes, setNotes] = useState("");

  const handleFormChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleEmployeeChange = (index: number, field: keyof EmployeeEntry, value: any) => {
    const updatedEmployees = [...employees];
    updatedEmployees[index] = {
      ...updatedEmployees[index],
      [field]: value
    };
    setEmployees(updatedEmployees);
  };

  const addEmployeeRow = () => {
    setEmployees(prev => [
      ...prev,
      {
        ssn: "",
        name: "",
        weeks: new Array(4).fill(false),
        totalWages: 0,
        contribution: 0,
        isVerified: false
      }
    ]);
  };

  const deleteEmployeeRow = (index: number) => {
    if (employees.length > 1) {
      setEmployees(prev => prev.filter((_, i) => i !== index));
    }
  };

  const calculateTotals = () => {
    const totalWages = employees.reduce((sum, emp) => sum + emp.totalWages, 0);
    const totalContributions = employees.reduce((sum, emp) => sum + emp.contribution, 0);
    const employerContribution = totalWages * 0.03;
    const severancePay = totalWages * 0.01;

    return {
      totalWages,
      totalContributions,
      employerContribution,
      severancePay,
      levyPenalty: 0,
      severancePenalty: 0,
      fines: 0
    };
  };

  const totals = calculateTotals();

  const handleSave = () => {
    console.log("Saving C3 form data:", { formData, employees, notes, type });
    // Form will be closed by parent component
  };

  const handleVerify = () => {
    console.log("Verifying C3 form data");
  };

  const handlePrint = () => {
    window.print();
  };

  const handleClose = () => {
    // Form will be closed by parent component
  };

  const clearForm = () => {
    setFormData({
      regNo: "",
      employerName: "",
      period: "",
      dateReceived: "",
      schedule: "",
      numberOfEmployees: "",
      status: "pending",
      payment: ""
    });
    setEmployees([{
      ssn: "",
      name: "",
      weeks: new Array(4).fill(false),
      totalWages: 0,
      contribution: 0,
      isVerified: false
    }]);
    setNotes("");
  };

  return (
    <div className="flex flex-col gap-6 p-6">

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>Enter the basic C3 form details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="regNo">
                {type === "employer" ? "Registration No. (6-digit)" : "SSN"}
              </Label>
              <Input
                id="regNo"
                value={formData.regNo}
                onChange={(e) => handleFormChange("regNo", e.target.value)}
                placeholder={type === "employer" ? "Enter 6-digit registration number" : "Enter SSN"}
                maxLength={type === "employer" ? 6 : undefined}
                pattern={type === "employer" ? "[0-9]{6}" : undefined}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="employerName">Employer Name</Label>
              <Input
                id="employerName"
                value={formData.employerName}
                onChange={(e) => handleFormChange("employerName", e.target.value)}
                placeholder="Enter employer name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="period">Period</Label>
              <Input
                id="period"
                value={formData.period}
                onChange={(e) => handleFormChange("period", e.target.value)}
                placeholder="YYYY-MM"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateReceived">Date Received</Label>
              <Input
                id="dateReceived"
                type="date"
                value={formData.dateReceived}
                onChange={(e) => handleFormChange("dateReceived", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="schedule">Schedule</Label>
              <Input
                id="schedule"
                value={formData.schedule}
                onChange={(e) => handleFormChange("schedule", e.target.value)}
                placeholder="Enter schedule"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="numberOfEmployees">Number of Employees</Label>
              <Input
                id="numberOfEmployees"
                type="number"
                value={formData.numberOfEmployees}
                onChange={(e) => handleFormChange("numberOfEmployees", e.target.value)}
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => handleFormChange("status", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment">Payment</Label>
              <Input
                id="payment"
                value={formData.payment}
                onChange={(e) => handleFormChange("payment", e.target.value)}
                placeholder="Enter payment amount"
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
            <Button onClick={addEmployeeRow} size="sm">
              <Plus className="h-4 w-4 mr-2" />
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
                {employees.map((employee, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Input
                        value={employee.ssn}
                        onChange={(e) => handleEmployeeChange(index, "ssn", e.target.value)}
                        placeholder="SSN"
                        className="w-32"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={employee.name}
                        onChange={(e) => handleEmployeeChange(index, "name", e.target.value)}
                        placeholder="Employee name"
                        className="w-48"
                      />
                    </TableCell>
                    {employee.weeks.map((week, weekIndex) => (
                      <TableCell key={weekIndex}>
                        <Checkbox
                          checked={week}
                          onCheckedChange={(checked) => {
                            const newWeeks = [...employee.weeks];
                            newWeeks[weekIndex] = checked as boolean;
                            handleEmployeeChange(index, "weeks", newWeeks);
                          }}
                        />
                      </TableCell>
                    ))}
                    <TableCell>
                      <Input
                        type="number"
                        value={employee.totalWages}
                        onChange={(e) => handleEmployeeChange(index, "totalWages", parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        className="w-24"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={employee.contribution}
                        onChange={(e) => handleEmployeeChange(index, "contribution", parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        className="w-24"
                      />
                    </TableCell>
                    <TableCell>
                      <Checkbox
                        checked={employee.isVerified}
                        onCheckedChange={(checked) => handleEmployeeChange(index, "isVerified", checked as boolean)}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteEmployeeRow(index)}
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
          <CardTitle>Calculation Summary</CardTitle>
          <CardDescription>Automatically calculated totals and contributions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Total Wages</Label>
              <div className="text-2xl font-bold">${totals.totalWages.toFixed(2)}</div>
            </div>

            <div className="space-y-2">
              <Label>Employee's Levy + SS Contribution</Label>
              <div className="text-2xl font-bold">${totals.totalContributions.toFixed(2)}</div>
            </div>

            <div className="space-y-2">
              <Label>Employer's 3% Wages for Levy + SS</Label>
              <div className="text-2xl font-bold">${totals.employerContribution.toFixed(2)}</div>
            </div>

            <div className="space-y-2">
              <Label>Employer's 1% for Severance Pay</Label>
              <div className="text-2xl font-bold">${totals.severancePay.toFixed(2)}</div>
            </div>

            <div className="space-y-2">
              <Label>Levy Penalty</Label>
              <div className="text-2xl font-bold">${totals.levyPenalty.toFixed(2)}</div>
            </div>

            <div className="space-y-2">
              <Label>Severance Penalty</Label>
              <div className="text-2xl font-bold">${totals.severancePenalty.toFixed(2)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle>C3 Notes</CardTitle>
          <CardDescription>Add any additional notes or comments</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Enter notes here..."
            rows={4}
          />
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
          <CardDescription>Save, verify, or print the C3 form</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button onClick={clearForm} variant="outline">
              New
            </Button>
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
            <Button onClick={handleVerify} variant="outline">
              <Check className="h-4 w-4 mr-2" />
              Verify
            </Button>
            <Button onClick={handlePrint} variant="outline">
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button onClick={handleClose} variant="ghost">
              <X className="h-4 w-4 mr-2" />
              Close
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}