
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmployerFilters } from '@/components/employer/EmployerFilters';
import { EmployerTable } from '@/components/employer/EmployerTable';
import { EmployerDetailsDialog } from '@/components/employer/EmployerDetailsDialog';
import { employerData } from '@/data/employerData';
import { Employer, EmployerFilters as EmployerFiltersType } from '@/pages/EmployerDirectory';
import { Building2 } from 'lucide-react';

const ManageEmployers = () => {
  const [filters, setFilters] = useState<EmployerFiltersType>({
    employerId: '',
    employerName: '',
    businessType: '',
    employerStatus: '',
    registrationDateFrom: '',
    registrationDateTo: '',
    taxId: '',
    contributionStatus: '',
    numberOfEmployeesMin: '',
    numberOfEmployeesMax: '',
    lastContributionDateFrom: '',
    lastContributionDateTo: '',
    totalContributionsMin: '',
    totalContributionsMax: '',
    complianceStatus: '',
    industryCode: '',
    country: '',
    state: '',
    lastAuditDateFrom: '',
    lastAuditDateTo: '',
    contributionFrequency: '',
  });

  const [appliedFilters, setAppliedFilters] = useState<EmployerFiltersType>(filters);
  const [selectedEmployer, setSelectedEmployer] = useState<Employer | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  const filteredEmployers = useMemo(() => {
    return employerData.filter(employer => {
      // Apply all filters using appliedFilters
      if (appliedFilters.employerId && !employer.employerId.toLowerCase().includes(appliedFilters.employerId.toLowerCase())) return false;
      if (appliedFilters.employerName && !employer.employerName.toLowerCase().includes(appliedFilters.employerName.toLowerCase())) return false;
      if (appliedFilters.businessType && employer.businessType !== appliedFilters.businessType) return false;
      if (appliedFilters.employerStatus && employer.employerStatus !== appliedFilters.employerStatus) return false;
      if (appliedFilters.taxId && !employer.taxId.toLowerCase().includes(appliedFilters.taxId.toLowerCase())) return false;
      if (appliedFilters.contributionStatus && employer.contributionStatus !== appliedFilters.contributionStatus) return false;
      if (appliedFilters.complianceStatus && employer.complianceStatus !== appliedFilters.complianceStatus) return false;
      if (appliedFilters.industryCode && !employer.industryCode.toLowerCase().includes(appliedFilters.industryCode.toLowerCase())) return false;
      if (appliedFilters.country && employer.address.country !== appliedFilters.country) return false;
      if (appliedFilters.state && employer.address.state !== appliedFilters.state) return false;
      if (appliedFilters.contributionFrequency && employer.contributionFrequency !== appliedFilters.contributionFrequency) return false;
      
      // Numeric filters
      if (appliedFilters.numberOfEmployeesMin && employer.numberOfEmployees < parseInt(appliedFilters.numberOfEmployeesMin)) return false;
      if (appliedFilters.numberOfEmployeesMax && employer.numberOfEmployees > parseInt(appliedFilters.numberOfEmployeesMax)) return false;
      if (appliedFilters.totalContributionsMin && employer.totalContributions < parseFloat(appliedFilters.totalContributionsMin)) return false;
      if (appliedFilters.totalContributionsMax && employer.totalContributions > parseFloat(appliedFilters.totalContributionsMax)) return false;
      
      // Date filters
      if (appliedFilters.registrationDateFrom && new Date(employer.registrationDate) < new Date(appliedFilters.registrationDateFrom)) return false;
      if (appliedFilters.registrationDateTo && new Date(employer.registrationDate) > new Date(appliedFilters.registrationDateTo)) return false;
      if (appliedFilters.lastContributionDateFrom && new Date(employer.lastContributionDate) < new Date(appliedFilters.lastContributionDateFrom)) return false;
      if (appliedFilters.lastContributionDateTo && new Date(employer.lastContributionDate) > new Date(appliedFilters.lastContributionDateTo)) return false;
      if (appliedFilters.lastAuditDateFrom && new Date(employer.lastAuditDate) < new Date(appliedFilters.lastAuditDateFrom)) return false;
      if (appliedFilters.lastAuditDateTo && new Date(employer.lastAuditDate) > new Date(appliedFilters.lastAuditDateTo)) return false;
      
      return true;
    });
  }, [appliedFilters]);

  const applyFilters = () => {
    setAppliedFilters({ ...filters });
  };

  const clearFilters = () => {
    const emptyFilters = {
      employerId: '',
      employerName: '',
      businessType: '',
      employerStatus: '',
      registrationDateFrom: '',
      registrationDateTo: '',
      taxId: '',
      contributionStatus: '',
      numberOfEmployeesMin: '',
      numberOfEmployeesMax: '',
      lastContributionDateFrom: '',
      lastContributionDateTo: '',
      totalContributionsMin: '',
      totalContributionsMax: '',
      complianceStatus: '',
      industryCode: '',
      country: '',
      state: '',
      lastAuditDateFrom: '',
      lastAuditDateTo: '',
      contributionFrequency: '',
    };
    setFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
  };

  const handleViewDetails = (employer: Employer) => {
    setSelectedEmployer(employer);
    setDetailsDialogOpen(true);
  };

  return (
    <div className="container mx-auto p-4 lg:p-6 space-y-4 lg:space-y-6">
      {/* Simplified Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Building2 className="h-6 w-6 lg:h-8 lg:w-8 text-blue-600" />
          <h1 className="text-xl lg:text-3xl font-bold text-gray-900">Employer Management</h1>
        </div>
      </div>

      <div className="space-y-6">
        <EmployerFilters 
          filters={filters} 
          setFilters={setFilters}
          onClear={clearFilters}
          onApply={applyFilters}
        />
        
        <Card>
          <CardHeader>
            <CardTitle>
              Employers ({filteredEmployers.length} records)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EmployerTable 
              employers={filteredEmployers} 
              onViewDetails={handleViewDetails}
            />
          </CardContent>
        </Card>
      </div>

      <EmployerDetailsDialog
        employer={selectedEmployer}
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
      />
    </div>
  );
};

export default ManageEmployers;
