import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Building2, Mail, Phone, MapPin, Edit, Plus, Shield, Trash2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useIADepartments, useIADepartmentFunctions, useIADepartmentFunctionMutations } from '@/hooks/useAuditData';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { useProfiles } from '@/components/c3/ReceivedBySelect';

export default function DepartmentView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile } = useSupabaseAuth();
  const userCode = (profile as any)?.user_code || 'system';

  const [isAddFunctionOpen, setIsAddFunctionOpen] = useState(false);
  const [isEditFunctionOpen, setIsEditFunctionOpen] = useState(false);
  const [selectedFunction, setSelectedFunction] = useState<any>(null);

  const { data: departments = [], isLoading: deptLoading } = useIADepartments();
  const { data: functions = [], isLoading: funcLoading } = useIADepartmentFunctions(id);
  const { create: createFunc, update: updateFunc, remove: removeFunc } = useIADepartmentFunctionMutations();

  const department = departments.find((d: any) => d.id === id);

  const [functionForm, setFunctionForm] = useState({
    function_name: '',
    description: '',
    risk_rating: 'Medium',
    likelihood: 'Medium',
    impact: 'Medium',
    control_effectiveness: 'Effective',
    responsible_person: '',
    notes: ''
  });

  const resetForm = () => setFunctionForm({
    function_name: '', description: '', risk_rating: 'Medium', likelihood: 'Medium',
    impact: 'Medium', control_effectiveness: 'Effective', responsible_person: '', notes: ''
  });

  if (deptLoading || funcLoading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!department) {
    return (
      <div className="space-y-6">
        <Card><CardContent className="pt-6">
          <div className="text-center">
            <p className="text-muted-foreground">Department not found</p>
            <Button className="mt-4" onClick={() => navigate('/audit/departments')}><ArrowLeft className="w-4 h-4 mr-2" />Back to Departments</Button>
          </div>
        </CardContent></Card>
      </div>
    );
  }

  const getRiskBadge = (risk: string) => {
    const colors: Record<string, string> = { 'High': 'bg-red-500', 'Medium': 'bg-orange-600', 'Low': 'bg-green-500' };
    return <Badge className={colors[risk]}>{risk}</Badge>;
  };

  const getControlBadge = (effectiveness: string) => {
    const colors: Record<string, string> = { 'Effective': 'bg-green-500', 'Partially Effective': 'bg-orange-600', 'Ineffective': 'bg-red-500' };
    return <Badge className={colors[effectiveness]}>{effectiveness}</Badge>;
  };

  const handleAddFunction = () => {
    if (!functionForm.function_name) {
      toast({ title: "Validation Error", description: "Function name is required.", variant: "destructive" });
      return;
    }
    createFunc.mutate({ ...functionForm, department_id: id, created_by: userCode });
    setIsAddFunctionOpen(false);
    resetForm();
  };

  const handleEditFunction = (func: any) => {
    setSelectedFunction(func);
    setFunctionForm({
      function_name: func.function_name || '',
      description: func.description || '',
      risk_rating: func.risk_rating || 'Medium',
      likelihood: func.likelihood || 'Medium',
      impact: func.impact || 'Medium',
      control_effectiveness: func.control_effectiveness || 'Effective',
      responsible_person: func.responsible_person || '',
      notes: func.notes || ''
    });
    setIsEditFunctionOpen(true);
  };

  const handleUpdateFunction = () => {
    if (selectedFunction) {
      updateFunc.mutate({ id: selectedFunction.id, ...functionForm, updated_by: userCode });
    }
    setIsEditFunctionOpen(false);
    setSelectedFunction(null);
    resetForm();
  };

  const handleDeleteFunction = (func: any) => {
    if (window.confirm(`Are you sure you want to delete the function "${func.function_name}"?`)) {
      removeFunc.mutate(func.id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/audit/departments')}><ArrowLeft className="w-4 h-4 mr-2" />Back</Button>
          <div>
            <h1 className="text-3xl font-bold">{department.name}</h1>
            <p className="text-muted-foreground">Department Details and Functions</p>
          </div>
        </div>
      </div>

      {/* Department Details */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" />Department Information</CardTitle>
            {department.risk_rating && getRiskBadge(department.risk_rating)}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              {department.office_code && (
                <div className="flex items-start gap-3"><Building2 className="h-5 w-5 text-muted-foreground mt-0.5" /><div><div className="text-sm font-medium text-muted-foreground">Office</div><div className="mt-1">{department.office_code}</div></div></div>
              )}
              <div className="flex items-start gap-3"><Mail className="h-5 w-5 text-muted-foreground mt-0.5" /><div><div className="text-sm font-medium text-muted-foreground">Email</div><div className="mt-1">{department.email || 'N/A'}</div></div></div>
              <div className="flex items-start gap-3"><MapPin className="h-5 w-5 text-muted-foreground mt-0.5" /><div><div className="text-sm font-medium text-muted-foreground">Location</div><div className="mt-1">{department.location || 'N/A'}</div></div></div>
            </div>
            <div className="space-y-4">
              <div className="flex items-start gap-3"><Building2 className="h-5 w-5 text-muted-foreground mt-0.5" /><div><div className="text-sm font-medium text-muted-foreground">Department Head</div><div className="mt-1">{department.head}</div></div></div>
              {department.phone && (
                <div className="flex items-start gap-3"><Phone className="h-5 w-5 text-muted-foreground mt-0.5" /><div><div className="text-sm font-medium text-muted-foreground">Phone</div><div className="mt-1">{department.phone}</div></div></div>
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
              <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" />Department Functions ({functions.length})</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Functions managed by this department with risk assessments</p>
            </div>
            <Dialog open={isAddFunctionOpen} onOpenChange={setIsAddFunctionOpen}>
              <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />Add Function</Button></DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Add New Function to {department.name}</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2"><Label>Function Name *</Label><Input value={functionForm.function_name} onChange={(e) => setFunctionForm({...functionForm, function_name: e.target.value})} placeholder="e.g., Claims Processing" /></div>
                  <div className="space-y-2"><Label>Description</Label><Textarea value={functionForm.description} onChange={(e) => setFunctionForm({...functionForm, description: e.target.value})} rows={3} /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Likelihood</Label><Select value={functionForm.likelihood} onValueChange={(v) => setFunctionForm({...functionForm, likelihood: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Low">Low</SelectItem><SelectItem value="Medium">Medium</SelectItem><SelectItem value="High">High</SelectItem></SelectContent></Select></div>
                    <div className="space-y-2"><Label>Impact</Label><Select value={functionForm.impact} onValueChange={(v) => setFunctionForm({...functionForm, impact: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Low">Low</SelectItem><SelectItem value="Medium">Medium</SelectItem><SelectItem value="High">High</SelectItem></SelectContent></Select></div>
                  </div>
                  <div className="space-y-2"><Label>Control Effectiveness</Label><Select value={functionForm.control_effectiveness} onValueChange={(v) => setFunctionForm({...functionForm, control_effectiveness: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Effective">Effective</SelectItem><SelectItem value="Partially Effective">Partially Effective</SelectItem><SelectItem value="Ineffective">Ineffective</SelectItem></SelectContent></Select></div>
                  <div className="space-y-2"><Label>Responsible Person</Label><Select value={functionForm.responsible_person} onValueChange={(v) => setFunctionForm({...functionForm, responsible_person: v})}><SelectTrigger><SelectValue placeholder="Select person" /></SelectTrigger><SelectContent>{profiles.map((p) => <SelectItem key={p.id} value={p.user_code}>{p.full_name} ({p.user_code})</SelectItem>)}</SelectContent></Select></div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setIsAddFunctionOpen(false)}>Cancel</Button>
                    <Button onClick={handleAddFunction} disabled={createFunc.isPending}>{createFunc.isPending ? 'Adding...' : 'Add Function'}</Button>
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
                {functions.map((func: any) => (
                  <TableRow key={func.id}>
                    <TableCell className="font-medium">{func.function_name}</TableCell>
                    <TableCell className="max-w-xs truncate">{func.description}</TableCell>
                    <TableCell>{getRiskBadge(func.risk_rating || 'Medium')}</TableCell>
                    <TableCell>{getRiskBadge(func.likelihood || 'Medium')}</TableCell>
                    <TableCell>{getRiskBadge(func.impact || 'Medium')}</TableCell>
                    <TableCell>{getControlBadge(func.control_effectiveness || 'Effective')}</TableCell>
                    <TableCell className="text-sm">{func.last_audit_date ? new Date(func.last_audit_date).toLocaleDateString() : 'Not audited'}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEditFunction(func)}><Edit className="w-4 h-4" /></Button>
                        <Button variant="outline" size="sm" onClick={() => handleDeleteFunction(func)}><Trash2 className="w-4 h-4 text-red-600" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">No functions defined for this department yet. Click "Add Function" to get started.</div>
          )}
        </CardContent>
      </Card>

      {/* Edit Function Dialog */}
      <Dialog open={isEditFunctionOpen} onOpenChange={setIsEditFunctionOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Function</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Function Name *</Label><Input value={functionForm.function_name} onChange={(e) => setFunctionForm({...functionForm, function_name: e.target.value})} /></div>
            <div className="space-y-2"><Label>Description</Label><Textarea value={functionForm.description} onChange={(e) => setFunctionForm({...functionForm, description: e.target.value})} rows={3} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Likelihood</Label><Select value={functionForm.likelihood} onValueChange={(v) => setFunctionForm({...functionForm, likelihood: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Low">Low</SelectItem><SelectItem value="Medium">Medium</SelectItem><SelectItem value="High">High</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Impact</Label><Select value={functionForm.impact} onValueChange={(v) => setFunctionForm({...functionForm, impact: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Low">Low</SelectItem><SelectItem value="Medium">Medium</SelectItem><SelectItem value="High">High</SelectItem></SelectContent></Select></div>
            </div>
            <div className="space-y-2"><Label>Control Effectiveness</Label><Select value={functionForm.control_effectiveness} onValueChange={(v) => setFunctionForm({...functionForm, control_effectiveness: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Effective">Effective</SelectItem><SelectItem value="Partially Effective">Partially Effective</SelectItem><SelectItem value="Ineffective">Ineffective</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label>Responsible Person</Label><Select value={functionForm.responsible_person} onValueChange={(v) => setFunctionForm({...functionForm, responsible_person: v})}><SelectTrigger><SelectValue placeholder="Select person" /></SelectTrigger><SelectContent>{profiles.map((p) => <SelectItem key={p.id} value={p.user_code}>{p.full_name} ({p.user_code})</SelectItem>)}</SelectContent></Select></div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsEditFunctionOpen(false)}>Cancel</Button>
              <Button onClick={handleUpdateFunction} disabled={updateFunc.isPending}>{updateFunc.isPending ? 'Updating...' : 'Update Function'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
