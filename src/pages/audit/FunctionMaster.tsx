import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Shield, Target, Upload } from 'lucide-react';
import { useIADepartments, useIADepartmentFunctions, useIADepartmentFunctionMutations } from '@/hooks/useAuditData';
import { useToast } from '@/hooks/use-toast';
import { PageShell, StandardSearchFilterBar, DataTable, EntityModal, StatusBadge, BulkUploadModal, ExportDropdown } from '@/components/common';
import type { DataTableColumn, StandardFilterField } from '@/components/common';
import { FUNCTION_SCHEMA, toBulkUploadFields, toExportColumns } from '@/config/moduleFieldSchemas';
import { useProfiles } from '@/components/c3/ReceivedBySelect';

const bulkUploadFields = toBulkUploadFields(FUNCTION_SCHEMA);
const exportColumns = toExportColumns(FUNCTION_SCHEMA);

export default function FunctionMaster() {
  const { toast } = useToast();
  const { profiles } = useProfiles();
  const { data: departments = [], isLoading: deptsLoading } = useIADepartments();
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({ department: 'all' });
  const deptId = filters.department === 'all' ? undefined : filters.department;
  const { data: allFunctions = [], isLoading: funcsLoading } = useIADepartmentFunctions(deptId);
  const { create: createFn, update: updateFn } = useIADepartmentFunctionMutations();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editFunc, setEditFunc] = useState<any>(null);
  const [viewFunc, setViewFunc] = useState<any>(null);
  const [formData, setFormData] = useState({ departmentId: '', functionName: '', description: '', likelihood: 'Medium', impact: 'Medium', controlEffectiveness: 'Effective', responsiblePerson: '', notes: '' });
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);

  // Dynamically set allowed department names on the bulk upload field
  const dynamicBulkFields = bulkUploadFields.map(f =>
    f.key === 'department_name' ? { ...f, allowedValues: departments.map(d => d.name) } : f
  );

  const handleBulkImport = async (data: Record<string, any>[]) => {
    for (const row of data) {
      const dept = departments.find(d => d.name === row.department_name);
      if (!dept) continue;
      const l = row.likelihood || 'Medium';
      const i = row.impact || 'Medium';
      createFn.mutate({
        department_id: dept.id, function_name: row.function_name, description: row.description || '',
        risk_rating: calculateInherentRisk(l, i), likelihood: l, impact: i,
        control_effectiveness: row.control_effectiveness || 'Effective',
        responsible_person: row.responsible_person || '', notes: row.notes || '',
      });
    }
  };

  const filteredFunctions = allFunctions.filter((f: any) => (f.function_name || '').toLowerCase().includes(searchTerm.toLowerCase()) || (f.description || '').toLowerCase().includes(searchTerm.toLowerCase()));

  const calculateInherentRisk = (l: string, i: string) => {
    const score: Record<string, number> = { Low: 1, Medium: 2, High: 3 };
    const total = (score[l] || 2) + (score[i] || 2);
    return total >= 5 ? 'High' : total >= 3 ? 'Medium' : 'Low';
  };

  const resetForm = () => setFormData({ departmentId: '', functionName: '', description: '', likelihood: 'Medium', impact: 'Medium', controlEffectiveness: 'Effective', responsiblePerson: '', notes: '' });

  const handleAdd = () => {
    if (!formData.departmentId || !formData.functionName) { toast({ title: "Validation Error", description: "Please fill required fields.", variant: "destructive" }); return; }
    createFn.mutate({ department_id: formData.departmentId, function_name: formData.functionName, description: formData.description, risk_rating: calculateInherentRisk(formData.likelihood, formData.impact), likelihood: formData.likelihood, impact: formData.impact, control_effectiveness: formData.controlEffectiveness, responsible_person: formData.responsiblePerson, notes: formData.notes });
    setIsAddOpen(false); resetForm();
  };

  const handleEdit = () => {
    if (!editFunc || !formData.departmentId || !formData.functionName) { toast({ title: "Validation Error", description: "Please fill required fields.", variant: "destructive" }); return; }
    updateFn.mutate({ id: editFunc.id, department_id: formData.departmentId, function_name: formData.functionName, description: formData.description, risk_rating: calculateInherentRisk(formData.likelihood, formData.impact), likelihood: formData.likelihood, impact: formData.impact, control_effectiveness: formData.controlEffectiveness, responsible_person: formData.responsiblePerson, notes: formData.notes });
    setEditFunc(null); resetForm();
  };

  const openEdit = (func: any) => {
    setFormData({ departmentId: func.department_id, functionName: func.function_name, description: func.description || '', likelihood: func.likelihood || 'Medium', impact: func.impact || 'Medium', controlEffectiveness: func.control_effectiveness || 'Effective', responsiblePerson: func.responsible_person || '', notes: func.notes || '' });
    setEditFunc(func);
  };

  const columns: DataTableColumn<any>[] = [
    { key: 'function_name', header: 'Function Name' },
    { key: 'department_id', header: 'Department', render: (row) => departments.find((d: any) => d.id === row.department_id)?.name || '-' },
    { key: 'description', header: 'Description', className: 'max-w-xs truncate' },
    { key: 'risk_rating', header: 'Risk Rating', render: (row) => <StatusBadge status={row.risk_rating || 'Medium'} /> },
    { key: 'likelihood', header: 'Likelihood', render: (row) => <StatusBadge status={row.likelihood || 'Medium'} /> },
    { key: 'impact', header: 'Impact', render: (row) => <StatusBadge status={row.impact || 'Medium'} /> },
    { key: 'control_effectiveness', header: 'Control Effectiveness', render: (row) => <StatusBadge status={row.control_effectiveness || 'Effective'} /> },
    { key: 'responsible_person', header: 'Responsible Person' },
  ];

  // Prepare export data with department name resolved
  const exportData = filteredFunctions.map((f: any) => ({
    ...f,
    department_name: departments.find((d: any) => d.id === f.department_id)?.name || '',
  }));

  const formFields = (
    <div className="space-y-4">
      <div><Label>Department *</Label><Select value={formData.departmentId} onValueChange={v => setFormData(f => ({ ...f, departmentId: v }))}><SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger><SelectContent>{departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent></Select></div>
      <div><Label>Function Name *</Label><Input value={formData.functionName} onChange={e => setFormData(f => ({ ...f, functionName: e.target.value }))} placeholder="e.g., Claims Processing" /></div>
      <div><Label>Description</Label><Textarea value={formData.description} onChange={e => setFormData(f => ({ ...f, description: e.target.value }))} placeholder="Describe the function" rows={3} /></div>
      <div className="grid grid-cols-2 gap-4">
        <div><Label>Likelihood</Label><Select value={formData.likelihood} onValueChange={v => setFormData(f => ({ ...f, likelihood: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Low">Low</SelectItem><SelectItem value="Medium">Medium</SelectItem><SelectItem value="High">High</SelectItem></SelectContent></Select></div>
        <div><Label>Impact</Label><Select value={formData.impact} onValueChange={v => setFormData(f => ({ ...f, impact: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Low">Low</SelectItem><SelectItem value="Medium">Medium</SelectItem><SelectItem value="High">High</SelectItem></SelectContent></Select></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><Label>Risk Rating</Label><div className="p-2 border rounded-md bg-muted"><StatusBadge status={calculateInherentRisk(formData.likelihood, formData.impact)} /></div></div>
        <div><Label>Control Effectiveness</Label><Select value={formData.controlEffectiveness} onValueChange={v => setFormData(f => ({ ...f, controlEffectiveness: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Effective">Effective</SelectItem><SelectItem value="Partially Effective">Partially Effective</SelectItem><SelectItem value="Ineffective">Ineffective</SelectItem></SelectContent></Select></div>
      </div>
      <div><Label>Responsible Person</Label><Input value={formData.responsiblePerson} onChange={e => setFormData(f => ({ ...f, responsiblePerson: e.target.value }))} placeholder="Name" /></div>
      <div><Label>Notes</Label><Textarea value={formData.notes} onChange={e => setFormData(f => ({ ...f, notes: e.target.value }))} placeholder="Additional notes" rows={2} /></div>
    </div>
  );

  return (
    <PageShell
      title="Function Master"
      subtitle="Manage department functions and risk matrices for audit planning"
      breadcrumbs={[{ label: 'Internal Audit', href: '/' }, { label: 'Function Master' }]}
      isLoading={deptsLoading || funcsLoading}
      actions={
        <div className="flex items-center gap-2">
          <ExportDropdown data={exportData} columns={exportColumns} fileName={FUNCTION_SCHEMA.exportFileName} title={FUNCTION_SCHEMA.exportTitle} />
          <Button variant="outline" size="sm" onClick={() => setIsBulkUploadOpen(true)}>
            <Upload className="w-4 h-4 mr-2" />Bulk Upload
          </Button>
          <Button onClick={() => { resetForm(); setIsAddOpen(true); }}><Plus className="w-4 h-4 mr-2" />Add Function</Button>
        </div>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total Functions</CardTitle><Target className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{allFunctions.length}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">High Risk</CardTitle><Shield className="h-4 w-4 text-destructive" /></CardHeader><CardContent><div className="text-2xl font-bold text-destructive">{allFunctions.filter((f: any) => f.risk_rating === 'High').length}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Medium Risk</CardTitle><Shield className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{allFunctions.filter((f: any) => f.risk_rating === 'Medium').length}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Low Risk</CardTitle><Shield className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{allFunctions.filter((f: any) => f.risk_rating === 'Low').length}</div></CardContent></Card>
      </div>

      <StandardSearchFilterBar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search functions..."
        filters={[{ key: 'department', label: 'Department', type: 'select', options: [{ value: 'all', label: 'All Departments' }, ...departments.map(d => ({ value: d.id, label: d.name }))] }] as StandardFilterField[]}
        filterValues={filters}
        onFilterChange={(k, v) => setFilters(f => ({ ...f, [k]: v }))}
        onReset={() => setFilters({ department: 'all' })}
      />

      <Card>
        <CardContent className="pt-6">
          <DataTable
            columns={columns}
            data={filteredFunctions}
            onView={(row) => setViewFunc(row)}
            onEdit={(row) => openEdit(row)}
            emptyMessage="No functions found."
          />
        </CardContent>
      </Card>

      {/* Risk Matrix */}
      <Card>
        <CardHeader><CardTitle>Risk Assessment Matrix</CardTitle></CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground mb-4">Risk Rating = Likelihood × Impact</div>
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div className="font-semibold">Impact →</div>
            <div className="text-center font-semibold">Low</div>
            <div className="text-center font-semibold">Medium</div>
            <div className="text-center font-semibold">High</div>
            <div className="font-semibold">High ↓</div>
            <div className="text-center p-2 rounded bg-muted"><StatusBadge status="Medium" /></div>
            <div className="text-center p-2 rounded bg-muted"><StatusBadge status="High" /></div>
            <div className="text-center p-2 rounded bg-muted"><StatusBadge status="High" /></div>
            <div className="font-semibold">Medium ↓</div>
            <div className="text-center p-2 rounded bg-muted"><StatusBadge status="Low" /></div>
            <div className="text-center p-2 rounded bg-muted"><StatusBadge status="Medium" /></div>
            <div className="text-center p-2 rounded bg-muted"><StatusBadge status="High" /></div>
            <div className="font-semibold">Low ↓</div>
            <div className="text-center p-2 rounded bg-muted"><StatusBadge status="Low" /></div>
            <div className="text-center p-2 rounded bg-muted"><StatusBadge status="Low" /></div>
            <div className="text-center p-2 rounded bg-muted"><StatusBadge status="Medium" /></div>
          </div>
        </CardContent>
      </Card>

      {/* View Modal */}
      <EntityModal open={viewFunc !== null} onOpenChange={() => setViewFunc(null)} title="Function Details" mode="view">
        {viewFunc && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-muted-foreground">Function Name</Label><p className="font-medium">{viewFunc.function_name}</p></div>
              <div><Label className="text-muted-foreground">Department</Label><p>{departments.find((d: any) => d.id === viewFunc.department_id)?.name || '-'}</p></div>
            </div>
            <div><Label className="text-muted-foreground">Description</Label><p>{viewFunc.description || '-'}</p></div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label className="text-muted-foreground">Likelihood</Label><div className="mt-1"><StatusBadge status={viewFunc.likelihood || 'Medium'} /></div></div>
              <div><Label className="text-muted-foreground">Impact</Label><div className="mt-1"><StatusBadge status={viewFunc.impact || 'Medium'} /></div></div>
              <div><Label className="text-muted-foreground">Risk Rating</Label><div className="mt-1"><StatusBadge status={viewFunc.risk_rating || 'Medium'} /></div></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-muted-foreground">Control Effectiveness</Label><div className="mt-1"><StatusBadge status={viewFunc.control_effectiveness || 'Effective'} /></div></div>
              <div><Label className="text-muted-foreground">Responsible Person</Label><p>{viewFunc.responsible_person || '-'}</p></div>
            </div>
            {viewFunc.notes && <div><Label className="text-muted-foreground">Notes</Label><p>{viewFunc.notes}</p></div>}
          </div>
        )}
      </EntityModal>

      <EntityModal open={isAddOpen} onOpenChange={o => { if (!o) resetForm(); setIsAddOpen(o); }} title="Add New Function" mode="create" onSave={handleAdd} saveLabel="Add Function">
        {formFields}
      </EntityModal>

      <EntityModal open={editFunc !== null} onOpenChange={o => { if (!o) { setEditFunc(null); resetForm(); } }} title="Edit Function" mode="edit" onSave={handleEdit} saveLabel="Save Changes">
        {formFields}
      </EntityModal>

      <BulkUploadModal
        open={isBulkUploadOpen}
        onOpenChange={setIsBulkUploadOpen}
        title="Bulk Upload Functions"
        fields={dynamicBulkFields}
        onImport={handleBulkImport}
        templateName={FUNCTION_SCHEMA.templateFileName}
      />
    </PageShell>
  );
}
