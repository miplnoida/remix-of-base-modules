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

interface EmployeeEntry {
  ssn: string;
  name: string;
  weeks: {
    w1: boolean;
    w2: boolean;
    w3: boolean;
    w4: boolean;
    w5: boolean;
    h: boolean; // Holiday
    p: boolean; // Paid Leave
    b: boolean; // Bonus
  };
  wagesSalary: number;
  bonus: number;
  totalWages: number;
  hssdLevy: number;
  socialSecurity: number;
  isVerified: boolean;
}

interface EmployerC3FormProps {
  data?: any;
  onSave?: (data: any) => void;
  onClose?: () => void;
}

export default function EmployerC3Form({ data, onSave, onClose }: EmployerC3FormProps) {
  const [formData, setFormData] = useState({
    regNo: data?.regNo || "",
    employerName: data?.employerName || "",
    address: data?.address || "",
    period: data?.period || "",
    dateReceived: data?.dateReceived || "",
    schedule: data?.schedule || "",
    numberOfEmployees: data?.numberOfEmployees || "",
    status: data?.status || "pending",
    payments: data?.payments || "",
    balance: data?.balance || "",
    nilReturn: data?.nilReturn || false
  });

  const [employees, setEmployees] = useState<EmployeeEntry[]>(
    data?.employees || [
      {
        ssn: "",
        name: "",
        weeks: {
          w1: false,
          w2: false,
          w3: false,
          w4: false,
          w5: false,
          h: false,
          p: false,
          b: false
        },
        wagesSalary: 0,
        bonus: 0,
        totalWages: 0,
        hssdLevy: 0,
        socialSecurity: 0,
        isVerified: false
      }
    ]
  );

  const [transactionInfo, setTransactionInfo] = useState({
    dateEntered: data?.transactionInfo?.dateEntered || "",
    enteredBy: data?.transactionInfo?.enteredBy || "",
    dateModified: data?.transactionInfo?.dateModified || "",
    modifiedBy: data?.transactionInfo?.modifiedBy || "",
    dateVerified: data?.transactionInfo?.dateVerified || "",
    verifiedBy: data?.transactionInfo?.verifiedBy || ""
  });

  const [notes, setNotes] = useState(data?.notes || "");

  const handleFormChange = (field: string, value: any) => {
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

    // Calculate totals when wages change
    if (field === 'wagesSalary' || field === 'bonus') {
      const employee = updatedEmployees[index];
      employee.totalWages = employee.wagesSalary + employee.bonus;
      employee.hssdLevy = employee.totalWages * 0.02; // 2% for H.S.S.D Levy
      employee.socialSecurity = employee.totalWages * 0.03; // 3% for Social Security
    }

    setEmployees(updatedEmployees);
  };

  const handleWeekChange = (empIndex: number, week: keyof EmployeeEntry['weeks'], checked: boolean) => {
    const updatedEmployees = [...employees];
    updatedEmployees[empIndex].weeks[week] = checked;
    setEmployees(updatedEmployees);
  };

  const addEmployeeRow = () => {
    setEmployees(prev => [
      ...prev,
      {
        ssn: "",
        name: "",
        weeks: {
          w1: false,
          w2: false,
          w3: false,
          w4: false,
          w5: false,
          h: false,
          p: false,
          b: false
        },
        wagesSalary: 0,
        bonus: 0,
        totalWages: 0,
        hssdLevy: 0,
        socialSecurity: 0,
        isVerified: false
      }
    ]);
  };

  const deleteEmployeeRow = (index: number) => {
    if (employees.length > 1) {
      setEmployees(prev => prev.filter((_, i) => i !== index));
    }
  };

  const calculateSubtotals = () => {
    const totalWagesEmployees = employees.reduce((sum, emp) => sum + emp.totalWages, 0);
    const totalEmployeesLevy = employees.reduce((sum, emp) => sum + emp.hssdLevy, 0);
    const totalEmployeesSS = employees.reduce((sum, emp) => sum + emp.socialSecurity, 0);
    const employersContribution = totalWagesEmployees * 0.03; // Employer's 3%
    const severancePay = totalWagesEmployees * 0.01; // Employer's 1% for Severance
    
    return {
      totalWagesEmployees,
      totalEmployeesLevy: totalEmployeesLevy,
      totalEmployeesSS,
      employersContribution,
      severancePay,
      levyPenalty: 0,
      severancePenalty: 0,
      fines: 0
    };
  };

  const subtotals = calculateSubtotals();

  const handleSave = () => {
    const formDataToSave = {
      ...formData,
      employees,
      transactionInfo,
      notes,
      subtotals
    };
    
    console.log("Saving Employer C3 form:", formDataToSave);
    onSave?.(formDataToSave);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header Information */}
      <Card>
        <CardHeader>
          <CardTitle>ST CHRISTOPHER AND NEVIS - SOCIAL SECURITY</CardTitle>
          <CardDescription>Social Security Act, 1978; Social Services Levy Act, 1986; and the Protection of Employment Act, 1996</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="regNo">Employer</Label>
              <Input
                id="regNo"
                value={formData.regNo}
                onChange={(e) => handleFormChange("regNo", e.target.value)}
                placeholder="6-digit registration number"
                maxLength={6}
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
              <Label htmlFor="period">Period</Label>
              <Input
                id="period"
                value={formData.period}
                onChange={(e) => handleFormChange("period", e.target.value)}
                placeholder="MMM-YYYY"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => handleFormChange("status", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payments">Payments</Label>
              <Input
                id="payments"
                value={formData.payments}
                onChange={(e) => handleFormChange("payments", e.target.value)}
                placeholder="$0.00"
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
                placeholder="Schedule number"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="balance">Balance</Label>
              <Input
                id="balance"
                value={formData.balance}
                onChange={(e) => handleFormChange("balance", e.target.value)}
                placeholder="$0.00"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="nilReturn"
                checked={formData.nilReturn}
                onCheckedChange={(checked) => handleFormChange("nilReturn", checked)}
              />
              <Label htmlFor="nilReturn">Nil Return</Label>
            </div>
          </div>

          <div className="mt-4">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => handleFormChange("address", e.target.value)}
              placeholder="Enter employer address"
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Transaction Information */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Date Entered</Label>
              <Input
                value={transactionInfo.dateEntered}
                onChange={(e) => setTransactionInfo({...transactionInfo, dateEntered: e.target.value})}
                type="date"
              />
            </div>
            <div className="space-y-2">
              <Label>Entered By</Label>
              <Input
                value={transactionInfo.enteredBy}
                onChange={(e) => setTransactionInfo({...transactionInfo, enteredBy: e.target.value})}
                placeholder="Staff name"
              />
            </div>
            <div className="space-y-2">
              <Label>Date Modified</Label>
              <Input
                value={transactionInfo.dateModified}
                onChange={(e) => setTransactionInfo({...transactionInfo, dateModified: e.target.value})}
                type="date"
              />
            </div>
            <div className="space-y-2">
              <Label>Modified By</Label>
              <Input
                value={transactionInfo.modifiedBy}
                onChange={(e) => setTransactionInfo({...transactionInfo, modifiedBy: e.target.value})}
                placeholder="Staff name"
              />
            </div>
            <div className="space-y-2">
              <Label>Date Verified</Label>
              <Input
                value={transactionInfo.dateVerified}
                onChange={(e) => setTransactionInfo({...transactionInfo, dateVerified: e.target.value})}
                type="date"
              />
            </div>
            <div className="space-y-2">
              <Label>Verified By</Label>
              <Input
                value={transactionInfo.verifiedBy}
                onChange={(e) => setTransactionInfo({...transactionInfo, verifiedBy: e.target.value})}
                placeholder="Staff name"
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
              <CardTitle>Details</CardTitle>
              <CardDescription>Enter employee contribution details</CardDescription>
            </div>
            <Button onClick={addEmployeeRow} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Employee
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SSN</TableHead>
                  <TableHead>Name of Employee</TableHead>
                  <TableHead>Mark "✓" in the week's worked or indicate Bonus</TableHead>
                  <TableHead colSpan={8} className="text-center">
                    <div className="grid grid-cols-8 gap-1 text-xs">
                      <div>1</div>
                      <div>2</div>
                      <div>3</div>
                      <div>4</div>
                      <div>5</div>
                      <div>H</div>
                      <div>P</div>
                      <div>B</div>
                    </div>
                  </TableHead>
                  <TableHead>Total Wages/Salaries Paid for the month</TableHead>
                  <TableHead>Contributions</TableHead>
                  <TableHead>Verified</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
                <TableRow>
                  <TableHead></TableHead>
                  <TableHead></TableHead>
                  <TableHead></TableHead>
                  <TableHead colSpan={8}></TableHead>
                  <TableHead>Wages/Salary | Bonus</TableHead>
                  <TableHead>H.S.S.D Levy | Social Security</TableHead>
                  <TableHead></TableHead>
                  <TableHead></TableHead>
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
                        className="w-28"
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
                    <TableCell></TableCell>
                    {Object.entries(employee.weeks).map(([week, checked]) => (
                      <TableCell key={week} className="text-center">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(isChecked) => handleWeekChange(index, week as keyof EmployeeEntry['weeks'], isChecked as boolean)}
                        />
                      </TableCell>
                    ))}
                    <TableCell>
                      <div className="flex gap-1">
                        <Input
                          type="number"
                          value={employee.wagesSalary}
                          onChange={(e) => handleEmployeeChange(index, "wagesSalary", parseFloat(e.target.value) || 0)}
                          placeholder="Wages"
                          className="w-20"
                        />
                        <Input
                          type="number"
                          value={employee.bonus}
                          onChange={(e) => handleEmployeeChange(index, "bonus", parseFloat(e.target.value) || 0)}
                          placeholder="Bonus"
                          className="w-20"
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Input
                          type="number"
                          value={employee.hssdLevy.toFixed(2)}
                          readOnly
                          className="w-20 bg-muted"
                        />
                        <Input
                          type="number"
                          value={employee.socialSecurity.toFixed(2)}
                          readOnly
                          className="w-20 bg-muted"
                        />
                      </div>
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
          <CardTitle>Subtotals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between items-center p-2 bg-muted rounded">
              <span>Total Wages and Employee's Levy + SS Contribution →</span>
              <span className="font-mono">${subtotals.totalWagesEmployees.toFixed(2)}</span>
              <span className="font-mono">${(subtotals.totalEmployeesLevy + subtotals.totalEmployeesSS).toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-muted rounded">
              <span>Employer's 3% Wages for Levy + SS Contribution →</span>
              <span className="font-mono">${subtotals.employersContribution.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-muted rounded">
              <span>Employer's 1% of Wages for Sev. Pay Contribution →</span>
              <span className="font-mono">${subtotals.severancePay.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-red-100 rounded">
              <span>Levy Penalty →</span>
              <span className="font-mono text-red-600">${subtotals.levyPenalty.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-red-100 rounded">
              <span>Severance Penalty →</span>
              <span className="font-mono text-red-600">${subtotals.severancePenalty.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-red-100 rounded">
              <span>Fines due for the month →</span>
              <span className="font-mono text-red-600">${subtotals.fines.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any additional notes..."
            rows={3}
          />
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
            <Button variant="outline">
              <Check className="h-4 w-4 mr-2" />
              Verify
            </Button>
            <Button onClick={handlePrint} variant="outline">
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button onClick={onClose} variant="ghost">
              <X className="h-4 w-4 mr-2" />
              Close
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}