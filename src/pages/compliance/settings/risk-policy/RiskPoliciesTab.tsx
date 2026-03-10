import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Plus, Eye, Edit, CheckCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface PolicyRow {
  id: string;
  policy_code: string;
  policy_name: string;
  description: string | null;
  effective_from: string;
  effective_to: string | null;
  status: string;
  update_frequency: string;
  activated_by: string | null;
  activated_at: string | null;
  created_at: string;
}

interface PolicyFactorRow {
  id: string;
  policy_id: string;
  factor_id: string;
  weight_override: number | null;
  is_active: boolean;
}

interface FactorRow {
  id: string;
  factor_code: string;
  factor_name: string;
  weight: number;
}

export default function RiskPoliciesTab() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<PolicyRow | null>(null);
  const [formData, setFormData] = useState<Partial<PolicyRow>>({});
  const [selectedFactors, setSelectedFactors] = useState<Map<string, number>>(new Map());

  // Load policies
  const { data: policies = [], isLoading } = useQuery({
    queryKey: ['ce_risk_policies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ce_risk_policies')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as PolicyRow[];
    },
  });

  // Load all factors for selection
  const { data: allFactors = [] } = useQuery({
    queryKey: ['ce_risk_config'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ce_risk_config').select('id, factor_code, factor_name, weight').order('weight', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as FactorRow[];
    },
  });

  // Load policy-factor links for count display
  const { data: policyFactors = [] } = useQuery({
    queryKey: ['ce_risk_policy_factors'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ce_risk_policy_factors').select('*');
      if (error) throw error;
      return (data || []) as unknown as PolicyFactorRow[];
    },
  });

  const getFactorCount = (policyId: string) =>
    policyFactors.filter(pf => pf.policy_id === policyId && pf.is_active).length;

  // Create / Update policy
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editingPolicy) {
        // Update
        const { error } = await supabase
          .from('ce_risk_policies')
          .update({
            policy_name: formData.policy_name,
            description: formData.description,
            effective_from: formData.effective_from,
            effective_to: formData.effective_to,
            update_frequency: formData.update_frequency,
          } as any)
          .eq('id', editingPolicy.id);
        if (error) throw error;

        // Update factor links
        await supabase.from('ce_risk_policy_factors').delete().eq('policy_id', editingPolicy.id);
        const inserts = Array.from(selectedFactors.entries()).map(([factorId, weight]) => ({
          policy_id: editingPolicy.id,
          factor_id: factorId,
          weight_override: weight,
          is_active: true,
        }));
        if (inserts.length > 0) {
          const { error: linkError } = await supabase.from('ce_risk_policy_factors').insert(inserts as any);
          if (linkError) throw linkError;
        }
      } else {
        // Create
        const code = `RP-${new Date().getFullYear()}-${String(policies.length + 1).padStart(3, '0')}`;
        const { data: newPolicy, error } = await supabase
          .from('ce_risk_policies')
          .insert({
            policy_code: code,
            policy_name: formData.policy_name,
            description: formData.description,
            effective_from: formData.effective_from,
            effective_to: formData.effective_to || null,
            update_frequency: formData.update_frequency || 'WEEKLY',
            status: 'DRAFT',
          } as any)
          .select()
          .single();
        if (error) throw error;

        // Insert factor links
        const inserts = Array.from(selectedFactors.entries()).map(([factorId, weight]) => ({
          policy_id: (newPolicy as any).id,
          factor_id: factorId,
          weight_override: weight,
          is_active: true,
        }));
        if (inserts.length > 0) {
          const { error: linkError } = await supabase.from('ce_risk_policy_factors').insert(inserts as any);
          if (linkError) throw linkError;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ce_risk_policies'] });
      queryClient.invalidateQueries({ queryKey: ['ce_risk_policy_factors'] });
      toast.success(editingPolicy ? 'Policy updated' : 'Policy created');
      setDialogOpen(false);
    },
    onError: () => toast.error('Failed to save policy'),
  });

  // Activate policy
  const activateMutation = useMutation({
    mutationFn: async (id: string) => {
      // Retire all active
      await supabase
        .from('ce_risk_policies')
        .update({ status: 'RETIRED', effective_to: new Date().toISOString().split('T')[0] } as any)
        .eq('status', 'ACTIVE');
      // Activate selected
      const { error } = await supabase
        .from('ce_risk_policies')
        .update({ status: 'ACTIVE', activated_at: new Date().toISOString(), activated_by: 'system' } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ce_risk_policies'] });
      toast.success('Policy activated');
    },
    onError: () => toast.error('Failed to activate policy'),
  });

  const handleCreate = () => {
    setEditingPolicy(null);
    setFormData({
      policy_name: '',
      description: '',
      effective_from: new Date().toISOString().split('T')[0],
      effective_to: null,
      update_frequency: 'WEEKLY',
    });
    // Pre-select all factors with their default weights
    const map = new Map<string, number>();
    allFactors.forEach(f => map.set(f.id, Number(f.weight)));
    setSelectedFactors(map);
    setDialogOpen(true);
  };

  const handleEdit = async (policy: PolicyRow) => {
    setEditingPolicy(policy);
    setFormData({ ...policy });
    // Load existing factor links
    const links = policyFactors.filter(pf => pf.policy_id === policy.id);
    const map = new Map<string, number>();
    links.forEach(l => {
      const factor = allFactors.find(f => f.id === l.factor_id);
      map.set(l.factor_id, l.weight_override ?? (factor ? Number(factor.weight) : 10));
    });
    setSelectedFactors(map);
    setDialogOpen(true);
  };

  const toggleFactor = (factorId: string, defaultWeight: number) => {
    const newMap = new Map(selectedFactors);
    if (newMap.has(factorId)) {
      newMap.delete(factorId);
    } else {
      newMap.set(factorId, defaultWeight);
    }
    setSelectedFactors(newMap);
  };

  const updateFactorWeight = (factorId: string, weight: number) => {
    const newMap = new Map(selectedFactors);
    newMap.set(factorId, weight);
    setSelectedFactors(newMap);
  };

  const activePolicy = policies.find(p => p.status === 'ACTIVE');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Risk Policies</h3>
          <p className="text-sm text-muted-foreground">
            Versioned configurations that select which factors to use and their weight overrides
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" /> Create New Policy
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Policy Code</TableHead>
              <TableHead>Policy Name</TableHead>
              <TableHead>Effective From</TableHead>
              <TableHead>Effective To</TableHead>
              <TableHead># Factors</TableHead>
              <TableHead>Frequency</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {policies.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No risk policies found. Create one to get started.
                </TableCell>
              </TableRow>
            ) : (
              policies.map((policy) => (
                <TableRow key={policy.id}>
                  <TableCell className="font-medium font-mono">{policy.policy_code}</TableCell>
                  <TableCell>{policy.policy_name}</TableCell>
                  <TableCell className="text-sm">{format(new Date(policy.effective_from), 'MMM dd, yyyy')}</TableCell>
                  <TableCell className="text-sm">
                    {policy.effective_to ? format(new Date(policy.effective_to), 'MMM dd, yyyy') : 'Current'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{getFactorCount(policy.id)} factors</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{policy.update_frequency}</Badge>
                  </TableCell>
                  <TableCell>
                    {policy.status === 'ACTIVE' ? (
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Active</Badge>
                    ) : policy.status === 'DRAFT' ? (
                      <Badge variant="secondary">Draft</Badge>
                    ) : (
                      <Badge variant="outline">Retired</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(policy)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      {policy.status !== 'ACTIVE' && (
                        <Button variant="ghost" size="sm" onClick={() => activateMutation.mutate(policy.id)} title="Activate policy">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Active Policy Summary */}
      {activePolicy && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 dark:bg-green-950/20 dark:border-green-800">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-green-900 dark:text-green-100">
                Active Policy: {activePolicy.policy_name}
              </h4>
              <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                This policy is currently used to calculate employer risk scores with {getFactorCount(activePolicy.id)} active factors, updated {activePolicy.update_frequency.toLowerCase()}.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPolicy ? 'Edit Risk Policy' : 'Create New Risk Policy'}</DialogTitle>
            <DialogDescription>A policy selects which risk factors are used and can override their weights</DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Policy Name *</Label>
                <Input
                  value={formData.policy_name || ''}
                  onChange={(e) => setFormData({ ...formData, policy_name: e.target.value })}
                  placeholder="e.g., 2026 Standard Risk Policy"
                />
              </div>
              <div>
                <Label>Update Frequency</Label>
                <Select
                  value={formData.update_frequency || 'WEEKLY'}
                  onValueChange={(v) => setFormData({ ...formData, update_frequency: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DAILY">Daily</SelectItem>
                    <SelectItem value="WEEKLY">Weekly</SelectItem>
                    <SelectItem value="MONTHLY">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="What does this policy cover?"
                rows={2}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Effective From *</Label>
                <Input
                  type="date"
                  value={formData.effective_from || ''}
                  onChange={(e) => setFormData({ ...formData, effective_from: e.target.value })}
                />
              </div>
              <div>
                <Label>Effective To (optional)</Label>
                <Input
                  type="date"
                  value={formData.effective_to || ''}
                  onChange={(e) => setFormData({ ...formData, effective_to: e.target.value || null })}
                />
              </div>
            </div>

            <Separator />

            {/* Factor Selection */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">Select Risk Factors</h3>
                <span className="text-sm text-muted-foreground">
                  {selectedFactors.size} selected | Total override weight: {Array.from(selectedFactors.values()).reduce((s, w) => s + w, 0)}%
                </span>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-2">
                {allFactors.map((factor) => {
                  const isSelected = selectedFactors.has(factor.id);
                  return (
                    <div
                      key={factor.id}
                      className={`p-3 rounded-lg border transition-all ${isSelected ? 'border-primary bg-primary/5' : 'hover:border-primary/30'}`}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleFactor(factor.id, Number(factor.weight))}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs font-mono">{factor.factor_code}</Badge>
                            <span className="font-medium text-sm">{factor.factor_name}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-muted-foreground">Default: {factor.weight}%</span>
                          {isSelected && (
                            <>
                              <span className="text-muted-foreground">→</span>
                              <Input
                                type="number"
                                className="w-20 h-8"
                                value={selectedFactors.get(factor.id) || 0}
                                onChange={(e) => updateFactorWeight(factor.id, Number(e.target.value))}
                                min={0}
                                max={50}
                              />
                              <span className="text-muted-foreground">%</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving...' : editingPolicy ? 'Update Policy' : 'Create Policy'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
