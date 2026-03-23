import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Home, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import {
  getRolesByCategory, saveRole, updateRole, deleteRole, WizRole
} from '@/services/wizManageUsersService';

const CATEGORY_OPTIONS = [
  { value: 'Company', label: 'Company' },
  { value: 'SelfEmployee', label: 'Self Employee' },
];

const WizRoleMaster: React.FC = () => {
  const navigate = useNavigate();
  const [roles, setRoles] = useState<WizRole[]>([]);
  const [loading, setLoading] = useState(true);

  // Add/Edit dialog
  const [formOpen, setFormOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<WizRole | null>(null);
  const [formData, setFormData] = useState({ role_name: '', description: '', role_category: 'Company' });
  const [formSaving, setFormSaving] = useState(false);

  // Delete
  const [deleteConfirm, setDeleteConfirm] = useState<WizRole | null>(null);

  const loadRoles = async () => {
    setLoading(true);
    try {
      const res = await getRolesByCategory();
      setRoles(res.data?.roles || []);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadRoles(); }, []);

  const openAdd = () => {
    setEditingRole(null);
    setFormData({ role_name: '', description: '', role_category: 'Company' });
    setFormOpen(true);
  };

  const openEdit = async (role: WizRole) => {
    setEditingRole(role);
    setFormData({
      role_name: role.role_name,
      description: role.description || '',
      role_category: role.role_category,
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!formData.role_name.trim()) {
      toast.error('Role Name is required');
      return;
    }
    setFormSaving(true);
    try {
      if (editingRole) {
        await updateRole({
          role_id: editingRole.role_id,
          role_name: formData.role_name,
          description: formData.description,
        });
        toast.success('Role updated successfully');
      } else {
        await saveRole({
          role_name: formData.role_name,
          description: formData.description,
          role_category: formData.role_category,
        });
        toast.success('Role created successfully');
      }
      setFormOpen(false);
      loadRoles();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setFormSaving(false);
    }
  };

  const isSystemRole = (roleId: number) => roleId >= 13 && roleId <= 25;

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    if (isSystemRole(deleteConfirm.role_id)) {
      toast.error('You are not allowed to delete system default roles.');
      setDeleteConfirm(null);
      return;
    }
    try {
      await deleteRole(deleteConfirm.role_id);
      toast.success('Role deleted successfully');
      setDeleteConfirm(null);
      loadRoles();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Group by category
  const companyRoles = roles.filter(r => r.role_category === 'Company');
  const seRoles = roles.filter(r => r.role_category === 'SelfEmployee');

  const renderRoleRows = (categoryRoles: WizRole[], category: string) => {
    return (
      <>
        <TableRow className="bg-muted/50">
          <TableCell colSpan={5} className="font-semibold text-sm py-2">{category}</TableCell>
        </TableRow>
        {categoryRoles.map((role, idx) => (
          <TableRow key={role.role_id}>
            <TableCell>{idx + 1}</TableCell>
            <TableCell className={role.role_id <= 6 ? 'text-primary' : ''}>{role.role_id}</TableCell>
            <TableCell className="text-primary font-medium">{role.role_name}</TableCell>
            <TableCell>{role.description || 'N/A'}</TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => openEdit(role)}>
                  <Edit className="h-4 w-4 text-green-600" />
                </Button>
                <Button
                  variant="ghost" size="icon"
                  onClick={() => setDeleteConfirm(role)}
                  disabled={role.role_id <= 6}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </>
    );
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
          <BreadcrumbItem><BreadcrumbPage>Role Master</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>Role List</CardTitle>
          <Button onClick={openAdd} className="gap-1">
            <Plus className="h-4 w-4" /> Add Role
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">S.N.</TableHead>
                <TableHead className="w-24">Role Id</TableHead>
                <TableHead>Role Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-28">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></TableCell></TableRow>
              ) : (
                <>
                  {companyRoles.length > 0 && renderRoleRows(companyRoles, 'Company')}
                  {seRoles.length > 0 && renderRoleRows(seRoles, 'SelfEmployee')}
                  {roles.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No roles found</TableCell></TableRow>
                  )}
                </>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add/Edit Role Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingRole ? 'Update Role' : 'Add New Role'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Role Category <span className="text-destructive">*</span></Label>
              <Select
                value={formData.role_category}
                onValueChange={v => setFormData(p => ({ ...p, role_category: v }))}
                disabled={!!editingRole}
              >
                <SelectTrigger className={editingRole ? 'bg-muted' : ''}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Role Name <span className="text-destructive">*</span></Label>
              <Input value={formData.role_name} onChange={e => setFormData(p => ({ ...p, role_name: e.target.value }))} />
            </div>
            <div>
              <Label>Description</Label>
              <Input value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={formSaving}>
              {formSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              {editingRole ? 'Update' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Role</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteConfirm && deleteConfirm.role_id <= 6
                ? 'You are not allowed to delete system default roles.'
                : `Are you sure you want to delete role "${deleteConfirm?.role_name}"? This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            {deleteConfirm && deleteConfirm.role_id > 6 && (
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default WizRoleMaster;
