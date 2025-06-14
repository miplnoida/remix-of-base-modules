
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

  const filteredEmployers = useMemo(() => {
    return employerData.filter(employer => {
      // Apply all filters
      if (filters.employerId && !employer.employerId.toLowerCase().includes(filters.employerId.toLowerCase())) return false;
      if (filters.employerName && !employer.employerName.toLowerCase().includes(filters.employerName.toLowerCase())) return false;
      if (filters.businessType && employer.businessType !== filters.businessType) return false;
      if (filters.employerStatus && employer.employerStatus !== filters.employerStatus) return false;
      if (filters.taxId && !employer.taxId.toLowerCase().includes(filters.taxId.toLowerCase())) return false;
      if (filters.contributionStatus && employer.contributionStatus !== filters.contributionStatus) return false;
      if (filters.complianceStatus && employer.complianceStatus !== filters.complianceStatus) return false;
      if (filters.industryCode && !employer.industryCode.toLowerCase().includes(filters.industryCode.toLowerCase())) return false;
      if (filters.country && employer.address.country !== filters.country) return false;
      if (filters.state && employer.address.state !== filters.state) return false;
      if (filters.contributionFrequency && employer.contributionFrequency !== filters.contributionFrequency) return false;
      
      // Numeric filters
      if (filters.numberOfEmployeesMin && employer.numberOfEmployees < parseInt(filters.numberOfEmployeesMin)) return false;
      if (filters.numberOfEmployeesMax && employer.numberOfEmployees > parseInt(filters.numberOfEmployeesMax)) return false;
      if (filters.totalContributionsMin && employer.totalContributions < parseFloat(filters.totalContributionsMin)) return false;
      if (filters.totalContributionsMax && employer.totalContributions > parseFloat(filters.totalContributionsMax)) return false;
      
      // Date filters
      if (filters.registrationDateFrom && new Date(employer.registrationDate) < new Date(filters.registrationDateFrom)) return false;
      if (filters.registrationDateTo && new Date(employer.registrationDate) > new Date(filters.registrationDateTo)) return false;
      if (filters.lastContributionDateFrom && new Date(employer.lastContributionDate) < new Date(filters.lastContributionDateFrom)) return false;
      if (filters.lastContributionDateTo && new Date(employer.lastContributionDate) > new Date(filters.lastContributionDateTo)) return false;
      if (filters.lastAuditDateFrom && new Date(employer.lastAuditDate) < new Date(filters.lastAuditDateFrom)) return false;
      if (filters.lastAuditDateTo && new Date(employer.lastAuditDate) > new Date(filters.lastAuditDateTo)) return false;
      
      return true;
    });
  }, [filters]);

  const clearFilters = () => {
    setFilters({
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
