import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Award, X, Users, Upload, Info, CheckCircle2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { useIAAuditors, useIAAuditorMutations, useIAProfiles } from '@/hooks/useAuditData';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { PageShell, StandardSearchFilterBar, DataTable, EntityModal, StatusBadge, ExportDropdown } from '@/components/common';
import type { DataTableColumn, StandardFilterField } from '@/components/common';
import { AUDITOR_SCHEMA, toExportColumns } from '@/config/moduleFieldSchemas';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';

const AUDIT_ROLES = [
  { value: 'Chief Audit Executive', label: 'Chief Audit Executive (CAE)' },
  { value: 'Audit Director', label: 'Audit Director' },
  { value: 'Audit Manager', label: 'Audit Manager' },
  { value: 'Lead Auditor', label: 'Lead Auditor' },
  { value: 'Senior Auditor', label: 'Senior Auditor' },
  { value: 'Auditor', label: 'Auditor' },
  { value: 'IT Auditor', label: 'IT Auditor' },
  { value: 'External Auditor', label: 'External Auditor (Contract)' },
];

const SENIORITY_LEVELS = ['Executive', 'Senior', 'Mid-Level', 'Junior', 'Trainee'];

const AVAILABLE_SKILLS = ['Payroll Audit', 'Compliance Testing', 'IT Audit', 'Financial Analysis', 'Risk Assessment', 'Fraud Investigation', 'Data Analytics', 'Benefits Audit', 'Revenue Audit', 'Governance Review'];
const AVAILABLE_CERTIFICATIONS = ['CIA', 'CISA', 'CFE', 'CPA', 'ACCA', 'CGAP', 'CRMA', 'CRISC', 'CISM'];
const emptyForm = { employee_no: '', name: '', email: '', phone: '', role: 'Auditor', seniority_level: 'Junior', work_location: '', skills: [] as string[], certifications: [] as string[], profile_id: '' };

const exportColumns = toExportColumns(AUDITOR_SCHEMA);

