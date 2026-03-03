import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, XCircle, Clock, Search, Filter, Eye } from 'lucide-react';

interface ComplianceRecord {
  id: string;
  employerId: string;
  employerName: string;
  complianceType: string;
  status: 'compliant' | 'non-compliant' | 'under-review' | 'pending';
  lastChecked: string;
  nextDue: string;
  riskLevel: 'low' | 'medium' | 'high';
  violations: number;
}

const mockComplianceData: ComplianceRecord[] = [
  {
    id: 'C001',
    employerId: 'EMP001',
    employerName: 'TechCorp Ltd',
    complianceType: 'Contribution Compliance',
    status: 'compliant',
    lastChecked: '2024-04-15',
    nextDue: '2024-05-15',
    riskLevel: 'low',
    violations: 0
  },
  {
    id: 'C002',
    employerId: 'EMP002',
    employerName: 'Manufacturing Inc',
    complianceType: 'Registration Compliance',
    status: 'non-compliant',
    lastChecked: '2024-04-10',
    nextDue: '2024-04-20',
    riskLevel: 'high',
    violations: 3
  },
  {
    id: 'C003',
    employerId: 'EMP003',
    employerName: 'Service Solutions',
    complianceType: 'Reporting Compliance',
    status: 'under-review',
    lastChecked: '2024-04-12',
    nextDue: '2024-04-25',
    riskLevel: 'medium',
    violations: 1
  }
];

const ComplianceMonitoring = () => {
  const [filters, setFilters] = useState({
    employerId: '',
    employerName: '',
    complianceType: '',
    status: '',
    riskLevel: ''
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'compliant':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'non-compliant':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'under-review':
        return <Clock className="h-4 w-4 text-warning" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      'compliant': 'bg-success/10 text-success',
      'non-compliant': 'bg-destructive/10 text-destructive',
      'under-review': 'bg-warning/15 text-warning',
      'pending': 'bg-muted text-muted-foreground'
    };
    return variants[status as keyof typeof variants] || variants.pending;
  };

  const getRiskBadge = (risk: string) => {
    const variants = {
      'low': 'bg-success/10 text-success',
      'medium': 'bg-warning/15 text-warning',
      'high': 'bg-destructive/10 text-destructive'
    };
    return variants[risk as keyof typeof variants] || variants.low;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Compliance Monitoring</h1>
        <p className="text-muted-foreground mt-2">Monitor employer compliance status and violations</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Compliant</p>
                <p className="text-2xl font-bold text-success">156</p>
              </div>
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Non-Compliant</p>
                <p className="text-2xl font-bold text-destructive">23</p>
              </div>
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Under Review</p>
                <p className="text-2xl font-bold text-warning">12</p>
              </div>
              <Clock className="h-8 w-8 text-warning" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">High Risk</p>
                <p className="text-2xl font-bold text-destructive">8</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <Label htmlFor="employer-id">Employer ID</Label>
              <Input id="employer-id" placeholder="Enter Employer ID" value={filters.employerId} onChange={(e) => setFilters(prev => ({ ...prev, employerId: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="employer-name">Employer Name</Label>
              <Input id="employer-name" placeholder="Enter Employer Name" value={filters.employerName} onChange={(e) => setFilters(prev => ({ ...prev, employerName: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="compliance-type">Compliance Type</Label>
              <Select value={filters.complianceType} onValueChange={(value) => setFilters(prev => ({ ...prev, complianceType: value }))}>
                <SelectTrigger><SelectValue placeholder="Select Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="contribution">Contribution Compliance</SelectItem>
                  <SelectItem value="registration">Registration Compliance</SelectItem>
                  <SelectItem value="reporting">Reporting Compliance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                <SelectTrigger><SelectValue placeholder="Select Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="compliant">Compliant</SelectItem>
                  <SelectItem value="non-compliant">Non-Compliant</SelectItem>
                  <SelectItem value="under-review">Under Review</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="risk-level">Risk Level</Label>
              <Select value={filters.riskLevel} onValueChange={(value) => setFilters(prev => ({ ...prev, riskLevel: value }))}>
                <SelectTrigger><SelectValue placeholder="Select Risk" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button className="flex items-center gap-2"><Search className="h-4 w-4" />Search</Button>
            <Button variant="outline" onClick={() => setFilters({ employerId: '', employerName: '', complianceType: '', status: '', riskLevel: '' })}>Clear Filters</Button>
          </div>
        </CardContent>
      </Card>

      {/* Compliance Records */}
      <Card>
        <CardHeader>
          <CardTitle>Compliance Records ({mockComplianceData.length} records)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-2">Employer ID</th>
                  <th className="text-left p-2">Employer Name</th>
                  <th className="text-left p-2">Compliance Type</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Risk Level</th>
                  <th className="text-left p-2">Violations</th>
                  <th className="text-left p-2">Last Checked</th>
                  <th className="text-left p-2">Next Due</th>
                  <th className="text-left p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {mockComplianceData.map((record) => (
                  <tr key={record.id} className="border-b border-border hover:bg-muted/50">
                    <td className="p-2 font-medium">{record.employerId}</td>
                    <td className="p-2">{record.employerName}</td>
                    <td className="p-2">{record.complianceType}</td>
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(record.status)}
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadge(record.status)}`}>
                          {record.status.replace('-', ' ').toUpperCase()}
                        </span>
                      </div>
                    </td>
                    <td className="p-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${getRiskBadge(record.riskLevel)}`}>
                        {record.riskLevel.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-2">
                      {record.violations > 0 ? (
                        <span className="text-destructive font-medium">{record.violations}</span>
                      ) : (
                        <span className="text-success">0</span>
                      )}
                    </td>
                    <td className="p-2">{record.lastChecked}</td>
                    <td className="p-2">{record.nextDue}</td>
                    <td className="p-2">
                      <Button variant="outline" size="sm" className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />View
                      </Button>
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

export default ComplianceMonitoring;
