import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Users, Edit, RefreshCw, Lock, Eye, EyeOff, Save, Plus, Home, Loader2, ChevronsUpDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  getCompanyDropdown, getCompanyUsers, getUserForEdit, updateCompanyUser,
  saveCompanyUser, toggleUserStatus, changeUserPassword, resetUserPassword,
  CompanyDropdownItem, CompanyUser
} from '@/services/wizManageUsersService';
import { format, parseISO } from 'date-fns';

const ROLE_MAP: Record<number, string> = { 3: 'Company', 4: 'Company User' };
const ROLE_OPTIONS = [
  { id: 3, label: 'Company' },
  { id: 4, label: 'Company User' },
];

const WizEmployerUsers: React.FC = () => {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<CompanyDropdownItem[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [companyOpen, setCompanyOpen] = useState(false);
  const [users, setUsers] = useState<CompanyUser[]>([]);
  const [loading, setLoading] = useState(false);

  // Add/Edit user
  const [userFormOpen, setUserFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Record<string, any> | null>(null);
  const [formSaving, setFormSaving] = useState(false);
  const [formData, setFormData] = useState({ first_name: '', last_name: '', login_id: '', email: '', role_id: 3 });

  // Change password dialog
  const [pwdOpen, setPwdOpen] = useState(false);
  const [pwdUserId, setPwdUserId] = useState<number | null>(null);
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [pwdSaving, setPwdSaving] = useState(false);

  // Toggle / Reset confirm
  const [toggleConfirm, setToggleConfirm] = useState<CompanyUser | null>(null);
  const [resetConfirm, setResetConfirm] = useState<CompanyUser | null>(null);

  const [searchText] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await getCompanyDropdown();
        setCompanies(res.data?.companies || []);
      } catch (err: any) {
        toast.error(err.message);
      }
    })();
  }, []);

  const loadUsers = useCallback(async () => {
    if (!selectedCompanyId) return;
    setLoading(true);
    try {
      const res = await getCompanyUsers(Number(selectedCompanyId));
      setUsers(res.data?.users || []);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedCompanyId]);

  useEffect(() => {
    if (selectedCompanyId) loadUsers();
    else setUsers([]);
  }, [loadUsers, selectedCompanyId]);

  const selectedCompany = companies.find(c => String(c.id) === selectedCompanyId);
  const canAddUser = selectedCompany && (selectedCompany.parent_company_id === null || selectedCompany.parent_company_id === 0);

  const filteredUsers = users.filter(u => {
    if (!searchText) return true;
    const s = searchText.toLowerCase();
    return `${u.first_name} ${u.last_name}`.toLowerCase().includes(s)
      || u.username?.toLowerCase().includes(s)
      || u.email?.toLowerCase().includes(s);
  });

  // ─── Add/Edit User Form ─────────────────────────────
  const openAddUser = () => {
    setEditingUser(null);
    setFormData({ first_name: '', last_name: '', login_id: '', email: '', role_id: 3 });
    setUserFormOpen(true);
  };

  const openEditUser = async (userId: number) => {
    try {
      const res = await getUserForEdit(userId);
      const u = res.data?.user;
      if (u) {
        setEditingUser(u);
        setFormData({
          first_name: u.first_name || '',
          last_name: u.last_name || '',
          login_id: u.username || '',
          email: u.email || '',
          role_id: u.role_id || 3,
        });
        setUserFormOpen(true);
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleSaveUser = async () => {
    if (!formData.first_name.trim() || !formData.email.trim()) {
      toast.error('First Name and Email are required');
      return;
    }
    setFormSaving(true);
    try {
      if (editingUser) {
        await updateCompanyUser({
          user_id: editingUser.id,
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          role_id: formData.role_id,
          company_id: Number(selectedCompanyId),
        });
        toast.success('User updated successfully');
      } else {
        if (!formData.login_id.trim()) {
          toast.error('Login ID is required for new user');
          setFormSaving(false);
          return;
        }
        await saveCompanyUser({
          company_id: Number(selectedCompanyId),
          first_name: formData.first_name,
          last_name: formData.last_name,
          login_id: formData.login_id,
          email: formData.email,
          role_id: formData.role_id,
        });
        toast.success('User created successfully');
      }
      setUserFormOpen(false);
      loadUsers();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setFormSaving(false);
    }
  };

  // ─── Toggle / Reset / Change Password ────────────────
  const handleToggle = async () => {
    if (!toggleConfirm) return;
    try {
      const res = await toggleUserStatus(toggleConfirm.id);
      toast.success(res.data?.message || 'Status changed');
      setToggleConfirm(null);
      loadUsers();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleReset = async () => {
    if (!resetConfirm) return;
    try {
      await resetUserPassword(resetConfirm.id);
      toast.success('Password reset email sent');
      setResetConfirm(null);
    } catch (err: any) { toast.error(err.message); }
  };

  const handleChangePwd = async () => {
    if (!pwdUserId) return;
    if (newPwd !== confirmPwd) { toast.error('Passwords do not match'); return; }
    if (newPwd.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    setPwdSaving(true);
    try {
      await changeUserPassword(pwdUserId, newPwd, confirmPwd);
      toast.success('Password changed');
      setPwdOpen(false);
      setNewPwd(''); setConfirmPwd('');
    } catch (err: any) { toast.error(err.message); }
    finally { setPwdSaving(false); }
  };

  return (
    <div className="space-y-4">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage className="cursor-pointer flex items-center gap-1" onClick={() => navigate('/c3-management/dashboard')}>
              <Home className="h-3.5 w-3.5" /> Admin Dashboard
            </BreadcrumbPage>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbPage>Employers</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" /> Employer Users
          </CardTitle>
          <div className="flex items-center gap-3">
            <div className="w-[420px]">
              <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a company...">
                    {selectedCompany ? `${selectedCompany.company_name} (${selectedCompany.registration_number})` : 'Select a company...'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {companies.map(c => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.company_name} ({c.registration_number})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {canAddUser && selectedCompanyId && (
              <Button onClick={openAddUser} className="gap-1">
                <Plus className="h-4 w-4" /> Add User
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!selectedCompanyId ? (
            <p className="text-center text-muted-foreground py-12">Please select a company to view users.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>C3 Reg. Date</TableHead>
                  <TableHead>UserID / LoginId</TableHead>
                  <TableHead>User Role</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>User Status</TableHead>
                  <TableHead>Edit</TableHead>
                  <TableHead>Reset Password</TableHead>
                  <TableHead>Change Password</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></TableCell></TableRow>
                ) : filteredUsers.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No users found</TableCell></TableRow>
                ) : filteredUsers.map(user => (
                  <TableRow key={user.id}>
                    <TableCell className="text-primary font-medium">{user.first_name} {user.last_name}</TableCell>
                    <TableCell>{user.created_at ? format(parseISO(user.created_at), 'dd-MMM-yyyy') : '—'}</TableCell>
                    <TableCell>{user.username || '—'}</TableCell>
                    <TableCell>{ROLE_MAP[user.role_id] || user.role_label || 'Company User'}</TableCell>
                    <TableCell>{user.email || '—'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge className={user.is_active ? 'bg-green-600 text-white' : 'bg-destructive text-white'}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                        <Switch checked={user.is_active} onCheckedChange={() => setToggleConfirm(user)} />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => openEditUser(user.id)}>
                        <Edit className="h-4 w-4 text-green-600" />
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" className="text-destructive border-destructive gap-1" onClick={() => setResetConfirm(user)}>
                        <RefreshCw className="h-3 w-3" /> Reset
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => { setPwdUserId(user.id); setPwdOpen(true); }}>
                        <Lock className="h-4 w-4 text-blue-600" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit User Dialog */}
      <Dialog open={userFormOpen} onOpenChange={setUserFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Update User' : 'Add New User'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>First Name <span className="text-destructive">*</span></Label>
                <Input value={formData.first_name} onChange={e => setFormData(p => ({ ...p, first_name: e.target.value }))} />
              </div>
              <div>
                <Label>Last Name</Label>
                <Input value={formData.last_name} onChange={e => setFormData(p => ({ ...p, last_name: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Login ID <span className="text-destructive">*</span></Label>
              <Input value={formData.login_id} onChange={e => setFormData(p => ({ ...p, login_id: e.target.value }))} disabled={!!editingUser} className={editingUser ? 'bg-muted' : ''} />
            </div>
            <div>
              <Label>Email <span className="text-destructive">*</span></Label>
              <Input type="email" value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} />
            </div>
            <div>
              <Label>User Role <span className="text-destructive">*</span></Label>
              <Select value={String(formData.role_id)} onValueChange={v => setFormData(p => ({ ...p, role_id: Number(v) }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map(r => <SelectItem key={r.id} value={String(r.id)}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUserFormOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveUser} disabled={formSaving}>
              {formSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              {editingUser ? 'Update' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Toggle Status Confirm */}
      <AlertDialog open={!!toggleConfirm} onOpenChange={() => setToggleConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Status Change</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {toggleConfirm?.is_active ? 'deactivate' : 'activate'} user "{toggleConfirm?.first_name} {toggleConfirm?.last_name}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleToggle}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Password Confirm */}
      <AlertDialog open={!!resetConfirm} onOpenChange={() => setResetConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Password</AlertDialogTitle>
            <AlertDialogDescription>
              {resetConfirm?.email
                ? `A password reset email will be sent to ${resetConfirm.email}. Continue?`
                : 'This user does not have a registered email. Password reset cannot be sent.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            {resetConfirm?.email && <AlertDialogAction onClick={handleReset}>Send Reset Email</AlertDialogAction>}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Change Password Dialog */}
      <Dialog open={pwdOpen} onOpenChange={v => { if (!v) { setPwdOpen(false); setNewPwd(''); setConfirmPwd(''); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Change Password</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Label>New Password</Label>
              <Input type={showPwd ? 'text' : 'password'} value={newPwd} onChange={e => setNewPwd(e.target.value)} className="pr-10" />
              <Button variant="ghost" size="icon" className="absolute right-0 top-6" onClick={() => setShowPwd(!showPwd)}>
                {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <div>
              <Label>Confirm Password</Label>
              <Input type="password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} />
            </div>
            <p className="text-xs text-muted-foreground">8-40 chars, 1 uppercase, 1 number, 1 special character required.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPwdOpen(false)}>Cancel</Button>
            <Button onClick={handleChangePwd} disabled={pwdSaving}>
              {pwdSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Change Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WizEmployerUsers;
