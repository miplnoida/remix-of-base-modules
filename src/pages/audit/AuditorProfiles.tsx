import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Edit, Eye, Award, X, Loader2 } from 'lucide-react';
import { useIAAuditors, useIAAuditorMutations } from '@/hooks/useAuditData';
import { Link } from 'react-router-dom';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';

const AVAILABLE_SKILLS = ['Payroll Audit', 'Compliance Testing', 'IT Audit', 'Financial Analysis', 'Risk Assessment', 'Fraud Investigation', 'Data Analytics'];
const AVAILABLE_CERTIFICATIONS = ['CIA', 'CISA', 'CFE', 'CPA', 'ACCA', 'CGAP', 'CRMA'];

const emptyForm = { employee_no: '', name: '', email: '', phone: '', role: 'Auditor', seniority_level: 'Junior', work_location: '', skills: [] as string[], certifications: [] as string[] };

export default function AuditorProfiles() {
  const { profile } = useSupabaseAuth();
  const { data: auditors = [], isLoading, isError, refetch } = useIAAuditors();
  const { create, update } = useIAAuditorMutations();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [viewAuditor, setViewAuditor] = useState<any>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editAuditor, setEditAuditor] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);

  const resetForm = () => setForm({ ...emptyForm, skills: [], certifications: [] });

  const filteredAuditors = auditors.filter(a => {
    const matchesSearch = a.name.toLowerCase().includes(searchTerm.toLowerCase()) || a.email.toLowerCase().includes(searchTerm.toLowerCase()) || a.employee_no.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = selectedRole === 'all' || a.role === selectedRole;
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

  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = { 'Audit Director': 'bg-purple-500', 'Audit Manager': 'bg-blue-500', 'Auditor': 'bg-green-500', 'Admin': 'bg-gray-500' };
    return <Badge className={colors[role] || 'bg-gray-500'}>{role}</Badge>;
  };

  const getStatusBadge = (status: string) => status === 'Active' ? <Badge className="bg-green-500">Active</Badge> : <Badge className="bg-gray-500">Inactive</Badge>;

  if (isLoading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /><span className="ml-2">Loading auditors...</span></div>;
  if (isError) return <div className="text-center py-12"><p className="text-muted-foreground mb-4">Failed to load auditor profiles</p><Button onClick={() => refetch()}>Retry</Button></div>;

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Auditor Profiles</h1>
          <p className="text-muted-foreground">Manage auditor profiles, credentials, and skills | <Link to="/" className="text-blue-600 hover:underline ml-1">← Back to Dashboard</Link></p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={o => { setIsAddOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />Add Auditor</Button></DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Add New Auditor</DialogTitle></DialogHeader>
            {formFields}
            <div className="flex justify-end gap-2">
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <Button onClick={handleAdd} disabled={create.isPending}>{create.isPending ? 'Saving...' : 'Save Auditor'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card><CardContent className="pt-6"><div className="flex flex-col md:flex-row gap-4"><div className="flex-1"><div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Search by name, email, or employee number..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" /></div></div>
        <Select value={selectedRole} onValueChange={setSelectedRole}><SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Roles</SelectItem><SelectItem value="Audit Director">Audit Director</SelectItem><SelectItem value="Audit Manager">Audit Manager</SelectItem><SelectItem value="Auditor">Auditor</SelectItem></SelectContent></Select>
      </div></CardContent></Card>

      {/* Table */}
      <Card>
        <CardHeader><CardTitle>Auditor Directory ({filteredAuditors.length})</CardTitle></CardHeader>
        <CardContent>
          {filteredAuditors.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No auditors found. Click "Add Auditor" to create one.</div>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Employee No.</TableHead><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead>Seniority</TableHead><TableHead>Certifications</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {filteredAuditors.map(auditor => (
                  <TableRow key={auditor.id}>
                    <TableCell className="font-medium">{auditor.employee_no}</TableCell>
                    <TableCell>{auditor.name}</TableCell>
                    <TableCell>{auditor.email}</TableCell>
                    <TableCell>{getRoleBadge(auditor.role)}</TableCell>
                    <TableCell>{auditor.seniority_level}</TableCell>
                    <TableCell><div className="flex gap-1">{(auditor.certifications || []).map((cert: string, idx: number) => <Badge key={idx} variant="outline" className="text-xs"><Award className="w-3 h-3 mr-1" />{cert}</Badge>)}</div></TableCell>
                    <TableCell>{getStatusBadge(auditor.employment_status || 'Active')}</TableCell>
                    <TableCell><div className="flex space-x-2"><Button variant="outline" size="sm" onClick={() => setViewAuditor(auditor)}><Eye className="w-4 h-4" /></Button><Button variant="outline" size="sm" onClick={() => openEdit(auditor)}><Edit className="w-4 h-4" /></Button></div></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={viewAuditor !== null} onOpenChange={() => setViewAuditor(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Auditor Profile Details</DialogTitle></DialogHeader>
          {viewAuditor && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-muted-foreground">Employee Number</Label><p className="text-lg font-medium">{viewAuditor.employee_no}</p></div>
                <div><Label className="text-muted-foreground">Name</Label><p className="text-lg font-medium">{viewAuditor.name}</p></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-muted-foreground">Email</Label><p className="text-lg">{viewAuditor.email}</p></div>
                <div><Label className="text-muted-foreground">Phone</Label><p className="text-lg">{viewAuditor.phone || '-'}</p></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-muted-foreground">Role</Label><div className="mt-2">{getRoleBadge(viewAuditor.role)}</div></div>
                <div><Label className="text-muted-foreground">Seniority Level</Label><p className="text-lg">{viewAuditor.seniority_level}</p></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-muted-foreground">Employment Status</Label><div className="mt-2">{getStatusBadge(viewAuditor.employment_status || 'Active')}</div></div>
                <div><Label className="text-muted-foreground">Work Location</Label><p className="text-lg">{viewAuditor.work_location || '-'}</p></div>
              </div>
              <div><Label className="text-muted-foreground">Skills</Label><div className="flex flex-wrap gap-2 mt-2">{(viewAuditor.skills || []).map((s: string, i: number) => <Badge key={i} variant="secondary">{s}</Badge>)}</div></div>
              <div><Label className="text-muted-foreground">Certifications</Label><div className="flex flex-wrap gap-2 mt-2">{(viewAuditor.certifications || []).map((c: string, i: number) => <Badge key={i} variant="outline" className="text-xs"><Award className="w-3 h-3 mr-1" />{c}</Badge>)}</div></div>
              <div className="flex justify-end"><Button onClick={() => setViewAuditor(null)}>Close</Button></div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editAuditor !== null} onOpenChange={o => { if (!o) { setEditAuditor(null); resetForm(); } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Edit Auditor</DialogTitle></DialogHeader>
          {formFields}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setEditAuditor(null); resetForm(); }}>Cancel</Button>
            <Button onClick={handleEdit} disabled={update.isPending}>{update.isPending ? 'Saving...' : 'Save Changes'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
