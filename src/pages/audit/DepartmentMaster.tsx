import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Building2, Eye, Trash2 } from 'lucide-react';
import { useIADepartments, useIADepartmentMutations, useIAProfiles } from '@/hooks/useAuditData';
import { useTbOffices, useDepartments } from '@/hooks/useAdminData';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { Link } from 'react-router-dom';
import { PageShell, StandardSearchFilterBar, DataTable, EntityModal, StatusBadge, ConfirmDialog, ExportDropdown } from '@/components/common';
import type { DataTableColumn, StandardFilterField } from '@/components/common';
import { DEPARTMENT_SCHEMA, toExportColumns } from '@/config/moduleFieldSchemas';

const exportColumns = toExportColumns(DEPARTMENT_SCHEMA);

const OTHER_VALUE = '__OTHER__';

interface DeptForm {
  office_code: string;
  name: string;
  head: string;
  email: string;
  phone: string;
  location: string;
  risk_rating: string;
  source_department_id: string | null;
  head_profile_id: string | null;
  custom_name: string;
  custom_head: string;
}

const emptyForm: DeptForm = {
  office_code: '', name: '', head: '', email: '', phone: '', location: '',
  risk_rating: 'Medium', source_department_id: null, head_profile_id: null,
  custom_name: '', custom_head: '',
};

