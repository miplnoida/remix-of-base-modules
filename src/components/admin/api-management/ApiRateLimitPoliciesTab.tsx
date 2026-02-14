import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { RefreshCw, Plus, Pencil } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { toast } from 'sonner';


interface RateLimitPolicy {
  id: string;
  policy_name: string;
  description: string | null;
  requests_per_minute: number;
  requests_per_hour: number | null;
  requests_per_day: number | null;
  burst_limit: number | null;
  is_default: boolean;
  is_active: boolean;
  created_by: string | null;
  updated_at: string;
}

const emptyForm = {
  policy_name: '',
  description: '',
  requests_per_minute: 60,
  requests_per_hour: 3000,
  requests_per_day: 50000,
  burst_limit: 0,
  is_default: false,
  is_active: true,
};

const ApiRateLimitPoliciesTab: React.FC = () => {
  const [policies, setPolicies] = useState<RateLimitPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const { profile } = useSupabaseAuth();

  const fetchPolicies = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('api_rate_limit_policies' as any)
      .select('*')
      .order('is_default', { ascending: false })
      .order('policy_name');

    if (error) toast.error('Failed to load policies');
    else setPolicies((data || []) as unknown as RateLimitPolicy[]);
    setLoading(false);
  };

  useEffect(() => { fetchPolicies(); }, []);

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm);
    setShowDialog(true);
  };

  const openEdit = (policy: RateLimitPolicy) => {
    setEditId(policy.id);
    setForm({
      policy_name: policy.policy_name,
      description: policy.description || '',
      requests_per_minute: policy.requests_per_minute,
      requests_per_hour: policy.requests_per_hour || 0,
      requests_per_day: policy.requests_per_day || 0,
      burst_limit: policy.burst_limit || 0,
      is_default: policy.is_default,
      is_active: policy.is_active,
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.policy_name.trim()) { toast.error('Policy name is required'); return; }
    setSaving(true);
    const userCode = profile?.user_code || 'SYSTEM';
    const payload = {
      policy_name: form.policy_name.trim(),
      description: form.description || null,
      requests_per_minute: form.requests_per_minute,
      requests_per_hour: form.requests_per_hour || null,
      requests_per_day: form.requests_per_day || null,
      burst_limit: form.burst_limit || null,
      is_default: form.is_default,
      is_active: form.is_active,
      updated_at: new Date().toISOString(),
      updated_by: userCode,
    };

    if (editId) {
      const { error } = await supabase.from('api_rate_limit_policies' as any).update(payload as any).eq('id', editId);
      if (error) { toast.error('Failed to update policy'); setSaving(false); return; }

      await supabase.from('api_config_audit_logs' as any).insert({
        entity_type: 'rate_limit_policy', entity_id: editId, action: 'update',
        field_name: 'policy', new_value: JSON.stringify(payload), changed_by: userCode,
      } as any);
      toast.success('Policy updated');
    } else {
      const { error } = await supabase.from('api_rate_limit_policies' as any).insert({ ...payload, created_by: userCode } as any);
      if (error) { toast.error('Failed to create policy'); setSaving(false); return; }
      toast.success('Policy created');
    }

    setSaving(false);
    setShowDialog(false);
    fetchPolicies();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={fetchPolicies}><RefreshCw className="h-4 w-4" /></Button>
          <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" /> New Policy</Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Rate Limit & Throttling Policies</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-8 text-muted-foreground">Loading...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Policy Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Req/Min</TableHead>
                  <TableHead>Req/Hour</TableHead>
                  <TableHead>Req/Day</TableHead>
                  <TableHead>Burst</TableHead>
                  <TableHead>Default</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {policies.map(policy => (
                  <TableRow key={policy.id}>
                    <TableCell className="font-medium">{policy.policy_name}</TableCell>
                    <TableCell className="text-xs max-w-[200px] truncate">{policy.description || '-'}</TableCell>
                    <TableCell>{policy.requests_per_minute}</TableCell>
                    <TableCell>{policy.requests_per_hour || '-'}</TableCell>
                    <TableCell>{policy.requests_per_day || '-'}</TableCell>
                    <TableCell>{policy.burst_limit || '-'}</TableCell>
                    <TableCell>{policy.is_default ? <Badge>Default</Badge> : '-'}</TableCell>
                    <TableCell>
                      <Badge variant={policy.is_active ? 'default' : 'secondary'}>
                        {policy.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" onClick={() => openEdit(policy)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? 'Edit' : 'Create'} Rate Limit Policy</DialogTitle>
            <DialogDescription>Configure throttling rules for API access.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Policy Name *</Label><Input value={form.policy_name} onChange={e => setForm(f => ({ ...f, policy_name: e.target.value }))} /></div>
            <div><Label>Description</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Requests/Min *</Label><Input type="number" value={form.requests_per_minute} onChange={e => setForm(f => ({ ...f, requests_per_minute: parseInt(e.target.value) || 0 }))} /></div>
              <div><Label>Requests/Hour</Label><Input type="number" value={form.requests_per_hour} onChange={e => setForm(f => ({ ...f, requests_per_hour: parseInt(e.target.value) || 0 }))} /></div>
              <div><Label>Requests/Day</Label><Input type="number" value={form.requests_per_day} onChange={e => setForm(f => ({ ...f, requests_per_day: parseInt(e.target.value) || 0 }))} /></div>
              <div><Label>Burst Limit</Label><Input type="number" value={form.burst_limit} onChange={e => setForm(f => ({ ...f, burst_limit: parseInt(e.target.value) || 0 }))} /></div>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch checked={form.is_default} onCheckedChange={v => setForm(f => ({ ...f, is_default: v }))} />
                <Label>Default Policy</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
                <Label>Active</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ApiRateLimitPoliciesTab;