export default function AuditorProfiles() {
  const { profile } = useSupabaseAuth();
  const { data: auditors = [], isLoading, isError } = useIAAuditors();
  const { data: profiles = [] } = useIAProfiles();
  const { create, update } = useIAAuditorMutations();
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({ role: 'all' });
  const [viewAuditor, setViewAuditor] = useState<any>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editAuditor, setEditAuditor] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkSelections, setBulkSelections] = useState<Record<string, { selected: boolean; role: string }>>({});

  const resetForm = () => setForm({ ...emptyForm, skills: [], certifications: [] });

  // Filter out profiles already added as auditors (for Add mode)
  const usedProfileIds = auditors.map((a: any) => a.profile_id).filter(Boolean);
  const availableProfiles = profiles.filter(p => !usedProfileIds.includes(p.id));

  const handleProfileSelect = (profileId: string) => {
    const selected = profiles.find(p => p.id === profileId);
    if (selected) {
      setForm(f => ({
        ...f,
        profile_id: selected.id,
        name: selected.full_name || '',
        email: selected.email || '',
        phone: selected.phone || '',
        employee_no: selected.user_code || '',
      }));
    }
  };

  const filteredAuditors = auditors.filter(a => {
    const matchesSearch = a.name.toLowerCase().includes(searchTerm.toLowerCase()) || a.email.toLowerCase().includes(searchTerm.toLowerCase()) || a.employee_no.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filters.role === 'all' || a.role === filters.role;
    return matchesSearch && matchesRole;
  });

  const handleAdd = () => {
    if (!form.profile_id || !form.name || !form.email) return;
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
    setForm({ employee_no: a.employee_no, name: a.name, email: a.email, phone: a.phone || '', role: a.role, seniority_level: a.seniority_level || 'Junior', work_location: a.work_location || '', skills: a.skills || [], certifications: a.certifications || [], profile_id: a.profile_id || '' });
    setEditAuditor(a);
  };

  // Bulk import handlers
  const openBulkImport = () => {
    const selections: Record<string, { selected: boolean; role: string }> = {};
    availableProfiles.forEach(p => {
      selections[p.id] = { selected: false, role: 'Auditor' };
    });
    setBulkSelections(selections);
    setShowBulkImport(true);
  };

  const toggleBulkSelect = (profileId: string) => {
    setBulkSelections(prev => ({
      ...prev,
      [profileId]: { ...prev[profileId], selected: !prev[profileId]?.selected }
    }));
  };

  const setBulkRole = (profileId: string, role: string) => {
    setBulkSelections(prev => ({
      ...prev,
      [profileId]: { ...prev[profileId], role }
    }));
  };

  const selectedCount = Object.values(bulkSelections).filter(s => s.selected).length;

  const handleBulkImport = async () => {
    const toImport = Object.entries(bulkSelections)
      .filter(([_, s]) => s.selected)
      .map(([profileId, s]) => {
        const p = profiles.find(pr => pr.id === profileId);
        if (!p) return null;
        return {
          profile_id: p.id,
          employee_no: p.user_code || `USR-${p.id.slice(0, 5).toUpperCase()}`,
          name: p.full_name || '',
          email: p.email || '',
          phone: p.phone || '',
          role: s.role,
          seniority_level: 'Junior',
          created_by: (profile as any)?.user_code || '',
        };
      })
      .filter(Boolean);

    let successCount = 0;
    for (const auditor of toImport) {
      try {
        await new Promise<void>((resolve, reject) => {
          create.mutate(auditor as any, {
            onSuccess: () => { successCount++; resolve(); },
            onError: (e) => reject(e),
          });
        });
      } catch (e) {
        console.error('Failed to import auditor:', e);
      }
    }
    toast.success(`${successCount} auditor(s) imported successfully`);
    setShowBulkImport(false);
  };

  const columns: DataTableColumn<any>[] = [
    { key: 'employee_no', header: 'Employee Code' },
    { key: 'name', header: 'Auditor Name' },
    { key: 'email', header: 'Email' },
    { key: 'role', header: 'Audit Role', render: (row) => <StatusBadge status={row.role} /> },
    { key: 'seniority_level', header: 'Seniority', render: (row) => <Badge variant="outline">{row.seniority_level || 'Junior'}</Badge> },
    { key: 'certifications', header: 'Certifications', render: (row) => (
      <div className="flex gap-1 flex-wrap">{(row.certifications || []).map((c: string, i: number) => <Badge key={i} variant="outline" className="text-xs"><Award className="w-3 h-3 mr-1" />{c}</Badge>)}</div>
    )},
    { key: 'employment_status', header: 'Status', render: (row) => <StatusBadge status={row.employment_status || 'Active'} /> },
    { key: 'profile_id', header: 'Linked', render: (row) => row.profile_id ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <span className="text-xs text-muted-foreground">Not linked</span> },
  ];

  const isEditMode = !!editAuditor;

  const formFields = (
    <div className="space-y-4">
      {/* Profile Selection - only in Add mode */}
      {!isEditMode && (
        <div>
          <Label>Select User Profile *</Label>
          <Select value={form.profile_id} onValueChange={handleProfileSelect}>
            <SelectTrigger><SelectValue placeholder="Select a user profile..." /></SelectTrigger>
            <SelectContent>
              {availableProfiles.map(p => (
                <SelectItem key={p.id} value={p.id}>
                  {p.full_name} {p.user_code ? `(${p.user_code})` : ''}
                </SelectItem>
              ))}
              {availableProfiles.length === 0 && (
                <div className="px-2 py-3 text-xs text-muted-foreground text-center">
                  All system users are already registered as auditors
                </div>
              )}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-1">
            Only system users not already in the auditor registry are shown.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div><Label>Employee Code</Label><Input value={form.employee_no} disabled className="bg-muted" /></div>
        <div><Label>Auditor Name</Label><Input value={form.name} disabled className="bg-muted" /></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><Label>Email</Label><Input value={form.email} disabled className="bg-muted" /></div>
        <div><Label>Phone</Label><Input value={form.phone} disabled className="bg-muted" /></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Audit Role *</Label>
          <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {AUDIT_ROLES.map(r => (
                <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Seniority Level</Label>
          <Select value={form.seniority_level} onValueChange={v => setForm(f => ({ ...f, seniority_level: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {SENIORITY_LEVELS.map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label>Work Location</Label>
        <Input value={form.work_location} onChange={e => setForm(f => ({ ...f, work_location: e.target.value }))} placeholder="SSB Head Office" />
      </div>
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

  const roleFilterOptions = [
    { value: 'all', label: 'All Roles' },
    ...AUDIT_ROLES.map(r => ({ value: r.value, label: r.label })),
  ];

  return (
    <PageShell
      title="Auditor Registry"
      subtitle="Manage the audit team by linking system users and assigning audit-specific roles, skills, and certifications"
      breadcrumbs={[{ label: 'Internal Audit', href: '/' }, { label: 'Auditor Registry' }]}
      isLoading={isLoading}
      error={isError ? 'Failed to load auditor profiles' : null}
      actions={
        <div className="flex items-center gap-2">
          <ExportDropdown
            data={filteredAuditors}
            columns={exportColumns}
            fileName={AUDITOR_SCHEMA.exportFileName}
            title={AUDITOR_SCHEMA.exportTitle}
          />
          {availableProfiles.length > 0 && (
            <Button variant="outline" onClick={openBulkImport}>
              <Upload className="w-4 h-4 mr-2" />Import Users ({availableProfiles.length})
            </Button>
          )}
          <Button onClick={() => { resetForm(); setIsAddOpen(true); }}><Plus className="w-4 h-4 mr-2" />Add Auditor</Button>
        </div>
      }
    >
      {/* How It Works Info Card */}
      <Card className="border-primary/20 bg-primary/5 mb-4">
        <CardContent className="py-3 px-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div className="text-sm space-y-1">
              <p className="font-medium text-foreground">How the Auditor Registry Works</p>
              <p className="text-muted-foreground">
                System users (from User Management) must be registered here before they can be assigned to audit engagements, plans, or activities.
                Each auditor gets an <strong>audit-specific role</strong> (e.g., Lead Auditor, CAE) independent of their system role.
                Only registered auditors appear in engagement planning dropdowns.
              </p>
              <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {profiles.length} system users</span>
                <span className="flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> {auditors.length} registered auditors</span>
                <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5 text-amber-600" /> {availableProfiles.length} available to import</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <StandardSearchFilterBar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search by name, email, or employee code..."
        filters={[{ key: 'role', label: 'Audit Role', type: 'select', options: roleFilterOptions }] as StandardFilterField[]}
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
            emptyMessage='No auditors found. Click "Add Auditor" or "Import Users" to register audit team members.'
          />
        </CardContent>
      </Card>

      {/* View Modal */}
      <EntityModal open={viewAuditor !== null} onOpenChange={() => setViewAuditor(null)} title="Auditor Profile Details" mode="view">
        {viewAuditor && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-muted-foreground">Employee Code</Label><p className="font-medium">{viewAuditor.employee_no}</p></div>
              <div><Label className="text-muted-foreground">Auditor Name</Label><p className="font-medium">{viewAuditor.name}</p></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-muted-foreground">Email</Label><p>{viewAuditor.email}</p></div>
              <div><Label className="text-muted-foreground">Phone</Label><p>{viewAuditor.phone || '-'}</p></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-muted-foreground">Audit Role</Label><div className="mt-1"><StatusBadge status={viewAuditor.role} /></div></div>
              <div><Label className="text-muted-foreground">Seniority</Label><div className="mt-1"><Badge variant="outline">{viewAuditor.seniority_level || 'Junior'}</Badge></div></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-muted-foreground">Status</Label><div className="mt-1"><StatusBadge status={viewAuditor.employment_status || 'Active'} /></div></div>
              <div><Label className="text-muted-foreground">Work Location</Label><p>{viewAuditor.work_location || '-'}</p></div>
            </div>
            <div><Label className="text-muted-foreground">Skills</Label><div className="flex flex-wrap gap-2 mt-1">{(viewAuditor.skills || []).map((s: string, i: number) => <Badge key={i} variant="secondary">{s}</Badge>)}</div></div>
            <div><Label className="text-muted-foreground">Certifications</Label><div className="flex flex-wrap gap-2 mt-1">{(viewAuditor.certifications || []).map((c: string, i: number) => <Badge key={i} variant="outline"><Award className="w-3 h-3 mr-1" />{c}</Badge>)}</div></div>
            <div><Label className="text-muted-foreground">Linked to System User</Label><p>{viewAuditor.profile_id ? <span className="flex items-center gap-1 text-green-600"><CheckCircle2 className="h-4 w-4" /> Yes</span> : 'No'}</p></div>
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

      {/* Bulk Import Dialog */}
      <Dialog open={showBulkImport} onOpenChange={setShowBulkImport}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Import System Users as Auditors
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Select system users to register in the Auditor Registry. Assign each an audit-specific role.
            Users already registered are excluded.
          </p>

          {availableProfiles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>All system users are already registered as auditors.</p>
            </div>
          ) : (
            <div className="border rounded-md divide-y max-h-[400px] overflow-y-auto">
              {availableProfiles.map(p => (
                <div key={p.id} className={`flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 transition-colors ${bulkSelections[p.id]?.selected ? 'bg-primary/5' : ''}`}>
                  <Checkbox
                    checked={bulkSelections[p.id]?.selected || false}
                    onCheckedChange={() => toggleBulkSelect(p.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.full_name}</p>
                    <p className="text-xs text-muted-foreground">{p.user_code || '—'} · {p.email}</p>
                  </div>
                  <Select
                    value={bulkSelections[p.id]?.role || 'Auditor'}
                    onValueChange={v => setBulkRole(p.id, v)}
                    disabled={!bulkSelections[p.id]?.selected}
                  >
                    <SelectTrigger className="w-[180px] h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AUDIT_ROLES.map(r => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkImport(false)}>Cancel</Button>
            <Button onClick={handleBulkImport} disabled={selectedCount === 0 || create.isPending}>
              {create.isPending ? 'Importing...' : `Import ${selectedCount} User(s)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
