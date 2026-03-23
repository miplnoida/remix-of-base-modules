import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { FileText, Save, Home, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  getRolesByCategory, getRolePermissions, saveRolePermissions,
  WizRole, ModulePermission
} from '@/services/wizManageUsersService';

const PERMISSION_COLS = [
  { key: 'view_permission', label: 'View' },
  { key: 'add_permission', label: 'Add' },
  { key: 'update_permission', label: 'Edit' },
  { key: 'delete_permission', label: 'Delete' },
  { key: 'is_preview', label: 'Preview' },
  { key: 'is_print', label: 'Print' },
  { key: 'is_submitted', label: 'Submit' },
  { key: 'is_pay', label: 'Pay' },
] as const;

type PermKey = typeof PERMISSION_COLS[number]['key'];

const WizRolePermission: React.FC = () => {
  const navigate = useNavigate();
  const [roles, setRoles] = useState<WizRole[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [permissions, setPermissions] = useState<ModulePermission[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rolesLoading, setRolesLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await getRolesByCategory();
        setRoles(res.data?.roles || []);
      } catch (err: any) {
        toast.error(err.message);
      } finally {
        setRolesLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!selectedRoleId) { setPermissions([]); return; }
    (async () => {
      setLoading(true);
      try {
        const res = await getRolePermissions(Number(selectedRoleId));
        setPermissions(res.data?.permissions || []);
      } catch (err: any) {
        toast.error(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedRoleId]);

  const togglePermission = (moduleId: number, key: PermKey, value: boolean) => {
    setPermissions(prev => {
      const updated = prev.map(p => {
        if (p.module_id === moduleId) {
          const newP = { ...p, [key]: value };
          // If unchecking view, uncheck all other permissions
          if (key === 'view_permission' && !value) {
            PERMISSION_COLS.forEach(c => { (newP as any)[c.key] = false; });
          }
          return newP;
        }
        return p;
      });

      // Parent-child cascade: if toggling a parent, cascade to children
      const mod = prev.find(m => m.module_id === moduleId);
      if (mod?.is_parent) {
        return updated.map(p => {
          if (p.parent_id === moduleId) {
            const child = { ...p, [key]: value };
            if (key === 'view_permission' && !value) {
              PERMISSION_COLS.forEach(c => { (child as any)[c.key] = false; });
            }
            return child;
          }
          return p;
        });
      }

      return updated;
    });
  };

  const handleSave = async () => {
    if (!selectedRoleId) return;
    setSaving(true);
    try {
      const payload = permissions.map(p => ({
        ...p,
        role_id: Number(selectedRoleId),
      }));
      await saveRolePermissions(payload);
      toast.success('Permissions saved successfully');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Group roles by category for the dropdown
  const companyRoles = roles.filter(r => r.role_category === 'Company');
  const seRoles = roles.filter(r => r.role_category === 'SelfEmployee');

  // Identify parent modules
  const parentIds = new Set(permissions.filter(p => p.is_parent).map(p => p.module_id));

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
          <BreadcrumbItem><BreadcrumbPage>Role Management</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" /> Role Permission
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-end gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-primary">Role Permission</label>
              <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
                <SelectTrigger className="w-[300px]">
                  <SelectValue placeholder="Select a role..." />
                </SelectTrigger>
                <SelectContent>
                  {companyRoles.length > 0 && (
                    <>
                      <SelectItem value="__company_header" disabled className="font-semibold text-xs uppercase text-muted-foreground">Company</SelectItem>
                      {companyRoles.map(r => (
                        <SelectItem key={r.role_id} value={String(r.role_id)}>{r.role_name}</SelectItem>
                      ))}
                    </>
                  )}
                  {seRoles.length > 0 && (
                    <>
                      <SelectItem value="__se_header" disabled className="font-semibold text-xs uppercase text-muted-foreground">Self Employee</SelectItem>
                      {seRoles.map(r => (
                        <SelectItem key={r.role_id} value={String(r.role_id)}>{r.role_name}</SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSave} disabled={saving || !selectedRoleId} className="gap-1">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save
            </Button>
          </div>

          {selectedRoleId && (
            <>
              <h3 className="text-sm font-semibold">List</h3>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[300px]">Module</TableHead>
                      {PERMISSION_COLS.map(c => (
                        <TableHead key={c.key} className="text-center w-20">{c.label}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={9} className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></TableCell></TableRow>
                    ) : permissions.length === 0 ? (
                      <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No modules found</TableCell></TableRow>
                    ) : permissions.map(perm => {
                      const isParent = perm.is_parent;
                      const isDisabled = !isParent && perm.parent_id != null && !permissions.find(p => p.module_id === perm.parent_id)?.view_permission;
                      return (
                        <TableRow key={perm.module_id} className={isParent ? 'bg-green-50 dark:bg-green-950/20 font-semibold' : ''}>
                          <TableCell className={isParent ? 'font-semibold text-primary' : 'pl-8'}>
                            {perm.module_name}
                          </TableCell>
                          {PERMISSION_COLS.map(col => (
                            <TableCell key={col.key} className="text-center">
                              <Checkbox
                                checked={(perm as any)[col.key] || false}
                                onCheckedChange={(v) => togglePermission(perm.module_id, col.key, !!v)}
                                disabled={isDisabled && col.key !== 'view_permission'}
                                className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                              />
                            </TableCell>
                          ))}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default WizRolePermission;
