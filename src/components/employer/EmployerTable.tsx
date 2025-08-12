
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { Employer } from '@/pages/employersManagement/EmployerDirectory';

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
    return <EmptyState title="No employers found" description="Try adjusting your search filters or register a new employer." />;
  }

  return (
    <div className="overflow-x-auto">
      <Table className="app-table">
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Tax ID</TableHead>
            <TableHead className="numeric">Employees</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Registration Date</TableHead>
            <TableHead>Contribution Status</TableHead>
            <TableHead className="numeric">Total Contributions</TableHead>
            <TableHead>Compliance</TableHead>
            <TableHead>Last Contribution</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {employers.map((employer) => (
            <TableRow key={employer.employerId}>
              <TableCell className="font-medium">{employer.employerId}</TableCell>
              <TableCell>
                <div>
                  <div className="font-medium">{employer.employerName}</div>
                  <div className="text-sm text-muted-foreground">{employer.employerType}</div>
                </div>
              </TableCell>
              <TableCell>{employer.businessType}</TableCell>
              <TableCell>{getStatusBadge(employer.employerStatus)}</TableCell>
              <TableCell className="font-mono text-sm">{employer.taxId}</TableCell>
              <TableCell className="numeric">{employer.numberOfEmployees.toLocaleString()}</TableCell>
              <TableCell>
                <div className="text-sm">
                  <div>{employer.address.city}, {employer.address.state}</div>
                  <div className="text-muted-foreground">{employer.address.country}</div>
                </div>
              </TableCell>
              <TableCell>{formatDate(employer.registrationDate)}</TableCell>
              <TableCell>{getStatusBadge(employer.contributionStatus)}</TableCell>
              <TableCell className="numeric">{formatCurrency(employer.totalContributions)}</TableCell>
              <TableCell>{getStatusBadge(employer.complianceStatus)}</TableCell>
              <TableCell>{formatDate(employer.lastContributionDate)}</TableCell>
              <TableCell>
                <div className="text-sm">
                  <div>{employer.contactInfo.phone}</div>
                  <div className="text-muted-foreground">{employer.contactInfo.email}</div>
                </div>
              </TableCell>
              <TableCell>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onViewDetails(employer)}
                  className="flex items-center gap-1"
                >
                  <Eye className="h-3 w-3" />
                  Details
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
