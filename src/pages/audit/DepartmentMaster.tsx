import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Edit, Eye, Building2, Loader2 } from 'lucide-react';
import { useIADepartments, useIADepartmentMutations } from '@/hooks/useAuditData';
import { Link } from 'react-router-dom';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';

export default function DepartmentMaster() {
  const { profile } = useSupabaseAuth();
  const { data: departments = [], isLoading, isError, refetch } = useIADepartments();
  const { create, update } = useIADepartmentMutations();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editDept, setEditDept] = useState<any>(null);
  const [form, setForm] = useState({ name: '', head: '', email: '', phone: '', location: '', risk_rating: 'Medium' });

  const filteredDepartments = departments.filter(dept =>
    dept.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dept.head.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const resetForm = () => setForm({ name: '', head: '', email: '', phone: '', location: '', risk_rating: 'Medium' });

  const handleAdd = () => {
    if (!form.name || !form.head) return;
    create.mutate({ ...form, created_by: (profile as any)?.user_code || '' }, {
      onSuccess: () => { setIsAddOpen(false); resetForm(); }
    });
  };

  const handleEdit = () => {
    if (!editDept || !form.name || !form.head) return;
    update.mutate({ id: editDept.id, ...form, updated_by: (profile as any)?.user_code || '' }, {
      onSuccess: () => { setEditDept(null); resetForm(); }
    });
  };

  const openEdit = (dept: any) => {
    setForm({ name: dept.name, head: dept.head, email: dept.email || '', phone: dept.phone || '', location: dept.location || '', risk_rating: dept.risk_rating || 'Medium' });
    setEditDept(dept);
  };

  const getRiskBadge = (risk?: string) => {
    if (!risk) return null;
    const colors: Record<string, string> = { 'High': 'bg-red-500', 'Medium': 'bg-orange-600', 'Low': 'bg-green-500' };
    return <Badge className={colors[risk] || 'bg-gray-500'}>{risk}</Badge>;
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /><span className="ml-2">Loading departments...</span></div>;
  }

  if (isError) {
    return <div className="text-center py-12"><p className="text-muted-foreground mb-4">Failed to load departments</p><Button onClick={() => refetch()}>Retry</Button></div>;
  }

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Department Master</h1>
          <p className="text-muted-foreground">
            Manage SSB department information for audit planning |
            <Link to="/" className="text-blue-600 hover:underline ml-1">← Back to Dashboard</Link>
          </p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={o => { setIsAddOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />Add Department</Button></DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Add New Department</DialogTitle></DialogHeader>
            {formFields}
            <div className="flex justify-end gap-2">
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <Button onClick={handleAdd} disabled={create.isPending}>{create.isPending ? 'Saving...' : 'Save Department'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total Departments</CardTitle><Building2 className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{departments.length}</div><p className="text-xs text-muted-foreground">SSB departments</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">High Risk</CardTitle><Building2 className="h-4 w-4 text-red-600" /></CardHeader><CardContent><div className="text-2xl font-bold">{departments.filter(d => d.risk_rating === 'High').length}</div><p className="text-xs text-muted-foreground">Priority audits</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Medium Risk</CardTitle><Building2 className="h-4 w-4 text-orange-700" /></CardHeader><CardContent><div className="text-2xl font-bold">{departments.filter(d => d.risk_rating === 'Medium').length}</div><p className="text-xs text-muted-foreground">Regular audits</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Low Risk</CardTitle><Building2 className="h-4 w-4 text-green-600" /></CardHeader><CardContent><div className="text-2xl font-bold">{departments.filter(d => d.risk_rating === 'Low').length}</div><p className="text-xs text-muted-foreground">Periodic audits</p></CardContent></Card>
      </div>

      {/* Search */}
      <Card><CardContent className="pt-6"><div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Search by department name or head..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" /></div></CardContent></Card>

      {/* Table */}
      <Card>
        <CardHeader><CardTitle>SSB Departments ({filteredDepartments.length})</CardTitle></CardHeader>
        <CardContent>
          {filteredDepartments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No departments found. Click "Add Department" to get started.</div>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Department Name</TableHead><TableHead>Department Head</TableHead><TableHead>Email</TableHead><TableHead>Location</TableHead><TableHead>Risk Rating</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {filteredDepartments.map(dept => (
                  <TableRow key={dept.id}>
                    <TableCell className="font-medium">{dept.name}</TableCell>
                    <TableCell>{dept.head}</TableCell>
                    <TableCell>{dept.email}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{dept.location}</TableCell>
                    <TableCell>{getRiskBadge(dept.risk_rating)}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Link to={`/audit/department-view/${dept.id}`}><Button variant="outline" size="sm"><Eye className="w-4 h-4 mr-1" />View</Button></Link>
                        <Button variant="outline" size="sm" onClick={() => openEdit(dept)}><Edit className="w-4 h-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDept !== null} onOpenChange={o => { if (!o) { setEditDept(null); resetForm(); } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Edit Department</DialogTitle></DialogHeader>
          {formFields}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setEditDept(null); resetForm(); }}>Cancel</Button>
            <Button onClick={handleEdit} disabled={update.isPending}>{update.isPending ? 'Saving...' : 'Save Changes'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
