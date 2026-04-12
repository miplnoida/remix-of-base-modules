import React, { useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Plus, Edit, Trash2, ChevronDown, ChevronUp, Loader2, Ban, GripVertical, Link2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useUserCode } from '@/hooks/useUserCode';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import {
  withAuditFields,
  checkDuplicateViolationType,
  softDeactivateViolationType,
  formatAuditTimestamp,
  validationToastConfig,
} from '@/services/complianceSettingsService';

interface ViolationType {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category: string | null;
  severity_default: string | null;
  auto_detect: boolean | null;
  grace_period_days: number | null;
  applicable_funds: string[] | null;
  is_active: boolean | null;
  sort_order: number | null;
  created_by?: string;
  updated_by?: string;
  updated_at?: string;
}

interface LinkedRules {
  detection: { rule_code: string; name: string }[];
  calculation: { rule_code: string; name: string }[];
  escalation: { rule_code: string; name: string }[];
}

// UPPERCASE to match DB values after standardization
const CATEGORIES = ['FILING', 'PAYMENT', 'REGISTRATION', 'CONTRIBUTION', 'DECLARATION', 'LEGAL', 'AUDIT', 'FRAUD', 'OTHER'];
const SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const FUNDS = ['SS', 'LV', 'EI', 'SV', 'PE'];

const CATEGORY_LABELS: Record<string, string> = {
  FILING: 'Filing', PAYMENT: 'Payment', REGISTRATION: 'Registration',
  CONTRIBUTION: 'Contribution', DECLARATION: 'Declaration', LEGAL: 'Legal',
  AUDIT: 'Audit', FRAUD: 'Fraud', OTHER: 'Other',
};
const SEVERITY_LABELS: Record<string, string> = {
  LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High', CRITICAL: 'Critical',
};
const FUND_LABELS: Record<string, string> = {
  SS: 'Social Security', LV: 'Levy', EI: 'Employment Injury', SV: 'Severance', PE: 'Pension',
};

const emptyForm = {
  code: '',
  name: '',
  description: '',
  category: 'FILING',
  severity_default: 'MEDIUM',
  auto_detect: false,
  grace_period_days: '0',
  applicable_funds: [] as string[],
  is_active: true,
  sort_order: '0',
};

function generateNextCode(existingCodes: string[]): string {
  const nums = existingCodes
    .filter(c => c.startsWith('VT-'))
    .map(c => parseInt(c.replace('VT-', ''), 10))
    .filter(n => !isNaN(n));
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `VT-${String(next).padStart(3, '0')}`;
}

