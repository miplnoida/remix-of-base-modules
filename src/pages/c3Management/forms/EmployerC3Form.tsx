import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  mode?: 'add' | 'edit' | 'view';
  onSave?: (data: any) => void;
  onClose?: () => void;
}

export default function EmployerC3Form({ data, mode = 'add', onSave, onClose }: EmployerC3FormProps) {
  const isReadOnly = mode === 'view';

  const [formData, setFormData] = useState({
    regNo: data?.regNo || data?.payerId || "",
    employerName: data?.employerName || data?.payerName || "",
    address: data?.address || "",
    period: data?.period || "",
    dateReceived: data?.dateReceived || "",
    schedule: data?.schedule || data?.scheduleNo || "",
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
    dateEntered: data?.transactionInfo?.dateEntered || data?.dateEntered || "",
    enteredBy: data?.transactionInfo?.enteredBy || data?.enteredBy || "",
    dateModified: data?.transactionInfo?.dateModified || "",
    modifiedBy: data?.transactionInfo?.modifiedBy || "",
    dateVerified: data?.transactionInfo?.dateVerified || data?.dateVerified || "",
    verifiedBy: data?.transactionInfo?.verifiedBy || data?.verifiedBy || ""
  });

  const [notes, setNotes] = useState(data?.notes || "");

  const handleFormChange = (field: string, value: any) => {
    if (isReadOnly) return;
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleEmployeeChange = (index: number, field: keyof EmployeeEntry, value: any) => {
    if (isReadOnly) return;
    const updatedEmployees = [...employees];
    updatedEmployees[index] = {
      ...updatedEmployees[index],
      [field]: value
    };

    // Recalculate totals if wages or bonus changed
    if (field === 'wagesSalary' || field === 'bonus') {
      const employee = updatedEmployees[index];
      employee.totalWages = employee.wagesSalary + employee.bonus;
      employee.socialSecurity = employee.totalWages * 0.03; // 3%
      employee.hssdLevy = employee.totalWages * 0.015; // 1.5%
    }

    setEmployees(updatedEmployees);
  };

  const handleWeekChange = (employeeIndex: number, week: string, checked: boolean) => {
    if (isReadOnly) return;
    const updatedEmployees = [...employees];
    updatedEmployees[employeeIndex] = {
      ...updatedEmployees[employeeIndex],
      weeks: {
        ...updatedEmployees[employeeIndex].weeks,
        [week]: checked
      }
    };
    setEmployees(updatedEmployees);
  };

  const addEmployee = () => {
    if (isReadOnly) return;
    setEmployees([...employees, {
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
    }]);
  };

  const removeEmployee = (index: number) => {
    if (isReadOnly) return;
    setEmployees(employees.filter((_, i) => i !== index));
  };

  const calculateTotals = () => {
    return employees.reduce((totals, emp) => ({
      totalWages: totals.totalWages + emp.totalWages,
      totalSocialSecurity: totals.totalSocialSecurity + emp.socialSecurity,
      totalHssdLevy: totals.totalHssdLevy + emp.hssdLevy
    }), { totalWages: 0, totalSocialSecurity: 0, totalHssdLevy: 0 });
  };

  const handleSave = () => {
    if (isReadOnly) return;
    const formDataToSave = {
      ...formData,
      employees,
      transactionInfo,
      notes,
      totals: calculateTotals()
    };
    
    console.log("Saving Employer C3 form:", formDataToSave);
    onSave?.(formDataToSave);
  };

  const handlePrint = () => {
    window.print();
  };

  const totals = calculateTotals();

  return (
    <div className="flex flex-col gap-4 max-w-full overflow-hidden">
      {/* Header */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg md:text-xl">ST CHRISTOPHER AND NEVIS - SOCIAL SECURITY</CardTitle>
          <CardDescription className="text-sm">
            Social Security Act, 1978; Social Services Levy Act, 1986; and the Protection of Employment Act, 1996<br/>
            <strong>C3 EMPLOYER'S CONTRIBUTION REMITTANCE FORM</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="regNo">Reg No (6-digit)</Label>
              <Input
                id="regNo"
                value={formData.regNo}
                onChange={(e) => handleFormChange("regNo", e.target.value)}
                placeholder="Enter 6-digit registration number"
                maxLength={6}
                pattern="[0-9]{6}"
                className="bg-green-50"
                readOnly={isReadOnly}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="employerName">Employer Name</Label>
              <Input
                id="employerName"
                value={formData.employerName}
                onChange={(e) => handleFormChange("employerName", e.target.value)}
                placeholder="Enter employer name"
                readOnly={isReadOnly}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="period">Period</Label>
              <Input
                id="period"
                value={formData.period}
                onChange={(e) => handleFormChange("period", e.target.value)}
                placeholder="Jul-2025"
                readOnly={isReadOnly}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateReceived">Date Received</Label>
              <Input
                id="dateReceived"
                type="date"
                value={formData.dateReceived}
                onChange={(e) => handleFormChange("dateReceived", e.target.value)}
                readOnly={isReadOnly}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="schedule">Schedule No</Label>
              <Input
                id="schedule"
                value={formData.schedule}
                onChange={(e) => handleFormChange("schedule", e.target.value)}
                placeholder="Auto-populated"
                readOnly={isReadOnly}
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
                readOnly={isReadOnly}
              />
            </div>

            <div className="flex items-center space-x-2 col-span-full">
              <Checkbox
                id="nilReturn"
                checked={formData.nilReturn}
                onCheckedChange={(checked) => handleFormChange("nilReturn", checked)}
                disabled={isReadOnly}
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
              placeholder="Enter address"
              rows={2}
              readOnly={isReadOnly}
            />
          </div>
        </CardContent>
      </Card>

      {/* Transaction Information */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle>Transaction Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Date Entered</Label>
              <Input
                value={transactionInfo.dateEntered}
                onChange={(e) => setTransactionInfo({...transactionInfo, dateEntered: e.target.value})}
                type="date"
                readOnly={isReadOnly}
              />
            </div>
            <div className="space-y-2">
              <Label>Entered By</Label>
              <Input
                value={transactionInfo.enteredBy}
                onChange={(e) => setTransactionInfo({...transactionInfo, enteredBy: e.target.value})}
                placeholder="Staff name"
                readOnly={isReadOnly}
              />
            </div>
            <div className="space-y-2">
              <Label>Date Modified</Label>
              <Input
                value={transactionInfo.dateModified}
                onChange={(e) => setTransactionInfo({...transactionInfo, dateModified: e.target.value})}
                type="date"
                readOnly={isReadOnly}
              />
            </div>
            <div className="space-y-2">
              <Label>Modified By</Label>
              <Input
                value={transactionInfo.modifiedBy}
                onChange={(e) => setTransactionInfo({...transactionInfo, modifiedBy: e.target.value})}
                placeholder="Staff name"
                readOnly={isReadOnly}
              />
            </div>
            <div className="space-y-2">
              <Label>Date Verified</Label>
              <Input
                value={transactionInfo.dateVerified}
                onChange={(e) => setTransactionInfo({...transactionInfo, dateVerified: e.target.value})}
                type="date"
                readOnly={isReadOnly}
              />
            </div>
            <div className="space-y-2">
              <Label>Verified By</Label>
              <Input
                value={transactionInfo.verifiedBy}
                onChange={(e) => setTransactionInfo({...transactionInfo, verifiedBy: e.target.value})}
                placeholder="Staff name"
                readOnly={isReadOnly}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Employee Details Table */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Employee Details</CardTitle>
              <CardDescription>List of employees and their contribution details</CardDescription>
            </div>
            {!isReadOnly && (
              <Button onClick={addEmployee} size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Add Employee
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-32">SSN</TableHead>
                  <TableHead className="min-w-40">Name of Employee</TableHead>
                  <TableHead className="text-center">1</TableHead>
                  <TableHead className="text-center">2</TableHead>
                  <TableHead className="text-center">3</TableHead>
                  <TableHead className="text-center">4</TableHead>
                  <TableHead className="text-center">5</TableHead>
                  <TableHead className="text-center">H</TableHead>
                  <TableHead className="text-center">P</TableHead>
                  <TableHead className="text-center">B</TableHead>
                  <TableHead className="min-w-24">Wages/Salary</TableHead>
                  <TableHead className="min-w-24">Bonus</TableHead>
                  <TableHead className="min-w-24">Total Wages</TableHead>
                  <TableHead className="min-w-24">HSSD Levy</TableHead>
                  <TableHead className="min-w-24">Social Security</TableHead>
                  {!isReadOnly && <TableHead className="text-center">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((employee, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Input
                        value={employee.ssn}
                        onChange={(e) => handleEmployeeChange(index, 'ssn', e.target.value)}
                        placeholder="SSN"
                        className="text-xs"
                        readOnly={isReadOnly}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={employee.name}
                        onChange={(e) => handleEmployeeChange(index, 'name', e.target.value)}
                        placeholder="Employee name"
                        className="text-xs"
                        readOnly={isReadOnly}
                      />
                    </TableCell>
                    {[1, 2, 3, 4, 5].map(week => (
                      <TableCell key={week} className="text-center">
                        <Checkbox
                          checked={employee.weeks[`w${week}` as keyof typeof employee.weeks]}
                          onCheckedChange={(checked) => handleWeekChange(index, `w${week}`, checked as boolean)}
                          disabled={isReadOnly}
                        />
                      </TableCell>
                    ))}
                    <TableCell className="text-center">
                      <Checkbox
                        checked={employee.weeks.h}
                        onCheckedChange={(checked) => handleWeekChange(index, 'h', checked as boolean)}
                        disabled={isReadOnly}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Checkbox
                        checked={employee.weeks.p}
                        onCheckedChange={(checked) => handleWeekChange(index, 'p', checked as boolean)}
                        disabled={isReadOnly}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Checkbox
                        checked={employee.weeks.b}
                        onCheckedChange={(checked) => handleWeekChange(index, 'b', checked as boolean)}
                        disabled={isReadOnly}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={employee.wagesSalary}
                        onChange={(e) => handleEmployeeChange(index, 'wagesSalary', parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        className="text-xs"
                        readOnly={isReadOnly}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={employee.bonus}
                        onChange={(e) => handleEmployeeChange(index, 'bonus', parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        className="text-xs"
                        readOnly={isReadOnly}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">${employee.totalWages.toFixed(2)}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">${employee.hssdLevy.toFixed(2)}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">${employee.socialSecurity.toFixed(2)}</div>
                    </TableCell>
                    {!isReadOnly && (
                      <TableCell className="text-center">
                        {employees.length > 1 && (
                          <Button
                            onClick={() => removeEmployee(index)}
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Totals Summary */}
          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <h3 className="font-semibold mb-3">Total Summary</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label className="text-sm text-muted-foreground">Total Wages</Label>
                <div className="text-xl font-bold">${totals.totalWages.toFixed(2)}</div>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Total HSSD Levy</Label>
                <div className="text-xl font-bold">${totals.totalHssdLevy.toFixed(2)}</div>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Total Social Security</Label>
                <div className="text-xl font-bold">${totals.totalSocialSecurity.toFixed(2)}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payments and Balance */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle>Payment Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="payments">Payments</Label>
              <Input
                id="payments"
                value={formData.payments}
                onChange={(e) => handleFormChange("payments", e.target.value)}
                placeholder="$0.00"
                readOnly={isReadOnly}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="balance">Balance</Label>
              <Input
                id="balance"
                value={formData.balance}
                onChange={(e) => handleFormChange("balance", e.target.value)}
                placeholder="$0.00"
                readOnly={isReadOnly}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any additional notes..."
            rows={3}
            readOnly={isReadOnly}
          />
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-2">
            {!isReadOnly && (
              <Button onClick={handleSave} className="gap-2">
                <Save className="h-4 w-4" />
                {mode === 'edit' ? 'Update' : 'Save'}
              </Button>
            )}
            {(mode === 'edit' || mode === 'add') && (
              <Button variant="outline" className="gap-2">
                <Check className="h-4 w-4" />
                Verify
              </Button>
            )}
            <Button onClick={handlePrint} variant="outline" className="gap-2">
              <Printer className="h-4 w-4" />
              Print
            </Button>
            <Button onClick={onClose} variant="ghost" className="gap-2">
              <X className="h-4 w-4" />
              Close
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}