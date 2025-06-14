
import React, { useState, useMemo } from 'react';
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmployerFilters } from '@/components/employer/EmployerFilters';
import { EmployerTable } from '@/components/employer/EmployerTable';
import { employerData } from '@/data/employerData';

export interface Employer {
  employerId: string;
  employerName: string;
  businessType: string;
  registrationNumber: string;
  employerType: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  contactInfo: {
    phone: string;
    email: string;
  };
  employerStatus: string;
  taxId: string;
  industryCode: string;
  registrationDate: string;
  numberOfEmployees: number;
  contributionType: string;
  contributionStatus: string;
  lastContributionDate: string;
  totalContributions: number;
  contributionFrequency: string;
  authorizedRepresentative: string;
  totalPayroll: number;
  complianceStatus: string;
  lastAuditDate: string;
}

export interface EmployerFilters {
  employerId: string;
  employerName: string;
  businessType: string;
  employerStatus: string;
  registrationDateFrom: string;
  registrationDateTo: string;
  taxId: string;
  contributionStatus: string;
  numberOfEmployeesMin: string;
  numberOfEmployeesMax: string;
  lastContributionDateFrom: string;
  lastContributionDateTo: string;
  totalContributionsMin: string;
  totalContributionsMax: string;
  complianceStatus: string;
  industryCode: string;
  country: string;
  state: string;
  lastAuditDateFrom: string;
  lastAuditDateTo: string;
  contributionFrequency: string;
}

const EmployerDirectory = () => {
  const [filters, setFilters] = useState<EmployerFilters>({
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

  const [appliedFilters, setAppliedFilters] = useState<EmployerFilters>(filters);

  const filteredEmployers = useMemo(() => {
    return employerData.filter(employer => {
      // Apply all filters using appliedFilters instead of filters
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

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gray-50">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <main className="flex-1 p-6">
            <div className="max-w-7xl mx-auto">
              <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900">Employer Directory</h1>
                <p className="text-gray-600 mt-2">Search and manage employer records</p>
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
                    <EmployerTable employers={filteredEmployers} />
                  </CardContent>
                </Card>
              </div>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default EmployerDirectory;
