import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2, Network, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTbOffices } from '@/hooks/useAdminData';
import { useUserCode } from '@/hooks/useUserCode';
import { toast } from 'sonner';
import { formatDisplayDate } from '@/lib/dateFormat';

interface OfficeIPRule {
  id: string;
  office_code: string;
  rule_type: 'single' | 'range';
  single_ip: string | null;
  range_start_ip: string | null;
  range_end_ip: string | null;
  description: string | null;
  is_active: boolean;
  entered_by: string | null;
  entered_at: string;
  modified_by: string | null;
  modified_at: string;
}

const IP_REGEX = /^(\d{1,3}\.){3}\d{1,3}$/;

const OfficeIPManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const { userCode } = useUserCode();
  const { data: offices = [] } = useTbOffices();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<OfficeIPRule | null>(null);
  const [filterOffice, setFilterOffice] = useState<string>('all');

  // Form state
  const [formOffice, setFormOffice] = useState('');
  const [formType, setFormType] = useState<'single' | 'range'>('single');
  const [formSingleIp, setFormSingleIp] = useState('');
  const [formStartIp, setFormStartIp] = useState('');
  const [formEndIp, setFormEndIp] = useState('');
  const [formDescription, setFormDescription] = useState('');

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['office-ip-rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('office_ip_addresses')
        .select('*')
        .order('office_code')
        .order('entered_at', { ascending: false });
      if (error) throw error;
      return (data || []) as OfficeIPRule[];
    },
  });

  const filteredRules = useMemo(() => {
    if (filterOffice === 'all') return rules;
    return rules.filter(r => r.office_code === filterOffice);
  }, [rules, filterOffice]);

  const saveMutation = useMutation({
    mutationFn: async (rule: Partial<OfficeIPRule> & { id?: string }) => {
      if (rule.id) {
        const { error } = await supabase
          .from('office_ip_addresses')
          .update({
            office_code: rule.office_code,
            rule_type: rule.rule_type,
            single_ip: rule.single_ip,
            range_start_ip: rule.range_start_ip,
            range_end_ip: rule.range_end_ip,
            description: rule.description,
            modified_by: userCode || 'SYSTEM',
            modified_at: new Date().toISOString(),
          })
          .eq('id', rule.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('office_ip_addresses')
          .insert({
            office_code: rule.office_code!,
            rule_type: rule.rule_type!,
            single_ip: rule.single_ip,
            range_start_ip: rule.range_start_ip,
            range_end_ip: rule.range_end_ip,
            description: rule.description,
            entered_by: userCode || 'SYSTEM',
            modified_by: userCode || 'SYSTEM',
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['office-ip-rules'] });
      toast.success(editingRule ? 'IP rule updated' : 'IP rule created');
      closeDialog();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('office_ip_addresses')
        .update({ is_active, modified_by: userCode || 'SYSTEM', modified_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['office-ip-rules'] });
      toast.success('Status updated');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('office_ip_addresses').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['office-ip-rules'] });
      toast.success('IP rule deleted');
    },
  });

  const openCreate = () => {
    setEditingRule(null);
    setFormOffice('');
    setFormType('single');
    setFormSingleIp('');
    setFormStartIp('');
    setFormEndIp('');
    setFormDescription('');
    setDialogOpen(true);
  };

  const openEdit = (rule: OfficeIPRule) => {
    setEditingRule(rule);
    setFormOffice(rule.office_code);
    setFormType(rule.rule_type);
    setFormSingleIp(rule.single_ip || '');
    setFormStartIp(rule.range_start_ip || '');
    setFormEndIp(rule.range_end_ip || '');
    setFormDescription(rule.description || '');
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingRule(null);
  };

  const handleSave = () => {
    if (!formOffice) { toast.error('Select an office'); return; }
    if (formType === 'single') {
      if (!IP_REGEX.test(formSingleIp)) { toast.error('Enter a valid IP address'); return; }
    } else {
      if (!IP_REGEX.test(formStartIp) || !IP_REGEX.test(formEndIp)) { toast.error('Enter valid start and end IP addresses'); return; }
    }

    saveMutation.mutate({
      id: editingRule?.id,
      office_code: formOffice,
      rule_type: formType,
      single_ip: formType === 'single' ? formSingleIp : null,
      range_start_ip: formType === 'range' ? formStartIp : null,
      range_end_ip: formType === 'range' ? formEndIp : null,
      description: formDescription || null,
    });
  };

  const officeMap = useMemo(() => {
    const m: Record<string, string> = {};
    offices.forEach((o: any) => { m[o.code] = o.description || o.code; });
    return m;
  }, [offices]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Network className="h-6 w-6" />
            Office IP Address Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Map IP addresses or ranges to office locations for automatic detection during batch creation
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" /> Add IP Rule
        </Button>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3 max-w-xs">
        <Label className="text-xs whitespace-nowrap">Filter Office:</Label>
        <Select value={filterOffice} onValueChange={setFilterOffice}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Offices</SelectItem>
            {offices.map((o: any) => (
              <SelectItem key={o.code} value={o.code}>{o.description || o.code}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Office</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>IP / Range</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Modified</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : filteredRules.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No IP rules found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredRules.map(rule => (
                  <TableRow key={rule.id}>
                    <TableCell className="font-medium">{officeMap[rule.office_code] || rule.office_code}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{rule.rule_type === 'single' ? 'Single IP' : 'Range'}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {rule.rule_type === 'single'
                        ? rule.single_ip
                        : `${rule.range_start_ip} — ${rule.range_end_ip}`}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{rule.description || '—'}</TableCell>
                    <TableCell>
                      <Switch
                        checked={rule.is_active}
                        onCheckedChange={v => toggleMutation.mutate({ id: rule.id, is_active: v })}
                      />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDisplayDate(rule.modified_at)}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(rule)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => {
                            if (confirm('Delete this IP rule?')) deleteMutation.mutate(rule.id);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={v => !v && closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingRule ? 'Edit IP Rule' : 'Add IP Rule'}</DialogTitle>
            <DialogDescription>
              {editingRule ? 'Update the IP address rule for this office.' : 'Map an IP address or range to an office location.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Office</Label>
              <Select value={formOffice} onValueChange={setFormOffice}>
                <SelectTrigger><SelectValue placeholder="Select office" /></SelectTrigger>
                <SelectContent>
                  {offices.map((o: any) => (
                    <SelectItem key={o.code} value={o.code}>{o.description || o.code} ({o.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Rule Type</Label>
              <Select value={formType} onValueChange={v => setFormType(v as 'single' | 'range')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single IP</SelectItem>
                  <SelectItem value="range">IP Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formType === 'single' ? (
              <div className="space-y-1.5">
                <Label className="text-xs">IP Address</Label>
                <Input placeholder="e.g. 192.168.1.100" value={formSingleIp} onChange={e => setFormSingleIp(e.target.value)} />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Start IP</Label>
                  <Input placeholder="e.g. 192.168.1.1" value={formStartIp} onChange={e => setFormStartIp(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">End IP</Label>
                  <Input placeholder="e.g. 192.168.1.254" value={formEndIp} onChange={e => setFormEndIp(e.target.value)} />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs">Description (optional)</Label>
              <Input placeholder="e.g. Main floor workstations" value={formDescription} onChange={e => setFormDescription(e.target.value)} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {editingRule ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OfficeIPManagement;
