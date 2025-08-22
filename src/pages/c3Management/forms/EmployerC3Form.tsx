import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable } from "@/components/ui/data-table";
import { Plus, Save, X, Trash2, Printer, Check, Eye, Edit, Download, Filter, ExternalLink } from "lucide-react";

interface Employee {
  ssn: string;
  name: string;
  days: boolean[];
  categories: boolean[];
  wages: number;
  bonus: number;
  totalWages: number;
  hssdLevy: number;
  socialSecurity: number;
  isVerified: boolean;
  weeklyWages?: number[];
  termStartDate?: string;
  payPeriod?: string;
}

// Calculation functions
const calculateTotalWages = (employee: Employee) => {
  const weeklyTotal = (employee.weeklyWages || []).reduce((sum, wage) => sum + wage, 0);
  return weeklyTotal + employee.wages + employee.bonus;
};

const calculateHSSDLevy = (totalWages: number) => {
  return totalWages * 0.015; // 1.5% HSSD Levy
};

const calculateSocialSecurity = (totalWages: number) => {
  return totalWages * 0.03; // 3% Social Security
};

const calculateSeverancePay = (totalWages: number) => {
  return totalWages * 0.01; // 1% Severance Pay
};

const calculateEmployeeTotals = (employee: Employee) => {
  const totalWages = calculateTotalWages(employee);
  const hssdLevy = calculateHSSDLevy(totalWages);
  const socialSecurity = calculateSocialSecurity(totalWages);
  
  return {
    totalWages,
    hssdLevy,
    socialSecurity
  };
};

// PreviewField component for view mode
const PreviewField = ({ label, value, required = false }: { label: string; value: string | number | null | undefined; required?: boolean }) => (
  <div>
    <Label className="text-sm font-medium text-gray-700">
      {label}{required && <span className="text-red-500 ml-1">*</span>}
    </Label>
    <div className="mt-1 text-sm text-gray-600 bg-gray-50 rounded-md p-2">
      {value || 'Not specified'}
    </div>
  </div>
);

