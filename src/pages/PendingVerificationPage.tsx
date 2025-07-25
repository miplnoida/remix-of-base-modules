import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Filter, Calendar, Eye, CheckCircle, XCircle, Building2 } from 'lucide-react';
import { employerData } from '@/data/employerData';

const PendingVerificationPage = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  // Get pending verification employers (those under audit)
  const pendingEmployers = employerData.filter(emp => emp.complianceStatus === 'Under Audit');

  const filteredPending = pendingEmployers.filter(emp =>
    emp.employerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.employerId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleApprove = (employerId: string) => {
    console.log('Approving employer:', employerId);
    // Add approval logic here
  };

  const handleReject = (employerId: string) => {
    console.log('Rejecting employer:', employerId);
    // Add rejection logic here
  };

  const handleViewDetails = (employerId: string) => {
    console.log('Viewing details for employer:', employerId);
    // Navigate to employer details page
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/employers-management/dashboard")}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <Building2 className="h-8 w-8 text-yellow-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Pending Verification</h1>
              <p className="text-gray-600">Review and approve pending employer registrations</p>
            </div>
          </div>
        </div>

        <div className="mb-6 flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search pending employers..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filter
          </Button>
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Date Range
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Pending Employer Registrations</CardTitle>
            <CardDescription>
              Review and approve employer applications waiting for verification ({pendingEmployers.length} pending)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employer ID</TableHead>
                  <TableHead>Company Name</TableHead>
                  <TableHead>Business Type</TableHead>
                  <TableHead>Applied Date</TableHead>
                  <TableHead>Assigned Inspector</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPending.map((employer) => (
                  <TableRow key={employer.employerId}>
                    <TableCell className="font-medium">{employer.employerId}</TableCell>
                    <TableCell>{employer.employerName}</TableCell>
                    <TableCell>{employer.businessType}</TableCell>
                    <TableCell>{new Date(employer.lastAuditDate).toLocaleDateString()}</TableCell>
                    <TableCell>{employer.authorizedRepresentative}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                        {employer.complianceStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewDetails(employer.employerId)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          onClick={() => handleApprove(employer.employerId)}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleReject(employer.employerId)}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {filteredPending.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No pending employer registrations found.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PendingVerificationPage;