import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Building2, Eye, Trash2 } from 'lucide-react';
import { useIADepartments, useIADepartmentMutations } from '@/hooks/useAuditData';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { Link } from 'react-router-dom';
import { PageShell, SearchBar, FilterBar, DataTable, EntityModal, StatusBadge, ConfirmDialog } from '@/components/common';
import type { DataTableColumn, FilterField } from '@/components/common';

export default function DepartmentMaster() {
  const { profile } = useSupabaseAuth();
  const { data: departments = [], isLoading, isError } = useIADepartments();
  const { create, update, remove } = useIADepartmentMutations();
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({ risk: 'all' });
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editDept, setEditDept] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', head: '', email: '', phone: '', location: '', risk_rating: 'Medium' });

  const filteredDepartments = departments.filter(d => {
    const matchesSearch = d.name.toLowerCase().includes(searchTerm.toLowerCase()) || d.head.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRisk = filters.risk === 'all' || d.risk_rating === filters.risk;
    return matchesSearch && matchesRisk;
  });
  const resetForm = () => setForm({ name: '', head: '', email: '', phone: '', location: '', risk_rating: 'Medium' });

  const handleAdd = () => {
    if (!form.name || !form.head) return;
    create.mutate({ ...form, created_by: (profile as any)?.user_code || '' }, { onSuccess: () => { setIsAddOpen(false); resetForm(); } });
  };

  const handleEdit = () => {
    if (!editDept || !form.name || !form.head) return;
    update.mutate({ id: editDept.id, ...form, updated_by: (profile as any)?.user_code || '' }, { onSuccess: () => { setEditDept(null); resetForm(); } });
  };

  const openEdit = (dept: any) => {
    setForm({ name: dept.name, head: dept.head, email: dept.email || '', phone: dept.phone || '', location: dept.location || '', risk_rating: dept.risk_rating || 'Medium' });
    setEditDept(dept);
  };

  const filterFields: FilterField[] = [
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
    { key: 'location', header: 'Location', className: 'text-muted-foreground' },
    { key: 'risk_rating', header: 'Risk Rating', render: (row) => <StatusBadge status={row.risk_rating || 'Medium'} /> },
  ];

  const formFields = (
    <div className="space-y-4">
      <div><Label>Department Name</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g., Benefits Department" /></div>
      <div className="grid grid-cols-2 gap-4">
        <div><Label>Department Head</Label><Input value={form.head} onChange={e => setForm(f => ({ ...f, head: e.target.value }))} placeholder="Full name" /></div>
        <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="head@ssb.kn" /></div>
      </div>
      <div><Label>Location</Label><Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="e.g., Main Building - Floor 2" /></div>
      <div><Label>Risk Rating</Label>
        <Select value={form.risk_rating} onValueChange={v => setForm(f => ({ ...f, risk_rating: v }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="High">High</SelectItem><SelectItem value="Medium">Medium</SelectItem><SelectItem value="Low">Low</SelectItem></SelectContent>
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
      actions={<Button onClick={() => { resetForm(); setIsAddOpen(true); }}><Plus className="w-4 h-4 mr-2" />Add Department</Button>}
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

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-3">
            <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Search by department name or head..." />
            <FilterBar filters={filterFields} values={filters} onChange={(k, v) => setFilters(f => ({ ...f, [k]: v }))} onReset={() => setFilters({ risk: 'all' })} />
          </div>
        </CardContent>
      </Card>

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
