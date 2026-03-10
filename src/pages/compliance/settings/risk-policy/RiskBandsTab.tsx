import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Edit, Loader2, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface BandRow {
  id: string;
  policy_id: string;
  band_name: string;
  score_range_min: number;
  score_range_max: number;
  color: string;
  audit_frequency: string;
  mandatory_audit: boolean;
  auto_select_enabled: boolean;
  auto_select_type: string | null;
  auto_select_value: number | null;
  follow_up_intensity: string;
  escalation_enabled: boolean;
  escalation_months_in_band: number;
  escalation_action: string | null;
}

const BAND_COLORS: Record<string, string> = {
  LOW: 'bg-green-100 text-green-800 border-green-200',
  MEDIUM: 'bg-amber-100 text-amber-800 border-amber-200',
  HIGH: 'bg-red-100 text-red-800 border-red-200',
  CRITICAL: 'bg-red-200 text-red-900 border-red-300',
};

const AUDIT_FREQUENCIES = [
  { value: 'RANDOM_3_YEAR', label: 'Random (3-year cycle)' },
  { value: 'EVERY_2_YEARS', label: 'Every 2 Years' },
  { value: 'YEARLY', label: 'Yearly' },
  { value: 'SEMI_ANNUALLY', label: 'Semi-Annually' },
  { value: 'QUARTERLY', label: 'Quarterly' },
];

const FOLLOW_UP = [
  { value: 'NORMAL', label: 'Normal' },
  { value: 'MONITOR', label: 'Monitor' },
  { value: 'ENFORCEMENT', label: 'Enforcement' },
  { value: 'IMMEDIATE_REVIEW', label: 'Immediate Review' },
];

export default function RiskBandsTab() {
  const queryClient = useQueryClient();
  const [editingBand, setEditingBand] = useState<BandRow | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Find active policy first, then load its bands
  const { data: activePolicy } = useQuery({
    queryKey: ['ce_risk_policies_active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ce_risk_policies')
        .select('id, policy_name')
        .eq('status', 'ACTIVE')
        .single();
      if (error) return null;
      return data as { id: string; policy_name: string };
    },
  });

  const { data: bands = [], isLoading } = useQuery({
    queryKey: ['ce_risk_bands', activePolicy?.id],
    enabled: !!activePolicy?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ce_risk_bands')
        .select('*')
        .eq('policy_id', activePolicy!.id)
        .order('score_range_min', { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as BandRow[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (band: BandRow) => {
      const { error } = await supabase
        .from('ce_risk_bands')
        .update({
          score_range_min: band.score_range_min,
          score_range_max: band.score_range_max,
          audit_frequency: band.audit_frequency,
          mandatory_audit: band.mandatory_audit,
          auto_select_enabled: band.auto_select_enabled,
          auto_select_type: band.auto_select_type,
          auto_select_value: band.auto_select_value,
          follow_up_intensity: band.follow_up_intensity,
          escalation_enabled: band.escalation_enabled,
          escalation_months_in_band: band.escalation_months_in_band,
          escalation_action: band.escalation_action,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', band.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ce_risk_bands'] });
      toast.success('Risk band updated');
      setDialogOpen(false);
    },
    onError: () => toast.error('Failed to update risk band'),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!activePolicy) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No active risk policy found. Create and activate a policy first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Risk Bands & Behaviour Settings</h3>
        <p className="text-sm text-muted-foreground">
          Score ranges for <span className="font-medium">{activePolicy.policy_name}</span> — determines monitoring intensity and escalation triggers
        </p>
      </div>

      <div className="grid gap-4">
        {bands.map((band) => (
          <Card key={band.id} className={`p-5 border-2 ${BAND_COLORS[band.band_name] || 'border-border'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Badge className={`text-base px-4 py-1 ${BAND_COLORS[band.band_name] || ''}`} variant="outline">
                  {band.band_name}
                </Badge>
                <div className="text-sm">
                  <span className="font-semibold">{band.score_range_min} – {band.score_range_max}</span>
                  <span className="text-muted-foreground ml-2">score range</span>
                </div>
              </div>
              <Button size="sm" onClick={() => { setEditingBand({ ...band }); setDialogOpen(true); }}>
                <Edit className="h-4 w-4 mr-2" /> Edit Band
              </Button>
            </div>
            <div className="grid grid-cols-4 gap-4 mt-4 text-sm">
              <div>
                <span className="text-muted-foreground block">Audit Frequency</span>
                <span className="font-medium">{AUDIT_FREQUENCIES.find(a => a.value === band.audit_frequency)?.label || band.audit_frequency}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Follow-Up</span>
                <span className="font-medium">{FOLLOW_UP.find(f => f.value === band.follow_up_intensity)?.label || band.follow_up_intensity}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Mandatory Audit</span>
                <Badge variant={band.mandatory_audit ? 'default' : 'secondary'}>
                  {band.mandatory_audit ? 'Yes' : 'No'}
                </Badge>
              </div>
              <div>
                <span className="text-muted-foreground block">Escalation</span>
                <Badge variant={band.escalation_enabled ? 'destructive' : 'secondary'}>
                  {band.escalation_enabled ? `After ${band.escalation_months_in_band}mo` : 'Disabled'}
                </Badge>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit {editingBand?.band_name} Band</DialogTitle>
            <DialogDescription>Configure score range, audit rules, and escalation behaviour</DialogDescription>
          </DialogHeader>
          {editingBand && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Score Min</Label>
                  <Input
                    type="number"
                    value={editingBand.score_range_min}
                    onChange={(e) => setEditingBand({ ...editingBand, score_range_min: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Score Max</Label>
                  <Input
                    type="number"
                    value={editingBand.score_range_max}
                    onChange={(e) => setEditingBand({ ...editingBand, score_range_max: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div>
                <Label>Audit Frequency</Label>
                <Select value={editingBand.audit_frequency} onValueChange={(v) => setEditingBand({ ...editingBand, audit_frequency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {AUDIT_FREQUENCIES.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Follow-Up Intensity</Label>
                <Select value={editingBand.follow_up_intensity} onValueChange={(v) => setEditingBand({ ...editingBand, follow_up_intensity: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FOLLOW_UP.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-3">
                <Switch
                  checked={editingBand.mandatory_audit}
                  onCheckedChange={(v) => setEditingBand({ ...editingBand, mandatory_audit: v })}
                />
                <Label>Mandatory Audit</Label>
              </div>

              <div className="p-3 border rounded-lg space-y-3">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={editingBand.escalation_enabled}
                    onCheckedChange={(v) => setEditingBand({ ...editingBand, escalation_enabled: v })}
                  />
                  <Label>Enable Escalation</Label>
                </div>
                {editingBand.escalation_enabled && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Months in Band</Label>
                      <Input
                        type="number"
                        value={editingBand.escalation_months_in_band}
                        onChange={(e) => setEditingBand({ ...editingBand, escalation_months_in_band: Number(e.target.value) })}
                        min={1}
                      />
                    </div>
                    <div>
                      <Label>Action</Label>
                      <Select
                        value={editingBand.escalation_action || ''}
                        onValueChange={(v) => setEditingBand({ ...editingBand, escalation_action: v })}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NOTIFY_SUPERVISOR">Notify Supervisor</SelectItem>
                          <SelectItem value="MANDATORY_AUDIT">Mandatory Audit</SelectItem>
                          <SelectItem value="MARK_READY_FOR_LEGAL">Mark for Legal</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => editingBand && saveMutation.mutate(editingBand)} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving...' : 'Save Band'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
