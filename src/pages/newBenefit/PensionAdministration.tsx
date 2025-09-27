import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Award, 
  DollarSign, 
  Calendar, 
  TrendingUp,
  Users,
  Settings,
  AlertCircle,
  CheckCircle,
  Plus,
  Edit,
  Pause,
  Play,
  Eye
} from 'lucide-react';

// Mock pension data
const mockPensions = [
  {
    id: 'PEN001',
    awardId: 'AWD001',
    beneficiarySSN: '123456789',
    beneficiaryName: 'Margaret Thompson',
    pensionType: 'AGE',
    monthlyAmount: 850.00,
    startDate: '2023-03-01',
    status: 'ACTIVE',
    lastCOLA: '2024-01-01',
    colaIncrease: 3.5,
    beneficiaries: [
      { name: 'Margaret Thompson', relationship: 'Self', percentage: 100, status: 'ACTIVE' }
    ]
  },
  {
    id: 'PEN002',
    awardId: 'AWD002',
    beneficiarySSN: '987654321',
    beneficiaryName: 'David Wilson',
    pensionType: 'INVALIDITY',
    monthlyAmount: 1200.00,
    startDate: '2023-06-15',
    status: 'ACTIVE',
    lastCOLA: '2024-01-01',
    colaIncrease: 3.5,
    beneficiaries: [
      { name: 'David Wilson', relationship: 'Self', percentage: 100, status: 'ACTIVE' }
    ]
  },
  {
    id: 'PEN003',
    awardId: 'AWD003',
    beneficiarySSN: '456789123',
    beneficiaryName: 'Sarah Martinez (Survivors)',
    pensionType: 'SURVIVORS',
    monthlyAmount: 675.00,
    startDate: '2023-09-01',
    status: 'ACTIVE',
    lastCOLA: '2024-01-01',
    colaIncrease: 3.5,
    beneficiaries: [
      { name: 'Sarah Martinez', relationship: 'Widow', percentage: 60, status: 'ACTIVE' },
      { name: 'Carlos Martinez', relationship: 'Child', percentage: 20, status: 'ACTIVE' },
      { name: 'Ana Martinez', relationship: 'Child', percentage: 20, status: 'ACTIVE' }
    ]
  }
];

const mockNewAwards = [
  {
    id: 'NEW001',
    claimId: 'CLM008',
    contributorName: 'Robert Brown',
    benefitType: 'AGE_PENSION',
    calculatedAmount: 920.00,
    effectiveDate: '2024-02-01',
    status: 'PENDING_SETUP'
  },
  {
    id: 'NEW002',
    claimId: 'CLM009',
    contributorName: 'Linda Garcia',
    benefitType: 'INVALIDITY',
    calculatedAmount: 1100.00,
    effectiveDate: '2024-02-15',
    status: 'PENDING_SETUP'
  }
];

