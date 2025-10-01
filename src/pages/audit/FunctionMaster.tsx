import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Edit, Eye, Shield, Target } from 'lucide-react';
import { departments } from '@/data/auditData';
import { useToast } from '@/hooks/use-toast';
import { DepartmentFunction } from '@/types/audit';

// Mock function data
const mockFunctions: DepartmentFunction[] = [
  {
    id: 'func-001',
    departmentId: 'dept-benefits',
    functionName: 'Claims Processing',
    description: 'Processing and adjudication of benefit claims',
    riskRating: 'High',
    likelihood: 'High',
    impact: 'High',
    controlEffectiveness: 'Effective',
    lastAuditDate: '2024-06-15',
    nextAuditDate: '2025-10-01',
    responsiblePerson: 'Sarah Williams',
    notes: 'High volume processing with significant financial impact'
  },
  {
    id: 'func-002',
    departmentId: 'dept-benefits',
    functionName: 'Eligibility Verification',
    description: 'Verification of claimant eligibility for benefits',
    riskRating: 'High',
    likelihood: 'Medium',
    impact: 'High',
    controlEffectiveness: 'Partially Effective',
    lastAuditDate: '2024-06-15',
    nextAuditDate: '2025-10-01',
    responsiblePerson: 'Sarah Williams'
  },
  {
    id: 'func-003',
    departmentId: 'dept-contributions',
    functionName: 'Contribution Collection',
    description: 'Collection and recording of employer contributions',
    riskRating: 'High',
    likelihood: 'Medium',
    impact: 'High',
    controlEffectiveness: 'Effective',
    lastAuditDate: '2024-08-20',
    nextAuditDate: '2025-11-15',
    responsiblePerson: 'Michael Brown'
  },
  {
    id: 'func-004',
    departmentId: 'dept-contributions',
    functionName: 'C3 Form Processing',
    description: 'Processing and validation of monthly C3 contribution forms',
    riskRating: 'High',
    likelihood: 'High',
    impact: 'Medium',
    controlEffectiveness: 'Effective',
    responsiblePerson: 'Michael Brown'
  },
  {
    id: 'func-005',
    departmentId: 'dept-finance',
    functionName: 'Accounts Payable',
    description: 'Processing vendor payments and expense reimbursements',
    riskRating: 'Medium',
    likelihood: 'Medium',
    impact: 'Medium',
    controlEffectiveness: 'Effective',
    lastAuditDate: '2024-09-01',
    nextAuditDate: '2025-12-01',
    responsiblePerson: 'Jennifer Davis'
  },
  {
    id: 'func-006',
    departmentId: 'dept-it',
    functionName: 'System Access Management',
    description: 'User access provisioning and deprovisioning',
    riskRating: 'High',
    likelihood: 'Low',
    impact: 'High',
    controlEffectiveness: 'Effective',
    responsiblePerson: 'Robert Johnson'
  }
];

