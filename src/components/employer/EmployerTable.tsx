
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
      <div className="text-center py-8 text-gray-500">
        No employers found matching the current filters.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Actions</TableHead>
            <TableHead>ID</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Tax ID</TableHead>
            <TableHead>Employees</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Registration Date</TableHead>
            <TableHead>Contribution Status</TableHead>
            <TableHead>Total Contributions</TableHead>
            <TableHead>Compliance</TableHead>
            <TableHead>Last Contribution</TableHead>
            <TableHead>Contact</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {employers.map((employer) => (
            <TableRow key={employer.employerId}>
              <TableCell>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onViewDetails(employer)}
                  className="flex items-center gap-2"
                >
                  <Eye className="h-4 w-4" />
                  Details
                </Button>
              </TableCell>
              <TableCell className="font-medium">{employer.employerId}</TableCell>
              <TableCell>
                <div>
                  <div className="font-medium">{employer.employerName}</div>
                  <div className="text-sm text-gray-500">{employer.employerType}</div>
                </div>
              </TableCell>
              <TableCell>{employer.businessType}</TableCell>
              <TableCell>{getStatusBadge(employer.employerStatus)}</TableCell>
              <TableCell className="font-mono text-sm">{employer.taxId}</TableCell>
              <TableCell>{employer.numberOfEmployees.toLocaleString()}</TableCell>
              <TableCell>
                <div className="text-sm">
                  <div>{employer.address.city}, {employer.address.state}</div>
                  <div className="text-gray-500">{employer.address.country}</div>
                </div>
              </TableCell>
              <TableCell>{formatDate(employer.registrationDate)}</TableCell>
              <TableCell>{getStatusBadge(employer.contributionStatus)}</TableCell>
              <TableCell>{formatCurrency(employer.totalContributions)}</TableCell>
              <TableCell>{getStatusBadge(employer.complianceStatus)}</TableCell>
              <TableCell>{formatDate(employer.lastContributionDate)}</TableCell>
              <TableCell>
                <div className="text-sm">
                  <div>{employer.contactInfo.phone}</div>
                  <div className="text-gray-500">{employer.contactInfo.email}</div>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
