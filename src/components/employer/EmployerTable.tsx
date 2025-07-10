
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
    <div className="relative bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Fixed Actions Column Container */}
      <div className="flex">
        {/* Scrollable Content */}
        <div className="flex-1 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-government-50">
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
                <TableHead className="text-government-800 font-semibold w-0"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employers.map((employer) => (
                <TableRow key={employer.employerId} className="hover:bg-government-50/50">
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
                  <TableCell className="w-0"></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Fixed Actions Column */}
        <div className="flex-shrink-0 w-32 border-l bg-gray-50">
          <div className="h-12 bg-government-50 border-b flex items-center justify-center">
            <span className="text-government-800 font-semibold text-sm">Actions</span>
          </div>
          <div className="space-y-0">
            {employers.map((employer) => (
              <div key={`action-${employer.employerId}`} className="h-[73px] flex items-center justify-center p-2 border-b border-gray-200">
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => onViewDetails(employer)}
                  className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white w-full"
                >
                  <Eye className="h-3 w-3" />
                  Details
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
