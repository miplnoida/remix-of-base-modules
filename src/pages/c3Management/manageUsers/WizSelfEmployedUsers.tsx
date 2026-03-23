import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Users, Edit, RefreshCw, Lock, Eye, EyeOff, Home, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getSEUsers, toggleUserStatus, resetUserPassword, changeUserPassword, SEUser } from '@/services/wizManageUsersService';
import { format, parseISO } from 'date-fns';

const WizSelfEmployedUsers: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<SEUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText] = useState('');

  // Change password
  const [pwdOpen, setPwdOpen] = useState(false);
  const [pwdUserId, setPwdUserId] = useState<number | null>(null);
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [pwdSaving, setPwdSaving] = useState(false);

  // Toggle / Reset
  const [toggleConfirm, setToggleConfirm] = useState<SEUser | null>(null);
  const [resetConfirm, setResetConfirm] = useState<SEUser | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await getSEUsers();
      setUsers(res.data?.users || []);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  const filteredUsers = users.filter(u => {
    if (!searchText) return true;
    const s = searchText.toLowerCase();
    return u.full_name?.toLowerCase().includes(s)
      || u.ssn?.toLowerCase().includes(s)
      || u.email?.toLowerCase().includes(s);
  });

  const handleToggle = async () => {
    if (!toggleConfirm?.user_id) return;
    try {
      const res = await toggleUserStatus(toggleConfirm.user_id);
      toast.success(res.data?.message || 'Status changed');
      setToggleConfirm(null);
      loadUsers();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleReset = async () => {
    if (!resetConfirm?.user_id) return;
    try {
      await resetUserPassword(resetConfirm.user_id);
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
          <BreadcrumbItem><BreadcrumbPage>Self Employee</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" /> Self Employed Users
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>C3 Reg. Date</TableHead>
                <TableHead>SSN</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Mobile</TableHead>
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
                <TableRow key={user.employee_id}>
                  <TableCell className="text-primary font-medium">{user.full_name}</TableCell>
                  <TableCell>{user.inserted_on ? format(parseISO(user.inserted_on), 'dd-MMM-yyyy') : '—'}</TableCell>
                  <TableCell>{user.ssn || '—'}</TableCell>
                  <TableCell>{user.email || '—'}</TableCell>
                  <TableCell>{user.mobile || '—'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge className={user.is_active ? 'bg-green-600 text-white' : 'bg-destructive text-white'}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      <Switch
                        checked={user.is_active}
                        onCheckedChange={() => user.user_id ? setToggleConfirm(user) : toast.error('No linked user account')}
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => user.user_id && navigate(`/c3-management/self-employed-user/${user.user_id}`)}>
                      <Edit className="h-4 w-4 text-green-600" />
                    </Button>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline" size="sm"
                      className="text-destructive border-destructive gap-1"
                      onClick={() => user.user_id ? setResetConfirm(user) : toast.error('No linked user account')}
                    >
                      <RefreshCw className="h-3 w-3" /> Reset
                    </Button>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => {
                      if (user.user_id) { setPwdUserId(user.user_id); setPwdOpen(true); }
                      else toast.error('No linked user account');
                    }}>
                      <Lock className="h-4 w-4 text-blue-600" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Toggle Status Confirm */}
      <AlertDialog open={!!toggleConfirm} onOpenChange={() => setToggleConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Status Change</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {toggleConfirm?.is_active ? 'deactivate' : 'activate'} user "{toggleConfirm?.full_name}"?
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

export default WizSelfEmployedUsers;
