import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Building2, Mail, Phone, MapPin, Edit, Plus, Shield, Calendar } from 'lucide-react';
import { departments } from '@/data/auditData';
import { useToast } from '@/hooks/use-toast';
import { DepartmentFunction } from '@/types/audit';

// Mock function data for departments
const departmentFunctions: DepartmentFunction[] = [
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
    responsiblePerson: 'Sarah Williams'
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
    responsiblePerson: 'Michael Brown'
  }
];

export default function DepartmentView() {
  const { departmentId } = useParams<{ departmentId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isEditingDept, setIsEditingDept] = useState(false);
  const [isAddFunctionOpen, setIsAddFunctionOpen] = useState(false);
  const [isEditFunctionOpen, setIsEditFunctionOpen] = useState(false);
  const [selectedFunction, setSelectedFunction] = useState<DepartmentFunction | null>(null);

  const department = departments.find(d => d.id === departmentId);
  const functions = departmentFunctions.filter(f => f.departmentId === departmentId);

  const [functionForm, setFunctionForm] = useState({
    functionName: '',
    description: '',
    riskRating: 'Medium' as 'Low' | 'Medium' | 'High',
    likelihood: 'Medium' as 'Low' | 'Medium' | 'High',
    impact: 'Medium' as 'Low' | 'Medium' | 'High',
    controlEffectiveness: 'Effective' as 'Effective' | 'Partially Effective' | 'Ineffective',
    responsiblePerson: '',
    notes: ''
  });

  if (!department) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-muted-foreground">Department not found</p>
              <Button className="mt-4" onClick={() => navigate('/audit/departments')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Departments
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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

  const handleAddFunction = () => {
    if (!functionForm.functionName) {
      toast({
        title: "Validation Error",
        description: "Function name is required.",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Function Added",
      description: `${functionForm.functionName} has been added to ${department.name}.`
    });
    
    setIsAddFunctionOpen(false);
    setFunctionForm({
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

  const handleEditFunction = (func: DepartmentFunction) => {
    setSelectedFunction(func);
    setFunctionForm({
      functionName: func.functionName,
      description: func.description,
      riskRating: func.riskRating,
      likelihood: func.likelihood,
      impact: func.impact,
      controlEffectiveness: func.controlEffectiveness,
      responsiblePerson: func.responsiblePerson || '',
      notes: func.notes || ''
    });
    setIsEditFunctionOpen(true);
  };

  const handleUpdateFunction = () => {
    toast({
      title: "Function Updated",
      description: `${functionForm.functionName} has been updated successfully.`
    });
    setIsEditFunctionOpen(false);
    setSelectedFunction(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/audit/departments')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{department.name}</h1>
            <p className="text-muted-foreground">Department Details and Functions</p>
          </div>
        </div>
        <Button onClick={() => setIsEditingDept(true)}>
          <Edit className="w-4 h-4 mr-2" />
          Edit Department
        </Button>
      </div>

      {/* Department Details */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Department Information
            </CardTitle>
            {department.riskRating && getRiskBadge(department.riskRating)}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Email</div>
                  <div className="mt-1">{department.email}</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Location</div>
                  <div className="mt-1">{department.location}</div>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Department Head</div>
                  <div className="mt-1">{department.head}</div>
                </div>
              </div>
              {department.phone && (
                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Phone</div>
                    <div className="mt-1">{department.phone}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Functions Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Department Functions ({functions.length})
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Functions managed by this department with risk assessments
              </p>
            </div>
            <Dialog open={isAddFunctionOpen} onOpenChange={setIsAddFunctionOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Function
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New Function to {department.name}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="functionName">Function Name *</Label>
                    <Input
                      id="functionName"
                      value={functionForm.functionName}
                      onChange={(e) => setFunctionForm({ ...functionForm, functionName: e.target.value })}
                      placeholder="e.g., Claims Processing"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={functionForm.description}
                      onChange={(e) => setFunctionForm({ ...functionForm, description: e.target.value })}
                      placeholder="Describe the function"
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Likelihood</Label>
                      <Select value={functionForm.likelihood} onValueChange={(value: any) => setFunctionForm({ ...functionForm, likelihood: value })}>
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
                      <Label>Impact</Label>
                      <Select value={functionForm.impact} onValueChange={(value: any) => setFunctionForm({ ...functionForm, impact: value })}>
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

                  <div className="space-y-2">
                    <Label>Control Effectiveness</Label>
                    <Select value={functionForm.controlEffectiveness} onValueChange={(value: any) => setFunctionForm({ ...functionForm, controlEffectiveness: value })}>
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

                  <div className="space-y-2">
                    <Label>Responsible Person</Label>
                    <Input
                      value={functionForm.responsiblePerson}
                      onChange={(e) => setFunctionForm({ ...functionForm, responsiblePerson: e.target.value })}
                      placeholder="Name"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setIsAddFunctionOpen(false)}>Cancel</Button>
                    <Button onClick={handleAddFunction}>Add Function</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {functions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Function Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Risk Rating</TableHead>
                  <TableHead>Likelihood</TableHead>
                  <TableHead>Impact</TableHead>
                  <TableHead>Controls</TableHead>
                  <TableHead>Last Audit</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {functions.map((func) => (
                  <TableRow key={func.id}>
                    <TableCell className="font-medium">{func.functionName}</TableCell>
                    <TableCell className="max-w-xs truncate">{func.description}</TableCell>
                    <TableCell>{getRiskBadge(func.riskRating)}</TableCell>
                    <TableCell>{getRiskBadge(func.likelihood)}</TableCell>
                    <TableCell>{getRiskBadge(func.impact)}</TableCell>
                    <TableCell>{getControlBadge(func.controlEffectiveness)}</TableCell>
                    <TableCell className="text-sm">
                      {func.lastAuditDate ? new Date(func.lastAuditDate).toLocaleDateString() : 'Not audited'}
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" onClick={() => handleEditFunction(func)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No functions defined for this department yet. Click "Add Function" to get started.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Function Dialog */}
      <Dialog open={isEditFunctionOpen} onOpenChange={setIsEditFunctionOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Function</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editFunctionName">Function Name *</Label>
              <Input
                id="editFunctionName"
                value={functionForm.functionName}
                onChange={(e) => setFunctionForm({ ...functionForm, functionName: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="editDescription">Description</Label>
              <Textarea
                id="editDescription"
                value={functionForm.description}
                onChange={(e) => setFunctionForm({ ...functionForm, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Likelihood</Label>
                <Select value={functionForm.likelihood} onValueChange={(value: any) => setFunctionForm({ ...functionForm, likelihood: value })}>
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
                <Label>Impact</Label>
                <Select value={functionForm.impact} onValueChange={(value: any) => setFunctionForm({ ...functionForm, impact: value })}>
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

            <div className="space-y-2">
              <Label>Control Effectiveness</Label>
              <Select value={functionForm.controlEffectiveness} onValueChange={(value: any) => setFunctionForm({ ...functionForm, controlEffectiveness: value })}>
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

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsEditFunctionOpen(false)}>Cancel</Button>
              <Button onClick={handleUpdateFunction}>Update Function</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
