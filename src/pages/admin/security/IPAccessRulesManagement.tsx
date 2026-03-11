/**
 * IP Access Rules Management
 * Admin screen for managing IP whitelist rules (single IP and IP range).
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Loader2, Plus, Pencil, Trash2, Shield, Globe, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { logAuditTrail } from '@/services/auditService';

const PAGE_SIZE = 20;

interface IPRule {
  id: string;
  rule_type: 'single' | 'range';
  single_ip: string | null;
  range_start_ip: string | null;
  range_end_ip: string | null;
  is_active: boolean;
  remarks: string | null;
  created_by: string | null;
  created_at: string;
  updated_by: string | null;
  updated_at: string;
}

interface RuleFormData {
  rule_type: 'single' | 'range';
  single_ip: string;
  range_start_ip: string;
  range_end_ip: string;
  is_active: boolean;
  remarks: string;
}

const emptyForm: RuleFormData = {
  rule_type: 'single',
  single_ip: '',
  range_start_ip: '',
  range_end_ip: '',
  is_active: true,
  remarks: '',
};

const IPAccessRulesManagement: React.FC = () => {
  const { user, profile } = useSupabaseAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [editingRule, setEditingRule] = useState<IPRule | null>(null);
  const [formData, setFormData] = useState<RuleFormData>(emptyForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [deleteTarget, setDeleteTarget] = useState<IPRule | null>(null);

  const userCode = profile?.user_code || 'SYSTEM';

  // Fetch rules
  const { data, isLoading } = useQuery({
    queryKey: ['ip-access-rules', page],
    queryFn: async () => {
      const { data, error, count } = await (supabase as any)
        .from('ip_access_rules')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      if (error) throw error;
      return { rules: (data || []) as IPRule[], count: count || 0 };
    },
  });

  // Save rule (create or update) via backend RPC
  const saveMutation = useMutation({
    mutationFn: async (form: RuleFormData & { id?: string }) => {
      const { data, error } = await (supabase.rpc as any)('validate_and_save_ip_rule', {
        p_id: form.id || null,
        p_rule_type: form.rule_type,
        p_single_ip: form.rule_type === 'single' ? form.single_ip.trim() : null,
        p_range_start_ip: form.rule_type === 'range' ? form.range_start_ip.trim() : null,
        p_range_end_ip: form.rule_type === 'range' ? form.range_end_ip.trim() : null,
        p_is_active: form.is_active,
        p_remarks: form.remarks.trim() || null,
        p_user_code: userCode,
      });
      if (error) throw error;
      if (data && !data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: async (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ip-access-rules'] });
      const action = variables.id ? 'update' : 'create';
      toast.success(`IP rule ${action === 'create' ? 'created' : 'updated'} successfully`);

      await logAuditTrail({
        action,
        entityType: 'ip_access_rules',
        entityId: _data?.id,
        module: 'Security',
        userCode,
        userId: user?.id,
        afterValue: variables as any,
        beforeValue: editingRule ? (editingRule as any) : null,
      });

      setShowFormDialog(false);
      setEditingRule(null);
      setFormData(emptyForm);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to save IP rule');
    },
  });

  // Toggle active status
  const toggleMutation = useMutation({
    mutationFn: async (rule: IPRule) => {
      const newActive = !rule.is_active;
      const { error } = await (supabase as any)
        .from('ip_access_rules')
        .update({ is_active: newActive, updated_by: userCode, updated_at: new Date().toISOString() })
        .eq('id', rule.id);
      if (error) throw error;
      return { rule, newActive };
    },
    onSuccess: async ({ rule, newActive }) => {
      queryClient.invalidateQueries({ queryKey: ['ip-access-rules'] });
      toast.success(`Rule ${newActive ? 'enabled' : 'disabled'}`);
      await logAuditTrail({
        action: newActive ? 'enable' : 'disable',
        entityType: 'ip_access_rules',
        entityId: rule.id,
        module: 'Security',
        userCode,
        userId: user?.id,
        beforeValue: { is_active: rule.is_active },
        afterValue: { is_active: newActive },
      });
    },
  });

  // Delete rule
  const deleteMutation = useMutation({
    mutationFn: async (rule: IPRule) => {
      const { error } = await (supabase as any)
        .from('ip_access_rules')
        .delete()
        .eq('id', rule.id);
      if (error) throw error;
      return rule;
    },
    onSuccess: async (rule) => {
      queryClient.invalidateQueries({ queryKey: ['ip-access-rules'] });
      toast.success('IP rule deleted');
      setDeleteTarget(null);
      await logAuditTrail({
        action: 'delete',
        entityType: 'ip_access_rules',
        entityId: rule.id,
        module: 'Security',
        userCode,
        userId: user?.id,
        beforeValue: rule as any,
      });
    },
  });

  const openCreate = () => {
    setEditingRule(null);
    setFormData(emptyForm);
    setFormErrors({});
    setShowFormDialog(true);
  };

  const openEdit = (rule: IPRule) => {
    setEditingRule(rule);
    setFormData({
      rule_type: rule.rule_type,
      single_ip: rule.single_ip || '',
      range_start_ip: rule.range_start_ip || '',
      range_end_ip: rule.range_end_ip || '',
      is_active: rule.is_active,
      remarks: rule.remarks || '',
    });
    setFormErrors({});
    setShowFormDialog(true);
  };

  // Client-side pre-validation (server validates too)
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    const ipRegex = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;

    if (formData.rule_type === 'single') {
      if (!formData.single_ip.trim()) errors.single_ip = 'IP address is required';
      else if (!ipRegex.test(formData.single_ip.trim())) errors.single_ip = 'Invalid IP format (e.g. 192.168.1.1)';
    } else {
      if (!formData.range_start_ip.trim()) errors.range_start_ip = 'Start IP is required';
      else if (!ipRegex.test(formData.range_start_ip.trim())) errors.range_start_ip = 'Invalid IP format';
      if (!formData.range_end_ip.trim()) errors.range_end_ip = 'End IP is required';
      else if (!ipRegex.test(formData.range_end_ip.trim())) errors.range_end_ip = 'Invalid IP format';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;
    saveMutation.mutate({ ...formData, id: editingRule?.id });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            IP Access Control
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage allowed IP addresses and ranges. Only whitelisted IPs can access the application when rules are active.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add IP Rule
        </Button>
      </div>

      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="py-3 flex items-start gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
          <p className="text-sm text-muted-foreground">
            <strong>Important:</strong> If no active rules exist, all IPs are allowed. Once you add an active rule, only matching IPs will have access. Make sure to add your own IP before activating rules.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>IP / Range</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Remarks</TableHead>
                    <TableHead>Created By</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.rules.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell>
                        <Badge variant={rule.rule_type === 'single' ? 'default' : 'secondary'}>
                          {rule.rule_type === 'single' ? 'Single IP' : 'Range'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {rule.rule_type === 'single'
                          ? rule.single_ip
                          : `${rule.range_start_ip} — ${rule.range_end_ip}`}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={rule.is_active}
                            onCheckedChange={() => toggleMutation.mutate(rule)}
                            disabled={toggleMutation.isPending}
                          />
                          <span className={`text-sm ${rule.is_active ? 'text-primary' : 'text-muted-foreground'}`}>
                            {rule.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm">{rule.remarks || '—'}</TableCell>
                      <TableCell className="text-xs">{rule.created_by || '—'}</TableCell>
                      <TableCell className="text-xs">{format(new Date(rule.updated_at), 'dd/MM/yyyy HH:mm')}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(rule)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(rule)} className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!data?.rules || data.rules.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12">
                        <Globe className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
                        <p className="text-muted-foreground">No IP rules configured. All IPs are currently allowed.</p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <div className="flex items-center justify-between p-4 border-t">
                <div className="text-sm text-muted-foreground">{data?.count || 0} total rules</div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={(page + 1) * PAGE_SIZE >= (data?.count || 0)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <Dialog open={showFormDialog} onOpenChange={setShowFormDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingRule ? 'Edit IP Rule' : 'Add IP Rule'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Rule Type</Label>
              <Select value={formData.rule_type} onValueChange={(v) => setFormData(d => ({ ...d, rule_type: v as 'single' | 'range' }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single IP Address</SelectItem>
                  <SelectItem value="range">IP Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.rule_type === 'single' ? (
              <div>
                <Label>IP Address</Label>
                <Input
                  placeholder="e.g. 192.168.1.100"
                  value={formData.single_ip}
                  onChange={(e) => {
                    setFormData(d => ({ ...d, single_ip: e.target.value }));
                    setFormErrors(err => ({ ...err, single_ip: '' }));
                  }}
                  className={formErrors.single_ip ? 'border-destructive' : ''}
                />
                {formErrors.single_ip && <p className="text-xs text-destructive mt-1">{formErrors.single_ip}</p>}
              </div>
            ) : (
              <>
                <div>
                  <Label>Start IP</Label>
                  <Input
                    placeholder="e.g. 192.168.1.1"
                    value={formData.range_start_ip}
                    onChange={(e) => {
                      setFormData(d => ({ ...d, range_start_ip: e.target.value }));
                      setFormErrors(err => ({ ...err, range_start_ip: '' }));
                    }}
                    className={formErrors.range_start_ip ? 'border-destructive' : ''}
                  />
                  {formErrors.range_start_ip && <p className="text-xs text-destructive mt-1">{formErrors.range_start_ip}</p>}
                </div>
                <div>
                  <Label>End IP</Label>
                  <Input
                    placeholder="e.g. 192.168.1.255"
                    value={formData.range_end_ip}
                    onChange={(e) => {
                      setFormData(d => ({ ...d, range_end_ip: e.target.value }));
                      setFormErrors(err => ({ ...err, range_end_ip: '' }));
                    }}
                    className={formErrors.range_end_ip ? 'border-destructive' : ''}
                  />
                  {formErrors.range_end_ip && <p className="text-xs text-destructive mt-1">{formErrors.range_end_ip}</p>}
                </div>
              </>
            )}

            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(v) => setFormData(d => ({ ...d, is_active: v }))}
              />
              <Label>Active</Label>
            </div>

            <div>
              <Label>Remarks</Label>
              <Textarea
                placeholder="Optional notes about this rule"
                value={formData.remarks}
                onChange={(e) => setFormData(d => ({ ...d, remarks: e.target.value }))}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFormDialog(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingRule ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete IP Rule</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this IP rule? 
              {deleteTarget?.rule_type === 'single' 
                ? ` (${deleteTarget?.single_ip})` 
                : ` (${deleteTarget?.range_start_ip} — ${deleteTarget?.range_end_ip})`}
              <br />This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default IPAccessRulesManagement;
