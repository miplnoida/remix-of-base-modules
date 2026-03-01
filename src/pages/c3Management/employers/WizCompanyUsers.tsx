import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Users, Edit, RefreshCw, Lock, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import {
  getCompanyUsers, getCompaniesDropdown, getUserDetails, updateUser,
  toggleUserStatus, changePassword, resetPassword, WizUser, WizCompanyDropdown
} from '@/services/wizAdminApiService';
import { format, parseISO } from 'date-fns';

const ROLE_MAP: Record<number, string> = {
  13: 'Super Admin',
  14: 'Admin',
  15: 'Company User',
  16: 'Company User',
  23: 'Company User',
};

const WizCompanyUsers: React.FC = () => {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const [users, setUsers] = useState<WizUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState<WizCompanyDropdown[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState(companyId || '');

  // Edit user dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editUser, setEditUser] = useState<Record<string, any>>({});
  const [editSaving, setEditSaving] = useState(false);

  // Change password dialog
  const [pwdOpen, setPwdOpen] = useState(false);
  const [pwdUserId, setPwdUserId] = useState<number | null>(null);
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [pwdSaving, setPwdSaving] = useState(false);

  // Toggle status confirm
  const [toggleConfirm, setToggleConfirm] = useState<WizUser | null>(null);

  // Reset password confirm
  const [resetConfirm, setResetConfirm] = useState<WizUser | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, companiesRes] = await Promise.all([
        getCompanyUsers(Number(selectedCompanyId)),
        getCompaniesDropdown(),
      ]);
      setUsers(usersRes.data?.users || []);
      setCompanies(companiesRes.data?.companies || []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [selectedCompanyId]);

  useEffect(() => {
    if (selectedCompanyId) loadData();
  }, [loadData, selectedCompanyId]);

  const handleCompanyChange = (v: string) => {
    setSelectedCompanyId(v);
    navigate(`/c3-management/employer-users/${v}`, { replace: true });
  };

  const openEdit = async (userId: number) => {
    try {
      const res = await getUserDetails(userId);
      const u = res.data?.user;
      if (u) {
        setEditUser({
          user_id: u.id,
          first_name: u.first_name,
          last_name: u.last_name,
          email: u.email,
          role_id: u.role_id,
          company_id: u.company_id,
        });
        setEditOpen(true);
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const saveEdit = async () => {
    setEditSaving(true);
    try {
      await updateUser(editUser.user_id, editUser);
      toast.success('User updated');
      setEditOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setEditSaving(false);
    }
  };

  const handleToggle = async () => {
    if (!toggleConfirm) return;
    try {
      const res = await toggleUserStatus(toggleConfirm.id);
      toast.success(res.data?.message || 'Status toggled');
      setToggleConfirm(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleReset = async () => {
    if (!resetConfirm) return;
    try {
      await resetPassword(resetConfirm.id);
      toast.success('Password reset email sent');
      setResetConfirm(null);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleChangePwd = async () => {
    if (!pwdUserId) return;
    setPwdSaving(true);
    try {
      await changePassword(pwdUserId, newPwd, confirmPwd);
      toast.success('Password changed');
      setPwdOpen(false);
      setNewPwd('');
      setConfirmPwd('');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setPwdSaving(false);
    }
  };

  const selectedCompany = companies.find(c => String(c.id) === selectedCompanyId);

  return (
    <div className="space-y-4">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem><BreadcrumbPage className="cursor-pointer" onClick={() => navigate('/c3-management/employer-details')}>Admin Dashboard</BreadcrumbPage></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbPage>Employers</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" /> Employer Users
          </CardTitle>
          <div className="w-96">
            <Select value={selectedCompanyId} onValueChange={handleCompanyChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select company">
                  {selectedCompany ? `${selectedCompany.company_name} (${selectedCompany.registration_number})` : 'Select company'}
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
        </CardHeader>
        <CardContent>
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
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : users.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No users found</TableCell></TableRow>
              ) : users.map(user => (
                <TableRow key={user.id}>
                  <TableCell className="text-primary font-medium">
                    {user.first_name} {user.last_name}
                  </TableCell>
                  <TableCell>{user.created_at ? format(parseISO(user.created_at), 'dd-MMM-yyyy') : '—'}</TableCell>
                  <TableCell className="text-primary">{user.username}</TableCell>
                  <TableCell>{ROLE_MAP[user.role_id] || 'Company User'}</TableCell>
                  <TableCell>{user.email || '—'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge className={user.is_locked ? 'bg-destructive' : 'bg-green-600'}>
                        {user.is_locked ? 'Inactive' : 'Active'}
                      </Badge>
                      <Switch
                        checked={!user.is_locked}
                        onCheckedChange={() => setToggleConfirm(user)}
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(user.id)}>
                      <Edit className="h-4 w-4 text-green-600" />
                    </Button>
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" className="text-destructive border-destructive" onClick={() => setResetConfirm(user)}>
                      <RefreshCw className="h-3 w-3 mr-1" /> Reset
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
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit User</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>First Name</Label><Input value={editUser.first_name || ''} onChange={e => setEditUser(p => ({ ...p, first_name: e.target.value }))} /></div>
            <div><Label>Last Name</Label><Input value={editUser.last_name || ''} onChange={e => setEditUser(p => ({ ...p, last_name: e.target.value }))} /></div>
            <div className="col-span-2"><Label>Email</Label><Input value={editUser.email || ''} onChange={e => setEditUser(p => ({ ...p, email: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={saveEdit} disabled={editSaving}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Toggle Status Confirm */}
      <AlertDialog open={!!toggleConfirm} onOpenChange={() => setToggleConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Status Change</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {toggleConfirm?.is_locked ? 'activate' : 'deactivate'} user "{toggleConfirm?.first_name} {toggleConfirm?.last_name}"?
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
              A password reset email will be sent to {resetConfirm?.email}. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReset}>Send Reset Email</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Change Password Dialog */}
      <Dialog open={pwdOpen} onOpenChange={setPwdOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Change Password</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Label>New Password</Label>
              <Input type={showPwd ? 'text' : 'password'} value={newPwd} onChange={e => setNewPwd(e.target.value)} />
              <Button variant="ghost" size="icon" className="absolute right-0 top-6" onClick={() => setShowPwd(!showPwd)}>
                {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <div>
              <Label>Confirm Password</Label>
              <Input type="password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} />
            </div>
            <p className="text-xs text-muted-foreground">8-40 chars, uppercase, lowercase, digit, special character required.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPwdOpen(false)}>Cancel</Button>
            <Button onClick={handleChangePwd} disabled={pwdSaving}>Change Password</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WizCompanyUsers;