export const PensionAdministration: React.FC = () => {
  const [selectedPension, setSelectedPension] = useState<any>(null);
  const [colaPercentage, setColaPercentage] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [suspensionReason, setSuspensionReason] = useState('');
  const [notes, setNotes] = useState('');

  const handleCreateAward = () => {
    console.log('Creating new pension award...');
  };

  const handleApplyCOLA = () => {
    console.log('Applying COLA adjustment...', { colaPercentage, effectiveDate });
  };

  const handleSuspendPension = () => {
    console.log('Suspending pension...', { suspensionReason, notes });
  };

  const handleProcessPayroll = () => {
    console.log('Processing monthly payroll...');
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'default';
      case 'SUSPENDED':
        return 'secondary';
      case 'CEASED':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getTotalMonthlyPayroll = () => {
    return mockPensions
      .filter(pension => pension.status === 'ACTIVE')
      .reduce((total, pension) => total + pension.monthlyAmount, 0);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pension Administration</h1>
          <p className="text-muted-foreground">Manage pension awards, COLA adjustments, and monthly payroll</p>
        </div>
        <div className="flex space-x-2">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Award
          </Button>
          <Button variant="outline">
            <DollarSign className="h-4 w-4 mr-2" />
            Process Payroll
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Award className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">{mockPensions.length}</p>
                <p className="text-sm text-blue-600">Active Pensions</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">
                  ${getTotalMonthlyPayroll().toLocaleString()}
                </p>
                <p className="text-sm text-green-600">Monthly Payroll</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-50 rounded-lg">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-600">3.5%</p>
                <p className="text-sm text-purple-600">Last COLA Increase</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-orange-50 rounded-lg">
                <AlertCircle className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-600">{mockNewAwards.length}</p>
                <p className="text-sm text-orange-600">Pending Awards</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="awards" className="w-full">
        <TabsList>
          <TabsTrigger value="awards">New Awards</TabsTrigger>
          <TabsTrigger value="dashboard">In-Payment Dashboard</TabsTrigger>
          <TabsTrigger value="life-events">Life Events</TabsTrigger>
          <TabsTrigger value="assistance">Non-Contributory Pension</TabsTrigger>
        </TabsList>

        <TabsContent value="awards" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pending Award Setup</CardTitle>
              <CardDescription>Set up new pension awards from approved claims</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mockNewAwards.map((award) => (
                  <div key={award.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <Award className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <h3 className="font-medium">{award.contributorName}</h3>
                          <p className="text-sm text-muted-foreground">
                            Claim: {award.claimId} • Type: {award.benefitType.replace(/_/g, ' ')}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Effective: {new Date(award.effectiveDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="text-right">
                          <p className="font-bold text-green-600">
                            ${award.calculatedAmount.toFixed(2)}
                          </p>
                          <p className="text-xs text-muted-foreground">Monthly</p>
                        </div>
                        <Button size="sm">
                          Setup Award
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Create New Award</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Approved Claim</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select approved claim" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockNewAwards.map(award => (
                        <SelectItem key={award.id} value={award.id}>
                          {award.claimId} - {award.contributorName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="monthlyAmount">Monthly Amount</Label>
                  <Input 
                    id="monthlyAmount"
                    type="number"
                    placeholder="Enter monthly amount"
                  />
                </div>
                <div>
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input 
                    id="startDate"
                    type="date"
                  />
                </div>
                <div>
                  <Label>Award Type</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select award type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AGE">Age Pension</SelectItem>
                      <SelectItem value="INVALIDITY">Invalidity Pension</SelectItem>
                      <SelectItem value="SURVIVORS">Survivors Pension</SelectItem>
                      <SelectItem value="NON_CONTRIBUTORY">Non-Contributory</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button onClick={handleCreateAward} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Create Award
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dashboard" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>In-Payment Dashboard</CardTitle>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" onClick={handleProcessPayroll}>
                    <DollarSign className="h-4 w-4 mr-2" />
                    Process Monthly Payroll
                  </Button>
                  <Button variant="outline" size="sm">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Apply COLA
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mockPensions.map((pension) => (
                  <div 
                    key={pension.id}
                    className={`p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors ${
                      selectedPension?.id === pension.id ? 'bg-muted border-primary' : ''
                    }`}
                    onClick={() => setSelectedPension(pension)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <Award className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <h3 className="font-medium">{pension.beneficiaryName}</h3>
                          <p className="text-sm text-muted-foreground">
                            {pension.pensionType} Pension • Started: {new Date(pension.startDate).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Last COLA: {new Date(pension.lastCOLA).toLocaleDateString()} (+{pension.colaIncrease}%)
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="text-right">
                          <p className="font-bold text-green-600">
                            ${pension.monthlyAmount.toFixed(2)}
                          </p>
                          <p className="text-xs text-muted-foreground">Monthly</p>
                        </div>
                        <Badge variant={getStatusBadgeVariant(pension.status)}>
                          {pension.status}
                        </Badge>
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </div>
                    </div>

                    {pension.beneficiaries.length > 1 && (
                      <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded">
                        <p className="text-xs font-medium text-blue-900 mb-1">Beneficiaries:</p>
                        <div className="grid grid-cols-2 gap-1">
                          {pension.beneficiaries.map((beneficiary, index) => (
                            <p key={index} className="text-xs text-blue-700">
                              {beneficiary.name} ({beneficiary.percentage}%)
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* COLA Adjustment */}
          <Card>
            <CardHeader>
              <CardTitle>COLA Adjustment</CardTitle>
              <CardDescription>Apply cost of living adjustments to all active pensions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="colaPercentage">COLA Percentage (%)</Label>
                  <Input 
                    id="colaPercentage"
                    type="number"
                    value={colaPercentage}
                    onChange={(e) => setColaPercentage(e.target.value)}
                    placeholder="Enter COLA percentage"
                    step="0.1"
                  />
                </div>
                <div>
                  <Label htmlFor="effectiveDate">Effective Date</Label>
                  <Input 
                    id="effectiveDate"
                    type="date"
                    value={effectiveDate}
                    onChange={(e) => setEffectiveDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm font-medium text-blue-900 mb-2">Impact Summary:</p>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-blue-700">Affected Pensions: {mockPensions.filter(p => p.status === 'ACTIVE').length}</p>
                  </div>
                  <div>
                    <p className="text-blue-700">Current Monthly Total: ${getTotalMonthlyPayroll().toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-blue-700">
                      New Monthly Total: ${(getTotalMonthlyPayroll() * (1 + (parseFloat(colaPercentage) || 0) / 100)).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              <Button onClick={handleApplyCOLA} disabled={!colaPercentage || !effectiveDate}>
                <TrendingUp className="h-4 w-4 mr-2" />
                Apply COLA to All Pensions
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="life-events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Life Events Management</CardTitle>
              <CardDescription>Handle suspension, cessation, and survivor reallocations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Select Pension</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select pension for life event" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockPensions.map(pension => (
                      <SelectItem key={pension.id} value={pension.id}>
                        {pension.beneficiaryName} - {pension.pensionType}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Life Event Type</Label>
                <Select value={suspensionReason} onValueChange={setSuspensionReason}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select life event type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TEMPORARY_SUSPENSION">Temporary Suspension</SelectItem>
                    <SelectItem value="DEATH">Death of Beneficiary</SelectItem>
                    <SelectItem value="EMPLOYMENT">Return to Employment</SelectItem>
                    <SelectItem value="RELOCATION">Relocation Outside Territory</SelectItem>
                    <SelectItem value="FRAUD">Fraud Investigation</SelectItem>
                    <SelectItem value="CHILD_AGE_OUT">Child Reaching Age Limit</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="notes">Notes/Reason</Label>
                <Textarea 
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Provide details about the life event..."
                  rows={3}
                />
              </div>

              <div className="flex space-x-2">
                <Button onClick={handleSuspendPension} variant="secondary">
                  <Pause className="h-4 w-4 mr-2" />
                  Suspend Pension
                </Button>
                <Button variant="destructive">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Cease Pension
                </Button>
                <Button variant="outline">
                  <Users className="h-4 w-4 mr-2" />
                  Reallocate Survivors
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assistance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Non-Contributory Pension Administration</CardTitle>
              <CardDescription>Manage assistance pensions and review workflows</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Annual Income Review - Mary Johnson</p>
                      <p className="text-sm text-muted-foreground">Due: March 15, 2024</p>
                    </div>
                  </div>
                  <Button size="sm">
                    Schedule Review
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <AlertCircle className="h-5 w-5 text-orange-500" />
                    <div>
                      <p className="font-medium">Eligibility Review - James Brown</p>
                      <p className="text-sm text-muted-foreground">Status changed - requires review</p>
                    </div>
                  </div>
                  <Button size="sm" variant="secondary">
                    Review Required
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="font-medium">New Application - Patricia Wilson</p>
                      <p className="text-sm text-muted-foreground">Ready for approval</p>
                    </div>
                  </div>
                  <Button size="sm">
                    Approve
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};