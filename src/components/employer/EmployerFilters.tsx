
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { EmployerFilters as EmployerFiltersType } from '@/pages/EmployerDirectory';

interface EmployerFiltersProps {
  filters: EmployerFiltersType;
  setFilters: React.Dispatch<React.SetStateAction<EmployerFiltersType>>;
  onClear: () => void;
  onApply: () => void;
}

export const EmployerFilters: React.FC<EmployerFiltersProps> = ({ filters, setFilters, onClear, onApply }) => {
  const updateFilter = (key: keyof EmployerFiltersType, value: string) => {
    // Convert "all" back to empty string for filtering logic
    const filterValue = value === "all" ? "" : value;
    setFilters(prev => ({ ...prev, [key]: filterValue }));
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Search & Filter</CardTitle>
          <div className="flex gap-2">
            <Button variant="default" onClick={onApply}>
              Apply Filters
            </Button>
            <Button variant="outline" onClick={onClear}>
              Clear Filters
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Basic Information Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="employerId">Employer ID</Label>
            <Input
              id="employerId"
              value={filters.employerId}
              onChange={(e) => updateFilter('employerId', e.target.value)}
              placeholder="Search by ID"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="employerName">Employer Name</Label>
            <Input
              id="employerName"
              value={filters.employerName}
              onChange={(e) => updateFilter('employerName', e.target.value)}
              placeholder="Search by name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="businessType">Business Type</Label>
            <Select value={filters.businessType || "all"} onValueChange={(value) => updateFilter('businessType', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Public">Public</SelectItem>
                <SelectItem value="Private">Private</SelectItem>
                <SelectItem value="Non-profit">Non-profit</SelectItem>
                <SelectItem value="Government">Government</SelectItem>
                <SelectItem value="Small Business">Small Business</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Status and ID Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="employerStatus">Status</Label>
            <Select value={filters.employerStatus || "all"} onValueChange={(value) => updateFilter('employerStatus', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
                <SelectItem value="Suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="taxId">Tax ID</Label>
            <Input
              id="taxId"
              value={filters.taxId}
              onChange={(e) => updateFilter('taxId', e.target.value)}
              placeholder="Search by Tax ID"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contributionStatus">Contribution Status</Label>
            <Select value={filters.contributionStatus || "all"} onValueChange={(value) => updateFilter('contributionStatus', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Paid">Paid</SelectItem>
                <SelectItem value="Overdue">Overdue</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Compliance and Industry Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="complianceStatus">Compliance Status</Label>
            <Select value={filters.complianceStatus || "all"} onValueChange={(value) => updateFilter('complianceStatus', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Compliant">Compliant</SelectItem>
                <SelectItem value="Non-Compliant">Non-Compliant</SelectItem>
                <SelectItem value="Under Audit">Under Audit</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="industryCode">Industry Code</Label>
            <Input
              id="industryCode"
              value={filters.industryCode}
              onChange={(e) => updateFilter('industryCode', e.target.value)}
              placeholder="NAICS/SIC Code"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contributionFrequency">Contribution Frequency</Label>
            <Select value={filters.contributionFrequency || "all"} onValueChange={(value) => updateFilter('contributionFrequency', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Frequencies</SelectItem>
                <SelectItem value="Monthly">Monthly</SelectItem>
                <SelectItem value="Quarterly">Quarterly</SelectItem>
                <SelectItem value="Annually">Annually</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Location Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="country">Country</Label>
            <Select value={filters.country || "all"} onValueChange={(value) => updateFilter('country', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Countries</SelectItem>
                <SelectItem value="USA">USA</SelectItem>
                <SelectItem value="Canada">Canada</SelectItem>
                <SelectItem value="UK">UK</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="state">State</Label>
            <Input
              id="state"
              value={filters.state}
              onChange={(e) => updateFilter('state', e.target.value)}
              placeholder="State/Province"
            />
          </div>
        </div>

        {/* Numeric Range Filters Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Number of Employees</Label>
            <div className="flex gap-2">
              <Input
                value={filters.numberOfEmployeesMin}
                onChange={(e) => updateFilter('numberOfEmployeesMin', e.target.value)}
                placeholder="Min"
                type="number"
              />
              <Input
                value={filters.numberOfEmployeesMax}
                onChange={(e) => updateFilter('numberOfEmployeesMax', e.target.value)}
                placeholder="Max"
                type="number"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Total Contributions</Label>
            <div className="flex gap-2">
              <Input
                value={filters.totalContributionsMin}
                onChange={(e) => updateFilter('totalContributionsMin', e.target.value)}
                placeholder="Min"
                type="number"
              />
              <Input
                value={filters.totalContributionsMax}
                onChange={(e) => updateFilter('totalContributionsMax', e.target.value)}
                placeholder="Max"
                type="number"
              />
            </div>
          </div>
        </div>

        {/* Date Range Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Registration Date</Label>
            <div className="flex gap-2">
              <Input
                value={filters.registrationDateFrom}
                onChange={(e) => updateFilter('registrationDateFrom', e.target.value)}
                type="date"
                placeholder="From"
              />
              <Input
                value={filters.registrationDateTo}
                onChange={(e) => updateFilter('registrationDateTo', e.target.value)}
                type="date"
                placeholder="To"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Last Contribution Date</Label>
            <div className="flex gap-2">
              <Input
                value={filters.lastContributionDateFrom}
                onChange={(e) => updateFilter('lastContributionDateFrom', e.target.value)}
                type="date"
                placeholder="From"
              />
              <Input
                value={filters.lastContributionDateTo}
                onChange={(e) => updateFilter('lastContributionDateTo', e.target.value)}
                type="date"
                placeholder="To"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Last Audit Date</Label>
            <div className="flex gap-2">
              <Input
                value={filters.lastAuditDateFrom}
                onChange={(e) => updateFilter('lastAuditDateFrom', e.target.value)}
                type="date"
                placeholder="From"
              />
              <Input
                value={filters.lastAuditDateTo}
                onChange={(e) => updateFilter('lastAuditDateTo', e.target.value)}
                type="date"
                placeholder="To"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
