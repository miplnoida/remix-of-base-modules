import React, { useState, useEffect } from "react";
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

const weekLabels = [
  '1 Week',
  '2 Week',
  '3 Week',
  '4 Week',
  '5 Week',
  'Bonus Pay',
  'Holiday Pay'
];

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
    <div className="mt-1 text-sm text-gray-600 rounded-md py-2">
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

  const formatMoneyModal = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                 {/* Modal Header */}
         <div className="flex items-center justify-between p-6 border-b">
           <h2 className="text-xl font-bold text-gray-900">
             {isViewMode ? "View Employee" : (employee.name ? "Edit Employee" : "Add New Employee")}
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
                  {/* <div>
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
                  </div> */}

                  {/* Record Wages Section (editable in modal) */}
                  <div>
                    <Label className="text-sm font-medium text-blue-600 mb-3 block">
                      Record Wages/ Salaries in respect of the weeks worked or Holiday Pay or Bonuses
                    </Label>
                    <div className="grid grid-cols-7 gap-4 w-full">
                    {weekLabels.map((label, index) => (
                         <div key={index} className="flex flex-col space-y-1">
                           <span className="text-sm">{label}</span>
                           <div className="text-sm text-gray-900 bg-gray-50 px-2 py-1 rounded border w-full text-left">
                             ${employee.weeklyWages?.[index]?.toFixed(2) || '0.00'}
                           </div>
                         </div>
                       ))}
                    </div>
                  </div>

                  {/* Calculation Summary Section (View) */}
                  <div className="space-y-3">
                    <CardTitle className="text-base font-bold text-gray-900">Calculation Summary</CardTitle>
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
                        <div className="space-y-4 bg-blue-50 rounded-lg p-4 border border-blue-200">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-1">
                              <Label className="text-sm font-medium text-gray-700">Total Wages and Employee's Levy + SS Contribution</Label>
                              <div className="text-lg font-semibold text-gray-900">{formatMoneyModal(totalWages + employeeLevySS)}</div>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-sm font-medium text-gray-700">Employer's 3% Wages for Levy + SS</Label>
                              <div className="text-lg font-semibold text-gray-900">{formatMoneyModal(employerLevySS)}</div>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-sm font-medium text-gray-700">Employer's 1% of wages for Severance Pay</Label>
                              <div className="text-lg font-semibold text-gray-900">{formatMoneyModal(severancePay)}</div>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-1">
                              <Label className="text-sm font-medium text-gray-700">Levy Penalty</Label>
                              <div className="text-lg font-semibold text-red-600">{formatMoneyModal(levyPenalty)}</div>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-sm font-medium text-gray-700">Severance Penalty</Label>
                              <div className="text-lg font-semibold text-red-600">{formatMoneyModal(severancePenalty)}</div>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-sm font-medium text-gray-700">Fines due for the month</Label>
                              <div className="text-lg font-semibold text-red-600">{formatMoneyModal(fines)}</div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
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

                   

                  {/* Record Wages Section */}
                  <div>
                    <Label className="text-sm font-medium text-blue-600 mb-3 block">
                      Record Wages/ Salaries in respect of the weeks worked or Holiday Pay or Bonuses
                    </Label>
                                         <div className="grid grid-cols-7 gap-4 w-full">
                                         {weekLabels.map((label, index) => (
                        <div key={index} className="flex flex-col space-y-2 w-full">
                          <span className="text-sm font-medium">{label}</span>
                          <div className="flex items-center gap-0 w-full">
                            <div
                              className={`h-8 w-8 border-l border-t border-b rounded-l-md flex items-center justify-center cursor-pointer ${
                                localEmployee?.days?.[index]
                                  ? 'bg-[#33529c] border-[#33529c]'
                                  : 'bg-white border-gray-300'
                              }`}
                              onClick={() => {
                                if (!localEmployee) return;
                                const newDays = [...(localEmployee.days || [false, false, false, false, false, false, false])];
                                const newWages = [...(localEmployee.weeklyWages || [0, 0, 0, 0, 0, 0, 0])];

                                newDays[index] = !newDays[index];

                                if (!newDays[index]) {
                                  newWages[index] = 0;
                                }

                                handleEmployeeChange('days', newDays);
                                handleEmployeeChange('weeklyWages', newWages);
                              }}
                            >
                              {localEmployee?.days?.[index] && (
                                <span className="text-white text-sm font-bold">✓</span>
                              )}
                            </div>
                            <Input
                              type="text"
                              value={(localEmployee?.weeklyWages?.[index] ?? 0) === 0 ? '' : (localEmployee?.weeklyWages?.[index] as number).toFixed(2)}
                              onChange={(e) => {
                                if (!localEmployee) return;
                                const value = e.target.value;
                                const cleanValue = value.replace(/[^0-9.]/g, '');
                                const parts = cleanValue.split('.');
                                const integerPart = parts[0];
                                if (integerPart.length <= 6) {
                                  const newWages = [...(localEmployee.weeklyWages || [0, 0, 0, 0, 0, 0, 0])];
                                  newWages[index] = parseFloat(cleanValue) || 0;
                                  handleEmployeeChange('weeklyWages', newWages);
                                }
                              }}
                              onBlur={(e) => {
                                if (!localEmployee) return;
                                const value = parseFloat(e.target.value) || 0;
                                const newWages = [...(localEmployee.weeklyWages || [0, 0, 0, 0, 0, 0, 0])];
                                newWages[index] = value;
                                handleEmployeeChange('weeklyWages', newWages);
                              }}
                              className={`w-full h-8 text-center rounded-l-none ${
                                localEmployee?.days?.[index]
                                  ? 'border-[#33529c]'
                                  : 'border-gray-300'
                              }`}
                              placeholder="$0.00"
                              readOnly={!localEmployee?.days?.[index]}
                              disabled={!localEmployee?.days?.[index]}
                            />
                          </div>
                        </div>
                      ))}
                       
                     </div>
                  </div>

                  {/* Calculation Summary Section (Edit) */}
                  <div className="space-y-3">
                    <CardTitle className="text-base font-bold text-gray-900">Calculation Summary</CardTitle>
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
                        <div className="space-y-4 bg-blue-50 rounded-lg p-4 border border-blue-200">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-1">
                              <Label className="text-sm font-medium text-gray-700">Total Wages and Employee's Levy + SS Contribution</Label>
                              <div className="text-lg font-semibold text-gray-900">{formatMoneyModal(totalWages + employeeLevySS)}</div>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-sm font-medium text-gray-700">Employer's 3% Wages for Levy + SS</Label>
                              <div className="text-lg font-semibold text-gray-900">{formatMoneyModal(employerLevySS)}</div>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-sm font-medium text-gray-700">Employer's 1% of wages for Severance Pay</Label>
                              <div className="text-lg font-semibold text-gray-900">{formatMoneyModal(severancePay)}</div>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-1">
                              <Label className="text-sm font-medium text-gray-700">Levy Penalty</Label>
                              <div className="text-lg font-semibold text-red-600">{formatMoneyModal(levyPenalty)}</div>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-sm font-medium text-gray-700">Severance Penalty</Label>
                              <div className="text-lg font-semibold text-red-600">{formatMoneyModal(severancePenalty)}</div>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-sm font-medium text-gray-700">Fines due for the month</Label>
                              <div className="text-lg font-semibold text-red-600">{formatMoneyModal(fines)}</div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between p-6 border-t">
          {!isViewMode && (
            <div className="flex items-center gap-2">
              <Checkbox
                checked={localEmployee?.isVerified || false}
                onCheckedChange={(checked) => handleEmployeeChange("isVerified", checked as boolean)}
              />
              <Label className="text-sm font-medium">Verified?</Label>
            </div>
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            {!isViewMode && (
              <Button className="bg-green-600 hover:bg-green-700" onClick={handleSave}>
                Save Changes
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

interface EmployerC3FormProps {
  data?: any;
  mode?: 'add' | 'edit' | 'view';
  resetTrigger?: number;
  onSave?: (data: any) => void;
  onClose?: () => void;
}

export default function EmployerC3Form({ data, mode = 'add', resetTrigger, onSave, onClose }: EmployerC3FormProps) {
  const isReadOnly = mode === 'view';
  const isViewMode = mode === 'view';

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isModalViewMode, setIsModalViewMode] = useState<boolean>(true);
  
  // Form state for adding new employee
  const [formEmployee, setFormEmployee] = useState<Employee>({
    ssn: '',
    name: '',
    days: [false, false, false, false, false, false, false],
    categories: [false, false, false],
    wages: 0,
    bonus: 0,
    totalWages: 0.00,
    hssdLevy: 0.00,
    socialSecurity: 0.00,
    isVerified: false,
    weeklyWages: [0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00],
    termStartDate: '',
    payPeriod: 'Monthly'
  });

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
      weeklyWages: [0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00],
      payPeriod: "2 Monthly"
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
      weeklyWages: [0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00],
      payPeriod: "Weekly"
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
      weeklyWages: [0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00],
      payPeriod: "2 Weekly"
    }
  ]);

  const totals = {
    socialSecurityContribution: 1396.67,
    totalDueToAccountantGeneral: 1094.10
  };

  // Derived overall figures for Calculation Summary
  const overall = React.useMemo(() => {
    const sum = employees.reduce(
      (acc, emp) => {
        const { totalWages, hssdLevy, socialSecurity } = calculateEmployeeTotals(emp);
        acc.totalWages += totalWages;
        acc.employeeLevySS += hssdLevy + socialSecurity;
        return acc;
      },
      { totalWages: 0, employeeLevySS: 0 }
    );
    const employerThreePercent = sum.totalWages * 0.03;
    const employerOnePercent = sum.totalWages * 0.01;
    const levyPenalty = 0;
    const severancePenalty = 0;
    const fines = 0;
    return {
      totalWages: sum.totalWages,
      employeeLevySS: sum.employeeLevySS,
      employerThreePercent,
      employerOnePercent,
      levyPenalty,
      severancePenalty,
      fines,
    };
  }, [employees]);

  const formatMoney = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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

  // Reset form functionality
  const resetFormToDefaults = () => {
    setFormData({
      employerId: "",
      period: "",
      dateReceived: "",
      schedule: "",
      employerName: "",
      address: "",
      numberOfEmployees: "",
      status: "Pending",
      payments: "0.00",
      balance: "0.00"
    });
    
    setEmployees([]);
    
    setFormEmployee({
      ssn: '',
      name: '',
      days: [false, false, false, false, false, false, false],
      categories: [false, false, false],
      wages: 0,
      bonus: 0,
      totalWages: 0,
      hssdLevy: 0,
      socialSecurity: 0,
      isVerified: false,
      weeklyWages: [0, 0, 0, 0, 0, 0, 0],
      termStartDate: "",
      payPeriod: ""
    });
  };

  // Handle reset trigger from parent component
  useEffect(() => {
    if (resetTrigger && resetTrigger > 0 && mode === 'add') {
      resetFormToDefaults();
    }
  }, [resetTrigger, mode]);

  // Modal handlers
  const handleViewEmployee = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsModalViewMode(true);
    setIsModalOpen(true);
  };

  const handleEditEmployee = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsModalViewMode(false);
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
    // Reset the form with empty values
    setFormEmployee({
      ssn: '',
      name: '',
      days: [false, false, false, false, false, false, false],
      categories: [false, false, false],
      wages: 0,
      bonus: 0,
      totalWages: 0.00,
      hssdLevy: 0.00,
      socialSecurity: 0.00,
      isVerified: false,
      weeklyWages: [0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00],
      termStartDate: '',
      payPeriod: 'Monthly'
    });
  };

  const handleRecordWages = () => {
    // Calculate totals for the new employee
    const weeklyTotal = (formEmployee.weeklyWages || []).reduce((sum, wage) => sum + wage, 0);
    const totalWages = weeklyTotal + formEmployee.wages + formEmployee.bonus;
    const hssdLevy = totalWages * 0.015; // 1.5% HSSD Levy
    const socialSecurity = totalWages * 0.03; // 3% Social Security

    const newEmployee: Employee = {
      ...formEmployee,
      totalWages,
      hssdLevy,
      socialSecurity
    };

    // Add the new employee to the employees array
    setEmployees(prev => [...prev, newEmployee]);

    // Reset the form
    setFormEmployee({
      ssn: '',
      name: '',
      days: [false, false, false, false, false, false, false],
      categories: [false, false, false],
      wages: 0,
      bonus: 0,
      totalWages: 0.00,
      hssdLevy: 0.00,
      socialSecurity: 0.00,
      isVerified: false,
      weeklyWages: [0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00],
      termStartDate: '',
      payPeriod: 'Monthly'
    });
  };

  const handleFormEmployeeChange = (field: keyof Employee, value: any) => {
    if (isReadOnly) return;
    setFormEmployee(prev => ({
      ...prev,
      [field]: value
    }));
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
                <Label className="text-sm font-medium text-gray-900">Status</Label><br/>
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

      

      

      {/* Employees Data Entry Form (hidden in view mode) */}
      {!isViewMode && (
     <>
     <div className="mt-6">
        <CardTitle>Employees</CardTitle>
        <CardDescription>
          Put the "x" in the week(s) worked and Record Wages/ Salaries in respect of the weeks worked or Holiday Pay or Bonuses.
        </CardDescription>
      </div>
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
                         {/* First row: SSN, Employee Name, Term Start Date, Pay Period */}
             <div className="flex gap-4">
               <div className="flex-1 space-y-2">
                 <Label htmlFor="ssn">SSN</Label>
                 <Input
                   id="ssn"
                   value={formEmployee.ssn}
                   onChange={(e) => handleFormEmployeeChange("ssn", e.target.value)}
                   placeholder="Enter SSN Number"
                   readOnly={isReadOnly}
                 />
               </div>

               <div className="flex-1 space-y-2">
                 <Label htmlFor="employeeName">Employee Name</Label>
                 <Input
                   id="employeeName"
                   value={formEmployee.name}
                   onChange={(e) => handleFormEmployeeChange("name", e.target.value)}
                   placeholder="Enter employee name"
                   readOnly={isReadOnly}
                 />
               </div>

               <div className="flex-1 space-y-2">
                 <Label htmlFor="termStartDate">Term Start Date</Label>
                 <Input
                   id="termStartDate"
                   type="date"
                   value={formEmployee.termStartDate || ''}
                   onChange={(e) => handleFormEmployeeChange("termStartDate", e.target.value)}
                   placeholder="DD-MM-YYYY"
                   readOnly={isReadOnly}
                 />
               </div>

               <div className="flex-1 space-y-2">
                 <Label htmlFor="payPeriod">Pay Period</Label>
                 <Select value={formEmployee.payPeriod || ''} onValueChange={(value) => handleFormEmployeeChange("payPeriod", value)} disabled={isReadOnly}>
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

            {/* Third row: Week wages */}
            <div>
              <Label className="text-sm font-medium text-blue-600">Record Wages/ Salaries in respect of the weeks worked or Holiday Pay or Bonuses</Label>
              <div className="grid grid-cols-7 gap-4 w-full mt-2">
                {weekLabels.map((label, index) => (
                  <div key={index} className="flex flex-col space-y-2 w-full">
                    <span className="text-sm font-medium">{label}</span>
                    <div className="flex items-center gap-0 w-full">
                        <div 
                          className={`h-8 w-8 border-l border-t border-b rounded-l-md flex items-center justify-center cursor-pointer ${
                            formEmployee.days?.[index] 
                              ? 'bg-[#33529c] border-[#33529c]' 
                              : 'bg-white border-gray-300'
                          }`}
                          onClick={() => {
                            if (!isReadOnly) {
                              const newDays = [...(formEmployee.days || [false, false, false, false, false, false, false])];
                              const newWages = [...(formEmployee.weeklyWages || [0, 0, 0, 0, 0, 0, 0])];
                              
                              newDays[index] = !newDays[index];
                              
                              // If unchecking, reset the wage to 0.00
                              if (!newDays[index]) {
                                newWages[index] = 0;
                              }
                              
                              handleFormEmployeeChange("days", newDays);
                              handleFormEmployeeChange("weeklyWages", newWages);
                            }
                          }}
                        >
                          {formEmployee.days?.[index] && (
                            <span className="text-white text-sm font-bold">✓</span>
                          )}
                        </div>
                        <Input
                          type="text"
                          value={(formEmployee.weeklyWages?.[index] ?? 0) === 0 ? '' : (formEmployee.weeklyWages?.[index] as number).toFixed(2)}
                          onChange={(e) => {
                            const value = e.target.value;
                            // Remove any non-numeric characters except decimal point
                            const cleanValue = value.replace(/[^0-9.]/g, '');
                            
                            // Check if the value has more than 6 digits before decimal
                            const parts = cleanValue.split('.');
                            const integerPart = parts[0];
                            
                            if (integerPart.length <= 6) {
                              const newWages = [...(formEmployee.weeklyWages || [0, 0, 0, 0, 0, 0, 0])];
                              newWages[index] = parseFloat(cleanValue) || 0;
                              handleFormEmployeeChange("weeklyWages", newWages);
                            }
                          }}
                          onBlur={(e) => {
                            // Format to 2 decimal places when input loses focus
                            const value = parseFloat(e.target.value) || 0;
                            const newWages = [...(formEmployee.weeklyWages || [0, 0, 0, 0, 0, 0, 0])];
                            newWages[index] = value;
                            handleFormEmployeeChange("weeklyWages", newWages);
                          }}
                          className={`w-full h-8 text-center rounded-l-none ${
                            formEmployee.days?.[index] 
                              ? 'border-[#33529c]' 
                              : 'border-gray-300'
                          }`}
                          placeholder="$0.00"
                          readOnly={isReadOnly || !formEmployee.days?.[index]}
                          disabled={isReadOnly || !formEmployee.days?.[index]}
                        />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Fourth row: Verified toggle and action buttons */}
            <div className="flex items-center justify-between pt-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => !isReadOnly && handleFormEmployeeChange("isVerified", !formEmployee.isVerified)}
                  className={`h-10 w-10 rounded-md border flex items-center justify-center ${
                    formEmployee.isVerified ? 'bg-green-600 border-green-600' : 'bg-white border-gray-300'
                  }`}
                  disabled={isReadOnly}
                  title="Verified?"
                >
                  {formEmployee.isVerified && <Check className="h-5 w-5 text-white" />}
                </button>
                <Label className="text-base">Verified</Label>
              </div>

              <div className="flex items-center gap-2">
                <Button className="bg-green-600 hover:bg-green-700" disabled={isReadOnly} onClick={handleRecordWages}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
                <Button className="bg-gray-200 hover:bg-gray-300 text-gray-700 border border-gray-300" onClick={handleAddRow} disabled={isReadOnly}>
                  <X className="h-4 w-4 mr-2" />
                  Clear
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
     </>
      )}

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
              { key: 'payPeriod', label: 'Pay Period', minWidth: '120px' },
              {
                key: 'weeklyWages',
                label: '1 Week',
                minWidth: '100px',
                render: (weeklyWages) => `$${(weeklyWages?.[0] ?? 0).toFixed(2)}`
              },
              {
                key: 'weeklyWages',
                label: '2 Week',
                minWidth: '100px',
                render: (weeklyWages) => `$${(weeklyWages?.[1] ?? 0).toFixed(2)}`
              },
              {
                key: 'weeklyWages',
                label: '3 Week',
                minWidth: '100px',
                render: (weeklyWages) => `$${(weeklyWages?.[2] ?? 0).toFixed(2)}`
              },
              {
                key: 'weeklyWages',
                label: '4 Week',
                minWidth: '100px',
                render: (weeklyWages) => `$${(weeklyWages?.[3] ?? 0).toFixed(2)}`
              },
              {
                key: 'weeklyWages',
                label: '5 Week',
                minWidth: '100px',
                render: (weeklyWages) => `$${(weeklyWages?.[4] ?? 0).toFixed(2)}`
              },
              {
                key: 'weeklyWages',
                label: 'Bonus Pay',
                minWidth: '100px',
                render: (weeklyWages) => `$${(weeklyWages?.[5] ?? 0).toFixed(2)}`
              },
              {
                key: 'weeklyWages',
                label: 'Holiday Pay',
                minWidth: '100px',
                render: (weeklyWages) => `$${(weeklyWages?.[6] ?? 0).toFixed(2)}`
              },
              {
                key: 'isVerified',
                label: 'Verified',
                minWidth: '120px',
                render: (isVerified) => (
                  <Badge
                    variant={isVerified ? 'secondary' : 'destructive'}
                    className={`text-xs font-bold ${isVerified ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                  >
                    {isVerified ? 'Verified' : 'Not Verified'}
                  </Badge>
                )
              }
            ]}
            title="Employees"
            searchPlaceholder="Search by SSN/Name"
            actions={{ view: true, edit: !isReadOnly }}
            onView={handleViewEmployee}
            onEdit={handleEditEmployee}
          />
        </CardContent>
      </Card>


{/* Calculation Summary */}
<Card className="space-y-4 bg-blue-50 border border-blue-200 rounded-lg">
        <CardHeader className="pb-0">
          <CardTitle className="text-lg font-bold text-gray-900">Calculation Summary</CardTitle>
        </CardHeader>
        <CardContent>
         
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
              <div className="space-y-1">
                <Label className="text-sm font-medium text-gray-700">Total Wages and Employee's Levy + SS Contribution</Label>
                <div className="text-xl text-gray-900">{formatMoney(overall.totalWages + overall.employeeLevySS)}</div>
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-medium text-gray-700">Employer's 3% Wages for Levy + SS</Label>
                <div className="text-xl  text-gray-900">{formatMoney(overall.employerThreePercent)}</div>
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-medium text-gray-700">Employer's 1% of wages for Severance Pay</Label>
                <div className="text-xl text-gray-900">{formatMoney(overall.employerOnePercent)}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-1">
                <Label className="text-sm font-medium text-gray-700">Levy Penalty</Label>
                <div className="text-xl text-red-600">{formatMoney(overall.levyPenalty)}</div>
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-medium text-gray-700">Severance Penalty</Label>
                <div className="text-xl text-red-600">{formatMoney(overall.severancePenalty)}</div>
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-medium text-gray-700">Fines due for the month</Label>
                <div className="text-xl  text-red-600">{formatMoney(overall.fines)}</div>
              </div>
            </div>
         
        </CardContent>
      </Card>



      {/* Totals and Details Section */}
      <Card className="py-6">
        <CardContent className="mb-5">
          <div className="grid grid-cols-12 gap-6">
            {/* Totals Section - 4 columns */}
            <div className="col-span-4">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Totals</h3>
              <div className="bg-green-50 rounded-lg p-4 border border-green-200 h-full">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium ">
                      Social Security Contribution due for the month
                    </Label>
                    <div className="text-base font-semibold text-gray-500">
                      {formatMoney(totals.socialSecurityContribution)}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-sm font-medium ">
                      Total due to Accountant General
                    </Label>
                    <div className="text-base font-semibold text-gray-500">
                      {formatMoney(totals.totalDueToAccountantGeneral)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Details Section - 8 columns */}
            <div className="col-span-8 ">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Details</h3>
              <div className="bg-gray-50 rounded-lg p-4 border-2 border-[#9D9D9D] h-full">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium ">Date Entered</Label>
                    <div className="text-sm text-gray-600">{details.dateEntered}</div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm font-medium ">Date Modified</Label>
                    <div className="text-sm text-gray-600">{details.dateModified}</div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm font-medium ">Date Verified</Label>
                    <div className="text-sm text-gray-600">{details.dateVerified}</div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Received By</Label>
                    <div className="text-sm text-gray-600">{details.receivedBy}</div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm font-medium ">Entered By</Label>
                    <div className="text-sm text-gray-600">{details.enteredBy}</div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm font-medium ">Verified By</Label>
                    <div className="text-sm text-gray-600">{details.verifiedBy}</div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm font-medium ">Modified By</Label>
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
        isViewMode={isModalViewMode}
        onSave={handleSaveEmployee}
      />
    </div>
  );
}