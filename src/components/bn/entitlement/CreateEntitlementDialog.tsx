/**
 * Create Entitlement from Approved Claim
 *
 * Bridges an approved claim → entitlement record with rate snapshot,
 * duration calculation, and optional schedule generation trigger.
 */
import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { BnEntitlementType, BnPaymentFrequency } from '@/services/bn/entitlementService';

const db = supabase as any;

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

interface ClaimCandidate {
  id: string;
  claim_number: string;
  ssn: string;
  status: string;
  benefit_name: string | null;
  weekly_rate: number;
  monthly_rate: number | null;
  total_entitlement: number;
  duration_weeks: number | null;
  effective_from: string;
  effective_to: string | null;
  payment_frequency: string;
}

export const CreateEntitlementDialog: React.FC<Props> = ({ open, onClose, onCreated }) => {
  const [step, setStep] = useState<'select' | 'configure'>('select');
  const [candidates, setCandidates] = useState<ClaimCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<ClaimCandidate | null>(null);
  const [creating, setCreating] = useState(false);

  // Config overrides
  const [entitlementType, setEntitlementType] = useState<BnEntitlementType>('PERIODIC');
  const [paymentFrequency, setPaymentFrequency] = useState<BnPaymentFrequency>('WEEKLY');
  const [weeklyRate, setWeeklyRate] = useState(0);
  const [totalEntitlement, setTotalEntitlement] = useState(0);
  const [durationWeeks, setDurationWeeks] = useState<number | undefined>();
  const [effectiveFrom, setEffectiveFrom] = useState<Date | undefined>();
  const [effectiveTo, setEffectiveTo] = useState<Date | undefined>();
  const [narrative, setNarrative] = useState('');
  const [generateSchedule, setGenerateSchedule] = useState(true);

  // Load approved claims without entitlements
  useEffect(() => {
    if (!open) return;
    setStep('select');
    setSelectedClaim(null);
    loadCandidates();
  }, [open]);

  const loadCandidates = async () => {
    setLoading(true);
    try {
      const { data: claims } = await db
        .from('bn_claim')
        .select(`
          id, claim_number, ssn, status,
          bn_product(benefit_name),
          bn_claim_calculation(weekly_rate, monthly_rate, total_entitlement, duration_weeks, effective_from, effective_to, payment_frequency)
        `)
        .in('status', ['APPROVED', 'AWARD_SETUP'])
        .order('modified_at', { ascending: false })
        .limit(100);

      // Filter out claims that already have entitlements
      const { data: existingEnts } = await db
        .from('bn_entitlement')
        .select('claim_id')
        .in('status', ['DRAFT', 'ACTIVE', 'SUSPENDED', 'REOPENED']);

      const existingClaimIds = new Set((existingEnts ?? []).map((e: any) => e.claim_id));

      const mapped = (claims ?? [])
        .filter((c: any) => !existingClaimIds.has(c.id))
        .map((c: any) => {
          const calc = c.bn_claim_calculation?.[0] || {};
          return {
            id: c.id,
            claim_number: c.claim_number,
            ssn: c.ssn,
            status: c.status,
            benefit_name: c.bn_product?.benefit_name || null,
            weekly_rate: calc.weekly_rate ?? 0,
            monthly_rate: calc.monthly_rate ?? null,
            total_entitlement: calc.total_entitlement ?? 0,
            duration_weeks: calc.duration_weeks ?? null,
            effective_from: calc.effective_from ?? new Date().toISOString().slice(0, 10),
            effective_to: calc.effective_to ?? null,
            payment_frequency: calc.payment_frequency ?? 'WEEKLY',
          };
        });
      setCandidates(mapped);
    } catch {
      toast.error('Failed to load eligible claims');
    }
    setLoading(false);
  };

  const selectClaim = (claim: ClaimCandidate) => {
    setSelectedClaim(claim);
    setWeeklyRate(claim.weekly_rate);
    setTotalEntitlement(claim.total_entitlement);
    setDurationWeeks(claim.duration_weeks ?? undefined);
    setPaymentFrequency(claim.payment_frequency as BnPaymentFrequency);
    setEffectiveFrom(new Date(claim.effective_from));
    setEffectiveTo(claim.effective_to ? new Date(claim.effective_to) : undefined);
    setStep('configure');
  };

  const handleCreate = async () => {
    if (!selectedClaim || !effectiveFrom) return;
    setCreating(true);
    try {
      const now = new Date().toISOString();
      const entitlementData = {
        claim_id: selectedClaim.id,
        ssn: selectedClaim.ssn,
        claim_number: selectedClaim.claim_number,
        entitlement_type: entitlementType,
        payment_frequency: paymentFrequency,
        weekly_rate: weeklyRate,
        monthly_rate: paymentFrequency === 'MONTHLY' ? weeklyRate * 4.33 : null,
        total_entitlement: totalEntitlement,
        remaining_amount: totalEntitlement,
        duration_weeks: durationWeeks ?? null,
        weeks_paid: 0,
        effective_from: effectiveFrom.toISOString().slice(0, 10),
        effective_to: effectiveTo?.toISOString().slice(0, 10) ?? null,
        status: 'DRAFT',
        override_applied: false,
        entered_by: 'CURRENT_USER',
        entered_at: now,
      };

      const { data: ent, error } = await db
        .from('bn_entitlement')
        .insert(entitlementData)
        .select('id')
        .single();
      if (error) throw error;

      // Update claim status
      await db.from('bn_claim')
        .update({ status: 'AWARD_SETUP', modified_by: 'CURRENT_USER', modified_at: now })
        .eq('id', selectedClaim.id);

      // Audit event
      await db.from('bn_claim_event').insert({
        claim_id: selectedClaim.id,
        event_type: 'ENTITLEMENT_CREATED',
        description: narrative || 'Entitlement created from approved claim',
        performed_by: 'CURRENT_USER',
        performed_at: now,
        metadata: {
          entitlement_id: ent.id,
          entity_type: 'ENTITLEMENT',
          weekly_rate: weeklyRate,
          total_entitlement: totalEntitlement,
          generate_schedule: generateSchedule,
        },
      });

      toast.success('Entitlement created successfully');
      onCreated();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create entitlement');
    }
    setCreating(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 'select' ? 'Select Approved Claim' : 'Configure Entitlement'}
          </DialogTitle>
          <DialogDescription>
            {step === 'select'
              ? 'Choose an approved claim to create an entitlement from.'
              : `Creating entitlement for claim ${selectedClaim?.claim_number}`}
          </DialogDescription>
        </DialogHeader>

        {step === 'select' && (
          <div className="space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : candidates.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-amber-500" />
                No approved claims without entitlements found.
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {candidates.map(c => (
                  <div
                    key={c.id}
                    className="rounded-lg border p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => selectClaim(c)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-mono font-medium text-sm">{c.claim_number}</span>
                        <span className="text-xs text-muted-foreground ml-2">SSN: {c.ssn}</span>
                      </div>
                      <Badge variant="outline" className="text-xs">{c.status}</Badge>
                    </div>
                    <div className="mt-1 flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{c.benefit_name || 'Unknown Benefit'}</span>
                      <span>Rate: ${c.weekly_rate.toFixed(2)}/wk</span>
                      <span>Total: ${c.total_entitlement.toFixed(2)}</span>
                      {c.duration_weeks && <span>{c.duration_weeks} weeks</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {step === 'configure' && selectedClaim && (
          <div className="space-y-4">
            {/* Claim summary */}
            <div className="rounded-lg bg-muted/50 p-3 text-sm">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
                <span className="font-medium">{selectedClaim.claim_number}</span>
                <span className="text-muted-foreground">— {selectedClaim.benefit_name}</span>
              </div>
              <span className="text-xs text-muted-foreground">SSN: {selectedClaim.ssn}</span>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Entitlement Type</Label>
                <Select value={entitlementType} onValueChange={(v) => setEntitlementType(v as BnEntitlementType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PERIODIC">Periodic</SelectItem>
                    <SelectItem value="LUMP_SUM">Lump Sum</SelectItem>
                    <SelectItem value="BOTH">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Payment Frequency</Label>
                <Select value={paymentFrequency} onValueChange={(v) => setPaymentFrequency(v as BnPaymentFrequency)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WEEKLY">Weekly</SelectItem>
                    <SelectItem value="FORTNIGHTLY">Fortnightly</SelectItem>
                    <SelectItem value="MONTHLY">Monthly</SelectItem>
                    <SelectItem value="ONE_TIME">One-Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Weekly Rate (XCD)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={weeklyRate}
                  onChange={(e) => setWeeklyRate(parseFloat(e.target.value) || 0)}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Total Entitlement (XCD)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={totalEntitlement}
                  onChange={(e) => setTotalEntitlement(parseFloat(e.target.value) || 0)}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Duration (Weeks)</Label>
                <Input
                  type="number"
                  value={durationWeeks ?? ''}
                  onChange={(e) => setDurationWeeks(e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="Open-ended if blank"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Effective From</Label>
                <DatePicker date={effectiveFrom} onDateChange={setEffectiveFrom} />
              </div>

              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs">Effective To (optional)</Label>
                <DatePicker date={effectiveTo} onDateChange={setEffectiveTo} />
              </div>
            </div>

            <Separator />

            <div className="space-y-1.5">
              <Label className="text-xs">Narrative / Notes</Label>
              <Textarea
                value={narrative}
                onChange={(e) => setNarrative(e.target.value)}
                placeholder="Reason for entitlement creation..."
                rows={2}
              />
            </div>

            <div className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                id="gen-schedule"
                checked={generateSchedule}
                onChange={(e) => setGenerateSchedule(e.target.checked)}
                className="rounded border-muted-foreground"
              />
              <label htmlFor="gen-schedule" className="text-muted-foreground">
                Auto-generate payment schedule after activation
              </label>
            </div>
          </div>
        )}

        <DialogFooter>
          {step === 'configure' && (
            <Button variant="outline" onClick={() => setStep('select')} disabled={creating}>
              Back
            </Button>
          )}
          <Button variant="outline" onClick={onClose} disabled={creating}>
            Cancel
          </Button>
          {step === 'configure' && (
            <Button onClick={handleCreate} disabled={creating || !effectiveFrom || weeklyRate <= 0}>
              {creating && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Create Entitlement
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
