import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Award, X, Users, UserPlus, Info, CheckCircle2, Search, ShieldCheck, ShieldOff } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { useIAAuditors, useIAAuditorMutations, useIAProfiles } from '@/hooks/useAuditData';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { PageShell, StandardSearchFilterBar, DataTable, EntityModal, StatusBadge, ExportDropdown } from '@/components/common';
import type { DataTableColumn, StandardFilterField } from '@/components/common';
import { AUDITOR_SCHEMA, toExportColumns } from '@/config/moduleFieldSchemas';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
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

const exportColumns = toExportColumns(AUDITOR_SCHEMA);

export default function AuditorProfiles() {
  const { profile } = useSupabaseAuth();
  const { data: auditors = [], isLoading, isError } = useIAAuditors();
  const { data: profiles = [] } = useIAProfiles();
  const { create, update } = useIAAuditorMutations();
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({ role: 'all', status: 'all' });
  const [viewAuditor, setViewAuditor] = useState<any>(null);
  const [editAuditor, setEditAuditor] = useState<any>(null);
  const [editForm, setEditForm] = useState({ role: 'Auditor', seniority_level: 'Junior', work_location: '', skills: [] as string[], certifications: [] as string[] });
  const [showImport, setShowImport] = useState(false);
  const [importSearch, setImportSearch] = useState('');
  const [bulkSelections, setBulkSelections] = useState<Record<string, { selected: boolean; role: string; seniority: string }>>({});

  // Profiles already registered as auditors
  const usedProfileIds = new Set(auditors.map((a: any) => a.profile_id).filter(Boolean));
  const availableProfiles = profiles.filter(p => !usedProfileIds.has(p.id));

  // Filtered available profiles for import dialog
  const filteredImportProfiles = availableProfiles.filter(p => {
    if (!importSearch) return true;
    const q = importSearch.toLowerCase();
    return (p.full_name || '').toLowerCase().includes(q) || (p.email || '').toLowerCase().includes(q) || (p.user_code || '').toLowerCase().includes(q);
  });

  const filteredAuditors = auditors.filter(a => {
    const matchesSearch = a.name.toLowerCase().includes(searchTerm.toLowerCase()) || a.email.toLowerCase().includes(searchTerm.toLowerCase()) || a.employee_no.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filters.role === 'all' || a.role === filters.role;
    const matchesStatus = filters.status === 'all' || (a.employment_status || 'Active') === filters.status;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleToggleStatus = (auditor: any) => {
    const newStatus = (auditor.employment_status || 'Active') === 'Active' ? 'Inactive' : 'Active';
    update.mutate({
      id: auditor.id,
      employment_status: newStatus,
      updated_by: (profile as any)?.user_code || '',
    });
  };

  // Import dialog handlers
  const openImport = () => {
    const selections: Record<string, { selected: boolean; role: string; seniority: string }> = {};
    availableProfiles.forEach(p => {
      selections[p.id] = { selected: false, role: 'Auditor', seniority: 'Junior' };
    });
    setBulkSelections(selections);
    setImportSearch('');
    setShowImport(true);
  };

  const toggleSelect = (profileId: string) => {
    setBulkSelections(prev => ({
      ...prev,
      [profileId]: { ...prev[profileId], selected: !prev[profileId]?.selected }
    }));
  };

  const toggleSelectAll = () => {
    const allVisibleSelected = filteredImportProfiles.every(p => bulkSelections[p.id]?.selected);
    setBulkSelections(prev => {
      const next = { ...prev };
      filteredImportProfiles.forEach(p => {
        next[p.id] = { ...next[p.id], selected: !allVisibleSelected };
      });
      return next;
    });
  };

  const selectedCount = Object.values(bulkSelections).filter(s => s.selected).length;

  const handleImport = async () => {
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
          seniority_level: s.seniority,
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
    toast.success(`${successCount} user(s) imported into Auditor Registry`);
    setShowImport(false);
  };

  // Edit handlers - only audit-specific fields are editable
  const openEdit = (a: any) => {
    setEditForm({
      role: a.role || 'Auditor',
      seniority_level: a.seniority_level || 'Junior',
      work_location: a.work_location || '',
      skills: a.skills || [],
      certifications: a.certifications || [],
    });
    setEditAuditor(a);
  };

  const handleEdit = () => {
    if (!editAuditor) return;
    update.mutate({ id: editAuditor.id, ...editForm, updated_by: (profile as any)?.user_code || '' }, {
      onSuccess: () => { setEditAuditor(null); }
    });
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
    { key: 'employment_status', header: 'Status', render: (row) => {
      const isActive = (row.employment_status || 'Active') === 'Active';
      return (
        <Button
          variant="ghost"
          size="sm"
          className={`gap-1.5 text-xs font-medium ${isActive ? 'text-primary hover:text-destructive' : 'text-muted-foreground hover:text-primary'}`}
          onClick={(e) => { e.stopPropagation(); handleToggleStatus(row); }}
          title={isActive ? 'Click to deactivate' : 'Click to reactivate'}
        >
          {isActive ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldOff className="w-3.5 h-3.5" />}
          {isActive ? 'Active' : 'Inactive'}
        </Button>
      );
    }},
  ];

  const statusFilterOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'Active', label: 'Active' },
    { value: 'Inactive', label: 'Inactive' },
  ];

  const roleFilterOptions = [
    { value: 'all', label: 'All Roles' },
    ...AUDIT_ROLES.map(r => ({ value: r.value, label: r.label })),
  ];

  return (
    <PageShell
      title="Auditor Registry"
      subtitle="Import system users and assign audit-specific roles for engagement planning"
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
          <Button onClick={openImport} disabled={availableProfiles.length === 0}>
            <UserPlus className="w-4 h-4 mr-2" />
            Import System Users {availableProfiles.length > 0 && `(${availableProfiles.length})`}
          </Button>
        </div>
      }
    >
      {/* Info Card */}
      <Card className="border-primary/20 bg-primary/5 mb-4">
        <CardContent className="py-3 px-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div className="text-sm space-y-1">
              <p className="font-medium text-foreground">How the Auditor Registry Works</p>
              <p className="text-muted-foreground">
                Users are first created by the IT team in <strong>System Administration → User Management</strong>. 
                Then, from this page, you <strong>import</strong> those users into the Audit Registry and assign them 
                audit-specific roles (e.g., Lead Auditor, CAE). Only registered auditors appear in 
                engagement planning and assignment dropdowns.
              </p>
              <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {profiles.length} system users</span>
                <span className="flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> {auditors.length} registered auditors</span>
                <span className="flex items-center gap-1"><UserPlus className="h-3.5 w-3.5 text-amber-600" /> {availableProfiles.length} available to import</span>
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
            emptyMessage='No auditors registered yet. Click "Import System Users" to bring users into the audit registry.'
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
            <div><Label className="text-muted-foreground">Skills</Label><div className="flex flex-wrap gap-2 mt-1">{(viewAuditor.skills || []).length > 0 ? (viewAuditor.skills || []).map((s: string, i: number) => <Badge key={i} variant="secondary">{s}</Badge>) : <span className="text-xs text-muted-foreground">None assigned</span>}</div></div>
            <div><Label className="text-muted-foreground">Certifications</Label><div className="flex flex-wrap gap-2 mt-1">{(viewAuditor.certifications || []).length > 0 ? (viewAuditor.certifications || []).map((c: string, i: number) => <Badge key={i} variant="outline"><Award className="w-3 h-3 mr-1" />{c}</Badge>) : <span className="text-xs text-muted-foreground">None assigned</span>}</div></div>
          </div>
        )}
      </EntityModal>

      {/* Edit Modal — only audit-specific fields editable */}
      <EntityModal open={editAuditor !== null} onOpenChange={o => { if (!o) setEditAuditor(null); }} title="Edit Auditor Details" mode="edit" onSave={handleEdit} isSaving={update.isPending} saveLabel="Save Changes">
        {editAuditor && (
          <div className="space-y-4">
            {/* Read-only identity from system */}
            <div className="rounded-md border bg-muted/30 p-3 space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">System User Info (read-only)</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Name:</span> {editAuditor.name}</div>
                <div><span className="text-muted-foreground">Code:</span> {editAuditor.employee_no}</div>
                <div><span className="text-muted-foreground">Email:</span> {editAuditor.email}</div>
                <div><span className="text-muted-foreground">Phone:</span> {editAuditor.phone || '-'}</div>
              </div>
            </div>

            {/* Editable audit fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Audit Role *</Label>
                <Select value={editForm.role} onValueChange={v => setEditForm(f => ({ ...f, role: v }))}>
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
                <Select value={editForm.seniority_level} onValueChange={v => setEditForm(f => ({ ...f, seniority_level: v }))}>
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
              <Input value={editForm.work_location} onChange={e => setEditForm(f => ({ ...f, work_location: e.target.value }))} placeholder="SSB Head Office" />
            </div>
            <div>
              <Label>Skills</Label>
              <Select onValueChange={skill => { if (!editForm.skills.includes(skill)) setEditForm(f => ({ ...f, skills: [...f.skills, skill] })); }}>
                <SelectTrigger><SelectValue placeholder="Add a skill..." /></SelectTrigger>
                <SelectContent>{AVAILABLE_SKILLS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
              <div className="flex flex-wrap gap-2 mt-2">{editForm.skills.map(s => <Badge key={s} variant="secondary" className="gap-1">{s}<X className="w-3 h-3 cursor-pointer" onClick={() => setEditForm(f => ({ ...f, skills: f.skills.filter(x => x !== s) }))} /></Badge>)}</div>
            </div>
            <div>
              <Label>Certifications</Label>
              <Select onValueChange={cert => { if (!editForm.certifications.includes(cert)) setEditForm(f => ({ ...f, certifications: [...f.certifications, cert] })); }}>
                <SelectTrigger><SelectValue placeholder="Add a certification..." /></SelectTrigger>
                <SelectContent>{AVAILABLE_CERTIFICATIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
              <div className="flex flex-wrap gap-2 mt-2">{editForm.certifications.map(c => <Badge key={c} variant="secondary" className="gap-1">{c}<X className="w-3 h-3 cursor-pointer" onClick={() => setEditForm(f => ({ ...f, certifications: f.certifications.filter(x => x !== c) }))} /></Badge>)}</div>
            </div>
          </div>
        )}
      </EntityModal>

      {/* Import System Users Dialog */}
      <Dialog open={showImport} onOpenChange={setShowImport}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Import System Users into Audit Registry
            </DialogTitle>
            <DialogDescription>
              Select users created by the IT team to register them as auditors. Assign each an audit role and seniority. 
              Users already in the registry are excluded.
            </DialogDescription>
          </DialogHeader>

          {/* Search within import list */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or user code..."
              value={importSearch}
              onChange={e => setImportSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {availableProfiles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-600" />
              <p className="font-medium">All system users are already registered</p>
              <p className="text-xs mt-1">New users must first be created in System Administration → User Management</p>
            </div>
          ) : (
            <>
              {/* Select all toggle */}
              <div className="flex items-center justify-between px-1">
                <button onClick={toggleSelectAll} className="text-xs text-primary hover:underline">
                  {filteredImportProfiles.every(p => bulkSelections[p.id]?.selected) ? 'Deselect all' : 'Select all visible'}
                </button>
                <span className="text-xs text-muted-foreground">{selectedCount} selected</span>
              </div>

              <div className="border rounded-md divide-y max-h-[350px] overflow-y-auto">
                {filteredImportProfiles.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground text-sm">No matching users found</div>
                ) : (
                  filteredImportProfiles.map(p => (
                    <div key={p.id} className={`flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 transition-colors ${bulkSelections[p.id]?.selected ? 'bg-primary/5' : ''}`}>
                      <Checkbox
                        checked={bulkSelections[p.id]?.selected || false}
                        onCheckedChange={() => toggleSelect(p.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{p.full_name}</p>
                        <p className="text-xs text-muted-foreground">{p.user_code || '—'} · {p.email}</p>
                      </div>
                      <Select
                        value={bulkSelections[p.id]?.role || 'Auditor'}
                        onValueChange={v => setBulkSelections(prev => ({ ...prev, [p.id]: { ...prev[p.id], role: v } }))}
                        disabled={!bulkSelections[p.id]?.selected}
                      >
                        <SelectTrigger className="w-[160px] h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {AUDIT_ROLES.map(r => (
                            <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImport(false)}>Cancel</Button>
            <Button onClick={handleImport} disabled={selectedCount === 0 || create.isPending}>
              {create.isPending ? 'Importing...' : `Import ${selectedCount} User(s)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
