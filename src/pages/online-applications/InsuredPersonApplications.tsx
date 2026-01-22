import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Search, Filter, RefreshCw, Eye, CheckCircle, XCircle, AlertTriangle, Calendar } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

// Mock data for demonstration (will be replaced with API calls)
const mockApplications = [
  { applicationId: 'IP-2024-001', firstName: 'John', lastName: 'Smith', dateOfBirth: '1985-03-15', phone: '869-***-**34', registrationDate: '2024-01-15', status: 'Pending' },
  { applicationId: 'IP-2024-002', firstName: 'Mary', lastName: 'Johnson', dateOfBirth: '1990-07-22', phone: '869-***-**56', registrationDate: '2024-01-14', status: 'Approved' },
  { applicationId: 'IP-2024-003', firstName: 'James', lastName: 'Williams', dateOfBirth: '1978-11-08', phone: '869-***-**78', registrationDate: '2024-01-13', status: 'Rejected' },
  { applicationId: 'IP-2024-004', firstName: 'Sarah', lastName: 'Brown', dateOfBirth: '1995-02-28', phone: '869-***-**90', registrationDate: '2024-01-12', status: 'Pending' },
];

export default function InsuredPersonApplications() {
  const { user, hasPermission } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isLoading] = useState(false);

  const isAdmin = user?.role === 'admin' || hasPermission('system_administration');
  const isOfficer = hasPermission('process_claims') || hasPermission('approve_benefits');
  const canApprove = isAdmin || isOfficer;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Pending':
        return <Badge variant="outline" className="text-amber-600 border-amber-300">Pending</Badge>;
      case 'Approved':
        return <Badge variant="default">Approved</Badge>;
      case 'Rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const filteredApplications = mockApplications.filter(app => {
    const matchesSearch = app.applicationId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.lastName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Insured Person Applications
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage online registration applications for insured persons
          </p>
        </div>
        <Button variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by Application ID or Name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Approved">Approved</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Applications Table */}
      <Card>
        <CardHeader>
          <CardTitle>Applications ({filteredApplications.length})</CardTitle>
          <CardDescription>Online registration applications from the external portal</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Application ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Date of Birth</TableHead>
                <TableHead>Phone (Masked)</TableHead>
                <TableHead>Registration Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredApplications.map((app) => (
                <TableRow key={app.applicationId}>
                  <TableCell className="font-medium">{app.applicationId}</TableCell>
                  <TableCell>{app.firstName} {app.lastName}</TableCell>
                  <TableCell>{format(new Date(app.dateOfBirth), 'MMM d, yyyy')}</TableCell>
                  <TableCell>{app.phone}</TableCell>
                  <TableCell>{format(new Date(app.registrationDate), 'MMM d, yyyy')}</TableCell>
                  <TableCell>{getStatusBadge(app.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" className="gap-1">
                        <Eye className="h-4 w-4" />
                        View
                      </Button>
                      {canApprove && app.status === 'Pending' && (
                        <>
                          <Button variant="ghost" size="sm" className="gap-1 text-green-600 hover:text-green-700">
                            <CheckCircle className="h-4 w-4" />
                            Approve
                          </Button>
                          <Button variant="ghost" size="sm" className="gap-1 text-destructive hover:text-destructive">
                            <XCircle className="h-4 w-4" />
                            Reject
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Info Notice */}
      <Card className="bg-accent/50 border-accent">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <AlertTriangle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium">API Integration</p>
              <p className="mt-1 text-muted-foreground">
                This module fetches data from the configured external API. Ensure API settings are properly configured in Administration → API Configuration.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
