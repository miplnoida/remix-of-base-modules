import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar, CalendarDays, Check, X } from 'lucide-react';

const TestDataEntry = () => {
  const [employerData, setEmployerData] = useState({
    employerId: '658730',
    employerName: '',
    building: '',
    street: '',
    period: 'Aug-2025',
    dateReceived: '09-Sep-2025',
    schedule: '1',
    nilReturn: false,
    numberOfEmployees: 2,
    status: '',
    payments: 0.00,
    balance: 0.00
  });

  const [employees, setEmployees] = useState([
    {
      ssn: '151813',
      name: 'Allen, Nora',
      startDate: '11-Sep-20',
      term: '2w',
      weeks: [true, true, true, true, true, false],
      wages: [1200.00, 2300.00, 2500.00, 6700.00, 0.00, 0.00, 0.00],
      verified: false
    },
    {
      ssn: '160803',
      name: 'Finch, Malcolm',
      startDate: '18-Sep-20',
      term: 'MW',
      weeks: [false, false, false, false, false, false],
      wages: [0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00],
      verified: false
    }
  ]);

  const totalSocialSecurity = 65.00;
  const totalAccountantGeneral = 1449.50;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Test Data Entry</h1>
        <p className="text-muted-foreground">Social Security Contribution Management</p>
      </div>

      {/* Employer Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Employer Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="employerId">Employer ID</Label>
              <Input
                id="employerId"
                value={employerData.employerId}
                onChange={(e) => setEmployerData(prev => ({ ...prev, employerId: e.target.value }))}
                className="bg-green-100"
              />
            </div>
            
            <div className="md:col-span-2">
              <Label htmlFor="employerName">Employer Name</Label>
              <Input
                id="employerName"
                placeholder="St. Christopher & Nevis Solid Waste Man."
                value={employerData.employerName}
                onChange={(e) => setEmployerData(prev => ({ ...prev, employerName: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="period">Period</Label>
              <Input
                id="period"
                value={employerData.period}
                onChange={(e) => setEmployerData(prev => ({ ...prev, period: e.target.value }))}
                className="bg-green-100"
              />
            </div>

            <div>
              <Label htmlFor="building">Building</Label>
              <Input
                id="building"
                placeholder="Ursula R Amory Building"
                value={employerData.building}
                onChange={(e) => setEmployerData(prev => ({ ...prev, building: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="numberOfEmployees">Number of Employees</Label>
              <Input
                id="numberOfEmployees"
                type="number"
                value={employerData.numberOfEmployees}
                onChange={(e) => setEmployerData(prev => ({ ...prev, numberOfEmployees: parseInt(e.target.value) || 0 }))}
              />
            </div>

            <div>
              <Label htmlFor="dateReceived">Date Received</Label>
              <Input
                id="dateReceived"
                value={employerData.dateReceived}
                onChange={(e) => setEmployerData(prev => ({ ...prev, dateReceived: e.target.value }))}
                className="bg-green-100"
              />
            </div>

            <div>
              <Label htmlFor="street">Street</Label>
              <Input
                id="street"
                placeholder="Central & New Streets"
                value={employerData.street}
                onChange={(e) => setEmployerData(prev => ({ ...prev, street: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Input
                id="status"
                value={employerData.status}
                onChange={(e) => setEmployerData(prev => ({ ...prev, status: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="schedule">Schedule</Label>
              <Input
                id="schedule"
                value={employerData.schedule}
                onChange={(e) => setEmployerData(prev => ({ ...prev, schedule: e.target.value }))}
                className="bg-green-100"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="nilReturn"
                checked={employerData.nilReturn}
                onCheckedChange={(checked) => setEmployerData(prev => ({ ...prev, nilReturn: !!checked }))}
              />
              <Label htmlFor="nilReturn">Nil Return</Label>
            </div>

            <div>
              <Label htmlFor="payments">Payments</Label>
              <Input
                id="payments"
                type="number"
                step="0.01"
                value={employerData.payments}
                onChange={(e) => setEmployerData(prev => ({ ...prev, payments: parseFloat(e.target.value) || 0 }))}
              />
            </div>

            <div>
              <Label htmlFor="balance">Balance</Label>
              <Input
                id="balance"
                type="number"
                step="0.01"
                value={employerData.balance}
                onChange={(e) => setEmployerData(prev => ({ ...prev, balance: parseFloat(e.target.value) || 0 }))}
                className="text-red-600"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Totals */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="text-right">
              <span className="text-lg font-semibold">Social Security Contribution due for the month →</span>
            </div>
            <div>
              <span className="text-xl font-bold text-blue-600">${totalSocialSecurity.toFixed(2)}</span>
            </div>
            
            <div className="text-right">
              <span className="text-lg font-semibold">Total due to Accountant General →</span>
            </div>
            <div>
              <span className="text-xl font-bold text-blue-600">${totalAccountantGeneral.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Employee Details Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Employee Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-green-600">
                  <TableHead className="text-white">SSN</TableHead>
                  <TableHead className="text-white">Name of Employee</TableHead>
                  <TableHead className="text-white">Term/Start Date</TableHead>
                  <TableHead className="text-white">Pay Period</TableHead>
                  <TableHead className="text-white">Mark "X" in the weeks worked</TableHead>
                  <TableHead className="text-white text-center" colSpan={7}>
                    Record Wages/Salaries in respect of the weeks worked or Holiday Pay or Bonuses
                  </TableHead>
                  <TableHead className="text-white">Verified</TableHead>
                </TableRow>
                <TableRow className="bg-primary text-primary-foreground">
                  <TableHead className="text-white">Start Date</TableHead>
                  <TableHead className="text-white"></TableHead>
                  <TableHead className="text-white"></TableHead>
                  <TableHead className="text-white"></TableHead>
                  <TableHead className="text-white">B indicates Bonus</TableHead>
                  <TableHead className="text-white text-center">1</TableHead>
                  <TableHead className="text-white text-center">2</TableHead>
                  <TableHead className="text-white text-center">3</TableHead>
                  <TableHead className="text-white text-center">4</TableHead>
                  <TableHead className="text-white text-center">5</TableHead>
                  <TableHead className="text-white text-center">6</TableHead>
                  <TableHead className="text-white text-center">7</TableHead>
                  <TableHead className="text-white"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((employee, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{employee.ssn}</TableCell>
                    <TableCell>{employee.name}</TableCell>
                    <TableCell>{employee.startDate}</TableCell>
                    <TableCell>{employee.term}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {employee.weeks.map((checked, weekIndex) => (
                          <Checkbox
                            key={weekIndex}
                            checked={checked}
                            className="w-4 h-4"
                          />
                        ))}
                      </div>
                    </TableCell>
                    {employee.wages.map((wage, wageIndex) => (
                      <TableCell key={wageIndex} className="text-center">
                        ${wage.toFixed(2)}
                      </TableCell>
                    ))}
                    <TableCell>
                      <Button variant="outline" size="sm">
                        {employee.verified ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Details Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date Entered</Label>
              <Input placeholder="Enter date" />
              
              <Label>Date Modified</Label>
              <Input placeholder="Enter date" />
              
              <Label>Date Verified</Label>
              <Input placeholder="Enter date" />
            </div>
            
            <div className="space-y-2">
              <Label>Rec'd By</Label>
              <Input placeholder="Enter name" />
              
              <Label>Entered By</Label>
              <Input placeholder="Enter name" />
              
              <Label>Modified By</Label>
              <Input placeholder="Enter name" />
              
              <Label>Verified By</Label>
              <Input placeholder="Enter name" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-4 justify-end">
        <Button variant="outline">Cancel</Button>
        <Button variant="outline">Save Draft</Button>
        <Button>Submit</Button>
      </div>
    </div>
  );
};

export default TestDataEntry;