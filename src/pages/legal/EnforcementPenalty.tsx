import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, DollarSign, Gavel, Download, Plus, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { LgDataGrid, LgStatusBadge, buildLgRowActions, type LgColumnDef } from "@/components/legal/grid";

const EnforcementPenalty = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    enforcementId: `ENF-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
    caseId: '',
    enforcementAction: '',
    effectiveDate: new Date().toISOString().split('T')[0],
    amount: '',
    financeTransactionId: ''
  });

  const enforcementActions = [
    'Wage Garnishment',
    'Bank Account Levy',
    'Asset Seizure',
    'License Suspension',
    'License Revocation',
    'Business Closure Order',
    'Penalty Fee Assessment',
    'Court Judgment',
    'Settlement Agreement'
  ];

  const mockCases = [
    { id: 'LC-2024-089', party: 'ABC Manufacturing Ltd', type: 'Non-Compliance', penaltyAmount: 15000 },
    { id: 'LC-2024-088', party: 'John Smith', type: 'Benefit Dispute', penaltyAmount: 0 },
    { id: 'LC-2024-087', party: 'XYZ Services Corp', type: 'License Violation', penaltyAmount: 8500 }
  ];

  const mockEnforcements = [
    {
      id: 'ENF-2024-001',
      caseId: 'LC-2024-089',
      party: 'ABC Manufacturing Ltd',
      action: 'Penalty Fee Assessment',
      amount: 15000,
      effectiveDate: '2024-01-20',
      status: 'Active',
      collectionStatus: 'Outstanding',
      financeTransactionId: 'FT-2024-001',
      paymentReceived: 0,
      lastPaymentDate: null
    },
    {
      id: 'ENF-2024-002',
      caseId: 'LC-2024-087',
      party: 'XYZ Services Corp',
      action: 'License Suspension',
      amount: 8500,
      effectiveDate: '2024-01-18',
      status: 'Active',
      collectionStatus: 'Partial',
      financeTransactionId: 'FT-2024-002',
      paymentReceived: 3000,
      lastPaymentDate: '2024-01-25'
    },
    {
      id: 'ENF-2024-003',
      caseId: 'LC-2023-145',
      party: 'Old Case Corp',
      action: 'Wage Garnishment',
      amount: 12000,
      effectiveDate: '2023-12-15',
      status: 'Completed',
      collectionStatus: 'Paid',
      financeTransactionId: 'FT-2023-089',
      paymentReceived: 12000,
      lastPaymentDate: '2024-01-10'
    }
  ];

  const collectionStats = {
    totalOutstanding: 195000,
    collectedThisMonth: 45000,
    collectedThisYear: 567000,
    collectionRate: 78,
    averageCollectionTime: 45,
    activeEnforcements: 23
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCreateEnforcement = () => {
    if (!formData.caseId || !formData.enforcementAction) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Enforcement Created",
      description: `Enforcement action ${formData.enforcementId} has been created successfully.`,
    });

    // Reset form
    setFormData({
      enforcementId: `ENF-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
      caseId: '',
      enforcementAction: '',
      effectiveDate: new Date().toISOString().split('T')[0],
      amount: '',
      financeTransactionId: ''
    });
  };

  const columns: LgColumnDef<any>[] = useMemo(() => [
    { accessorKey: "id", header: "Enforcement ID", meta: { label: "Enforcement ID", pinLeft: true } },
    { accessorKey: "caseId", header: "Case ID", meta: { label: "Case ID" } },
    { accessorKey: "party", header: "Party", meta: { label: "Party" } },
    { accessorKey: "action", header: "Action", meta: { label: "Action" } },
    { 
      accessorKey: "amount", 
      header: "Amount", 
      meta: { label: "Amount", align: "right" },
      cell: ({ getValue }) => `$${Number(getValue()).toLocaleString()}`
    },
    { accessorKey: "effectiveDate", header: "Effective Date", meta: { label: "Effective Date" } },
    { 
      accessorKey: "status", 
      header: "Status", 
      meta: { label: "Status" },
      cell: ({ getValue }) => <LgStatusBadge status={getValue() as string} />
    },
    { 
      accessorKey: "collectionStatus", 
      header: "Collection", 
      meta: { label: "Collection" },
      cell: ({ getValue }) => <LgStatusBadge status={getValue() as string} />
    },
  ], []);

  const collectionColumns: LgColumnDef<any>[] = useMemo(() => [
    { accessorKey: "id", header: "Enforcement ID", meta: { label: "Enforcement ID", pinLeft: true } },
    { accessorKey: "party", header: "Party", meta: { label: "Party" } },
    { 
      accessorKey: "amount", 
      header: "Total Amount", 
      meta: { label: "Total Amount", align: "right" },
      cell: ({ getValue }) => `$${Number(getValue()).toLocaleString()}`
    },
    { 
      accessorKey: "paymentReceived", 
      header: "Paid", 
      meta: { label: "Paid", align: "right" },
      cell: ({ getValue }) => `$${Number(getValue()).toLocaleString()}`
    },
    { 
      id: "outstanding",
      header: "Outstanding", 
      meta: { label: "Outstanding", align: "right" },
      cell: ({ row }) => `$${(row.original.amount - row.original.paymentReceived).toLocaleString()}`
    },
    { 
      accessorKey: "collectionStatus", 
      header: "Status", 
      meta: { label: "Status" },
      cell: ({ getValue }) => <LgStatusBadge status={getValue() as string} />
    },
    { accessorKey: "lastPaymentDate", header: "Last Payment", meta: { label: "Last Payment" }, cell: ({ getValue }) => getValue() || '—' },
  ], []);

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/legal')}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Legal Module
              </Button>
              <div className="h-6 w-px bg-border" />
              <nav className="flex items-center space-x-2 text-sm text-muted-foreground">
                <span>Legal Module</span>
                <span>/</span>
                <span className="text-foreground font-medium">Enforcement & Penalty</span>
              </nav>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </Button>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                New Enforcement
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Enforcement & Penalty Management</h1>
          <p className="text-muted-foreground">Track enforcement actions, penalties, and payment collection</p>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="create">Create Enforcement</TabsTrigger>
            <TabsTrigger value="tracking">Tracking</TabsTrigger>
            <TabsTrigger value="collection">Collection</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Collection Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
                  <DollarSign className="h-4 w-4 text-destructive" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-destructive">
                    ${collectionStats.totalOutstanding.toLocaleString()}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Collected This Month</CardTitle>
                  <DollarSign className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">
                    ${collectionStats.collectedThisMonth.toLocaleString()}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Collection Rate</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-accent" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">
                    {collectionStats.collectionRate}%
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Enforcement Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Enforcement Actions</CardTitle>
                <CardDescription>Latest enforcement activities and their status</CardDescription>
              </CardHeader>
              <CardContent>
                <LgDataGrid
                  id="lg.enforcement.recent"
                  columns={columns}
                  data={mockEnforcements.slice(0, 5)}
                  rowActions={buildLgRowActions({
                    onView: (r) => toast({ title: "View", description: `Viewing ${r.id}` }),
                  })}
                  exportFilename="recent-enforcements"
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="create" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Create Enforcement Action</CardTitle>
                <CardDescription>Initiate new enforcement or penalty action</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Enforcement ID and Date */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="enforcementId">Enforcement ID</Label>
                    <Input
                      id="enforcementId"
                      value={formData.enforcementId}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="effectiveDate">Effective Date</Label>
                    <Input
                      id="effectiveDate"
                      type="date"
                      value={formData.effectiveDate}
                      onChange={(e) => handleInputChange('effectiveDate', e.target.value)}
                    />
                  </div>
                </div>

                {/* Case Selection */}
                <div className="space-y-2">
                  <Label htmlFor="caseId">Linked Case ID *</Label>
                  <Select value={formData.caseId} onValueChange={(value) => handleInputChange('caseId', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select case for enforcement" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockCases.map((case_) => (
                        <SelectItem key={case_.id} value={case_.id}>
                          {case_.id} - {case_.party} ({case_.type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Enforcement Action */}
                <div className="space-y-2">
                  <Label htmlFor="enforcementAction">Enforcement Action *</Label>
                  <Select value={formData.enforcementAction} onValueChange={(value) => handleInputChange('enforcementAction', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select enforcement action" />
                    </SelectTrigger>
                    <SelectContent>
                      {enforcementActions.map((action) => (
                        <SelectItem key={action} value={action}>{action}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Amount */}
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (if applicable)</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="Enter penalty or fee amount"
                    value={formData.amount}
                    onChange={(e) => handleInputChange('amount', e.target.value)}
                  />
                </div>

                {/* Finance Transaction ID */}
                <div className="space-y-2">
                  <Label htmlFor="financeTransactionId">Finance Transaction ID</Label>
                  <Input
                    id="financeTransactionId"
                    placeholder="Auto-generated upon creation"
                    value={formData.financeTransactionId}
                    disabled
                    className="bg-muted"
                  />
                </div>

                <div className="pt-4 border-t">
                  <Button onClick={handleCreateEnforcement}>
                    <Gavel className="h-4 w-4 mr-2" />
                    Create Enforcement Action
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tracking" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Enforcement Tracking</CardTitle>
                <CardDescription>Monitor all enforcement actions and their progress</CardDescription>
              </CardHeader>
              <CardContent>
                <LgDataGrid
                  id="lg.enforcement.tracking"
                  columns={columns}
                  data={mockEnforcements}
                  rowActions={buildLgRowActions({
                    onView: (r) => toast({ title: "View", description: `Viewing ${r.id}` }),
                  })}
                  exportFilename="enforcement-tracking"
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="collection" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Payment Collection Status</CardTitle>
                <CardDescription>Track payment collections and outstanding amounts</CardDescription>
              </CardHeader>
              <CardContent>
                <LgDataGrid
                  id="lg.enforcement.collection"
                  columns={collectionColumns}
                  data={mockEnforcements}
                  rowActions={buildLgRowActions({
                    onView: (r) => toast({ title: "View", description: `Viewing ${r.id}` }),
                  })}
                  exportFilename="payment-collection-status"
                  summary={[
                    { label: "Total Outstanding", value: `$${collectionStats.totalOutstanding.toLocaleString()}`, tone: "danger" },
                    { label: "Collected This Month", value: `$${collectionStats.collectedThisMonth.toLocaleString()}`, tone: "info" },
                  ]}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default EnforcementPenalty;
