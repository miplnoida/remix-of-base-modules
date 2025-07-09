
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Home, Search, Shield, CheckCircle, AlertCircle, Clock, Info } from 'lucide-react';

const BenefitEligibility = () => {
  const navigate = useNavigate();
  const [searchSSN, setSearchSSN] = useState('');
  const [selectedPerson, setSelectedPerson] = useState<any>(null);

  // Mock person data with eligibility information
  const personData = {
    ssn: '123456',
    name: 'John Doe',
    dateOfBirth: '1985-03-15',
    registrationDate: '2020-01-15',
    totalContributions: 245,
    totalWages: 125000.00,
    activeEmployer: 'ABC Company Ltd',
    lastContribution: '2024-06-30'
  };

  // Mock benefit eligibility data
  const benefitEligibility = [
    {
      benefitType: 'Sickness Benefit',
      eligible: true,
      requirementsMet: 4,
      totalRequirements: 4,
      requirements: [
        { description: 'Minimum 26 weeks of contributions', met: true, details: '245 weeks contributed' },
        { description: 'Medical certificate provided', met: true, details: 'Certificate on file' },
        { description: 'Active contributor status', met: true, details: 'Last contribution: June 2024' },
        { description: 'Waiting period completed', met: true, details: '3 days completed' }
      ],
      maxBenefit: 2500.00,
      duration: '26 weeks maximum',
      rate: '60% of average wages'
    },
    {
      benefitType: 'Maternity Benefit',
      eligible: true,
      requirementsMet: 3,
      totalRequirements: 3,
      requirements: [
        { description: 'Minimum 20 weeks of contributions', met: true, details: '245 weeks contributed' },
        { description: 'Female contributor', met: true, details: 'Gender verified' },
        { description: 'Medical certification', met: true, details: 'Can be provided when needed' }
      ],
      maxBenefit: 5000.00,
      duration: '13 weeks',
      rate: '60% of average wages'
    },
    {
      benefitType: 'Unemployment Benefit',
      eligible: false,
      requirementsMet: 2,
      totalRequirements: 4,
      requirements: [
        { description: 'Minimum 50 weeks of contributions', met: true, details: '245 weeks contributed' },
        { description: 'Involuntary termination', met: false, details: 'Currently employed' },
        { description: 'Available for work', met: true, details: 'No restrictions' },
        { description: 'Registration with employment service', met: false, details: 'Not registered' }
      ],
      maxBenefit: 8000.00,
      duration: '26 weeks maximum',
      rate: '60% of average wages'
    },
    {
      benefitType: 'Work Injury Benefit',
      eligible: true,
      requirementsMet: 2,
      totalRequirements: 2,
      requirements: [
        { description: 'Work-related injury occurred', met: false, details: 'No current work injury' },
        { description: 'Medical certification of injury', met: false, details: 'N/A - No injury reported' }
      ],
      maxBenefit: 15000.00,
      duration: 'Until recovery',
      rate: '75% of wages',
      note: 'Eligible if work injury occurs'
    },
    {
      benefitType: 'Death Benefit',
      eligible: true,
      requirementsMet: 2,
      totalRequirements: 2,
      requirements: [
        { description: 'Minimum 26 weeks of contributions', met: true, details: '245 weeks contributed' },
        { description: 'Designated beneficiary', met: true, details: 'Jane Doe designated' }
      ],
      maxBenefit: 20000.00,
      duration: 'One-time payment',
      rate: 'Fixed amount'
    },
    {
      benefitType: 'Educational Benefit',
      eligible: false,
      requirementsMet: 1,
      totalRequirements: 3,
      requirements: [
        { description: 'Minimum 156 weeks of contributions', met: true, details: '245 weeks contributed' },
        { description: 'Child enrolled in approved institution', met: false, details: 'No eligible children' },
        { description: 'Child age requirements met', met: false, details: 'No children of eligible age' }
      ],
      maxBenefit: 3000.00,
      duration: 'Per academic year',
      rate: 'Fixed amount per child'
    }
  ];

  const handleSearch = () => {
    if (searchSSN) {
      setSelectedPerson(personData);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'XCD'
    }).format(amount);
  };

  const getEligibilityBadge = (eligible: boolean, requirementsMet: number, totalRequirements: number) => {
    if (eligible && requirementsMet === totalRequirements) {
      return <Badge variant="default" className="bg-green-100 text-green-800 flex items-center gap-1">
        <CheckCircle className="h-3 w-3" />
        Eligible
      </Badge>;
    } else if (eligible && requirementsMet < totalRequirements) {
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 flex items-center gap-1">
        <Clock className="h-3 w-3" />
        Conditionally Eligible
      </Badge>;
    } else {
      return <Badge variant="secondary" className="bg-red-100 text-red-800 flex items-center gap-1">
        <AlertCircle className="h-3 w-3" />
        Not Eligible
      </Badge>;
    }
  };

  const getRequirementIcon = (met: boolean) => {
    return met ? 
      <CheckCircle className="h-4 w-4 text-green-600" /> : 
      <AlertCircle className="h-4 w-4 text-red-600" />;
  };

  return (
    <div className="container mx-auto p-4 lg:p-6 space-y-4 lg:space-y-6">
      {/* Navigation Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={() => navigate('/person/management')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back to IP Management</span>
            <span className="sm:hidden">Back</span>
          </Button>
          <div className="h-6 w-px bg-gray-300" />
          <Shield className="h-6 w-6 lg:h-8 lg:w-8 text-purple-600" />
          <div>
            <h1 className="text-xl lg:text-3xl font-bold text-gray-900">Benefit Eligibility</h1>
            <p className="text-sm lg:text-base text-gray-600 hidden sm:block">Check benefit eligibility and requirements</p>
          </div>
        </div>
        <Button 
          variant="ghost" 
          onClick={() => navigate('/')}
          className="flex items-center gap-2 self-start lg:self-center"
        >
          <Home className="h-4 w-4" />
          <span className="hidden sm:inline">Main Menu</span>
        </Button>
      </div>

      {/* Search Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base lg:text-lg">Check Eligibility</CardTitle>
          <CardDescription>Enter SSN to check benefit eligibility status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Enter SSN (e.g., 123456)"
                value={searchSSN}
                onChange={(e) => setSearchSSN(e.target.value)}
              />
            </div>
            <Button onClick={handleSearch} className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Check Eligibility
            </Button>
          </div>
        </CardContent>
      </Card>

      {selectedPerson && (
        <>
          {/* Person Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base lg:text-lg">Contributor Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">Name</p>
                  <p className="font-semibold">{selectedPerson.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">SSN</p>
                  <p className="font-semibold">{selectedPerson.ssn}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Contributions</p>
                  <p className="font-semibold">{selectedPerson.totalContributions} weeks</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Last Contribution</p>
                  <p className="font-semibold">{selectedPerson.lastContribution}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Eligibility Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Eligible Benefits</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-xl lg:text-2xl font-bold">
                  {benefitEligibility.filter(b => b.eligible && b.requirementsMet === b.totalRequirements).length}
                </div>
                <p className="text-xs text-muted-foreground">Fully eligible</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Conditional</CardTitle>
                <Clock className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-xl lg:text-2xl font-bold">
                  {benefitEligibility.filter(b => b.eligible && b.requirementsMet < b.totalRequirements).length}
                </div>
                <p className="text-xs text-muted-foreground">Requirements pending</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Not Eligible</CardTitle>
                <AlertCircle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-xl lg:text-2xl font-bold">
                  {benefitEligibility.filter(b => !b.eligible).length}
                </div>
                <p className="text-xs text-muted-foreground">Requirements not met</p>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Eligibility */}
          <div className="space-y-6">
            {benefitEligibility.map((benefit, index) => (
              <Card key={index}>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <CardTitle className="text-base lg:text-lg">{benefit.benefitType}</CardTitle>
                      <CardDescription>
                        Max Benefit: {formatCurrency(benefit.maxBenefit)} | Duration: {benefit.duration} | Rate: {benefit.rate}
                      </CardDescription>
                    </div>
                    {getEligibilityBadge(benefit.eligible, benefit.requirementsMet, benefit.totalRequirements)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Requirements Met</span>
                      <span className="text-sm text-gray-600">
                        {benefit.requirementsMet}/{benefit.totalRequirements}
                      </span>
                    </div>
                    <Progress 
                      value={(benefit.requirementsMet / benefit.totalRequirements) * 100} 
                      className="h-2"
                    />
                    
                    <div className="space-y-3">
                      {benefit.requirements.map((req, reqIndex) => (
                        <div key={reqIndex} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                          {getRequirementIcon(req.met)}
                          <div className="flex-1">
                            <p className="text-sm font-medium">{req.description}</p>
                            <p className="text-xs text-gray-600">{req.details}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {benefit.note && (
                      <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
                        <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                        <p className="text-sm text-blue-800">{benefit.note}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {!selectedPerson && (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-gray-500">
              <Shield className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p>Enter an SSN above to check benefit eligibility</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BenefitEligibility;
