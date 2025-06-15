
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Search, Upload, Download, Plus, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface ContributionEntry {
  id: string;
  employerName: string;
  employerCode: string;
  month: string;
  year: string;
  totalEmployees: number;
  totalWages: number;
  contributionAmount: number;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  submittedDate?: string;
}

const ContributionEntry = () => {
  const [entries, setEntries] = useState<ContributionEntry[]>([
    {
      id: '1',
      employerName: 'ABC Corporation Ltd',
      employerCode: 'EMP001',
      month: 'November',
      year: '2024',
      totalEmployees: 150,
      totalWages: 450000,
      contributionAmount: 45000,
      status: 'approved',
      submittedDate: '2024-11-15'
    },
    {
      id: '2',
      employerName: 'XYZ Manufacturing',
      employerCode: 'EMP002',
      month: 'November',
      year: '2024',
      totalEmployees: 75,
      totalWages: 225000,
      contributionAmount: 22500,
      status: 'submitted',
      submittedDate: '2024-11-20'
    }
  ]);

  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const getStatusBadge = (status: string) => {
    const variants = {
      draft: 'bg-gray-100 text-gray-800',
      submitted: 'bg-blue-100 text-blue-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };
    return variants[status as keyof typeof variants] || variants.draft;
  };

  const filteredEntries = entries.filter(entry => {
    const matchesSearch = entry.employerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         entry.employerCode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || entry.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleSubmit = () => {
    toast.success('Contribution entry saved successfully!');
    setShowForm(false);
  };

  if (showForm) {
    return (
      <div className="space-y-4 h-full">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">New Contribution Entry</h1>
            <p className="text-gray-600 text-sm mt-1">Enter monthly contribution details</p>
          </div>
          <Button variant="outline" onClick={() => setShowForm(false)}>
            Back to List
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Contribution Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="employerCode">Employer Code</Label>
                <Input id="employerCode" placeholder="Enter employer code" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="employerName">Employer Name</Label>
                <Input id="employerName" placeholder="Enter employer name" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="month">Contribution Month</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select month" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="january">January</SelectItem>
                    <SelectItem value="february">February</SelectItem>
                    <SelectItem value="march">March</SelectItem>
                    <SelectItem value="april">April</SelectItem>
                    <SelectItem value="may">May</SelectItem>
                    <SelectItem value="june">June</SelectItem>
                    <SelectItem value="july">July</SelectItem>
                    <SelectItem value="august">August</SelectItem>
                    <SelectItem value="september">September</SelectItem>
                    <SelectItem value="october">October</SelectItem>
                    <SelectItem value="november">November</SelectItem>
                    <SelectItem value="december">December</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="year">Year</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2024">2024</SelectItem>
                    <SelectItem value="2023">2023</SelectItem>
                    <SelectItem value="2022">2022</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="totalEmployees">Total Employees</Label>
                <Input id="totalEmployees" type="number" placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="totalWages">Total Wages ($)</Label>
                <Input id="totalWages" type="number" placeholder="0.00" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contributionAmount">Contribution Amount ($)</Label>
                <Input id="contributionAmount" type="number" placeholder="0.00" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea id="notes" placeholder="Enter any additional notes..." rows={3} />
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <Button onClick={handleSubmit} className="bg-government-600 hover:bg-government-700">
                Save Entry
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contribution Entry</h1>
          <p className="text-gray-600 text-sm mt-1">Manage employer contribution entries</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button onClick={() => setShowForm(true)} className="bg-government-600 hover:bg-government-700">
            <Plus className="h-4 w-4 mr-2" />
            New Entry
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <CardTitle>Contribution Entries</CardTitle>
            <div className="flex gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by employer..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Employer</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Period</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Employees</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Total Wages</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Contribution</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((entry) => (
                  <tr key={entry.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-medium text-gray-900">{entry.employerName}</div>
                        <div className="text-sm text-gray-500">{entry.employerCode}</div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-700">
                      {entry.month} {entry.year}
                    </td>
                    <td className="py-3 px-4 text-gray-700">{entry.totalEmployees}</td>
                    <td className="py-3 px-4 text-gray-700">${entry.totalWages.toLocaleString()}</td>
                    <td className="py-3 px-4 text-gray-700">${entry.contributionAmount.toLocaleString()}</td>
                    <td className="py-3 px-4">
                      <Badge className={getStatusBadge(entry.status)}>
                        {entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ContributionEntry;