export default function FunctionMaster() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    departmentId: '',
    functionName: '',
    description: '',
    riskRating: 'Medium' as 'Low' | 'Medium' | 'High',
    likelihood: 'Medium' as 'Low' | 'Medium' | 'High',
    impact: 'Medium' as 'Low' | 'Medium' | 'High',
    controlEffectiveness: 'Effective' as 'Effective' | 'Partially Effective' | 'Ineffective',
    responsiblePerson: '',
    notes: ''
  });

  const filteredFunctions = mockFunctions.filter(func => {
    const matchesSearch = func.functionName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          func.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = selectedDepartment === 'all' || func.departmentId === selectedDepartment;
    return matchesSearch && matchesDept;
  });

  const getRiskBadge = (risk: string) => {
    const colors = {
      'High': 'bg-red-500',
      'Medium': 'bg-orange-600',
      'Low': 'bg-green-500'
    };
    return <Badge className={colors[risk as keyof typeof colors]}>{risk}</Badge>;
  };

  const getControlBadge = (effectiveness: string) => {
    const colors = {
      'Effective': 'bg-green-500',
      'Partially Effective': 'bg-orange-600',
      'Ineffective': 'bg-red-500'
    };
    return <Badge className={colors[effectiveness as keyof typeof colors]}>{effectiveness}</Badge>;
  };

  const calculateInherentRisk = (likelihood: string, impact: string): 'Low' | 'Medium' | 'High' => {
    const score = { 'Low': 1, 'Medium': 2, 'High': 3 };
    const total = score[likelihood as keyof typeof score] + score[impact as keyof typeof score];
    if (total >= 5) return 'High';
    if (total >= 3) return 'Medium';
    return 'Low';
  };

  const handleSubmit = () => {
    if (!formData.departmentId || !formData.functionName) {
      toast({
        title: "Validation Error",
        description: "Please fill all required fields.",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Function Added",
      description: `${formData.functionName} has been added to the function master.`
    });
    
    setIsAddDialogOpen(false);
    setFormData({
      departmentId: '',
      functionName: '',
      description: '',
      riskRating: 'Medium',
      likelihood: 'Medium',
      impact: 'Medium',
      controlEffectiveness: 'Effective',
      responsiblePerson: '',
      notes: ''
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Function Master</h1>
          <p className="text-muted-foreground">
            Manage department functions and risk matrices for audit planning
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Function
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Department Function</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="departmentId">Department *</Label>
                <Select value={formData.departmentId} onValueChange={(value) => setFormData({ ...formData, departmentId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map(dept => (
                      <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="functionName">Function Name *</Label>
                <Input
                  id="functionName"
                  value={formData.functionName}
                  onChange={(e) => setFormData({ ...formData, functionName: e.target.value })}
                  placeholder="e.g., Claims Processing"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the function's purpose and activities"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="likelihood">Likelihood</Label>
                  <Select value={formData.likelihood} onValueChange={(value: any) => setFormData({ ...formData, likelihood: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="impact">Impact</Label>
                  <Select value={formData.impact} onValueChange={(value: any) => setFormData({ ...formData, impact: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Inherent Risk (Calculated)</Label>
                  <div className="p-2 border rounded-md bg-muted">
                    {getRiskBadge(calculateInherentRisk(formData.likelihood, formData.impact))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="controlEffectiveness">Control Effectiveness</Label>
                  <Select value={formData.controlEffectiveness} onValueChange={(value: any) => setFormData({ ...formData, controlEffectiveness: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Effective">Effective</SelectItem>
                      <SelectItem value="Partially Effective">Partially Effective</SelectItem>
                      <SelectItem value="Ineffective">Ineffective</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="responsiblePerson">Responsible Person</Label>
                <Input
                  id="responsiblePerson"
                  value={formData.responsiblePerson}
                  onChange={(e) => setFormData({ ...formData, responsiblePerson: e.target.value })}
                  placeholder="Name of responsible person"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes or observations"
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSubmit}>Add Function</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Functions</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockFunctions.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Risk</CardTitle>
            <Shield className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {mockFunctions.filter(f => f.riskRating === 'High').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Medium Risk</CardTitle>
            <Shield className="h-4 w-4 text-orange-700" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-700">
              {mockFunctions.filter(f => f.riskRating === 'Medium').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Risk</CardTitle>
            <Shield className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {mockFunctions.filter(f => f.riskRating === 'Low').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search functions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map(dept => (
                  <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Functions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Department Functions ({filteredFunctions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Function Name</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Risk Rating</TableHead>
                <TableHead>Likelihood</TableHead>
                <TableHead>Impact</TableHead>
                <TableHead>Controls</TableHead>
                <TableHead>Responsible</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFunctions.map((func) => {
                const dept = departments.find(d => d.id === func.departmentId);
                return (
                  <TableRow key={func.id}>
                    <TableCell className="font-medium">{func.functionName}</TableCell>
                    <TableCell>{dept?.name}</TableCell>
                    <TableCell className="max-w-xs truncate">{func.description}</TableCell>
                    <TableCell>{getRiskBadge(func.riskRating)}</TableCell>
                    <TableCell>{getRiskBadge(func.likelihood)}</TableCell>
                    <TableCell>{getRiskBadge(func.impact)}</TableCell>
                    <TableCell>{getControlBadge(func.controlEffectiveness)}</TableCell>
                    <TableCell className="text-sm">{func.responsiblePerson}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Risk Matrix */}
      <Card>
        <CardHeader>
          <CardTitle>Risk Assessment Matrix</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Risk Rating = Likelihood × Impact (considering Control Effectiveness)
            </div>
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div className="font-semibold">Impact →</div>
              <div className="text-center font-semibold">Low</div>
              <div className="text-center font-semibold">Medium</div>
              <div className="text-center font-semibold">High</div>
              
              <div className="font-semibold">High ↓</div>
              <div className="p-2 bg-orange-100 dark:bg-orange-950 text-center rounded">Medium</div>
              <div className="p-2 bg-red-100 dark:bg-red-950 text-center rounded">High</div>
              <div className="p-2 bg-red-100 dark:bg-red-950 text-center rounded">High</div>
              
              <div className="font-semibold">Medium ↓</div>
              <div className="p-2 bg-green-100 dark:bg-green-950 text-center rounded">Low</div>
              <div className="p-2 bg-orange-100 dark:bg-orange-950 text-center rounded">Medium</div>
              <div className="p-2 bg-red-100 dark:bg-red-950 text-center rounded">High</div>
              
              <div className="font-semibold">Low ↓</div>
              <div className="p-2 bg-green-100 dark:bg-green-950 text-center rounded">Low</div>
              <div className="p-2 bg-green-100 dark:bg-green-950 text-center rounded">Low</div>
              <div className="p-2 bg-orange-100 dark:bg-orange-950 text-center rounded">Medium</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
