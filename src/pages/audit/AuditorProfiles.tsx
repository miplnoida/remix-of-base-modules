import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Award, X } from 'lucide-react';
import { useIAAuditors, useIAAuditorMutations } from '@/hooks/useAuditData';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { PageShell, StandardSearchFilterBar, DataTable, EntityModal, StatusBadge } from '@/components/common';
import type { DataTableColumn, StandardFilterField } from '@/components/common';

const AVAILABLE_SKILLS = ['Payroll Audit', 'Compliance Testing', 'IT Audit', 'Financial Analysis', 'Risk Assessment', 'Fraud Investigation', 'Data Analytics'];
const AVAILABLE_CERTIFICATIONS = ['CIA', 'CISA', 'CFE', 'CPA', 'ACCA', 'CGAP', 'CRMA'];
const emptyForm = { employee_no: '', name: '', email: '', phone: '', role: 'Auditor', seniority_level: 'Junior', work_location: '', skills: [] as string[], certifications: [] as string[] };

export default function AuditorProfiles() {
  const { profile } = useSupabaseAuth();
  const { data: auditors = [], isLoading, isError, refetch } = useIAAuditors();
  const { create, update } = useIAAuditorMutations();
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({ role: 'all' });
  const [viewAuditor, setViewAuditor] = useState<any>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editAuditor, setEditAuditor] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);

  const resetForm = () => setForm({ ...emptyForm, skills: [], certifications: [] });

  const filteredAuditors = auditors.filter(a => {
    const matchesSearch = a.name.toLowerCase().includes(searchTerm.toLowerCase()) || a.email.toLowerCase().includes(searchTerm.toLowerCase()) || a.employee_no.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filters.role === 'all' || a.role === filters.role;
    return matchesSearch && matchesRole;
  });

  const handleAdd = () => {
    if (!form.employee_no || !form.name || !form.email) return;
    create.mutate({ ...form, created_by: (profile as any)?.user_code || '' }, {
      onSuccess: () => { setIsAddOpen(false); resetForm(); }
    });
  };

  const handleEdit = () => {
    if (!editAuditor) return;
    update.mutate({ id: editAuditor.id, ...form, updated_by: (profile as any)?.user_code || '' }, {
      onSuccess: () => { setEditAuditor(null); resetForm(); }
    });
  };

  const openEdit = (a: any) => {
    setForm({ employee_no: a.employee_no, name: a.name, email: a.email, phone: a.phone || '', role: a.role, seniority_level: a.seniority_level || 'Junior', work_location: a.work_location || '', skills: a.skills || [], certifications: a.certifications || [] });
    setEditAuditor(a);
  };

  const columns: DataTableColumn<any>[] = [
    { key: 'employee_no', header: 'Employee No.' },
    { key: 'name', header: 'Name' },
    { key: 'email', header: 'Email' },
    { key: 'role', header: 'Role', render: (row) => <StatusBadge status={row.role} /> },
    { key: 'seniority_level', header: 'Seniority' },
    { key: 'certifications', header: 'Certifications', render: (row) => (
      <div className="flex gap-1 flex-wrap">{(row.certifications || []).map((c: string, i: number) => <Badge key={i} variant="outline" className="text-xs"><Award className="w-3 h-3 mr-1" />{c}</Badge>)}</div>
    )},
    { key: 'employment_status', header: 'Status', render: (row) => <StatusBadge status={row.employment_status || 'Active'} /> },
  ];

  const formFields = (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div><Label>Employee Number</Label><Input value={form.employee_no} onChange={e => setForm(f => ({ ...f, employee_no: e.target.value }))} placeholder="EMP-AUD-001" disabled={!!editAuditor} /></div>
        <div><Label>Full Name</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="John Doe" /></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="auditor@ssb.kn" /></div>
        <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="(869) 465-0000" /></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><Label>Role</Label>
          <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="Auditor">Auditor</SelectItem><SelectItem value="Audit Manager">Audit Manager</SelectItem><SelectItem value="Audit Director">Audit Director</SelectItem></SelectContent>
          </Select>
        </div>
        <div><Label>Seniority Level</Label>
          <Select value={form.seniority_level} onValueChange={v => setForm(f => ({ ...f, seniority_level: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="Junior">Junior</SelectItem><SelectItem value="Mid">Mid</SelectItem><SelectItem value="Senior">Senior</SelectItem><SelectItem value="Lead">Lead</SelectItem></SelectContent>
          </Select>
        </div>
      </div>
      <div><Label>Work Location</Label><Input value={form.work_location} onChange={e => setForm(f => ({ ...f, work_location: e.target.value }))} placeholder="SSB Head Office" /></div>
      <div><Label>Skills</Label>
        <Select onValueChange={skill => { if (!form.skills.includes(skill)) setForm(f => ({ ...f, skills: [...f.skills, skill] })); }}>
          <SelectTrigger><SelectValue placeholder="Select skills" /></SelectTrigger>
          <SelectContent>{AVAILABLE_SKILLS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
        </Select>
        <div className="flex flex-wrap gap-2 mt-2">{form.skills.map(s => <Badge key={s} variant="secondary" className="gap-1">{s}<X className="w-3 h-3 cursor-pointer" onClick={() => setForm(f => ({ ...f, skills: f.skills.filter(x => x !== s) }))} /></Badge>)}</div>
      </div>
      <div><Label>Certifications</Label>
        <Select onValueChange={cert => { if (!form.certifications.includes(cert)) setForm(f => ({ ...f, certifications: [...f.certifications, cert] })); }}>
          <SelectTrigger><SelectValue placeholder="Select certifications" /></SelectTrigger>
          <SelectContent>{AVAILABLE_CERTIFICATIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
        </Select>
        <div className="flex flex-wrap gap-2 mt-2">{form.certifications.map(c => <Badge key={c} variant="secondary" className="gap-1">{c}<X className="w-3 h-3 cursor-pointer" onClick={() => setForm(f => ({ ...f, certifications: f.certifications.filter(x => x !== c) }))} /></Badge>)}</div>
      </div>
    </div>
  );

  return (
    <PageShell
      title="Auditor Profiles"
      subtitle="Manage auditor profiles, credentials, and skills"
      breadcrumbs={[{ label: 'Internal Audit', href: '/' }, { label: 'Auditor Profiles' }]}
      isLoading={isLoading}
      error={isError ? 'Failed to load auditor profiles' : null}
      actions={<Button onClick={() => { resetForm(); setIsAddOpen(true); }}><Plus className="w-4 h-4 mr-2" />Add Auditor</Button>}
    >
      <StandardSearchFilterBar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search by name, email, or employee number..."
        filters={[{ key: 'role', label: 'Role', type: 'select', options: [{ value: 'all', label: 'All Roles' }, { value: 'Audit Director', label: 'Audit Director' }, { value: 'Audit Manager', label: 'Audit Manager' }, { value: 'Auditor', label: 'Auditor' }] }] as StandardFilterField[]}
        filterValues={filters}
        onFilterChange={(k, v) => setFilters(f => ({ ...f, [k]: v }))}
        onReset={() => setFilters({ role: 'all' })}
      />

      <Card>
        <CardContent className="pt-6">
          <DataTable
            columns={columns}
            data={filteredAuditors}
            onView={(row) => setViewAuditor(row)}
            onEdit={(row) => openEdit(row)}
            emptyMessage='No auditors found. Click "Add Auditor" to create one.'
          />
        </CardContent>
      </Card>

      {/* View Modal */}
      <EntityModal open={viewAuditor !== null} onOpenChange={() => setViewAuditor(null)} title="Auditor Profile Details" mode="view">
        {viewAuditor && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-muted-foreground">Employee Number</Label><p className="font-medium">{viewAuditor.employee_no}</p></div>
              <div><Label className="text-muted-foreground">Name</Label><p className="font-medium">{viewAuditor.name}</p></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-muted-foreground">Email</Label><p>{viewAuditor.email}</p></div>
              <div><Label className="text-muted-foreground">Phone</Label><p>{viewAuditor.phone || '-'}</p></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-muted-foreground">Role</Label><div className="mt-1"><StatusBadge status={viewAuditor.role} /></div></div>
              <div><Label className="text-muted-foreground">Seniority</Label><p>{viewAuditor.seniority_level}</p></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-muted-foreground">Status</Label><div className="mt-1"><StatusBadge status={viewAuditor.employment_status || 'Active'} /></div></div>
              <div><Label className="text-muted-foreground">Work Location</Label><p>{viewAuditor.work_location || '-'}</p></div>
            </div>
            <div><Label className="text-muted-foreground">Skills</Label><div className="flex flex-wrap gap-2 mt-1">{(viewAuditor.skills || []).map((s: string, i: number) => <Badge key={i} variant="secondary">{s}</Badge>)}</div></div>
            <div><Label className="text-muted-foreground">Certifications</Label><div className="flex flex-wrap gap-2 mt-1">{(viewAuditor.certifications || []).map((c: string, i: number) => <Badge key={i} variant="outline"><Award className="w-3 h-3 mr-1" />{c}</Badge>)}</div></div>
          </div>
        )}
      </EntityModal>

      {/* Add Modal */}
      <EntityModal open={isAddOpen} onOpenChange={o => { if (!o) resetForm(); setIsAddOpen(o); }} title="Add New Auditor" mode="create" onSave={handleAdd} isSaving={create.isPending} saveLabel="Save Auditor">
        {formFields}
      </EntityModal>

      {/* Edit Modal */}
      <EntityModal open={editAuditor !== null} onOpenChange={o => { if (!o) { setEditAuditor(null); resetForm(); } }} title="Edit Auditor" mode="edit" onSave={handleEdit} isSaving={update.isPending} saveLabel="Save Changes">
        {formFields}
      </EntityModal>
    </PageShell>
  );
}