// EmployeeDetailsModal component
const EmployeeDetailsModal = ({ 
  employee, 
  isOpen, 
  onClose, 
  isViewMode = false,
  onSave 
}: { 
  employee: Employee | null; 
  isOpen: boolean; 
  onClose: () => void; 
  isViewMode?: boolean;
  onSave?: (employee: Employee) => void;
}) => {
  const [localEmployee, setLocalEmployee] = useState<Employee | null>(employee);

  // Reset local employee when modal opens with new employee
  React.useEffect(() => {
    if (employee) {
      setLocalEmployee(employee);
    }
  }, [employee]);

  if (!isOpen || !employee) return null;

  const handleEmployeeChange = (field: keyof Employee, value: any) => {
    if (!localEmployee) return;
    setLocalEmployee({
      ...localEmployee,
      [field]: value
    });
  };

  const handleSave = () => {
    if (localEmployee && onSave) {
      onSave(localEmployee);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                 {/* Modal Header */}
         <div className="flex items-center justify-between p-6 border-b">
           <h2 className="text-xl font-bold text-gray-900">
             {employee.name ? "Employee Details" : "Add New Employee"}
           </h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button variant="outline" size="sm">
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6">
          <Card>
                         <CardContent className="pt-6">
               {isViewMode && employee.name ? (
                <div className="space-y-6">
                  {/* Employee Information Section */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <PreviewField label="SSN" value={employee.ssn} required />
                    <PreviewField label="Employee Name" value={employee.name} required />
                    <PreviewField label="Term Start Date" value="12-Aug-2025" />
                    <PreviewField label="Pay Period" value="Monthly" />
                  </div>

                  {/* Selected Weeks Section */}
                  <div>
                    <Label className="text-sm font-medium text-gray-900 mb-3 block">Selected Weeks</Label>
                    <div className="flex gap-4">
                      {[1, 2, 3, 4, 5, 'B/4', 'B'].map((week, index) => (
                        <div key={index} className="flex flex-col items-center space-y-1">
                          <span className="text-sm">{week}</span>
                          <div className="text-sm text-gray-900 bg-gray-50 px-2 py-1 rounded border h-6 flex items-center justify-center min-w-[24px]">
                            {employee.days[index] ? '✓' : ''}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Record Wages Section */}
                  <div>
                    <Label className="text-sm font-medium text-blue-600 mb-3 block">
                      Record Wages/ Salaries in respect of the weeks worked or Holiday Pay or Bonuses
                    </Label>
                                         <div className="grid grid-cols-7 gap-4 w-full">
                       {[1, 2, 3, 4, 5, 6, 7].map((week, index) => (
                         <div key={index} className="flex flex-col space-y-1">
                           <span className="text-sm">{week} Week</span>
                           <div className="text-sm text-gray-900 bg-gray-50 px-2 py-1 rounded border w-full text-left">
                             ${employee.weeklyWages?.[index]?.toFixed(2) || '0.00'}
                           </div>
                         </div>
                       ))}
                     </div>
                  </div>

                  {/* Calculation Summary Section */}
                  <div>
                    <Label className="text-sm font-medium text-gray-900 mb-3 block">
                      Calculation Summary (Automatically calculated totals and contributions).
                    </Label>
                    <div className="bg-gray-50 rounded-lg p-4 border-2 border-[#9D9D9D]">
                      {(() => {
                        const calculations = calculateEmployeeTotals(employee);
                        const totalWages = calculations.totalWages;
                        const employeeLevySS = calculations.hssdLevy + calculations.socialSecurity;
                        const employerLevySS = totalWages * 0.03; // 3% for employer
                        const severancePay = calculateSeverancePay(totalWages);
                        const levyPenalty = 0; // Placeholder
                        const severancePenalty = 0; // Placeholder
                        const fines = 0; // Placeholder
                        
                        return (
                          <div className="grid grid-cols-3 gap-6">
                            <div className="space-y-2">
                              <Label className="text-sm font-medium text-gray-700">Total Wages and Employee's Levy + SS Contribution</Label>
                              <div className="text-lg font-bold text-black">${(totalWages + employeeLevySS).toFixed(2)}</div>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm font-medium text-gray-700">Employer's 3% Wages for Levy + SS</Label>
                              <div className="text-lg font-bold text-black">${employerLevySS.toFixed(2)}</div>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm font-medium text-gray-700">Employer's 1% of wages for Severance Pay</Label>
                              <div className="text-lg font-bold text-black">${severancePay.toFixed(2)}</div>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm font-medium text-gray-700">Levy Penalty</Label>
                              <div className="text-lg font-bold text-black">${levyPenalty.toFixed(2)}</div>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm font-medium text-gray-700">Severance Penalty</Label>
                              <div className="text-lg font-bold text-black">${severancePenalty.toFixed(2)}</div>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm font-medium text-gray-700">Fines due for the month</Label>
                              <div className="text-lg font-bold text-black">${fines.toFixed(2)}</div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Employee Information Section */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="ssn">SSN <span className="text-red-500">*</span></Label>
                      <Input
                        id="ssn"
                        value={localEmployee?.ssn || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          // Only allow 6 digits
                          if (value === '' || /^\d{0,6}$/.test(value)) {
                            handleEmployeeChange("ssn", value);
                          }
                        }}
                        placeholder="Enter 6-digit SSN"
                        maxLength={6}
                      />
                      {localEmployee?.ssn && localEmployee.ssn.length !== 6 && (
                        <div className="text-red-500 text-xs">SSN must be exactly 6 digits</div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="employeeName">Employee Name</Label>
                      <Input
                        id="employeeName"
                        value={localEmployee?.name || ''}
                        onChange={(e) => handleEmployeeChange("name", e.target.value)}
                        placeholder="Enter employee name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="termStartDate">Term Start Date</Label>
                      <Input
                        id="termStartDate"
                        type="date"
                        value="2025-08-12"
                        placeholder="DD-MM-YYYY"
                      />
                    </div>
                                         <div className="space-y-2">
                       <Label htmlFor="payPeriod">Pay Period</Label>
                       <Select 
                         value={localEmployee?.payPeriod || "Monthly"} 
                         onValueChange={(value) => handleEmployeeChange("payPeriod", value)}
                       >
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
                  </div>

                                     {/* Selected Weeks Section */}
                   <div>
                     <Label className="text-sm font-medium text-gray-900 mb-3 block">Selected Weeks</Label>
                     <div className="flex gap-4">
                       {[1, 2, 3, 4, 5, 'B/4', 'B'].map((week, index) => (
                         <div key={index} className="flex flex-col items-center space-y-1">
                           <span className="text-sm">{week}</span>
                           <div 
                             className="text-sm text-gray-900 bg-gray-50 px-2 py-1 rounded border h-6 flex items-center justify-center min-w-[24px] cursor-pointer"
                             onClick={() => {
                               if (localEmployee) {
                                 const newDays = [...localEmployee.days];
                                 newDays[index] = !newDays[index];
                                 handleEmployeeChange("days", newDays);
                               }
                             }}
                           >
                             {localEmployee?.days[index] ? '✓' : ''}
                           </div>
                         </div>
                       ))}
                     </div>
                   </div>

                  {/* Record Wages Section */}
                  <div>
                    <Label className="text-sm font-medium text-blue-600 mb-3 block">
                      Record Wages/ Salaries in respect of the weeks worked or Holiday Pay or Bonuses
                    </Label>
                                         <div className="grid grid-cols-7 gap-4 w-full">
                       {[1, 2, 3, 4, 5, 6, 7].map((week, index) => (
                         <div key={index} className="flex flex-col space-y-1">
                           <span className="text-sm">{week} Week</span>
                           <Input
                             type="number"
                             value={localEmployee?.weeklyWages?.[index] || 0}
                             onChange={(e) => {
                               if (localEmployee) {
                                 const newWages = [...(localEmployee.weeklyWages || [0, 0, 0, 0, 0, 0, 0])];
                                 newWages[index] = parseFloat(e.target.value) || 0;
                                 handleEmployeeChange("weeklyWages", newWages);
                               }
                             }}
                             className="w-full h-8 text-left"
                             placeholder="0.00"
                           />
                         </div>
                       ))}
                     </div>
                  </div>

                  {/* Calculation Summary Section */}
                  <div>
                    <Label className="text-sm font-medium text-gray-900 mb-3 block">
                      Calculation Summary (Automatically calculated totals and contributions).
                    </Label>
                    <div className="bg-gray-50 rounded-lg p-4 border-2 border-[#9D9D9D]">
                      {localEmployee && (() => {
                        const calculations = calculateEmployeeTotals(localEmployee);
                        const totalWages = calculations.totalWages;
                        const employeeLevySS = calculations.hssdLevy + calculations.socialSecurity;
                        const employerLevySS = totalWages * 0.03; // 3% for employer
                        const severancePay = calculateSeverancePay(totalWages);
                        const levyPenalty = 0; // Placeholder
                        const severancePenalty = 0; // Placeholder
                        const fines = 0; // Placeholder
                        
                        return (
                          <div className="grid grid-cols-3 gap-6">
                            <div className="space-y-2">
                              <Label className="text-sm font-medium text-gray-700">Total Wages and Employee's Levy + SS Contribution</Label>
                              <div className="text-lg font-bold text-black">${(totalWages + employeeLevySS).toFixed(2)}</div>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm font-medium text-gray-700">Employer's 3% Wages for Levy + SS</Label>
                              <div className="text-lg font-bold text-black">${employerLevySS.toFixed(2)}</div>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm font-medium text-gray-700">Employer's 1% of wages for Severance Pay</Label>
                              <div className="text-lg font-bold text-black">${severancePay.toFixed(2)}</div>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm font-medium text-gray-700">Levy Penalty</Label>
                              <div className="text-lg font-bold text-black">${levyPenalty.toFixed(2)}</div>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm font-medium text-gray-700">Severance Penalty</Label>
                              <div className="text-lg font-bold text-black">${severancePenalty.toFixed(2)}</div>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm font-medium text-gray-700">Fines due for the month</Label>
                              <div className="text-lg font-bold text-black">${fines.toFixed(2)}</div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between p-6 border-t">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={localEmployee?.isVerified || false}
              onCheckedChange={(checked) => handleEmployeeChange("isVerified", checked as boolean)}
            />
                         <Label className="text-sm font-medium">Verified?</Label>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button className="bg-green-600 hover:bg-green-700" onClick={handleSave}>
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface EmployerC3FormProps {
  data?: any;
  mode?: 'add' | 'edit' | 'view';
  onSave?: (data: any) => void;
  onClose?: () => void;
}

export default function EmployerC3Form({ data, mode = 'add', onSave, onClose }: EmployerC3FormProps) {
  const isReadOnly = mode === 'view';
  const isViewMode = mode === 'view';

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  const [formData, setFormData] = useState({
    employerId: data?.employerId || (isViewMode ? "EMP001" : ""),
    period: data?.period || (isViewMode ? "June 2028" : ""),
    dateReceived: data?.dateReceived || (isViewMode ? "2025-06-06" : ""),
    schedule: data?.schedule || (isViewMode ? "4" : ""),
    employerName: data?.employerName || "Flemming, Rodney And Melissa",
    address: data?.address || "Cades Bay Nevis",
    numberOfEmployees: data?.numberOfEmployees || "1",
    status: data?.status || "Pending",
    payments: data?.payments || "0.00",
    balance: data?.balance || "0.00"
  });

  const [employees, setEmployees] = useState<Employee[]>([
    {
      ssn: "659657",
      name: "Flemming John",
      days: [true, true, true, true, false, false, false],
      categories: [true, true, true],
      wages: 0,
      bonus: 0,
      totalWages: -14.00,
      hssdLevy: -0.21,
      socialSecurity: -0.42,
      isVerified: true,
      weeklyWages: [3.78, 6.73, 1.82, 2.14, 0.00, 0.00, 0.00],
      termStartDate: "2025-08-12",
      payPeriod: "Monthly"
    },
    {
      ssn: "465768",
      name: "Brandi Douglas",
      days: [true, true, true, true, true],
      categories: [true, true, true],
      wages: 0,
      bonus: 0,
      totalWages: -1.00,
      hssdLevy: -0.01,
      socialSecurity: -0.03,
      isVerified: true,
      weeklyWages: [0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00]
    },
    {
      ssn: "785489",
      name: "Theodore Blanda",
      days: [true, true, true, true, true],
      categories: [true, true, true],
      wages: 0,
      bonus: 0,
      totalWages: 0.00,
      hssdLevy: 0.00,
      socialSecurity: 0.00,
      isVerified: false,
      weeklyWages: [0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00]
    },
    {
      ssn: "283849",
      name: "Marc McGlynn",
      days: [true, true, true, true, true],
      categories: [true, true, true],
      wages: 0,
      bonus: 0,
      totalWages: -3.00,
      hssdLevy: -0.04,
      socialSecurity: -0.09,
      isVerified: true,
      weeklyWages: [0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00]
    }
  ]);

  const totals = {
    socialSecurityContribution: 1396.67,
    totalDueToAccountantGeneral: 1094.10
  };

  const details = {
    dateEntered: "12-Aug-2025",
    dateModified: "14-Aug-2025",
    dateVerified: "15-Aug-2025",
    receivedBy: "c3svc",
    enteredBy: "c3svc",
    verifiedBy: "supervisor01",
    modifiedBy: "admin01"
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

  // Modal handlers
  const handleViewEmployee = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsModalOpen(true);
  };

  const handleEditEmployee = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedEmployee(null);
  };

  const handleSaveEmployee = (updatedEmployee: Employee) => {
    const index = employees.findIndex(emp => emp.ssn === updatedEmployee.ssn);
    if (index !== -1) {
      // Update existing employee
      const updatedEmployees = [...employees];
      updatedEmployees[index] = updatedEmployee;
      setEmployees(updatedEmployees);
    } else {
      // Add new employee
      setEmployees(prev => [...prev, updatedEmployee]);
    }
  };

  const handleAddRow = () => {
    const newEmployee: Employee = {
      ssn: '', // Generate unique SSN
      name: "",
      days: [false, false, false, false, false, false, false],
      categories: [false, false, false],
      wages: 0,
      bonus: 0,
      totalWages: 0.00,
      hssdLevy: 0.00,
      socialSecurity: 0.00,
      isVerified: false,
      weeklyWages: [0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00],
      termStartDate: "",
      payPeriod: "Monthly"
    };
    
    // Open modal with new employee for editing
    setSelectedEmployee(newEmployee);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent>
          {isViewMode ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <PreviewField label="Employer ID" value={formData.employerId} required />
              <PreviewField label="Period" value={formData.period} required />
              <PreviewField label="Date Received" value={formData.dateReceived} required />
              <PreviewField label="Schedule" value={formData.schedule} required />
            </div>
          ) : (
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
                <Input
                  id="period"
                  value={formData.period}
                  onChange={(e) => handleFormChange("period", e.target.value)}
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
                <Label htmlFor="schedule">Schedule</Label>
                <Input
                  id="schedule"
                  value={formData.schedule}
                  onChange={(e) => handleFormChange("schedule", e.target.value)}
                  readOnly={isReadOnly}
                />
              </div>
            </div>
          )}

          {/* Read-only information in gray card */}
          <div className="mt-6 bg-gray-100 rounded-lg p-4 border-2 border-[#9D9D9D]">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
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
        </CardContent>
      </Card>

      {/* Calculation Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-bold text-gray-900">Calculation Summary</CardTitle>
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
                <Label className="text-sm font-medium text-gray-700">Levy Penalty</Label>
                <div className="text-lg font-bold text-black">$0.00</div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Employer's 3% Wages for Levy + SS</Label>
                <div className="text-lg font-bold text-black">$0.00</div>
              </div>
            </div>

            {/* Second Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Severance Penalty</Label>
                <div className="text-lg font-bold text-black">$0.00</div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Employer's 1% of wages for Severance Pay</Label>
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


      <div className="mt-6">
        <CardTitle>Employees</CardTitle>
        <CardDescription>
          Put the "x" in the week(s) worked and Record Wages/ Salaries in respect of the weeks worked or Holiday Pay or Bonuses.
        </CardDescription>
      </div>

      {/* Employees Data Entry Form */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-gray-900">Employee Details</CardTitle>
            <Button variant="outline" size="sm" onClick={handleAddRow} disabled={isReadOnly}>
              <Plus className="h-4 w-4 mr-2" />
              Add Row
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* First row: SSN, Employee Name, Term Start Date */}
            <div className="flex gap-4">
              <div className="flex-1 space-y-2">
                <Label htmlFor="ssn">SSN</Label>
                <Input
                  id="ssn"
                  value={employees[0]?.ssn || ''}
                  onChange={(e) => handleEmployeeChange(0, "ssn", e.target.value)}
                  placeholder="Enter SSN Number"
                  readOnly={isReadOnly}
                />
              </div>

              <div className="flex-1 space-y-2">
                <Label htmlFor="employeeName">Employee Name</Label>
                <Input
                  id="employeeName"
                  value={employees[0]?.name || ''}
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
                  value={employees[0]?.termStartDate || ''}
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
                <Select value={employees[0]?.payPeriod || ''} onValueChange={(value) => handleEmployeeChange(0, "payPeriod", value)} disabled={isReadOnly}>
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
                        checked={employees[0]?.days?.[index] || false}
                        onCheckedChange={(checked) => {
                          const newDays = [...(employees[0]?.days || [false, false, false, false, false, false, false])];
                          newDays[index] = checked as boolean;
                          handleEmployeeChange(0, "days", newDays);
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
                      value={employees[0]?.weeklyWages?.[index] || 0}
                      onChange={(e) => {
                        const newWages = [...(employees[0]?.weeklyWages || [0, 0, 0, 0, 0, 0, 0])];
                        newWages[index] = parseFloat(e.target.value) || 0;
                        handleEmployeeChange(0, "weeklyWages", newWages);
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
                  checked={employees[0]?.isVerified || false}
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

             {/* Employee Details Section */}
       <Card>
         <CardHeader>
           <CardTitle className="text-lg font-bold text-gray-900">Employee Details</CardTitle>
         </CardHeader>
        <CardContent>
          <DataTable
            data={employees}
            columns={[
              { key: 'ssn', label: 'SSN', minWidth: '100px' },
              { key: 'name', label: 'Employee Name', minWidth: '150px' },
              { 
                key: 'days', 
                label: '1', 
                minWidth: '50px',
                render: (days) => (
                  <div className="text-sm text-gray-900 bg-gray-50 px-2 py-1 rounded border h-6 flex items-center justify-center min-w-[24px]">
                    {days[0] ? '✓' : ''}
                  </div>
                )
              },
              { 
                key: 'days', 
                label: '2', 
                minWidth: '50px',
                render: (days) => (
                  <div className="text-sm text-gray-900 bg-gray-50 px-2 py-1 rounded border h-6 flex items-center justify-center min-w-[24px]">
                    {days[1] ? '✓' : ''}
                  </div>
                )
              },
              { 
                key: 'days', 
                label: '3', 
                minWidth: '50px',
                render: (days) => (
                  <div className="text-sm text-gray-900 bg-gray-50 px-2 py-1 rounded border h-6 flex items-center justify-center min-w-[24px]">
                    {days[2] ? '✓' : ''}
                  </div>
                )
              },
              { 
                key: 'days', 
                label: '4', 
                minWidth: '50px',
                render: (days) => (
                  <div className="text-sm text-gray-900 bg-gray-50 px-2 py-1 rounded border h-6 flex items-center justify-center min-w-[24px]">
                    {days[3] ? '✓' : ''}
                  </div>
                )
              },
              { 
                key: 'days', 
                label: '5', 
                minWidth: '50px',
                render: (days) => (
                  <div className="text-sm text-gray-900 bg-gray-50 px-2 py-1 rounded border h-6 flex items-center justify-center min-w-[24px]">
                    {days[4] ? '✓' : ''}
                  </div>
                )
              },
              { 
                key: 'categories', 
                label: 'H', 
                minWidth: '50px',
                render: (categories) => (
                  <div className="text-sm text-gray-900 bg-gray-50 px-2 py-1 rounded border h-6 flex items-center justify-center min-w-[24px]">
                    {categories[0] ? '✓' : ''}
                  </div>
                )
              },
              { 
                key: 'categories', 
                label: 'P', 
                minWidth: '50px',
                render: (categories) => (
                  <div className="text-sm text-gray-900 bg-gray-50 px-2 py-1 rounded border h-6 flex items-center justify-center min-w-[24px]">
                    {categories[1] ? '✓' : ''}
                  </div>
                )
              },
              { 
                key: 'categories', 
                label: 'B', 
                minWidth: '50px',
                render: (categories) => (
                  <div className="text-sm text-gray-900 bg-gray-50 px-2 py-1 rounded border h-6 flex items-center justify-center min-w-[24px]">
                    {categories[2] ? '✓' : ''}
                  </div>
                )
              },
              { 
                key: 'wages', 
                label: 'Wages/Salary', 
                minWidth: '120px',
                render: (wages, row) => (
                  <Input
                    type="number"
                    value={wages}
                    onChange={(e) => {
                      const index = employees.findIndex(emp => emp.ssn === row.ssn);
                      handleEmployeeChange(index, "wages", parseFloat(e.target.value) || 0);
                    }}
                    className="w-20 h-8 text-center"
                    readOnly={isReadOnly}
                  />
                )
              },
              { 
                key: 'bonus', 
                label: 'Bonus', 
                minWidth: '100px',
                render: (bonus, row) => (
                  <Input
                    type="number"
                    value={bonus}
                    onChange={(e) => {
                      const index = employees.findIndex(emp => emp.ssn === row.ssn);
                      handleEmployeeChange(index, "bonus", parseFloat(e.target.value) || 0);
                    }}
                    className="w-20 h-8 text-center"
                    readOnly={isReadOnly}
                  />
                )
              },
              { 
                key: 'totalWages', 
                label: 'Total Wages', 
                minWidth: '120px',
                render: (totalWages) => `$${totalWages.toFixed(2)}`
              },
              { 
                key: 'hssdLevy', 
                label: 'HSSD Levy', 
                minWidth: '100px',
                render: (hssdLevy) => `$${hssdLevy.toFixed(2)}`
              },
              { 
                key: 'socialSecurity', 
                label: 'Social Security', 
                minWidth: '120px',
                render: (socialSecurity) => `$${socialSecurity.toFixed(2)}`
              },
              { 
                key: 'isVerified', 
                label: 'Verified', 
                minWidth: '120px',
                render: (isVerified) => (
                  <Badge 
                    variant={isVerified ? "secondary" : "destructive"} 
                    className={`text-xs font-bold ${isVerified ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                  >
                    {isVerified ? "Verified" : "Not Verified"}
                  </Badge>
                )
              }
            ]}
            title="Employees"
            searchPlaceholder="Search by SSN/Name"
            actions={{ view: true, edit: true }}
            onView={handleViewEmployee}
            onEdit={handleEditEmployee}
          />
        </CardContent>
      </Card>

      {/* Totals and Details Section */}
      <Card className="py-6">
        <CardContent className="mb-5">
          <div className="grid grid-cols-12 gap-6">
            {/* Totals Section - 4 columns */}
            <div className="col-span-4">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Totals</h3>
              <div className="bg-gray-50 rounded-lg p-4 border-2 border-[#9D9D9D]  bg-gray-100  h-full">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-gray-900">
                      Social Security Contribution due for the month
                    </Label>
                    <div className="text-sm text-gray-600">
                      ${totals.socialSecurityContribution.toFixed(2)}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-gray-900">
                      Total due to Accountant General
                    </Label>
                    <div className="text-sm text-gray-600">
                      ${totals.totalDueToAccountantGeneral.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Details Section - 8 columns */}
            <div className="col-span-8">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Details</h3>
              <div className="bg-gray-50 rounded-lg p-4 border-2 border-[#9D9D9D]  bg-gray-100  h-full">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-gray-700">Date Entered</Label>
                    <div className="text-sm text-gray-600">{details.dateEntered}</div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-gray-700">Date Modified</Label>
                    <div className="text-sm text-gray-600">{details.dateModified}</div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-gray-700">Date Verified</Label>
                    <div className="text-sm text-gray-600">{details.dateVerified}</div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-gray-700">Received By</Label>
                    <div className="text-sm text-gray-600">{details.receivedBy}</div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-gray-700">Entered By</Label>
                    <div className="text-sm text-gray-600">{details.enteredBy}</div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-gray-700">Verified By</Label>
                    <div className="text-sm text-gray-600">{details.verifiedBy}</div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-gray-700">Modified By</Label>
                    <div className="text-sm text-gray-600">{details.modifiedBy}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Employee Details Modal */}
      <EmployeeDetailsModal
        employee={selectedEmployee}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        isViewMode={isViewMode}
        onSave={handleSaveEmployee}
      />
    </div>
  );
}