export default function DepartmentMaster() {
  const { profile } = useSupabaseAuth();
  const { data: departments = [], isLoading, isError } = useIADepartments();
  const { create, update, remove } = useIADepartmentMutations();
  const { data: offices = [] } = useTbOffices();
  const { data: profiles = [] } = useIAProfiles();
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({ risk: 'all' });
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editDept, setEditDept] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<DeptForm>({ ...emptyForm });
  

  // Dept name select state: 'select' or 'other'
  const [deptSelectMode, setDeptSelectMode] = useState<'select' | 'other'>('select');
  // Head select state
  const [headSelectMode, setHeadSelectMode] = useState<'select' | 'other'>('select');

  // Cascading: fetch departments for selected office
  const { data: officeDepts = [] } = useDepartments(form.office_code || null);

  // When office changes, reset department selection
  const handleOfficeChange = (code: string) => {
    const office = offices.find(o => o.code === code);
    setForm(f => ({
      ...f,
      office_code: code,
      location: office?.description || '',
      name: '',
      source_department_id: null,
      custom_name: '',
    }));
    setDeptSelectMode('select');
  };

  // When department is selected from dropdown
  const handleDeptSelect = (val: string) => {
    if (val === OTHER_VALUE) {
      setDeptSelectMode('other');
      setForm(f => ({ ...f, name: '', source_department_id: null, custom_name: '' }));
    } else {
      setDeptSelectMode('select');
      const dept = officeDepts.find(d => d.id === val);
      setForm(f => ({
        ...f,
        name: dept?.name || '',
        source_department_id: val,
        custom_name: '',
      }));
    }
  };

  // When head is selected from dropdown
  const handleHeadSelect = (val: string) => {
    if (val === OTHER_VALUE) {
      setHeadSelectMode('other');
      setForm(f => ({ ...f, head: '', head_profile_id: null, custom_head: '', email: '', phone: '' }));
    } else {
      setHeadSelectMode('select');
      const p = profiles.find(pr => pr.id === val);
      setForm(f => ({
        ...f,
        head: p?.full_name || '',
        head_profile_id: val,
        custom_head: '',
        email: p?.email || '',
        phone: p?.phone || '',
      }));
    }
  };


  const filteredDepartments = departments.filter(d => {
    const matchesSearch = d.name.toLowerCase().includes(searchTerm.toLowerCase()) || d.head.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRisk = filters.risk === 'all' || d.risk_rating === filters.risk;
    return matchesSearch && matchesRisk;
  });

  const resetForm = () => {
    setForm({ ...emptyForm });
    setDeptSelectMode('select');
    setHeadSelectMode('select');
  };

  const getSubmitData = () => {
    const name = deptSelectMode === 'other' ? form.custom_name : form.name;
    const head = headSelectMode === 'other' ? form.custom_head : form.head;
    return {
      name, head,
      email: form.email, phone: form.phone, location: form.location,
      risk_rating: form.risk_rating, office_code: form.office_code,
      source_department_id: deptSelectMode === 'other' ? null : form.source_department_id,
      head_profile_id: headSelectMode === 'other' ? null : form.head_profile_id,
    };
  };

  const handleAdd = () => {
    const data = getSubmitData();
    if (!data.name || !data.head || !data.office_code) return;
    create.mutate({ ...data, created_by: (profile as any)?.user_code || '' }, { onSuccess: () => { setIsAddOpen(false); resetForm(); } });
  };

  const handleEdit = () => {
    if (!editDept) return;
    const data = getSubmitData();
    if (!data.name || !data.head || !data.office_code) return;
    update.mutate({ id: editDept.id, ...data, updated_by: (profile as any)?.user_code || '' }, { onSuccess: () => { setEditDept(null); resetForm(); } });
  };

  const openEdit = (dept: any) => {
    const isOtherDept = !dept.source_department_id;
    const isOtherHead = !dept.head_profile_id;
    setDeptSelectMode(isOtherDept ? 'other' : 'select');
    setHeadSelectMode(isOtherHead ? 'other' : 'select');
    setForm({
      office_code: dept.office_code || '',
      name: dept.name,
      head: dept.head,
      email: dept.email || '',
      phone: dept.phone || '',
      location: dept.location || '',
      risk_rating: dept.risk_rating || 'Medium',
      source_department_id: dept.source_department_id || null,
      head_profile_id: dept.head_profile_id || null,
      custom_name: isOtherDept ? dept.name : '',
      custom_head: isOtherHead ? dept.head : '',
    });
    setEditDept(dept);
  };

  const filterFields: StandardFilterField[] = [
    { key: 'risk', label: 'Risk Rating', type: 'select', options: [{ value: 'all', label: 'All Ratings' }, { value: 'High', label: 'High' }, { value: 'Medium', label: 'Medium' }, { value: 'Low', label: 'Low' }] },
  ];

  const statCards = [
    { label: 'Total', value: departments.length, icon: Building2, color: 'text-muted-foreground' },
    { label: 'High Risk', value: departments.filter(d => d.risk_rating === 'High').length, icon: Building2, color: 'text-destructive' },
    { label: 'Medium Risk', value: departments.filter(d => d.risk_rating === 'Medium').length, icon: Building2, color: 'text-orange-600' },
    { label: 'Low Risk', value: departments.filter(d => d.risk_rating === 'Low').length, icon: Building2, color: 'text-green-600' },
  ];

  const columns: DataTableColumn<any>[] = [
    { key: 'name', header: 'Department Name' },
    { key: 'head', header: 'Department Head' },
    { key: 'email', header: 'Email' },
    
    { key: 'risk_rating', header: 'Risk Rating', render: (row) => <StatusBadge status={row.risk_rating || 'Medium'} /> },
  ];

  const formFields = (
    <div className="space-y-4">
      {/* Office Location */}
      <div>
        <Label>Office Location *</Label>
        <Select value={form.office_code} onValueChange={handleOfficeChange}>
          <SelectTrigger><SelectValue placeholder="Select office location" /></SelectTrigger>
          <SelectContent>
            {offices.map(o => (
              <SelectItem key={o.code} value={o.code}>{o.description}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Department Name */}
      <div>
        <Label>Department Name *</Label>
        {deptSelectMode === 'select' ? (
          <Select
            value={form.source_department_id || ''}
            onValueChange={handleDeptSelect}
            disabled={!form.office_code}
          >
            <SelectTrigger><SelectValue placeholder={form.office_code ? "Select department" : "Select office first"} /></SelectTrigger>
            <SelectContent>
              {officeDepts.map(d => (
                <SelectItem key={d.id} value={d.id} disabled={!d.is_active}>
                  {d.name}{!d.is_active ? ' (Inactive)' : ''}
                </SelectItem>
              ))}
              <SelectItem value={OTHER_VALUE}>Other (Enter manually)</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <div className="space-y-2">
            <Input
              value={form.custom_name}
              onChange={e => setForm(f => ({ ...f, custom_name: e.target.value }))}
              placeholder="Enter department name"
            />
            <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => setDeptSelectMode('select')}>
              ← Back to list
            </Button>
          </div>
        )}
      </div>

      {/* Department Head */}
      <div>
        <Label>Department Head *</Label>
        {headSelectMode === 'select' ? (
          <Select
            value={form.head_profile_id || ''}
            onValueChange={handleHeadSelect}
          >
            <SelectTrigger><SelectValue placeholder="Select department head" /></SelectTrigger>
            <SelectContent>
              {profiles.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
              ))}
              <SelectItem value={OTHER_VALUE}>Other (Enter manually)</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <div className="space-y-2">
            <Input
              value={form.custom_head}
              onChange={e => setForm(f => ({ ...f, custom_head: e.target.value }))}
              placeholder="Enter department head name"
            />
            <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => setHeadSelectMode('select')}>
              ← Back to list
            </Button>
          </div>
        )}
      </div>

      {/* Email & Phone */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Email</Label>
          <Input
            type="email"
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            placeholder="head@ssb.kn"
          />
        </div>
        <div>
          <Label>Phone</Label>
          <Input
            value={form.phone}
            onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
            placeholder="(869) 465-0000"
          />
        </div>
      </div>

      {/* Risk Rating */}
      <div>
        <Label>Risk Rating</Label>
        <Select value={form.risk_rating} onValueChange={v => setForm(f => ({ ...f, risk_rating: v }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="High">High</SelectItem>
            <SelectItem value="Medium">Medium</SelectItem>
            <SelectItem value="Low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  return (
    <PageShell
      title="Department Master"
      subtitle="Manage SSB department information for audit planning"
      breadcrumbs={[{ label: 'Internal Audit', href: '/' }, { label: 'Department Master' }]}
      isLoading={isLoading}
      error={isError ? 'Failed to load departments' : null}
      actions={
        <div className="flex items-center gap-2">
          <ExportDropdown data={filteredDepartments} columns={exportColumns} fileName={DEPARTMENT_SCHEMA.exportFileName} title={DEPARTMENT_SCHEMA.exportTitle} />
          <Button onClick={() => { resetForm(); setIsAddOpen(true); }}><Plus className="w-4 h-4 mr-2" />Add Department</Button>
        </div>
      }
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <Card key={card.label}>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <card.icon className={`h-5 w-5 ${card.color}`} />
                <div className="ml-3">
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                  <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <StandardSearchFilterBar searchValue={searchTerm} onSearchChange={setSearchTerm} searchPlaceholder="Search by department name or head..." filters={filterFields} filterValues={filters} onFilterChange={(k, v) => setFilters(f => ({ ...f, [k]: v }))} onReset={() => setFilters({ risk: 'all' })} />

      <Card>
        <CardContent className="pt-6">
          <DataTable
            columns={columns}
            data={filteredDepartments}
            renderActions={(row) => (
              <div className="flex gap-1">
                <Link to={`/audit/department-view/${row.id}`}><Button variant="ghost" size="icon" className="h-8 w-8"><Eye className="h-4 w-4" /></Button></Link>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(row)}><Building2 className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(row.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            )}
            emptyMessage='No departments found. Click "Add Department" to get started.'
          />
        </CardContent>
      </Card>

      <EntityModal open={isAddOpen} onOpenChange={o => { if (!o) resetForm(); setIsAddOpen(o); }} title="Add New Department" mode="create" onSave={handleAdd} isSaving={create.isPending} saveLabel="Save Department">
        {formFields}
      </EntityModal>

      <EntityModal open={editDept !== null} onOpenChange={o => { if (!o) { setEditDept(null); resetForm(); } }} title="Edit Department" mode="edit" onSave={handleEdit} isSaving={update.isPending} saveLabel="Save Changes">
        {formFields}
      </EntityModal>

      <ConfirmDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)} title="Remove Department" description="Are you sure you want to remove this department? It will be deactivated." onConfirm={() => { if (deleteId) { remove.mutate(deleteId); setDeleteId(null); } }} variant="destructive" />

    </PageShell>
  );
}