const ViolationTypes = () => {
  const [expandedCode, setExpandedCode] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ViolationType | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<ViolationType | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { userCode } = useUserCode();

  const { data: violationTypes = [], isLoading } = useQuery({
    queryKey: ['ce_violation_types'],
    queryFn: async (): Promise<ViolationType[]> => {
      const { data, error } = await supabase
        .from('ce_violation_types')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('code', { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as ViolationType[];
    },
  });

  // Fetch linked rules for expanded rows
  const { data: linkedRulesMap = {} } = useQuery({
    queryKey: ['ce_linked_rules_map'],
    queryFn: async (): Promise<Record<string, LinkedRules>> => {
      const [drRes, crRes, erRes] = await Promise.all([
        supabase.from('ce_detection_rules').select('rule_code, name, violation_type_id'),
        supabase.from('ce_calculation_rules').select('rule_code, name, violation_type_id'),
        supabase.from('ce_escalation_rules').select('rule_code, name, violation_type_id'),
      ]);
      const map: Record<string, LinkedRules> = {};
      const ensure = (id: string) => {
        if (!map[id]) map[id] = { detection: [], calculation: [], escalation: [] };
      };
      (drRes.data || []).forEach((r: any) => { if (r.violation_type_id) { ensure(r.violation_type_id); map[r.violation_type_id].detection.push({ rule_code: r.rule_code, name: r.name }); } });
      (crRes.data || []).forEach((r: any) => { if (r.violation_type_id) { ensure(r.violation_type_id); map[r.violation_type_id].calculation.push({ rule_code: r.rule_code, name: r.name }); } });
      (erRes.data || []).forEach((r: any) => { if (r.violation_type_id) { ensure(r.violation_type_id); map[r.violation_type_id].escalation.push({ rule_code: r.rule_code, name: r.name }); } });
      return map;
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const payload = withAuditFields({ is_active }, userCode || 'SYS', false);
      const { error } = await supabase.from('ce_violation_types').update(payload as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ce_violation_types'] });
      toast.success('Violation type updated');
    },
    onError: () => toast.error('Failed to update'),
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const isNew = !editing;
      const dupName = await checkDuplicateViolationType('name', data.name, editing?.id);
      if (dupName) throw new Error(`A violation type named "${data.name}" already exists.`);
      const dupCode = await checkDuplicateViolationType('code', data.code, editing?.id);
      if (dupCode) throw new Error(`Code "${data.code}" is already in use.`);

      const payload = withAuditFields(data, userCode || 'SYS', isNew);
      if (editing) {
        const { error } = await supabase.from('ce_violation_types').update(payload as any).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('ce_violation_types').insert(payload as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ce_violation_types'] });
      toast.success(editing ? 'Violation type updated' : 'Violation type created');
      setDialogOpen(false);
      setEditing(null);
    },
    onError: (err: any) => toast.error('Failed to save', { description: err.message }),
  });

  const deactivateMutation = useMutation({
    mutationFn: async (id: string) => {
      await softDeactivateViolationType(id, userCode || 'SYS');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ce_violation_types'] });
      toast.success('Violation type deactivated');
      setDeactivateTarget(null);
    },
    onError: (err: any) => toast.error('Failed to deactivate', { description: err.message }),
  });

  const reorderMutation = useMutation({
    mutationFn: async (updates: { id: string; sort_order: number }[]) => {
      // Batch update sort_order
      for (const u of updates) {
        const { error } = await supabase
          .from('ce_violation_types')
          .update({ sort_order: u.sort_order, updated_by: userCode || 'SYS', updated_at: new Date().toISOString() } as any)
          .eq('id', u.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ce_violation_types'] });
    },
    onError: () => toast.error('Failed to save order'),
  });

  const openAdd = () => {
    setEditing(null);
    setForm({
      ...emptyForm,
      code: generateNextCode(violationTypes.map(v => v.code)),
      sort_order: String(Math.max(...violationTypes.map(v => v.sort_order ?? 0), 0) + 1),
    });
    setDialogOpen(true);
  };

  const openEdit = (vt: ViolationType) => {
    setEditing(vt);
    setForm({
      code: vt.code,
      name: vt.name,
      description: vt.description || '',
      category: vt.category || 'FILING',
      severity_default: vt.severity_default || 'MEDIUM',
      auto_detect: vt.auto_detect ?? false,
      grace_period_days: String(vt.grace_period_days ?? 0),
      applicable_funds: vt.applicable_funds || [],
      is_active: vt.is_active ?? true,
      sort_order: String(vt.sort_order ?? 0),
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name) {
      toast.error('Please check the form for valid information!', {
        description: 'Name is required.',
        ...validationToastConfig,
      });
      return;
    }
    if (!form.code) {
      toast.error('Please check the form for valid information!', {
        description: 'Code is required.',
        ...validationToastConfig,
      });
      return;
    }
    saveMutation.mutate({
      code: form.code,
      name: form.name,
      description: form.description || null,
      category: form.category,
      severity_default: form.severity_default,
      auto_detect: form.auto_detect,
      grace_period_days: Number(form.grace_period_days) || 0,
      applicable_funds: form.applicable_funds.length > 0 ? form.applicable_funds : null,
      is_active: form.is_active,
      sort_order: Number(form.sort_order) || 0,
    });
  };

  const filteredTypes = violationTypes.filter(vt => !selectedCategory || vt.category === selectedCategory);

  const handleDragEnd = useCallback((result: DropResult) => {
    if (!result.destination || result.source.index === result.destination.index) return;
    const reordered = Array.from(filteredTypes);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    const updates = reordered.map((vt, idx) => ({ id: vt.id, sort_order: idx + 1 }));
    reorderMutation.mutate(updates);
  }, [filteredTypes, reorderMutation]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const categories = [...new Set(violationTypes.map(v => v.category).filter(Boolean))];

  const getSeverityVariant = (sev: string | null) => {
    switch (sev) {
      case 'CRITICAL': return 'destructive';
      case 'HIGH': return 'default';
      default: return 'secondary';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-semibold text-foreground">Violation Types</h1>
          </div>
          <p className="text-muted-foreground">Configure violation type definitions used across the compliance module</p>
        </div>
        <Button className="gap-2" onClick={openAdd}><Plus className="h-4 w-4" />Add Violation Type</Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge
          variant={selectedCategory === null ? 'default' : 'outline'}
          className="py-1 px-3 cursor-pointer select-none"
          onClick={() => setSelectedCategory(null)}
        >
          All: {violationTypes.length}
        </Badge>
        {categories.map(cat => (
          <Badge
            key={cat}
            variant={selectedCategory === cat ? 'default' : 'outline'}
            className="py-1 px-3 cursor-pointer select-none"
            onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
          >
            {CATEGORY_LABELS[cat!] || cat}: {violationTypes.filter(v => v.category === cat).length}
          </Badge>
        ))}
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="violation-types">
          {(provided) => (
            <div className="grid gap-3" ref={provided.innerRef} {...provided.droppableProps}>
              {filteredTypes.map((vt, index) => {
                const linked = linkedRulesMap[vt.id];
                const totalLinked = linked ? linked.detection.length + linked.calculation.length + linked.escalation.length : 0;
                return (
                  <Draggable key={vt.id} draggableId={vt.id} index={index}>
                    {(dragProvided, snapshot) => (
                      <Card
                        ref={dragProvided.innerRef}
                        {...dragProvided.draggableProps}
                        className={`hover:shadow-sm transition-shadow ${snapshot.isDragging ? 'shadow-lg ring-2 ring-primary/20' : ''}`}
                      >
                        <CardContent className="py-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div {...dragProvided.dragHandleProps} className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground">
                                <GripVertical className="h-4 w-4" />
                              </div>
                              <Badge variant="outline" className="font-mono text-xs shrink-0">{vt.code}</Badge>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-foreground">{vt.name}</p>
                                  <Badge variant="secondary" className="text-[10px]">{CATEGORY_LABELS[vt.category!] || vt.category}</Badge>
                                  {vt.auto_detect && <Badge variant="outline" className="text-[10px] text-primary border-primary/30">Auto-Detect</Badge>}
                                  {totalLinked > 0 && (
                                    <Badge variant="outline" className="text-[10px] gap-1">
                                      <Link2 className="h-3 w-3" />{totalLinked} rule{totalLinked > 1 ? 's' : ''}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5 truncate">{vt.description}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 ml-4">
                              <div className="flex gap-1">
                                {(vt.applicable_funds || []).map(f => <Badge key={f} variant="outline" className="text-[10px] h-5">{f}</Badge>)}
                              </div>
                              <Badge variant={getSeverityVariant(vt.severity_default)} className="text-[10px]">
                                {SEVERITY_LABELS[vt.severity_default!] || vt.severity_default}
                              </Badge>
                              <Switch
                                checked={vt.is_active ?? false}
                                onCheckedChange={(checked) => toggleMutation.mutate({ id: vt.id, is_active: checked })}
                              />
                              <Button variant="ghost" size="icon" onClick={() => setExpandedCode(expandedCode === vt.code ? null : vt.code)}>
                                {expandedCode === vt.code ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => openEdit(vt)}><Edit className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => setDeactivateTarget(vt)}><Ban className="h-4 w-4 text-destructive" /></Button>
                            </div>
                          </div>
                          {expandedCode === vt.code && (
                            <div className="mt-3 pt-3 border-t border-border space-y-3">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div><span className="text-muted-foreground">Category:</span> <span className="font-medium text-foreground">{CATEGORY_LABELS[vt.category!] || vt.category}</span></div>
                                <div><span className="text-muted-foreground">Grace Period:</span> <span className="font-medium text-foreground">{vt.grace_period_days} days</span></div>
                                <div><span className="text-muted-foreground">Auto-Detection:</span> <span className="font-medium text-foreground">{vt.auto_detect ? 'Yes' : 'No (Manual)'}</span></div>
                                <div><span className="text-muted-foreground">Applicable Funds:</span> <span className="font-medium text-foreground">{(vt.applicable_funds || []).map(f => FUND_LABELS[f] || f).join(', ') || 'None'}</span></div>
                                <div><span className="text-muted-foreground">Sort Order:</span> <span className="font-medium text-foreground">{vt.sort_order}</span></div>
                                <div><span className="text-muted-foreground">Created by:</span> <span className="font-medium text-foreground">{vt.created_by || '-'}</span></div>
                                <div><span className="text-muted-foreground">Last updated:</span> <span className="font-medium text-foreground">{formatAuditTimestamp(vt.updated_at || null)}</span></div>
                                <div><span className="text-muted-foreground">Updated by:</span> <span className="font-medium text-foreground">{vt.updated_by || '-'}</span></div>
                              </div>
                              {linked && totalLinked > 0 && (
                                <div className="pt-2 border-t border-border/50 space-y-1.5">
                                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Link2 className="h-3 w-3" /> Linked Rules</p>
                                  <div className="flex flex-wrap gap-1.5">
                                    {linked.detection.map(r => (
                                      <Badge key={r.rule_code} variant="outline" className="text-[10px] gap-1">
                                        <span className="text-primary font-mono">{r.rule_code}</span> {r.name}
                                      </Badge>
                                    ))}
                                    {linked.calculation.map(r => (
                                      <Badge key={r.rule_code} variant="outline" className="text-[10px] gap-1">
                                        <span className="text-orange-600 font-mono">{r.rule_code}</span> {r.name}
                                      </Badge>
                                    ))}
                                    {linked.escalation.map(r => (
                                      <Badge key={r.rule_code} variant="outline" className="text-[10px] gap-1">
                                        <span className="text-red-600 font-mono">{r.rule_code}</span> {r.name}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {(!linked || totalLinked === 0) && (
                                <div className="pt-2 border-t border-border/50">
                                  <p className="text-xs text-muted-foreground italic">No linked rules — this violation type is not referenced by any detection, calculation, or escalation rule.</p>
                                </div>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}
                  </Draggable>
                );
              })}
              {provided.placeholder}
              {violationTypes.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">No violation types configured</div>
              )}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={v => { setDialogOpen(v); if (!v) setEditing(null); }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Violation Type' : 'Add Violation Type'}</DialogTitle>
            <DialogDescription>Define a compliance violation type with its detection rules and severity.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Code</Label>
                <Input value={form.code} readOnly className="bg-muted text-muted-foreground cursor-not-allowed font-mono" />
                <p className="text-[11px] text-muted-foreground">Auto-generated</p>
              </div>
              <div className="space-y-1.5">
                <Label>Sort Order</Label>
                <Input type="number" value={form.sort_order} onChange={e => setForm(p => ({ ...p, sort_order: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Name <span className="text-destructive">*</span></Label>
              <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Late C3 Filing" />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Describe this violation type..." rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{CATEGORY_LABELS[c] || c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Default Severity</Label>
                <Select value={form.severity_default} onValueChange={v => setForm(p => ({ ...p, severity_default: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select severity" /></SelectTrigger>
                  <SelectContent>
                    {SEVERITIES.map(s => <SelectItem key={s} value={s}>{SEVERITY_LABELS[s] || s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Grace Period (days)</Label>
              <Input type="number" value={form.grace_period_days} onChange={e => setForm(p => ({ ...p, grace_period_days: e.target.value }))} placeholder="0" />
              <p className="text-[11px] text-muted-foreground">Days after deadline before violation is triggered</p>
            </div>
            <div className="space-y-2">
              <Label>Applicable Funds</Label>
              <p className="text-[11px] text-muted-foreground">Select all funds this violation type applies to</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {FUNDS.map(f => {
                  const isSelected = form.applicable_funds.includes(f);
                  return (
                    <label
                      key={f}
                      className={`flex items-center gap-3 p-2.5 rounded-md border cursor-pointer transition-colors ${
                        isSelected
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-muted-foreground/30'
                      }`}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => {
                          setForm(p => ({
                            ...p,
                            applicable_funds: checked
                              ? [...p.applicable_funds, f]
                              : p.applicable_funds.filter(x => x !== f),
                          }));
                        }}
                      />
                      <div>
                        <span className="text-sm font-medium">{f}</span>
                        <span className="text-xs text-muted-foreground ml-1.5">({FUND_LABELS[f] || f})</span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center gap-6 pt-2">
              <div className="flex items-center gap-2">
                <Checkbox checked={form.auto_detect} onCheckedChange={c => setForm(p => ({ ...p, auto_detect: !!c }))} />
                <Label className="font-normal text-sm">Auto-Detect (via Rule Engine)</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox checked={form.is_active} onCheckedChange={c => setForm(p => ({ ...p, is_active: !!c }))} />
                <Label className="font-normal text-sm">Active</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate Confirmation */}
      <AlertDialog open={!!deactivateTarget} onOpenChange={v => { if (!v) setDeactivateTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Violation Type</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate <strong>{deactivateTarget?.code} - {deactivateTarget?.name}</strong>? It can be reactivated later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deactivateTarget && deactivateMutation.mutate(deactivateTarget.id)}
            >
              {deactivateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ViolationTypes;
