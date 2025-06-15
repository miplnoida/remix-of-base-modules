
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Scale, DollarSign, Calendar, AlertTriangle } from 'lucide-react';

export const PenaltyManagementForm = () => {
  const [penaltyData, setPenaltyData] = useState({
    employerId: '',
    violationType: '',
    penaltyAmount: '',
    dueDate: '',
    description: '',
    status: 'Pending'
  });

  const existingPenalties = [
    {
      id: 'P-2024-001',
      employerId: 'EMP-001',
      employerName: 'ABC Manufacturing',
      violation: 'Late Payment',
      amount: '$150',
      status: 'Paid',
      dateIssued: '2024-01-15',
      datePaid: '2024-01-20'
    },
    {
      id: 'P-2024-002',
      employerId: 'EMP-003',
      employerName: 'Tech Solutions Inc',
      violation: 'Under-reporting',
      amount: '$500',
      status: 'Pending',
      dateIssued: '2024-01-20',
      datePaid: null
    }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Penalty data submitted:', penaltyData);
    // Handle form submission
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="create" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="create">Create Penalty</TabsTrigger>
          <TabsTrigger value="manage">Manage Penalties</TabsTrigger>
        </TabsList>

        <TabsContent value="create">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="h-5 w-5" />
                Penalty Management Form
              </CardTitle>
              <CardDescription>Issue and manage compliance penalties</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="employerId">Employer ID</Label>
                    <Input
                      id="employerId"
                      value={penaltyData.employerId}
                      onChange={(e) => setPenaltyData(prev => ({ ...prev, employerId: e.target.value }))}
                      placeholder="Enter employer ID..."
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="violationType">Violation Type</Label>
                    <Select onValueChange={(value) => setPenaltyData(prev => ({ ...prev, violationType: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select violation type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="late-payment">Late Payment</SelectItem>
                        <SelectItem value="under-reporting">Under-reporting</SelectItem>
                        <SelectItem value="non-registration">Non-registration of Employees</SelectItem>
                        <SelectItem value="false-information">False Information</SelectItem>
                        <SelectItem value="non-compliance">Non-compliance with Regulations</SelectItem>
                        <SelectItem value="obstruction">Obstruction of Audit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="penaltyAmount">Penalty Amount ($)</Label>
                    <Input
                      id="penaltyAmount"
                      type="number"
                      value={penaltyData.penaltyAmount}
                      onChange={(e) => setPenaltyData(prev => ({ ...prev, penaltyAmount: e.target.value }))}
                      placeholder="Enter penalty amount..."
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="dueDate">Due Date</Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={penaltyData.dueDate}
                      onChange={(e) => setPenaltyData(prev => ({ ...prev, dueDate: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Penalty Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe the violation and penalty details..."
                    value={penaltyData.description}
                    onChange={(e) => setPenaltyData(prev => ({ ...prev, description: e.target.value }))}
                    className="min-h-32"
                    required
                  />
                </div>

                <div>
                  <Label>Penalty Calculation</Label>
                  <div className="grid grid-cols-3 gap-4 mt-2 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <Label className="text-sm text-gray-600">Base Penalty</Label>
                      <div className="font-medium">${penaltyData.penaltyAmount || '0'}</div>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-600">Interest (5%)</Label>
                      <div className="font-medium">${penaltyData.penaltyAmount ? (parseFloat(penaltyData.penaltyAmount) * 0.05).toFixed(2) : '0'}</div>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-600">Total Amount</Label>
                      <div className="font-bold text-lg">${penaltyData.penaltyAmount ? (parseFloat(penaltyData.penaltyAmount) * 1.05).toFixed(2) : '0'}</div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" type="button">Save Draft</Button>
                  <Button type="submit">
                    <DollarSign className="h-4 w-4 mr-2" />
                    Issue Penalty
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manage">
          <Card>
            <CardHeader>
              <CardTitle>Penalty Records</CardTitle>
              <CardDescription>View and manage all issued penalties</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Penalty ID</TableHead>
                    <TableHead>Employer</TableHead>
                    <TableHead>Violation</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date Issued</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {existingPenalties.map((penalty) => (
                    <TableRow key={penalty.id}>
                      <TableCell className="font-medium">{penalty.id}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{penalty.employerName}</div>
                          <div className="text-sm text-gray-500">{penalty.employerId}</div>
                        </div>
                      </TableCell>
                      <TableCell>{penalty.violation}</TableCell>
                      <TableCell className="font-medium">{penalty.amount}</TableCell>
                      <TableCell>
                        <Badge variant={penalty.status === 'Paid' ? 'default' : 'destructive'}>
                          {penalty.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{penalty.dateIssued}</TableCell>
                      <TableCell>
                        <div className="flex space-x-1">
                          <Button variant="ghost" size="sm">Edit</Button>
                          <Button variant="ghost" size="sm">View</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
