
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';
import { Employer } from '@/pages/EmployerDirectory';

interface EmployerTableProps {
  employers: Employer[];
  onViewDetails: (employer: Employer) => void;
}

export const EmployerTable: React.FC<EmployerTableProps> = ({ employers, onViewDetails }) => {
  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      'Active': 'default',
      'Inactive': 'secondary',
      'Suspended': 'destructive',
      'Compliant': 'default',
      'Non-Compliant': 'destructive',
      'Under Audit': 'outline',
      'Paid': 'default',
      'Overdue': 'destructive',
      'Pending': 'outline'
    };
    
    return (
      <Badge variant={variants[status] || 'secondary'}>
        {status}
      </Badge>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (employers.length === 0) {
    return (
      <div className="text-center py-8 text-gray-600">
        No employers found matching the current filters.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto bg-white rounded-lg shadow-sm border border-gray-200">
      <Table>
        <TableHeader>
          <TableRow className="bg-government-50">
            <TableHead className="text-government-800 font-semibold">Actions</TableHead>
            <TableHead className="text-government-800 font-semibold">ID</TableHead>
            <TableHead className="text-government-800 font-semibold">Name</TableHead>
            <TableHead className="text-government-800 font-semibold">Type</TableHead>
            <TableHead className="text-government-800 font-semibold">Status</TableHead>
            <TableHead className="text-government-800 font-semibold">Tax ID</TableHead>
            <TableHead className="text-government-800 font-semibold">Employees</TableHead>
            <TableHead className="text-government-800 font-semibold">Location</TableHead>
            <TableHead className="text-government-800 font-semibold">Registration Date</TableHead>
            <TableHead className="text-government-800 font-semibold">Contribution Status</TableHead>
            <TableHead className="text-government-800 font-semibold">Total Contributions</TableHead>
            <TableHead className="text-government-800 font-semibold">Compliance</TableHead>
            <TableHead className="text-government-800 font-semibold">Last Contribution</TableHead>
            <TableHead className="text-government-800 font-semibold">Contact</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {employers.map((employer) => (
            <TableRow key={employer.employerId} className="hover:bg-government-50/50">
              <TableCell>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => onViewDetails(employer)}
                  className="flex items-center gap-2 bg-government-600 hover:bg-government-700 text-white"
                >
                  <Eye className="h-4 w-4" />
                  Details
                </Button>
              </TableCell>
              <TableCell className="font-medium text-government-800">{employer.employerId}</TableCell>
              <TableCell>
                <div>
                  <div className="font-medium text-government-900">{employer.employerName}</div>
                  <div className="text-sm text-government-600">{employer.employerType}</div>
                </div>
              </TableCell>
              <TableCell className="text-government-700">{employer.businessType}</TableCell>
              <TableCell>{getStatusBadge(employer.employerStatus)}</TableCell>
              <TableCell className="font-mono text-sm text-government-700">{employer.taxId}</TableCell>
              <TableCell className="text-government-700">{employer.numberOfEmployees.toLocaleString()}</TableCell>
              <TableCell>
                <div className="text-sm">
                  <div className="text-government-800">{employer.address.city}, {employer.address.state}</div>
                  <div className="text-government-600">{employer.address.country}</div>
                </div>
              </TableCell>
              <TableCell className="text-government-700">{formatDate(employer.registrationDate)}</TableCell>
              <TableCell>{getStatusBadge(employer.contributionStatus)}</TableCell>
              <TableCell className="text-government-700">{formatCurrency(employer.totalContributions)}</TableCell>
              <TableCell>{getStatusBadge(employer.complianceStatus)}</TableCell>
              <TableCell className="text-government-700">{formatDate(employer.lastContributionDate)}</TableCell>
              <TableCell>
                <div className="text-sm">
                  <div className="text-government-800">{employer.contactInfo.phone}</div>
                  <div className="text-government-600">{employer.contactInfo.email}</div>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
