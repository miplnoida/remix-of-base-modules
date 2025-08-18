import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable } from "@/components/ui/data-table";
import { Plus, Save, X, Trash2, Printer, Check } from "lucide-react";

interface Employee {
  ssn: string;
  name: string;
  termStartDate: string;
  payPeriod: string;
  weeks: boolean[];
  wages: number[];
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
    employerId: data?.employerId || "",
    period: data?.period || "",
    dateReceived: data?.dateReceived || "",
    schedule: data?.schedule || "",
    employerName: data?.employerName || "ABC Company Ltd",
    address: data?.address || "123 Main Street, Basseterre, St. Kitts",
    numberOfEmployees: data?.numberOfEmployees || "25",
    status: data?.status || "Active",
    payments: data?.payments || "15000.00",
    balance: data?.balance || "2500.00"
  });

  const [employees, setEmployees] = useState<Employee[]>([
    {
      ssn: "",
      name: "",
      termStartDate: "",
      payPeriod: "",
      weeks: [false, false, false, false, false, false, false],
      wages: [0, 0, 0, 0, 0, 0, 0],
      isVerified: false
    }
  ]);

  const [existingEmployees] = useState([
    {
      ssn: "123-45-6789",
      name: "John Doe",
      payPeriod: "Weekly",
      wages: [500, 500, 500, 500, 0, 0, 0],
      isVerified: true
    },
    {
      ssn: "987-65-4321",
      name: "Jane Smith",
      payPeriod: "Bi-Weekly",
      wages: [800, 800, 0, 0, 0, 0, 0],
      isVerified: false
    }
  ]);

  const totals = {
    totalDue: 2500.00
  };

  const handleFormChange = (field: string, value: any) => {
    if (isReadOnly) return;
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleEmployeeChange = (index: number, field: keyof Employee, value: any) => {
    if (isReadOnly) return;
    const updatedEmployees = [...employees];
    updatedEmployees[index] = {
      ...updatedEmployees[index],
      [field]: value
    };
    setEmployees(updatedEmployees);
  };

  const handleSave = () => {
    if (isReadOnly) return;
    const formDataToSave = {
      ...formData,
      employees,
      totals
    };
    
    console.log("Saving Employer C3 form:", formDataToSave);
    onSave?.(formDataToSave);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="mt-6 space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="employerId">Employer ID</Label>
              <Input
                id="employerId"
                value={formData.employerId}
                onChange={(e) => handleFormChange("employerId", e.target.value)}
                placeholder="Enter Employer ID"
                readOnly={isReadOnly}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="period">Period</Label>
              <Select value={formData.period} onValueChange={(value) => handleFormChange("period", value)} disabled={isReadOnly}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="June 2028">June 2028</SelectItem>
                  <SelectItem value="July 2028">July 2028</SelectItem>
                  <SelectItem value="August 2028">August 2028</SelectItem>
                </SelectContent>
              </Select>
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
              <Label htmlFor="schedule">Schedule</Label>
              <Input
                id="schedule"
                value={formData.schedule}
                onChange={(e) => handleFormChange("schedule", e.target.value)}
                readOnly={isReadOnly}
              />
            </div>
          </div>

          {/* Read-only information in gray card */}
          <div className="mt-6 bg-gray-100 rounded-lg p-4 border-2 border-[#9D9D9D]">
            <div className="flex justify-between items-center">
              <div className="space-y-1">
                <Label className="text-sm font-medium text-gray-900">Employer Name</Label>
                <div className="text-sm text-gray-600">{formData.employerName}</div>
              </div>

              <div className="space-y-1">
                <Label className="text-sm font-medium text-gray-900">Address</Label>
                <div className="text-sm text-gray-600">{formData.address}</div>
              </div>

              <div className="space-y-1">
                <Label className="text-sm font-medium text-gray-900">Number Of Employees</Label>
                <div className="text-sm text-gray-600">{formData.numberOfEmployees}</div>
              </div>

              <div className="space-y-1">
                <Label className="text-sm font-medium text-gray-900">Status</Label>
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                  {formData.status}
                </Badge>
              </div>

              <div className="space-y-1">
                <Label className="text-sm font-medium text-gray-900">Payments</Label>
                <div className="text-sm text-gray-600">${formData.payments}</div>
              </div>

              <div className="space-y-1">
                <Label className="text-sm font-medium text-gray-900">Balance</Label>
                <div className="text-sm text-gray-600">${formData.balance}</div>
              </div>
            </div>
          </div>

          {/* Totals */}
          <div className="space-y-2 flex justify-start mt-6">
            <Label className="text-sm font-medium text-gray-600 mr-4">Totals</Label>
            <div className="bg-gray-50 rounded-lg p-4 border-2 border-[#9D9D9D] w-full">
              <div className="flex justify-between items-center">
                <div className="space-y-1">
                  <Label className="text-sm font-medium text-gray-900">Social Security Contribution due for this month</Label>
                  <div className="text-sm text-gray-600">${totals.totalDue.toFixed(2)}</div>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm font-medium text-gray-900">Total due to Accountant General</Label>
                  <div className="text-sm text-gray-600">${totals.totalDue.toFixed(2)}</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mt-6">
        <CardTitle>Employees</CardTitle>
        <CardDescription>
          Put the "x" in the week(s) worked and Record Wages/ Salaries in respect of the weeks worked or Holiday Pay or Bonuses.
        </CardDescription>
      </div>

      {/* Employees Data Entry Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-gray-900">Employee Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* First row: SSN, Employee Name, Term Start Date */}
            <div className="flex gap-4">
              <div className="flex-1 space-y-2">
                <Label htmlFor="ssn">SSN</Label>
                <Input
                  id="ssn"
                  value={employees[0].ssn}
                  onChange={(e) => handleEmployeeChange(0, "ssn", e.target.value)}
                  placeholder="Enter SSN Number"
                  readOnly={isReadOnly}
                />
              </div>

              <div className="flex-1 space-y-2">
                <Label htmlFor="employeeName">Employee Name</Label>
                <Input
                  id="employeeName"
                  value={employees[0].name}
                  onChange={(e) => handleEmployeeChange(0, "name", e.target.value)}
                  placeholder="Enter employee name"
                  readOnly={isReadOnly}
                />
              </div>

              <div className="flex-1 space-y-2">
                <Label htmlFor="termStartDate">Term Start Date</Label>
                <Input
                  id="termStartDate"
                  type="date"
                  value={employees[0].termStartDate}
                  onChange={(e) => handleEmployeeChange(0, "termStartDate", e.target.value)}
                  placeholder="DD-MM-YYYY"
                  readOnly={isReadOnly}
                />
              </div>
            </div>

            {/* Second row: Pay Period and Week checkboxes */}
            <div className="flex gap-8">
              <div className="flex-1 space-y-2">
                <Label htmlFor="payPeriod">Pay Period</Label>
                <Select value={employees[0].payPeriod} onValueChange={(value) => handleEmployeeChange(0, "payPeriod", value)} disabled={isReadOnly}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Pay Period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Weekly">Weekly</SelectItem>
                    <SelectItem value="Bi-Weekly">Bi-Weekly</SelectItem>
                    <SelectItem value="Monthly">Monthly</SelectItem>
                    <SelectItem value="2 Monthly">2 Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1">
                <Label className="text-sm font-medium">Put the "x" in the week(s) worked</Label>
                <div className="flex gap-4 mt-2">
                  {[1, 2, 3, 4, 5, 'B/4', 'B'].map((week, index) => (
                    <div key={index} className="flex flex-col items-center space-y-1">
                      <span className="text-sm">{week}</span>
                      <Checkbox
                        checked={employees[0].weeks[index]}
                        onCheckedChange={(checked) => {
                          const newWeeks = [...employees[0].weeks];
                          newWeeks[index] = checked as boolean;
                          handleEmployeeChange(0, "weeks", newWeeks);
                        }}
                        disabled={isReadOnly}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Third row: Week wages */}
            <div>
              <Label className="text-sm font-medium text-blue-600">Record Wages/ Salaries in respect of the weeks worked or Holiday Pay or Bonuses</Label>
              <div className="flex gap-9 mt-2">
                {[1, 2, 3, 4, 5, 6, 7].map((week, index) => (
                  <div key={index} className="flex flex-col items-center space-y-1">
                    <span className="text-sm">{week} Week</span>
                    <Input
                      type="number"
                      value={employees[0].wages[index]}
                      onChange={(e) => {
                        const newWages = [...employees[0].wages];
                        newWages[index] = parseFloat(e.target.value) || 0;
                        handleEmployeeChange(0, "wages", newWages);
                      }}
                      className="w-20 h-8 text-center"
                      placeholder="0.00"
                      readOnly={isReadOnly}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Fourth row: Verified checkbox and Record Wages button */}
            <div className="flex items-center gap-4 pt-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={employees[0].isVerified}
                  onCheckedChange={(checked) => handleEmployeeChange(0, "isVerified", checked as boolean)}
                  disabled={isReadOnly}
                />
                <Label>Verified?</Label>
              </div>
              <Button className="bg-green-600 hover:bg-green-700" disabled={isReadOnly}>
                Record Wages
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Employees Table View */}
      <DataTable
        data={existingEmployees}
        columns={[
          { key: 'ssn', label: 'SSN', minWidth: '100px' },
          { key: 'name', label: 'Employee Name', minWidth: '150px' },
          { key: 'payPeriod', label: 'Pay Period', minWidth: '120px' },
          { 
            key: 'wages', 
            label: '1 Week', 
            minWidth: '100px',
            render: (wages) => `$${wages[0]?.toFixed(2) || '0.00'}`
          },
          { 
            key: 'wages', 
            label: '2 Week', 
            minWidth: '100px',
            render: (wages) => `$${wages[1]?.toFixed(2) || '0.00'}`
          },
          { 
            key: 'wages', 
            label: '3 Week', 
            minWidth: '100px',
            render: (wages) => `$${wages[2]?.toFixed(2) || '0.00'}`
          },
          { 
            key: 'wages', 
            label: '4 Week', 
            minWidth: '100px',
            render: (wages) => `$${wages[3]?.toFixed(2) || '0.00'}`
          },
          { 
            key: 'wages', 
            label: '5 Week', 
            minWidth: '100px',
            render: (wages) => `$${wages[4]?.toFixed(2) || '0.00'}`
          },
          { 
            key: 'wages', 
            label: '6 Week', 
            minWidth: '100px',
            render: (wages) => `$${wages[5]?.toFixed(2) || '0.00'}`
          },
          { 
            key: 'wages', 
            label: '7 Week', 
            minWidth: '100px',
            render: (wages) => `$${wages[6]?.toFixed(2) || '0.00'}`
          },
          { 
            key: 'isVerified', 
            label: 'Verified', 
            minWidth: '120px',
            render: (isVerified) => (
              <Badge variant={isVerified ? "default" : "destructive"}>
                {isVerified ? "Verified" : "Not Verified"}
              </Badge>
            )
          }
        ]}
        title="Employees "
        searchPlaceholder="Search by SSN/Name"
        actions={{ view: true, edit: true }}
        onView={(row) => console.log('View employee:', row)}
        onEdit={(row) => console.log('Edit employee:', row)}
      />

      {/* Calculation Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-bold text-gray-900">Calculation Summary</CardTitle>
          <CardDescription className="text-sm text-gray-600 italic">
            (Automatically calculated totals and contributions)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* First Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Total Wages and Employee's Levy + SS Contribution</Label>
                <div className="text-lg font-bold text-black">$0.00</div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Employer's 3% Wages for Levy + SS</Label>
                <div className="text-lg font-bold text-black">$0.00</div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Employer's 1% of wages for Severance Pay</Label>
                <div className="text-lg font-bold text-black">$0.00</div>
              </div>
            </div>

            {/* Second Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Levy Penalty</Label>
                <div className="text-lg font-bold text-black">$0.00</div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Severance Penalty</Label>
                <div className="text-lg font-bold text-black">$0.00</div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Fines due for the month</Label>
                <div className="text-lg font-bold text-black">$0.00</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      {/* <Card>
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
      </Card> */}
    </div>
  );
}